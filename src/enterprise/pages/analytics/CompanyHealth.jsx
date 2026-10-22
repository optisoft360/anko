import React, { useEffect, useState } from "react";
import { HeartIcon } from "@heroicons/react/24/outline";
import { analyticsApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { Card, CardHeader, Badge, EmptyBlock, Spinner, PageHeader, RingGauge, TONE } from "../../components/ui/kit";

// Same thresholds as before: >=90 excellent, >=70 good, >=50 needs attention, else at risk.
function tierOf(score) {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "needsAttention";
  return "atRisk";
}
const TIER_TONE = { excellent: "emerald", good: "indigo", needsAttention: "amber", atRisk: "rose" };

export function CompanyHealth() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi.companyHealth().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const k = (key) => t(`enterprise.analytics.companyHealth.${key}`);
  const score = Math.round(data?.health_score ?? 0);
  const tier = tierOf(data?.health_score ?? 0);
  const tone = TIER_TONE[tier];

  const components = [
    { key: "compliance", weight: 40, value: data?.compliance_rate ?? 0 },
    { key: "retention", weight: 30, value: data?.avg_retention ?? 0 },
    { key: "certifications", weight: 20, value: data?.cert_coverage ?? 0 },
    { key: "noCriticalGaps", weight: 10, value: data?.no_critical_gaps_score ?? 0 },
  ];
  const tiers = ["excellent", "good", "needsAttention", "atRisk"];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6 md:py-2">
      <PageHeader title={k("title")} subtitle={k("subtitle")} />

      {loading ? (
        <Card className="grid place-items-center py-20"><Spinner className="h-8 w-8" /></Card>
      ) : !data ? (
        <Card><EmptyBlock icon={HeartIcon} title={k("empty")} /></Card>
      ) : (
        <>
          <Card>
            <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-[auto,1fr] lg:gap-10">
              {/* Score */}
              <div className="flex flex-col items-center justify-center gap-3 lg:px-4">
                <RingGauge value={score} tone={tone} size={168} stroke={14}>
                  <div>
                    <p className="text-4xl font-semibold tabular-nums text-[#0F172A]">{score}</p>
                    <p className="text-xs font-medium text-[#64748B]">{k("healthScore")}</p>
                  </div>
                </RingGauge>
                <Badge tone={tone} dot>{k(`tierNames.${tier}`)}</Badge>
              </div>

              {/* Breakdown */}
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[#0F172A]">{k("breakdownTitle")}</h2>
                <p className="text-sm text-[#64748B]">{k("breakdownHint")}</p>
                <ul className="mt-5 space-y-4">
                  {components.map((c) => {
                    const pct = Math.max(0, Math.min(100, Number(c.value) || 0));
                    return (
                      <li key={c.key}>
                        <div className="flex items-center gap-3">
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#334155]">{k(`components.${c.key}`)}</span>
                          <span className="hidden rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-medium text-[#64748B] sm:inline">{t("enterprise.analytics.companyHealth.weight", { n: c.weight })}</span>
                          <span className="w-12 text-right text-sm font-semibold tabular-nums text-[#0F172A]">{Math.round(pct)}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F1F5F9]" role="progressbar"
                          aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={k(`components.${c.key}`)}>
                          <div className={`h-full rounded-full ${TONE[TIER_TONE[tierOf(pct)]].bar}`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-[#64748B] sm:hidden">{t("enterprise.analytics.companyHealth.weight", { n: c.weight })}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </Card>

          {/* Score scale */}
          <Card>
            <CardHeader title={k("scaleTitle")} subtitle={k("scaleHint")} />
            <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
              {tiers.map((name) => {
                const current = name === tier;
                const c = TONE[TIER_TONE[name]];
                return (
                  <li key={name} aria-current={current ? "true" : undefined}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${current ? `${c.border} ${c.tint}` : "border-[#E2E8F0] bg-white"}`}>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`} />
                      <span className={`truncate text-sm ${current ? "font-semibold text-[#0F172A]" : "text-[#475569]"}`}>{k(`tiers.${name}`)}</span>
                    </span>
                    {current && <Badge tone={TIER_TONE[name]}>{k("current")}</Badge>}
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

export default CompanyHealth;
