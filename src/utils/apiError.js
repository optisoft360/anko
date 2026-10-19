/**
 * Best human-readable message from an API error body (axios `err.response.data`
 * or the already-unwrapped data): `detail`, `non_field_errors`, then the first field error.
 */
export function apiErrorMessage(err, fallback) {
  const data = err?.response?.data ?? err;
  if (!data || typeof data !== "object") return typeof data === "string" && data ? data : fallback;
  if (typeof data.detail === "string" && data.detail) return data.detail;
  if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) return String(data.non_field_errors[0]);
  for (const value of Object.values(data)) {
    if (typeof value === "string" && value) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return fallback;
}

/**
 * 17: DRF validation body -> { fields: { name: "message" }, general: "message" | null }.
 * Accepts the axios error or the already-unwrapped body. `aliases` renames API
 * fields to form fields (e.g. { title: "name" }).
 */
export function mapApiErrors(err, aliases = {}) {
  const data = err?.response?.data ?? err;
  const fields = {};
  let general = null;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { fields, general: typeof data === "string" && data ? data : null };
  }
  const first = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(first).find(Boolean) || null;
    if (value && typeof value === "object") return Object.values(value).map(first).find(Boolean) || null;
    return null;
  };
  for (const [key, value] of Object.entries(data)) {
    const message = first(value);
    if (!message) continue;
    if (key === "detail" || key === "non_field_errors") general = general || message;
    else fields[aliases[key] || key] = message;
  }
  return { fields, general };
}
