import React, { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  DocumentTextIcon, ChartBarIcon, Cog6ToothIcon, PlusIcon, ArrowRightIcon,
  ArrowTrendingUpIcon, ClipboardDocumentListIcon, BoltIcon, SparklesIcon,
  CheckBadgeIcon, ClockIcon, ShieldCheckIcon, ShieldExclamationIcon,
  ArrowUpRightIcon, UserPlusIcon, UsersIcon, MapIcon, RectangleGroupIcon,
  ChevronRightIcon, CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import { knowledgeApi, learningApi, analyticsApi } from "../../api/enterpriseApi";
import { useAuth } from "@/context/auth-context";
import { useKnowledgeEnumLabels } from "@/utils/enumLabel";

// ─── Role style map ───────────────────────────────────────────────────────────

const ROLE_COLORS = {
  owner:    { bg: "rgba(168,85,247,0.14)",  text: "#a855f7", labelKey: "owner" },
  admin:    { bg: "rgba(239,68,68,0.12)",   text: "#f87171", labelKey: "admin" },
  manager:  { bg: "rgba(59,130,246,0.12)",  text: "#60a5fa", labelKey: "manager" },
  trainer:  { bg: "rgba(34,197,94,0.12)",   text: "#4ade80", labelKey: "trainer" },
  employee: { bg: "rgba(255,255,255,0.07)", text: "#8B8B9C", labelKey: "employee" },
  auditor:  { bg: "rgba(245,158,11,0.12)",  text: "#fbbf24", labelKey: "auditor" },
};

function RoleBadge({ role }) {
  const { t } = useLanguage();
  const c = ROLE_COLORS[role] || ROLE_COLORS.employee;
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 5, letterSpacing: "0.03em" }}>
      {t(`enterprise.roles.${c.labelKey}`)}
    </span>
  );
}

// ─── Company header banner ────────────────────────────────────────────────────

function CompanyBanner({ company, role, showSettings = true }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const name = company?.company_name || company?.name || t("enterprise.dashboard.yourCompany");
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(192,132,252,0.06) 100%)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 14, padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div className="flex items-center gap-4">
        <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg, #6366F1, #818CF8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
          {initial}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p style={{ color: "var(--lt-f1f5f9, #F1F5F9)", fontWeight: 700, fontSize: 15 }}>{name}</p>
            <RoleBadge role={role || "employee"} />
          </div>
          <p style={{ color: "#64748B", fontSize: 12, marginTop: 2 }}>
            {t("enterprise.dashboard.planActive")}
          </p>
        </div>
      </div>
      {showSettings && (
        <button onClick={() => navigate("/enterprise/settings")}
          style={{ fontSize: 12, fontWeight: 600, color: "var(--lt-94a3b8, #94A3B8)", background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 8, padding: "7px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#F1F5F9"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#94A3B8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}>
          <Cog6ToothIcon className="h-3.5 w-3.5" />
          {t("enterprise.dashboard.settingsBtn")}
        </button>
      )}
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, sub, color, href }) {
  const navigate = useNavigate();
  const clickable = Boolean(href);
  return (
    <button
      onClick={clickable ? () => navigate(href) : undefined}
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "18px 16px", textAlign: "left",
        cursor: clickable ? "pointer" : "default", width: "100%",
        transition: "border-color 0.15s, background 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => { if (clickable) { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.transform = ""; }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 16, height: 16, color }} />
        </div>
        {clickable && <ArrowRightIcon style={{ width: 13, height: 13, color: "var(--text-tertiary)", marginTop: 2 }} />}
      </div>
      <p style={{ color: "var(--text-primary)", fontSize: 24, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>{value}</p>
      <p style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{label}</p>
      {sub && <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{sub}</p>}
    </button>
  );
}

// ─── Metrics hook ─────────────────────────────────────────────────────────────

/** Processes (knowledge sources) of a list response, most recently updated first. */
function recentFirst(d) {
  const items = Array.isArray(d) ? d : Array.isArray(d?.results) ? d.results : [];
  return [...items].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
}

function useMetrics(enabled) {
  const [data, setData] = useState({ processes: "—", learningModules: "—", paths: "—", assignments: "—", sources: "—", compliance: null, certifications: null, recentProcesses: [] });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    if (!enabled) { setLoadingMetrics(false); return; }
    let cancelled = false;
    const safe = (fn) => fn().catch(() => null);
    Promise.all([
      safe(() => learningApi.getModules()),
      safe(() => learningApi.getPaths()),
      safe(() => learningApi.getAssignments()),
      safe(() => knowledgeApi.list()),
      safe(() => analyticsApi.executiveDashboard()),
    ]).then(([modules, paths, assignments, sources, executive]) => {
      if (cancelled) return;
      const count = (d) => {
        if (!d) return "—";
        if (typeof d?.count === "number") return d.count;
        if (Array.isArray(d)) return d.length;
        if (Array.isArray(d?.results)) return d.results.length;
        return "—";
      };
      // "Processes" and "Sources" both count KnowledgeSource records — same
      // number, shown as two distinct cards (see dashboard discussion).
      const processCount = count(sources);
      setData({
        processes: processCount,
        learningModules: count(modules),
        paths: count(paths),
        assignments: count(assignments),
        sources: processCount,
        compliance: executive?.compliance || null,
        certifications: executive?.certifications || null,
        recentProcesses: recentFirst(sources).slice(0, 5),
      });
      setLoadingMetrics(false);
    });
    return () => { cancelled = true; };
  }, [enabled]);

  return { data, loadingMetrics };
}

