import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { assignmentRoutes } from "./fixtures/assignment-data";

// Phone pass on /enterprise/learning/assignments/:id and its Study / Simulate modals.
// Desktop is guarded by assignment-desktop-baseline.spec.js.

const VIEWPORTS = [
  { width: 360, height: 740 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
];
const SHOTS = process.env.SHOTS_DIR;
const snap = async (page, vp, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${vp.width}-${name}.png` }); };

/** No dark full-screen fixed layer left behind, and <body> scroll restored. */
async function expectNoOverlay(page) {
  await page.waitForTimeout(700); // the guard's fallback restore runs at 600 ms
  const state = await page.evaluate(() => ({
    covers: [...document.querySelectorAll("body *")].filter((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const bg = s.backgroundColor.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);
      const alpha = bg ? Number(bg[4] ?? 1) : 0;
      const dark = bg && alpha > 0.2 && Number(bg[1]) + Number(bg[2]) + Number(bg[3]) < 200;
      return s.position === "fixed" && s.visibility !== "hidden" && Number(s.opacity) > 0
        && r.width >= innerWidth - 1 && r.height >= innerHeight - 1 && dark;
    }).length,
    dialogs: document.querySelectorAll("[role='dialog']").length,
    overflow: document.body.style.overflow,
    position: document.body.style.position,
  }));
  expect(state).toEqual({ covers: 0, dialogs: 0, overflow: "", position: "" });
}

async function expectNoHorizontalScroll(page) {
  const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  expect(scroll).toBe(inner);
}

/** Every visible button inside `scope` is at least 44x44; icon-only ones have an aria-label. */
async function expectButtonsOk(page, scope) {
  const bad = await page.locator(scope).first().evaluate((root) => [...root.querySelectorAll("button, [role='button']")]
    .filter((b) => { const r = b.getBoundingClientRect(); const s = getComputedStyle(b); return r.width > 0 && r.height > 0 && s.visibility !== "hidden"; })
    .map((b) => {
      const r = b.getBoundingClientRect();
      const iconOnly = !b.textContent.trim();
      return { text: b.textContent.trim().slice(0, 30) || b.getAttribute("aria-label"), w: Math.round(r.width), h: Math.round(r.height), iconOnly, label: b.getAttribute("aria-label") };
    })
    .filter((b) => b.w < 44 || b.h < 44 || (b.iconOnly && !b.label)));
  expect(bad).toEqual([]);
}

const study = (page) => page.getByTestId("assignment-deck-card").getByRole("button", { name: "Study" });
const simulate = (page) => page.getByTestId("assignment-battery-card").getByRole("button", { name: /Simulate/ });

async function answerAll(page, { reveal = false } = {}) {
  for (let i = 0; i < 15; i++) {
    const dialog = page.getByRole("dialog");
    const next = dialog.getByRole("button", { name: /^(Next|Finish)/ });
    await expect(next).toBeDisabled(); // phones: answer before moving on
    await dialog.locator("label.ank-opt").first().tap();
    if (reveal) await dialog.getByRole("button", { name: /Answer/ }).tap();
    await expect(next).toBeEnabled();
    await next.tap();
  }
  await expect(page.getByText("Exam Results")).toBeVisible();
}

for (const vp of VIEWPORTS) {
  test.describe(`assignment phone ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp, hasTouch: true, isMobile: true });

    test.beforeEach(async ({ page }) => {
      await setupApp(page, assignmentRoutes);
      await page.goto("/enterprise/learning/assignments/6");
      await expect(study(page)).toBeVisible();
    });

    test("detail page: real name, one copy of each action, 44px targets, no overflow", async ({ page }) => {
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Harry Potter");
      // Each action exists once in the DOM (no hidden desktop copy).
      for (const name of ["Learn", "Study"]) expect(await page.getByRole("button", { name, exact: true }).count()).toBe(1);
      expect(await page.getByRole("button", { name: /^Simulate/ }).count()).toBe(1);
      // Full PDF name over two lines instead of an ellipsis.
      const pdf = page.getByText("01_Harry_Potter_and_The_Philosophers_Stone.pdf");
      expect(await pdf.evaluate((el) => el.scrollHeight <= el.clientHeight + 1 && el.getBoundingClientRect().height > 30)).toBe(true);
      await expectButtonsOk(page, "[data-testid=assignment-detail]");
      await expectNoHorizontalScroll(page);
      // The last action can scroll clear of the Chat button and the bottom bar.
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      for (const btn of [simulate(page), page.getByRole("button", { name: /Mark process complete/ })]) {
        const onTop = await btn.evaluate((el) => {
          const r = el.getBoundingClientRect();
          return [0.15, 0.5, 0.85].every((f) => { const hit = document.elementFromPoint(r.left + r.width * f, r.top + r.height / 2); return hit && (hit === el || el.contains(hit)); });
        });
        expect(onTop, "covered by the Chat button or the bottom bar").toBe(true);
      }
      await snap(page, vp, "page");
    });

    test("study: 20 cards without inner scroll, swipe, Finish, progress, clean close", async ({ page }) => {
      await study(page).tap();
      const dialog = page.getByRole("dialog");
      const card = dialog.getByTestId("study-card");
      await expect(card).toBeVisible();
      await expect(dialog.getByText("Tap to flip")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Previous" })).toBeHidden(); // first card
      await expectButtonsOk(page, "[role='dialog']");
      await snap(page, vp, "study-front");

      for (let i = 0; i < 20; i++) {
        await expect(dialog.getByText(`${i + 1} / 20`).first()).toBeVisible();
        if (i % 3 === 0 || i === 1) { await card.tap(); await page.waitForTimeout(750); }
        expect(await card.getAttribute("aria-label")).toMatch(/^(Front|Back): /);
        const inner = await card.evaluate((el) => [el, ...el.querySelectorAll("*")].filter((n) => n.scrollHeight > n.clientHeight + 1 && getComputedStyle(n).overflowY !== "visible").length);
        expect(inner, `card ${i + 1} scrolls inside`).toBe(0);
        if (i === 1) await snap(page, vp, "study-back");
        if (i < 19) await dialog.getByRole("button", { name: "Next" }).tap();
      }
      // Swipe right goes back, swipe left goes forward again.
      const swipe = (dx) => card.evaluate((el, d) => {
        const r = el.getBoundingClientRect(); const y = r.top + 40; const x = r.left + r.width / 2;
        const t = (cx) => new Touch({ identifier: 1, target: el, clientX: cx, clientY: y });
        el.dispatchEvent(new TouchEvent("touchstart", { touches: [t(x)], changedTouches: [t(x)], bubbles: true }));
        el.dispatchEvent(new TouchEvent("touchend", { touches: [], changedTouches: [t(x + d)], bubbles: true }));
      }, dx);
      await swipe(120);
      await expect(dialog.getByText("19 / 20").first()).toBeVisible();
      await swipe(-120);
      await expect(dialog.getByText("20 / 20").first()).toBeVisible();

      await dialog.getByRole("button", { name: "Finish" }).tap();
      await expect(dialog.getByText("You reviewed all 20 cards")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Review again" })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /Go to Simulate/ })).toBeVisible();
      await snap(page, vp, "study-finished");
      await dialog.getByRole("button", { name: "Close" }).tap();
      await expectNoOverlay(page);
      await expect(page.getByTestId("study-progress")).toHaveText("20/20 reviewed");
      await expectNoHorizontalScroll(page);
    });

    test("study: Go to Simulate opens the topic exam", async ({ page }) => {
      await study(page).tap();
      const dialog = page.getByRole("dialog");
      for (let i = 0; i < 19; i++) await dialog.getByRole("button", { name: "Next" }).tap();
      await dialog.getByRole("button", { name: "Finish" }).tap();
      await dialog.getByRole("button", { name: /Go to Simulate/ }).tap();
      await expect(page.getByRole("dialog").getByText(/Question/)).toBeVisible();
      expect(await page.locator("[role='dialog']").count()).toBe(1);
      await page.getByRole("dialog").getByRole("button", { name: "Close" }).tap();
      await expectNoOverlay(page);
    });

    test("simulate: options, explanation, verdict, Finish → Close, Retry → Close", async ({ page }) => {
      await simulate(page).tap();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText(/Question/)).toBeVisible();
      await expect(dialog.getByRole("checkbox")).toHaveCount(4);
      await expectButtonsOk(page, "[role='dialog']");
      await snap(page, vp, "simulate-question");

      // Real controls, whole row tappable, keyboard reachable.
      await dialog.locator("label.ank-opt").nth(0).tap();
      await expect(dialog.getByRole("checkbox").nth(0)).toBeChecked();
      await dialog.getByRole("button", { name: /Answer/ }).tap();
      const expl = dialog.getByTestId("exam-explanation");
      await expect(expl).toBeInViewport();
      await expect(dialog.getByTestId("exam-verdict")).toHaveText("Incorrect"); // Q1 needs two options
      // Explanation text meets WCAG AA on the light theme.
      const ratio = await expl.locator(".ank-expl-text").evaluate((el) => {
        const lum = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const fg = lum(getComputedStyle(el).color);
        const bg = lum("rgb(254, 248, 236)"); // amber 8% over the white dialog
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      // "Page: X" is reachable above the footer.
      const page10 = dialog.getByText("Page: 10");
      await page10.scrollIntoViewIfNeeded();
      await expect(page10).toBeInViewport({ ratio: 1 });
      await expectButtonsOk(page, "[role='dialog']");
      await snap(page, vp, "simulate-answer");
      // Footer fits at this width.
      const footerFits = await dialog.getByRole("button", { name: /^(Next|Finish)/ }).evaluate((el) => el.getBoundingClientRect().right <= innerWidth && el.scrollWidth <= el.clientWidth + 1);
      expect(footerFits).toBe(true);
      await dialog.getByRole("button", { name: /^Next/ }).tap();

      // Correct answer on Q2 (single choice: first option).
      await dialog.getByRole("radio").nth(0).check({ force: true });
      await dialog.getByRole("button", { name: /Answer/ }).tap();
      await expect(dialog.getByTestId("exam-verdict")).toHaveText("Correct");
      await dialog.getByRole("button", { name: /^Next/ }).tap();
      for (let i = 2; i < 15; i++) {
        await dialog.locator("label.ank-opt").first().tap();
        await dialog.getByRole("button", { name: /^(Next|Finish)/ }).tap();
      }
      await expect(dialog.getByText("Exam Results")).toBeVisible();
      await expect(dialog.getByTestId("exam-pass-mark")).toHaveText("Pass mark: 60%");
      await expect(dialog.getByText("Topic", { exact: true })).toBeVisible();
      await expect(dialog.getByText("Battery", { exact: true })).toHaveCount(0);
      await dialog.getByRole("button", { name: /Review answers/ }).tap();
      await expect(dialog.getByTestId("exam-review")).toBeVisible();
      await expectButtonsOk(page, "[role='dialog']");
      await snap(page, vp, "results");
      await dialog.getByRole("button", { name: "Close", exact: true }).last().tap();
      await expectNoOverlay(page);

      // Retry → Close
      await simulate(page).tap();
      await answerAll(page);
      await page.getByRole("dialog").getByRole("button", { name: "Retry" }).tap();
      await answerAll(page, { reveal: true });
      await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).last().tap();
      await expectNoOverlay(page);
      await expectNoHorizontalScroll(page);
    });

    test("system back closes the modal without leaving the page", async ({ page }) => {
      const url = page.url();
      await study(page).tap();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.goBack();
      await expectNoOverlay(page);
      expect(page.url()).toBe(url);

      await simulate(page).tap();
      await expect(page.getByRole("dialog").getByText(/Question/)).toBeVisible();
      await page.goBack();
      await expectNoOverlay(page);
      expect(page.url()).toBe(url);

      // Closing with X does not leave an extra history entry behind.
      await study(page).tap();
      await page.getByRole("dialog").getByRole("button", { name: "Close" }).tap();
      await expectNoOverlay(page);
      expect(page.url()).toBe(url);
      await expect(study(page)).toBeVisible();
    });
  });
}
