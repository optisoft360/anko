import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
    Dialog,
    Spinner,
} from "@material-tailwind/react";
import {
    DocumentTextIcon,
    DocumentIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useParams } from "react-router-dom";
import { useLanguage } from "@/context/language-context";
import projectService from "@/services/projectService";

export function DocumentMetadataDialog({ open, onClose, document }) {
    const { t, language } = useLanguage();
    const { projectId } = useParams();

    const [sections, setSections] = useState([]);
    const [loadingSections, setLoadingSections] = useState(false);
    const [errorSections, setErrorSections] = useState(null);
    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [summaryOpen, setSummaryOpen] = useState(false);

    useEffect(() => {
        if (open && document && projectId) {
            fetchSections();
            fetchSummary();
        } else {
            setSections([]);
            setErrorSections(null);
            setSummary(null);
        }
    }, [open, document, projectId]);

    const fetchSections = async () => {
        setLoadingSections(true);
        setErrorSections(null);
        try {
            const data = await projectService.getDocumentsWithSections(projectId, document.id);
            const docData = data.document;
            setSections(docData?.sections ?? []);
        } catch (err) {
            setErrorSections(typeof err === "string" ? err : (err?.error || err?.detail || t("global.sections.loading_error")));
        } finally {
            setLoadingSections(false);
        }
    };

    const fetchSummary = async () => {
        setLoadingSummary(true);
        try {
            const data = await projectService.getDocumentSummary(document.id);
            setSummary(data.summary || null);
        } catch {
            setSummary(null);
        } finally {
            setLoadingSummary(false);
        }
    };

    if (!document) return null;

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "ready":      return language === "es" ? "Listo" : "Ready";
            case "processing": return language === "es" ? "Procesando" : "Processing";
            case "error":      return language === "es" ? "Error" : "Error";
            default:           return language === "es" ? "Finalizado" : "Finalized";
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case "ready":      return { background: "#dcfce7", color: "#15803d", dot: "#22c55e" };
            case "processing": return { background: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" };
            case "error":      return { background: "#fee2e2", color: "#b91c1c", dot: "#ef4444" };
            default:           return { background: "#dcfce7", color: "#15803d", dot: "#22c55e" };
        }
    };

    const uploadedDate = document.uploaded_at ? new Date(document.uploaded_at) : null;
    const dateStr = uploadedDate
        ? uploadedDate.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";
    const timeStr = uploadedDate
        ? uploadedDate.toLocaleTimeString(language === "es" ? "es-ES" : "en-US", { hour: "2-digit", minute: "2-digit" })
        : "—";

    const statusStyle = getStatusStyle(document.status);

    /* ── reusable inline card style ── */
    const infoCard = {
        background: "#f8fafc", borderRadius: 13, padding: "12px 14px",
        border: "1.5px solid var(--lt-e2e8f0, #e2e8f0)", position: "relative", overflow: "hidden",
    };
    const infoBar = {
        position: "absolute", left: 0, top: 0, bottom: 0,
        width: 3, background: "#3949AB", borderRadius: "13px 0 0 13px",
    };
    const labelStyle = {
        fontSize: 10, fontWeight: 600, color: "var(--lt-94a3b8, #94a3b8)",
        textTransform: "uppercase", letterSpacing: "1.1px", marginBottom: 5,
    };

    return (
        <Dialog
            open={open}
            handler={onClose}
            size="md"
            className="!p-0 !mx-0 !my-0 !rounded-t-[24px] !rounded-b-none !max-w-full !w-full md:!mx-auto md:!my-8 md:!rounded-[20px] md:!max-w-lg overflow-hidden"
        >
        <div className="flex flex-col h-[100dvh] md:h-auto md:max-h-[85vh]">
            {/* ── Indigo header strip ── */}
            <div style={{ background: "#3949AB", padding: "16px 20px 20px", flexShrink: 0 }}>
                {/* Drag handle (mobile) */}
                <div className="md:hidden" style={{ width: 38, height: 4, background: "var(--lt-rgba-255-255-255-0-30, rgba(255,255,255,0.30))", borderRadius: 2, margin: "0 auto 18px" }} />

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 4, letterSpacing: "-0.3px" }}>
                            {language === "es" ? "Metadatos y Contenido" : "Metadata & Content"}
                        </p>
                        <p style={{ fontSize: 12, color: "var(--lt-rgba-255-255-255-0-60, rgba(255,255,255,0.60))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {document.filename}
                        </p>
                    </div>
                    <div style={{
                        width: 40, height: 40, background: "var(--lt-rgba-255-255-255-0-15, rgba(255,255,255,0.15))",
                        borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                        border: "1px solid var(--lt-rgba-255-255-255-0-20, rgba(255,255,255,0.20))", flexShrink: 0,
                    }}>
                        <DocumentTextIcon style={{ width: 17, height: 17, color: "#fff", strokeWidth: 1.8 }} />
                    </div>
                </div>

                {/* Pills */}
                <div style={{ display: "flex", gap: 7, marginTop: 16, flexWrap: "wrap" }}>
                    {document.type && (
                        <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "#fee2e2", color: "#b91c1c" }}>
                            {document.type.toUpperCase()}
                        </span>
                    )}
                    {document.size ? (
                        <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: "var(--lt-rgba-255-255-255-0-18, rgba(255,255,255,0.18))", color: "#fff", border: "1px solid var(--lt-rgba-255-255-255-0-28, rgba(255,255,255,0.28))" }}>
                            {formatFileSize(document.size)}
                        </span>
                    ) : null}
                    <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusStyle.background, color: statusStyle.color, display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, background: statusStyle.dot, borderRadius: "50%" }} />
                        {getStatusLabel(document.status)}
                    </span>
                </div>
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0", background: "#fff" }}>

                {/* Filename card */}
                <div style={{ ...infoCard, marginBottom: 14 }}>
                    <div style={infoBar} />
                    <p style={labelStyle}>{language === "es" ? "Nombre de archivo" : "Filename"}</p>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--lt-0f172a, #0f172a)", lineHeight: 1.5 }}>
                        {document.filename}
                    </p>
                </div>

                {/* Date + Time grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {[
                        { lbl: language === "es" ? "Subido" : "Uploaded", val: dateStr },
                        { lbl: language === "es" ? "Hora" : "Time",      val: timeStr },
                    ].map((item, i) => (
                        <div key={i} style={infoCard}>
                            <div style={infoBar} />
                            <p style={labelStyle}>{item.lbl}</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--lt-0f172a, #0f172a)" }}>{item.val}</p>
                        </div>
                    ))}
                </div>

                {/* Summary — collapsible */}
                {(loadingSummary || summary) && (
                    <div style={{ marginBottom: 20 }}>
                        <button
                            onClick={() => setSummaryOpen(o => !o)}
                            style={{
                                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                                background: "#f8fafc", border: "1.5px solid var(--lt-e2e8f0, #e2e8f0)", borderRadius: summaryOpen ? "13px 13px 0 0" : 13,
                                padding: "10px 14px", cursor: "pointer", marginBottom: 0,
                            }}
                        >
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--lt-94a3b8, #94a3b8)", textTransform: "uppercase", letterSpacing: "1.1px" }}>
                                {language === "es" ? "Resumen" : "Summary"}
                            </span>
                            <ChevronRightIcon
                                style={{
                                    width: 14, height: 14, color: "var(--lt-94a3b8, #94a3b8)", flexShrink: 0,
                                    transition: "transform 0.2s",
                                    transform: summaryOpen ? "rotate(90deg)" : "rotate(0deg)",
                                }}
                                strokeWidth={2}
                            />
                        </button>
                        {summaryOpen && (
                            loadingSummary ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#f8fafc", border: "1.5px solid var(--lt-e2e8f0, #e2e8f0)", borderTop: "none", borderRadius: "0 0 13px 13px" }}>
                                    <Spinner className="h-4 w-4" style={{ color: "#3949AB" }} />
                                    <span style={{ fontSize: 13, color: "var(--lt-94a3b8, #94a3b8)" }}>{language === "es" ? "Cargando..." : "Loading..."}</span>
                                </div>
                            ) : (
                                <div style={{ ...infoCard, borderTop: "none", borderRadius: "0 0 13px 13px", marginBottom: 0 }}>
                                    <div style={infoBar} />
                                    <p style={{ fontSize: 13, color: "var(--lt-475569, #475569)", lineHeight: 1.6 }}>{summary}</p>
                                </div>
                            )
                        )}
                    </div>
                )}

                {/* Sections header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--lt-0f172a, #0f172a)" }}>
                        {language === "es" ? "Secciones Extraídas" : "Extracted Sections"}
                    </p>
                    {!loadingSections && sections.length > 0 && (
                        <span style={{ background: "#3949AB", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>
                            {sections.length}
                        </span>
                    )}
                </div>

                {/* Sections list */}
                {loadingSections ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0", gap: 8 }}>
                        <Spinner className="h-7 w-7" style={{ color: "#3949AB" }} />
                        <span style={{ fontSize: 13, color: "var(--lt-94a3b8, #94a3b8)" }}>
                            {language === "es" ? "Cargando secciones..." : "Loading sections..."}
                        </span>
                    </div>
                ) : errorSections ? (
                    <div style={{ padding: 14, background: "#fee2e2", borderRadius: 13, color: "#b91c1c", fontSize: 13, textAlign: "center", marginBottom: 16 }}>
                        {errorSections}
                    </div>
                ) : sections.length > 0 ? (
                    <div style={{ paddingBottom: 4 }}>
                        {sections.map((section, index) => (
                            <div
                                key={section.id}
                                style={{
                                    display: "flex", alignItems: "center", gap: 11,
                                    padding: "11px 14px",
                                    background: "#fff",
                                    borderRadius: 13,
                                    border: "1.5px solid var(--lt-e2e8f0, #e2e8f0)",
                                    marginBottom: 8,
                                    boxShadow: "0 1px 4px var(--lt-rgba-0-0-0-0-04, rgba(0,0,0,0.04))",
                                }}
                            >
                                <div style={{
                                    width: 26, height: 26, borderRadius: "50%",
                                    background: "#3949AB", color: "#fff",
                                    fontSize: 12, fontWeight: 700,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0,
                                }}>
                                    {section.order ?? index + 1}
                                </div>
                                <span style={{
                                    flex: 1, fontSize: 13, fontWeight: 500, color: "var(--lt-0f172a, #0f172a)",
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                }}>
                                    {section.title
                                        ? section.title.charAt(0).toUpperCase() + section.title.slice(1)
                                        : (language === "es" ? "Sección sin título" : "Untitled Section")}
                                </span>
                                <ChevronRightIcon style={{ width: 13, height: 13, color: "var(--lt-94a3b8, #94a3b8)", flexShrink: 0, strokeWidth: 2 }} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 0 20px", color: "var(--lt-94a3b8, #94a3b8)", gap: 8 }}>
                        <DocumentIcon style={{ width: 40, height: 40, opacity: 0.4 }} />
                        <p style={{ fontSize: 13 }}>
                            {language === "es" ? "No hay secciones para este documento" : "No sections found for this document"}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Bottom buttons ── */}
            <div style={{
                display: "flex", gap: 10,
                padding: "16px 20px",
                paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))",
                flexShrink: 0,
                borderTop: "1px solid var(--lt-e2e8f0, #e2e8f0)",
                background: "#fff",
            }}>
                {/* <button
                    onClick={onClose}
                    style={{
                        flex: 1, padding: 13,
                        background: "#f8fafc", color: "var(--lt-475569, #475569)",
                        border: "1.5px solid var(--lt-e2e8f0, #e2e8f0)", borderRadius: 13,
                        fontSize: 14, fontWeight: 600, cursor: "pointer",
                    }}
                >
                    {language === "es" ? "Cancelar" : "Cancel"}
                </button> */}
                <button
                    onClick={onClose}
                    style={{
                        flex: 2, padding: 13,
                        background: "#3949AB", color: "#fff",
                        border: "none", borderRadius: 13,
                        fontSize: 14, fontWeight: 600, cursor: "pointer",
                        boxShadow: "0 4px 16px rgba(57,73,171,0.22)",
                    }}
                >
                    {language === "es" ? "Cerrar" : "Close"}
                </button>
            </div>
        </div>
        </Dialog>
    );
}

DocumentMetadataDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    document: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        filename: PropTypes.string.isRequired,
        type: PropTypes.string,
        size: PropTypes.number,
        uploaded_at: PropTypes.string,
        status: PropTypes.string,
        tags: PropTypes.arrayOf(PropTypes.string),
    }),
};

export default DocumentMetadataDialog;
