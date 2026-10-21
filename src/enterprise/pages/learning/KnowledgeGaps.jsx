import React, { useEffect, useState } from "react";
import { ExclamationTriangleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { learningApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton } from "../../components/LoadingSkeleton";

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

  const load = () => {
    setLoading(true);
    const params = {};
    if (severity) params.severity = severity;
    if (status) params.status = status;
    learningApi.getKnowledgeGaps(params).then((d) => setGaps(d.results || d || [])).catch(() => {}).finally(() => setLoading(false));
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
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={SELECT_STYLE}>
            <option value="">{t("enterprise.learning.knowledgeGaps.allSeverities")}</option>
            {["critical", "high", "medium", "low"].map((s) => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={SELECT_STYLE}>
            <option value="">{t("enterprise.learning.knowledgeGaps.allStatuses")}</option>
            {["open", "acknowledged", "resolved"].map((s) => <option key={s} value={s} style={{ textTransform: "capitalize" }}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} cols={5} /> : gaps.length === 0 ? (
        <EmptyState icon={ExclamationTriangleIcon} title={t("enterprise.learning.knowledgeGaps.empty")} message={t("enterprise.learning.knowledgeGaps.emptyMessage")} />
      ) : (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
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
                  <tr key={g.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px" }}><StatusBadge status={g.severity} /></td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>{g.topic}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontWeight: 700, color: scoreColor(g.retention_score) }}>
                        {g.retention_score}%
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-tertiary)", fontSize: 11 }}>{g.detected_at ? new Date(g.detected_at).toLocaleDateString(language === "es" ? "es" : "en-US") : "—"}</td>
                    <td style={{ padding: "12px 16px" }}><StatusBadge status={g.status} /></td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="flex gap-1.5">
                        {g.status === "open" && (
                          <button disabled={acting === g.id} onClick={() => act(g.id, "acknowledge")}
                            style={{ fontSize: 11, fontWeight: 700, color: "var(--lt-f59e0b, #f59e0b)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6, padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: acting === g.id ? 0.6 : 1 }}>
                            {acting === g.id ? <ArrowPathIcon className="animate-spin" style={{ width: 11, height: 11 }} /> : t("enterprise.learning.knowledgeGaps.acknowledge")}
                          </button>
                        )}
                        {g.status !== "resolved" && (
                          <button disabled={acting === g.id} onClick={() => act(g.id, "resolve")}
                            style={{ fontSize: 11, fontWeight: 700, color: "var(--lt-4ade80, #4ade80)", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 6, padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: acting === g.id ? 0.6 : 1 }}>
                            {acting === g.id ? <ArrowPathIcon className="animate-spin" style={{ width: 11, height: 11 }} /> : t("enterprise.learning.knowledgeGaps.resolve")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeGaps;
