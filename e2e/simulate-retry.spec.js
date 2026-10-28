import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { assignmentRoutes } from "./fixtures/assignment-data";

// Retaking an exam (Retry, or closing and opening Simulate again) must start a new attempt, so
// the second score is saved and can beat the first. The fake API behaves like the real one:
// answers to a finished attempt are rejected.

function attemptsApi() {
  let next = 900;
  const status = {};
  return {
    routes: {
      "POST /batteries/81/start_attempt/$": () => { next += 1; status[next] = "in_progress"; return { id: next }; },
      "POST /batteries/81/answer/$": (req, url, body) => (status[body.attempt_id] === "in_progress"
        ? { ok: true } : { status: 400, body: { detail: "Attempt is not in progress" } }),
      "POST /batteries/81/finish_attempt/$": (req, url, body) => { status[body.attempt_id] = "completed"; return {}; },
    },
  };
}

const answeredOk = (calls) => calls.filter((c) => c.path.endsWith("/answer/"));
const finished = (calls) => calls.filter((c) => c.path.endsWith("/finish_attempt/")).map((c) => c.body.attempt_id);

async function takeExam(page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/Question/)).toBeVisible();
  for (let i = 0; i < 15; i++) {
    await dialog.getByText("Gryffindor valora la valentía").click();
    await dialog.getByRole("button", { name: /^(Next|Finish)/ }).click();
  }
  await expect(dialog.getByText("Exam Results")).toBeVisible();
}

for (const vp of [{ name: "desktop", width: 1440, height: 900 }, { name: "phone", width: 390, height: 844 }]) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`${vp.name}: Retry starts a new attempt and saves the second score`, async ({ page }) => {
      const api = attemptsApi();
      const calls = await setupApp(page, { ...assignmentRoutes, ...api.routes });
      await page.goto("/enterprise/learning/assignments/6");
      await page.getByRole("button", { name: /Simulate/ }).locator("visible=true").first().click();
      await takeExam(page);
      await page.getByRole("dialog").getByRole("button", { name: "Retry" }).click();
      await takeExam(page);
      await expect.poll(() => finished(calls)).toEqual([901, 902]);
      const secondAttemptAnswers = answeredOk(calls).filter((c) => c.body.attempt_id === 902);
      expect(secondAttemptAnswers.length).toBeGreaterThanOrEqual(15);
      expect(answeredOk(calls).filter((c) => c.body.attempt_id === 901).length).toBe(15); // none sent to the finished one
    });

    test(`${vp.name}: closing and opening Simulate again starts a new attempt`, async ({ page }) => {
      const api = attemptsApi();
      const calls = await setupApp(page, { ...assignmentRoutes, ...api.routes });
      await page.goto("/enterprise/learning/assignments/6");
      const open = () => page.getByRole("button", { name: /Simulate/ }).locator("visible=true").first().click();
      await open();
      await takeExam(page);
      await page.getByRole("dialog").getByRole("button", { name: "Close", exact: true }).last().click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await open();
      await takeExam(page);
      await expect.poll(() => finished(calls)).toEqual([901, 902]);
    });
  });
}

test.describe("battery detail fails", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("a 500 on the battery detail still runs the exam with its questions", async ({ page }) => {
    await setupApp(page, { ...assignmentRoutes, "GET /batteries/81/$": () => ({ status: 500, body: { detail: "boom" } }) });
    await page.goto("/enterprise/learning/assignments/6");
    await page.getByRole("button", { name: /Simulate/ }).locator("visible=true").first().click();
    await expect(page.getByRole("dialog").getByText(/Question/)).toBeVisible();
    await expect(page.getByText("This battery has no questions yet.")).toHaveCount(0);
  });

  test("a failed questions request says so and can be retried", async ({ page }) => {
    let fail = true;
    await setupApp(page, { ...assignmentRoutes, "GET /batteries/81/questions/$": () => (fail ? { status: 500, body: {} } : assignmentRoutes["GET /batteries/81/questions/$"]()) });
    await page.goto("/enterprise/learning/assignments/6");
    await page.getByRole("button", { name: /Simulate/ }).locator("visible=true").first().click();
    await expect(page.getByText("Couldn't load the questions.")).toBeVisible();
    fail = false;
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("dialog").getByText(/Question/)).toBeVisible();
  });
});
