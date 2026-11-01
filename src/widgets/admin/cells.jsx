import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/context/language-context";
import { Badge, FOCUS } from "@/enterprise/components/ui/kit";
import { entityLabel, formatDate, formatMoney, toBool, truncate } from "./format";

const DASH = <span className="text-[#94A3B8]">—</span>;

/** Yes/No badge; never empty. */
export function BooleanBadge({ value, yes, no }) {
  const { t } = useLanguage();
  const on = toBool(value);
  return <Badge tone={on ? "emerald" : "slate"} dot>{on ? (yes || t("admin.cells.yes")) : (no || t("admin.cells.no"))}</Badge>;
}

/** Local date with the raw ISO value in the tooltip. */
export function DateCell({ value, withTime = true }) {
  const { language } = useLanguage();
  const text = formatDate(value, language, { withTime });
  // Tooltip: the full local date and time.
  return text ? <span className="whitespace-nowrap tabular-nums" title={formatDate(value, language, { withTime: true })}>{text}</span> : DASH;
}

export function MoneyCell({ cents, currency, period }) {
  const { language } = useLanguage();
  const text = formatMoney(cents, currency, period, language);
  return text ? <span className="whitespace-nowrap tabular-nums">{text}</span> : DASH;
}

/** Name from a `*_detail` object, "#id" fallback, optional link. */
export function EntityCell({ detail, id, to, sub }) {
  const label = entityLabel(detail, id ?? detail?.id);
  if (!label) return DASH;
  const body = (
    <span className="min-w-0">
      <span className="block truncate">{label}</span>
      {sub && <span className="block truncate text-xs text-[#64748B]">{sub}</span>}
    </span>
  );
  return to ? <Link to={to} className={`text-[#4338CA] hover:underline ${FOCUS}`}>{body}</Link> : body;
}

export function TruncatedText({ value, max = 80 }) {
  const s = value == null ? "" : String(value);
  if (!s) return DASH;
  return <span title={s.length > max ? s : undefined}>{truncate(s, max)}</span>;
}

/** Monospace id with a copy button. */
export function IdCell({ value }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  if (value == null || value === "") return DASH;
  const copy = async () => {
    try { await navigator.clipboard.writeText(String(value)); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* clipboard blocked */ }
  };
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs text-[#475569]">
      <span className="max-w-[140px] truncate" title={String(value)}>{String(value)}</span>
      <button type="button" onClick={copy} aria-label={t("admin.cells.copy")} title={t("admin.cells.copy")}
        className={`grid h-6 w-6 cursor-pointer place-items-center rounded text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] ${FOCUS}`}>
        {copied ? <CheckIcon className="h-3.5 w-3.5 text-[#059669]" /> : <ClipboardDocumentIcon className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

/** Status-like value as a badge with a tone map ({value: tone}). */
export function StatusBadge({ value, tones = {}, labels = {} }) {
  if (value == null || value === "") return DASH;
  return <Badge tone={tones[value] || "slate"} dot>{labels[value] || String(value)}</Badge>;
}

export { DASH };
