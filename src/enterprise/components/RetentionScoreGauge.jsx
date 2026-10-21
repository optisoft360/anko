import React from "react";
import ReactApexChart from "react-apexcharts";

function scoreColor(score) {
  if (score >= 70) return "#4ade80";
  if (score >= 40) return "#f59e0b";
  return "#f87171";
}

function scoreLabel(score) {
  if (score >= 70) return "Good";
  if (score >= 40) return "Moderate";
  return "At Risk";
}

export function RetentionScoreGauge({ score = 0, label = "Retention Score", size = "md" }) {
  const color = scoreColor(score);
  const h = size === "sm" ? 120 : size === "lg" ? 220 : 160;

  const options = {
    chart: { type: "radialBar", sparkline: { enabled: true }, background: "transparent" },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: "60%" },
        track: { background: "rgba(255,255,255,0.07)", strokeWidth: "97%" },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: 8,
            fontSize: size === "lg" ? "28px" : "22px",
            fontWeight: 800,
            color: "var(--lt-f1f5f9, #F1F5F9)",
            formatter: (v) => `${Math.round(v)}`,
          },
        },
      },
    },
    fill: { colors: [color] },
    stroke: { lineCap: "round" },
  };

  return (
    <div className="flex flex-col items-center">
      <ReactApexChart options={options} series={[Math.min(100, Math.max(0, score))]} type="radialBar" height={h} />
      <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginTop: -16 }}>
        {label}
      </p>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, marginTop: 4, background: `${color}22`, color, border: `1px solid ${color}40` }}>
        {scoreLabel(score)}
      </span>
    </div>
  );
}

export default RetentionScoreGauge;
