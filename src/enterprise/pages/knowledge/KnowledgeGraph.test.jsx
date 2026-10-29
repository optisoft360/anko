import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const render = (ui) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(cleanup);

vi.mock("../../../context/language-context", () => ({ useLanguage: () => ({ t: (k, p) => (p ? `${k} ${JSON.stringify(p)}` : k), language: "en" }) }));
const ctx = vi.hoisted(() => ({ value: { activeCompanyId: 1, role: "owner", isPlatformAdmin: false } }));
vi.mock("../../context/enterprise-context", () => ({ useEnterprise: () => ctx.value }));
const api = vi.hoisted(() => ({ getGraph: vi.fn(), list: vi.fn(), rebuildGraph: vi.fn() }));
vi.mock("../../api/enterpriseApi", () => ({ knowledgeApi: api }));

const { KnowledgeGraph, edgeEnds, importanceOf } = await import("./KnowledgeGraph.jsx");

const GRAPH = {
  node_count: 3, edge_count: 2,
  nodes: [
    { id: 1, title: "QA-TEST-Claude", node_type: "document", importance_score: "90.00", source_id: 8 },
    { id: 2, title: "Topic 1", node_type: "topic", importance_score: "70.00", source_id: 8 },
    { id: 3, title: "helmets", node_type: "concept", importance_score: "50.00", source_id: 8 },
  ],
  relationships: [
    { id: 1, source_node_id: 1, target_node_id: 2, relationship_type: "related_to", strength: "0.900" },
    { id: 2, source_node_id: 2, target_node_id: 3, relationship_type: "related_to", strength: "0.600" },
  ],
};

describe("Knowledge Graph (F-13)", () => {
  it("reads the API edge and importance format", () => {
    expect(edgeEnds({ source_node_id: 4, target_node_id: 5 })).toEqual([4, 5]);
    expect(importanceOf({ importance_score: "70.00" })).toBe(0.7);
  });

  it("draws edges, shows process nodes and the node detail", async () => {
    api.getGraph.mockResolvedValue(GRAPH);
    api.list.mockResolvedValue([{ id: 8, title: "QA-TEST-Claude", status: "pending" }]);
    const { container } = render(<KnowledgeGraph />);
    await screen.findByTestId("knowledge-graph");
    await waitFor(() => expect(container.querySelectorAll("path.kg-link")).toHaveLength(2));
    expect(container.querySelectorAll("[data-node-title]")).toHaveLength(3);
    fireEvent.click(container.querySelector('[data-node-title="Topic 1"]'));
    expect(screen.getByText("70%")).toBeTruthy();
    // Every process with nodes is a source option (not only "processed" ones), with its node count.
    expect(screen.getByRole("option", { name: "QA-TEST-Claude (3)" })).toBeTruthy();
  });

  it("type chips hide nodes and their edges", async () => {
    api.getGraph.mockResolvedValue(GRAPH);
    api.list.mockResolvedValue([]);
    const { container } = render(<KnowledgeGraph />);
    await screen.findByTestId("knowledge-graph");
    await waitFor(() => expect(container.querySelectorAll("path.kg-link")).toHaveLength(2));
    fireEvent.click(screen.getByTestId("type-chip-concept"));
    expect(screen.getByTestId("type-chip-concept").getAttribute("aria-pressed")).toBe("false");
    expect(container.querySelectorAll("[data-node-title]")).toHaveLength(2);
    expect(container.querySelectorAll("path.kg-link")).toHaveLength(1);
  });

  it("lays out every node deterministically, one area per process", async () => {
    const { layoutGraph } = await import("./KnowledgeGraph.jsx");
    const nodes = [{ id: 1, source_id: 1, node_type: "document" }, { id: 2, source_id: 1, node_type: "concept" }, { id: 3, source_id: 2, node_type: "document" }];
    const edges = [{ s: 1, t: 2 }];
    const a = layoutGraph(nodes, edges, { 1: 1, 2: 1, 3: 0 });
    expect(layoutGraph(nodes, edges, { 1: 1, 2: 1, 3: 0 })).toEqual(a);
    expect(Object.values(a).every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(Math.hypot(a[1].x - a[3].x, a[1].y - a[3].y)).toBeGreaterThan(200);
  });

  it("Refresh rebuilds for trainers and only reloads for employees", async () => {
    api.getGraph.mockResolvedValue(GRAPH);
    api.list.mockResolvedValue([]);
    api.rebuildGraph.mockResolvedValue({ node_count: 3 });
    render(<KnowledgeGraph />);
    await screen.findByTestId("knowledge-graph");
    fireEvent.click(screen.getByText("enterprise.knowledge.graph.refresh"));
    await waitFor(() => expect(api.rebuildGraph).toHaveBeenCalledTimes(1));
    cleanup();
    api.rebuildGraph.mockClear();
    ctx.value = { ...ctx.value, role: "employee" };
    render(<KnowledgeGraph />);
    await screen.findByTestId("knowledge-graph");
    fireEvent.click(screen.getByText("enterprise.knowledge.graph.refresh"));
    await waitFor(() => expect(api.getGraph.mock.calls.length).toBeGreaterThan(2));
    expect(api.rebuildGraph).not.toHaveBeenCalled();
  });

  it("shows load errors instead of an empty graph", async () => {
    api.getGraph.mockRejectedValue({ detail: "You do not have access to this company." });
    api.list.mockResolvedValue([]);
    render(<KnowledgeGraph />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText(/do not have access/)).toBeTruthy();
  });
});
