import React, { useEffect, useState } from "react";
import { formatCalendarDate } from "@/utils/calendarDate";
import { useNavigate } from "react-router-dom";
import {
  BookOpenIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon,
  PlayIcon, ArrowRightIcon, RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { learningApi } from "../../api/enterpriseApi";
import { withModuleNames } from "./assignmentNames";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";

function useStatusMap() {
  const { t } = useLanguage();
  return {
    pending:     { bg: "rgba(255,255,255,0.07)", text: "#8B8B9C", label: t("enterprise.learning.myAssignments.status.pending"),    Icon: ClockIcon },
    in_progress: { bg: "rgba(94,106,210,0.15)",  text: "#8B9CF4", label: t("enterprise.learning.myAssignments.status.inProgress"), Icon: PlayIcon },
    completed:   { bg: "rgba(74,222,128,0.12)",  text: "#4ade80", label: t("enterprise.learning.myAssignments.status.completed"), Icon: CheckCircleIcon },
    overdue:     { bg: "rgba(239,68,68,0.12)",   text: "#f87171", label: t("enterprise.learning.myAssignments.status.overdue"),   Icon: ExclamationCircleIcon },
  };
}

function ProgressBar({ value, overdue, done }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const color = overdue ? "#f87171" : done ? "#4ade80" : "var(--accent)";
  return (
    <div style={{ height: 3, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 400ms" }} />
    </div>
  );
}

function AssignmentCard({ assignment: a, onOpen, onViewCertificate, starting }) {
  const { t, language } = useLanguage();
  const STATUS = useStatusMap();
  const status = (a.is_overdue || a.status === "overdue") ? "overdue" : a.status;
  const s = STATUS[status] || STATUS.pending;
  const { Icon } = s;
  const pct = a.progress?.percent_required ?? a.progress?.percent_total ?? 0;
  const completedMods = a.progress?.completed_modules ?? 0;
  const totalMods = a.progress?.total_modules ?? 0;
  const dueStr = formatCalendarDate(a.due_date, language);
  const isDone = a.status === "completed";
  const isOverdue = status === "overdue";

  return (
    <div
      onClick={() => !starting && onOpen(a)}
      style={{
        background: "var(--bg-surface)", border: `1px solid ${isOverdue ? "rgba(239,68,68,0.3)" : "var(--border)"}`,
        borderRadius: 8, padding: "16px 18px", cursor: starting ? "wait" : "pointer",
        transition: "border-color 150ms, background 150ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.borderColor = isOverdue ? "rgba(239,68,68,0.5)" : "var(--accent)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.borderColor = isOverdue ? "rgba(239,68,68,0.3)" : "var(--border)"; }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div style={{ background: isDone ? "rgba(74,222,128,0.12)" : "var(--accent-muted)", borderRadius: 7, padding: 8, flexShrink: 0, marginTop: 1 }}>
            <RectangleStackIcon style={{ width: 14, height: 14, color: isDone ? "var(--lt-4ade80, #4ade80)" : "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
              {a.learning_path_name || a.learning_module_name || a.path_name || a.name || t("enterprise.learning.myAssignments.learningPath")}
            </p>
            {a.assigned_by_username && (
              <p style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 2 }}>{t("enterprise.learning.myAssignments.assignedBy", { name: a.assigned_by_username })}</p>
            )}
          </div>
        </div>
        <span style={{ background: s.bg, color: s.text, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <Icon style={{ width: 10, height: 10 }} /> {s.label}
        </span>
      </div>

      {/* Progress */}
      {totalMods > 0 && (
        <div className="space-y-1.5 mb-3">
          <div className="flex justify-between">
            <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.learning.myAssignments.processesCount", { completed: completedMods, total: totalMods })}</span>
            <span style={{ color: isDone ? "var(--lt-4ade80, #4ade80)" : "var(--accent)", fontSize: 11, fontWeight: 700 }}>{Math.round(pct)}%</span>
          </div>
          <ProgressBar value={pct} overdue={isOverdue} done={isDone} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        {dueStr ? (
          <p style={{ fontSize: 11, color: isOverdue ? "var(--lt-f87171, #f87171)" : "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
            <ClockIcon style={{ width: 11, height: 11 }} />
            {isOverdue ? t("enterprise.learning.myAssignments.overdueSince") : t("enterprise.learning.myAssignments.dueLabel")}{dueStr}
          </p>
        ) : <span />}
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: isDone ? "var(--lt-4ade80, #4ade80)" : "var(--accent)", fontSize: 12, fontWeight: 600 }}>
          {isDone && a.issued_certification_id ? (
            <button
              onClick={(e) => { e.stopPropagation(); onViewCertificate(a.issued_certification_id); }}
              style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--lt-4ade80, #4ade80)", fontSize: 12, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              {t("enterprise.learning.myAssignments.viewCertificate")} <ArrowRightIcon style={{ width: 12, height: 12 }} />
            </button>
          ) : isDone ? (
            <><CheckCircleIcon style={{ width: 13, height: 13 }} /> {t("enterprise.learning.myAssignments.status.completed")}</>
          ) : starting ? (
            <span style={{ color: "var(--text-tertiary)" }}>{t("enterprise.learning.myAssignments.loading")}</span>
          ) : (
            <>{a.status === "pending" ? t("enterprise.learning.myAssignments.start") : t("enterprise.learning.myAssignments.continue")} <ArrowRightIcon style={{ width: 12, height: 12 }} /></>
          )}
        </div>
      </div>
    </div>
  );
}

export function MyAssignments() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { activeCompanyId } = useEnterprise();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    learningApi.getMyAssignments()
      .then(async (d) => {
        const list = d.results || d || [];
        setAssignments(list);
        setAssignments(await withModuleNames(list));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCompanyId]);

  const handleOpen = async (assignment) => {
    if (assignment.status === "pending") {
      setStartingId(assignment.id);
      try { await learningApi.startAssignment(assignment.id); } catch {}
      setStartingId(null);
    }
    navigate(`/enterprise/learning/assignments/${assignment.id}`);
  };

  const overdue    = assignments.filter((a) => a.is_overdue || a.status === "overdue");
  const inProgress = assignments.filter((a) => a.status === "in_progress" && !a.is_overdue);
  const pending    = assignments.filter((a) => a.status === "pending" && !a.is_overdue);
  const completed  = assignments.filter((a) => a.status === "completed");

  const groups = [
    { label: t("enterprise.learning.myAssignments.groups.overdue"),    color: "var(--lt-f87171, #f87171)", items: overdue },
    { label: t("enterprise.learning.myAssignments.groups.inProgress"), color: "#8B9CF4", items: inProgress },
    { label: t("enterprise.learning.myAssignments.groups.pending"),    color: "#8B8B9C", items: pending },
    { label: t("enterprise.learning.myAssignments.groups.completed"), color: "var(--lt-4ade80, #4ade80)", items: completed },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ color: "var(--text-primary)" }} className="text-xl font-bold">{t("enterprise.learning.myAssignments.title")}</h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-0.5">
            {t("enterprise.learning.myAssignments.assignedCount", { count: assignments.length, plural: assignments.length !== 1 ? "s" : "" })}
          </p>
        </div>
        {completed.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--lt-4ade80, #4ade80)", fontSize: 12, fontWeight: 700 }}>
            <CheckCircleIcon style={{ width: 14, height: 14 }} /> {t("enterprise.learning.myAssignments.completedCount", { count: completed.length, plural: completed.length !== 1 ? "s" : "" })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 140, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }} className="animate-pulse" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "60px 24px", textAlign: "center" }}>
          <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: 14, display: "inline-flex", marginBottom: 12 }}>
            <BookOpenIcon style={{ width: 24, height: 24, color: "var(--text-tertiary)" }} />
          </div>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>{t("enterprise.learning.myAssignments.empty")}</p>
          <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 4 }}>{t("enterprise.learning.myAssignments.emptyMessage")}</p>
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map(({ label, color, items }) => (
            <div key={label}>
              <p style={{ color, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                {label} ({items.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    onOpen={handleOpen}
                    onViewCertificate={(certId) => navigate(`/enterprise/certifications/${certId}`)}
                    starting={startingId === a.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyAssignments;
