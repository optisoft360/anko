import React from "react";
import { Card, TONE } from "@/enterprise/components/ui/kit";

// Shared building blocks of the statistics dialog (enterprise kit palette).
// The analytics API serializes Decimals as strings, so every number goes through num().

export const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};
export const pct = (v) => Math.max(0, Math.min(100, Math.round(num(v))));

/** Tone for a "higher is better" percentage. */
export const goodTone = (v) => (pct(v) >= 70 ? "emerald" : pct(v) >= 40 ? "amber" : "rose");
/** Tone for a "lower is better" percentage (risk). */
export const riskTone = (v) => (pct(v) >= 60 ? "rose" : pct(v) >= 30 ? "amber" : "emerald");

export function Bar({ label, value, tone = "indigo", suffix = "%", max = 100 }) {
    const width = max ? Math.max(0, Math.min(100, (num(value) / max) * 100)) : 0;
    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-[#64748B]">{label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-[#334155]">{Math.round(num(value))}{suffix}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                <div className={`h-full rounded-full ${TONE[tone].bar} transition-[width] duration-500`} style={{ width: `${width}%` }} />
            </div>
        </div>
    );
}

/** Horizontal bar split into parts (e.g. completed / in progress / overdue), with a legend. */
export function StackedBar({ parts }) {
    const total = parts.reduce((a, p) => a + num(p.value), 0);
    return (
        <div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                {total > 0 && parts.map((p) => num(p.value) > 0 && (
                    <div key={p.label} className={`h-full ${TONE[p.tone].bar}`} style={{ width: `${(num(p.value) / total) * 100}%` }} title={`${p.label}: ${p.value}`} />
                ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {parts.map((p) => (
                    <li key={p.label} className="flex items-center gap-1.5 text-[#64748B]">
                        <span className={`h-2 w-2 rounded-full ${TONE[p.tone].dot}`} />
                        {p.label}
                        <span className="font-semibold tabular-nums text-[#334155]">{num(p.value)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function Kpi({ icon: Icon, tone = "indigo", label, value, hint, children }) {
    return (
        <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-[#64748B]">{label}</span>
                {Icon && <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${TONE[tone].icon}`}><Icon className="h-4 w-4" /></span>}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#0F172A]">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-[#64748B]">{hint}</p>}
            {children && <div className="mt-3">{children}</div>}
        </Card>
    );
}

export function KpiGrid({ children, cols = 4 }) {
    const c = cols === 3 ? "sm:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4";
    return <div className={`grid grid-cols-1 gap-3 ${c}`}>{children}</div>;
}

export function Section({ icon: Icon, title, aside, children }) {
    return (
        <section>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
                    {Icon && <Icon className="h-4 w-4 text-[#4F46E5]" />}
                    {title}
                </h3>
                {aside}
            </div>
            {children}
        </section>
    );
}

/** Small key/value row used inside panels. */
export function Stat({ label, value, tone }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-[#64748B]">
                {tone && <span className={`h-2 w-2 rounded-full ${TONE[tone].dot}`} />}
                {label}
            </span>
            <span className="font-semibold tabular-nums text-[#0F172A]">{value}</span>
        </div>
    );
}

/** Line chart of 0–100 values; draws nothing meaningful with fewer than two points. */
export function Sparkline({ points, tone = "indigo", height = 64 }) {
    const vals = points.map(num);
    if (vals.length < 2) return null;
    const w = 300;
    const step = w / (vals.length - 1);
    const y = (v) => height - 4 - (Math.max(0, Math.min(100, v)) / 100) * (height - 8);
    const d = vals.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return (
        <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="h-16 w-full" aria-hidden="true">
            <path d={`${d} L${w},${height} L0,${height} Z`} fill={TONE[tone].ring} opacity="0.08" />
            <path d={d} fill="none" stroke={TONE[tone].ring} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
    );
}
