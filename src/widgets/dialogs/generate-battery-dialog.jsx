import { noWheel } from "@/utils/numberInput";
import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import {
    Dialog,
    DialogHeader,
    DialogBody,
    DialogFooter,
    Button,
    Input,
    Typography,
    IconButton,
    Chip,
    Spinner,
    Select,
    Option,
    Accordion,
    AccordionHeader,
    AccordionBody,
    Checkbox,
} from "@material-tailwind/react";
import {
    XMarkIcon,
    BoltIcon,
    ExclamationCircleIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "@/context/language-context";
import projectService from "@/services/projectService";

function Icon({ id, open }) {
    return (
        <ChevronDownIcon
            className={`${id === open ? "rotate-180" : ""} h-5 w-5 transition-transform text-zinc-400`}
        />
    );
}

export function GenerateBatteryDialog({
    open,
    onClose,
    onGenerate,
    projectId,
    existingBatteries = [],
    rules = [],
}) {
    const { t, language } = useLanguage();
    const [loadingSections, setLoadingSections] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [scannedDocuments, setScannedDocuments] = useState([]);
    const [openAccordion, setOpenAccordion] = useState(0);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        rule: "",
        query_text: "",
        sections: [],
        quantity: 10,
        difficulty: "medium",
        question_format: "true_false",
    });

    useEffect(() => {
        if (open) {
            setErrors({});
            setSubmitting(false);
            setOpenAccordion(0);
            setFormData({
                rule: "",
                query_text: "",
                sections: [],
                quantity: 10,
                difficulty: "medium",
                question_format: "true_false",
            });
            if (projectId) {
                fetchSections();
            }
        }
    }, [open, projectId]);

    const fetchSections = async () => {
        try {
            setLoadingSections(true);
            const data = await projectService.getDocumentsWithSections(projectId);
            setScannedDocuments(data.documents || []);
        } catch (err) {
            console.error("Failed to fetch sections", err);
        } finally {
            setLoadingSections(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const clamped = name === "quantity" ? Math.min(15, Math.max(1, Number(value))) : value;
        setFormData((prev) => ({ ...prev, [name]: name === "quantity" ? clamped : value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));

        if (name === "query_text") {
            const nameToCheck = value.trim() || (language === "es" ? "Batería" : "Battery");
            if (existingBatteries.some((b) => (b.name || "").toLowerCase() === nameToCheck.toLowerCase())) {
                setErrors((prev) => ({
                    ...prev,
                    query_text:
                        language === "es"
                            ? "Ya existe una batería con este nombre."
                            : "A battery with this name already exists.",
                }));
            }
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const handleOpenAccordion = (value) => setOpenAccordion(openAccordion === value ? 0 : value);

    const handleSectionToggle = (sectionId) => {
        const sId = Number(sectionId);
        setFormData((prev) => {
            const exists = prev.sections.includes(sId);
            const updated = exists
                ? prev.sections.filter((id) => id !== sId)
                : [...prev.sections, sId];

            if (updated.length > 0 && errors.sections) {
                setErrors(prevErrors => ({ ...prevErrors, sections: null }));
            }
            return { ...prev, sections: updated };
        });
    };

    const handleDocumentToggle = (doc) => {
        const docSections = doc.sections || [];
        const docSectionIds = docSections.map(s => Number(s.id));

        setFormData((prev) => {
            const allSelected = docSectionIds.length > 0 && docSectionIds.every(id => prev.sections.includes(id));

            let newSectionIds;
            if (allSelected) {
                newSectionIds = prev.sections.filter(id => !docSectionIds.includes(id));
            } else {
                newSectionIds = [...new Set([...prev.sections, ...docSectionIds])];
            }

            if (newSectionIds.length > 0 && errors.sections) {
                setErrors(prevErrors => ({ ...prevErrors, sections: null }));
            }

            return { ...prev, sections: newSectionIds };
        });
    };

    const validate = () => {
        const newErrors = {};
        if (scannedDocuments.length === 0) {
            newErrors.sections =
                language === "es"
                    ? "No hay secciones disponibles. Sube un documento primero."
                    : "No sections available. Upload a document first.";
        } else if (formData.sections.length === 0) {
            newErrors.sections =
                language === "es" ? "Debes seleccionar al menos una sección." : "You must select at least one section.";
        }

        const nameToCheck = formData.query_text.trim() || (language === "es" ? "Batería" : "Battery");
        if (existingBatteries.some((b) => (b.name || "").toLowerCase() === nameToCheck.toLowerCase())) {
            newErrors.query_text =
                language === "es"
                    ? "Ya existe una batería con este nombre."
                    : "A battery with this name already exists.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            setSubmitting(true);

            // Reconstruct section objects from IDs to match parent expectation
            const allSections = scannedDocuments.flatMap(doc => doc.sections || []);
            const selectedSections = formData.sections
                .map(id => allSections.find(s => s.id === id))
                .filter(Boolean);

            onGenerate({
                ...formData,
                sections: selectedSections
            });
        }
    };

    /* ── shared field styles for mobile ── */
    const mLbl = { fontSize: 11, fontWeight: 700, letterSpacing: ".9px", textTransform: "uppercase", color: "#94a3b8", marginBottom: 9, display: "flex", alignItems: "center", gap: 7 };
    const mInput = (hasErr) => ({ width: "100%", padding: "12px 14px", background: "#f8fafc", border: `1.5px solid ${hasErr ? "#ef4444" : "#e2e8f0"}`, borderRadius: 13, fontFamily: "inherit", fontSize: 14, color: "#0f172a", outline: "none" });

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
                    <div style={{ background: "#0f172a", padding: "14px 20px 20px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
                        <div style={{ position: "absolute", width: 300, height: 300, background: "radial-gradient(circle, rgba(57,73,171,.55) 0%, transparent 60%)", top: -120, right: -70, borderRadius: "50%", pointerEvents: "none" }} />
                        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />
                        {/* drag handle */}
                        <div style={{ width: 38, height: 4, background: "rgba(255,255,255,.18)", borderRadius: 2, margin: "0 auto 18px" }} />
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                                <div style={{ width: 42, height: 42, background: "rgba(57,73,171,.28)", border: "1px solid rgba(99,102,241,.4)", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <svg viewBox="0 0 24 24" style={{ width: 19, height: 19, stroke: "#818cf8", strokeWidth: 1.8, fill: "none" }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                </div>
                                <div>
                                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", letterSpacing: "-.3px" }}>
                                        {language === "es" ? "Nueva Batería" : "New Battery"}
                                    </div>
                                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
                                        {language === "es" ? "Configura tu set de preguntas" : "Configure your question set"}
                                    </div>
                                </div>
                            </div>
                            <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.13)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: "rgba(255,255,255,.6)", strokeWidth: 2, fill: "none" }}><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable form body */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 0" }}>

                        {/* Topic */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={mLbl}>
                                {language === "es" ? "Tema" : "Topic"}
                                <span style={{ fontSize: 9, background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0", padding: "1px 7px", borderRadius: 20, fontWeight: 500, textTransform: "none", letterSpacing: ".3px" }}>
                                    {language === "es" ? "opcional" : "optional"}
                                </span>
                            </div>
                            <input
                                style={mInput(!!errors.query_text)}
                                type="text"
                                name="query_text"
                                value={formData.query_text}
                                onChange={handleInputChange}
                                placeholder={language === "es" ? "Ej: Barcelona, Historia de España, etc." : "E.g. Barcelona, Spanish History, etc."}
                            />
                            {errors.query_text && (
                                <p style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>{errors.query_text}</p>
                            )}
                        </div>

                        {/* Documents */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={mLbl}>
                                {language === "es" ? "Documentos & Secciones" : "Documents & Sections"}
                                <span style={{ width: 5, height: 5, background: "rgb(57,73,171)", borderRadius: "50%", display: "inline-block", flexShrink: 0 }} />
                            </div>
                            {loadingSections ? (
                                <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
                                    <Spinner className="h-6 w-6" style={{ color: "rgb(57,73,171)" }} />
                                </div>
                            ) : scannedDocuments.length === 0 ? (
                                <div style={{ padding: 16, background: "#fff1f2", border: "1.5px dashed #fca5a5", borderRadius: 13, textAlign: "center" }}>
                                    <ExclamationCircleIcon style={{ width: 28, height: 28, color: "#f87171", margin: "0 auto 6px" }} />
                                    <p style={{ fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>
                                        {language === "es" ? "No hay secciones disponibles. Sube un documento primero." : "No sections available. Upload a document first."}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                    {scannedDocuments.map((doc) => {
                                        const docSectionIds = (doc.sections || []).map(s => Number(s.id));
                                        const allSelected = docSectionIds.length > 0 && docSectionIds.every(id => formData.sections.includes(id));
                                        const someSelected = docSectionIds.some(id => formData.sections.includes(id));
                                        const isOn = allSelected || someSelected;
                                        return (
                                            <div
                                                key={doc.id}
                                                onClick={() => handleDocumentToggle(doc)}
                                                style={{ background: isOn ? "rgba(57,73,171,.07)" : "#f8fafc", border: `1.5px solid ${isOn ? "rgba(57,73,171,.30)" : (errors.sections ? "#ef4444" : "#e2e8f0")}`, borderRadius: 13, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                                            >
                                                {/* checkbox */}
                                                <div style={{ width: 22, height: 22, borderRadius: 7, border: `1.5px solid ${isOn ? "rgb(57,73,171)" : "#e2e8f0"}`, background: isOn ? "rgb(57,73,171)" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    {isOn && <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, stroke: "#fff", strokeWidth: 2.5, fill: "none" }}><polyline points="20 6 9 17 4 12"/></svg>}
                                                </div>
                                                {/* pdf icon */}
                                                <div style={{ width: 38, height: 38, borderRadius: 11, background: "#fee2e2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <svg viewBox="0 0 24 24" style={{ width: 17, height: 17, stroke: "#b91c1c", strokeWidth: 1.8, fill: "none" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>
                                                        {doc.filename || doc.name}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                                                        {doc.type ? `.${doc.type}` : ""}{doc.size ? ` · ${Math.round(doc.size / 1024)} KB` : ""}
                                                    </div>
                                                </div>
                                                {/* sections badge */}
                                                <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(57,73,171,.10)", border: "1px solid rgba(57,73,171,.22)", borderRadius: 20, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: "rgb(57,73,171)", flexShrink: 0 }}>
                                                    <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, stroke: "rgb(57,73,171)", strokeWidth: 2, fill: "none" }}><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18"/></svg>
                                                    {(doc.sections || []).length}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {errors.sections && (
                                <p style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>{errors.sections}</p>
                            )}
                        </div>

                        <div style={{ height: 1, background: "#e2e8f0", margin: "4px 0 22px" }} />

                        {/* Rule */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={mLbl}>
                                {language === "es" ? "Regla" : "Rule"}
                                <span style={{ fontSize: 9, background: "#f8fafc", color: "#94a3b8", border: "1px solid #e2e8f0", padding: "1px 7px", borderRadius: 20, fontWeight: 500, textTransform: "none", letterSpacing: ".3px" }}>
                                    {language === "es" ? "opcional" : "optional"}
                                </span>
                            </div>
                            <div style={{ position: "relative" }}>
                                <select
                                    style={{ ...mInput(false), paddingRight: 42, appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}
                                    value={formData.rule}
                                    onChange={(e) => handleSelectChange("rule", e.target.value)}
                                >
                                    <option value="">{language === "es" ? "Sin regla" : "No rule"}</option>
                                    {rules.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: "#94a3b8", strokeWidth: 2, fill: "none" }}><polyline points="6 9 12 15 18 9"/></svg>
                                </div>
                            </div>
                        </div>

                        {/* Number of Questions stepper */}
                        {!formData.rule && (
                            <div style={{ marginBottom: 20 }}>
                                <div style={mLbl}>{language === "es" ? "Cantidad de Preguntas" : "Number of Questions"}</div>
                                <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 13, overflow: "hidden" }}>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 5) }))}
                                        style={{ width: 52, height: 52, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                    >
                                        <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "#475569", strokeWidth: 2.5, fill: "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    </button>
                                    <div style={{ flex: 1, textAlign: "center", fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: "#0f172a" }}>
                                        {formData.quantity}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, quantity: Math.min(15, prev.quantity + 5) }))}
                                        style={{ width: 52, height: 52, background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                                    >
                                        <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: "#475569", strokeWidth: 2.5, fill: "none" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    </button>
                                </div>
                                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
                                    {language === "es" ? "Máximo 15 preguntas por batería" : "Maximum 15 questions per battery"}
                                </p>
                            </div>
                        )}

                        {/* Difficulty pills */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={mLbl}>{language === "es" ? "Dificultad" : "Difficulty"}</div>
                            <div style={{ display: "flex", gap: 9 }}>
                                {[
                                    { val: "easy",   label: language === "es" ? "Fácil" : "Easy",   on: { background: "#dcfce7", borderColor: "#86efac", color: "#15803d" } },
                                    { val: "medium", label: language === "es" ? "Medio" : "Medium", on: { background: "rgba(57,73,171,.10)", borderColor: "rgba(57,73,171,.30)", color: "rgb(57,73,171)" } },
                                    { val: "hard",   label: language === "es" ? "Difícil" : "Hard", on: { background: "#fee2e2", borderColor: "#fca5a5", color: "#b91c1c" } },
                                ].map(({ val, label, on }) => {
                                    const active = formData.difficulty === val;
                                    return (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => handleSelectChange("difficulty", val)}
                                            style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1.5px solid ${active ? on.borderColor : "#e2e8f0"}`, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "center", background: active ? on.background : "#f8fafc", color: active ? on.color : "#475569" }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Question Format pills */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={mLbl}>{language === "es" ? "Formato" : "Question Format"}</div>
                            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                                {[
                                    { val: "true_false",      label: language === "es" ? "Verdadero/Falso" : "True / False",     ico: <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></> },
                                    { val: "multiple_choice", label: language === "es" ? "Selección múltiple" : "Multiple choice", ico: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
                                    { val: "variety",         label: language === "es" ? "Variado" : "Variety",                   ico: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/></> },
                                ].map(({ val, label, ico }) => {
                                    const active = formData.question_format === val;
                                    return (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => handleSelectChange("question_format", val)}
                                            style={{ padding: "9px 14px", borderRadius: 11, border: `1.5px solid ${active ? "rgba(57,73,171,.30)" : "#e2e8f0"}`, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, background: active ? "rgba(57,73,171,.10)" : "#f8fafc", color: active ? "rgb(57,73,171)" : "#475569" }}
                                        >
                                            <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, stroke: "currentColor", strokeWidth: 2, fill: "none" }}>{ico}</svg>
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                    </div>

                    {/* Bottom action bar */}
                    <div style={{ display: "flex", gap: 10, padding: "18px 20px", paddingBottom: "max(18px, env(safe-area-inset-bottom, 18px))", borderTop: "1px solid #e2e8f0", background: "#fff", flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ flex: 1, padding: 14, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 13, fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer" }}
                        >
                            {language === "es" ? "Cancelar" : "Cancel"}
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loadingSections || scannedDocuments.length === 0}
                            style={{ flex: 2, padding: 14, background: submitting ? "rgba(57,73,171,.6)" : "linear-gradient(135deg, rgb(57,73,171) 0%, #818cf8 100%)", border: "none", borderRadius: 13, fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "#fff", cursor: submitting ? "not-allowed" : "pointer", boxShadow: "0 6px 20px rgba(57,73,171,.38)", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}
                        >
                            {submitting ? (
                                <Spinner className="h-4 w-4" />
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, stroke: "#fff", strokeWidth: 2.5, fill: "none" }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                                    {language === "es" ? "Generar Batería" : "Generate Battery"}
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
                                <BoltIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <Typography variant="h6" className="text-zinc-900 font-black tracking-tight">
                                    {language === "es" ? "Generar Nueva Batería" : "Generate New Battery"}
                                </Typography>
                            </div>
                            <IconButton variant="text" color="blue-gray" onClick={onClose} className="rounded-full hover:bg-zinc-200/50">
                                <XMarkIcon className="h-6 w-6 text-zinc-400" strokeWidth={2} />
                            </IconButton>
                        </div>
                    </DialogHeader>

                    <DialogBody className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                        {/* Query Text */}
                        <div>
                            <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                {language === "es" ? "¿Sobre qué quieres las preguntas?" : "What do you want questions about?"} <span className="text-zinc-400 font-normal">({language === "es" ? "opcional" : "optional"})</span>
                            </Typography>
                            <Input
                                placeholder={language === "es" ? "Ej: Barca, Historia de España, etc." : "E.g: Barcelona, Spanish History, etc."}
                                className={`!bg-zinc-50/50 rounded-xl !text-zinc-900 ${errors.query_text ? "!border-red-500 focus:!border-red-600" : "!border-zinc-200 focus:!border-indigo-600"}`}
                                name="query_text"
                                value={formData.query_text}
                                onChange={handleInputChange}
                                labelProps={{ className: "hidden" }}
                            />
                            {errors.query_text && (
                                <Typography variant="small" color="red" className="mt-1 font-medium flex items-center gap-1">
                                    <span className="h-1 w-1 rounded-full bg-red-500" /> {errors.query_text}
                                </Typography>
                            )}
                        </div>

                        {/* Sections Selection */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Typography variant="small" className="font-bold text-zinc-900 ml-1">
                                    {language === "es" ? "Documentos & Secciones" : "Documents & Sections"} <span className="text-red-500">*</span>
                                </Typography>
                                {formData.sections.length > 0 && (
                                    <Chip
                                        variant="ghost"
                                        color="indigo"
                                        className="rounded-lg border-indigo-100 bg-indigo-50 text-indigo-700 font-bold"
                                        value={`${formData.sections.length} ${language === "es" ? "seleccionadas" : "selected"}`}
                                    />
                                )}
                            </div>

                            {loadingSections ? (
                                <div className="flex justify-center p-8 bg-zinc-50 rounded-2xl border border-zinc-100">
                                    <Spinner className="h-6 w-6 text-indigo-500" />
                                </div>
                            ) : scannedDocuments.length === 0 ? (
                                <div className="p-8 text-center bg-red-50/50 rounded-2xl border border-dashed border-red-200">
                                    <div className="flex flex-col items-center gap-2">
                                        <ExclamationCircleIcon className="h-8 w-8 text-red-400 mb-1" />
                                        <Typography variant="small" className="text-red-900 font-bold max-w-[280px] mx-auto leading-relaxed">
                                            {language === "es"
                                                ? "No hay secciones disponibles. Sube un documento para procesar el contenido."
                                                : "No sections available. Upload a document to process the content."}
                                        </Typography>
                                    </div>
                                </div>
                            ) : (
                                <div className={`border rounded-2xl overflow-y-auto max-h-72 bg-white shadow-sm transition-colors ${errors.sections ? "border-red-500 bg-red-50/5" : "border-zinc-200"}`}>
                                    {scannedDocuments.map((doc, index) => {
                                        const docId = Number(doc.id);
                                        const docSections = doc.sections || [];
                                        const docSectionIds = docSections.map(s => Number(s.id));
                                        const allSelected = docSectionIds.length > 0 && docSectionIds.every(id => formData.sections.includes(id));
                                        const someSelected = docSectionIds.some(id => formData.sections.includes(id));

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
                                                                {doc.filename || doc.name}
                                                            </Typography>
                                                            <Typography variant="small" className="font-bold text-zinc-400 text-[10px] bg-white border border-zinc-100 px-2 py-0.5 rounded-md">
                                                                {docSections.length} {language === "es" ? "secciones" : "sections"}
                                                            </Typography>
                                                        </div>
                                                    </div>
                                                </AccordionHeader>
                                                <AccordionBody className="py-2 px-4 bg-zinc-50/50">
                                                    <div className="flex flex-col gap-1 pl-8 pr-2 pb-2">
                                                        {docSections.map(section => (
                                                            <div
                                                                key={section.id}
                                                                className={`flex items-start gap-4 p-2 rounded-lg cursor-pointer transition-all border border-transparent ${formData.sections.includes(Number(section.id)) ? "bg-white shadow-sm border-zinc-200" : "hover:bg-zinc-100"}`}
                                                                onClick={() => handleSectionToggle(section.id)}
                                                            >
                                                                <Checkbox
                                                                    color="indigo"
                                                                    checked={formData.sections.includes(Number(section.id))}
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
                            {errors.sections && (
                                <Typography variant="small" color="red" className="mt-1 font-medium flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {errors.sections}
                                </Typography>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Rule */}
                            <div>
                                <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                    {language === "es" ? "Regla" : "Rule"} <span className="text-zinc-400 font-normal">({language === "es" ? "opcional" : "optional"})</span>
                                </Typography>
                                <div className="relative">
                                    <select
                                        className="w-full p-2.5 bg-zinc-50/50 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-indigo-600 focus:ring-0 appearance-none transition-colors"
                                        value={formData.rule}
                                        onChange={(e) => handleSelectChange("rule", e.target.value)}
                                    >
                                        <option value="">{language === "es" ? "Sin regla" : "No rule"}</option>
                                        {rules.map((r) => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <ChevronDownIcon className="h-4 w-4 text-zinc-500" strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>

                            {/* Quantity */}
                            {!formData.rule && (
                                <div>
                                    <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                        {language === "es" ? "Cantidad de Preguntas" : "Number of Questions"}
                                    </Typography>
                                    <Input
                                        type="number" {...noWheel}
                                        min="1"
                                        max="15"
                                        className="!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleInputChange}
                                        labelProps={{ className: "hidden" }}
                                    />
                                    <Typography variant="small" className="mt-1 ml-1 text-zinc-400 text-[11px]">
                                        {language === "es" ? "Máximo 15 preguntas por batería." : "Maximum 15 questions per battery."}
                                    </Typography>
                                </div>
                            )}

                            {/* Difficulty */}
                            <div>
                                <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                    {language === "es" ? "Dificultad" : "Difficulty"}
                                </Typography>
                                <Select
                                    value={formData.difficulty}
                                    onChange={(val) => handleSelectChange("difficulty", val)}
                                    className="!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl"
                                    labelProps={{ className: "hidden" }}
                                >
                                    <Option value="easy">{language === "es" ? "Fácil" : "Easy"}</Option>
                                    <Option value="medium">{language === "es" ? "Medio" : "Medium"}</Option>
                                    <Option value="hard">{language === "es" ? "Difícil" : "Hard"}</Option>
                                </Select>
                            </div>

                            {/* Question Format */}
                            <div>
                                <Typography variant="small" className="font-bold text-zinc-900 mb-1.5 ml-1">
                                    {language === "es" ? "Formato de Pregunta" : "Question Format"}
                                </Typography>
                                <Select
                                    value={formData.question_format}
                                    onChange={(val) => handleSelectChange("question_format", val)}
                                    className="!border-zinc-200 focus:!border-indigo-600 !bg-zinc-50/50 rounded-xl"
                                    labelProps={{ className: "hidden" }}
                                >
                                    <Option value="true_false">{language === "es" ? "Verdadero/Falso" : "True/False"}</Option>
                                    <Option value="single_choice">{language === "es" ? "Opción Única" : "Single Choice"}</Option>
                                    <Option value="multiple_choice">{language === "es" ? "Selección Múltiple" : "Multiple Choice"}</Option>
                                    <Option value="variety">{language === "es" ? "Variado" : "Variety"}</Option>
                                </Select>
                            </div>
                        </div>
                    </DialogBody>

                    <DialogFooter className="bg-zinc-50/50 border-t border-zinc-100 p-4 flex flex-wrap justify-end gap-3 flex-none">
                        <Button variant="text" color="blue-gray" onClick={onClose} className="normal-case font-bold text-zinc-600 hover:bg-zinc-200/50">
                            {language === "es" ? "Cancelar" : "Cancel"}
                        </Button>
                        <Button
                            type="submit"
                            variant="gradient"
                            color="indigo"
                            disabled={submitting || loadingSections || scannedDocuments.length === 0}
                            className="normal-case font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
                        >
                            {submitting ? <Spinner className="h-4 w-4" /> : (language === "es" ? "Generar Batería" : "Generate Battery")}
                        </Button>
                    </DialogFooter>
                </div>

            </form>
        </Dialog>
    );
}

GenerateBatteryDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onGenerate: PropTypes.func.isRequired,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    existingBatteries: PropTypes.array,
    rules: PropTypes.array,
};

export default GenerateBatteryDialog;
