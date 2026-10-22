import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { useNavigate } from "react-router-dom";
import { ArrowRightIcon, ChartBarIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import { retentionApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { EmptyState } from "../../components/EmptyState";
import { DashboardSkeleton } from "../../components/LoadingSkeleton";
import { BTN_SECONDARY, Badge, Card, CardHeader, PageHeader, RingGauge, TONE } from "../../components/ui/kit";

// Same thresholds as the retention gauge: >=70 good, >=40 moderate, else at risk.
function statusOf(score) {
  if (score >= 70) return { key: "good", tone: "emerald" };
  if (score >= 40) return { key: "moderate", tone: "amber" };
  return { key: "atRisk", tone: "rose" };
}

function MetricCard({ label, hint, value }) {
  const { t } = useLanguage();
  const v = Math.round(Math.max(0, Math.min(100, Number(value) || 0)));
  const s = statusOf(v);
  return (
    <Card className="flex items-center gap-4 p-4 sm:flex-col sm:gap-3 sm:p-6 sm:text-center">
      <RingGauge value={v} tone={s.tone} size={88} stroke={9}>
        <span className="text-xl font-semibold tabular-nums text-[#0F172A]">{v}</span>
      </RingGauge>
      <div className="min-w-0 flex-1 sm:flex-none">
        <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
        <p className="mt-0.5 text-xs text-[#64748B]">{hint}</p>
        <Badge tone={s.tone} dot className="mt-2">{t(`enterprise.retention.myRetention.status.${s.key}`)}</Badge>
      </div>
    </Card>
  );
}

export function MyRetention() {
  const { t, language } = useLanguage();
  const [data, setData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([retentionApi.myRetention(), retentionApi.snapshots()])
      .then(([r, s]) => { setData(r); setSnapshots(s.results || s || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const k = (key) => t(`enterprise.retention.myRetention.${key}`);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <EmptyState title={k("empty.title")} message={k("empty.message")} />;

  const areaOptions = {
    chart: { type: "area", toolbar: { show: false }, fontFamily: "inherit", background: "transparent", zoom: { enabled: false } },
    stroke: { curve: "smooth", width: 2.5 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.28, opacityTo: 0.02 } },
    colors: [TONE.indigo.ring],
    xaxis: {
      categories: snapshots.map((s) => s.created_at ? new Date(s.created_at).toLocaleDateString(language === "es" ? "es" : "en", { day: "2-digit", month: "short" }) : ""),
      labels: { style: { fontSize: "11px", colors: "#64748B" } }, axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { min: 0, max: 100, tickAmount: 4, labels: { formatter: (v) => `${Math.round(v)}%`, style: { colors: "#64748B" } } },
    dataLabels: { enabled: false },
    grid: { borderColor: "#F1F5F9", strokeDashArray: 4 },
    tooltip: { theme: "light", y: { formatter: (v) => `${v}%` } },
  };

  const gaps = data.open_gaps ?? 0;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6 md:py-2">
      <PageHeader title={k("title")} subtitle={k("subtitle")} />

      {/* Scores */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard label={k("gauges.retentionScore")} hint={k("hints.retentionScore")} value={data.retention_score ?? 0} />
        <MetricCard label={k("gauges.lowRisk")} hint={k("hints.lowRisk")} value={100 - (data.risk_score ?? 0)} />
        <MetricCard label={k("gauges.confidence")} hint={k("hints.confidence")} value={data.confidence_score ?? 0} />
      </section>

      {/* Trend */}
      {snapshots.length > 0 && (
        <Card>
          <CardHeader icon={ChartBarIcon} title={k("trendTitle")} />
          <div className="px-2 pb-3 pt-2 sm:px-4">
            <ReactApexChart
              options={areaOptions}
              series={[{ name: k("gauges.retentionScore"), data: snapshots.map((s) => s.retention_score ?? 0) }]}
              type="area"
              height={240}
            />
          </div>
        </Card>
      )}

      {/* Open gaps */}
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${gaps > 0 ? TONE.rose.icon : TONE.emerald.icon}`}>
            <LightBulbIcon className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-medium text-[#64748B]">{k("openGaps")}</p>
            <p className="text-3xl font-semibold tabular-nums text-[#0F172A]">{gaps}</p>
            <p className="text-xs text-[#64748B]">{gaps > 0 ? k("gapsHint") : k("noGapsHint")}</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate("/enterprise/learning/gaps")} className={`${BTN_SECONDARY} w-full sm:w-auto`}>
          {k("viewGaps")} <ArrowRightIcon className="h-4 w-4" />
        </button>
      </Card>
    </div>
  );
}

export default MyRetention;
