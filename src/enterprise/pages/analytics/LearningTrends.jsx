import React, { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { AcademicCapIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon, CalendarDaysIcon, ChartBarIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { analyticsApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { Card, CardHeader, EmptyBlock, PageHeader, Segmented, Spinner, TONE } from "../../components/ui/kit";

const PERIODS = ["30", "60", "90", "180"];
const DAY = 86400000;

/** Monday (UTC) of the week that contains `d` — the same bucket as the backend's TruncWeek. */
function weekStart(d) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x;
}

/** Every week in the window, with 0 where the API has no row, so the timeline stays continuous. */
function fillWeeks(rows, days) {
  const byWeek = new Map(rows.filter((r) => r.week).map((r) => [r.week, Number(r.completions ?? r.count ?? 0)]));
  const now = new Date();
  const out = [];
  for (let w = weekStart(new Date(now.getTime() - Number(days) * DAY)); w <= now; w = new Date(w.getTime() + 7 * DAY)) {
    const key = w.toISOString().slice(0, 10);
    out.push({ week: key, completions: byWeek.get(key) || 0 });
  }
  return out;
}

function Stat({ icon: Icon, tone, label, value, hint }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[#64748B]">{label}</span>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE[tone].icon}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#0F172A]">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#64748B]">{hint}</p>}
    </Card>
  );
}

export function LearningTrends() {
  const { t, language } = useLanguage();
  const k = (key, params) => t(`enterprise.analytics.learningTrends.${key}`, params);
  const [rows, setRows] = useState([]);
  const [days, setDays] = useState("90");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    analyticsApi.learningTrends({ days })
      .then((d) => setRows(d.results || d || []))
      .catch(() => { setRows([]); setError(true); })
      .finally(() => setLoading(false));
  }, [days]);

  const locale = language === "es" ? "es-ES" : "en-US";
  const fmtWeek = (iso, opts = { day: "numeric", month: "short" }) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, { ...opts, timeZone: "UTC" });

  const weeks = useMemo(() => fillWeeks(rows, days), [rows, days]);
  const stats = useMemo(() => {
    const total = weeks.reduce((a, w) => a + w.completions, 0);
    const best = weeks.reduce((b, w) => (w.completions > (b?.completions ?? 0) ? w : b), null);
    const active = weeks.filter((w) => w.completions > 0).length;
    // Trend: second half of the window against the first half.
    const half = Math.floor(weeks.length / 2);
    const prev = weeks.slice(0, half).reduce((a, w) => a + w.completions, 0);
    const curr = weeks.slice(half).reduce((a, w) => a + w.completions, 0);
    const delta = prev ? Math.round(((curr - prev) / prev) * 100) : null;
    return { total, best, active, avg: weeks.length ? total / weeks.length : 0, prev, curr, delta };
  }, [weeks]);

  const options = {
    chart: { type: "bar", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit", background: "transparent", animations: { speed: 300 } },
    plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: weeks.length > 16 ? "70%" : "45%" } },
    colors: ["#6366F1"],
    states: { hover: { filter: { type: "darken", value: 0.85 } } },
    xaxis: {
      categories: weeks.map((w) => w.week),
      labels: { formatter: (v) => (v ? fmtWeek(v) : v), rotate: 0, hideOverlappingLabels: true, style: { fontSize: "11px", colors: "#64748B" } },
      axisBorder: { color: "#E2E8F0" },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: { min: 0, forceNiceScale: true, tickAmount: Math.min(4, Math.max(1, stats.best?.completions || 1)), labels: { formatter: (v) => Math.round(v), style: { fontSize: "11px", colors: "#94A3B8" } } },
    grid: { borderColor: "#F1F5F9", strokeDashArray: 4, padding: { left: 8, right: 8 } },
    dataLabels: { enabled: false },
    tooltip: {
      theme: "light",
      x: { formatter: (_, { dataPointIndex }) => k("weekOf", { date: fmtWeek(weeks[dataPointIndex]?.week, { day: "numeric", month: "long", year: "numeric" }) }) },
      y: { formatter: (v) => k("tooltipCompletions", { n: v }), title: { formatter: () => "" } },
    },
  };

  const trendTone = stats.delta == null ? "slate" : stats.delta >= 0 ? "emerald" : "rose";
  const trendValue = stats.delta == null ? "—" : `${stats.delta > 0 ? "+" : ""}${stats.delta}%`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6 md:py-2">
      <PageHeader title={k("title")} subtitle={k("subtitle")}
        actions={
          <Segmented ariaLabel={k("period")} value={days} onChange={setDays}
            items={PERIODS.map((d) => ({ value: d, label: t("enterprise.analytics.daysOption", { n: Number(d) }) }))} />
        } />

      {loading ? (
        <Card className="grid place-items-center py-24"><Spinner className="h-8 w-8" /></Card>
      ) : error ? (
        <Card><EmptyBlock icon={ChartBarIcon} title={k("loadError")} /></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={AcademicCapIcon} tone="indigo" label={k("stats.total")} value={stats.total}
              hint={k("stats.totalHint", { n: Number(days) })} />
            <Stat icon={CalendarDaysIcon} tone="sky" label={k("stats.avg")}
              value={stats.avg.toLocaleString(locale, { maximumFractionDigits: 1 })}
              hint={k("stats.activeWeeks", { a: stats.active, b: weeks.length })} />
            <Stat icon={TrophyIcon} tone="amber" label={k("stats.best")} value={stats.best ? stats.best.completions : 0}
              hint={stats.best ? k("weekOf", { date: fmtWeek(stats.best.week) }) : k("stats.noActivity")} />
            <Stat icon={stats.delta != null && stats.delta < 0 ? ArrowTrendingDownIcon : ArrowTrendingUpIcon} tone={trendTone}
              label={k("stats.trend")} value={trendValue}
              hint={k("stats.trendHint", { prev: stats.prev, curr: stats.curr })} />
          </div>

          <Card>
            <CardHeader icon={ChartBarIcon} title={k("chartTitle")} subtitle={k("chartHint")} />
            {stats.total === 0 ? (
              <EmptyBlock icon={ChartBarIcon} title={k("empty")} hint={k("emptyHint")} />
            ) : (
              <div className="px-2 pb-3 pt-4 sm:px-4">
                <ReactApexChart options={options} series={[{ name: k("seriesName"), data: weeks.map((w) => w.completions) }]} type="bar" height={320} />
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default LearningTrends;
