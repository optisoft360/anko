import React, { useEffect, useState } from "react";
import { complianceApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton, KPICardSkeleton } from "../../components/LoadingSkeleton";
import { TeamSelect, useTeamParam } from "../../components/TeamSelect";
import { apiErrorMessage } from "@/utils/apiError";

export function TeamCompliance() {
  const { t } = useLanguage();
  const K = "enterprise.compliance.teamCompliance.";
  const { teams, teamId, setTeamId, loading: teamsLoading, error: teamsError } = useTeamParam();
  const [members, setMembers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) return;
    let alive = true;
    setLoading(true); setError(null);
    // One call: team-compliance returns the members and the summary totals.
    complianceApi.teamCompliance({ team_id: teamId })
      .then((d) => { if (alive) { setMembers(d.members || []); setSummary(d); } })
      .catch((err) => { if (alive) { setMembers([]); setSummary(null); setError(apiErrorMessage(err, t(`${K}loadError`))); } })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const rateOf = (m) => Math.round(Number(m.compliance_rate ?? 0));

  const rateColor = (r) => (r >= 80 ? "#4ade80" : r >= 60 ? "#f59e0b" : "#f87171");

  const summaryCards = summary ? [
    { label: t("enterprise.compliance.teamCompliance.summary.compliant"), value: summary.compliant ?? 0, color: "#4ade80" },
    { label: t("enterprise.compliance.teamCompliance.summary.nonCompliant"), value: summary.non_compliant ?? 0, color: "#f87171" },
    { label: t("enterprise.compliance.teamCompliance.summary.pending"), value: summary.pending ?? 0, color: "#f59e0b" },
    { label: t("enterprise.compliance.teamCompliance.summary.avgRate"), value: `${Math.round(Number(summary.avg_compliance_rate ?? 0))}%`, color: "#818CF8" },
  ] : [];

  const columns = [
    t("enterprise.compliance.teamCompliance.columns.member"),
    t("enterprise.compliance.teamCompliance.columns.complianceRate"),
    t("enterprise.compliance.teamCompliance.columns.compliant"),
    t("enterprise.compliance.teamCompliance.columns.nonCompliant"),
    t("enterprise.compliance.teamCompliance.columns.pending"),
    t("enterprise.compliance.teamCompliance.columns.status"),
  ];

  return (
    <div className="space-y-5">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.compliance.teamCompliance.title")}</h1>
        {teams.length > 0 && <TeamSelect teams={teams} value={teamId} onChange={setTeamId} label={t(`${K}team`)} />}
      </div>

      {teamsLoading || loading ? (
        <div className="grid grid-cols-3 gap-3"><KPICardSkeleton /><KPICardSkeleton /><KPICardSkeleton /></div>
      ) : summary && !error && members.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map((s) => (
            <div key={s.label} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {teamsLoading || loading ? <TableSkeleton rows={5} cols={5} /> : teamsError ? (
        <EmptyState title={apiErrorMessage(teamsError, t(`${K}loadError`))} />
      ) : teams.length === 0 ? (
        <EmptyState title={t(`${K}noTeams`)} />
      ) : error ? (
        <EmptyState title={error} />
      ) : members.length === 0 ? (
        <EmptyState title={t(`${K}noMembers`)} />
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
                {members.map((m) => {
                  const rate = rateOf(m);
                  const tone = rateColor(rate);
                  return (
                    <tr key={m.user_id} style={{ borderBottom: "1px solid var(--border)", background: rate < 60 ? "rgba(239,68,68,0.05)" : "transparent" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>{m.user_name}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex items-center gap-2">
                          <div style={{ flex: 1, background: "var(--bg-elevated)", borderRadius: 20, height: 5 }}>
                            <div style={{ height: 5, borderRadius: 20, background: tone, width: `${rate}%` }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)" }}>{rate}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#4ade80", fontWeight: 700 }}>{m.compliant ?? 0}</td>
                      <td style={{ padding: "12px 16px", color: "#f87171", fontWeight: 700 }}>{m.non_compliant ?? 0}</td>
                      <td style={{ padding: "12px 16px", color: "#f59e0b", fontWeight: 700 }}>{m.pending ?? 0}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <StatusBadge status={rate >= 80 ? "compliant" : rate >= 60 ? "pending" : "non_compliant"} />
                      </td>
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

export default TeamCompliance;
