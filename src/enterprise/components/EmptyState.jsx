import React from "react";
import { InboxIcon } from "@heroicons/react/24/outline";

export function EmptyState({ icon: Icon = InboxIcon, title = "No data", message, action, onAction }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 20px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon style={{ width: 24, height: 24, color: "var(--lt-818cf8, #818CF8)" }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{title}</p>
      {message && (
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4, maxWidth: 360 }}>{message}</p>
      )}
      {action && onAction && (
        <button onClick={onAction} className="ank-btn-accent text-xs" style={{ marginTop: 16 }}>
          {action}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
