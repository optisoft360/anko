import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";

test("F-10: publish a new Training Program version", async ({ page }) => {
  let published = false;
  const calls = await setupApp(page, {
    "GET /enterprise/training-programs/$": () => [{
      id: 7, name: "QA-TEST Programa", status: "published",
      version_count: published ? 2 : 1, current_version_number: published ? 2 : 1,
    }],
    "GET /enterprise/learning-paths/$": () => [{ id: 2, name: "QA-TEST Ruta", status: "published" }],
    "POST /enterprise/training-programs/7/publish/$": (req, url, body) => {
      if (!body?.learning_path_id) return { status: 400, body: { learning_path_id: ["This field is required."] } };
      published = true;
      return { status: 201, body: { id: 12, version_number: 2, is_current: true } };
    },
  });

  await page.goto("/enterprise/learning/programs");
  await expect(page.getByText("QA-TEST Programa")).toBeVisible();
  await expect(page.getByText("Current: v1")).toBeVisible();

  await page.getByRole("button", { name: "New Version" }).click();
  await page.getByRole("combobox").selectOption("2");
  await page.getByRole("button", { name: "Publish Version" }).click();

  await expect(page.getByText("Current: v2")).toBeVisible();
  await expect(page.getByText("2 version(s)")).toBeVisible();
  const publish = calls.find((c) => c.method === "POST" && c.path.endsWith("/publish/"));
  expect(publish.body).toEqual({ learning_path_id: 2, notes: "" });
});