// ─── Employee metrics hook ─────────────────────────────────────────────────────
// Employees don't have access to company-wide Procesos/Learning Paths/Fuentes —
// their dashboard shows only what belongs to them (analytics/employee-dashboard).

function useEmployeeMetrics(enabled) {
  const [data, setData] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  useEffect(() => {
    if (!enabled) { setLoadingMetrics(false); return; }
    let cancelled = false;
    analyticsApi.employeeDashboard()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoadingMetrics(false); });
    return () => { cancelled = true; };
  }, [enabled]);

  return { data, loadingMetrics };
}

// ─── Employee dashboard view ──────────────────────────────────────────────────

function useEmployeeNavLinks() {
  const { t } = useLanguage();
  return [
    { label: t("enterprise.dashboard.nav.myAssignments"),   href: "/enterprise/learning/assignments", icon: ClipboardDocumentListIcon },
    { label: t("enterprise.dashboard.nav.reviewSchedules"), href: "/enterprise/learning/reviews",     icon: ClockIcon },
    { label: t("enterprise.dashboard.nav.knowledgeGaps"),   href: "/enterprise/learning/gaps",        icon: ArrowTrendingUpIcon },
    { label: t("enterprise.dashboard.nav.myRetention"),     href: "/enterprise/retention/me",         icon: ArrowTrendingUpIcon },
    { label: t("enterprise.dashboard.nav.myCompliance"),    href: "/enterprise/compliance/me",        icon: ChartBarIcon },
    { label: t("enterprise.dashboard.nav.myCertifications"), href: "/enterprise/certifications",      icon: CheckBadgeIcon },
  ];
}

