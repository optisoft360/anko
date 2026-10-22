import React, { useState, useEffect, useRef } from "react";
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import {
    IconButton,
    Typography,
    Select,
    Option,
    Input,
    Spinner,
    Button,
    Menu,
    MenuHandler,
    MenuList,
    MenuItem,
    Checkbox,
    Chip,
} from "@material-tailwind/react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { useMaterialTailwindController, setOpenConfigurator } from "@/context";
import { useLanguage } from "@/context/language-context";
import projectService from "@/services/projectService";

export function ChatPanel() {
    const [controller, dispatch] = useMaterialTailwindController();
    const { openConfigurator } = controller;
    const { t, language } = useLanguage();

    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [documents, setDocuments] = useState([]);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [sessionId, setSessionId] = useState(crypto.randomUUID());
    const [messages, setMessages] = useState([]);
    const [activeHistoryIndex, setActiveHistoryIndex] = useState(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const scrollRef = useRef(null);

    const isContextReady = selectedProject && selectedDocs.length > 0;

    const handleNewChat = () => {
        setMessages([]);
        setSessionId(crypto.randomUUID());
        setActiveHistoryIndex(null);
        console.log("[ChatPanel] New session created:", sessionId);
    };

    const handleSwitchSession = async (index) => {
        if (historyLoading) return;
        setHistoryLoading(true);
        setActiveHistoryIndex(index);

        try {
            const data = await projectService.getChatSessionMessages(index);
            if (data && data.messages) {
                // Backend sends messages in DESC order (newest first by ID)
                // We need to reverse to get chronological order (oldest first)
                // Then for each message: question comes first, then answer
                const reversedMessages = [...data.messages].reverse();
                const mappedMessages = [];

                reversedMessages.forEach(m => {
                    // Add user question first
                    if (m.question) {
                        mappedMessages.push({
                            role: "user",
                            text: m.question,
                            timestamp: m.created_at
                        });
                    }
                    // Then add AI answer
                    if (m.answer) {
                        mappedMessages.push({
                            role: "ai",
                            text: m.answer,
                            timestamp: m.created_at
                        });
                    }
                });

                setMessages(mappedMessages);
                setSessionId(data.selected_session_id || String(data.selected_session_pk));
            }
        } catch (err) {
            console.error("Error switching session:", err);
            setMessages([{
                role: "ai",
                text: (language === "es" ? "No se pudo cargar la sesión histórica." : "Failed to load history session.")
            }]);
        } finally {
            setHistoryLoading(false);
        }
    };

    // Load Projects on mount
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const data = await projectService.getProjects();
                const list = Array.isArray(data) ? data : data?.results || [];
                setProjects(list);
                // Don't auto-select if we want to enforce intentional selection
                // if (list.length > 0) setSelectedProject(list[0].id);
            } catch (err) {
                console.error("Error fetching projects:", err);
            }
        };
        fetchProjects();
    }, []);

    // Load Documents when project changes
    useEffect(() => {
        if (selectedProject) {
            const fetchDocs = async () => {
                try {
                    const data = await projectService.getProjectDocuments(selectedProject);
                    const list = Array.isArray(data) ? data : data?.results || [];
                    setDocuments(list);
                    setSelectedDocs([]); // Reset selection
                } catch (err) {
                    console.error("Error fetching documents:", err);
                }
            };
            fetchDocs();
        } else {
            setDocuments([]);
            setSelectedDocs([]);
        }
    }, [selectedProject]);

    // Debug logging
    useEffect(() => {
        console.log("[ChatPanel] Projects List:", projects);
        console.log("[ChatPanel] Active Selection:", selectedProject);
    }, [projects, selectedProject]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading || !isContextReady) return;

        const userMsg = { role: "user", text: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const payload = {
                question: input,
                context: selectedDocs,
                session_id: sessionId || "chat-panel-session",
            };

            const response = await projectService.askProject(payload);

            let aiText = t("chat.ai_error");
            if (response.ok) {
                if (response.transport === "ws") {
                    aiText = response.final?.answer || response.final?.text || "Respuesta recibida";
                } else {
                    aiText = response.http?.response_json?.answer || response.http?.response_json?.text || "Respuesta recibida";
                }
            } else {
                aiText = t("chat.ai_error") + ": " + (response.ws_error || "Error");
            }

            setMessages((prev) => [...prev, { role: "ai", text: aiText }]);
        } catch (err) {
            console.error("Chat error:", err);
            const errorMessage = err?.detail || err?.error || t("chat.conn_error");
            setMessages((prev) => [...prev, { role: "ai", text: errorMessage }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <aside
            className={`fixed top-0 right-0 z-[9999] h-[100dvh] w-full md:w-[400px] bg-white shadow-2xl transition-[transform,visibility] duration-500 ease-in-out flex flex-col border-l border-zinc-100 ${openConfigurator ? "visible translate-x-0" : "invisible translate-x-full"
                }`}
        >
            {/* Header */}
            <div className="flex flex-col bg-white border-b border-zinc-100 flex-none">
                <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 md:h-9 md:w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #3949AB, #303F9F)" }}>
                            <ChatBubbleLeftRightIcon className="h-4 w-4 md:h-5 md:w-5 text-white" />
                        </div>
                        <div>
                            <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a2e", lineHeight: 1.2 }}>
                                {t("chat.title")}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                <p style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                    AI Online
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setOpenConfigurator(dispatch, false)}
                        style={{ width: 32, height: 32, borderRadius: "10px", background: "#f5f5f7", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                        <XMarkIcon strokeWidth={2.5} className="h-4 w-4 text-zinc-500" />
                    </button>
                </div>

                {/* Session toolbar */}
                <div className="px-4 py-2 md:px-6 border-t border-zinc-50 bg-zinc-50/50 flex items-center gap-3">
                    <button
                        onClick={handleNewChat}
                        style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#3949AB", background: "#E8EAF6", border: "none", borderRadius: "8px", padding: "4px 10px", cursor: "pointer" }}
                    >
                        <span style={{ fontSize: "14px", fontWeight: 400 }}>+</span>
                        {language === "es" ? "Nuevo" : "New"}
                    </button>

                    <div className="flex items-center gap-1 border-l border-zinc-200 pl-3">
                        {[1, 2, 3, 4, 5].map((num) => (
                            <button
                                key={num}
                                disabled={historyLoading}
                                onClick={() => handleSwitchSession(num)}
                                style={{
                                    width: 26, height: 26, borderRadius: "7px", fontSize: "10px", fontWeight: 700,
                                    display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer",
                                    background: activeHistoryIndex === num ? "#3949AB" : "transparent",
                                    color: activeHistoryIndex === num ? "#fff" : "#94a3b8",
                                    opacity: historyLoading ? 0.5 : 1,
                                }}
                            >
                                {historyLoading && activeHistoryIndex === num ? (
                                    <Spinner className="h-2 w-2 text-white" />
                                ) : num}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Context Selectors */}
            <div className="p-3 md:p-5 space-y-3 md:space-y-4 border-b border-zinc-100 bg-zinc-50/50 flex-none">
                <div className="space-y-1">
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#1a1a2e", textTransform: "uppercase", letterSpacing: "0.06em", marginLeft: "2px" }}>
                        {t("chat.select_project")}
                    </p>
                    <Menu>
                        <MenuHandler>
                            <Button
                                variant="outlined"
                                className={`flex items-center gap-2 w-full justify-between px-3 h-9 md:px-4 md:h-11 font-medium normal-case rounded-xl transition-all border text-xs ${selectedProject ? "border-indigo-200 bg-indigo-50/30 text-indigo-700" : "border-zinc-200 bg-white text-zinc-500"}`}
                            >
                                <span className="truncate">
                                    {selectedProject
                                        ? (projects.find(p => String(p.id) === String(selectedProject))?.title || projects.find(p => String(p.id) === String(selectedProject))?.name || "Proyecto Seleccionado")
                                        : (language === "es" ? "Seleccionar proyecto..." : "Select project...")}
                                </span>
                                <ChevronDownIcon className="h-3.5 w-3.5 opacity-50 shrink-0" />
                            </Button>
                        </MenuHandler>
                        <MenuList className="max-h-60 overflow-y-auto rounded-xl border-zinc-100 shadow-2xl p-2 w-[calc(100vw-2rem)] md:min-w-[350px] md:w-auto z-[99999]">
                            {projects.length === 0 ? (
                                <div className="p-3 text-center text-xs text-zinc-500 italic">
                                    {language === "es" ? "Cargando proyectos..." : "Loading projects..."}
                                </div>
                            ) : (
                                projects.map((p) => (
                                    <MenuItem
                                        key={String(p.id)}
                                        className={`rounded-lg mb-1 flex items-center justify-between p-3 ${String(selectedProject) === String(p.id) ? "bg-indigo-50 text-indigo-700 font-bold" : "text-zinc-700 hover:bg-zinc-50"}`}
                                        onClick={() => setSelectedProject(String(p.id))}
                                    >
                                        <p className="text-xs font-bold truncate">{p.title || p.name}</p>
                                        {String(selectedProject) === String(p.id) && (
                                            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: "#3949AB" }} />
                                        )}
                                    </MenuItem>
                                ))
                            )}
                        </MenuList>
                    </Menu>
                </div>

                <div className="space-y-1">
                    <p style={{ fontSize: "10px", fontWeight: 700, color: "#1a1a2e", textTransform: "uppercase", letterSpacing: "0.06em", marginLeft: "2px" }}>
                        {t("chat.context_docs")}
                    </p>
                    <Menu dismiss={{ itemPress: false }}>
                        <MenuHandler>
                            <Button
                                variant="outlined"
                                disabled={!selectedProject}
                                className={`flex items-center gap-2 w-full justify-between px-3 h-9 md:px-4 md:h-11 font-medium normal-case rounded-xl transition-all border text-xs ${selectedDocs.length > 0 ? "border-indigo-200 bg-indigo-50/30 text-indigo-700" : "border-zinc-200 bg-white text-zinc-500"}`}
                            >
                                <span className="truncate">
                                    {!selectedProject
                                        ? t("chat.select_project_first")
                                        : (selectedDocs.length === 0
                                            ? t("chat.select_docs")
                                            : t("chat.docs_selected").replace("{count}", selectedDocs.length))}
                                </span>
                                <ChevronDownIcon className="h-3.5 w-3.5 opacity-50 shrink-0" />
                            </Button>
                        </MenuHandler>
                        <MenuList className="max-h-60 overflow-y-auto rounded-xl border-zinc-100 shadow-xl p-2 w-[calc(100vw-2rem)] md:min-w-[350px] md:w-auto z-[99999]">
                            {documents.length === 0 ? (
                                <div className="p-3 text-center text-xs text-zinc-500 italic">
                                    {t("chat.no_docs")}
                                </div>
                            ) : (
                                documents.map((d) => (
                                    <MenuItem key={d.id} className="p-0 hover:bg-zinc-50 rounded-lg">
                                        <label htmlFor={`doc-${d.id}`} className="flex cursor-pointer items-center gap-3 p-3 w-full">
                                            <Checkbox
                                                id={`doc-${d.id}`}
                                                ripple={false}
                                                color="indigo"
                                                className="h-4 w-4 rounded border-zinc-300"
                                                containerProps={{ className: "p-0" }}
                                                checked={selectedDocs.includes(String(d.id))}
                                                onChange={() => {
                                                    const idStr = String(d.id);
                                                    setSelectedDocs((prev) =>
                                                        prev.includes(idStr) ? prev.filter((id) => id !== idStr) : [...prev, idStr]
                                                    );
                                                }}
                                            />
                                            <p className="text-xs font-medium text-zinc-700 truncate">
                                                {d.name || d.title || d.filename || t("chat.no_name")}
                                            </p>
                                        </label>
                                    </MenuItem>
                                ))
                            )}
                        </MenuList>
                    </Menu>
                </div>

                {/* Selected doc chips */}
                {selectedDocs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {selectedDocs.map((docId) => {
                            const doc = documents.find((d) => String(d.id) === docId);
                            if (!doc) return null;
                            return (
                                <Chip
                                    key={docId}
                                    value={doc.name || doc.title || doc.filename || t("chat.no_name")}
                                    size="sm"
                                    variant="ghost"
                                    color="indigo"
                                    onClose={() => setSelectedDocs((prev) => prev.filter((id) => id !== docId))}
                                    className="rounded-lg normal-case font-bold text-[10px] bg-indigo-50 border-indigo-100"
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Chat messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-zinc-50/30">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className={`p-3 rounded-2xl mb-3 ${isContextReady ? "bg-indigo-50 text-indigo-400" : "bg-red-50 text-red-400"}`}>
                            <ChatBubbleLeftRightIcon className="h-8 w-8" />
                        </div>
                        <p style={{ fontSize: "13px", fontWeight: 700, color: "#1a1a2e", marginBottom: "4px" }}>
                            {isContextReady ? t("chat.help_text") : t("chat.no_docs_title")}
                        </p>
                        <p style={{ fontSize: "11px", color: "#888", lineHeight: 1.5 }}>
                            {isContextReady
                                ? (language === "es" ? "Haz una pregunta sobre el contenido seleccionado." : "Ask a question about the selected content.")
                                : t("chat.missing_context")}
                        </p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    let formattedTime = "";
                    if (msg.timestamp) {
                        try {
                            const date = new Date(msg.timestamp);
                            const now = new Date();
                            const isToday = date.toDateString() === now.toDateString();
                            if (isToday) {
                                formattedTime = date.toLocaleTimeString(language === "es" ? "es-ES" : "en-US", { hour: "2-digit", minute: "2-digit" });
                            } else {
                                formattedTime = date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
                            }
                        } catch (e) {}
                    }

                    return (
                        <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            <div
                                className={`max-w-[85%] px-3 py-2.5 md:px-4 md:py-3 rounded-2xl text-[12px] md:text-[13px] leading-relaxed shadow-sm ${msg.role === "user"
                                    ? "text-white rounded-tr-none"
                                    : "bg-white text-zinc-800 border border-zinc-100 rounded-tl-none"
                                }`}
                                style={msg.role === "user" ? { background: "linear-gradient(135deg, #3949AB, #303F9F)" } : {}}
                            >
                                {msg.text}
                            </div>
                            {formattedTime && (
                                <p style={{ fontSize: "9px", color: "#b0b0b8", fontWeight: 500, marginTop: "3px", paddingLeft: "2px" }}>
                                    {formattedTime}
                                </p>
                            )}
                        </div>
                    );
                })}

                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-zinc-100 rounded-tl-none flex items-center gap-3">
                            <Spinner className="h-3 w-3 text-indigo-500" />
                            <p style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }} className="animate-pulse">
                                {t("chat.loading")}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Input footer */}
            <div className="p-3 md:p-5 bg-white border-t border-zinc-100 flex-none" style={{ paddingBottom: "max(13px, env(safe-area-inset-bottom, 13px))" }}>
                {!isContextReady && (
                    <p style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, textAlign: "center", marginBottom: "8px" }}>
                        {t("chat.no_docs_title")}
                    </p>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex w-full">
                    <input
                        type="text"
                        placeholder={!isContextReady ? (language === "es" ? "Selecciona un proyecto y documentos primero..." : "Select a project and documents first...") : t("chat.input_placeholder")}
                        disabled={loading}
                        style={{ width: "100%", background: "#f9f9fb", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "12px 50px 12px 16px", fontSize: "13px", color: "#1a1a2e", outline: "none" }}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading || !isContextReady}
                        style={{
                            position: "absolute", right: "6px", top: "6px",
                            width: 36, height: 36, borderRadius: "10px", border: "none", cursor: !input.trim() || loading || !isContextReady ? "not-allowed" : "pointer",
                            background: (!input.trim() || loading || !isContextReady) ? "#e5e7eb" : "linear-gradient(135deg, #3949AB, #303F9F)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "opacity 0.2s",
                        }}
                    >
                        <PaperAirplaneIcon className="h-4 w-4 text-white" />
                    </button>
                </form>
            </div>
        </aside>
    );
}

ChatPanel.displayName = "/src/widgets/layout/chat-panel.jsx";

export default ChatPanel;
