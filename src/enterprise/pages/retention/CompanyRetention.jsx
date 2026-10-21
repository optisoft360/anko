import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { retentionApi, analyticsApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { KPICard } from "../../components/KPICard";
import { EmptyState } from "../../components/EmptyState";
import { DashboardSkeleton } from "../../components/LoadingSkeleton";

export function CompanyRetention() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([retentionApi.companyRetention(), analyticsApi.retentionTrends({ days: 90 })])
      .then(([d, trendData]) => { setData(d); setTrends(trendData.results || trendData || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const lineOptions = {
    chart: { type: "line", toolbar: { show: false }, fontFamily: "inherit", background: "transparent" },
    stroke: { curve: "smooth", width: [2, 2] },
    colors: ["#818CF8", "#f87171"],
    xaxis: { categories: trends.map((tr) => tr.date), labels: { style: { fontSize: "10px", colors: "#64748B" }, rotate: -30 } },
    yaxis: { min: 0, max: 100, labels: { formatter: (v) => `${v}%`, style: { colors: "#64748B" } } },
    legend: { position: "top", labels: { colors: "#94A3B8" } },
    dataLabels: { enabled: false },
    grid: { borderColor: "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" },
    tooltip: { theme: "dark", shared: true, y: { formatter: (v) => `${v}%` } },
  };

  return (
    <div className="space-y-5">
      <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.retention.companyRetention.title")}</h1>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard title={t("enterprise.retention.companyRetention.kpi.avgRetention")} value={`${data.avg_retention ?? 0}%`} color="indigo" />
          <KPICard title={t("enterprise.retention.companyRetention.kpi.avgRisk")} value={`${data.avg_risk ?? 0}%`} color="red" />
          <KPICard title={t("enterprise.retention.companyRetention.kpi.totalMembers")} value={data.total_members ?? 0} color="blue" />
          <KPICard title={t("enterprise.retention.companyRetention.kpi.openGaps")} value={data.open_gaps ?? 0} color="amber" />
        </div>
      )}

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>{t("enterprise.retention.companyRetention.trendTitle")}</p>
        {trends.length === 0 ? <EmptyState title={t("enterprise.retention.companyRetention.noTrendData")} /> : (
          <ReactApexChart
            options={lineOptions}
            series={[
              { name: t("enterprise.retention.companyRetention.kpi.avgRetention"), data: trends.map((tr) => tr.avg_retention ?? 0) },
              { name: t("enterprise.retention.companyRetention.series.avgRisk"), data: trends.map((tr) => tr.avg_risk ?? 0) },
            ]}
            type="line"
            height={260}
          />
        )}
      </div>
    </div>
  );
}

export default CompanyRetention;
