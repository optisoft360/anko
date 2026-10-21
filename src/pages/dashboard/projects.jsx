import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Card,
    CardHeader,
    CardBody,
    Typography,
    Button,
    Input,
    Tabs,
    TabsHeader,
    Tab,
    Spinner,
} from "@material-tailwind/react";
import {
    PlusIcon,
    MagnifyingGlassIcon,
    FolderIcon,
    BookOpenIcon,
    ChevronRightIcon,
    // UserGroupIcon,
} from "@heroicons/react/24/outline";
import { ProjectCard } from "@/widgets/cards/project-card";
import { CreateProjectDialog } from "@/widgets/dialogs/create-project-dialog";
import { EditProjectDialog } from "@/widgets/dialogs/edit-project-dialog";
import { ConfirmDialog } from "@/widgets/dialogs/confirm-dialog";
import projectService from "@/services/projectService";
import { useAuth } from "@/context/auth-context";
import UploadDocumentsDialog from "@/widgets/dialogs/upload-documents-dialog";

import { useProjects } from "@/context/projects-context";

import { useLanguage } from "@/context/language-context";
import { useJobs } from "@/context/job-context";
import { AppPagination } from "@/components/AppPagination";

export function Projects() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const { user } = useAuth();
    // Use global state
    const { projects, createProject, deleteProject, refreshAll, loading: contextLoading } = useProjects();
    const { activeJobs: globalActiveJobs, addJob, removeJob, clearAllJobs } = useJobs();

    // Local UI state
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [error, setError] = useState(null);
    const [mobileCounts, setMobileCounts] = useState({});
    const [deskFilter, setDeskFilter] = useState("all");
    const [deskSort, setDeskSort] = useState("updated");
    const [deskView, setDeskView] = useState("grid");
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [projPage, setProjPage] = useState(1);
    const [projPageSize, setProjPageSize] = useState(10);

    useEffect(() => {
        if (projects.length === 0) return;
        projects.forEach(async (project) => {
            try {
                const data = await projectService.getProjectCounts(project.id);
                setMobileCounts(prev => ({
                    ...prev,
                    [project.id]: {
                        documents: data.documents_count ?? project.documents_count ?? 0,
                        batteries: data.batteries_count ?? 0,
                        decks: data.decks_count ?? 0,
                    }
                }));
            } catch (_) {}
        });
    }, [projects]);

    const activeJobs = useMemo(() => {
        const projectJobs = {};
        globalActiveJobs.forEach(job => {
            if (!job) return; // Safety check
            const pid = job.projectId ? String(job.projectId) : null;
            if (pid) {
                if (!projectJobs[pid]) projectJobs[pid] = [];
                projectJobs[pid].push({ jobId: job.id, docId: job.docId });
            }
        });
        return projectJobs;
    }, [globalActiveJobs]);

    // No local fetch needed, context handles it.
    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    useEffect(() => {
        if (!menuOpenId) return;
        const close = () => setMenuOpenId(null);
        document.addEventListener("click", close);
        return () => document.removeEventListener("click", close);
    }, [menuOpenId]);

    useEffect(() => {
        setProjPage(1);
    }, [searchQuery, activeTab, deskFilter, deskSort]);




    // Default projects to show
    const defaultProjects = [
        {
            id: 1,
            title: "Design System",
            name: "Design System",
            description: "Build a comprehensive design system for web applications",
            owner: { id: user?.id || 1, name: user?.username || "You" },
            created_at: new Date().toISOString(),
            logo: null,
        },
        {
            id: 2,
            title: "Mobile App",
            name: "Mobile App",
            description: "React Native mobile application for iOS and Android",
            owner: { id: user?.id || 1, name: user?.username || "You" },
            created_at: new Date().toISOString(),
            logo: null,
        },
    ];
    const handleUploadDocs = (project) => {
        setUploadProject(project);
        setUploadDialogOpen(true);
    };

    const handleDoUploadDocs = async (projectId, response) => {
        // Jobs are already registered by UploadDocumentsDialog internal handler.
        // We just need to refresh the projects list to see the new document counts.
        try {
            await refreshAll();
        } catch (err) {
            setError(err?.error || "Failed to refresh project list");
        }
    };
    const handleJobComplete = async (projectId, jobId, docId) => {
        try {
            if (docId) {
                // Fetch tags as requested by user
                await projectService.getDocumentTags(docId);
            }
            if (jobId) removeJob(jobId);
            refreshAll();
        } catch (err) {
            console.error("Error handling job completion:", err);
        }
    };

    // Get projects based on active tab
    const getFilteredProjects = () => {
        let filtered = projects;

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (p) =>
                    (p.title || p.name).toLowerCase().includes(query) ||
                    (p.description || "").toLowerCase().includes(query) ||
                    (p.owner?.name || "").toLowerCase().includes(query)
            );
        }

        // Filter by tab
        if (activeTab === "owned") {
            filtered = filtered.filter((p) => p.owner?.id === user?.id);
        }
        // TODO: Implement member filter when API supports it

        return filtered;
    };

    const filteredProjects = getFilteredProjects();
    const isOwner = (project) => project?.owner?.id === user?.id;


    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadProject, setUploadProject] = useState(null);



    // Por ahora no hay progreso en el API, dejamos 0
    const getProjectProgress = (_projectId) => 0;

    // No tienes esas features todavía, las dejamos deshabilitadas
    const handleDuplicateProject = () => {
        setError("Duplicate Project not implemented yet");
    };

    const handleArchiveProject = () => {
        setError("Archive Project not implemented yet");
    };

    // Handlers
    // const handleCreateProject = async (projectData, files) => {
    //     try {
    //         await fetchProjects(); // Refresh list after create
    //         setCreateDialogOpen(false);
    //     } catch (err) {
    //         setError(err?.error || "Failed to create project");
    //     }
    // };
    const handleCreateProject = async (createdProject) => {
        // Context createProject already refreshes, but the dialog returns the created object
        // If the dialog CALLS the service itself, we just need refreshAll.
        // Assuming the dialog returns data to BE created:
        // But wait, CreateProjectDialog usually calls onCreate.
        // Let's assume standard pattern: Dialog calls service? or Parent calls service?
        // Checking typical pattern: Dialog passes data, Parent calls service.
        // However, earlier code had `await projectService.getProjects()` in `fetchProjects`.

        // Actually, checking CreateProjectDialog usage below... `onCreate={handleCreateProject}`.
        // If CreateProjectDialog calls API, `createdProject` is the result.
        // If CreateProjectDialog just passes data, `createdProject` is the form data.
        // Based on "await fetchProjects()" in original code, likely the dialog does NOT call API?
        // Or it does, and just wants refresh.

        // Safest: call refreshAll().
        try {
            await refreshAll();
            setCreateDialogOpen(false);
        } catch (err) {
            setError("Failed to refresh");
        }
    };
    const getProjectDocuments = (projectId) => {
        const project = projects.find((p) => p.id === projectId);
        return project?.documents || [];
    };
    const handleEnterProject = (project, tab = null) => {
        navigate(`/dashboard/project/${project.id}`, { state: { activeTab: tab } });
    };

    const handleEditProject = (project) => {
        setSelectedProject(project);
        setEditDialogOpen(true);
    };

    const handleSaveEdit = async (updates) => {
        if (selectedProject) {
            try {
                await refreshAll();
                setEditDialogOpen(false);
            } catch (err) {
                setError(err?.error || "Failed to update project");
            }
        }
    };

    const handleDeleteProject = (project) => {
        setSelectedProject(project);
        setConfirmAction("delete");
        setConfirmDialogOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!selectedProject) return;

        try {
            if (confirmAction === "delete") {
                await deleteProject(selectedProject.id); // Uses context
            }
            setSelectedProject(null);
            setConfirmAction(null);
            setConfirmDialogOpen(false);
        } catch (err) {
            setError(err?.error || "Failed to perform action");
        }
    };
    const getConfirmDialogProps = () => {
        if (confirmAction === "delete") {
            return {
                title: t("projects.dialogs.delete_title"),
                message: t("projects.dialogs.delete_message", { name: selectedProject?.title || selectedProject?.name }),
                confirmText: t("projects.dialogs.delete_confirm"),
                variant: "danger",
            };
        }

        return {
            title: t("projects.dialogs.confirm_title"),
            message: t("projects.dialogs.confirm_message"),
            confirmText: t("projects.dialogs.confirm_btn"),
            variant: "info",
        };
    };

    // const getConfirmDialogProps = () => {
    //     if (confirmAction === "delete") {
    //         return {
    //             title: "Delete Project",
    //             message: `Are you sure you want to permanently delete "${selectedProject?.title || selectedProject?.name}"? This action cannot be undone.`,
    //             confirmText: "Delete",
    //             variant: "danger",
    //         };
    //     }
    //     return {};
    // };

    const CARD_THEMES = [
        { bg: "linear-gradient(135deg, #4F46E5, #6366F1)", orb1: "rgba(129,140,248,.55)", orb2: "rgba(57,73,171,.3)", avatar: "linear-gradient(135deg, #3949AB, #818cf8)" },
        { bg: "linear-gradient(135deg, #0D9488, #14B8A6)", orb1: "rgba(45,212,191,.4)", orb2: "rgba(20,184,166,.25)", avatar: "linear-gradient(135deg, #0f766e, #2dd4bf)" },
        { bg: "linear-gradient(135deg, #7C3AED, #8B5CF6)", orb1: "rgba(192,132,252,.45)", orb2: "rgba(139,92,246,.25)", avatar: "linear-gradient(135deg, #7c3aed, #a78bfa)" },
        { bg: "linear-gradient(135deg, #E11D48, #F43F5E)", orb1: "rgba(251,113,133,.45)", orb2: "rgba(244,63,94,.25)", avatar: "linear-gradient(135deg, #be123c, #fb7185)" },
    ];

    const deskTotalBatteries = projects.reduce((sum, p) => sum + (mobileCounts[p.id]?.batteries ?? p.batteries_count ?? 0), 0);
    const deskTotalDecks     = projects.reduce((sum, p) => sum + (mobileCounts[p.id]?.decks     ?? p.decks_count     ?? 0), 0);
    const deskTotalDocs      = projects.reduce((sum, p) => sum + (mobileCounts[p.id]?.documents  ?? p.documents_count ?? 0), 0);

    const deskMostActiveId = projects.reduce((bestId, p) => {
        const score = (mobileCounts[p.id]?.batteries ?? 0) + (mobileCounts[p.id]?.decks ?? 0);
        const best  = bestId ? (mobileCounts[bestId]?.batteries ?? 0) + (mobileCounts[bestId]?.decks ?? 0) : -1;
        return score > best ? p.id : bestId;
    }, null);

    let deskSortedProjects = [...filteredProjects];
    if (deskSort === "name") {
        deskSortedProjects.sort((a, b) => (a.title || a.name || "").toLowerCase().localeCompare((b.title || b.name || "").toLowerCase()));
    } else if (deskSort === "active") {
        deskSortedProjects.sort((a, b) => ((mobileCounts[b.id]?.batteries ?? 0) + (mobileCounts[b.id]?.decks ?? 0)) - ((mobileCounts[a.id]?.batteries ?? 0) + (mobileCounts[a.id]?.decks ?? 0)));
    } else {
        deskSortedProjects.sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    }

    const projStart = (projPage - 1) * projPageSize;
    const paginatedMobile = filteredProjects.slice(projStart, projStart + projPageSize);
    const paginatedDesk   = deskSortedProjects.slice(projStart, projStart + projPageSize);

    return (
        <div className="mt-0 pb-20 md:pb-0">

            {/* ── Mobile Header + Search (hidden on desktop) ── */}
            {/* Mobile sticky header — same structure as My Batteries / My Decks */}
            <div className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-zinc-100 px-3 py-2.5 flex items-center gap-2 mb-3">
                <div className="flex-1 min-w-0">
                    <p style={{ fontSize: "14px", fontWeight: 700, color: "#1a1a2e" }}>{t("projects.title")}</p>
                    <p style={{ fontSize: "10px", color: "#888" }}>{projects.length} {language === "es" ? "total" : "total"}</p>
                </div>
                <div className="relative" style={{ flex: "0 0 140px" }}>
                    <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    <input
                        type="text"
                        placeholder={language === "es" ? "Buscar..." : "Search..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: "100%", paddingLeft: "22px", paddingRight: "8px", paddingTop: "5px", paddingBottom: "5px", borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "11px", outline: "none", background: "#f9f9f9" }}
                    />
                </div>
            </div>

            {/* ══ DESKTOP — New Design ══ */}
            <div className="hidden md:block" style={{ margin: "0 -16px 0", background: "#ffffff", padding: "24px 40px 0", fontFamily: "'DM Sans', sans-serif" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>

                {/* PAGE TOP */}
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: "#3949AB", marginBottom: 10 }}>
                            <div style={{ width: 24, height: 2, background: "#3949AB", borderRadius: 1 }} />
                            {language === "es" ? "Espacio de trabajo" : "Workspace"}
                        </div>
                        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 40, fontWeight: 800, color: "#0f172a", letterSpacing: "-1.4px", lineHeight: 1, marginBottom: 10 }}>
                            {language === "es" ? "Mis Proyectos" : "My Projects"}
                        </h1>
                        {/* <div style={{ fontSize: 15, color: "#94a3b8", display: "flex", alignItems: "center", gap: 16 }}>
                            <span><strong style={{ color: "#0f172a", fontWeight: 600 }}>{projects.length}</strong> {language === "es" ? "proyectos" : "projects"}</span>
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#e2e8f0" }} />
                            <span><strong style={{ color: "#0f172a", fontWeight: 600 }}>{deskTotalBatteries}</strong> {language === "es" ? "baterías" : "batteries"}</span>
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#e2e8f0" }} />
                            <span><strong style={{ color: "#0f172a", fontWeight: 600 }}>{deskTotalDecks}</strong> {language === "es" ? "mazos" : "decks"}</span>
                        </div> */}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ position: "relative" }}>
                            <svg style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, stroke: "#94a3b8", strokeWidth: 2, fill: "none", pointerEvents: "none" }} viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            <input type="text" placeholder={language === "es" ? "Buscar proyectos…" : "Search projects…"} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: 260, padding: "11px 14px 11px 38px", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 13, fontFamily: "inherit", fontSize: 14, color: "#0f172a", outline: "none", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }} />
                        </div>
                        <button onClick={() => setCreateDialogOpen(true)}
                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 13, background: "linear-gradient(135deg, #3949AB 0%, #6366f1 100%)", color: "#fff", fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(57,73,171,0.18)", whiteSpace: "nowrap" }}>
                            <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: "#fff", strokeWidth: 2.5, fill: "none" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            {language === "es" ? "Crear Proyecto" : "Create Project"}
                        </button>
                    </div>
                </div>

                {/* SUMMARY STRIP */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 36 }}>
                    {[
                        { ico: <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: "#3949AB", strokeWidth: 1.8, fill: "none" }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>, num: projects.length, lbl: language === "es" ? "Proyectos" : "Projects", bg: "rgba(57,73,171,0.08)", border: "rgba(57,73,171,0.18)" },
                        { ico: <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: "#16a34a", strokeWidth: 1.8, fill: "none" }}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>, num: deskTotalBatteries, lbl: language === "es" ? "Baterías" : "Batteries", bg: "#dcfce7", border: "#86efac" },
                        { ico: <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: "#d97706", strokeWidth: 1.8, fill: "none" }}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, num: deskTotalDecks, lbl: language === "es" ? "Mazos" : "Decks", bg: "#fef3c7", border: "#fde68a" },
                        { ico: <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, stroke: "#7c3aed", strokeWidth: 1.8, fill: "none" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, num: deskTotalDocs, lbl: language === "es" ? "Documentos" : "Documents", bg: "#f3e8ff", border: "#d8b4fe" },
                    ].map((item, i) => (
                        <div key={i} style={{ background: "#fff", borderRadius: 18, border: "1.5px solid #e2e8f0", padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}>
                            <div style={{ width: 46, height: 46, borderRadius: 14, background: item.bg, border: `1.5px solid ${item.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{item.ico}</div>
                            <div>
                                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "#0f172a", lineHeight: 1, marginBottom: 3 }}>{item.num}</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".8px" }}>{item.lbl}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* FILTER BAR */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 26, background: "#fff" }}>
                    {[
                        { key: "all",    lbl: language === "es" ? "Todos"     : "All Projects" },
                        { key: "recent", lbl: language === "es" ? "Recientes" : "Recent" },
                    ].map(fc => (
                        <button key={fc.key} onClick={() => setDeskFilter(fc.key)}
                            style={{ padding: "8px 18px", borderRadius: 20, fontSize: 13, fontWeight: 600, border: "1.5px solid", borderColor: deskFilter === fc.key ? "#3949AB" : "#e2e8f0", color: deskFilter === fc.key ? "#fff" : "#475569", background: deskFilter === fc.key ? "#3949AB" : "#fff", cursor: "pointer" }}>
                            {fc.lbl}
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{language === "es" ? "Ordenar por" : "Sort by"}</span>
                        <select value={deskSort} onChange={(e) => setDeskSort(e.target.value)}
                            style={{ padding: "8px 14px", borderRadius: 10, fontFamily: "inherit", fontSize: 13, color: "#475569", background: "#fff", border: "1.5px solid #e2e8f0", outline: "none", cursor: "pointer" }}>
                            <option value="updated">{language === "es" ? "Última actualización" : "Last updated"}</option>
                            <option value="name">{language === "es" ? "Nombre A–Z" : "Name A–Z"}</option>
                            <option value="active">{language === "es" ? "Más activo" : "Most active"}</option>
                        </select>
                    </div>
                    <div style={{ display: "flex", gap: 3, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 11, padding: 3 }}>
                        {[
                            { v: "grid", path: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></> },
                            { v: "list", path: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></> },
                        ].map(vb => (
                            <button key={vb.v} onClick={() => setDeskView(vb.v)}
                                style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: deskView === vb.v ? "rgba(57,73,171,0.08)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: deskView === vb.v ? "#3949AB" : "#94a3b8", strokeWidth: 1.8, fill: "none" }}>{vb.path}</svg>
                            </button>
                        ))}
                    </div>
                </div>
            </div>{/* /maxWidth */}
            </div>{/* /desktop header+summary+filters */}


            {/* ── Mobile Cards (hidden on desktop) ── */}
            <div className="md:hidden px-4">
                {filteredProjects.length > 0 ? (
                    <>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1.3px", color: "#94a3b8", textTransform: "uppercase", margin: 0 }}>
                                {language === "es" ? "Recientes" : "Recent"}
                            </p>
                            <button
                                onClick={() => setCreateDialogOpen(true)}
                                className="shrink-0 font-semibold text-white transition-all active:scale-95"
                                style={{ background: "var(--ank-purple)", fontSize: "9px", padding: "5px 10px", borderRadius: "8px", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                                + {language === "es" ? "Nuevo Proyecto" : "New Project"}
                            </button>
                        </div>
                        {paginatedMobile.map((project, index) => {
                            const isFeatured = projPage === 1 && index === 0;
                            const title = project.title || project.name || "Untitled";
                            const updatedAt = project.updated_at || project.created_at;
                            const dateStr = updatedAt
                                ? new Date(updatedAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" })
                                : "";
                            return (
                                <div
                                    key={project.id}
                                    onClick={() => handleEnterProject(project)}
                                    style={{
                                        background: isFeatured ? "linear-gradient(140deg, #fff 55%, #f4f6ff 100%)" : "#fff",
                                        borderRadius: 18,
                                        padding: 16,
                                        marginBottom: 12,
                                        border: `1.5px solid ${isFeatured ? "rgba(57,73,171,0.28)" : "#e2e8f0"}`,
                                        cursor: "pointer",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    {isFeatured && (
                                        <div style={{
                                            position: "absolute", top: 0, left: 0,
                                            width: "100%", height: 3,
                                            background: "linear-gradient(90deg, #3949AB, #818cf8)",
                                            borderRadius: "18px 18px 0 0",
                                        }} />
                                    )}
                                    {/* Top row */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                                        <div style={{
                                            width: 40, height: 40,
                                            background: "rgba(57, 73, 171)",
                                            borderRadius: 11,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            border: "1px solid rgba(57,73,171,0.28)",
                                            flexShrink: 0,
                                        }}>
                                            <BookOpenIcon style={{ width: 17, height: 17, color: "#ffffff", strokeWidth: 1.8 }} />
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            {isFeatured && (
                                                <span style={{
                                                    display: "inline-flex", alignItems: "center", gap: 5,
                                                    background: "rgba(57,73,171,0.10)",
                                                    border: "1px solid rgba(57,73,171,0.28)",
                                                    color: "#3949AB", fontSize: 10, fontWeight: 600,
                                                    padding: "3px 9px", borderRadius: 20,
                                                }}>
                                                    <span style={{ width: 5, height: 5, background: "#3949AB", borderRadius: "50%" }} />
                                                    {language === "es" ? "Activo" : "Active"}
                                                </span>
                                            )}
                                            {/* 3-dot menu mobile */}
                                            <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => setMenuOpenId(menuOpenId === `m-${project.id}` ? null : `m-${project.id}`)}
                                                    style={{ width: 30, height: 30, borderRadius: 9, background: "#f8fafc", border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                                >
                                                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: "#94a3b8", strokeWidth: 2, fill: "none" }}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                                </button>
                                                {menuOpenId === `m-${project.id}` && (
                                                    <div style={{ position: "absolute", top: 34, right: 0, background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,.12)", minWidth: 170, zIndex: 50, overflow: "hidden" }}>
                                                        <button onClick={() => { setMenuOpenId(null); handleEnterProject(project); }} style={{ width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 500, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "#475569", strokeWidth: 2, fill: "none" }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                                            {language === "es" ? "Entrar al Proyecto" : "Enter Project"}
                                                        </button>
                                                        <button onClick={() => { setMenuOpenId(null); handleUploadDocs(project); }} style={{ width: "100%", padding: "10px 16px", textAlign: "left", background: "none", borderTop: "1px solid #e2e8f0", borderLeft: "none", borderRight: "none", borderBottom: "none", fontSize: 13, fontWeight: 500, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "#475569", strokeWidth: 2, fill: "none" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                            {language === "es" ? "Subir Documentos" : "Upload Documents"}
                                                        </button>
                                                        {isOwner(project) && <button onClick={() => { setMenuOpenId(null); handleEditProject(project); }} style={{ width: "100%", padding: "10px 16px", textAlign: "left", background: "none", borderTop: "1px solid #e2e8f0", borderLeft: "none", borderRight: "none", borderBottom: "none", fontSize: 13, fontWeight: 500, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "#475569", strokeWidth: 2, fill: "none" }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                            {language === "es" ? "Editar Detalles" : "Edit Details"}
                                                        </button>}
                                                        {isOwner(project) && <button onClick={() => { setMenuOpenId(null); handleDeleteProject(project); }} style={{ width: "100%", padding: "10px 16px", textAlign: "left", background: "none", borderTop: "1px solid #e2e8f0", borderLeft: "none", borderRight: "none", borderBottom: "none", fontSize: 13, fontWeight: 500, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "#ef4444", strokeWidth: 2, fill: "none" }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                                            {language === "es" ? "Eliminar Proyecto" : "Delete Project"}
                                                        </button>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Title + date */}
                                    <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 3, letterSpacing: "-0.3px" }}>
                                        {title}
                                    </p>
                                    <p style={{ fontSize: 11, color: "#94a3b8" }}>
                                        {language === "es" ? "Actualizado" : "Updated"} {dateStr}
                                    </p>
                                    {/* Divider */}
                                    <div style={{ height: 1, background: "#e2e8f0", margin: "12px 0" }} />
                                    {/* Stats */}
                                    <div style={{ display: "flex" }}>
                                        {[
                                            { num: mobileCounts[project.id]?.documents ?? project.documents_count ?? 0, lbl: "Docs" },
                                            { num: mobileCounts[project.id]?.batteries ?? project.batteries_count ?? 0, lbl: language === "es" ? "Baterías" : "Batteries" },
                                            { num: mobileCounts[project.id]?.decks ?? project.decks_count ?? 0, lbl: language === "es" ? "Mazos" : "Decks" },
                                        ].map((s, i) => (
                                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}>
                                                {i < 2 && <div style={{ position: "absolute", right: 0, top: "10%", width: 1, height: "80%", background: "#e2e8f0" }} />}
                                                <span style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{s.num}</span>
                                                <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", fontWeight: 500 }}>{s.lbl}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {/* Pagination */}
                        <AppPagination
                            page={projPage}
                            pageSize={projPageSize}
                            totalCount={filteredProjects.length}
                            onPageChange={setProjPage}
                            onPageSizeChange={(size) => { setProjPageSize(size); setProjPage(1); }}
                        />
                    </>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 0", textAlign: "center" }}>
                        <FolderIcon style={{ width: 56, height: 56, color: "#cbd5e1", marginBottom: 16 }} />
                        <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>
                            {t("projects.no_projects")}
                        </p>
                        <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
                            {searchQuery ? t("projects.no_projects_desc") : t("projects.no_projects_cta")}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => setCreateDialogOpen(true)}
                                style={{
                                    background: "#3949AB", color: "#fff", border: "none",
                                    borderRadius: 12, padding: "10px 20px",
                                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: 6,
                                }}
                            >
                                <PlusIcon style={{ width: 16, height: 16 }} />
                                {t("projects.btn_create")}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ══ DESKTOP GRID ══ */}
            <div className="hidden md:block" style={{ background: "#ffffff", padding: "0 40px 80px", margin: "0 -16px 0" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                {/* PROJECTS GRID / LIST */}
                {deskSortedProjects.length > 0 ? (
                    <>
                    <div style={{ display: "grid", gridTemplateColumns: deskView === "grid" ? "repeat(auto-fill, minmax(310px, 1fr))" : "1fr", gap: 18 }}>
                        {paginatedDesk.map((project, index) => {
                            const theme = CARD_THEMES[index % CARD_THEMES.length];
                            const title = project.title || project.name || "Untitled";
                            const initial = title.charAt(0).toUpperCase();
                            const updatedAt = project.updated_at || project.created_at;
                            const dateStr = updatedAt ? new Date(updatedAt).toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "long", day: "numeric", year: "numeric" }) : "—";
                            const docs      = mobileCounts[project.id]?.documents  ?? project.documents_count  ?? 0;
                            const batteries = mobileCounts[project.id]?.batteries ?? project.batteries_count ?? 0;
                            const decks     = mobileCounts[project.id]?.decks     ?? project.decks_count     ?? 0;
                            const isMostActive = project.id === deskMostActiveId && (batteries + decks) > 0;
                            const ownerName = project.owner?.name || user?.username || "me";
                            return (
                                <div key={project.id}
                                    onClick={() => menuOpenId !== project.id && handleEnterProject(project)}
                                    style={{ background: "#fff", borderRadius: 22, border: "1.5px solid #e2e8f0", overflow: "visible", cursor: "pointer", transition: "all .25s", position: "relative", display: "flex", flexDirection: deskView === "list" ? "row" : "column", boxShadow: "0 2px 8px rgba(0,0,0,.04)" }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(57,73,171,0.18)"; e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 20px 48px rgba(57,73,171,0.18)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.04)"; }}
                                >
                                    {/* Colored header */}
                                    <div style={{ height: deskView === "list" ? "auto" : 100, width: deskView === "list" ? 120 : "auto", minWidth: deskView === "list" ? 120 : "auto", background: theme.bg, position: "relative", overflow: "visible", display: "flex", alignItems: "center", padding: deskView === "list" ? "0 0 0 22px" : "0 22px 16px", borderRadius: deskView === "list" ? "22px 0 0 22px" : "22px 22px 0 0" }}>
                                        {/* Orbs + grid clipped to header — own overflow container */}
                                        <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit", pointerEvents: "none" }}>
                                            <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${theme.orb1} 0%, transparent 60%)`, top: -80, right: -50 }} />
                                            <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${theme.orb2} 0%, transparent 60%)`, bottom: -40, left: -20 }} />
                                            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
                                        </div>
                                        {isMostActive && deskView === "grid" && (
                                            <div style={{ position: "absolute", top: 12, left: 14, zIndex: 2, display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.22)", padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: "#fff", letterSpacing: ".4px" }}>
                                                <span style={{ width: 5, height: 5, background: "#4ade80", borderRadius: "50%" }} />
                                                {language === "es" ? "Más activo" : "Most active"}
                                            </div>
                                        )}
                                        {/* 3-dot menu — overflow:visible so dropdown escapes the 100px header */}
                                        {deskView === "grid" && (
                                            <div style={{ position: "absolute", top: 12, right: 14, zIndex: 20 }} onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => setMenuOpenId(menuOpenId === project.id ? null : project.id)}
                                                    style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: "#fff", strokeWidth: 2, fill: "none" }}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                                </button>
                                                {menuOpenId === project.id && (
                                                    <div style={{ position: "absolute", top: 36, right: 0, background: "#fff", borderRadius: 12, border: "1.5px solid #e2e8f0", boxShadow: "0 8px 24px rgba(0,0,0,.12)", minWidth: 170, zIndex: 100 }}>
                                                        <button onClick={() => { setMenuOpenId(null); handleEnterProject(project); }} style={{ width: "100%", padding: "10px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 500, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "#475569", strokeWidth: 2, fill: "none" }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                                            {language === "es" ? "Entrar al Proyecto" : "Enter Project"}
                                                        </button>
                                                        <button onClick={() => { setMenuOpenId(null); handleUploadDocs(project); }} style={{ width: "100%", padding: "10px 16px", textAlign: "left", background: "none", borderTop: "1px solid #e2e8f0", borderLeft: "none", borderRight: "none", borderBottom: "none", fontSize: 13, fontWeight: 500, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "#475569", strokeWidth: 2, fill: "none" }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                            {language === "es" ? "Subir Documentos" : "Upload Documents"}
                                                        </button>
                                                        {isOwner(project) && <button onClick={() => { setMenuOpenId(null); handleEditProject(project); }} style={{ width: "100%", padding: "10px 16px", textAlign: "left", background: "none", borderTop: "1px solid #e2e8f0", borderLeft: "none", borderRight: "none", borderBottom: "none", fontSize: 13, fontWeight: 500, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "#475569", strokeWidth: 2, fill: "none" }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                            {language === "es" ? "Editar Detalles" : "Edit Details"}
                                                        </button>}
                                                        {isOwner(project) && <button onClick={() => { setMenuOpenId(null); handleDeleteProject(project); }} style={{ width: "100%", padding: "10px 16px", textAlign: "left", background: "none", borderTop: "1px solid #e2e8f0", borderLeft: "none", borderRight: "none", borderBottom: "none", fontSize: 13, fontWeight: 500, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "#ef4444", strokeWidth: 2, fill: "none" }}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                                            {language === "es" ? "Eliminar Proyecto" : "Delete Project"}
                                                        </button>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div style={{ width: 46, height: 46, borderRadius: 14, background: theme.avatar, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", position: "relative", zIndex: 1, boxShadow: "0 4px 14px rgba(0,0,0,.2)", border: "2px solid rgba(255,255,255,.2)" }}>
                                            {initial}
                                        </div>
                                    </div>
                                    {/* Card body */}
                                    <div style={{ padding: "20px 22px 16px", flex: 1 }}>
                                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-.4px", marginBottom: 5 }}>{title}</div>
                                        <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 5, marginBottom: 18 }}>
                                            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: "#94a3b8", strokeWidth: 2, fill: "none" }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                            {language === "es" ? "Actualizado" : "Updated"} {dateStr}
                                        </div>
                                        <div style={{ display: "flex", background: "#f8fafc", borderRadius: 13, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                                            {[
                                                { num: docs,      lbl: "Docs" },
                                                { num: batteries, lbl: language === "es" ? "Baterías" : "Batteries" },
                                                { num: decks,     lbl: language === "es" ? "Mazos" : "Decks" },
                                            ].map((s, si) => (
                                                <div key={si} style={{ flex: 1, padding: "11px 0", textAlign: "center", position: "relative" }}>
                                                    {si < 2 && <div style={{ position: "absolute", right: 0, top: "15%", height: "70%", width: 1, background: "#e2e8f0" }} />}
                                                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: isMostActive ? "#3949AB" : "#0f172a", lineHeight: 1, marginBottom: 3 }}>{s.num}</div>
                                                    <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".8px" }}>{s.lbl}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Card footer */}
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderTop: "1px solid #e2e8f0" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #3949AB, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>{ownerName.charAt(0).toUpperCase()}</div>
                                            by {ownerName}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#3949AB" }}>
                                            {language === "es" ? "Abrir" : "Open"}
                                            <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: "#3949AB", strokeWidth: 2.5, fill: "none" }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Create card */}
                        <div onClick={() => setCreateDialogOpen(true)}
                            style={{ background: "rgba(255,255,255,.6)", borderRadius: 22, border: "1.5px dashed rgba(57,73,171,0.18)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, cursor: "pointer", minHeight: 260, transition: "all .25s" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#3949AB"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.transform = "translateY(-5px)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(57,73,171,0.18)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(57,73,171,0.18)"; e.currentTarget.style.background = "rgba(255,255,255,.6)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                            <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(57,73,171,0.08)", border: "1.5px solid rgba(57,73,171,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg viewBox="0 0 24 24" style={{ width: 22, height: 22, stroke: "#3949AB", strokeWidth: 2, fill: "none" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </div>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: "#3949AB" }}>{language === "es" ? "Nuevo Proyecto" : "New Project"}</div>
                            <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", maxWidth: 150, lineHeight: 1.6 }}>{language === "es" ? "Empieza a organizar tu contenido" : "Start organizing your study content"}</div>
                        </div>
                    </div>
                    <AppPagination
                        page={projPage}
                        pageSize={projPageSize}
                        totalCount={deskSortedProjects.length}
                        onPageChange={setProjPage}
                        onPageSizeChange={(size) => { setProjPageSize(size); setProjPage(1); }}
                    />
                    </>
                ) : (
                    <div style={{ textAlign: "center", padding: "64px 0" }}>
                        <svg viewBox="0 0 24 24" style={{ width: 56, height: 56, stroke: "#cbd5e1", strokeWidth: 1.5, fill: "none", margin: "0 auto 16px", display: "block" }}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        <p style={{ fontSize: 16, fontWeight: 600, color: "#0f172a", marginBottom: 8 }}>{t("projects.no_projects")}</p>
                        <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20 }}>{searchQuery ? t("projects.no_projects_desc") : t("projects.no_projects_cta")}</p>
                        {!searchQuery && (
                            <button onClick={() => setCreateDialogOpen(true)} style={{ background: "#3949AB", color: "#fff", border: "none", borderRadius: 12, padding: "11px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}>
                                <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: "#fff", strokeWidth: 2.5, fill: "none" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                {t("projects.btn_create")}
                            </button>
                        )}
                    </div>
                )}
            </div>{/* /maxWidth */}
            </div>{/* /desktop block */}

            {/* Dialogs */}
            <CreateProjectDialog
                open={createDialogOpen}
                onClose={() => setCreateDialogOpen(false)}
                onCreate={handleCreateProject}
                projects={projects}
            />

            <EditProjectDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                onSave={handleSaveEdit}
                project={selectedProject}
            />
            <ConfirmDialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                onConfirm={handleConfirmAction}
                title={getConfirmDialogProps().title || "Confirm"}
                message={getConfirmDialogProps().message || "Are you sure?"}
                confirmText={getConfirmDialogProps().confirmText || "Confirm"}
                variant={getConfirmDialogProps().variant || "default"}
            />

            <UploadDocumentsDialog
                open={uploadDialogOpen}
                onClose={() => {
                    setUploadDialogOpen(false);
                    setUploadProject(null);
                }}
                project={uploadProject}
                onUpload={handleDoUploadDocs}
            />



            {/* <ConfirmDialog
                open={confirmDialogOpen}
                onClose={() => setConfirmDialogOpen(false)}
                onConfirm={handleConfirmAction}
                {...getConfirmDialogProps()}
            /> */}
        </div>
    );
}

export default Projects;
