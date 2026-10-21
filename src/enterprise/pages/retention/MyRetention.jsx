import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { retentionApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { RetentionScoreGauge } from "../../components/RetentionScoreGauge";
import { EmptyState } from "../../components/EmptyState";
import { DashboardSkeleton } from "../../components/LoadingSkeleton";
import { useNavigate } from "react-router-dom";

export function MyRetention() {
  const { t } = useLanguage();
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

  if (loading) return <DashboardSkeleton />;
  if (!data) return <EmptyState title={t("enterprise.retention.myRetention.empty.title")} message={t("enterprise.retention.myRetention.empty.message")} />;

  const areaOptions = {
    chart: { type: "area", toolbar: { show: false }, fontFamily: "inherit", background: "transparent" },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    colors: ["#818CF8"],
    xaxis: { categories: snapshots.map((s) => s.created_at ? new Date(s.created_at).toLocaleDateString() : ""), labels: { style: { fontSize: "10px", colors: "#64748B" } } },
    yaxis: { min: 0, max: 100, labels: { formatter: (v) => `${v}%`, style: { colors: "#64748B" } } },
    dataLabels: { enabled: false },
    grid: { borderColor: "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" },
    tooltip: { theme: "dark", y: { formatter: (v) => `${v}%` } },
  };

  return (
    <div className="space-y-5">
      <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.retention.myRetention.title")}</h1>

      {/* Score gauges */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
        <div className="flex flex-wrap justify-around gap-8">
          <RetentionScoreGauge score={data.retention_score ?? 0} label={t("enterprise.retention.myRetention.gauges.retentionScore")} size="lg" />
          <RetentionScoreGauge score={100 - (data.risk_score ?? 0)} label={t("enterprise.retention.myRetention.gauges.lowRisk")} size="lg" />
          <RetentionScoreGauge score={data.confidence_score ?? 0} label={t("enterprise.retention.myRetention.gauges.confidence")} size="lg" />
        </div>
      </div>

      {/* Trend chart */}
      {snapshots.length > 0 && (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>{t("enterprise.retention.myRetention.trendTitle")}</p>
          <ReactApexChart
            options={areaOptions}
            series={[{ name: t("enterprise.retention.myRetention.gauges.retentionScore"), data: snapshots.map((s) => s.retention_score ?? 0) }]}
            type="area"
            height={200}
          />
        </div>
      )}

      {/* Open gaps */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 18 }} className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)" }}>{t("enterprise.retention.myRetention.openGaps")}</p>
          <div style={{ fontSize: 28, fontWeight: 800, color: (data.open_gaps ?? 0) > 0 ? "var(--lt-f87171, #f87171)" : "var(--lt-4ade80, #4ade80)" }}>
            {data.open_gaps ?? 0}
          </div>
        </div>
        <button onClick={() => navigate("/enterprise/learning/knowledge-gaps")} className="ank-btn-ghost text-xs">
          {t("enterprise.retention.myRetention.viewGaps")}
        </button>
      </div>
    </div>
  );
}

export default MyRetention;
