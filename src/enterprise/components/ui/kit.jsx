import React, { useEffect, useRef, useState } from "react";
import { EllipsisHorizontalIcon, XMarkIcon } from "@heroicons/react/24/outline";

// Visual kit of the redesigned enterprise screens (palette C, same language as the
// enterprise dashboard). Material Tailwind replaces Tailwind's color scales, so the
// colors are hex classes; every class string is a literal for the JIT.

export const CARD = "rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_1px_3px_0_rgb(15_23_42/0.06)]";
export const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2";

export const TONE = {
  indigo:  { soft: "bg-[#EEF2FF] text-[#4338CA]", icon: "bg-[#EEF2FF] text-[#4F46E5]", dot: "bg-[#6366F1]", bar: "bg-[#6366F1]", ring: "#6366F1", border: "border-[#C7D2FE]", tint: "bg-[#EEF2FF]/60" },
  emerald: { soft: "bg-[#ECFDF5] text-[#047857]", icon: "bg-[#ECFDF5] text-[#059669]", dot: "bg-[#10B981]", bar: "bg-[#10B981]", ring: "#10B981", border: "border-[#A7F3D0]", tint: "bg-[#ECFDF5]/60" },
  amber:   { soft: "bg-[#FFFBEB] text-[#B45309]", icon: "bg-[#FFFBEB] text-[#D97706]", dot: "bg-[#F59E0B]", bar: "bg-[#F59E0B]", ring: "#F59E0B", border: "border-[#FDE68A]", tint: "bg-[#FFFBEB]/60" },
  rose:    { soft: "bg-[#FFF1F2] text-[#BE123C]", icon: "bg-[#FFF1F2] text-[#E11D48]", dot: "bg-[#F43F5E]", bar: "bg-[#F43F5E]", ring: "#F43F5E", border: "border-[#FECDD3]", tint: "bg-[#FFF1F2]/60" },
  sky:     { soft: "bg-[#F0F9FF] text-[#0369A1]", icon: "bg-[#F0F9FF] text-[#0284C7]", dot: "bg-[#0EA5E9]", bar: "bg-[#0EA5E9]", ring: "#0EA5E9", border: "border-[#BAE6FD]", tint: "bg-[#F0F9FF]/60" },
  violet:  { soft: "bg-[#F5F3FF] text-[#6D28D9]", icon: "bg-[#F5F3FF] text-[#7C3AED]", dot: "bg-[#8B5CF6]", bar: "bg-[#8B5CF6]", ring: "#8B5CF6", border: "border-[#DDD6FE]", tint: "bg-[#F5F3FF]/60" },
  slate:   { soft: "bg-[#F1F5F9] text-[#475569]", icon: "bg-[#F1F5F9] text-[#64748B]", dot: "bg-[#94A3B8]", bar: "bg-[#94A3B8]", ring: "#94A3B8", border: "border-[#E2E8F0]", tint: "bg-[#F8FAFC]" },
};

export const ROLE_TONE = { owner: "violet", admin: "rose", manager: "sky", trainer: "emerald", employee: "slate", auditor: "amber" };

export const BTN_PRIMARY = `inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#4F46E5] px-4 text-sm font-semibold text-white shadow-[0_1px_2px_0_rgb(79_70_229/0.25)] transition-colors duration-150 hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 ${FOCUS}`;
export const BTN_SECONDARY = `inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 text-sm font-medium text-[#334155] shadow-[0_1px_2px_0_rgb(15_23_42/0.04)] transition-colors duration-150 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 ${FOCUS}`;
export const BTN_DANGER_SOFT = `inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#FECDD3] bg-white px-3 text-sm font-medium text-[#BE123C] transition-colors duration-150 hover:bg-[#FFF1F2] disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 ${FOCUS}`;
export const BTN_SOFT = `inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-3 text-sm font-medium text-[#4338CA] transition-colors duration-150 hover:bg-[#E0E7FF] disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 ${FOCUS}`;

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </section>
  );
}

export function Card({ className = "", children }) {
  return <div className={`${CARD} ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions, icon: Icon, tone = "indigo" }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#F1F5F9] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE[tone].icon}`}><Icon className="h-4 w-4" /></span>}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
          {subtitle && <p className="text-sm text-[#64748B]">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Badge({ tone = "slate", dot = false, children, className = "" }) {
  const c = TONE[tone] || TONE.slate;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${c.soft} ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />}
      {children}
    </span>
  );
}

