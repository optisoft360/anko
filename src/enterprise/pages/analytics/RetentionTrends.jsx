import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { analyticsApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { EmptyState } from "../../components/EmptyState";

export function RetentionTrends() {
  const { t } = useLanguage();
  const [data, setData] = useState([]);
  const [days, setDays] = useState("90");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    analyticsApi.retentionTrends({ days }).then((d) => setData(d.results || d || [])).catch(() => {}).finally(() => setLoading(false));
  }, [days]);

  const options = {
    chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit", background: "transparent" },
    stroke: { curve: "smooth", width: [2, 2] },
    colors: ["#818CF8", "#f87171"],
    xaxis: { categories: data.map((d) => d.date), labels: { style: { fontSize: "10px", colors: "#64748B" }, rotate: -30 } },
    yaxis: { min: 0, max: 100, labels: { formatter: (v) => `${v}%`, style: { colors: "#64748B" } } },
    legend: { position: "top", labels: { colors: "#94A3B8" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" },
    tooltip: { theme: "dark", shared: true, y: { formatter: (v) => `${v}%` } },
  };

  const columns = [
    t("enterprise.analytics.retentionTrends.columns.date"),
    t("enterprise.analytics.retentionTrends.columns.avgRetention"),
    t("enterprise.analytics.retentionTrends.columns.avgRisk"),
    t("enterprise.analytics.retentionTrends.columns.snapshots"),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.analytics.retentionTrends.title")}</h1>
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
        ) : data.length === 0 ? <EmptyState title={t("enterprise.retention.companyRetention.noTrendData")} /> : (
          <ReactApexChart
            options={options}
            series={[
              { name: t("enterprise.retention.companyRetention.kpi.avgRetention"), data: data.map((d) => d.avg_retention ?? 0) },
              { name: t("enterprise.retention.companyRetention.series.avgRisk"), data: data.map((d) => d.avg_risk ?? 0) },
            ]}
            type="line" height={320}
          />
        )}
      </div>

      {data.length > 0 && (
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
                {data.slice(-10).reverse().map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 16px", color: "var(--text-tertiary)", fontSize: 11 }}>{row.date}</td>
                    <td style={{ padding: "10px 16px", fontWeight: 700, color: "var(--lt-818cf8, #818CF8)" }}>{row.avg_retention ?? 0}%</td>
                    <td style={{ padding: "10px 16px", fontWeight: 700, color: "var(--lt-f87171, #f87171)" }}>{row.avg_risk ?? 0}%</td>
                    <td style={{ padding: "10px 16px", color: "var(--text-secondary)" }}>{row.snapshot_count ?? 0}</td>
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

export default RetentionTrends;
