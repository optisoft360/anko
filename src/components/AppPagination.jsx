import React from "react";
import { useLanguage } from "@/context/language-context";

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total]);
  for (let i = Math.max(1, current - 2); i <= Math.min(total, current + 2); i++) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let prev = null;
  for (const p of sorted) {
    if (prev !== null && p - prev > 1) result.push("...");
    result.push(p);
    prev = p;
  }
  return result;
}

const pageBtn = (active, isDisabled) => ({
  width: 32, height: 32, borderRadius: 8, border: "none",
  background: active ? "linear-gradient(135deg, #6366F1, #818CF8)" : isDisabled ? "transparent" : "rgba(255,255,255,0.05)",
  color: active ? "#fff" : isDisabled ? "#334155" : "#94A3B8",
  fontSize: 13, fontWeight: 700, cursor: isDisabled ? "default" : "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.15s", flexShrink: 0,
  boxShadow: active ? "0 2px 12px rgba(99,102,241,0.4)" : "none",
  outline: "none",
});

export function AppPagination({ page, pageSize, totalCount, onPageChange, onPageSizeChange, disabled = false }) {
  const { language } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const pages = getPageNumbers(page, totalPages);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", width: "100%" }}>

      {/* Count info */}
      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B", whiteSpace: "nowrap" }}>
        {totalCount === 0
          ? (language === "es" ? "Sin resultados" : "No results")
          : (language === "es" ? `${from}–${to} de ${totalCount}` : `${from}–${to} of ${totalCount}`)}
      </span>

      {/* Page buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <button onClick={() => !disabled && page > 1 && onPageChange(page - 1)}
          disabled={disabled || page <= 1} style={pageBtn(false, disabled || page <= 1)}>
          ‹
        </button>

        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`el-${i}`} style={{ fontSize: 12, color: "var(--lt-334155, #334155)", padding: "0 2px" }}>…</span>
          ) : (
            <button key={p} onClick={() => !disabled && onPageChange(p)} disabled={disabled}
              style={pageBtn(p === page, false)}>
              {p}
            </button>
          )
        )}

        <button onClick={() => !disabled && page < totalPages && onPageChange(page + 1)}
          disabled={disabled || page >= totalPages} style={pageBtn(false, disabled || page >= totalPages)}>
          ›
        </button>
      </div>

      {/* Per page */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B", whiteSpace: "nowrap" }}>
          {language === "es" ? "Por página:" : "Per page:"}
        </span>
        <select value={pageSize} onChange={(e) => onPageSizeChange(e.target.value)} disabled={disabled}
          style={{ background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 600, color: "var(--lt-94a3b8, #94A3B8)", cursor: disabled ? "default" : "pointer", outline: "none", fontFamily: "inherit" }}>
          {[10, 25, 50, 100].map(v => <option key={v} value={v} style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>{v}</option>)}
        </select>
      </div>
    </div>
  );
}

export default AppPagination;