export function Avatar({ name, tone = "indigo", size = "md" }) {
  const s = size === "sm" ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-sm";
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-semibold ${s} ${TONE[tone].icon}`}>
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

/** Segmented tabs; scrolls sideways on narrow screens. */
export function Segmented({ items, value, onChange, ariaLabel }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label={ariaLabel} className="inline-flex min-w-max gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1 shadow-[0_1px_2px_0_rgb(15_23_42/0.04)]">
        {items.map((it) => {
          const active = it.value === value;
          return (
            <button key={it.value} type="button" role="tab" aria-selected={active} onClick={() => onChange(it.value)}
              className={`inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm transition-colors duration-150 ${FOCUS} ${
                active ? "bg-[#EEF2FF] font-semibold text-[#4338CA]" : "font-medium text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"}`}>
              {it.icon && <it.icon className="h-4 w-4" />}
              {it.label}
              {it.count != null && it.count > 0 && (
                <span className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${active ? "bg-[#C7D2FE] text-[#3730A3]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{it.count}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EmptyBlock({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icon && <span className="grid h-12 w-12 place-items-center rounded-full bg-[#F1F5F9] text-[#94A3B8]"><Icon className="h-6 w-6" /></span>}
      <p className="mt-3 text-sm font-medium text-[#0F172A]">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-[#64748B]">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className = "" }) {
  return <span className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#C7D2FE] border-t-[#4F46E5] ${className}`} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 3, height = "h-14" }) {
  return (
    <div className="space-y-2 p-4 sm:p-6">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className={`${height} animate-pulse rounded-lg bg-[#F1F5F9]`} />)}
    </div>
  );
}

// ─── Form fields ──────────────────────────────────────────────────────────────

const CONTROL = "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] shadow-[0_1px_2px_0_rgb(15_23_42/0.04)] placeholder:text-[#94A3B8] transition-colors focus:border-[#6366F1] focus:outline-none focus:ring-2 focus:ring-[#E0E7FF]";

export function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#334155]">{label}{required && <span className="text-[#E11D48]"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[#64748B]">{hint}</span>}
    </label>
  );
}

export function TextInput({ className = "", ...props }) {
  return <input {...props} className={`${CONTROL} h-11 ${className}`} />;
}

export function SelectInput({ className = "", children, ...props }) {
  return <select {...props} className={`${CONTROL} h-11 cursor-pointer pr-8 ${className}`}>{children}</select>;
}

export function TextArea({ className = "", ...props }) {
  return <textarea {...props} className={`${CONTROL} resize-y py-2.5 ${className}`} />;
}

// ─── Overlays ─────────────────────────────────────────────────────────────────

/** Centered dialog on desktop, bottom sheet on phones. Above the sidebar and tab bar. */
export function Modal({ title, onClose, children, footer, width = "max-w-md" }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 !m-0 z-[10050] flex items-end justify-center bg-[#0F172A]/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.2)] sm:rounded-xl`}>
        <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] px-5 py-4">
          <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className={`grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] ${FOCUS}`}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-[#F1F5F9] bg-[#F8FAFC] px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function DotMenu({ items, label = "Actions" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={label} aria-expanded={open}
        className={`grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] sm:h-9 sm:w-9 ${FOCUS}`}>
        <EllipsisHorizontalIcon className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 min-w-[190px] overflow-hidden rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
          {items.map((item, i) => (
            <button key={i} type="button" onClick={() => { item.action(); setOpen(false); }}
              className={`flex w-full cursor-pointer items-center px-3.5 py-2.5 text-left text-sm transition-colors ${item.danger ? "text-[#BE123C] hover:bg-[#FFF1F2]" : "text-[#334155] hover:bg-[#F8FAFC]"}`}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ring gauge (0–100) drawn in SVG; the number sits in the middle, never over the arc labels. */
export function RingGauge({ value = 0, tone = "indigo", size = 112, stroke = 10, children }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        {v > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TONE[tone].ring} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} className="transition-[stroke-dasharray] duration-500" />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
