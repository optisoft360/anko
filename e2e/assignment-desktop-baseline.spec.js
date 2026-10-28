import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { assignmentRoutes } from "./fixtures/assignment-data";

// Desktop guard for the phone work on /enterprise/learning/assignments/:id and its Study /
// Simulate modals: at 1440x900 they must look exactly as before. Reference images were taken
// with the code before those changes (--update-snapshots on the previous commit).

test.use({ viewport: { width: 1440, height: 900 } });

const shot = (page, name) => expect(page).toHaveScreenshot(`${name}.png`, { animations: "disabled", maxDiffPixelRatio: 0.001 });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-22T10:00:00"));
  await setupApp(page, assignmentRoutes);
  await page.goto("/enterprise/learning/assignments/6");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
});

test("desktop unchanged: assignment page", async ({ page }) => {
  await expect(page).toHaveScreenshot("assignment-6.png", { fullPage: true, animations: "disabled", maxDiffPixelRatio: 0.001 });
});

test("desktop unchanged: study modal", async ({ page }) => {
  await page.getByRole("button", { name: "Study" }).first().click();
  await page.waitForTimeout(900);
  await shot(page, "study-front");
  await page.getByText("Click to flip").click();
  await page.waitForTimeout(1000);
  await shot(page, "study-back");
  for (let i = 0; i < 19; i++) await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(500);
  await shot(page, "study-last");
});

test("desktop unchanged: simulate modal and results", async ({ page }) => {
  await page.getByRole("button", { name: "Simulate" }).first().click();
  await page.waitForTimeout(900);
  await shot(page, "simulate-question");
  await page.getByText("Gryffindor valora la valentía").click();
  await page.getByRole("button", { name: /Show Answer/ }).click();
  await page.waitForTimeout(400);
  await shot(page, "simulate-answer");
  for (let i = 0; i < 15; i++) await page.getByRole("button", { name: /^(Next|Finish)/ }).click();
  await page.waitForTimeout(900);
  await shot(page, "simulate-results");
  await page.getByRole("button", { name: "Close", exact: true }).last().click(); // footer Close
  await page.waitForTimeout(900);
  await shot(page, "after-close");
});
