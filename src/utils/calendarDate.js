// Due dates are calendar days (YYYY-MM-DD). The API may return them as a date or as an
// end-of-day UTC timestamp; formatting them through `new Date(iso)` in the browser's
// timezone can shift them by one day, so only the date part is ever used.

/** Returns a local Date for the calendar day in `value`, or null. */
export function parseCalendarDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Formats a due date as e.g. "30 Oct 2026" without any timezone shift. */
export function formatCalendarDate(value, language = "en") {
  const date = parseCalendarDate(value);
  if (!date) return null;
  return date.toLocaleDateString(language === "es" ? "es" : "en-US", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * 13: the one date formatter for the app.
 * - "YYYY-MM-DD" (calendar dates: due/effective/expiry dates) is read as a local
 *   calendar day — never through `new Date("YYYY-MM-DD")`, which means UTC midnight
 *   and shows the previous day west of UTC.
 * - An ISO timestamp with a time (issued_at, created_at…) is shown in the user's timezone.
 * `timeZone` is only for tests / explicit overrides.
 */
export function formatDate(value, language = "en", { timeZone } = {}) {
  if (value === null || value === undefined || value === "") return null;
  const locale = language === "es" ? "es" : "en-US";
  const options = { day: "2-digit", month: "short", year: "numeric" };
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseCalendarDate(value).toLocaleDateString(locale, options);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(locale, timeZone ? { ...options, timeZone } : options);
}
