import React from "react";
import ReactApexChart from "react-apexcharts";

function healthColor(score) {
  if (score >= 90) return "#4ade80";
  if (score >= 70) return "#818CF8";
  if (score >= 50) return "#f59e0b";
  return "#f87171";
}

function healthLabel(score) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs Attention";
  return "At Risk";
}

export function CompanyHealthScore({ score = 0, breakdown = {} }) {
  const color = healthColor(score);
  const components = [
    { label: "Compliance", weight: "40%", value: breakdown.compliance },
    { label: "Retention", weight: "30%", value: breakdown.retention },
    { label: "Certifications", weight: "20%", value: breakdown.certifications },
    { label: "No Critical Gaps", weight: "10%", value: breakdown.no_critical_gaps },
  ];

  const options = {
    chart: { type: "donut", sparkline: { enabled: false }, background: "transparent" },
    labels: components.map((c) => c.label),
    colors: [color, `${color}cc`, `${color}99`, `${color}66`],
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Health Score",
              fontSize: "12px",
              color: "var(--lt-8b8b9c, #8B8B9C)",
              formatter: () => `${Math.round(score)}`,
              fontWeight: 800,
            },
            value: {
              fontSize: "28px",
              fontWeight: 800,
              color: "var(--lt-f1f5f9, #F1F5F9)",
              formatter: () => `${Math.round(score)}`,
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { width: 0 },
    tooltip: {
      theme: "dark",
      y: { formatter: (v) => `${Math.round(v)}` },
    },
  };

  const series = [40, 30, 20, 10];

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="relative">
          <ReactApexChart options={options} series={series} type="donut" width={240} height={240} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)" }}>{Math.round(score)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color }}>{healthLabel(score)}</span>
          </div>
        </div>

        <div className="flex-1 space-y-3 w-full">
          <p style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 12 }}>Company Health</p>
          {components.map((c, i) => (
            <div key={c.label} className="flex items-center gap-3">
              <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: options.colors[i] }} />
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{c.weight} weight</span>
                </div>
                <div style={{ height: 5, background: "var(--bg-elevated)", borderRadius: 20, overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 20, width: `${c.value ?? 0}%`, background: options.colors[i] }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", width: 40, textAlign: "right" }}>{c.value ?? "—"}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CompanyHealthScore;
