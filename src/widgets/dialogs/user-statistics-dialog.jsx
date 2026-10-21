import React, { useState, useEffect } from "react";
import {
    XMarkIcon,
    ChartBarIcon,
    DocumentTextIcon,
    FolderIcon,
    TrophyIcon,
    ArrowTrendingUpIcon,
    SparklesIcon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import Chart from "react-apexcharts";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";
import { APP_NAME } from "@/config/app";

const formatStudyTime = (seconds, language) => {
    if (!seconds || seconds === 0) return language === "es" ? "0m" : "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

/* ── Design tokens ── */
const GLASS = { background: "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", borderRadius: 14 };
const GLASS_SM = { background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", borderRadius: 10 };
const TXT_PRI = "#F1F5F9";
const TXT_MUT = "#94A3B8";
const TXT_DIM = "#64748B";

function Spin() {
    return <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))", borderTopColor: "#818CF8" }} className="animate-spin" />;
}

export function UserStatisticsDialog({ open, handler, userId }) {
    const { language } = useLanguage();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) fetchStats();
    }, [open, userId]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await projectService.getUserStatistics(userId);
            setStats(data);
        } catch (err) {
            console.error("Error fetching statistics:", err);
            setError(err?.error || (language === "es" ? "Error al cargar estadísticas" : "Failed to load statistics"));
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    const accuracyDonutOptions = {
        chart: { type: "donut", fontFamily: "Inter, system-ui, sans-serif", background: "transparent" },
        labels: [language === "es" ? "Correcto" : "Correct", language === "es" ? "Incorrecto" : "Incorrect"],
        colors: ["#6366f1", "#E2E8F0"],
        plotOptions: {
            pie: {
                donut: {
                    size: "82%",
                    labels: {
                        show: true,
                        name: { show: false },
                        value: {
                            show: true,
                            fontSize: "22px",
                            fontWeight: 800,
                            color: "var(--lt-f1f5f9, #F1F5F9)",
                            offsetY: 8,
                            formatter: (val) => `${val}%`,
                        },
                        total: {
                            show: true,
                            label: "",
                            formatter: () => `${stats?.question_level?.accuracy || 0}%`,
                        },
                    },
                },
            },
        },
        dataLabels: { enabled: false },
        legend: { show: false },
        stroke: { width: 0 },
        tooltip: { enabled: true, theme: "dark" },
        states: { hover: { filter: { type: "none" } } },
    };

    const projectBarOptions = {
        chart: {
            type: "bar",
            toolbar: { show: false },
            fontFamily: "Inter, system-ui, sans-serif",
            background: "transparent",
            stacked: false,
        },
        plotOptions: {
            bar: {
                borderRadius: 3,
                horizontal: true,
                barHeight: "45%",
                dataLabels: { position: "top" },
            },
        },
        colors: ["#6366f1", "#10b981"],
        dataLabels: {
            enabled: true,
            formatter: (val) => `${val}%`,
            offsetX: 28,
            style: { fontSize: "9px", fontWeight: 700, colors: ["#94a3b8"] },
        },
        xaxis: {
            categories: stats?.project_level?.map(p => p.project_name.length > 15 ? p.project_name.substring(0, 15) + "..." : p.project_name) || [],
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
            max: 110,
        },
        yaxis: {
            labels: { style: { colors: "#64748B", fontSize: "10px", fontWeight: 600 } },
        },
        grid: { show: false },
        legend: {
            show: true,
            position: "top",
            horizontalAlign: "right",
            fontSize: "10px",
            labels: { colors: "#94A3B8" },
            itemMargin: { horizontal: 10 },
            markers: { radius: 4 },
        },
        tooltip: { theme: "dark", y: { formatter: (val) => `${val}%` } },
    };

    const projectBarSeries = [
        { name: language === "es" ? "Precisión" : "Accuracy",  data: stats?.project_level?.map(p => p.percent) || [] },
        { name: language === "es" ? "Cobertura" : "Coverage",  data: stats?.project_level?.map(p => p.avg_coverage_percent || 0) || [] },
    ];

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", background: "var(--lt-rgba-0-0-0-0-82, rgba(0,0,0,0.82))", backdropFilter: "blur(6px)" }}
            onClick={handler}>

            <div style={{ background: "var(--lt-060d1a, #0A1628)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 22, width: "100%", maxWidth: 900, boxShadow: "0 40px 100px var(--lt-rgba-0-0-0-0-8, rgba(0,0,0,0.8))", overflow: "hidden", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
                onClick={(e) => e.stopPropagation()}>

                {/* Top accent strip */}
                <div style={{ height: 3, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)", flexShrink: 0 }} />

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "var(--lt-rgba-255-255-255-0-02, rgba(255,255,255,0.02))", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #818CF8)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 18px rgba(99,102,241,0.4)", flexShrink: 0 }}>
                            <ChartBarIcon style={{ width: 19, height: 19, color: "#fff" }} />
                        </div>
                        <div>
                            <p style={{ fontSize: 14, fontWeight: 800, color: TXT_PRI, letterSpacing: "-0.01em", marginBottom: 3 }}>
                                {language === "es" ? "Estadísticas" : "Statistics"}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px rgba(34,197,94,0.7)" }} />
                                <span style={{ fontSize: 9, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                    {language === "es" ? "Datos Sincronizados" : "Data Synchronized"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handler}
                        style={{ background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: TXT_DIM, transition: "all 0.15s", flexShrink: 0 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-09, rgba(255,255,255,0.09))"; e.currentTarget.style.color = TXT_MUT; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))"; e.currentTarget.style.color = TXT_DIM; }}>
                        <XMarkIcon style={{ width: 16, height: 16 }} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
                    {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 14 }}>
                            <Spin />
                            <span style={{ fontSize: 9, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                                {language === "es" ? "Procesando Datos..." : "Processing Data..."}
                            </span>
                        </div>
                    ) : error ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, background: "rgba(239,68,68,0.06)", borderRadius: 14, border: "1px solid rgba(239,68,68,0.15)" }}>
                            <ExclamationCircleIcon style={{ width: 32, height: 32, color: "var(--lt-f87171, #F87171)" }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#FCA5A5" }}>{error}</span>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                            {/* Section 01: Top Stats Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "start" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                    {/* Total Questions */}
                                    <div style={{ ...GLASS, padding: "14px 16px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                            <span style={{ fontSize: 8, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                                {language === "es" ? "Preguntas" : "Questions"}
                                            </span>
                                            <SparklesIcon style={{ width: 13, height: 13, color: "rgba(99,102,241,0.5)" }} />
                                        </div>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: TXT_PRI, lineHeight: 1 }}>
                                            {stats.question_level.total_questions}
                                        </p>
                                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", display: "flex", alignItems: "center", gap: 8 }}>
                                            <span style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase" }}>100%</span>
                                            <div style={{ flex: 1, height: 3, background: "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", borderRadius: 99 }}>
                                                <div style={{ height: "100%", width: "100%", background: "linear-gradient(90deg, #6366F1, #818CF8)", borderRadius: 99 }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Correct Answers */}
                                    <div style={{ ...GLASS, padding: "14px 16px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                            <span style={{ fontSize: 8, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                                {language === "es" ? "Aciertos" : "Correct"}
                                            </span>
                                            <TrophyIcon style={{ width: 13, height: 13, color: "rgba(34,197,94,0.5)" }} />
                                        </div>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: TXT_PRI, lineHeight: 1 }}>
                                            {stats.question_level.correct_count}
                                        </p>
                                        <div style={{ marginTop: 10 }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                <span style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase" }}>Acc.</span>
                                                <span style={{ fontSize: 7, fontWeight: 700, color: "var(--lt-4ade80, #4ADE80)" }}>{stats.question_level.accuracy || 0}%</span>
                                            </div>
                                            <div style={{ height: 3, background: "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", borderRadius: 99 }}>
                                                <div style={{ height: "100%", width: `${stats.question_level.accuracy || 0}%`, background: "#22C55E", borderRadius: 99 }} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <div style={{ ...GLASS, padding: "14px 16px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                            <span style={{ fontSize: 8, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                                {language === "es" ? "Tiempo" : "Time"}
                                            </span>
                                            <ArrowTrendingUpIcon style={{ width: 13, height: 13, color: "rgba(251,146,60,0.5)" }} />
                                        </div>
                                        <p style={{ fontSize: 26, fontWeight: 900, color: TXT_PRI, lineHeight: 1 }}>
                                            {formatStudyTime(stats.document_level.reduce((acc, doc) => acc + (doc.study_seconds || 0), 0), language)}
                                        </p>
                                        <div style={{ marginTop: 12 }}>
                                            <span style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase" }}>Proyectos </span>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: TXT_MUT }}>{stats.project_level.length}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Donut */}
                                <div style={{ ...GLASS, padding: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 160 }}>
                                    <span style={{ fontSize: 8, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                                        {language === "es" ? "Score Global" : "Global Score"}
                                    </span>
                                    <div style={{ width: 130 }}>
                                        <Chart
                                            options={accuracyDonutOptions}
                                            series={[stats.question_level.accuracy || 0, 100 - (stats.question_level.accuracy || 0)]}
                                            type="donut"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 02: Analysis Grid */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                {/* Bar chart */}
                                <div style={{ ...GLASS, padding: "16px" }}>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: TXT_MUT, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                                            <FolderIcon style={{ width: 13, height: 13, color: "var(--lt-818cf8, #818CF8)" }} />
                                            {language === "es" ? "Análisis por Proyecto" : "Project Performance"}
                                        </span>
                                        <span style={{ fontSize: 8, fontWeight: 700, color: TXT_DIM, background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", borderRadius: 999, padding: "3px 9px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                            {language === "es" ? "Comparativa" : "Benchmarks"}
                                        </span>
                                    </div>
                                    <Chart options={projectBarOptions} series={projectBarSeries} type="bar" height={220} />
                                </div>

                                {/* Project list */}
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                                    {stats.project_level.map((proj) => (
                                        <div key={proj.project_id}
                                            style={{ ...GLASS_SM, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "background 0.15s, border-color 0.15s", cursor: "default" }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = GLASS_SM.background; e.currentTarget.style.borderColor = "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))"; }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                                <div style={{ width: 26, height: 26, flexShrink: 0, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "var(--lt-818cf8, #818CF8)" }}>
                                                    {proj.project_id}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <p style={{ fontSize: 11, fontWeight: 700, color: TXT_PRI, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
                                                        {proj.project_name}
                                                    </p>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <span style={{ fontSize: 8, color: TXT_DIM }}>{proj.documents_count} Docs</span>
                                                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--lt-rgba-255-255-255-0-15, rgba(255,255,255,0.15))", flexShrink: 0 }} />
                                                        <span style={{ fontSize: 8, color: TXT_DIM }}>{proj.docs_with_attempts} Active</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                                                <div style={{ textAlign: "right" }}>
                                                    <p style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", marginBottom: 2 }}>Coverage</p>
                                                    <p style={{ fontSize: 11, fontWeight: 800, color: "var(--lt-4ade80, #4ADE80)" }}>{proj.avg_coverage_percent || 0}%</p>
                                                </div>
                                                <div style={{ width: 1, height: 22, background: "var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))" }} />
                                                <div style={{ textAlign: "right" }}>
                                                    <p style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", marginBottom: 2 }}>Acc.</p>
                                                    <p style={{ fontSize: 11, fontWeight: 800, color: "var(--lt-818cf8, #818CF8)" }}>{proj.percent}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 03: Document Cards */}
                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: TXT_MUT, textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                                        <DocumentTextIcon style={{ width: 13, height: 13, color: "var(--lt-818cf8, #818CF8)" }} />
                                        {language === "es" ? "Detalle por Documento" : "Document Analytics"}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6366F1" }} />
                                            <span style={{ fontSize: 8, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase" }}>Coverage</span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }} />
                                            <span style={{ fontSize: 8, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase" }}>Accuracy</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 12 }}>
                                    {stats.document_level.map((doc) => (
                                        <div key={doc.document_id}
                                            style={{ ...GLASS, padding: "14px", display: "flex", flexDirection: "column", transition: "border-color 0.15s, background 0.15s" }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-055, rgba(255,255,255,0.055))"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.2)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = GLASS.background; e.currentTarget.style.borderColor = "var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))"; }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                                                <span style={{ fontSize: 7, fontWeight: 700, color: "var(--lt-818cf8, #818CF8)", textTransform: "uppercase", letterSpacing: "0.05em", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                    {doc.project_name}
                                                </span>
                                                <div style={{ textAlign: "right" }}>
                                                    <p style={{ fontSize: 13, fontWeight: 900, color: TXT_PRI, lineHeight: 1 }}>{doc.final_percent}%</p>
                                                    <p style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase" }}>Score</p>
                                                </div>
                                            </div>

                                            <p style={{ fontSize: 10, fontWeight: 700, color: TXT_MUT, lineHeight: 1.4, marginBottom: 12, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                                                title={doc.document_name}>
                                                {doc.document_name}
                                            </p>

                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
                                                {[
                                                    { label: "Time", value: formatStudyTime(doc.study_seconds, language) },
                                                    { label: "Attempts", value: doc.attempts_count },
                                                ].map(({ label, value }) => (
                                                    <div key={label} style={{ background: "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))", border: "1px solid var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", borderRadius: 7, padding: "7px 8px" }}>
                                                        <p style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", marginBottom: 3 }}>{label}</p>
                                                        <p style={{ fontSize: 10, fontWeight: 700, color: TXT_MUT }}>{value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
                                                {[
                                                    { label: "Coverage", pct: doc.coverage_percent, color: "var(--lt-6366f1, #6366F1)" },
                                                    { label: "Accuracy", pct: doc.accuracy, color: "var(--lt-22c55e, #22C55E)" },
                                                ].map(({ label, pct, color }) => (
                                                    <div key={label}>
                                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                                            <span style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase" }}>{label}</span>
                                                            <span style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM }}>{pct}%</span>
                                                        </div>
                                                        <div style={{ height: 3, background: "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", borderRadius: 99 }}>
                                                            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", marginTop: "auto" }}>
                                                <div>
                                                    <p style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", marginBottom: 2 }}>Score</p>
                                                    <p style={{ fontSize: 9, fontWeight: 700, color: TXT_MUT }}>{doc.correct_count}/{doc.total_questions}</p>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <p style={{ fontSize: 7, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", marginBottom: 2 }}>Tags</p>
                                                    <p style={{ fontSize: 9, fontWeight: 700, color: TXT_MUT }}>{doc.doc_distinct_tags}/{doc.doc_total_tags}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "10px 20px", background: "var(--lt-rgba-255-255-255-0-02, rgba(255,255,255,0.02))", borderTop: "1px solid var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: TXT_DIM, textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 6 }}>
                        {APP_NAME} Intelligence
                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--lt-rgba-255-255-255-0-2, rgba(255,255,255,0.2))", display: "inline-block" }} />
                        {new Date().toLocaleDateString()}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "var(--lt-4ade80, #4ADE80)", textTransform: "uppercase", letterSpacing: "0.07em", display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px rgba(34,197,94,0.7)", display: "inline-block" }} />
                        Secure Engine Active
                    </span>
                </div>
            </div>
        </div>
    );
}

export default UserStatisticsDialog;
