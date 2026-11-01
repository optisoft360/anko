import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    AcademicCapIcon,
    ArrowTrendingUpIcon,
    BookOpenIcon,
    BuildingOffice2Icon,
    CalendarDaysIcon,
    ChartBarIcon,
    CheckBadgeIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    ExclamationCircleIcon,
    ExclamationTriangleIcon,
    LightBulbIcon,
    ShieldCheckIcon,
    UserGroupIcon,
    UserIcon,
    UsersIcon,
} from "@heroicons/react/24/outline";
import { analyticsApi } from "@/enterprise/api/enterpriseApi";
import { Card, EmptyBlock, RingGauge, SkeletonRows, Segmented, Badge, Avatar, ROLE_TONE, TONE, BTN_SECONDARY } from "@/enterprise/components/ui/kit";
import { Bar, StackedBar, Kpi, KpiGrid, Section, Stat, Sparkline, num, pct, goodTone, riskTone } from "./stats-ui";

// Role-aware statistics. Every view reads one of the existing role dashboards of
// /enterprise/analytics/, whose role checks match the views each role gets here.

export const STATS_VIEWS = {
    company:    { fetch: () => analyticsApi.executiveDashboard(), icon: BuildingOffice2Icon },
    team:       { fetch: () => analyticsApi.managerDashboard(),   icon: UserGroupIcon },
    training:   { fetch: () => analyticsApi.trainerDashboard(),   icon: AcademicCapIcon },
    compliance: { fetch: () => analyticsApi.auditorDashboard(),   icon: ShieldCheckIcon },
    me:         { fetch: () => analyticsApi.employeeDashboard(),  icon: UserIcon },
};

export const VIEWS_BY_ROLE = {
    owner:    ["company", "team", "training", "compliance", "me"],
    admin:    ["company", "team", "training", "compliance", "me"],
    manager:  ["team", "training", "me"],
    trainer:  ["training", "me"],
    auditor:  ["compliance", "me"],
    employee: ["me"],
};

const ROLE_LABEL = {
    owner:    ["Propietario", "Owner"],
    admin:    ["Administrador", "Admin"],
    manager:  ["Manager", "Manager"],
    trainer:  ["Formador", "Trainer"],
    auditor:  ["Auditor", "Auditor"],
    employee: ["Empleado", "Employee"],
};

const VIEW_LABEL = {
    company:    ["Empresa", "Company"],
    team:       ["Equipo", "Team"],
    training:   ["Formación", "Training"],
    compliance: ["Cumplimiento", "Compliance"],
    me:         ["Mi progreso", "My progress"],
};

const VIEW_HINT = {
    company:    ["Salud global de la organización: aprendizaje, retención, cumplimiento y equipos.", "Organization-wide health: learning, retention, compliance and teams."],
    team:       ["Progreso de las personas a tu cargo y quién necesita ayuda.", "Progress of the people you lead and who needs help."],
    training:   ["Cómo rinde el contenido formativo y qué alumnos van atrasados.", "How training content performs and which learners are behind."],
    compliance: ["Estado de cumplimiento, vencimientos y evidencias para auditoría.", "Compliance status, expirations and audit evidence."],
    me:         ["Tus rutas, repasos, cumplimiento y certificaciones en esta empresa.", "Your paths, reviews, compliance and certifications in this company."],
};

const EVENT_LABEL = {
    flashcard_review:        ["Repaso de flashcards", "Flashcard review"],
    battery_completed:       ["Batería completada", "Quiz completed"],
    battery_attempted:       ["Batería intentada", "Quiz attempted"],
    module_completed:        ["Módulo completado", "Module completed"],
    module_started:          ["Módulo iniciado", "Module started"],
    learning_path_completed: ["Ruta completada", "Learning path completed"],
    learning_path_assigned:  ["Ruta asignada", "Learning path assigned"],
    review_completed:        ["Repaso completado", "Review completed"],
    compliance_completed:    ["Cumplimiento completado", "Compliance completed"],
    compliance_assigned:     ["Cumplimiento asignado", "Compliance assigned"],
    compliance_expired:      ["Cumplimiento vencido", "Compliance expired"],
    certificate_issued:      ["Certificado emitido", "Certificate issued"],
    certificate_expired:     ["Certificado vencido", "Certificate expired"],
    certificate_revoked:     ["Certificado revocado", "Certificate revoked"],
    knowledge_gap_detected:  ["Brecha detectada", "Knowledge gap detected"],
};

