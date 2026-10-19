/**
 * C3 / F-07: only a real authentication failure ends the session.
 * DRF answers 401 for a missing, invalid or expired token; anything else (403 for a
 * permission, 429 throttling, 5xx, network errors) must keep the user signed in.
 */
const AUTH_CODES = new Set(["not_authenticated", "authentication_failed", "token_not_valid", "token_expired"]);

export function isAuthFailure(err) {
  const status = err?.response?.status ?? err?.status;
  if (status !== 401) return false;
  const data = err?.response?.data ?? err?.data;
  if (!data || typeof data !== "object") return true;
  if (AUTH_CODES.has(data.code)) return true;
  const detail = String(data.detail || "");
  return detail === "" || /token|credential|authenticat|expired/i.test(detail);
}
