import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { analyticsApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { EmptyState } from "../../components/EmptyState";

export function LearningTrends() {
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [days, setDays] = useState("90");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsApi.learningTrends({ days }).then((d) => setData(d.results || d || [])).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  const options = {
    chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit", background: "transparent" },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "60%" } },
    colors: ["#818CF8"],
    xaxis: { categories: data.map((d) => d.week || d.date), labels: { style: { fontSize: "11px", colors: "#64748B" } } },
    yaxis: { labels: { formatter: (v) => Math.round(v), style: { colors: "#64748B" } } },
    dataLabels: { enabled: false },
    grid: { borderColor: "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" },
    tooltip: { theme: "dark", y: { formatter: (v) => t("enterprise.analytics.learningTrends.tooltipCompletions", { n: v }) } },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.analytics.learningTrends.title")}</h1>
        <select value={days} onChange={(e) => setDays(e.target.value)}
          style={{ fontSize: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text-secondary)", outline: "none", cursor: "pointer" }}>
          {["30", "60", "90", "180"].map((d) => <option key={d} value={d}>{t("enterprise.analytics.daysOption", { n: d })}</option>)}
        </select>
      </div>

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
        {loading ? (
          <div style={{ height: 256 }} className="flex items-center justify-center">
            <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="animate-spin h-8 w-8 rounded-full border-2" />
          </div>
        ) : data.length === 0 ? <EmptyState title={t("enterprise.analytics.learningTrends.empty")} /> : (
          <ReactApexChart
            options={options}
            series={[{ name: t("enterprise.analytics.learningTrends.seriesName"), data: data.map((d) => d.count ?? d.completions ?? 0) }]}
            type="bar" height={300}
          />
        )}
      </div>
    </div>
  );
}

export default LearningTrends;
