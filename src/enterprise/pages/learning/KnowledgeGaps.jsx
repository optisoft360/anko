import React, { useEffect, useRef, useState } from "react";
import { ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { learningApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton } from "../../components/LoadingSkeleton";
import { apiErrorMessage } from "@/utils/apiError";

const SELECT_STYLE = {
  fontSize: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)",
  borderRadius: 8, padding: "7px 10px", color: "var(--text-secondary)", outline: "none", cursor: "pointer",
};

export function KnowledgeGaps() {
  const { t, language } = useLanguage();
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [acting, setActing] = useState(null);
  const [error, setError] = useState(null);
  // Without finished Simulate attempts there is nothing to analyze yet (not "no gaps").
  const [analyzable, setAnalyzable] = useState(null);
  // Only the latest request may update the list (fast filter changes used to race).
  const requestId = useRef(0);

  const load = () => {
    const id = ++requestId.current;
    const current = () => id === requestId.current;
    setLoading(true);
    setError(null);
    setAnalyzable(null);
    const params = { page_size: 200 };
    if (severity) params.severity = severity;
    if (status) params.status = status;
    learningApi.getKnowledgeGaps(params)
      .then((d) => {
        if (!current()) return;
        const list = d.results || d || [];
        setGaps(list);
        if (!list.length && !severity && !status) {
          learningApi.getKnowledgeGapsSummary().then((sm) => { if (current()) setAnalyzable(sm.analyzable_attempts); }).catch(() => {});
        }
      })
      .catch((err) => { if (current()) setError(apiErrorMessage(err, t("enterprise.learning.knowledgeGaps.loadError"))); })
      .finally(() => { if (current()) setLoading(false); });
  };

  useEffect(() => { load(); }, [severity, status]);

  const act = async (id, action) => {
    setActing(id);
    try {
      await (action === "acknowledge" ? learningApi.acknowledgeGap(id) : learningApi.resolveGap(id));
      load();
    } finally { setActing(null); }
  };

  const scoreColor = (v) => (v < 40 ? "#f87171" : v < 70 ? "#f59e0b" : "#4ade80");
  // Gaps detected from Simulate carry the % correct; older ones only the retention score.
  const scoreOf = (g) => Number(g.correct_percent ?? g.retention_score_at_detection ?? g.retention_score ?? 0);
  const fmtScore = (g) => `${Math.round(scoreOf(g))}%`;
  const fmtDate = (g) => (g.detected_at ? new Date(g.detected_at).toLocaleDateString(language === "es" ? "es" : "en-US") : "—");
  const topicCell = (g) => (
    <>
      <span className="[overflow-wrap:anywhere]">{g.topic_name || g.battery_name || "—"}</span>
      {(g.user_username || g.team_name) && (
        <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", marginTop: 2 }}>
          {g.user_username || g.team_name}
          {g.questions_total > 0 && ` · ${t("enterprise.learning.knowledgeGaps.missed", { missed: g.questions_missed, total: g.questions_total })}`}
        </span>
      )}
    </>
  );

  const actionButtons = (g, mobile) => {
    const size = mobile ? "min-h-[44px] flex-1 justify-center" : "";
    return (
      <>
        {g.status === "open" && (
          <button disabled={acting === g.id} onClick={() => act(g.id, "acknowledge")} className={size}
            style={{ fontSize: 11, fontWeight: 700, color: "var(--lt-f59e0b, #f59e0b)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6, padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: acting === g.id ? 0.6 : 1 }}>
            {acting === g.id ? <ArrowPathIcon className="animate-spin" style={{ width: 11, height: 11 }} /> : t("enterprise.learning.knowledgeGaps.acknowledge")}
          </button>
        )}
        {g.status !== "resolved" && (
          <button disabled={acting === g.id} onClick={() => act(g.id, "resolve")} className={size}
            style={{ fontSize: 11, fontWeight: 700, color: "var(--lt-4ade80, #4ade80)", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 6, padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: acting === g.id ? 0.6 : 1 }}>
            {acting === g.id ? <ArrowPathIcon className="animate-spin" style={{ width: 11, height: 11 }} /> : t("enterprise.learning.knowledgeGaps.resolve")}
          </button>
        )}
      </>
    );
  };

  const columnHeaders = [
    t("enterprise.learning.knowledgeGaps.columns.severity"),
    t("enterprise.learning.knowledgeGaps.columns.topic"),
    t("enterprise.learning.knowledgeGaps.columns.retentionScore"),
    t("enterprise.learning.knowledgeGaps.columns.detected"),
    t("enterprise.learning.knowledgeGaps.columns.status"),
    t("enterprise.learning.knowledgeGaps.columns.actions"),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.learning.knowledgeGaps.title")}</h1>
        <div className="flex gap-2 flex-wrap">
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={SELECT_STYLE} className="min-h-[44px] md:min-h-0" aria-label={t("enterprise.learning.knowledgeGaps.columns.severity")}>
            <option value="">{t("enterprise.learning.knowledgeGaps.allSeverities")}</option>
            {["critical", "high", "medium", "low"].map((s) => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={SELECT_STYLE} className="min-h-[44px] md:min-h-0" aria-label={t("enterprise.learning.knowledgeGaps.columns.status")}>
            <option value="">{t("enterprise.learning.knowledgeGaps.allStatuses")}</option>
            {["open", "acknowledged", "resolved"].map((s) => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
          </select>
        </div>
      </div>

      {error && !loading && (
        <div role="alert" style={{ padding: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, color: "var(--lt-f87171, #f87171)", fontSize: 13 }}>{error}</div>
      )}

      {loading ? <TableSkeleton rows={5} cols={5} /> : error ? null : gaps.length === 0 ? (
        analyzable === 0
          ? <EmptyState icon={ExclamationTriangleIcon} title={t("enterprise.learning.knowledgeGaps.notEnough")} message={t("enterprise.learning.knowledgeGaps.notEnoughMessage")} />
          : <EmptyState icon={ExclamationTriangleIcon} title={t("enterprise.learning.knowledgeGaps.empty")} message={t("enterprise.learning.knowledgeGaps.emptyMessage")} />
      ) : (
        <>
          {/* Phones: one card per gap. md and up: the table. */}
          <div className="space-y-2 md:hidden">
            {gaps.map((g) => (
              <div key={g.id} data-testid="gap-card" data-gap-id={g.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 14 }}>
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{topicCell(g)}</p>
                  <span className="shrink-0"><StatusBadge status={g.severity} /></span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  <span style={{ fontWeight: 700, color: scoreColor(scoreOf(g)) }}>{fmtScore(g)}</span>
                  <span>{fmtDate(g)}</span>
                  <StatusBadge status={g.status} />
                </div>
                {g.status !== "resolved" && <div className="mt-3 flex gap-2">{actionButtons(g, true)}</div>}
              </div>
            ))}
          </div>

          <div className="hidden md:block" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="w-full" style={{ fontSize: 13, borderCollapse: "collapse" }}>
                <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                  <tr>
                    {columnHeaders.map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gaps.map((g) => (
                    <tr key={g.id} data-testid="gap-row" data-gap-id={g.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px" }}><StatusBadge status={g.severity} /></td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>{topicCell(g)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontWeight: 700, color: scoreColor(scoreOf(g)) }}>{fmtScore(g)}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-tertiary)", fontSize: 11 }}>{fmtDate(g)}</td>
                      <td style={{ padding: "12px 16px" }}><StatusBadge status={g.status} /></td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex gap-1.5">{actionButtons(g, false)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default KnowledgeGaps;
