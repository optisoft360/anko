import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/context/language-context";

const PLANS = [
  { id: 1, name: "Free", tier: "free", price_cents: 0 },
  { id: 2, name: "Premium", tier: "premium", price_cents: 999 },
  { id: 3, name: "Ultra", tier: "ultra", price_cents: 2999 },
];
const LIMITS = [
  { id: 10, plan: 1, key: "flashcards_max_total", value_type: "int", int_value: 50 },
  { id: 11, plan: 3, key: "flashcards_max_total", value_type: "int", int_value: 99999 },
  { id: 12, plan: 1, key: "upload_window_days", value_type: "int", int_value: 7 },
  // rows that exist without a value used to render a bare "—"
  { id: 13, plan: 2, key: "questions_per_battery_max", value_type: "int", int_value: null },
  { id: 14, plan: 3, key: "explore_topics_limit", value_type: "int", int_value: null },
];
const DEFAULTS = { keys: {
  questions_per_battery_max: { type: "int", defaults: { free: 50, premium: 50, ultra: 50 } },
  explore_topics_limit: { type: "int", defaults: { free: 0, premium: 0, ultra: 0 } },
  documents_per_month: { type: "int", defaults: { free: 2, premium: 100 } }, // no ultra default
} };
vi.mock("@/widgets/admin/fetchAll", () => ({ fetchAll: (r) => Promise.resolve(r === "plans" ? PLANS : LIMITS) }));
vi.mock("@/services/projectService", () => ({ default: { getList: () => Promise.resolve(DEFAULTS) } }));

const { GlobalPlanLimits } = await import("./global-plan-limits.jsx");

describe("Plan Limits matrix", () => {
  afterEach(cleanup);

  it("interpolates defaults and explains every empty cell", async () => {
    const { container } = render(<LanguageProvider><MemoryRouter><GlobalPlanLimits /></MemoryRouter></LanguageProvider>);
    expect(await screen.findByText("Unlimited")).toBeTruthy();                       // 99999
    const table = container.querySelector("table");
    expect(table.textContent).not.toMatch(/\{n\}|\{\{|\}\}/);                       // no raw placeholders
    expect(screen.getAllByText("Default: 50").length).toBe(3);                      // Free + Ultra missing, Premium row without value
    expect(screen.getAllByText("Default: 0").length).toBe(3);                       // explore_topics_limit incl. Ultra row without value
    expect(screen.getByText("No default")).toBeTruthy();                            // documents_per_month on Ultra
    expect(screen.getAllByText("Not set").length).toBe(3);                          // unused keys: 1 + 2 missing cells
    // nothing in the matrix is a bare dash without an explanation
    [...table.querySelectorAll("tbody td")].forEach((td) => {
      if (td.textContent.trim() === "—") throw new Error("bare dash in a cell");
    });
    const unused = screen.getAllByText("Not used")[0].closest("[title]");
    expect(unused.getAttribute("title")).toBe("This limit is defined but not enforced anywhere in the code.");
  });
});