const eventTone = (type = "") =>
    /revoked|expired|gap/.test(type) ? "rose" : /completed|issued/.test(type) ? "emerald" : /assigned/.test(type) ? "sky" : "slate";

function useT(language) {
    const es = language === "es";
    return useCallback((pair) => (Array.isArray(pair) ? pair[es ? 0 : 1] : pair), [es]);
}

function formatDate(value, language) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(language === "es" ? "es-ES" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Panel({ children, className = "" }) {
    return <Card className={`p-4 sm:p-5 ${className}`}>{children}</Card>;
}

function ScoreCard({ value, tone, label, caption }) {
    return (
        <Card className="flex items-center gap-4 p-4 sm:p-5">
            <RingGauge value={pct(value)} tone={tone} size={96} stroke={9}>
                <p className="text-xl font-semibold tabular-nums text-[#0F172A]">{pct(value)}%</p>
            </RingGauge>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
                {caption && <p className="mt-0.5 text-sm text-[#64748B]">{caption}</p>}
            </div>
        </Card>
    );
}

function EventList({ events, t, language, withUser }) {
    if (!events?.length) return <p className="py-6 text-center text-sm text-[#64748B]">{t(["Sin actividad reciente", "No recent activity"])}</p>;
    return (
        <ul className="divide-y divide-[#F1F5F9]">
            {events.map((e, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[eventTone(e.event_type)].dot}`} />
                        <span className="truncate text-[#334155]">
                            {t(EVENT_LABEL[e.event_type]) || e.event_type?.replace(/_/g, " ")}
                            {withUser && e.user__username && <span className="text-[#64748B]"> · {e.user__username}</span>}
                        </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-[#94A3B8]">{formatDate(e.created_at, language)}</span>
                </li>
            ))}
        </ul>
    );
}

// ─── Views ──────────────────────────────────────────────────────────────────

function CompanyView({ d, t }) {
    const trend = d.retention_trend || [];
    const teams = d.team_breakdown || [];
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <ScoreCard value={d.health_score} tone={goodTone(d.health_score)} label={t(["Salud de la empresa", "Company health"])}
                    caption={t(["Cumplimiento 40% · Retención 30% · Certificación 20% · Brechas críticas 10%", "Compliance 40% · Retention 30% · Certification 20% · Critical gaps 10%"])} />
                <KpiGrid cols={3}>
                    <Kpi icon={UsersIcon} tone="indigo" label={t(["Personas activas", "Active people"])} value={num(d.headcount)} />
                    <Kpi icon={BookOpenIcon} tone="sky" label={t(["Rutas completadas", "Paths completed"])} value={`${pct(d.learning?.completion_rate)}%`}
                        hint={`${num(d.learning?.completed)} / ${num(d.learning?.total_assignments)}`} />
                    <Kpi icon={CheckBadgeIcon} tone="violet" label={t(["Certificaciones activas", "Active certifications"])} value={num(d.certifications?.active)} />
                </KpiGrid>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <Panel>
                    <Section icon={ShieldCheckIcon} title={t(["Cumplimiento", "Compliance"])}>
                        <Bar label={t(["Tasa de cumplimiento", "Compliance rate"])} value={d.compliance?.rate} tone={goodTone(d.compliance?.rate)} />
                        <div className="mt-3 divide-y divide-[#F1F5F9]">
                            <Stat tone="emerald" label={t(["Cumplen", "Compliant"])} value={num(d.compliance?.compliant)} />
                            <Stat tone="rose" label={t(["No cumplen", "Non-compliant"])} value={num(d.compliance?.non_compliant)} />
                            <Stat tone="slate" label={t(["Asignaciones", "Assignments"])} value={num(d.compliance?.total)} />
                        </div>
                    </Section>
                </Panel>
                <Panel>
                    <Section icon={LightBulbIcon} title={t(["Retención del conocimiento", "Knowledge retention"])}>
                        <Bar label={t(["Retención media", "Average retention"])} value={d.retention?.avg_score} tone={goodTone(d.retention?.avg_score)} />
                        <div className="mt-3 divide-y divide-[#F1F5F9]">
                            <Stat tone="amber" label={t(["Brechas abiertas", "Open gaps"])} value={num(d.retention?.open_gaps)} />
                            <Stat tone="rose" label={t(["Brechas críticas", "Critical gaps"])} value={num(d.retention?.critical_gaps)} />
                        </div>
                    </Section>
                </Panel>
                <Panel>
                    <Section icon={ArrowTrendingUpIcon} title={t(["Tendencia de retención (30 días)", "Retention trend (30 days)"])}>
                        {trend.length >= 2 ? (
                            <>
                                <Sparkline points={trend.map((p) => p.avg_retention)} tone="indigo" />
                                <div className="mt-2 flex justify-between text-xs text-[#94A3B8]">
                                    <span>{trend[0].date}</span><span>{trend[trend.length - 1].date}</span>
                                </div>
                            </>
                        ) : (
                            <p className="py-6 text-center text-sm text-[#64748B]">{t(["Aún no hay suficientes mediciones", "Not enough measurements yet"])}</p>
                        )}
                    </Section>
                </Panel>
            </div>

            <Section icon={UserGroupIcon} title={t(["Cumplimiento por equipo", "Compliance by team"])}>
                {teams.length ? (
                    <Card className="divide-y divide-[#F1F5F9]">
                        {teams.map((tm) => (
                            <div key={tm.team_id} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center sm:gap-6">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[#0F172A]">{tm.team_name}</p>
                                    <p className="text-xs text-[#64748B]">{num(tm.member_count)} {t(["personas", "people"])}</p>
                                </div>
                                <Bar label={t(["Cumplimiento medio", "Average compliance"])} value={tm.avg_compliance_rate} tone={goodTone(tm.avg_compliance_rate)} />
                            </div>
                        ))}
                    </Card>
                ) : (
                    <Card><EmptyBlock icon={UserGroupIcon} title={t(["Sin equipos", "No teams yet"])} hint={t(["Crea equipos en Configuración para comparar su rendimiento.", "Create teams in Settings to compare how they perform."])} /></Card>
                )}
            </Section>
        </div>
    );
}

function TeamView({ d, t }) {
    if (!num(d.total_members)) {
        return <EmptyBlock icon={UserGroupIcon} title={t(["Aún no hay personas en el equipo", "No people in the team yet"])} />;
    }
    const atRisk = d.at_risk_members || [];
    return (
        <div className="space-y-6">
            <KpiGrid>
                <Kpi icon={UsersIcon} tone="indigo" label={t(["Personas", "People"])} value={num(d.total_members)} hint={d.context} />
                <Kpi icon={BookOpenIcon} tone="sky" label={t(["Rutas completadas", "Paths completed"])} value={`${pct(d.learning?.completion_rate)}%`}
                    hint={`${num(d.learning?.completed)} / ${num(d.learning?.total_assignments)}`} />
                <Kpi icon={ShieldCheckIcon} tone={goodTone(d.compliance?.avg_rate)} label={t(["Cumplimiento medio", "Average compliance"])} value={`${pct(d.compliance?.avg_rate)}%`} />
                <Kpi icon={ExclamationTriangleIcon} tone={num(d.learning?.overdue) ? "rose" : "emerald"} label={t(["Rutas vencidas", "Overdue paths"])} value={num(d.learning?.overdue)} />
            </KpiGrid>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Panel>
                    <Section icon={LightBulbIcon} title={t(["Retención del equipo", "Team retention"])}>
                        <div className="space-y-3">
                            <Bar label={t(["Retención media", "Average retention"])} value={d.retention?.avg_score} tone={goodTone(d.retention?.avg_score)} />
                            <Bar label={t(["Riesgo medio de olvido", "Average forgetting risk"])} value={d.retention?.avg_risk} tone={riskTone(d.retention?.avg_risk)} />
                        </div>
                    </Section>
                </Panel>
                <Panel>
                    <Section icon={ClipboardDocumentCheckIcon} title={t(["Pendientes del equipo", "Team backlog"])}>
                        <div className="divide-y divide-[#F1F5F9]">
                            <Stat tone="amber" label={t(["Brechas abiertas", "Open gaps"])} value={num(d.retention?.open_gaps)} />
                            <Stat tone="rose" label={t(["Brechas críticas", "Critical gaps"])} value={num(d.retention?.critical_gaps)} />
                            <Stat tone="sky" label={t(["Repasos atrasados", "Overdue reviews"])} value={num(d.retention?.overdue_reviews)} />
                            <Stat tone="violet" label={t(["Certificaciones activas", "Active certifications"])} value={num(d.certifications?.active_total)} />
                        </div>
                    </Section>
                </Panel>
            </div>

            <Section icon={ExclamationTriangleIcon} title={t(["Personas en riesgo", "People at risk"])}
                aside={atRisk.length > 0 && <Badge tone="rose">{atRisk.length}</Badge>}>
                {atRisk.length ? (
                    <Card className="divide-y divide-[#F1F5F9]">
                        {atRisk.map((m) => (
                            <div key={m.user_id} className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] sm:items-center sm:gap-6">
                                <div className="flex min-w-0 items-center gap-3">
                                    <Avatar name={m.username} tone="rose" size="sm" />
                                    <p className="truncate text-sm font-medium text-[#0F172A]">{m.username}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Bar label={t(["Retención", "Retention"])} value={m.retention_score} tone={goodTone(m.retention_score)} />
                                    <Bar label={t(["Riesgo", "Risk"])} value={m.risk_score} tone={riskTone(m.risk_score)} />
                                </div>
                            </div>
                        ))}
                    </Card>
                ) : (
                    <Card><EmptyBlock icon={CheckBadgeIcon} title={t(["Nadie en riesgo", "Nobody at risk"])} hint={t(["Todas las personas mantienen buena retención.", "Everyone is keeping good retention."])} /></Card>
                )}
            </Section>
        </div>
    );
}

function TrainingView({ d, t }) {
    const a = d.assignments || {};
    const pending = Math.max(0, num(a.total) - num(a.completed) - num(a.in_progress) - num(a.overdue));
    const paths = d.top_paths_by_assessment || [];
    const learners = d.learners_needing_attention || [];
    return (
        <div className="space-y-6">
            <KpiGrid>
                <Kpi icon={BookOpenIcon} tone="indigo" label={t(["Rutas de aprendizaje", "Learning paths"])} value={num(d.learning_paths?.total)}
                    hint={`${num(d.learning_paths?.active)} ${t(["activas", "active"])}`} />
                <Kpi icon={AcademicCapIcon} tone="violet" label={t(["Programas formativos", "Training programs"])} value={num(d.training_programs?.total)}
                    hint={`${num(d.training_programs?.active)} ${t(["activos", "active"])}`} />
                <Kpi icon={ChartBarIcon} tone="sky" label={t(["Asignaciones completadas", "Assignments completed"])} value={`${pct(a.completion_rate)}%`}
                    hint={`${num(a.completed)} / ${num(a.total)}`} />
                <Kpi icon={CheckBadgeIcon} tone="emerald" label={t(["Módulos completados", "Modules completed"])} value={`${pct(d.modules?.completion_rate)}%`}
                    hint={`${num(d.modules?.completed)} / ${num(d.modules?.total)}`} />
            </KpiGrid>

            <Panel>
                <Section icon={ClipboardDocumentCheckIcon} title={t(["Estado de las asignaciones", "Assignment status"])}>
                    <StackedBar parts={[
                        { label: t(["Completadas", "Completed"]), value: a.completed, tone: "emerald" },
                        { label: t(["En curso", "In progress"]), value: a.in_progress, tone: "indigo" },
                        { label: t(["Pendientes", "Pending"]), value: pending, tone: "slate" },
                        { label: t(["Vencidas", "Overdue"]), value: a.overdue, tone: "rose" },
                    ]} />
                </Section>
            </Panel>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Panel>
                    <Section icon={ArrowTrendingUpIcon} title={t(["Nota media por ruta", "Average score by path"])}>
                        {paths.length ? (
                            <div className="space-y-3">
                                {paths.map((p, i) => (
                                    <Bar key={p.learning_path__id ?? i} label={`${p.learning_path__name} · ${num(p.count)} ${t(["evaluaciones", "assessments"])}`}
                                        value={p.avg_score} tone={goodTone(p.avg_score)} />
                                ))}
                            </div>
                        ) : (
                            <p className="py-6 text-center text-sm text-[#64748B]">{t(["Todavía no hay evaluaciones", "No assessments yet"])}</p>
                        )}
                    </Section>
                </Panel>
                <Panel>
                    <Section icon={ExclamationTriangleIcon} title={t(["Alumnos que necesitan atención", "Learners needing attention"])}>
                        {learners.length ? (
                            <ul className="divide-y divide-[#F1F5F9]">
                                {learners.map((l, i) => (
                                    <li key={l.user__id ?? i} className="flex items-center justify-between gap-3 py-2.5">
                                        <span className="flex min-w-0 items-center gap-2.5">
                                            <Avatar name={l.user__username} tone="amber" size="sm" />
                                            <span className="truncate text-sm text-[#0F172A]">{l.user__username}</span>
                                        </span>
                                        <Badge tone="rose">{num(l.overdue_count)} {t(["vencidas", "overdue"])}</Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="py-6 text-center text-sm text-[#64748B]">{t(["Nadie va atrasado", "Nobody is behind"])}</p>
                        )}
                    </Section>
                </Panel>
            </div>
        </div>
    );
}

function ComplianceView({ d, t, language }) {
    const c = d.compliance || {};
    const programs = d.program_breakdown || [];
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <ScoreCard value={c.compliance_rate} tone={goodTone(c.compliance_rate)} label={t(["Tasa de cumplimiento", "Compliance rate"])}
                    caption={`${num(c.compliant)} / ${num(c.total_assignments)} ${t(["asignaciones cumplen", "assignments compliant"])}`} />
                <KpiGrid cols={3}>
                    <Kpi icon={ShieldCheckIcon} tone="indigo" label={t(["Programas activos", "Active programs"])} value={num(c.active_programs)}
                        hint={`${num(c.mandatory_programs)} ${t(["obligatorios", "mandatory"])}`} />
                    <Kpi icon={CalendarDaysIcon} tone={num(c.expiring_30_days) ? "amber" : "emerald"} label={t(["Vencen en 30 días", "Expiring in 30 days"])} value={num(c.expiring_30_days)}
                        hint={`${num(c.expiring_90_days)} ${t(["en 90 días", "within 90 days"])}`} />
                    <Kpi icon={CheckBadgeIcon} tone="violet" label={t(["Certificaciones activas", "Active certifications"])} value={num(d.certifications?.active)}
                        hint={`${num(d.certifications?.expiring_30_days)} ${t(["vencen en 30 días", "expire in 30 days"])}`} />
                </KpiGrid>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Panel>
                    <Section icon={ClipboardDocumentCheckIcon} title={t(["Estado de las asignaciones", "Assignment status"])}>
                        <StackedBar parts={[
                            { label: t(["Cumplen", "Compliant"]), value: c.compliant, tone: "emerald" },
                            { label: t(["Pendientes", "Pending"]), value: c.pending, tone: "amber" },
                            { label: t(["No cumplen", "Non-compliant"]), value: c.non_compliant, tone: "rose" },
                        ]} />
                    </Section>
                </Panel>
                <Panel>
                    <Section icon={LightBulbIcon} title={t(["Brechas de conocimiento abiertas", "Open knowledge gaps"])}>
                        <div className="divide-y divide-[#F1F5F9]">
                            <Stat tone="slate" label={t(["Total", "Total"])} value={num(d.knowledge_gaps?.open)} />
                            <Stat tone="rose" label={t(["Críticas", "Critical"])} value={num(d.knowledge_gaps?.critical)} />
                            <Stat tone="amber" label={t(["Altas", "High"])} value={num(d.knowledge_gaps?.high)} />
                        </div>
                    </Section>
                </Panel>
            </div>

            <Section icon={ShieldCheckIcon} title={t(["Cumplimiento por programa", "Compliance by program"])}>
                {programs.length ? (
                    <Card className="divide-y divide-[#F1F5F9]">
                        {programs.map((p) => (
                            <div key={p.program_code} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center sm:gap-6">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-[#0F172A]">{p.program_name}</p>
                                    <p className="text-xs text-[#64748B]">{p.program_code} · {num(p.compliant)}/{num(p.total)}</p>
                                </div>
                                <Bar label={t(["Cumplimiento", "Compliance"])} value={p.rate} tone={goodTone(p.rate)} />
                            </div>
                        ))}
                    </Card>
                ) : (
                    <Card><EmptyBlock icon={ShieldCheckIcon} title={t(["Sin programas activos", "No active programs"])} /></Card>
                )}
            </Section>

            <Panel>
                <Section icon={ClockIcon} title={t(["Registro de auditoría reciente", "Recent audit trail"])}>
                    <EventList events={d.recent_audit_events} t={t} language={language} withUser />
                </Section>
            </Panel>
        </div>
    );
}

function MeView({ d, t, language }) {
    const l = d.learning || {};
    const pending = num(l.pending);
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <ScoreCard value={l.completion_rate} tone={goodTone(l.completion_rate)} label={t(["Mis rutas completadas", "My paths completed"])}
                    caption={`${num(l.completed)} / ${num(l.total_assigned)} ${t(["rutas asignadas", "assigned paths"])}`} />
                <KpiGrid cols={3}>
                    <Kpi icon={LightBulbIcon} tone={goodTone(d.retention?.score)} label={t(["Mi retención", "My retention"])} value={`${pct(d.retention?.score)}%`}
                        hint={`${t(["Riesgo de olvido", "Forgetting risk"])} ${pct(d.retention?.risk_score)}%`} />
                    <Kpi icon={CalendarDaysIcon} tone={num(d.reviews?.overdue) ? "rose" : "sky"} label={t(["Repasos esta semana", "Reviews this week"])} value={num(d.reviews?.due_this_week)}
                        hint={`${num(d.reviews?.overdue)} ${t(["atrasados", "overdue"])}`} />
                    <Kpi icon={CheckBadgeIcon} tone="violet" label={t(["Mis certificaciones", "My certifications"])} value={num(d.certifications?.active)}
                        hint={`${num(d.certifications?.expiring_soon)} ${t(["vencen en 30 días", "expire in 30 days"])}`} />
                </KpiGrid>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Panel>
                    <Section icon={BookOpenIcon} title={t(["Mis rutas de aprendizaje", "My learning paths"])}>
                        <StackedBar parts={[
                            { label: t(["Completadas", "Completed"]), value: l.completed, tone: "emerald" },
                            { label: t(["En curso", "In progress"]), value: l.in_progress, tone: "indigo" },
                            { label: t(["Pendientes", "Pending"]), value: pending, tone: "slate" },
                            { label: t(["Vencidas", "Overdue"]), value: l.overdue, tone: "rose" },
                        ]} />
                    </Section>
                </Panel>
                <Panel>
                    <Section icon={ShieldCheckIcon} title={t(["Mi cumplimiento", "My compliance"])}>
                        <Bar label={t(["Tasa de cumplimiento", "Compliance rate"])} value={d.compliance?.rate} tone={goodTone(d.compliance?.rate)} />
                        <div className="mt-3 divide-y divide-[#F1F5F9]">
                            <Stat tone="emerald" label={t(["Programas cumplidos", "Programs met"])} value={`${num(d.compliance?.compliant)} / ${num(d.compliance?.total)}`} />
                            <Stat tone="amber" label={t(["Pendientes", "Pending"])} value={num(d.compliance?.pending)} />
                            <Stat tone="rose" label={t(["Vencen en 30 días", "Expiring in 30 days"])} value={num(d.compliance?.expiring_soon)} />
                        </div>
                    </Section>
                </Panel>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                <Panel>
                    <Section icon={ExclamationCircleIcon} title={t(["Brechas abiertas", "Open gaps"])}>
                        <p className="text-3xl font-semibold tabular-nums text-[#0F172A]">{num(d.retention?.open_gaps)}</p>
                        <p className="mt-1 text-sm text-[#64748B]">{t(["Temas donde fallas con frecuencia. Repásalos desde Mis asignaciones.", "Topics you often miss. Review them from My Assignments."])}</p>
                    </Section>
                </Panel>
                <Panel>
                    <Section icon={ClockIcon} title={t(["Mi actividad reciente", "My recent activity"])}>
                        <EventList events={d.recent_activity} t={t} language={language} />
                    </Section>
                </Panel>
            </div>
        </div>
    );
}

const RENDER = { company: CompanyView, team: TeamView, training: TrainingView, compliance: ComplianceView, me: MeView };

// ─── Container ──────────────────────────────────────────────────────────────

export function EnterpriseStats({ role, companyName, language }) {
    const t = useT(language);
    const views = VIEWS_BY_ROLE[role] || VIEWS_BY_ROLE.employee;
    const [view, setView] = useState(views[0]);
    const [cache, setCache] = useState({});
    const cacheRef = useRef({});

    const put = useCallback((key, value) => {
        cacheRef.current = { ...cacheRef.current, [key]: value };
        setCache(cacheRef.current);
    }, []);

    const load = useCallback((key, force = false) => {
        if (!force && cacheRef.current[key]) return;
        put(key, { loading: true });
        STATS_VIEWS[key].fetch()
            .then((data) => put(key, { data }))
            .catch((err) => put(key, { error: err?.detail || err?.error || t(["No se pudieron cargar las estadísticas", "Could not load statistics"]) }));
    }, [put, t]);

    useEffect(() => {
        cacheRef.current = {};
        setCache({});
        setView(views[0]);
    }, [role]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { load(view); }, [view, load]);

    const entry = cache[view] || { loading: true };
    const View = RENDER[view];
    const roleTone = ROLE_TONE[role] || "slate";

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-[#0F172A]">{companyName}</span>
                        <Badge tone={roleTone} dot>{t(ROLE_LABEL[role]) || role}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-[#64748B]">{t(VIEW_HINT[view])}</p>
                </div>
            </div>

            {views.length > 1 && (
                <Segmented ariaLabel={t(["Tipo de estadística", "Statistics view"])} value={view} onChange={setView}
                    items={views.map((v) => ({ value: v, label: t(VIEW_LABEL[v]), icon: STATS_VIEWS[v].icon }))} />
            )}

            {entry.loading ? (
                <SkeletonRows rows={4} height="h-20" />
            ) : entry.error ? (
                <EmptyBlock icon={ExclamationCircleIcon} title={entry.error}
                    action={<button type="button" onClick={() => load(view, true)} className={BTN_SECONDARY}>{t(["Reintentar", "Retry"])}</button>} />
            ) : (
                <View d={entry.data || {}} t={t} language={language} />
            )}
        </div>
    );
}

export default EnterpriseStats;
