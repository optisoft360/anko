import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";

test("F-13: Refresh builds the graph and nodes open their detail", async ({ page }) => {
  let built = false;
  const graph = () => built ? {
    node_count: 3, edge_count: 2,
    nodes: [
      { id: 1, title: "QA-TEST-Claude", node_type: "document", importance_score: "90.00", source_id: 8 },
      { id: 2, title: "Topic 1", node_type: "topic", importance_score: "70.00", source_id: 8, description: "safety, helmets" },
      { id: 3, title: "helmets", node_type: "concept", importance_score: "50.00", source_id: 8 },
    ],
    relationships: [
      { id: 1, source_node_id: 1, target_node_id: 2, relationship_type: "related_to", strength: "0.900" },
      { id: 2, source_node_id: 2, target_node_id: 3, relationship_type: "related_to", strength: "0.600" },
    ],
  } : { node_count: 0, edge_count: 0, nodes: [], relationships: [] };
  const calls = await setupApp(page, {
    "GET /enterprise/knowledge-graph/graph/$": graph,
    "GET /enterprise/knowledge-sources/$": () => [{ id: 8, title: "QA-TEST-Claude", status: "pending" }],
    "POST /enterprise/knowledge-graph/rebuild/$": () => { built = true; return { processes: 1, node_count: 3, edge_count: 2 }; },
  });

  await page.goto("/enterprise/knowledge/graph");
  await expect(page.getByText("No knowledge graph data")).toBeVisible();
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(page.getByTestId("knowledge-graph")).toBeVisible();
  await expect(page.locator("[data-testid=knowledge-graph] line")).toHaveCount(2);
  expect(calls.some((c) => c.method === "POST" && c.path.endsWith("/knowledge-graph/rebuild/"))).toBe(true);

  await page.locator('[data-node-title="Topic 1"] circle').click();
  await expect(page.getByText("safety, helmets")).toBeVisible();

  // Filters and zoom still work on the built graph.
  await page.getByLabel("Concept").uncheck();
  await expect(page.locator("[data-testid=knowledge-graph] line")).toHaveCount(1);
  await page.getByTestId("zoom-in").click();
  await expect(page.locator("[data-testid=knowledge-graph] > g")).toHaveAttribute("transform", /scale\(1\.25\)/);
});
