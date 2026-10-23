import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";
import { withCompany } from "./fixtures/app-data";

// Functional regression of the main flows after the mobile-layout fixes,
// on a phone and on desktop. API mocked (see fixtures/app-data.js).

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test.describe(`regression ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("Learn: 5 x Good then Session Complete (seq 1..5)", async ({ page }) => {
      let n = 0;
      const card = (i) => ({ card_id: 100 + i, front: `QA-TEST pregunta ${i}`, back: `respuesta ${i}` });
      const calls = await setupApp(page, {
        ...withCompany,
        "POST /flashcards/ws-pull-card/$": () => { n = 1; return { next_card: card(1), session: { total: 5 } }; },
        "POST /flashcards/ws-push-feedback/$": (req, url, body) => {
          n += 1;
          return { ack_seq: body.seq, next_card: n <= 5 ? card(n) : null, session: { total: 5 } };
        },
      });
      await page.goto("/enterprise/knowledge/1");
      const learn = vp.width < 960
        ? page.getByTestId("deck-card").first().getByRole("button", { name: "Learn" })
        : page.getByRole("button", { name: "Learn" }).first();
      await learn.click();
      for (let i = 1; i <= 5; i += 1) {
        await expect(page.getByText(`QA-TEST pregunta ${i}`)).toBeVisible();
        await page.getByRole("button", { name: "Next" }).click();
        await page.getByRole("button", { name: "Good" }).click();
      }
      await expect(page.getByText("Session Complete!")).toBeVisible();
      const seqs = calls.filter((c) => c.path.endsWith("/ws-push-feedback/")).map((c) => c.body.seq);
      expect(seqs).toEqual([1, 2, 3, 4, 5]);
      expect(calls.filter((c) => c.path.endsWith("/ws-push-feedback/")).every((c) => c.body.rating === 3)).toBe(true);
    });

    test("create process and process filters", async ({ page }) => {
      const calls = await setupApp(page, { ...withCompany, "POST /enterprise/knowledge-sources/$": () => ({ id: 9, title: "QA-TEST nuevo" }) });
      await page.goto("/enterprise/knowledge");
      await page.getByRole("button", { name: "Tutorial" }).click();
      await expect.poll(() => calls.some((c) => c.method === "GET" && c.query.process_type === "tutorial")).toBe(true);
      await page.getByRole("button", { name: "New Process" }).first().click();
      await page.getByPlaceholder(/General Onboarding/).fill("QA-TEST nuevo");
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByRole("button", { name: /Create Process/i }).click();
      await expect.poll(() => calls.some((c) => c.method === "POST" && c.path.endsWith("/knowledge-sources/"))).toBe(true);
      await expect(page.locator(".uppy-Dashboard")).toBeVisible();
    });

    for (const target of ["user", "team"]) {
      test(`assign a learning path to a ${target}`, async ({ page }) => {
        const calls = await setupApp(page, {
          ...withCompany,
          "POST /enterprise/learning-paths/7/assign-to-(user|team)/$": () => ({ id: 99 }),
        });
        await page.goto("/enterprise/learning/manage-assignments");
        await page.getByRole("button", { name: "New Assignment" }).first().click();
        await page.getByRole("button", { name: /QA-TEST Ruta de incorporación de operarios/ }).click();
        await page.getByRole("button", { name: "Next →" }).click();
        if (target === "team") {
          await page.getByRole("button", { name: "Team", exact: true }).click();
          await page.getByRole("button", { name: /Ventas Norte/ }).click();
        } else {
          await page.getByRole("button", { name: /Leo Gómez/ }).click();
        }
        await page.getByRole("button", { name: "Assign", exact: true }).click();
        await expect.poll(() => calls.some((c) => c.method === "POST" && c.path.endsWith(`/assign-to-${target}/`))).toBe(true);
      });
    }

    test("create a compliance program", async ({ page }) => {
      const calls = await setupApp(page, { ...withCompany, "POST /enterprise/compliance-programs/$": () => ({ id: 2, name: "QA-TEST PRL" }) });
      await page.goto("/enterprise/compliance/programs");
      await page.getByRole("button", { name: "New Program" }).first().click();
      await page.locator("#cp-name").fill("QA-TEST PRL");
      await page.locator("#cp-code").fill("QA-PRL");
      await page.locator("#cp-name").locator("xpath=ancestor::form").locator("button[type=submit]").click();
      await expect.poll(() => calls.some((c) => c.method === "POST" && c.path.endsWith("/compliance-programs/"))).toBe(true);
    });

    test("issue a certificate", async ({ page }) => {
      const calls = await setupApp(page, { ...withCompany, "POST /enterprise/certificate-templates/3/issue/$": () => ({ id: 1 }) });
      await page.goto("/enterprise/certifications/templates");
      await page.getByRole("button", { name: "Issue", exact: true }).first().click();
      await page.getByRole("button", { name: /Leo Gómez/ }).click();
      const score = page.locator('input[type="number"]');
      if (await score.count()) await score.first().fill("90");
      await page.getByRole("button", { name: "Issue", exact: true }).last().click();
      await expect.poll(() => calls.some((c) => c.method === "POST" && c.path.endsWith("/certificate-templates/3/issue/"))).toBe(true);
    });

    test("document menu: View opens the document sections", async ({ page }) => {
      await setupApp(page, {
        ...withCompany,
        "GET /enterprise/knowledge-sources/1/$": () => ({ ...withCompany["GET /enterprise/knowledge-sources/(1|2)/$"](null, new URL("http://x/enterprise/knowledge-sources/1/")),
          documents: [{ id: 5, filename: "QA-TEST-procedimiento-epp.pdf", type: "pdf", size: 1024, status: "ready" }] }),
        "GET /enterprise/knowledge-sources/1/documents-with-sections/$": () => ({
          documents: [{ id: 5, filename: "QA-TEST-procedimiento-epp.pdf", sections: [{ id: 51, title: "Uso del casco", content: "El casco es obligatorio en planta." }] }],
        }),
      });
      await page.goto("/enterprise/knowledge/1");
      await page.getByRole("button", { name: "Document actions" }).click();
      await page.getByRole("menuitem", { name: "View" }).click();
      await expect(page.getByText("El casco es obligatorio en planta.")).toBeVisible();
      await expect(page.getByText("Uso del casco")).toBeVisible();
      // On phones the viewer sits above the bottom tab bar.
      const onTop = await page.getByText("El casco es obligatorio en planta.").evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + 4, r.top + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      });
      expect(onTop).toBe(true);
    });

    test("Ready notice: no View button, gone after 3 s and not shown again", async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem("ks_run_1", "run-1"));
      await setupApp(page, {
        ...withCompany,
        "GET /process-runs/run-1/$": () => ({ run_id: "run-1", status: "completed", progress_percent: 100, steps: [], artifacts: [] }),
      });
      await page.goto("/enterprise/knowledge/1");
      const notice = page.getByText(/^Ready/);
      await expect(notice).toBeVisible();
      await expect(page.getByRole("button", { name: /View/ })).toHaveCount(0);
      await expect(notice).toBeHidden({ timeout: 5000 });
      await expect(page.getByTestId("knowledge-structure")).toBeVisible();
      await page.reload();
      await expect(page.getByTestId("knowledge-structure")).toBeVisible();
      await page.waitForTimeout(800);
      await expect(page.getByText(/^Ready/)).toHaveCount(0);
    });
  });
}
