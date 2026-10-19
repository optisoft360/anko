import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";

const COMPANY = [{ id: 1, name: "QA Co", user_role: "owner" }];

test.describe("Round 3 (fix/data-quality-security-oct-2026)", () => {
  test("17: the process wizard shows errors next to each field", async ({ page }) => {
    const calls = await setupApp(page, {
      "GET /enterprise/companies/$": () => COMPANY,
      "POST /enterprise/knowledge-sources/$": () => ({ status: 400, body: { cards_per_group: ["Ensure this value is less than or equal to 500."] } }),
    });
    await page.goto("/enterprise/knowledge/new");
    await page.getByPlaceholder(/General Onboarding/).fill("QA-TEST process");
    await page.getByRole("button", { name: "Next" }).click();

    await page.locator('input[name="minimum_passing_score"]').fill("150");
    await page.getByRole("button", { name: /Create Process/i }).click();
    await expect(page.getByText("Enter a value between 0 and 100.")).toBeVisible();
    expect(calls.some((c) => c.method === "POST" && c.path.endsWith("/knowledge-sources/"))).toBe(false);

    await page.locator('input[name="minimum_passing_score"]').fill("80");
    await page.getByRole("button", { name: /Create Process/i }).click();
    await expect(page.getByText("Ensure this value is less than or equal to 500.")).toBeVisible();
    await expect(page.getByText("Could not create the process")).toHaveCount(0);
  });

  test("18: certificate template TYPE column and plural counters", async ({ page }) => {
    await setupApp(page, {
      "GET /enterprise/companies/$": () => COMPANY,
      "GET /enterprise/certificate-templates/$": () => [{ id: 3, name: "QA-TEST Cert", code: "QA-1", template_type: "skill_mastery", is_active: true, issued_count: 0 }],
      "GET /enterprise/knowledge-sources/$": () => [{ id: 8, title: "QA-TEST-Claude", status: "processed", source_type: "manual", process_type: "course", difficulty: "medium", documents: [] }],
    });
    await page.goto("/enterprise/certifications/templates");
    await expect(page.getByText("Skill mastery")).toBeVisible();
    await page.goto("/enterprise/knowledge");
    await expect(page.getByText("1 process", { exact: true })).toBeVisible();
    await expect(page.getByText(/processs/)).toHaveCount(0);
  });

  test("F-07: a throttled company request neither signs out nor sends a member to onboarding", async ({ page }) => {
    let companyCalls = 0;
    await setupApp(page, {
      "GET /enterprise/companies/$": () => (++companyCalls === 1
        ? { status: 429, body: { detail: "Request was throttled. Expected available in 3 seconds." } }
        : COMPANY),
    });
    await page.goto("/enterprise/dashboard");
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBe("e2e-token");
    await expect(page).not.toHaveURL(/onboarding/);
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);

    await page.goto("/enterprise/onboarding/company");
    await expect(page).toHaveURL(/\/enterprise\/dashboard/);
  });

  test.describe("13: dates in New York", () => {
    test.use({ timezoneId: "America/New_York" });

    test("the certificate view shows the same day as My Certifications", async ({ page }) => {
      const cert = {
        id: 9, verification_code: "ABCDEFGH1234", holder_name: "Ana QA", template_name: "QA-TEST Cert",
        issued_at: "2026-10-17", issued_at_iso: "2026-10-17T10:00:00+00:00",
        expires_at: "2026-11-16", expires_at_iso: "2026-11-16T10:00:00+00:00", status: "active",
      };
      await setupApp(page, {
        "GET /enterprise/companies/$": () => COMPANY,
        "GET /enterprise/certifications/9/certificate-data/$": () => cert,
      });
      await page.goto("/enterprise/certifications/9");
      await expect(page.getByText("Oct 17, 2026")).toBeVisible();
      await expect(page.getByText("Nov 16, 2026")).toBeVisible();
      await expect(page.getByText("Oct 16, 2026")).toHaveCount(0);
    });
  });
});
