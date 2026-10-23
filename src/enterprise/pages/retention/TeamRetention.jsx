import React, { useEffect, useState } from "react";
import { retentionApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton } from "../../components/LoadingSkeleton";
import { TeamSelect, useTeamParam } from "../../components/TeamSelect";
import { apiErrorMessage } from "@/utils/apiError";

function scoreTone(s) {
  if (s >= 70) return "#4ade80";
  if (s >= 40) return "#f59e0b";
  return "#f87171";
}

export function TeamRetention() {
  const { t } = useLanguage();
  const K = "enterprise.retention.teamRetention.";
  const { teams, teamId, setTeamId, loading: teamsLoading, error: teamsError } = useTeamParam();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;
    let alive = true;
    setLoading(true); setError(null);
    retentionApi.teamRetention({ team_id: teamId })
      .then((d) => alive && setMembers(d.members || []))
      .catch((err) => { if (alive) { setMembers([]); setError(apiErrorMessage(err, t(`${K}loadError`))); } })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const pct = (v) => `${Math.round(Number(v ?? 0))}%`;

  const columns = [
    t("enterprise.retention.teamRetention.columns.name"),
    t("enterprise.retention.teamRetention.columns.retentionScore"),
    t("enterprise.retention.teamRetention.columns.riskScore"),
    t("enterprise.retention.teamRetention.columns.openGaps"),
    t("enterprise.retention.teamRetention.columns.lastAssessment"),
  ];

  return (
    <div className="space-y-5">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.retention.teamRetention.title")}</h1>
        {teams.length > 0 && <TeamSelect teams={teams} value={teamId} onChange={setTeamId} label={t(`${K}team`)} />}
      </div>

      {teamsLoading || loading ? <TableSkeleton rows={6} cols={5} /> : teamsError ? (
        <EmptyState title={apiErrorMessage(teamsError, t(`${K}loadError`))} />
      ) : teams.length === 0 ? (
        <EmptyState title={t(`${K}noTeams`)} />
      ) : error ? (
        <EmptyState title={error} />
      ) : members.length === 0 ? (
        <EmptyState title={t(`${K}noMembers`)} />
      ) : (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div className="ank-table-scroll ank-sticky-first" style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ fontSize: 13, borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  {columns.map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const tone = scoreTone(Number(m.retention_score ?? 0));
                  return (
                    <tr key={m.user_id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {m.name}
                        {Number(m.risk_score ?? 0) > 60 && (
                          <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: "var(--lt-f87171, #f87171)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", padding: "1px 8px", borderRadius: 20 }}>{t("enterprise.retention.teamRetention.atRisk")}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: `${tone}22`, color: tone }}>{pct(m.retention_score)}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{pct(m.risk_score)}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{m.open_gaps ?? 0}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-tertiary)", fontSize: 11 }}>{m.last_assessment ? new Date(m.last_assessment).toLocaleDateString() : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamRetention;
