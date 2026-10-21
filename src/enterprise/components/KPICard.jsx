import React from "react";
import { ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/solid";

const COLORS = {
  indigo: "#6366F1",
  blue: "#3B82F6",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#C084FC",
};

export function KPICard({ title, value, subtitle, trend, trendLabel, icon: Icon, color = "indigo", onClick, urgent }) {
  const accent = COLORS[color] || COLORS.indigo;

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12,
        padding: "18px 16px", cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.15s, background 0.15s, transform 0.15s",
      }}
      onMouseEnter={(e) => { if (onClick) { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.background = "var(--bg-elevated)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.transform = ""; }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {title}
        </span>
        {Icon && (
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accent}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon style={{ width: 15, height: 15, color: accent }} />
          </div>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: urgent ? "#f87171" : "var(--text-primary)" }}>
          {value ?? "—"}
        </span>
        {urgent && (
          <span style={{ marginBottom: 4, fontSize: 10, fontWeight: 700, color: "var(--lt-f87171, #f87171)", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", padding: "1px 8px", borderRadius: 20 }}>
            Urgent
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {trend !== undefined && trend !== null && (
          <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 700, color: trend >= 0 ? "#4ade80" : "#f87171" }}>
            {trend >= 0 ? <ArrowUpIcon style={{ width: 10, height: 10 }} /> : <ArrowDownIcon style={{ width: 10, height: 10 }} />}
            {Math.abs(trend)}%
          </span>
        )}
        {subtitle && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{subtitle}</span>}
        {trendLabel && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{trendLabel}</span>}
      </div>
    </div>
  );
}

export default KPICard;
