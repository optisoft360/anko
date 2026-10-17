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
