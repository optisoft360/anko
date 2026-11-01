import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    DocumentTextIcon,
    FolderIcon,
    TrophyIcon,
    ClockIcon,
    SparklesIcon,
    ExclamationCircleIcon,
    ChartBarIcon,
} from "@heroicons/react/24/outline";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { useEnterprise } from "@/enterprise/context/enterprise-context";
import { Modal, Card, EmptyBlock, RingGauge, SkeletonRows, TONE, BTN_SECONDARY } from "@/enterprise/components/ui/kit";
import { Bar, Kpi, Section, pct } from "@/widgets/dialogs/stats/stats-ui";
import { EnterpriseStats } from "@/widgets/dialogs/stats/enterprise-stats";

const formatStudyTime = (seconds) => {
    if (!seconds) return "0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

/** Study statistics of the personal (non-company) product, also used to inspect another user. */
function LegacyStudyStats({ userId, language }) {
    const es = language === "es";
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStats();
    }, [userId]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await projectService.getUserStatistics(userId);
            setStats(data);
        } catch (err) {
            console.error("Error fetching statistics:", err);
            setError(err?.error || (es ? "Error al cargar estadísticas" : "Failed to load statistics"));
        } finally {
            setLoading(false);
        }
    };

    const q = stats?.question_level || {};
    const projects = stats?.project_level || [];
    const docs = stats?.document_level || [];
    const totalSeconds = docs.reduce((acc, d) => acc + (d.study_seconds || 0), 0);
    const accuracy = pct(q.accuracy);
    const accuracyTone = accuracy >= 70 ? "emerald" : accuracy >= 40 ? "amber" : "rose";
    const isEmpty = !q.total_questions && !projects.length && !docs.length;

    const L = {
        questions: es ? "Preguntas respondidas" : "Questions answered",
        correct: es ? "Respuestas correctas" : "Correct answers",
        time: es ? "Tiempo de estudio" : "Study time",
        accuracy: es ? "Precisión" : "Accuracy",
        coverage: es ? "Cobertura" : "Coverage",
        global: es ? "Puntuación global" : "Overall score",
        projects: es ? "Rendimiento por proyecto" : "Performance by project",
        documents: es ? "Detalle por documento" : "Performance by document",
        docs: es ? "documentos" : "documents",
        active: es ? "activos" : "active",
        attempts: es ? "Intentos" : "Attempts",
        score: es ? "Puntuación" : "Score",
        tags: es ? "Temas" : "Topics",
        notTracked: es ? "No registrado" : "Not tracked",
        notTrackedHint: es ? "El tiempo solo se mide en proyectos personales" : "Time is only measured on personal projects",
        inProjects: (n) => es ? `en ${n} ${n === 1 ? "proyecto" : "proyectos"}` : `across ${n} ${n === 1 ? "project" : "projects"}`,
        retry: es ? "Reintentar" : "Retry",
        emptyTitle: es ? "Aún no hay actividad" : "No activity yet",
        emptyHint: es ? "Responde quizzes o simulacros y aquí verás tu progreso." : "Answer quizzes or practice exams and your progress will show up here.",
    };

    let body;
    if (loading) {
        body = <SkeletonRows rows={4} height="h-20" />;
    } else if (error) {
        body = (
            <EmptyBlock icon={ExclamationCircleIcon} title={error}
                action={<button type="button" onClick={fetchStats} className={BTN_SECONDARY}>{L.retry}</button>} />
        );
    } else if (isEmpty) {
        body = <EmptyBlock icon={ChartBarIcon} title={L.emptyTitle} hint={L.emptyHint} />;
    } else {
        body = (
            <div className="space-y-6">
                {/* KPIs + overall score */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Kpi icon={SparklesIcon} tone="indigo" label={L.questions} value={q.total_questions || 0} />
                        <Kpi icon={TrophyIcon} tone="emerald" label={L.correct} value={q.correct_count || 0}>
                            <Bar label={L.accuracy} value={accuracy} tone="emerald" />
                        </Kpi>
                        <Kpi icon={ClockIcon} tone="amber" label={L.time} value={totalSeconds ? formatStudyTime(totalSeconds) : L.notTracked}>
                            <p className="text-xs text-[#64748B]">{totalSeconds ? L.inProjects(projects.length) : L.notTrackedHint}</p>
                        </Kpi>
                    </div>
                    <Card className="flex items-center gap-4 p-4 lg:flex-col lg:justify-center lg:px-6">
                        <RingGauge value={accuracy} tone={accuracyTone} size={104} stroke={9}>
                            <div>
                                <p className="text-xl font-semibold tabular-nums text-[#0F172A]">{accuracy}%</p>
                                <p className="text-[11px] text-[#64748B]">{L.accuracy}</p>
                            </div>
                        </RingGauge>
                        <p className="text-sm font-medium text-[#334155]">{L.global}</p>
                    </Card>
                </div>

                {/* Projects */}
                {projects.length > 0 && (
                        <Section icon={FolderIcon} title={L.projects}>
                        <Card className="divide-y divide-[#F1F5F9]">
                            {projects.map((p) => (
                                <div key={p.project_id} className="grid grid-cols-1 gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center sm:gap-6">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE.indigo.icon}`}><FolderIcon className="h-4 w-4" /></span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-[#0F172A]" title={p.project_name}>{p.project_name}</p>
                                            <p className="text-xs text-[#64748B]">{p.documents_count} {L.docs} · {p.docs_with_attempts} {L.active}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Bar label={L.accuracy} value={p.percent} tone="indigo" />
                                        <Bar label={L.coverage} value={p.avg_coverage_percent} tone="emerald" />
                                    </div>
                                </div>
                            ))}
                        </Card>
                    </Section>
                )}

                {/* Documents */}
                {docs.length > 0 && (
                        <Section icon={DocumentTextIcon} title={L.documents}>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {docs.map((d) => (
                                <Card key={d.document_id} className="flex flex-col p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-medium text-[#4F46E5]">{d.project_name}</p>
                                            <p className="mt-0.5 line-clamp-2 text-sm font-medium text-[#0F172A]" title={d.document_name}>{d.document_name}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-lg font-semibold tabular-nums text-[#0F172A]">{pct(d.final_percent)}%</p>
                                            <p className="text-[11px] text-[#64748B]">{L.score}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2.5">
                                        <Bar label={L.coverage} value={d.coverage_percent} tone="indigo" />
                                        <Bar label={L.accuracy} value={d.accuracy} tone="emerald" />
                                    </div>
                                    <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-[#F1F5F9] pt-3 text-xs">
                                        {[
                                            { k: L.time, v: formatStudyTime(d.study_seconds) },
                                            { k: L.attempts, v: d.attempts_count ?? 0 },
                                            { k: es ? "Aciertos" : "Correct", v: `${d.correct_count ?? 0}/${d.total_questions ?? 0}` },
                                            { k: L.tags, v: `${d.doc_distinct_tags ?? 0}/${d.doc_total_tags ?? 0}` },
                                        ].map(({ k, v }) => (
                                            <div key={k} className="min-w-0">
                                                <dt className="truncate text-[#64748B]">{k}</dt>
                                                <dd className="mt-0.5 font-semibold tabular-nums text-[#334155]">{v}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </Card>
                            ))}
                        </div>
                    </Section>
                )}
            </div>
        );
    }

    return body;
}

export function UserStatisticsDialog({ open, handler, userId, userName }) {
    const { language } = useLanguage();
    const es = language === "es";
    const { user } = useAuth();
    const { role, activeCompany } = useEnterprise();

    if (!open) return null;

    // Inside a company the statistics follow the member's role; the personal study
    // stats remain for users without a company and for inspecting someone else.
    const isSelf = !userId || String(userId) === String(user?.id);
    const companyMode = isSelf && role && activeCompany;

    return createPortal(
        <Modal title={`${es ? "Estadísticas" : "Statistics"}${!companyMode && userName ? ` — ${userName}` : ""}`} onClose={handler} width="max-w-5xl"
            footer={<button type="button" onClick={handler} className={BTN_SECONDARY}>{es ? "Cerrar" : "Close"}</button>}>
            {companyMode
                ? <EnterpriseStats role={role} companyName={activeCompany.company_name} language={language} />
                : <LegacyStudyStats userId={userId} language={language} />}
        </Modal>,
        document.body,
    );
}

export default UserStatisticsDialog;
