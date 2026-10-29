import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { withCompany } from "./fixtures/app-data";

const noCompany = {
  "GET /auth/me/context/$": () => ({ has_company: false, companies: [] }),
  "GET /rbac/me/allowed-routes/$": () => ({ allowed_routes: [], is_admin: false, roles: ["client"] }),
  "GET /auth/me/$": () => ({ id: 2, username: "new.user", first_name: "Nuevo", email: "new@test.com", is_staff: false }),
  "GET /enterprise/companies/$": () => [],
};
const ownerNotStaff = {
  ...withCompany,
  "GET /rbac/me/allowed-routes/$": () => ({ allowed_routes: ["enterprise.ent-dashboard", "enterprise.ent-knowledge"], is_admin: false, roles: ["client"] }),
};

// Mobile layout fixes (M-01 … M-08), run on an iPhone and an Android viewport.

const VIEWPORTS = [
  { name: "iphone", width: 390, height: 844 },
  { name: "android", width: 360, height: 800 },
];

/** Visible, at least 44x44, and the topmost element at its center (not covered). */
export async function expectTappable(locator) {
  await expect(locator).toBeVisible();
  await locator.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const box = await locator.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  const onTop = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!hit && (hit === el || el.contains(hit));
  });
  expect(onTop, "covered by another element").toBe(true);
}

export async function expectNoHorizontalOverflow(page) {
  const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(scroll).toBeLessThanOrEqual(inner);
}

