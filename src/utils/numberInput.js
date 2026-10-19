/**
 * 17: numeric form fields.
 * - `noWheel`: spread on <input type="number"> so scrolling the page never changes the value.
 * - `intInRange(value, min, max)`: null when value is a whole number in [min, max], else an error key.
 */
export const noWheel = { onWheel: (e) => e.currentTarget.blur() };

export function intInRange(value, min, max) {
  if (value === "" || value === null || value === undefined) return "required";
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return "integer";
  if (n < min || n > max) return "range";
  return null;
}

/** "1.2 KB", "0 B", "3.4 MB" — 1 KB file must not show as "0.0 MB". */
export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
