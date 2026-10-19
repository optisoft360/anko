import { formatDate } from "@/utils/calendarDate";
import { noWheel } from "@/utils/numberInput";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheckIcon, CheckIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { complianceApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton } from "../../components/LoadingSkeleton";

const INPUT = {
  width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#F1F5F9", outline: "none", boxSizing: "border-box",
};

function useStatusOptions() {
  const { t, language } = useLanguage();
  return [
    { value: "", label: t("enterprise.compliance.assignments.statusOptions.all") },
    { value: "pending", label: t("enterprise.compliance.assignments.statusOptions.pending") },
    { value: "in_progress", label: t("enterprise.compliance.assignments.statusOptions.inProgress") },
    { value: "completed", label: t("enterprise.compliance.assignments.statusOptions.completed") },
    { value: "non_compliant", label: t("enterprise.compliance.assignments.statusOptions.nonCompliant") },
    { value: "expired", label: t("enterprise.compliance.assignments.statusOptions.expired") },
    { value: "waived", label: t("enterprise.compliance.assignments.statusOptions.waived") },
  ];
}

// ─── Mark Compliant Modal ─────────────────────────────────────────────────────

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
      setError(err?.detail || err?.score?.[0] || t("enterprise.compliance.assignments.completeModal.error"));
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "100%", maxWidth: 400, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }} className="space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>
            {t("enterprise.compliance.assignments.completeModal.title", { name: assignment.user_username || assignment.team_name })}
          </p>
          <button type="button" onClick={onClose} style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }} aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{assignment.program_name}</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 5 }} htmlFor="ma-score">{t("enterprise.compliance.assignments.completeModal.scoreLabel")}</label>
            <input id="ma-score" type="number" {...noWheel} min="0" max="100" style={INPUT} value={score} onChange={(e) => setScore(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 5 }} htmlFor="ma-notes">{t("enterprise.compliance.assignments.completeModal.notesLabel")}</label>
            <textarea id="ma-notes" rows={2} style={{ ...INPUT, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
            <button type="submit" disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? t("enterprise.compliance.assignments.completeModal.saving") : <><CheckIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.assignments.markCompliant")}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function ComplianceAssignments() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const STATUS_OPTIONS = useStatusOptions();
  const [assignments, setAssignments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [completingTarget, setCompletingTarget] = useState(null);
  const [renewingId, setRenewingId] = useState(null);

  const load = () => {
    setLoading(true);
    complianceApi.getAssignments().then((d) => setAssignments(d.results || d || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRenew = async (id) => {
    setRenewingId(id);
    try { await complianceApi.renewAssignment(id); load(); }
    finally { setRenewingId(null); }
  };

  // The backend doesn't support server-side status filtering on this
  // endpoint — filtered client-side against the real STATUS_CHOICES values.
  const filtered = statusFilter ? assignments.filter((a) => a.status === statusFilter) : assignments;

  const columns = [
    t("enterprise.compliance.assignments.columns.assignee"),
    t("enterprise.compliance.assignments.columns.program"),
    t("enterprise.compliance.assignments.columns.status"),
    t("enterprise.compliance.assignments.columns.dueDate"),
    t("enterprise.compliance.assignments.columns.completed"),
    t("enterprise.compliance.assignments.columns.actions"),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.compliance.assignments.title")}</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ fontSize: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text-secondary)", outline: "none", cursor: "pointer" }}>
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? <TableSkeleton rows={6} cols={6} /> : filtered.length === 0 ? (
        <EmptyState icon={ShieldCheckIcon} title={t("enterprise.compliance.assignments.empty.title")} message={t("enterprise.compliance.assignments.empty.message")} />
      ) : (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ fontSize: 13, borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  {columns.map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const canComplete = ["pending", "in_progress", "non_compliant"].includes(a.status);
                  const isExpired = a.status === "expired";
                  return (
                    <tr key={a.id} style={{ borderBottom: "1px solid var(--border)", background: a.status === "non_compliant" ? "rgba(239,68,68,0.04)" : "transparent" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>{a.user_username || a.team_name || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                        <button onClick={() => navigate(`/enterprise/compliance/programs/${a.program}`)}
                          style={{ color: "#818CF8", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13 }}>
                          {a.program_name}
                        </button>
                      </td>
                      <td style={{ padding: "12px 16px" }}><StatusBadge status={a.status} /></td>
                      <td style={{ padding: "12px 16px", color: "var(--text-tertiary)", fontSize: 12 }}>{formatDate(a.due_date, language) || "—"}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-tertiary)", fontSize: 12 }}>{a.completed_at ? formatDate(a.completed_at, language) : "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex gap-1 flex-wrap">
                          {canComplete && (
                            <button onClick={() => setCompletingTarget(a)}
                              style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
                              {t("enterprise.compliance.assignments.markCompliant")}
                            </button>
                          )}
                          {isExpired && (
                            <button onClick={() => handleRenew(a.id)} disabled={renewingId === a.id}
                              style={{ fontSize: 11, fontWeight: 700, color: "#818CF8", background: "none", border: "none", cursor: "pointer", padding: "4px 8px", opacity: renewingId === a.id ? 0.6 : 1, display: "flex", alignItems: "center", gap: 4 }}>
                              {renewingId === a.id ? <ArrowPathIcon className="h-3 w-3 animate-spin" /> : t("enterprise.compliance.assignments.renew")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {completingTarget && (
        <CompleteAssignmentModal assignment={completingTarget} onClose={() => setCompletingTarget(null)} onDone={load} />
      )}
    </div>
  );
}

export default ComplianceAssignments;
