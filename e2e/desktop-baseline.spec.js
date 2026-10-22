import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { withCompany } from "./fixtures/app-data";

// Desktop guard for the mobile-layout work: every screen touched by the mobile fixes
// must look exactly the same at 1440x900. Reference images were taken before the
// mobile changes (npx playwright test e2e/desktop-baseline.spec.js --update-snapshots).

test.use({ viewport: { width: 1440, height: 900 } });

const PAGES = [
  ["process-detail", "/enterprise/knowledge/1"],
  ["assignment", "/enterprise/learning/assignments/90"],
  ["manage-assignments", "/enterprise/learning/manage-assignments"],
  ["knowledge-graph", "/enterprise/knowledge/graph"],
  ["learning-path", "/enterprise/learning/paths/7"],
  ["processes", "/enterprise/knowledge"],
  ["compliance-programs", "/enterprise/compliance/programs"],
  ["cert-templates", "/enterprise/certifications/templates"],
  ["team-compliance", "/enterprise/compliance/team"],
  ["settings", "/enterprise/settings"],
  ["dashboard", "/enterprise/dashboard"],
  ["personal-home", "/dashboard/home"],
];

for (const [name, path] of PAGES) {
  test(`desktop unchanged: ${name}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-22T10:00:00"));
    await setupApp(page, withCompany);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    // The graph layout is randomized on every load: compare everything around it.
    const mask = name === "knowledge-graph" ? [page.getByTestId("knowledge-graph")] : [];
    await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.001, mask });
  });
}

test("desktop unchanged: home without company", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-22T10:00:00"));
  await setupApp(page, {
    "GET /auth/me/context/$": () => ({ has_company: false, companies: [] }),
    "GET /rbac/me/allowed-routes/$": () => ({ allowed_routes: [], is_admin: false, roles: ["client"] }),
    "GET /auth/me/$": () => ({ id: 2, username: "new.user", first_name: "Nuevo", email: "new@test.com", is_staff: false }),
    "GET /enterprise/companies/$": () => [],
  });
  await page.addInitScript(() => localStorage.removeItem("enterprise_company_id"));
  await page.goto("/dashboard/home");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("home-no-company.png", { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.001 });
});