function EmployeeQuickLinks() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const navLinks = useEmployeeNavLinks();
  return (
    <div>
      <p style={{ color: "var(--text-tertiary)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{t("enterprise.dashboard.quickAccess")}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {navLinks.map(({ label, href, icon: Icon }) => (
          <button key={href} onClick={() => navigate(href)}
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "11px 12px", textAlign: "left", cursor: "pointer", transition: "border-color 0.15s, background 0.15s", display: "flex", alignItems: "center", gap: 9 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}>
            <Icon style={{ width: 13, height: 13, color: "var(--text-secondary)", flexShrink: 0 }} />
            <span style={{ color: "var(--text-primary)", fontSize: 12, fontWeight: 500 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EmployeeDashboard({ activeCompany, role }) {
  const { t } = useLanguage();
  const { data: metrics, loadingMetrics } = useEmployeeMetrics(true);
  const fmt = (v) => (loadingMetrics || !metrics ? "…" : v);

  const learning = metrics?.learning || {};
  const retention = metrics?.retention || {};
  const compliance = metrics?.compliance || {};
  const certifications = metrics?.certifications || {};

  const activeAssignments = (learning.in_progress || 0) + (learning.pending || 0);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Page header */}
      <div>
        <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.dashboard.title")}</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 2 }}>
          {t("enterprise.dashboard.employeeSubtitle")}
        </p>
      </div>

      {/* Company banner (no settings button — employees don't have settings access) */}
      <CompanyBanner company={activeCompany} role={role} showSettings={false} />

      {/* KPI grid */}
      <div>
        <p style={{ color: "var(--text-tertiary)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>{t("enterprise.dashboard.myMetrics")}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPICard icon={ClipboardDocumentListIcon} label={t("enterprise.dashboard.nav.myAssignments")} value={fmt(activeAssignments)} sub={t("enterprise.dashboard.completedCount", { count: fmt(learning.completed ?? "—") })} color="#F59E0B" href="/enterprise/learning/assignments" />
          <KPICard icon={ArrowTrendingUpIcon} label={t("enterprise.dashboard.nav.myRetention")} value={fmt(retention.score != null ? `${retention.score}%` : "—")} sub={t("enterprise.dashboard.riskValue", { value: fmt(retention.risk_score != null ? `${retention.risk_score}%` : "—") })} color="#22C55E" href="/enterprise/retention/me" />
          <KPICard icon={ChartBarIcon} label={t("enterprise.dashboard.nav.myCompliance")} value={fmt(compliance.rate != null ? `${compliance.rate}%` : "—")} sub={t("enterprise.dashboard.programsRatio", { compliant: fmt(compliance.compliant ?? "—"), total: fmt(compliance.total ?? "—") })} color="#818CF8" href="/enterprise/compliance/me" />
          <KPICard icon={CheckBadgeIcon} label={t("enterprise.dashboard.nav.myCertifications")} value={fmt(certifications.active ?? "—")} sub={t("enterprise.dashboard.expiringSoon", { count: fmt(certifications.expiring_soon ?? "—") })} color="#C084FC" href="/enterprise/certifications" />
        </div>
      </div>

      {/* Quick links — only routes an employee actually has */}
      <EmployeeQuickLinks />
    </div>
  );
}

// ─── Owner / admin dashboard (light, palette C) ──────────────────────────────
// Material Tailwind replaces Tailwind's color scales (no slate/emerald/…), so the
// palette is written as hex values. Every class string is a literal for the JIT.

const TONES = {
  indigo:  { icon: "bg-[#EEF2FF] text-[#4F46E5]", hover: "hover:border-[#C7D2FE]", arrow: "group-hover:text-[#4F46E5]", solid: "bg-[#4F46E5]", link: "text-[#4F46E5]" },
  sky:     { icon: "bg-[#F0F9FF] text-[#0284C7]", hover: "hover:border-[#BAE6FD]", arrow: "group-hover:text-[#0284C7]" },
  emerald: { icon: "bg-[#ECFDF5] text-[#059669]", hover: "hover:border-[#A7F3D0]", arrow: "group-hover:text-[#059669]", solid: "bg-[#059669]", link: "text-[#059669]" },
  amber:   { icon: "bg-[#FFFBEB] text-[#D97706]", hover: "hover:border-[#FDE68A]", arrow: "group-hover:text-[#D97706]", solid: "bg-[#F59E0B]", link: "text-[#D97706]" },
  violet:  { icon: "bg-[#F5F3FF] text-[#7C3AED]", hover: "hover:border-[#DDD6FE]", arrow: "group-hover:text-[#7C3AED]" },
};

const LIGHT_ROLE = {
  owner:   "bg-[#EDE9FE] text-[#6D28D9]",
  admin:   "bg-[#FFE4E6] text-[#BE123C]",
  manager: "bg-[#E0F2FE] text-[#0369A1]",
  trainer: "bg-[#DCFCE7] text-[#15803D]",
  auditor: "bg-[#FEF3C7] text-[#B45309]",
};

const PROCESS_STATUS = {
  pending:    { badge: "bg-[#FFFBEB] text-[#B45309]", dot: "bg-[#F59E0B]" },
  processing: { badge: "bg-[#F0F9FF] text-[#0369A1]", dot: "bg-[#0EA5E9] animate-pulse" },
  processed:  { badge: "bg-[#ECFDF5] text-[#047857]", dot: "bg-[#10B981]" },
  failed:     { badge: "bg-[#FFF1F2] text-[#BE123C]", dot: "bg-[#F43F5E]" },
};

// Compliance below this rate (or with non-compliant assignments) is flagged.
const COMPLIANCE_TARGET = 80;

const CARD = "rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_1px_3px_0_rgb(15_23_42/0.06)]";
const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2";

function greetingKey(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "morning";
  if (h < 19) return "afternoon";
  return "evening";
}

function Skeleton({ className = "" }) {
  return <span className={`block animate-pulse rounded bg-[#F1F5F9] ${className}`} />;
}

function DashboardHeader({ company, role, userName }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const name = company?.company_name || company?.name || t("enterprise.dashboard.yourCompany");
  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-sm font-medium text-[#4F46E5]">
          {t(`enterprise.dashboard.home.greeting.${greetingKey()}`, { name: userName })}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">{t("enterprise.dashboard.title")}</h1>
        <p className="mt-1 text-sm text-[#64748B]">{t("enterprise.dashboard.adminSubtitle")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex w-full items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm sm:w-auto shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]`}>
          <span className="grid h-5 w-5 place-items-center rounded bg-[#4F46E5] text-[10px] font-bold text-white">{name.charAt(0).toUpperCase()}</span>
          <span className="max-w-[160px] truncate font-medium text-[#0F172A]">{name}</span>
          {LIGHT_ROLE[role] && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${LIGHT_ROLE[role]}`}>{t(`enterprise.roles.${role}`)}</span>
          )}
          <span className="hidden items-center gap-1 text-xs text-[#059669] sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />{t("enterprise.dashboard.home.enterpriseActive")}
          </span>
        </span>
        <button type="button" onClick={() => navigate("/enterprise/settings")}
          className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 text-sm font-medium sm:h-10 sm:flex-none text-[#334155] shadow-[0_1px_2px_0_rgb(15_23_42/0.04)] transition-colors duration-150 hover:bg-[#F8FAFC] ${FOCUS}`}>
          <Cog6ToothIcon className="h-4 w-4" /> {t("enterprise.dashboard.settingsBtn")}
        </button>
        <button type="button" onClick={() => navigate("/enterprise/knowledge/new")}
          className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#4F46E5] px-4 text-sm font-semibold text-white sm:h-10 sm:flex-none shadow-[0_1px_2px_0_rgb(79_70_229/0.25)] transition-colors duration-150 hover:bg-[#4338CA] ${FOCUS}`}>
          <PlusIcon className="h-4 w-4" /> {t("enterprise.dashboard.newProcess")}
        </button>
      </div>
    </section>
  );
}

function StatCard({ icon: Icon, tone, value, label, sub, href, loading, className = "" }) {
  const navigate = useNavigate();
  const c = TONES[tone];
  return (
    <button type="button" onClick={() => navigate(href)}
      className={`group ${CARD} ${className} cursor-pointer p-4 text-left sm:p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${c.hover} ${FOCUS}`}>
      <div className="flex items-center justify-between">
        <span className={`grid h-9 w-9 place-items-center rounded-lg sm:h-10 sm:w-10 ${c.icon}`}><Icon className="h-5 w-5" /></span>
        <ArrowUpRightIcon className={`h-4 w-4 text-[#CBD5E1] transition-colors ${c.arrow}`} />
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-12 sm:mt-4 sm:h-9" /> : <p className="mt-3 text-2xl font-semibold tabular-nums text-[#0F172A] sm:mt-4 sm:text-3xl">{value}</p>}
      <p className="mt-1 truncate text-sm font-medium text-[#334155]">{label}</p>
      <p className="truncate text-xs text-[#64748B]">{sub}</p>
    </button>
  );
}

function ComplianceStatCard({ compliance, loading }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const total = compliance?.total ?? 0;
  const rate = compliance?.rate != null ? Number(compliance.rate) : null;
  const hasData = !loading && compliance && total > 0;
  const atRisk = hasData && ((compliance.non_compliant || 0) > 0 || rate < COMPLIANCE_TARGET);
  const pct = Math.max(0, Math.min(100, rate || 0));
  return (
    <button type="button" onClick={() => navigate("/enterprise/compliance/company")}
      className={`group col-span-2 rounded-xl border p-4 text-left sm:col-span-1 sm:p-5 shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_1px_3px_0_rgb(15_23_42/0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${FOCUS} ${atRisk ? "border-[#FECDD3] bg-[#FFF1F2]/40" : "border-[#E2E8F0] bg-white hover:border-[#A7F3D0]"}`}>
      <div className="flex items-center justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${atRisk ? "bg-[#FFE4E6] text-[#E11D48]" : "bg-[#ECFDF5] text-[#059669]"}`}>
          {atRisk ? <ShieldExclamationIcon className="h-5 w-5" /> : <ShieldCheckIcon className="h-5 w-5" />}
        </span>
        {atRisk && <span className="whitespace-nowrap rounded-full bg-[#FFE4E6] px-2 py-0.5 text-[11px] font-semibold text-[#BE123C]">{t("enterprise.dashboard.home.requiresAttention")}</span>}
        {hasData && !atRisk && <span className="whitespace-nowrap rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold text-[#15803D]">{t("enterprise.dashboard.home.onTrack")}</span>}
      </div>
      {loading ? <Skeleton className="mt-4 h-9 w-14" /> : <p className="mt-4 text-3xl font-semibold tabular-nums text-[#0F172A]">{rate != null ? `${rate}%` : "—"}</p>}
      <p className="mt-1 text-sm font-medium text-[#334155]">{t("enterprise.dashboard.nav.compliance")}</p>
      <div className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${atRisk ? "bg-[#FFE4E6]" : "bg-[#F1F5F9]"}`}
        role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("enterprise.dashboard.nav.compliance")}>
        <div className={`h-full rounded-full ${atRisk ? "bg-[#F43F5E]" : "bg-[#10B981]"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-[#64748B]">
        {loading ? "…" : t("enterprise.dashboard.home.compliantOf", { compliant: compliance?.compliant ?? 0, count: total })}
      </p>
    </button>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const actions = [
    { icon: BoltIcon, tone: "indigo", title: t("enterprise.dashboard.action1Title"), desc: t("enterprise.dashboard.action1Desc"), cta: t("enterprise.dashboard.action1Btn"), href: "/enterprise/knowledge/new" },
    { icon: UserPlusIcon, tone: "emerald", title: t("enterprise.dashboard.action2Title"), desc: t("enterprise.dashboard.action2Desc"), cta: t("enterprise.dashboard.action2Btn"), href: "/enterprise/learning/paths" },
    { icon: ShieldCheckIcon, tone: "amber", title: t("enterprise.dashboard.home.complianceActionTitle"), desc: t("enterprise.dashboard.home.complianceActionDesc"), cta: t("enterprise.dashboard.home.complianceActionBtn"), href: "/enterprise/compliance/programs" },
  ];
  return (
    <div className={CARD}>
      <div className="border-b border-[#F1F5F9] px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-[#0F172A]">{t("enterprise.dashboard.home.quickActions")}</h2>
        <p className="text-sm text-[#64748B]">{t("enterprise.dashboard.home.quickActionsSub")}</p>
      </div>
      <div className="grid grid-cols-1 divide-y divide-[#F1F5F9] md:grid-cols-3 md:divide-x md:divide-y-0">
        {actions.map(({ icon: Icon, tone, title, desc, cta, href }) => (
          <button key={href} type="button" onClick={() => navigate(href)}
            className={`group flex cursor-pointer gap-3 p-4 text-left transition-colors duration-150 hover:bg-[#F8FAFC] active:bg-[#F1F5F9] md:flex-col md:p-6 last:rounded-b-xl md:first:rounded-bl-xl md:last:rounded-bl-none md:last:rounded-br-xl ${FOCUS}`}>
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white ${TONES[tone].solid}`}><Icon className="h-5 w-5" /></span>
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:gap-3">
              <div>
                <p className="font-medium text-[#0F172A]">{title}</p>
                <p className="mt-1 text-sm text-[#64748B]">{desc}</p>
              </div>
              <span className={`mt-auto inline-flex items-center gap-1 text-sm font-medium ${TONES[tone].link}`}>
                {cta} <ArrowRightIcon className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecentProcesses({ processes, loading }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { processType } = useKnowledgeEnumLabels();
  const fmtDate = (v) => (v ? new Date(v).toLocaleDateString(language === "es" ? "es" : "en", { day: "2-digit", month: "short", year: "numeric" }) : "—");
  const head = "px-6 py-3 font-medium";
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between border-b border-[#F1F5F9] px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold text-[#0F172A]">{t("enterprise.dashboard.home.recentProcesses")}</h2>
        <button type="button" onClick={() => navigate("/enterprise/knowledge")}
          className={`cursor-pointer rounded text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] ${FOCUS}`}>
          {t("enterprise.dashboard.home.viewAll")}
        </button>
      </div>
      {!loading && processes.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F1F5F9] text-[#94A3B8]"><DocumentTextIcon className="h-6 w-6" /></span>
          <p className="mt-3 text-sm font-medium text-[#0F172A]">{t("enterprise.dashboard.home.noProcesses")}</p>
          <p className="mt-1 max-w-xs text-sm text-[#64748B]">{t("enterprise.dashboard.home.noProcessesHint")}</p>
          <button type="button" onClick={() => navigate("/enterprise/knowledge/new")}
            className={`mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-[#4F46E5] px-4 text-sm font-semibold text-white hover:bg-[#4338CA] ${FOCUS}`}>
            <PlusIcon className="h-4 w-4" /> {t("enterprise.dashboard.getStarted.cta")}
          </button>
        </div>
      ) : (
        <>
        {/* Mobile: list of cards (the table below is for md and up) */}
        <ul className="divide-y divide-[#F1F5F9] md:hidden">
          {loading
            ? [0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3.5"><Skeleton className="h-9 w-9" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></li>
            ))
            : processes.map((p) => {
              const st = PROCESS_STATUS[p.status];
              return (
                <li key={p.id}>
                  <button type="button" onClick={() => navigate(`/enterprise/knowledge/${p.id}`)}
                    className={`flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left active:bg-[#F8FAFC] ${FOCUS}`}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[#EEF2FF] text-[#4F46E5]"><DocumentTextIcon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#0F172A]">{p.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-[#64748B]">{processType(p.process_type) || "—"} · {fmtDate(p.updated_at || p.created_at)}</span>
                    </span>
                    {st && (
                      <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{t(`enterprise.dashboard.home.status.${p.status}`)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase tracking-wide text-[#64748B]">
              <tr>
                <th scope="col" className={head}>{t("enterprise.dashboard.home.colProcess")}</th>
                <th scope="col" className={head}>{t("enterprise.dashboard.home.colSource")}</th>
                <th scope="col" className={head}>{t("enterprise.dashboard.home.colStatus")}</th>
                <th scope="col" className={head}>{t("enterprise.dashboard.home.colUpdated")}</th>
                <th scope="col" className="px-6 py-3"><span className="sr-only">{t("enterprise.dashboard.home.open")}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {loading
                ? [0, 1, 2].map((i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td />
                  </tr>
                ))
                : processes.map((p) => {
                  const st = PROCESS_STATUS[p.status];
                  return (
                    <tr key={p.id} onClick={() => navigate(`/enterprise/knowledge/${p.id}`)} className="cursor-pointer transition-colors duration-150 hover:bg-[#F8FAFC]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[#EEF2FF] text-[#4F46E5]"><DocumentTextIcon className="h-4 w-4" /></span>
                          <span className="max-w-[260px] truncate font-medium text-[#0F172A]" title={p.title}>{p.title}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[#64748B]">{processType(p.process_type) || "—"}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {st ? (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{t(`enterprise.dashboard.home.status.${p.status}`)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-[#64748B]">{fmtDate(p.updated_at || p.created_at)}</td>
                      <td className="px-6 py-4 text-right">
                        <button type="button" aria-label={t("enterprise.dashboard.home.openProcess", { name: p.title })}
                          onClick={(e) => { e.stopPropagation(); navigate(`/enterprise/knowledge/${p.id}`); }}
                          className={`cursor-pointer rounded-md p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] ${FOCUS}`}>
                          <ChevronRightIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

function ComplianceStatus({ compliance, loading }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const total = compliance?.total ?? 0;
  const rate = compliance?.rate != null ? Number(compliance.rate) : 0;
  const pct = Math.max(0, Math.min(100, rate));
  const atRisk = total > 0 && ((compliance?.non_compliant || 0) > 0 || rate < COMPLIANCE_TARGET);
  const rows = [
    { dot: "bg-[#10B981]", label: t("enterprise.dashboard.home.compliant"), value: compliance?.compliant ?? 0 },
    { dot: "bg-[#F43F5E]", label: t("enterprise.dashboard.home.nonCompliant"), value: compliance?.non_compliant ?? 0 },
    { dot: "bg-[#94A3B8]", label: t("enterprise.dashboard.home.totalAssignments"), value: total },
  ];
  return (
    <div className={`${CARD} p-4 sm:p-6`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#0F172A]">{t("enterprise.dashboard.home.complianceStatus")}</h2>
        <button type="button" onClick={() => navigate("/enterprise/compliance/company")}
          className={`cursor-pointer rounded text-sm font-medium text-[#4F46E5] hover:text-[#4338CA] ${FOCUS}`}>
          {t("enterprise.dashboard.home.details")}
        </button>
      </div>
      {loading ? (
        <div className="mt-6 flex items-center gap-6"><Skeleton className="h-28 w-28 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-4" /></div></div>
      ) : !compliance || total === 0 ? (
        <p className="mt-4 text-sm text-[#64748B]">{t("enterprise.dashboard.home.noComplianceData")}</p>
      ) : (
        <div className="mt-6 flex items-center gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F1F5F9" strokeWidth="3.2" />
              {pct > 0 && <circle cx="18" cy="18" r="15.9" fill="none" stroke={atRisk ? "#F43F5E" : "#10B981"} strokeWidth="3.2" strokeLinecap="round" strokeDasharray={`${pct} 100`} />}
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center">
              <div><p className="text-2xl font-semibold text-[#0F172A]">{rate}%</p><p className="text-[11px] text-[#64748B]">{t("enterprise.dashboard.home.compliantShort")}</p></div>
            </div>
          </div>
          <dl className="flex-1 space-y-3 text-sm">
            {rows.map(({ dot, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                <dt className="text-[#64748B]">{label}</dt>
                <dd className="ml-auto pl-4 font-semibold tabular-nums text-[#0F172A]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function SetupChecklist({ metrics, loading }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const has = (v) => typeof v === "number" && v > 0;
  const steps = [
    { key: "process",       done: has(metrics.processes),                    href: "/enterprise/knowledge/new" },
    { key: "path",          done: has(metrics.paths),                        href: "/enterprise/learning/paths" },
    { key: "assignment",    done: has(metrics.assignments),                  href: "/enterprise/learning/manage-assignments" },
    { key: "compliance",    done: has(metrics.compliance?.total),            href: "/enterprise/compliance/programs" },
    { key: "certification", done: has(metrics.certifications?.active),       href: "/enterprise/certifications/templates" },
  ];
  const done = steps.filter((s) => s.done).length;
  return (
    <div className={`${CARD} p-4 sm:p-6`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#0F172A]">{t("enterprise.dashboard.home.setupTitle")}</h2>
        <span className="text-sm font-medium tabular-nums text-[#64748B]">{loading ? "…" : `${done} / ${steps.length}`}</span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]" role="progressbar"
        aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length} aria-label={t("enterprise.dashboard.home.setupTitle")}>
        <div className="h-full rounded-full bg-[#4F46E5] transition-[width] duration-300" style={{ width: loading ? 0 : `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-5 space-y-3 text-sm">
        {steps.map(({ key, done: ok, href }) => (
          <li key={key} className="flex items-center gap-3">
            {ok
              ? <CheckCircleIcon className="h-5 w-5 shrink-0 text-[#10B981]" aria-hidden="true" />
              : <span className="h-5 w-5 shrink-0 rounded-full border-2 border-[#CBD5E1]" aria-hidden="true" />}
            {ok || loading
              ? <span className={ok ? "text-[#94A3B8] line-through" : "text-[#475569]"}>{t(`enterprise.dashboard.home.setup.${key}`)}</span>
              : (
                <button type="button" onClick={() => navigate(href)}
                  className={`cursor-pointer rounded text-left font-medium text-[#0F172A] hover:text-[#4F46E5] ${FOCUS}`}>
                  {t(`enterprise.dashboard.home.setup.${key}`)}
                </button>
              )}
            <span className="sr-only">{ok ? t("enterprise.dashboard.home.stepDone") : t("enterprise.dashboard.home.stepPending")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminDashboard({ activeCompany, role, metrics, loadingMetrics }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const userName = user?.first_name || user?.username || "";
  const fmt = (v) => (loadingMetrics ? "…" : v);
  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-5 sm:space-y-8 md:py-2">
      <DashboardHeader company={activeCompany} role={role} userName={userName} />

      <section aria-labelledby="kpi-title">
        <h2 id="kpi-title" className="sr-only">{t("enterprise.dashboard.metrics")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
          <StatCard icon={RectangleGroupIcon} tone="indigo" loading={loadingMetrics} value={fmt(metrics.processes)} label={t("enterprise.dashboard.processes")} sub={t("enterprise.dashboard.processesSub")} href="/enterprise/knowledge" />
          <StatCard icon={SparklesIcon} tone="sky" loading={loadingMetrics} value={fmt(metrics.learningModules)} label={t("enterprise.dashboard.learningModules")} sub={t("enterprise.dashboard.learningModulesSub")} href="/enterprise/knowledge" />
          <StatCard icon={MapIcon} tone="emerald" loading={loadingMetrics} value={fmt(metrics.paths)} label={t("enterprise.dashboard.nav.learningPaths")} sub={t("enterprise.dashboard.learningRoutes")} href="/enterprise/learning/paths" />
          <StatCard icon={UsersIcon} tone="amber" loading={loadingMetrics} value={fmt(metrics.assignments)} label={t("enterprise.dashboard.assignments")} sub={t("enterprise.dashboard.activeTrainings")} href="/enterprise/learning/manage-assignments" />
          <StatCard className="col-span-2 sm:col-span-1" icon={DocumentTextIcon} tone="violet" loading={loadingMetrics} value={fmt(metrics.sources)} label={t("enterprise.dashboard.sources")} sub={t("enterprise.dashboard.nav.knowledgeSources")} href="/enterprise/knowledge" />
          <ComplianceStatCard compliance={metrics.compliance} loading={loadingMetrics} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-5 sm:space-y-6 xl:col-span-2">
          <QuickActions />
          <RecentProcesses processes={metrics.recentProcesses || []} loading={loadingMetrics} />
        </div>
        <aside className="space-y-5 sm:space-y-6">
          <ComplianceStatus compliance={metrics.compliance} loading={loadingMetrics} />
          <SetupChecklist metrics={metrics} loading={loadingMetrics} />
        </aside>
      </section>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function EnterpriseDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { isEnterpriseMember, initialized, loading, isPlatformAdmin, activeCompany, role, loadError, refresh } = useEnterprise();
  const { data: metrics, loadingMetrics } = useMetrics(role !== "employee");

  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(99,102,241,0.3)", borderTopColor: "#6366F1" }} className="animate-spin" />
      </div>
    );
  }

  // F-07: could not load the companies (429/5xx/network) -> retry, never onboarding.
  if (loadError && !isEnterpriseMember) {
    return (
      <div role="alert" style={{ maxWidth: 420, margin: "80px auto", textAlign: "center", color: "var(--text-secondary)" }}>
        <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{t("enterprise.onboarding.loadErrorTitle")}</p>
        <p style={{ fontSize: 13, marginBottom: 16 }}>{t("enterprise.onboarding.loadErrorHint")}</p>
        <button onClick={() => refresh()} className="ank-btn-accent text-xs">{t("enterprise.onboarding.retry")}</button>
      </div>
    );
  }
  if (isPlatformAdmin && !isEnterpriseMember) return <Navigate to="/platform-admin/companies" replace />;
  if (!isEnterpriseMember) return <Navigate to="/enterprise/onboarding/company" replace />;

  if (role === "employee") {
    return <EmployeeDashboard activeCompany={activeCompany} role={role} />;
  }

  return <AdminDashboard activeCompany={activeCompany} role={role} metrics={metrics} loadingMetrics={loadingMetrics} />;
}

export default EnterpriseDashboard;
