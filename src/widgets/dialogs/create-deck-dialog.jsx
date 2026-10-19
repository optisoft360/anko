import { noWheel } from "@/utils/numberInput";
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Button,
    Input,
    Textarea,
    Typography,
    Checkbox,
    Accordion,
    AccordionHeader,
    AccordionBody,
    Spinner,
    Switch,
    IconButton,
    Chip,
    Tabs,
    TabsHeader,
    TabsBody,
    Tab,
    TabPanel,
} from "@material-tailwind/react";
import { ChevronDownIcon, XMarkIcon, RectangleStackIcon, PlusIcon, TrashIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";

function Icon({ id, open }) {
    return (
        <ChevronDownIcon
            className={`${id === open ? "rotate-180" : ""} h-5 w-5 transition-transform text-zinc-400`}
        />
    );
}

export function CreateDeckDialog({ open, onClose, onCreate, projectId, deck = null, existingDecks = [] }) {
    const { t, language } = useLanguage();
    const [activeTab, setActiveTab] = useState("ai");
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        visibility: "private",
        section_ids: [],
        document_ids: [],
        cards_count: 3,
        cards: [], // For manual mode
    });
    const [openAccordion, setOpenAccordion] = useState(0);
    const [scannedDocuments, setScannedDocuments] = useState([]);
    const [loadingSections, setLoadingSections] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            // Reset state for a clean start
            setErrors({});
            setSubmitting(false);
            setOpenAccordion(0);
            setCurrentCard({ front: "", back: "", notes: "" });

            if (deck) {
                setFormData({
                    title: deck.title || "",
                    description: deck.description || "",
                    visibility: deck.visibility || "private",
                    section_ids: (deck.section_ids || []).map(Number),
                    document_ids: (deck.document_ids || []).map(Number),
                    cards_count: deck.flashcards_count || deck.cards_count || 3,
                    cards: [],
                });
                setActiveTab("ai");
            } else {
                setFormData({
                    title: "",
                    description: "",
                    visibility: "private",
                    section_ids: [],
                    document_ids: [],
                    cards_count: 3,
                    cards: [],
                });
                setActiveTab("ai");
            }
            if (projectId) {
                fetchSections();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, projectId, deck]);

    useEffect(() => {
        const loadCardsIfNeeded = async () => {
            if (activeTab === "manual" && deck?.id && formData.cards.length === 0) {
                try {
                    const cards = await projectService.getDeckFlashcards(deck.id);
                    if (cards && cards.length > 0) {
                        setFormData(prev => ({
                            ...prev,
                            cards: cards.map(c => ({
                                front: c.front || c.question || "",
                                back: c.back || c.answer || "",
                                notes: c.explanation || c.notes || ""
                            }))
                        }));
                    }
                } catch (err) {
                    console.error("Failed to load existing flashcards", err);
                }
            }
        };
        loadCardsIfNeeded();
    }, [activeTab, deck, formData.cards.length]);

    const fetchSections = async () => {
        try {
            setLoadingSections(true);
            const data = await projectService.getDocumentsWithSections(projectId);
            setScannedDocuments(data.documents || []);
        } catch (err) {
            console.error("Error fetching sections:", err);
        } finally {
            setLoadingSections(false);
        }
    };

    const handleOpenAccordion = (value) => setOpenAccordion(openAccordion === value ? 0 : value);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const clamped = name === "cards_count" ? Math.min(15, Math.max(1, Number(value))) : value;
        setFormData((prev) => ({ ...prev, [name]: name === "cards_count" ? clamped : value }));

        // Real-time validation for duplicate titles
        if (name === "title") {
            const titleTrimmed = value.trim();
            if (titleTrimmed && existingDecks && Array.isArray(existingDecks)) {
                const duplicate = existingDecks.find(ed => {
                    const edTitle = (ed.title || ed.name || "").trim().toLowerCase();
                    const matchesTitle = edTitle === titleTrimmed.toLowerCase();
                    const isDifferentDeck = !deck || String(ed.id) !== String(deck.id);
                    return matchesTitle && isDifferentDeck;
                });

                if (duplicate) {
                    const msg = language === "es"
                        ? "Ya tienes un mazo con el mismo nombre, se sugiere cambiarlo"
                        : "You already have a deck with the same name, it is suggested to change it";
                    setErrors((prev) => ({ ...prev, title: msg }));
                    return;
                }
            }
        }

        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleVisibilityChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            visibility: e.target.checked ? "public" : "private"
        }));
    };

    const handleSectionToggle = (sectionId, docId) => {
        const sId = Number(sectionId);
        const dId = Number(docId);

        setFormData((prev) => {
            const currentSelected = prev.section_ids;
            const updated = currentSelected.includes(sId)
                ? currentSelected.filter((id) => id !== sId)
                : [...currentSelected, sId];

            // Re-infer document selection
            const doc = scannedDocuments.find(d => Number(d.id) === dId);
            const docSectionIds = (doc?.sections || []).map(s => Number(s.id));
            const allDocSectionsSelected = docSectionIds.length > 0 && docSectionIds.every(id => updated.includes(id));

            let newDocIds = prev.document_ids;
            if (allDocSectionsSelected) {
                if (!newDocIds.includes(dId)) newDocIds = [...newDocIds, dId];
            } else {
                newDocIds = newDocIds.filter(id => id !== dId);
            }

            return {
                ...prev,
                section_ids: updated,
                document_ids: newDocIds
            };
        });
    };

    const handleDocumentToggle = (doc) => {
        const docId = Number(doc.id);
        const docSectionIds = (doc.sections || []).map(s => Number(s.id));

        setFormData((prev) => {
            const isDocSelected = prev.document_ids.includes(docId);
            const allSectionsSelected = docSectionIds.length > 0 && docSectionIds.every(id => prev.section_ids.includes(id));

            // Toggle based on current effective selection (if doc is selected OR all its sections are selected)
            const shouldDeselect = isDocSelected || allSectionsSelected;

            let newDocIds = shouldDeselect
                ? prev.document_ids.filter(id => id !== docId)
                : [...new Set([...prev.document_ids, docId])];

            let newSectionIds = prev.section_ids;
            if (shouldDeselect) {
                newSectionIds = prev.section_ids.filter(id => !docSectionIds.includes(id));
            } else {
                newSectionIds = [...new Set([...prev.section_ids, ...docSectionIds])];
            }

            return {
                ...prev,
                document_ids: newDocIds,
                section_ids: newSectionIds
            };
        });
    };

    // --- Manual Card Management ---
    const [currentCard, setCurrentCard] = useState({ front: "", back: "", notes: "" });

    const handleCurrentCardChange = (e) => {
        const { name, value } = e.target;
        setCurrentCard(prev => ({ ...prev, [name]: value }));
    };

    const addCard = () => {
        if (!currentCard.front.trim() || !currentCard.back.trim()) return;

        setFormData(prev => ({
            ...prev,
            cards: [...prev.cards, { ...currentCard }]
        }));
        setCurrentCard({ front: "", back: "", notes: "" });
    };

    const removeCard = (index) => {
        setFormData(prev => ({
            ...prev,
            cards: prev.cards.filter((_, i) => i !== index)
        }));
    };

    const validate = () => {
        const newErrors = {};
        const titleTrimmed = formData.title.trim();

        if (!titleTrimmed) {
            newErrors.title = language === "es" ? "El título es obligatorio" : "Title is required";
        } else if (existingDecks && Array.isArray(existingDecks)) {
            // Check for duplicate title with case-insensitive and trimmed comparison
            const duplicate = existingDecks.find(ed => {
                const edTitle = (ed.title || ed.name || "").trim().toLowerCase();
                const matchesTitle = edTitle === titleTrimmed.toLowerCase();
                const isDifferentDeck = !deck || String(ed.id) !== String(deck.id);
                return matchesTitle && isDifferentDeck;
            });

            if (duplicate) {
                const msg = language === "es"
                    ? "Ya tienes un mazo con el mismo nombre, se sugiere cambiarlo"
                    : "You already have a deck with the same name, it is suggested to change it";
                newErrors.title = msg;
            }
        }

        if (!deck) {
            if (activeTab === "manual") {
                if (formData.cards.length === 0) {
                    newErrors.general = language === "es" ? "Debes agregar al menos una ficha." : "You must add at least one card.";
                }
            } else {
                // AI Generation mode
                // Case A: No documents/sections available to process
                if (scannedDocuments.length === 0) {
                    newErrors.general = language === "es"
                        ? "Usted no tiene secciones disponibles. Debe subir un documento para que el sistema procese el contenido."
                        : "You don't have any sections available. You should upload a document so the system can process the content.";
                }
                // Case B: Sections exist but none selected
                else if (formData.section_ids.length === 0 && !newErrors.title) {
                    newErrors.general = language === "es"
                        ? "Usted debe seleccionar al menos una sección para generar las fichas."
                        : "You must select at least one section to generate the cards.";
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("[CreateDeckDialog] handleSubmit called. deck:", deck, "activeTab:", activeTab);
        if (validate()) {
            setSubmitting(true);
            console.log("[CreateDeckDialog] Validation passed. Calling onCreate with:", formData);
            // Include activeTab in onCreate so parent knows which service method to use
            onCreate({ ...formData, mode: activeTab });
            // Don't close immediately here because parent handles logic and loading/errors
            // But currently the dialog expects to close or handle errors inside.
            // The parent `handleCreateDeck` triggers async service calls.
            // Ideally we'd have a loading state passed in. 
            // For now, we assume parent closes dialog on success.
            // But looking at existing code: `onCreate(formData); onClose();`
            // So we'll keep onClose here.
            onClose();
        } else {
            console.warn("[CreateDeckDialog] Validation failed:", errors);
        }
    };

    const mLbl = { fontSize: 11, fontWeight: 700, letterSpacing: ".9px", textTransform: "uppercase", color: "#94a3b8", marginBottom: 9, display: "flex", alignItems: "center", gap: 7 };
    const mInput = (hasErr) => ({ width: "100%", padding: "12px 14px", background: "#f8fafc", border: `1.5px solid ${hasErr ? "#ef4444" : "#e2e8f0"}`, borderRadius: 13, fontFamily: "inherit", fontSize: 14, color: "#0f172a", outline: "none" });
    const mTextarea = { width: "100%", padding: "12px 14px", background: "#f8fafc", border: "0.5px solid #e2e8f0", borderRadius: 13, fontFamily: "inherit", fontSize: 14, color: "#0f172a", outline: "none", resize: "none", height: 88, lineHeight: 1.6 };

    return (
        <Dialog
            open={open}
            handler={onClose}
            size="lg"
            className="!p-0 !mx-0 !my-0 !self-end md:!self-center !rounded-t-[28px] !rounded-b-none !max-w-full !w-full md:!mx-auto md:!my-8 md:!rounded-3xl md:!max-w-2xl overflow-hidden bg-white"
        >
            <form onSubmit={handleSubmit} className="flex flex-col">

                {/* ══════════════ MOBILE bottom-sheet ══════════════ */}
                <div className="md:hidden flex flex-col" style={{ maxHeight: "calc(100dvh - 40px)" }}>

                    {/* Dark header strip */}
                    <div style={{ background: "#0f172a", padding: "14px 20px 0", position: "relative", overflow: "hidden", flexShrink: 0 }}>
                        <div style={{ position: "absolute", width: 300, height: 300, background: "radial-gradient(circle, rgba(57,73,171,.55) 0%, transparent 60%)", top: -120, right: -70, borderRadius: "50%", pointerEvents: "none" }} />
                        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
                        {/* drag handle */}
                        <div style={{ width: 38, height: 4, background: "rgba(255,255,255,.18)", borderRadius: 2, margin: "0 auto 16px" }} />
                        {/* title row */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1, marginBottom: 18 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 42, height: 42, background: "rgba(57,73,171,.28)", border: "1px solid rgba(99,102,241,.4)", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg viewBox="0 0 24 24" style={{ width: 19, height: 19, stroke: "#818cf8", strokeWidth: 1.8, fill: "none" }}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                                </div>
                                <div>
                                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-.3px" }}>
                                        {deck?.id ? (language === "es" ? "Editar Mazo" : "Edit Deck") : (language === "es" ? "Crear Mazo" : "Create Deck")}
                                    </div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
                                        {activeTab === "ai" ? (language === "es" ? "Genera tu set de flashcards" : "Build your flashcard set") : (language === "es" ? "Crea tarjetas manualmente" : "Create cards manually")}
                                    </div>
                                </div>
                            </div>
                            <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.13)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: "rgba(255,255,255,.6)", strokeWidth: 2, fill: "none" }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                        {/* Mode tabs — only show when creating (not editing) */}
                        {!deck && (
                            <div style={{ display: "flex", gap: 4, position: "relative", zIndex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.09)", borderRadius: "14px 14px 0 0", padding: "5px 5px 0" }}>
                                {[
                                    { key: "ai",     label: language === "es" ? "Generar con IA" : "AI Generation", ico: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/> },
                                    { key: "manual", label: language === "es" ? "Manual" : "Manual",               ico: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></> },
                                ].map(({ key, label, ico }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setActiveTab(key)}
                                        style={{ flex: 1, padding: "10px 0", textAlign: "center", fontSize: 13, fontWeight: 600, color: activeTab === key ? "rgb(57,73,171)" : "rgba(255,255,255,.38)", cursor: "pointer", borderRadius: "10px 10px 0 0", background: activeTab === key ? "#fff" : "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                    >
                                        <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "currentColor", strokeWidth: 2, fill: "none" }}>{ico}</svg>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Scrollable form body */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "22px 20px 0" }}>

                        {/* ── AI MODE ── */}
                        {activeTab === "ai" && (
                            <>
                                {/* AI hint */}
                                <div style={{ background: "rgba(57,73,171,.10)", border: "1px solid rgba(57,73,171,.22)", borderRadius: 13, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 20 }}>
                                    <div style={{ width: 28, height: 28, background: "rgb(57,73,171)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                                        <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "#fff", strokeWidth: 2, fill: "none" }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                    </div>
                                    <p style={{ fontSize: 12, color: "rgb(57,73,171)", lineHeight: 1.55, fontWeight: 500 }}>
                                        <strong style={{ fontWeight: 700 }}>{language === "es" ? "Generación con IA" : "AI Generation"}</strong> {language === "es" ? " crea flashcards automáticamente de tus documentos y secciones." : " creates flashcards automatically from your selected documents and sections."}
                                    </p>
                                </div>

                                {/* Title */}
                                <div style={{ marginBottom: 20 }}>
                                    <div style={mLbl}>
                                        {language === "es" ? "Título" : "Title"}
                                        <span style={{ width: 5, height: 5, background: "rgb(57,73,171)", borderRadius: "50%", display: "inline-block", flexShrink: 0 }} />
                                    </div>
                                    <input style={mInput(!!errors.title)} type="text" name="title" value={formData.title} onChange={handleChange} placeholder={language === "es" ? "Ej. Anatomía del Corazón" : "Ex. Heart Anatomy"} />
                                    {errors.title && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>{errors.title}</p>}
                                </div>

                                {/* Cards count stepper */}
                                {!deck && (
                                    <div style={{ marginBottom: 20 }}>
                                        <div style={mLbl}>{language === "es" ? "Cantidad de Tarjetas" : "Cards Count"}</div>
                                        <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 13, overflow: "hidden" }}>
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, cards_count: Math.max(1, p.cards_count - 1) }))} style={{ width: 52, height: 52, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "#475569", strokeWidth: 2.5, fill: "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                            </button>
                                            <div style={{ flex: 1, textAlign: "center", fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{formData.cards_count}</div>
                                            <button type="button" onClick={() => setFormData(p => ({ ...p, cards_count: Math.min(15, p.cards_count + 1) }))} style={{ width: 52, height: 52, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "#475569", strokeWidth: 2.5, fill: "none" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                            </button>
                                        </div>
                                        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{language === "es" ? "Máximo 15 tarjetas por mazo" : "Maximum 15 cards per deck"}</p>
                                    </div>
                                )}

                                {/* Description */}
                                <div style={{ marginBottom: 20 }}>
                                    <div style={mLbl}>
                                        {language === "es" ? "Descripción" : "Description"}
                                        <span style={{ fontSize: 9, background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0", padding: "1px 7px", borderRadius: 20, fontWeight: 500, textTransform: "none", letterSpacing: ".3px" }}>{language === "es" ? "opcional" : "optional"}</span>
                                    </div>
                                    <textarea style={mTextarea} name="description" value={formData.description} onChange={handleChange} placeholder={language === "es" ? "Describe este mazo..." : "Describe this deck..."} />
                                </div>

                                {/* Visibility toggle */}
                                <div style={{ marginBottom: 20 }}>
                                    <div style={mLbl}>{language === "es" ? "Visibilidad" : "Visibility"}</div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 13, padding: "14px 16px" }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{language === "es" ? "Visibilidad Pública" : "Public Visibility"}</div>
                                            <div style={{ fontSize: 12, color: "#94a3b8" }}>{formData.visibility === "public" ? (language === "es" ? "Visible para todos" : "Visible to everyone") : (language === "es" ? "Solo visible para ti" : "Visible only to you")}</div>
                                        </div>
                                        <label style={{ position: "relative", width: 46, height: 26, flexShrink: 0, cursor: "pointer", display: "block" }}>
                                            <input type="checkbox" checked={formData.visibility === "public"} onChange={handleVisibilityChange} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
                                            <div style={{ position: "absolute", inset: 0, background: formData.visibility === "public" ? "rgb(57,73,171)" : "#e2e8f0", borderRadius: 13, transition: "background .25s" }} />
                                            <div style={{ position: "absolute", top: 3, left: formData.visibility === "public" ? 23 : 3, width: 20, height: 20, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "left .25s" }} />
                                        </label>
                                    </div>
                                </div>

                                {/* Documents & Sections */}
                                {!deck && (
                                    <div style={{ marginBottom: 24 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                            <div style={mLbl}>{language === "es" ? "Documentos & Secciones" : "Documents & Sections"}</div>
                                            {formData.section_ids.length > 0 && (
                                                <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(57,73,171,.10)", border: "1px solid rgba(57,73,171,.22)", borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: "rgb(57,73,171)", flexShrink: 0 }}>
                                                    <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, stroke: "rgb(57,73,171)", strokeWidth: 2, fill: "none" }}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18"/></svg>
                                                    {formData.section_ids.length} {language === "es" ? "sel." : "sel."}
                                                </div>
                                            )}
                                        </div>
                                        {loadingSections ? (
                                            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}><Spinner className="h-6 w-6" style={{ color: "rgb(57,73,171)" }} /></div>
                                        ) : scannedDocuments.length === 0 ? (
                                            <div style={{ padding: 16, background: "#fff1f2", border: "1.5px dashed #fca5a5", borderRadius: 13, textAlign: "center" }}>
                                                <ExclamationCircleIcon style={{ width: 28, height: 28, color: "#f87171", margin: "0 auto 6px" }} />
                                                <p style={{ fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>{language === "es" ? "No hay secciones. Sube un documento primero." : "No sections available. Upload a document first."}</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                                {scannedDocuments.map((doc) => {
                                                    const docSectionIds = (doc.sections || []).map(s => Number(s.id));
                                                    const allSel = docSectionIds.length > 0 && docSectionIds.every(id => formData.section_ids.includes(id));
                                                    const someSel = docSectionIds.some(id => formData.section_ids.includes(id));
                                                    const isOn = allSel || someSel;
                                                    return (
                                                        <div key={doc.id} onClick={() => handleDocumentToggle(doc)} style={{ background: isOn ? "rgba(57,73,171,.07)" : "#f8fafc", border: `1.5px solid ${isOn ? "rgba(57,73,171,.30)" : (errors.general ? "#ef4444" : "#e2e8f0")}`, borderRadius: 13, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                                                            <div style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${isOn ? "rgb(57,73,171)" : "#e2e8f0"}`, background: isOn ? "rgb(57,73,171)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                                {isOn && <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, stroke: "#fff", strokeWidth: 2.5, fill: "none" }}><polyline points="20 6 9 17 4 12"/></svg>}
                                                            </div>
                                                            <div style={{ width: 38, height: 38, borderRadius: 11, background: "#fee2e2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                                <svg viewBox="0 0 24 24" style={{ width: 17, height: 17, stroke: "#b91c1c", strokeWidth: 1.8, fill: "none" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>{doc.filename || doc.name}</div>
                                                                <div style={{ fontSize: 11, color: "#94a3b8" }}>{doc.type ? `.${doc.type}` : ""}{doc.size ? ` · ${Math.round(doc.size / 1024)} KB` : ""}</div>
                                                            </div>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(57,73,171,.10)", border: "1px solid rgba(57,73,171,.22)", borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "rgb(57,73,171)", flexShrink: 0 }}>
                                                                <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, stroke: "rgb(57,73,171)", strokeWidth: 2, fill: "none" }}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18"/></svg>
                                                                {(doc.sections || []).length}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {errors.general && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{errors.general}</p>}
                                    </div>
                                )}
                            </>
                        )}

                        {/* ── MANUAL MODE ── */}
                        {activeTab === "manual" && (
                            <>
                                {/* Title */}
                                <div style={{ marginBottom: 20 }}>
                                    <div style={mLbl}>
                                        {language === "es" ? "Título" : "Title"}
                                        <span style={{ width: 5, height: 5, background: "rgb(57,73,171)", borderRadius: "50%", display: "inline-block", flexShrink: 0 }} />
                                    </div>
                                    <input style={mInput(!!errors.title)} type="text" name="title" value={formData.title} onChange={handleChange} placeholder={language === "es" ? "Ej. Anatomía del Corazón" : "Ex. Heart Anatomy"} />
                                    {errors.title && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>{errors.title}</p>}
                                </div>

                                {/* Visibility toggle */}
                                <div style={{ marginBottom: 20 }}>
                                    <div style={mLbl}>{language === "es" ? "Visibilidad" : "Visibility"}</div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 13, padding: "14px 16px" }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>{language === "es" ? "Visibilidad Pública" : "Public Visibility"}</div>
                                            <div style={{ fontSize: 12, color: "#94a3b8" }}>{formData.visibility === "public" ? (language === "es" ? "Visible para todos" : "Visible to everyone") : (language === "es" ? "Solo visible para ti" : "Visible only to you")}</div>
                                        </div>
                                        <label style={{ position: "relative", width: 46, height: 26, flexShrink: 0, cursor: "pointer", display: "block" }}>
                                            <input type="checkbox" checked={formData.visibility === "public"} onChange={handleVisibilityChange} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
                                            <div style={{ position: "absolute", inset: 0, background: formData.visibility === "public" ? "rgb(57,73,171)" : "#e2e8f0", borderRadius: 13, transition: "background .25s" }} />
                                            <div style={{ position: "absolute", top: 3, left: formData.visibility === "public" ? 23 : 3, width: 20, height: 20, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "left .25s" }} />
                                        </label>
                                    </div>
                                </div>

                                {/* Description */}
                                <div style={{ marginBottom: 20 }}>
                                    <div style={mLbl}>
                                        {language === "es" ? "Descripción" : "Description"}
                                        <span style={{ fontSize: 9, background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0", padding: "1px 7px", borderRadius: 20, fontWeight: 500, textTransform: "none", letterSpacing: ".3px" }}>{language === "es" ? "opcional" : "optional"}</span>
                                    </div>
                                    <textarea style={mTextarea} name="description" value={formData.description} onChange={handleChange} placeholder={language === "es" ? "Describe este mazo..." : "Describe this deck..."} />
                                </div>

                                <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0 22px" }} />

                                {/* Card builder */}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                                    <div style={{ ...mLbl, marginBottom: 0 }}>
                                        {language === "es" ? "Tarjetas" : "Cards"}
                                        <span style={{ background: "rgb(57,73,171)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, minWidth: 22, textAlign: "center" }}>{formData.cards.length}</span>
                                    </div>
                                </div>

                                {/* Existing cards */}
                                {formData.cards.map((card, index) => (
                                    <div key={index} style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 12, position: "relative" }}>
                                        <div style={{ position: "absolute", top: -10, left: 14, background: "rgb(57,73,171)", color: "#fff", fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 20 }}>
                                            {language === "es" ? `Tarjeta ${index + 1}` : `Card ${index + 1}`}
                                        </div>
                                        <button type="button" onClick={() => removeCard(index)} style={{ position: "absolute", top: 10, right: 12, width: 24, height: 24, borderRadius: "50%", background: "#fee2e2", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, stroke: "#b91c1c", strokeWidth: 2.5, fill: "none" }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                                        </button>
                                        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 4, marginTop: 6 }}>{language === "es" ? "Frente" : "Front"}</div>
                                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500, marginBottom: 8 }}>{card.front}</div>
                                        <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}>{language === "es" ? "Reverso" : "Back"}</div>
                                        <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{card.back}</div>
                                        {card.notes && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6, fontStyle: "italic" }}>{card.notes}</div>}
                                    </div>
                                ))}

                                {/* New card input */}
                                <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 16, marginBottom: 12, position: "relative" }}>
                                    <div style={{ position: "absolute", top: -10, left: 14, background: "rgb(57,73,171)", color: "#fff", fontFamily: "'Syne', sans-serif", fontSize: 10, fontWeight: 800, padding: "2px 9px", borderRadius: 20 }}>
                                        {language === "es" ? `Tarjeta ${formData.cards.length + 1}` : `Card ${formData.cards.length + 1}`}
                                    </div>
                                    <div style={{ marginTop: 6 }}>
                                        <input style={{ width: "100%", padding: "10px 12px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontFamily: "inherit", fontSize: 13, color: "#0f172a", outline: "none", marginBottom: 8 }} type="text" name="front" value={currentCard.front} onChange={handleCurrentCardChange} placeholder={language === "es" ? "Frente (Pregunta)" : "Front (Question)"} />
                                        <input style={{ width: "100%", padding: "10px 12px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, fontFamily: "inherit", fontSize: 13, color: "#0f172a", outline: "none", marginBottom: 8 }} type="text" name="back" value={currentCard.back} onChange={handleCurrentCardChange} placeholder={language === "es" ? "Reverso (Respuesta)" : "Back (Answer)"} />
                                        <input style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, fontFamily: "inherit", fontSize: 12, color: "#475569", outline: "none" }} type="text" name="notes" value={currentCard.notes} onChange={handleCurrentCardChange} placeholder={language === "es" ? "Notas (Opcional)" : "Notes (Optional)"} />
                                    </div>
                                </div>

                                {/* Add to list button */}
                                <button
                                    type="button"
                                    onClick={addCard}
                                    disabled={!currentCard.front.trim() || !currentCard.back.trim()}
                                    style={{ width: "100%", padding: 12, background: "transparent", border: "1.5px dashed rgba(57,73,171,.30)", borderRadius: 13, cursor: !currentCard.front.trim() || !currentCard.back.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 600, color: !currentCard.front.trim() || !currentCard.back.trim() ? "#94a3b8" : "rgb(57,73,171)", marginBottom: 4, opacity: !currentCard.front.trim() || !currentCard.back.trim() ? 0.5 : 1 }}
                                >
                                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: "currentColor", strokeWidth: 2.5, fill: "none" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    {language === "es" ? "Agregar a la lista" : "Add to list"}
                                </button>
                                {errors.general && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{errors.general}</p>}
                                <div style={{ height: 8 }} />
                            </>
                        )}

                    </div>

                    {/* Bottom action bar */}
                    <div style={{ display: "flex", gap: 10, padding: "18px 20px", paddingBottom: "max(18px, env(safe-area-inset-bottom, 18px))", borderTop: "1px solid #e2e8f0", background: "#fff", flexShrink: 0, marginTop: 24 }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: 14, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 13, fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                            {language === "es" ? "Cancelar" : "Cancel"}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || (loadingSections && activeTab === "ai")}
                            style={{ flex: 2, padding: 14, background: submitting ? "rgba(57,73,171,.6)" : "linear-gradient(135deg, rgb(57,73,171) 0%, #818cf8 100%)", border: "none", borderRadius: 13, fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", cursor: submitting ? "not-allowed" : "pointer", boxShadow: "0 6px 20px rgba(57,73,171,.38)", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}
                        >
                            {submitting ? (
                                <Spinner className="h-4 w-4" />
                            ) : activeTab === "ai" ? (
                                <>
                                    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: "#fff", strokeWidth: 2.5, fill: "none" }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                    {language === "es" ? "Generar Mazo" : "Generate Deck"}
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: "#fff", strokeWidth: 2.5, fill: "none" }}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                                    {language === "es" ? "Crear Mazo" : "Create Deck"}
                                </>
                            )}
                        </button>
                    </div>

                </div>

                {/* ══════════════ DESKTOP (unchanged) ══════════════ */}
                <div className="hidden md:flex md:flex-col" style={{ height: "90vh" }}>
                <DialogHeader className="relative p-0 overflow-hidden bg-zinc-50 border-b border-zinc-100 flex-none">
                    <div className="px-6 py-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                            <RectangleStackIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <Typography variant="h6" className="text-zinc-900 font-black tracking-tight">
                                {deck && deck.id
                                    ? (language === "es" ? "Editar Mazo" : "Edit Deck")
                                    : (language === "es" ? "Crear Mazo" : "Create Deck")
                                }
                            </Typography>
                        </div>
                        <IconButton variant="text" color="blue-gray" onClick={onClose} className="rounded-full hover:bg-zinc-200/50">
                            <XMarkIcon className="h-6 w-6 text-zinc-400" strokeWidth={2} />
                        </IconButton>
                    </div>

                    {!deck && (
                        <div className="px-6 pb-0">
                            <Tabs value={activeTab}>
                                <TabsHeader
                                    className="bg-zinc-100/50 p-1 rounded-xl"
                                    indicatorProps={{ className: "bg-white shadow-sm rounded-lg" }}
                                >
                                    <Tab value="ai" onClick={() => setActiveTab("ai")} className="py-2 text-xs font-bold font-sans whitespace-nowrap">
                                        {language === "es" ? "Generar con IA" : "AI Generation"}
                                    </Tab>
                                    <Tab value="manual" onClick={() => setActiveTab("manual")} className="py-2 text-xs font-bold font-sans whitespace-nowrap">
                                        {language === "es" ? "Generar Manualmente" : "Manual Generation"}
                                    </Tab>
                                </TabsHeader>
                            </Tabs>
                        </div>
                    )}
                </DialogHeader>

                <DialogBody className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {/* Common Fields */}
                    {/* Layout differs by tab for better space usage */}
                    {activeTab === "manual" ? (
                        <>
                            {/* Manual Mode: Title + Visibility in one row */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                        {language === "es" ? "Título" : "Title"} <span className="text-red-500">*</span>
                                    </Typography>
                                    <Input
                                        placeholder={language === "es" ? "Ej. Anatomía del Corazón" : "Ex. Heart Anatomy"}
                                        className={`!bg-zinc-50/50 rounded-xl !text-zinc-900 ${errors.title ? "!border-red-500 focus:!border-red-600 shadow-sm shadow-red-50" : "!border-zinc-200 focus:!border-indigo-600"}`}
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        error={!!errors.title}
                                        labelProps={{ className: "hidden" }}
                                    />
                                    {errors.title && (
                                        <Typography variant="small" color="red" className="mt-1 font-medium flex items-center gap-1">
                                            <span className="h-1 w-1 rounded-full bg-red-500" /> {errors.title}
                                        </Typography>
                                    )}
                                </div>
                                <div className="flex-none min-w-[180px]">
                                    <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                        {t("project_detail.decks.visibility_label")}
                                    </Typography>
                                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 h-[44px]">
                                        <Typography variant="tiny" className="text-zinc-500 font-medium mr-2">
                                            {formData.visibility === "public" ? "Public" : "Private"}
                                        </Typography>
                                        <Switch
                                            checked={formData.visibility === "public"}
                                            onChange={handleVisibilityChange}
                                            color="indigo"
                                            className="h-full w-full checked:bg-indigo-500"
                                            containerProps={{ className: "w-8 h-5" }}
                                            circleProps={{ className: "before:hidden left-0.5 border-none h-4 w-4" }}
                                            ripple={false}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* AI Mode: Standard Layout */
                        <div className={`grid grid-cols-1 ${!deck ? "md:grid-cols-2" : ""} gap-6`}>
                            <div>
                                <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                    {language === "es" ? "Título" : "Title"} <span className="text-red-500">*</span>
                                </Typography>
                                <Input
                                    placeholder={language === "es" ? "Ej. Anatomía del Corazón" : "Ex. Heart Anatomy"}
                                    className={`!bg-zinc-50/50 rounded-xl !text-zinc-900 ${errors.title ? "!border-red-500 focus:!border-red-600 shadow-sm shadow-red-50" : "!border-zinc-200 focus:!border-indigo-600"}`}
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    error={!!errors.title}
                                    labelProps={{ className: "hidden" }}
                                />
                                {errors.title && (
                                    <Typography variant="small" color="red" className="mt-1 font-medium flex items-center gap-1">
                                        <span className="h-1 w-1 rounded-full bg-red-500" /> {errors.title}
                                    </Typography>
                                )}
                            </div>
                            {!deck && (
                                <div>
                                    <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                        {t("project_detail.decks.cards_count")}
                                    </Typography>
                                    <Input
                                        type="number" {...noWheel}
                                        min="1"
                                        max="15"
                                        className="!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl !text-zinc-900"
                                        name="cards_count"
                                        value={formData.cards_count}
                                        onChange={handleChange}
                                        labelProps={{ className: "hidden" }}
                                    />
                                    <Typography variant="small" className="mt-1 ml-1 text-zinc-400 text-[11px]">
                                        {language === "es" ? "Máximo 15 tarjetas por mazo." : "Maximum 15 cards per deck."}
                                    </Typography>
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                            {t("project_detail.decks.description")}
                        </Typography>
                        <Textarea
                            placeholder={language === "es" ? "Describe este mazo..." : "Describe this deck..."}
                            className="!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl !text-zinc-900 min-h-[80px]"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={2}
                            labelProps={{ className: "hidden" }}
                        />
                    </div>

                    {/* AI Mode: Visibility is separate below description */}
                    {activeTab === "ai" && (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 border border-zinc-100">
                            <div className="flex flex-col">
                                <Typography variant="small" className="font-bold text-zinc-900">
                                    {t("project_detail.decks.visibility_label")}
                                </Typography>
                                <Typography variant="tiny" className="text-zinc-500 font-medium">
                                    {formData.visibility === "public"
                                        ? (language === "es" ? "Visible para todos los usuarios" : "Visible to all users")
                                        : (language === "es" ? "Solo visible para ti" : "Visible only to you")
                                    }
                                </Typography>
                            </div>
                            <Switch
                                checked={formData.visibility === "public"}
                                onChange={handleVisibilityChange}
                                color="indigo"
                                className="h-full w-full checked:bg-indigo-500"
                                containerProps={{ className: "w-11 h-6" }}
                                circleProps={{ className: "before:hidden left-0.5 border-none" }}
                            />
                        </div>
                    )}

                    {/* AI SECTIONS SELECTION */}
                    {!deck && activeTab === "ai" && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <Typography variant="h6" className="font-black text-zinc-900">
                                    {t("project_detail.decks.documents")} & {t("project_detail.decks.sections")}
                                </Typography>
                                <Chip
                                    variant="ghost"
                                    color="indigo"
                                    className="rounded-lg border-indigo-100 bg-indigo-50 text-indigo-700 font-bold"
                                    value={`${formData.section_ids.length} ${t("project_detail.docs.table.sections")}`}
                                />
                            </div>

                            {loadingSections ? (
                                <div className="flex justify-center p-8 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    <Spinner className="h-6 w-6 text-indigo-500" />
                                </div>
                            ) : scannedDocuments.length === 0 ? (
                                <div className="p-8 text-center bg-red-50/50 rounded-2xl border border-dashed border-red-200 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <ExclamationCircleIcon className="h-8 w-8 text-red-400 mb-1" />
                                        <Typography variant="small" className="text-red-900 font-bold max-w-[280px] mx-auto leading-relaxed">
                                            {language === "es"
                                                ? "Usted no tiene secciones disponibles. Debe subir un documento para que el sistema procese el contenido."
                                                : "You don't have any sections available. You should upload a document so the system can process the content."}
                                        </Typography>
                                    </div>
                                </div>
                            ) : (
                                <div className={`border rounded-2xl overflow-y-auto max-h-72 bg-white shadow-sm transition-colors ${errors.general ? "border-red-500 bg-red-50/5" : "border-zinc-200"} `}>
                                    {scannedDocuments.map((doc, index) => {
                                        const docId = Number(doc.id);
                                        const docSections = doc.sections || [];
                                        const docSectionIds = docSections.map(s => Number(s.id));

                                        const allSelected = docSectionIds.length > 0 && docSectionIds.every(id => formData.section_ids.includes(id));
                                        const someSelected = docSectionIds.some(id => formData.section_ids.includes(id));

                                        return (
                                            <Accordion
                                                key={docId}
                                                open={openAccordion === index + 1}
                                                icon={<Icon id={index + 1} open={openAccordion} />}
                                                className="border-b border-zinc-100 last:border-b-0"
                                            >
                                                <AccordionHeader
                                                    className={`py-3 px-4 hover:bg-zinc-50 transition-colors border-b-0 ${openAccordion === index + 1 ? "bg-zinc-50" : ""}`}
                                                    onClick={() => handleOpenAccordion(index + 1)}
                                                >
                                                    <div className="flex items-center gap-4 w-full">
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox
                                                                color="indigo"
                                                                checked={allSelected}
                                                                indeterminate={someSelected && !allSelected}
                                                                onChange={() => handleDocumentToggle(doc)}
                                                                className="h-4 w-4 rounded-md border-zinc-300 bg-white transition-all hover:scale-105 hover:before:opacity-0"
                                                                containerProps={{ className: "p-0" }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 text-left flex items-center justify-between">
                                                            <Typography variant="small" className="font-bold text-zinc-900">
                                                                {doc.filename}
                                                            </Typography>
                                                            <Typography variant="small" className="font-bold text-zinc-400 text-[10px] bg-white border border-zinc-100 px-2 py-0.5 rounded-md">
                                                                {docSections.length} {t("project_detail.docs.table.sections")}
                                                            </Typography>
                                                        </div>
                                                    </div>
                                                </AccordionHeader>
                                                <AccordionBody className="py-2 px-4 bg-zinc-50/50">
                                                    <div className="flex flex-col gap-1 pl-8 pr-2 pb-2">
                                                        {docSections.map(section => (
                                                            <div
                                                                key={section.id}
                                                                className={`flex items-start gap-4 p-2 rounded-lg cursor-pointer transition-all border border-transparent ${formData.section_ids.includes(Number(section.id)) ? "bg-white shadow-sm border-zinc-200" : "hover:bg-zinc-100"}`}
                                                                onClick={() => handleSectionToggle(section.id, docId)}
                                                            >
                                                                <Checkbox
                                                                    color="indigo"
                                                                    checked={formData.section_ids.includes(Number(section.id))}
                                                                    readOnly
                                                                    className="h-4 w-4 rounded-md border-zinc-300 pointer-events-none"
                                                                    containerProps={{ className: "p-0 mt-0.5 pointer-events-none" }}
                                                                    ripple={false}
                                                                />
                                                                <div className="flex-1">
                                                                    <Typography variant="small" className="font-bold text-xs text-zinc-900 mb-0.5 capitalize">
                                                                        {section.title || (language === "es" ? "Sin título" : "Untitled")}
                                                                    </Typography>
                                                                    {section.content && (
                                                                        <Typography variant="small" className="text-[10px] text-zinc-500 line-clamp-2 leading-tight">
                                                                            {section.content}
                                                                        </Typography>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AccordionBody>
                                            </Accordion>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.general && (
                                <div className="p-3 mt-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                    {errors.general}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MANUAL CARDS ENTRY */}
                    {!deck && activeTab === "manual" && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Input Form Area */}
                            <div className="p-5 bg-zinc-50/80 rounded-2xl border border-zinc-200 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <Typography variant="small" className="font-black text-zinc-900 uppercase tracking-wider text-[10px]">
                                        {language === "es" ? "Nueva Ficha" : "New Card"}
                                    </Typography>
                                    <Chip
                                        value={formData.cards.length}
                                        size="sm"
                                        variant="ghost"
                                        color="indigo"
                                        className="rounded-full"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label={language === "es" ? "Frente (Pregunta)" : "Front (Question)"}
                                        name="front"
                                        value={currentCard.front}
                                        onChange={handleCurrentCardChange}
                                        className="bg-white"
                                    />
                                    <Input
                                        label={language === "es" ? "Reverso (Respuesta)" : "Back (Answer)"}
                                        name="back"
                                        value={currentCard.back}
                                        onChange={handleCurrentCardChange}
                                        className="bg-white"
                                    />
                                </div>
                                <Input
                                    label={language === "es" ? "Notas (Opcional)" : "Notes (Optional)"}
                                    name="notes"
                                    value={currentCard.notes}
                                    onChange={handleCurrentCardChange}
                                    className="bg-white"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        color="indigo"
                                        className="flex items-center gap-2 normal-case"
                                        onClick={addCard}
                                        disabled={!currentCard.front.trim() || !currentCard.back.trim()}
                                    >
                                        <PlusIcon className="h-3 w-3" />
                                        {language === "es" ? "Agregar a la lista" : "Add to list"}
                                    </Button>
                                </div>
                            </div>

                            {/* Added Cards List */}
                            {formData.cards.length > 0 && (
                                <div className="space-y-3">
                                    <Typography variant="small" className="font-bold text-zinc-500 text-xs uppercase tracking-wider ml-1">
                                        {language === "es" ? "Fichas Agregadas" : "Added Cards"}
                                    </Typography>
                                    {formData.cards.map((card, index) => (
                                        <div key={index} className="flex items-start justify-between p-4 bg-white rounded-xl border border-zinc-100 shadow-sm transition-all hover:border-indigo-100 hover:shadow-md group">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Typography variant="small" className="font-bold text-zinc-900 text-xs mb-1">
                                                        {language === "es" ? "Frente" : "Front"}
                                                    </Typography>
                                                    <Typography variant="small" className="text-zinc-600 leading-snug">
                                                        {card.front}
                                                    </Typography>
                                                </div>
                                                <div>
                                                    <Typography variant="small" className="font-bold text-zinc-900 text-xs mb-1">
                                                        {language === "es" ? "Reverso" : "Back"}
                                                    </Typography>
                                                    <Typography variant="small" className="text-zinc-600 leading-snug">
                                                        {card.back}
                                                    </Typography>
                                                </div>
                                            </div>
                                            <IconButton
                                                size="sm"
                                                color="red"
                                                variant="text"
                                                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => removeCard(index)}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </IconButton>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {errors.general && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                    {errors.general}
                                </div>
                            )}
                        </div>
                    )}
                </DialogBody>
                <DialogFooter className="bg-zinc-50/50 border-t border-zinc-100 p-4 flex justify-end gap-3 flex-none">
                    <Button
                        variant="text"
                        color="blue-gray"
                        onClick={onClose}
                        className="normal-case font-bold text-zinc-600 hover:bg-zinc-200/50"
                    >
                        {t("projects.dialogs.cancel")}
                    </Button>
                    <Button
                        type="submit"
                        variant="gradient"
                        color="indigo"
                        disabled={submitting || (loadingSections && activeTab === 'ai')}
                        className="normal-case font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                    >
                        {submitting ? <Spinner className="h-4 w-4" /> : (deck && deck.id ? t("global.actions.save") : t("projects.dialogs.create"))}
                    </Button>
                </DialogFooter>
            </div>
            </form>
        </Dialog>
    );
}

CreateDeckDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onCreate: PropTypes.func.isRequired,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    deck: PropTypes.object,
    existingDecks: PropTypes.array,
};

export default CreateDeckDialog;
