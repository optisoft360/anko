import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { assignmentRoutes, QUESTIONS } from "./fixtures/assignment-data";

// Exam Results → "Review answers" on the assignment page: every question read-only, with the
// same option cards, verdict and explanation as after "Answer"; "Missed only" by default.

const MISS = new Set([3, 8]); // Question 4 and Question 9 are answered wrong on purpose

async function takeExam(page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Question/).first()).toBeVisible();
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const correct = q.options.filter((o) => o.correct);
    const pick = MISS.has(i) ? q.options.filter((o) => !o.correct).slice(0, 1) : correct;
    for (const o of pick) await dialog.getByText(o.text, { exact: true }).click();
    await dialog.getByRole("button", { name: /^(Next|Finish)/ }).click();
  }
  await expect(dialog.getByText("Exam Results")).toBeVisible();
}

async function expectNoOverlay(page) {
  await page.waitForTimeout(700);
  const state = await page.evaluate(() => ({
    covers: [...document.querySelectorAll("body *")].filter((el) => {
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      const bg = s.backgroundColor.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);
      const dark = bg && Number(bg[4] ?? 1) > 0.2 && Number(bg[1]) + Number(bg[2]) + Number(bg[3]) < 200;
      return s.position === "fixed" && s.visibility !== "hidden" && r.width >= innerWidth - 1 && r.height >= innerHeight - 1 && dark;
    }).length,
    dialogs: document.querySelectorAll("[role='dialog']").length,
    overflow: document.body.style.overflow,
  }));
  expect(state).toEqual({ covers: 0, dialogs: 0, overflow: "" });
}

for (const vp of [{ name: "phone", width: 390, height: 844, touch: true }, { name: "desktop", width: 1440, height: 900 }]) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.touch, isMobile: !!vp.touch });

    test(`${vp.name}: review shows the missed questions read-only; Back and Close work`, async ({ page }) => {
      const calls = await setupApp(page, assignmentRoutes);
      await page.goto("/enterprise/learning/assignments/6");
      await page.getByRole("button", { name: /Simulate/ }).locator("visible=true").first().click();
      await takeExam(page);
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByText("87%")).toBeVisible(); // 13 / 15

      // Next to Retry / Close, same look as Retry.
      const review = dialog.getByRole("button", { name: "Review answers" });
      const retry = dialog.getByRole("button", { name: "Retry" });
      const look = (l) => l.evaluate((el) => { const s = getComputedStyle(el); return [s.backgroundColor, s.borderColor, s.color, s.borderRadius, s.fontSize]; });
      expect(await look(review)).toEqual(await look(retry));
      await review.click();

      await expect(dialog.getByText("Review answers").first()).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Missed only (2)" })).toHaveAttribute("aria-pressed", "true");
      const items = dialog.getByTestId("review-question");
      await expect(items).toHaveCount(2);
      expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(["Question 4 / 15", "Question 9 / 15"]);
      for (const item of await items.all()) {
        await expect(item.getByTestId("exam-verdict")).toHaveText("Incorrect");
        await expect(item.getByTestId("exam-explanation")).toContainText(/Page: \d+/);
      }
      // Q4 (single choice): the chosen wrong option is marked; the right one is green.
      const q4 = items.first();
      await expect(q4.getByRole("radio", { checked: true })).toHaveCount(1);
      const q4Wrong = QUESTIONS[3].options.find((o) => !o.correct).text;
      await expect(q4.getByRole("radio", { name: q4Wrong })).toBeChecked();

      // Read-only: tapping options changes nothing and sends nothing.
      const answersBefore = calls.filter((c) => c.path.endsWith("/answer/")).length;
      const opts = q4.getByTestId("review-option");
      const checkedBefore = await opts.evaluateAll((els) => els.map((e) => e.getAttribute("aria-checked")));
      for (const o of await opts.all()) await o.click({ force: true });
      expect(await opts.evaluateAll((els) => els.map((e) => e.getAttribute("aria-checked")))).toEqual(checkedBefore);
      expect(await opts.evaluateAll((els) => els.every((e) => e.getAttribute("aria-disabled") === "true"))).toBe(true);
      expect(calls.filter((c) => c.path.endsWith("/answer/")).length).toBe(answersBefore);

      // All: the 15 in order, the right ones marked Correct.
      await dialog.getByRole("button", { name: "All (15)" }).click();
      await expect(items).toHaveCount(15);
      expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")))).toEqual(QUESTIONS.map((_, i) => `Question ${i + 1} / 15`));
      await expect(dialog.getByTestId("exam-verdict").filter({ hasText: /^Correct$/ })).toHaveCount(13);

      if (vp.touch) {
        const small = await dialog.evaluate((root) => [...root.querySelectorAll("button")]
          .filter((b) => b.getBoundingClientRect().width > 0)
          .map((b) => ({ t: b.textContent.trim() || b.getAttribute("aria-label"), w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height }))
          .filter((b) => b.w < 44 || b.h < 44));
        expect(small).toEqual([]);
        expect(await dialog.evaluate((root) => root.scrollWidth <= root.clientWidth + 1)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(vp.width);
        const footer = dialog.getByRole("button", { name: "Back to results" }).locator("..");
        expect(await footer.getAttribute("style")).toContain("safe-area-inset-bottom");
      }

      // Back to results, then into the review again and close from there.
      await dialog.getByRole("button", { name: "Back to results" }).click();
      await expect(dialog.getByText("Exam Results")).toBeVisible();
      await expect(dialog.getByText("87%")).toBeVisible();
      await dialog.getByRole("button", { name: "Review answers" }).click();
      await expect(dialog.getByRole("button", { name: "Missed only (2)" })).toHaveAttribute("aria-pressed", "true");
      await dialog.getByRole("button", { name: "Close", exact: true }).last().click();
      await expectNoOverlay(page);
      await expect(page.getByRole("button", { name: /Simulate/ }).locator("visible=true").first()).toBeVisible();
    });
  });
}
