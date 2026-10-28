import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { assignmentRoutes, ASSIGNMENT_6 } from "./fixtures/assignment-data";

// "Mark process complete" on a single-process assignment (no Learning Path): complete-module
// needs a path, so the page completes the assignment itself and shows that it is done.

for (const vp of [{ name: "phone", width: 390, height: 844 }, { name: "desktop", width: 1440, height: 900 }]) {
  test.describe(vp.name, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`${vp.name}: marking the process complete shows it as completed`, async ({ page }) => {
      let status = "in_progress";
      const calls = await setupApp(page, {
        ...assignmentRoutes,
        "GET /enterprise/learning-assignments/6/$": () => ({ ...ASSIGNMENT_6, status }),
        "POST /enterprise/learning-assignments/6/complete-learning-path/$": () => { status = "completed"; return { ...ASSIGNMENT_6, status }; },
        "POST /enterprise/learning-assignments/6/complete-module/$": () => ({ status: 500, body: {} }),
      });
      await page.goto("/enterprise/learning/assignments/6");
      await expect(page.getByTestId("assignment-completed-tag")).toHaveCount(0);
      await page.getByRole("button", { name: /Mark process complete/ }).click();

      await expect(page.getByTestId("assignment-completed-tag")).toHaveText("Completed");
      await expect(page.getByText("Process completed!")).toBeVisible();
      await expect(page.getByTestId("process-completed")).toBeVisible();
      await expect(page.getByRole("button", { name: /Mark process complete/ })).toHaveCount(0);
      expect(calls.some((c) => c.path.endsWith("/complete-module/"))).toBe(false);
    });

    test(`${vp.name}: a failed request says so instead of doing nothing`, async ({ page }) => {
      await setupApp(page, {
        ...assignmentRoutes,
        "POST /enterprise/learning-assignments/6/complete-learning-path/$": () => ({ status: 500, body: {} }),
      });
      await page.goto("/enterprise/learning/assignments/6");
      await page.getByRole("button", { name: /Mark process complete/ }).click();
      await expect(page.getByTestId("complete-error")).toHaveText("Couldn't mark the process as complete. Try again.");
      await expect(page.getByRole("button", { name: /Mark process complete/ })).toBeVisible();
    });
  });
}
