import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";

test("F-09: add a topic to a process and a deck inside it", async ({ page }) => {
  const topics = [{ id: "3", tags: ["safety"] }];
  const decks = [];
  const calls = await setupApp(page, {
    "GET /enterprise/knowledge-sources/8/$": () => ({ id: 8, title: "QA-TEST-Claude", status: "ready", documents: [] }),
    "GET /enterprise/knowledge-sources/8/results/$": () => ({ run: null, topics, decks, batteries: [] }),
    "POST /enterprise/knowledge-sources/8/topics/$": (req, url, body) => {
      const topic = { id: "9", tags: body.tags, title: body.title, description: body.description, manual: true };
      topics.push(topic);
      return { status: 201, body: topic };
    },
    "POST /enterprise/knowledge-sources/8/topics/9/decks/$": (req, url, body) => {
      decks.push({ id: 41, title: body.title, tag_group_id: 9, cardsCount: body.flashcards.length });
      return { status: 201, body: decks[0] };
    },
  });

  await page.goto("/enterprise/knowledge/8");
  await expect(page.getByText("1 topics · 0 decks · 0 batteries")).toBeVisible();

  await page.getByRole("button", { name: "Add topic" }).click();
  await page.getByPlaceholder("E.g. Personal protective equipment").fill("QA-TEST EPP");
  await page.getByPlaceholder(/Comma-separated/).fill("helmets, boots");
  await page.getByRole("button", { name: "Create topic" }).click();

  await expect(page.getByText("QA-TEST EPP")).toBeVisible();
  await expect(page.getByText("2 topics · 0 decks · 0 batteries")).toBeVisible();
  const create = calls.find((c) => c.method === "POST" && c.path.endsWith("/topics/"));
  expect(create.body).toEqual({ title: "QA-TEST EPP", description: "", tags: ["helmets", "boots"] });

  // The empty topic offers its own "+ Add deck" button.
  await page.getByRole("button", { name: "+ Add deck" }).nth(1).click();
  await page.getByRole("button", { name: "Manual", exact: true }).click();
  await page.getByPlaceholder("E.g. Heart Anatomy").fill("QA-TEST EPP deck");
  await page.getByPlaceholder(/front/i).first().fill("Q");
  await page.getByPlaceholder(/back/i).first().fill("A");
  await page.getByRole("button", { name: "Create Deck", exact: true }).click();
  await expect(page.getByText("QA-TEST EPP deck")).toBeVisible();
  await expect(page.getByText("2 topics · 1 decks · 0 batteries")).toBeVisible();
});
