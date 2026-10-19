import { formatDate } from "@/utils/calendarDate";
import { noWheel } from "@/utils/numberInput";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { XMarkIcon, CheckIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { complianceApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { DashboardSkeleton } from "../../components/LoadingSkeleton";

const INPUT = {
  width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#F1F5F9", outline: "none", boxSizing: "border-box",
};

// ─── Mark Complete Modal ─────────────────────────────────────────────────────

function CompleteAssignmentModal({ assignment, onClose, onDone }) {
  const { t, language } = useLanguage();
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { notes: notes.trim() };
      if (score !== "") payload.score = parseFloat(score);
      const updated = await complianceApi.completeAssignment(assignment.id, payload);
      onDone(updated);
      onClose();
    } catch (err) {
      setError(err?.detail || err?.score?.[0] || t("enterprise.compliance.myCompliance.completeModal.error"));
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "100%", maxWidth: 400, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }} className="space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{t("enterprise.compliance.myCompliance.completeModal.title", { name: assignment.program_name })}</p>
          <button type="button" onClick={onClose} style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }} aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 5 }} htmlFor="ca-score">{t("enterprise.compliance.assignments.completeModal.scoreLabel")}</label>
            <input id="ca-score" type="number" {...noWheel} min="0" max="100" style={INPUT} value={score} onChange={(e) => setScore(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 5 }} htmlFor="ca-notes">{t("enterprise.compliance.assignments.completeModal.notesLabel")}</label>
            <textarea id="ca-notes" rows={2} style={{ ...INPUT, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
            <button type="submit" disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? t("enterprise.compliance.assignments.completeModal.saving") : <><CheckIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.myCompliance.markComplete")}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function MyCompliance() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [summary, setSummary] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingTarget, setCompletingTarget] = useState(null);
  const [renewingId, setRenewingId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      complianceApi.myCompliance().catch(() => null),
      complianceApi.getAssignments().then((d) => d.results || d || []).catch(() => []),
    ]).then(([s, a]) => { setSummary(s); setAssignments(a); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRenew = async (id) => {
    setRenewingId(id);
    try { await complianceApi.renewAssignment(id); load(); }
    finally { setRenewingId(null); }
  };

  const handleCompleted = () => load();

  if (loading) return <DashboardSkeleton />;
  if (!summary) return <EmptyState title={t("enterprise.compliance.myCompliance.noData")} />;

  const summaryCards = [
    { label: t("enterprise.compliance.myCompliance.summary.totalPrograms"), value: summary.total_programs, color: "var(--text-primary)" },
    { label: t("enterprise.compliance.myCompliance.summary.compliant"), value: summary.compliant, color: "#4ade80" },
    { label: t("enterprise.compliance.myCompliance.summary.nonCompliant"), value: summary.non_compliant, color: "#f87171" },
    { label: t("enterprise.compliance.myCompliance.summary.pending"), value: summary.pending, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-5">
      <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.compliance.myCompliance.title")}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((s) => (
          <div key={s.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value ?? 0}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Compliance rate */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
        <div className="flex items-center justify-between mb-2.5">
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{t("enterprise.compliance.myCompliance.complianceRate")}</p>
          <span style={{ fontSize: 22, fontWeight: 800, color: "#818CF8" }}>{summary.compliance_rate ?? 0}%</span>
        </div>
        <div style={{ height: 8, background: "var(--bg-elevated)", borderRadius: 20, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${summary.compliance_rate ?? 0}%`, background: "#6366F1", borderRadius: 20, transition: "width 400ms" }} />
        </div>
      </div>

      {/* Assignments list */}
      <div className="space-y-3">
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("enterprise.compliance.myCompliance.myAssignments", { count: assignments.length })}
        </p>
        {assignments.map((a) => {
          const danger = a.status === "non_compliant";
          const warn = a.is_expiring_soon;
          const canComplete = ["pending", "in_progress"].includes(a.status);
          const isExpired = a.status === "expired";
          return (
            <div key={a.id}
              style={{ background: "var(--bg-surface)", border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : warn ? "rgba(245,158,11,0.3)" : "var(--border)"}`, borderRadius: 12, padding: 16 }}
              className="flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{a.program_name}</p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <StatusBadge status={a.status} />
                  {a.due_date && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t("enterprise.compliance.programDetail.due", { date: formatDate(a.due_date, language) })}</span>}
                  {a.expires_at && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t("enterprise.compliance.myCompliance.expires", { date: a.expires_at })}</span>}
                  {a.score !== null && a.score !== undefined && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>{t("enterprise.compliance.myCompliance.scorePct", { n: a.score })}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => navigate(`/enterprise/compliance/programs/${a.program}`)} className="ank-btn-ghost text-xs">
                  {t("enterprise.compliance.myCompliance.viewProgram")}
                </button>
                {canComplete && (
                  <button onClick={() => setCompletingTarget(a)} className="ank-btn-accent text-xs">
                    <CheckIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.myCompliance.markComplete")}
                  </button>
                )}
                {isExpired && (
                  <button onClick={() => handleRenew(a.id)} disabled={renewingId === a.id}
                    style={{ fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 6, cursor: "pointer", background: "#EF4444", color: "#fff", border: "none", opacity: renewingId === a.id ? 0.7 : 1, display: "flex", alignItems: "center", gap: 5 }}>
                    {renewingId === a.id ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : t("enterprise.compliance.assignments.renew")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {assignments.length === 0 && <EmptyState title={t("enterprise.compliance.myCompliance.empty")} />}
      </div>

      {completingTarget && (
        <CompleteAssignmentModal assignment={completingTarget} onClose={() => setCompletingTarget(null)} onDone={handleCompleted} />
      )}
    </div>
  );
}

export default MyCompliance;
