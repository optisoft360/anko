import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { withCompany } from "./fixtures/app-data";

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
  });
}
