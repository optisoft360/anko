// HTTP 429 handling shared by the API clients: GETs retry up to MAX_RETRIES times, waiting what the
// server's Retry-After asks (capped), and the UI shows one discreet notice. A 429 never signs the
// user out — only a 401 does (see utils/authErrors.js).

export const MAX_RETRIES = 2;
const MAX_WAIT_MS = 15_000;
export const RATE_LIMIT_EVENT = "api:rate-limited";

/** Retry-After (seconds or HTTP date) → ms to wait; exponential backoff when absent. */
export function retryDelayMs(retryAfter, attempt = 0, now = Date.now()) {
  let ms = null;
  if (retryAfter != null && retryAfter !== "") {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) ms = secs * 1000;
    else {
      const at = Date.parse(retryAfter);
      if (!Number.isNaN(at)) ms = at - now;
    }
  }
  if (ms == null || ms < 0) ms = 1000 * 2 ** attempt;
  return Math.min(ms, MAX_WAIT_MS);
}

let lastNotice = 0;
export function notifyRateLimited() {
  const now = Date.now();
  if (now - lastNotice < 5000 || typeof window === "undefined") return;
  lastNotice = now;
  window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isGet = (method) => !method || String(method).toLowerCase() === "get";

/** Axios: must be installed before any interceptor that reshapes errors. */
export function installRateLimitRetry(instance) {
  instance.interceptors.response.use(undefined, async (error) => {
    const config = error?.config;
    if (error?.response?.status !== 429 || !config || !isGet(config.method)) throw error;
    const attempt = config.__rateLimitRetries || 0;
    if (attempt >= MAX_RETRIES) throw error;
    config.__rateLimitRetries = attempt + 1;
    notifyRateLimited();
    const header = error.response.headers?.["retry-after"] ?? error.response.headers?.get?.("retry-after");
    await sleep(retryDelayMs(header, attempt));
    return instance(config);
  });
  return instance;
}

/** fetch(): retries GETs answered with 429. `doFetch` performs one request and returns a Response. */
export async function fetchWithRateLimitRetry(doFetch, method) {
  let res = await doFetch();
  for (let attempt = 0; res.status === 429 && isGet(method) && attempt < MAX_RETRIES; attempt += 1) {
    notifyRateLimited();
    await sleep(retryDelayMs(res.headers.get("retry-after"), attempt));
    res = await doFetch();
  }
  return res;
}
