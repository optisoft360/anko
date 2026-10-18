// Shared E2E helpers: a logged-in enterprise owner and a scriptable fake API.
export const API = "http://api.test/api";

const ENTERPRISE_ROUTES = [
  "dashboard", "knowledge", "knowledge-graph", "paths", "manage-assignments", "assignments", "reviews", "gaps",
  "programs", "retention-me", "retention-team", "retention-company", "compliance-me", "compliance-programs",
  "compliance-team", "compliance-company", "certs-me", "certs-templates", "certs-company", "invitations", "settings",
].map((k) => `enterprise.ent-${k}`);

/**
 * Logs in a fake owner of company 1 and mocks every API call.
 * `routes` maps "METHOD /path-regex" to a handler `(request, url) => body | { status, body }`.
 * Returns the list of captured requests ({ method, path, query, body }).
 */
export async function setupApp(page, routes = {}) {
  const calls = [];
  await page.addInitScript(() => {
    localStorage.setItem("token", "e2e-token");
    localStorage.setItem("enterprise_company_id", "1");
  });
  const table = [
    ["GET", /\/auth\/me\/context\/$/, () => ({ has_company: true, companies: [{ company_id: 1, company_name: "QA Co", role: "owner" }] })],
    ["GET", /\/rbac\/me\/allowed-routes\/$/, () => ({ allowed_routes: ENTERPRISE_ROUTES, is_admin: true, roles: ["admin"] })],
    ["GET", /\/auth\/me\/$/, () => ({ id: 1, username: "qa", email: "qa@test.com", is_staff: true })],
    ...Object.entries(routes).map(([key, handler]) => {
      const [method, pattern] = key.split(" ");
      return [method, new RegExp(pattern), handler];
    }),
  ];
  await page.route("http://api.test/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, "");
    let body = null;
    try { body = req.postDataJSON(); } catch { body = req.postData(); }
    calls.push({ method: req.method(), path, query: Object.fromEntries(url.searchParams), body });
    const match = [...table].reverse().find(([m, re]) => m === req.method() && re.test(path));
    if (!match) {
      return route.fulfill({ status: 200, contentType: "application/json", body: req.method() === "GET" ? "[]" : "{}" });
    }
    const out = await match[2](req, url, body);
    const isWrapped = out && typeof out === "object" && "status" in out && "body" in out;
    return route.fulfill({
      status: isWrapped ? out.status : 200,
      contentType: "application/json",
      body: JSON.stringify(isWrapped ? out.body : out),
    });
  });
  return calls;
}
