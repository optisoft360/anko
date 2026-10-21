import React from "react";

// Dark-theme tone tokens — consistent with the rest of Ankard's enterprise UI
// (indigo accent, green success, amber/orange warning, red danger, gray neutral).
const TONE = {
  green:  { bg: "rgba(74,222,128,0.12)",  text: "#4ade80", border: "rgba(74,222,128,0.25)" },
  amber:  { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
  orange: { bg: "rgba(251,146,60,0.12)",  text: "#fb923c", border: "rgba(251,146,60,0.25)" },
  red:    { bg: "rgba(239,68,68,0.12)",   text: "#f87171", border: "rgba(239,68,68,0.25)" },
  blue:   { bg: "rgba(99,102,241,0.12)",  text: "#818CF8", border: "rgba(99,102,241,0.25)" },
  gray:   { bg: "rgba(255,255,255,0.06)", text: "#8B8B9C", border: "var(--lt-rgba-255-255-255-0-09, rgba(255,255,255,0.09))" },
};

const COMPLIANCE_MAP = {
  compliant: { label: "Compliant", tone: "green" },
  non_compliant: { label: "Non-Compliant", tone: "red" },
  pending: { label: "Pending", tone: "amber" },
  expired: { label: "Expired", tone: "gray" },
};

const CERT_MAP = {
  active: { label: "Active", tone: "green" },
  expiring: { label: "Expiring Soon", tone: "amber" },
  expired: { label: "Expired", tone: "red" },
  revoked: { label: "Revoked", tone: "gray" },
};

const ASSIGNMENT_MAP = {
  pending: { label: "Pending", tone: "gray" },
  in_progress: { label: "In Progress", tone: "blue" },
  completed: { label: "Completed", tone: "green" },
  overdue: { label: "Overdue", tone: "red" },
};

const GAP_MAP = {
  critical: { label: "Critical", tone: "red" },
  high: { label: "High", tone: "orange" },
  medium: { label: "Medium", tone: "amber" },
  low: { label: "Low", tone: "gray" },
  open: { label: "Open", tone: "red" },
  acknowledged: { label: "Acknowledged", tone: "amber" },
  resolved: { label: "Resolved", tone: "green" },
};

const PROGRAM_MAP = {
  draft: { label: "Draft", tone: "gray" },
  active: { label: "Active", tone: "green" },
  archived: { label: "Archived", tone: "gray" },
};

const ALL_MAPS = { ...COMPLIANCE_MAP, ...CERT_MAP, ...ASSIGNMENT_MAP, ...GAP_MAP, ...PROGRAM_MAP };

export function StatusBadge({ status, size = "sm" }) {
  const key = (status || "").toLowerCase().replace(/ /g, "_");
  const config = ALL_MAPS[key] || { label: status || "—", tone: "gray" };
  const c = TONE[config.tone] || TONE.gray;
  const fontSize = size === "xs" ? 9 : 10;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: 20,
      fontSize, fontWeight: 700,
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
    }}>
      {config.label}
    </span>
  );
}

export default StatusBadge;
