// Pure formatters shared by the admin tables (unit-tested in format.test.js).

const localeOf = (language) => (language === "es" ? "es-ES" : "en-US");

/** ISO date → local date (and time). Returns "" for empty/invalid input. */
export function formatDate(value, language, { withTime = true } = {}) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(localeOf(language), withTime
    ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short", year: "numeric" });
}

const PERIOD = {
  monthly: { es: "mes", en: "month" },
  month: { es: "mes", en: "month" },
  yearly: { es: "año", en: "year" },
  annual: { es: "año", en: "year" },
  year: { es: "año", en: "year" },
  weekly: { es: "semana", en: "week" },
};

/** 999 cents + "USD" + "monthly" → "$9.99 / month" (locale aware). Unknown currency falls back to the code. */
export function formatMoney(cents, currency = "USD", period, language) {
  if (cents == null || cents === "") return "";
  const amount = Number(cents) / 100;
  if (!Number.isFinite(amount)) return "";
  let text;
  try {
    text = new Intl.NumberFormat(localeOf(language), { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    text = `${amount.toFixed(2)} ${currency || ""}`.trim();
  }
  const p = period && PERIOD[String(period).toLowerCase()];
  return p ? `${text} / ${p[language === "es" ? "es" : "en"]}` : text;
}

/** Readable label of a `*_detail` object, or "#id" when only the id is known, or "" when nothing. */
export function entityLabel(detail, fallbackId) {
  if (detail && typeof detail === "object") {
    const name = detail.name || detail.title || detail.username || detail.email;
    if (name) return String(name);
    if (detail.id != null) return `#${detail.id}`;
  }
  if (fallbackId != null && fallbackId !== "") return `#${fallbackId}`;
  return "";
}

/** Strict boolean read: true/"true"/1 → true; everything else → false. */
export function toBool(v) {
  return v === true || v === 1 || v === "true" || v === "1";
}

/** Truncates to `max` chars on a word boundary when possible. */
export function truncate(text, max = 80) {
  const s = text == null ? "" : String(text);
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}…`;
}

/** List response → {rows, count}; accepts a plain array or DRF {count, results}. */
export function normalizeList(data) {
  if (Array.isArray(data)) return { rows: data, count: data.length };
  if (data && Array.isArray(data.results)) return { rows: data.results, count: data.count ?? data.results.length };
  return { rows: [], count: 0 };
}

/** 400 body {field: ["msg"]} → {field: "msg"}; non-field errors under "_". */
export function fieldErrors(body) {
  const out = {};
  if (!body || typeof body !== "object") return out;
  for (const [k, v] of Object.entries(body)) {
    const msg = Array.isArray(v) ? v.join(" ") : typeof v === "string" ? v : "";
    if (!msg) continue;
    out[k === "detail" || k === "non_field_errors" ? "_" : k] = msg;
  }
  return out;
}
