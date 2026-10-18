import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";

test("F-08: create a manual deck inside a process topic", async ({ page }) => {
  const decks = [{ id: 40, title: "QA-TEST Existing deck", tag_group_id: 3, cardsCount: 2 }];
  const calls = await setupApp(page, {
    "GET /enterprise/knowledge-sources/8/$": () => ({ id: 8, title: "QA-TEST-Claude", status: "ready", documents: [] }),
    "GET /enterprise/knowledge-sources/8/results/$": () => ({
      run: { status: "completed" }, topics: [{ id: 3, tags: ["safety", "helmets"] }], decks, batteries: [],
    }),
    "POST /enterprise/knowledge-sources/8/topics/3/decks/$": (req, url, body) => {
      if (!body?.title) return { status: 400, body: { title: ["This field is required."] } };
      decks.push({ id: 41, title: body.title, tag_group_id: 3, cardsCount: body.flashcards.length });
      return { status: 201, body: decks[1] };
    },
  });

  await page.goto("/enterprise/knowledge/8");
  await expect(page.getByText("QA-TEST Existing deck")).toBeVisible();

  await page.getByRole("button", { name: /add deck/i }).first().click();
  await page.getByRole("button", { name: "Manual", exact: true }).click();
  await page.getByPlaceholder("E.g. Heart Anatomy").fill("QA-TEST Manual deck");
  await page.getByPlaceholder(/front/i).first().fill("What protects your head?");
  await page.getByPlaceholder(/back/i).first().fill("A helmet");
  // Not clicking "Add to list": the complete card must still be sent.
  await page.getByRole("button", { name: "Create Deck", exact: true }).click();

  await expect(page.getByText("QA-TEST Manual deck")).toBeVisible();
  const create = calls.find((c) => c.method === "POST" && c.path.includes("/topics/3/decks/"));
  expect(create.body).toMatchObject({
    title: "QA-TEST Manual deck", is_public: false,
    flashcards: [{ front: "What protects your head?", back: "A helmet", notes: "" }],
  });
  expect(calls.some((c) => c.path.includes("create-with-flashcards"))).toBe(false);
});
