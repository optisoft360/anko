import React, { useEffect, useState, useCallback } from "react";
import { formatCalendarDate } from "@/utils/calendarDate";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, RectangleStackIcon } from "@heroicons/react/24/outline";
import { learningApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { LearningPathAssignmentProgress } from "./LearningPathAssignmentProgress";
import { useMediaQuery, BELOW_SM_QUERY } from "@/hooks/useIsMobile";

export function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  // Single-process assignments carry no name; the process (module) name comes from the progress view.
  const [moduleName, setModuleName] = useState("");
  const isPhone = useMediaQuery(BELOW_SM_QUERY);

  const load = useCallback(async () => {
    setLoading(true);
    try { setAssignment(await learningApi.getAssignment(id)); }
    catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isDone = assignment?.status === "completed";
  const dueStr = formatCalendarDate(assignment?.due_date, language);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-7 h-7 border-2 rounded-full animate-spin" />
    </div>
  );

  if (!assignment) return (
    <div className="flex flex-col items-center py-24">
      <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>{t("enterprise.learning.assignmentDetail.notFound")}</p>
      <button onClick={() => navigate("/enterprise/learning/assignments")} className="ank-btn-ghost text-xs mt-4">
        <ArrowLeftIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.assignmentDetail.back")}
      </button>
    </div>
  );

  return (
    <div className="w-full space-y-5" data-testid="assignment-detail">
      {/* Back */}
      <button onClick={() => navigate("/enterprise/learning/assignments")}
        style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer" }}
        className="hover:opacity-70 transition-opacity min-h-[44px] -my-3 sm:min-h-0 sm:my-0">
        <ArrowLeftIcon style={{ width: 13, height: 13 }} /> {t("enterprise.learning.assignmentDetail.myAssignments")}
      </button>

      {/* Header */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "18px 22px" }}>
        <div className="flex items-start gap-3">
          <div style={{ background: isDone ? "rgba(74,222,128,0.12)" : "var(--accent-muted)", borderRadius: 8, padding: 10, flexShrink: 0 }}>
            <RectangleStackIcon style={{ width: 20, height: 20, color: isDone ? "var(--lt-4ade80, #4ade80)" : "var(--accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 17 }}>
              {assignment.learning_path_name || assignment.path_name || assignment.name || (isPhone && moduleName) || t("enterprise.learning.assignmentDetail.assignment")}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {isDone && (
                <span data-testid="assignment-completed-tag" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: "var(--lt-4ade80, #4ade80)", fontSize: 11, fontWeight: 700 }}>
                  <CheckCircleIcon style={{ width: 12, height: 12 }} /> {t("enterprise.learning.assignmentDetail.completedTag")}
                </span>
              )}
              {assignment.assigned_by_username && (
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.learning.assignmentDetail.by", { name: assignment.assigned_by_username })}</span>
              )}
              {dueStr && (
                <span style={{ color: "var(--text-tertiary)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                  <ClockIcon style={{ width: 10, height: 10 }} /> {t("enterprise.learning.assignmentDetail.due")}{dueStr}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Phones: room below the last actions so the Chat button can scroll clear of them */}
      <div className="pb-16 sm:pb-0">
        <LearningPathAssignmentProgress assignmentId={id} onAssignmentLoaded={setAssignment}
          onModuleLoaded={(mod) => setModuleName(mod.name || "")} mobileOptimized />
      </div>
    </div>
  );
}

export default AssignmentDetail;