for (const vp of VIEWPORTS) {
  test.describe(`mobile ${vp.name} ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const id of [1, 2]) {
      test(`M-01 process #${id}: Knowledge Structure is usable`, async ({ page }) => {
        await setupApp(page, withCompany);
        await page.goto(`/enterprise/knowledge/${id}`);
        const panel = page.getByTestId("knowledge-structure");
        await expect(panel).toBeVisible();
        expect((await panel.boundingBox()).width).toBeGreaterThan(vp.width - 80);
        await expect(panel.getByRole("heading", { name: "Knowledge Structure" })).toBeVisible();

        // Structure comes before Documents on phones.
        const docsTop = (await page.getByText("Documents", { exact: true }).locator("visible=true").first().boundingBox()).y;
        expect((await panel.boundingBox()).y).toBeLessThan(docsTop);

        await expectTappable(panel.getByRole("button", { name: /Add topic/ }));
        await expect(panel.getByText("Equipos de protección individual obligatorios").locator("visible=true").first()).toBeVisible();
        const deck = panel.getByTestId("deck-card").first();
        await expectTappable(deck.getByRole("button", { name: "Learn" }));
        await expectTappable(deck.getByRole("button", { name: "Study" }));
        await expectTappable(deck.getByRole("button", { name: /Add deck/ }));
        await expectTappable(deck.getByRole("button", { name: /Delete/i }));
        const battery = panel.getByTestId("battery-card").first();
        await expectTappable(battery.getByRole("button", { name: "Simulate" }));
        await expectTappable(battery.getByRole("button", { name: /Add battery/ }));
        await expect(panel.getByTestId("deck-card")).toHaveCount(2);
        await expectNoHorizontalOverflow(page);

        await deck.getByRole("button", { name: /Add deck/ }).click();
        await expect(page.getByPlaceholder("E.g. Heart Anatomy")).toBeVisible();
      });
    }

    test("M-02 assignment: Learn, Study and Simulate with the real names", async ({ page }) => {
      await setupApp(page, withCompany);
      await page.goto("/enterprise/learning/assignments/90");
      await expect(page.getByText("Equipos de protección individual obligatorios").locator("visible=true").first()).toBeVisible();
      const deck = page.getByTestId("assignment-deck-card").first();
      await expect(deck.getByText("Equipos de protección individual: casco, guantes y gafas de seguridad")).toBeVisible();
      await expectTappable(deck.getByRole("button", { name: "Learn" }));
      await expectTappable(deck.getByRole("button", { name: "Study" }));
      const battery = page.getByTestId("assignment-battery-card").first();
      await expect(battery.getByText("Evaluación EPP")).toBeVisible();
      await expectTappable(battery.getByRole("button", { name: /Simulate/ }));
      await expectNoHorizontalOverflow(page);
    });

    test("M-06 chat button: hides on scroll down, never covers Mark process complete", async ({ page }) => {
      await setupApp(page, withCompany);
      await page.goto("/enterprise/learning/assignments/90");
      const fab = page.getByTestId("chat-fab");
      await expect(fab).toBeVisible();
      const done = page.getByRole("button", { name: /Mark process complete/ });
      await expect(done).toBeVisible();
      await page.mouse.wheel(0, 2000);
      await expect(fab).toHaveCSS("opacity", "0");
      await expectTappable(done);
      // The last content can scroll above the bottom bar.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const doneBox = await done.boundingBox();
      const barTop = (await page.locator("nav.fixed.bottom-0").boundingBox()).y;
      expect(doneBox.y + doneBox.height).toBeLessThanOrEqual(barTop);
      await page.mouse.wheel(0, -300);
      await expect(fab).toHaveCSS("opacity", "1");
    });

    test("M-03 assignments: one readable card per assignment", async ({ page }) => {
      await setupApp(page, withCompany);
      await page.goto("/enterprise/learning/manage-assignments");
      const cards = page.getByTestId("assignment-card");
      await expect(cards).toHaveCount(2);
      const first = cards.first();
      await expect(first.getByText("QA-TEST Ruta de incorporación de operarios de planta")).toBeVisible();
      await expect(first.getByText("Leo Gómez Martínez")).toBeVisible();
      await expect(first.getByText(/Nov 15, 2026/)).toBeVisible();
      await expect(cards.nth(1).getByText("Ventas Norte")).toBeVisible();
      // Filters scroll inside their row, never the page.
      await expect(page.getByRole("button", { name: "Overdue" })).toBeAttached();
      await expectNoHorizontalOverflow(page);
      await page.getByRole("button", { name: "Overdue" }).scrollIntoViewIfNeeded();
      await expectNoHorizontalOverflow(page);
    });

    test("M-04 knowledge graph: full-width canvas, filters and detail in sheets", async ({ page }) => {
      await setupApp(page, withCompany);
      await page.goto("/enterprise/knowledge/graph");
      const svg = page.getByTestId("knowledge-graph");
      await expect(svg).toBeVisible();
      const box = await svg.boundingBox();
      expect(box.width).toBeGreaterThan(vp.width - 48);
      expect(box.height).toBeGreaterThan(300);
      // Fitted: every node inside the canvas.
      for (const node of await svg.locator("[data-node-title]").all()) {
        const nb = await node.boundingBox();
        expect(nb.x).toBeGreaterThanOrEqual(box.x);
        expect(nb.x + nb.width).toBeLessThanOrEqual(box.x + box.width);
      }
      await expectTappable(page.getByTestId("graph-filters"));
      await page.getByTestId("graph-filters").click();
      const sheet = page.getByRole("dialog");
      await expectTappable(sheet.getByTestId("type-chip-concept"));
      await sheet.getByTestId("type-chip-concept").click();
      await expect(svg.locator("path.kg-link")).toHaveCount(1);
      await sheet.getByRole("button", { name: "Close" }).click();
      await expectTappable(page.getByTestId("zoom-in"));
      const scale = async () => Number((await svg.locator("> g").getAttribute("transform")).match(/scale\(([\d.]+)\)/)[1]);
      const before = await scale();
      await page.getByTestId("zoom-in").click();
      await expect.poll(scale).toBeCloseTo(before * 1.3, 2);
      await page.locator('[data-node-title="EPP"]').click();
      await expect(page.getByRole("dialog").getByText("casco, guantes")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    test("M-05.1 learning path: Edit / Assign below the title", async ({ page }) => {
      await setupApp(page, withCompany);
      await page.goto("/enterprise/learning/paths/7");
      const title = page.getByRole("heading", { name: /Ruta de incorporación/ });
      await expect(title).toBeVisible();
      const tb = await title.boundingBox();
      expect(tb.width).toBeGreaterThan(150);
      for (const name of [/^Edit$/, /^Assign$/]) {
        const btn = page.getByRole("button", { name });
        await expectTappable(btn);
        expect((await btn.boundingBox()).y).toBeGreaterThan(tb.y + tb.height);
      }
      await expectNoHorizontalOverflow(page);
    });

    test("M-05.2 processes: filters without results say so and can be cleared", async ({ page }) => {
      await setupApp(page, {
        ...withCompany,
        "GET /enterprise/knowledge-sources/$": (req, url) => (url.searchParams.get("process_type") === "study_material" ? [] : withCompany["GET /enterprise/knowledge-sources/$"]()),
      });
      await page.goto("/enterprise/knowledge");
      await page.getByRole("button", { name: "Study Material" }).click();
      await expect(page.getByText("No processes match these filters")).toBeVisible();
      await expect(page.getByText("No processes yet")).toHaveCount(0);
      await expectTappable(page.getByRole("button", { name: "Clear filters" }));
      await page.getByRole("button", { name: "Clear filters" }).click();
      await expect(page.getByText("QA-TEST Manual de calidad ISO 9001")).toBeVisible();
    });

    test("M-05.3 new process upload area is light and short", async ({ page }) => {
      await setupApp(page, {
        ...withCompany,
        "POST /enterprise/knowledge-sources/$": () => ({ id: 9, title: "QA-TEST nuevo" }),
      });
      await page.goto("/enterprise/knowledge/new");
      await page.getByPlaceholder(/General Onboarding/).fill("QA-TEST nuevo");
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByRole("button", { name: /Create Process/i }).click();
      const dash = page.locator(".uppy-Dashboard");
      await expect(dash).toBeVisible();
      await expect(dash).toHaveAttribute("data-uppy-theme", "light");
      expect((await page.locator(".uppy-Dashboard-inner").boundingBox()).height).toBeLessThanOrEqual(260);
    });

    test("M-05.4 scrolling tables keep their key column visible", async ({ page }) => {
      await setupApp(page, withCompany);
      await page.goto("/enterprise/certifications/templates");
      const lastCell = page.locator("tbody tr").first().locator("td").last();
      await expect(lastCell).toHaveCSS("position", "sticky");
      const box = await lastCell.boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
      await page.goto("/enterprise/compliance/team");
      await page.getByRole("combobox").first().selectOption({ index: 1 }).catch(() => {});
      await expectNoHorizontalOverflow(page);
    });

    test("M-05.5 settings tabs: Members reachable, swipe hint when they overflow", async ({ page }) => {
      await setupApp(page, withCompany);
      await page.goto("/enterprise/settings");
      const members = page.getByRole("tab", { name: "Members" });
      await expect(members).toBeAttached();
      const scroller = page.getByTestId("segmented-scroller");
      const overflows = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
      if (overflows) await expect(page.getByTestId("segmented-more")).toBeVisible();
      await members.click();
      await expect(page.getByRole("button", { name: /Add member/ })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });

    test("M-07 no company: home only, no hamburger, drawer or bottom bar", async ({ page }) => {
      await setupApp(page, noCompany);
      await page.addInitScript(() => localStorage.removeItem("enterprise_company_id"));
      await page.goto("/dashboard/home");
      await expect(page.getByRole("heading", { name: "Nuevo" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Open menu" })).toBeHidden();
      await expect(page.locator("nav.fixed.bottom-0")).toHaveCount(0);
      await expect(page.locator("aside").filter({ hasText: "Knowledge Sources" })).toBeHidden();
      await expectNoHorizontalOverflow(page);
    });

    test("M-07 with company: hamburger, drawer and bottom bar unchanged", async ({ page }) => {
      await setupApp(page, ownerNotStaff);
      await page.goto("/enterprise/dashboard");
      await expectTappable(page.getByRole("button", { name: "Open menu" }));
      await expect(page.locator("nav.fixed.bottom-0")).toBeVisible();
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.locator("aside").getByText("Knowledge Sources")).toBeVisible();
    });

    test("M-08 owner: New Process visible, not covered and opens the wizard (dashboard + processes)", async ({ page }) => {
      await setupApp(page, ownerNotStaff);
      for (const path of ["/enterprise/dashboard", "/enterprise/knowledge"]) {
        await page.goto(path);
        const btn = page.getByRole("button", { name: "New Process" }).first();
        await expectTappable(btn);
        await btn.click();
        await expect(page.getByPlaceholder(/General Onboarding/)).toBeVisible();
      }
    });

    test("M-08 personal Create Project is hidden for everyone", async ({ page }) => {
      for (const routes of [ownerNotStaff, noCompany]) {
        await setupApp(page, routes);
        await page.goto("/dashboard/projects");
        await page.waitForLoadState("networkidle");
        await expect(page.getByRole("button", { name: /Create Project|New Project|Crear Proyecto|Nuevo Proyecto/ })).toHaveCount(0);
        await expect(page.getByText(/^New Project$/)).toHaveCount(0);
      }
    });
  });
}

test.describe("desktop 1440x900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("M-08 owner: New Process visible, not covered and opens the wizard", async ({ page }) => {
    await setupApp(page, ownerNotStaff);
    for (const path of ["/enterprise/dashboard", "/enterprise/knowledge"]) {
      await page.goto(path);
      const btn = page.getByRole("button", { name: "New Process" }).first();
      await expect(btn).toBeVisible();
      const onTop = await btn.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      });
      expect(onTop).toBe(true);
      await btn.click();
      await expect(page.getByPlaceholder(/General Onboarding/)).toBeVisible();
    }
  });

  test("M-07 no company on desktop: navigation as today (flag off)", async ({ page }) => {
    await setupApp(page, noCompany);
    await page.addInitScript(() => localStorage.removeItem("enterprise_company_id"));
    await page.goto("/dashboard/home");
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
    await expect(page.locator("aside").getByText("Knowledge Sources")).toBeVisible();
  });

  test("M-08 personal Create Project is hidden for everyone", async ({ page }) => {
    for (const routes of [ownerNotStaff, noCompany]) {
      await setupApp(page, routes);
      await page.goto("/dashboard/projects");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("button", { name: /Create Project|New Project|Crear Proyecto|Nuevo Proyecto/ })).toHaveCount(0);
      await expect(page.getByText(/^New Project$/)).toHaveCount(0);
    }
  });
});
