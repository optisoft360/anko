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
