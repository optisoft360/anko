import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { assignmentRoutes, QUESTIONS } from "./fixtures/assignment-data";

// Simulate on the assignment page: once "Answer" shows the correction, the question stays
// corrected and locked for the rest of the attempt (Next/Prev used to reset it).

const WRONG_Q1 = QUESTIONS[0].options.find((o) => !o.correct).text;
const answerCalls = (calls) => calls.filter((c) => c.path.endsWith("/answer/")).length;

async function answerCorrectly(dialog, i) {
  for (const o of QUESTIONS[i].options.filter((x) => x.correct)) await dialog.getByText(o.text, { exact: true }).click();
}

for (const vp of [{ name: "phone", width: 390, height: 844, touch: true }, { name: "desktop", width: 1440, height: 900 }]) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: !!vp.touch, isMobile: !!vp.touch });

    test(`${vp.name}: an answered question stays corrected and locked; Retry unlocks it`, async ({ page }) => {
      const calls = await setupApp(page, assignmentRoutes);
      await page.goto("/enterprise/learning/assignments/6");
      await page.getByRole("button", { name: /Simulate/ }).locator("visible=true").first().click();
      const dialog = page.getByRole("dialog");
      const answerBtn = dialog.getByRole("button", { name: /Answer/ });
      const options = vp.touch ? dialog.getByRole("checkbox") : dialog.locator("[data-locked]");

      // 1. Wrong answer on Q1 → Answer → Incorrect
      await dialog.getByText(WRONG_Q1, { exact: true }).click();
      await answerBtn.click();
      if (vp.touch) await expect(dialog.getByTestId("exam-verdict")).toHaveText("Incorrect");
      await expect(dialog.getByTestId("exam-explanation")).toBeVisible();

      // 2. Next → Prev: still corrected, locked, no Answer button
      await dialog.getByRole("button", { name: /^Next/ }).click();
      await expect(dialog.getByText(/Question\s*2/)).toBeVisible();
      await expect(answerBtn).toBeVisible(); // Q2 is not locked
      await dialog.getByRole("button", { name: "Previous question" }).click();
      await expect(dialog.getByText(/Question\s*1/)).toBeVisible();
      if (vp.touch) await expect(dialog.getByTestId("exam-verdict")).toHaveText("Incorrect");
      await expect(dialog.getByTestId("exam-explanation")).toBeVisible();
      await expect(answerBtn).toHaveCount(0);
      await expect(options).toHaveCount(4);
      for (const o of await options.all()) {
        await expect(o).toHaveAttribute("aria-disabled", "true");
        if (vp.touch) await expect(o).toBeDisabled();
      }

      // 3. Trying to change the options changes nothing and sends nothing
      const sent = answerCalls(calls);
      const marks = () => dialog.locator("[aria-hidden] > div").count(); // the dot inside a marked box
      const before = await marks();
      for (const o of QUESTIONS[0].options) await dialog.getByText(o.text, { exact: true }).click({ force: true });
      expect(await marks()).toBe(before);
      if (vp.touch) {
        await expect(dialog.getByRole("checkbox", { name: WRONG_Q1 })).toBeChecked();
        await expect(dialog.getByRole("checkbox", { checked: true })).toHaveCount(1);
        await expect(dialog.getByTestId("exam-verdict")).toHaveText("Incorrect");
      }
      expect(answerCalls(calls)).toBe(sent);

      // 4. Finish (all the others right): Q1 counts as missed
      for (let i = 1; i < QUESTIONS.length; i++) {
        await dialog.getByRole("button", { name: /^Next/ }).click();
        await answerCorrectly(dialog, i);
      }
      await dialog.getByRole("button", { name: /^Finish/ }).click();
      await expect(dialog.getByText("Exam Results")).toBeVisible();
      await expect(dialog.getByText("93%")).toBeVisible(); // 14 / 15
      await dialog.getByRole("button", { name: "Review answers" }).click();
      await expect(dialog.getByRole("button", { name: "Missed only (1)" })).toHaveAttribute("aria-pressed", "true");
      await expect(dialog.getByTestId("review-question")).toHaveCount(1);
      await expect(dialog.getByTestId("review-question")).toHaveAttribute("aria-label", "Question 1 / 15");
      await dialog.getByRole("button", { name: "Back to results" }).click();

      // 5. Retry: Q1 unlocked again
      await dialog.getByRole("button", { name: "Retry" }).click();
      await expect(dialog.getByText(/Question\s*1/)).toBeVisible();
      await expect(answerBtn).toBeVisible();
      await expect(dialog.getByTestId("exam-explanation")).toHaveCount(0);
      if (vp.touch) for (const o of await dialog.getByRole("checkbox").all()) await expect(o).toBeEnabled();
      await answerCorrectly(dialog, 0);
      await answerBtn.click();
      if (vp.touch) await expect(dialog.getByTestId("exam-verdict")).toHaveText("Correct");
    });
  });
}

test.describe("phone back buttons", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // The header back arrow (and the system back) leave the exam; reopening starts a new attempt.
  for (const how of ["header", "system"]) {
    test(`${how} back closes the exam cleanly; reopening is a new attempt`, async ({ page }) => {
      const calls = await setupApp(page, assignmentRoutes);
      await page.goto("/enterprise/learning/assignments/6");
      const simulate = page.getByRole("button", { name: /Simulate/ }).locator("visible=true").first();
      await simulate.click();
      const dialog = page.getByRole("dialog");
      await dialog.getByText(WRONG_Q1, { exact: true }).click();
      await dialog.getByRole("button", { name: /Answer/ }).click();
      await expect(dialog.getByTestId("exam-verdict")).toHaveText("Incorrect");

      if (how === "header") await dialog.getByRole("button", { name: "Back", exact: true }).click();
      else await page.goBack();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.waitForTimeout(700);
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("");

      await simulate.click();
      await expect(page.getByRole("dialog").getByRole("button", { name: /Answer/ })).toBeVisible();
      expect(calls.filter((c) => c.path.endsWith("/start_attempt/")).length).toBe(2);
    });
  }
});
