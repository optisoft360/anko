import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/context/language-context", () => ({ useLanguage: () => ({ t: (k, p) => (p ? `${k}:${JSON.stringify(p)}` : k), language: "en" }) }));
const PLANS = [{ id: 1, name: "Free", tier: "free", price_cents: 0 }, { id: 3, name: "Ultra", tier: "ultra", price_cents: 2999 }];
const LIMITS = [
  { id: 10, plan: 1, key: "flashcards_max_total", value_type: "int", int_value: 50 },
  { id: 11, plan: 3, key: "flashcards_max_total", value_type: "int", int_value: 99999 },
  { id: 12, plan: 1, key: "upload_window_days", value_type: "int", int_value: 7 },
];
vi.mock("@/widgets/admin/fetchAll", () => ({ fetchAll: (r) => Promise.resolve(r === "plans" ? PLANS : LIMITS) }));
vi.mock("@/services/projectService", () => ({ default: {
  getList: () => Promise.resolve({ keys: { questions_per_battery_max: { type: "int", defaults: { free: 50, ultra: 50 } } } }),
} }));

const { GlobalPlanLimits } = await import("./global-plan-limits.jsx");

describe("Plan Limits matrix", () => {
  afterEach(cleanup);

  it("shows Unlimited, app defaults, unused keys and Add on empty cells", async () => {
    render(<MemoryRouter><GlobalPlanLimits /></MemoryRouter>);
    expect(await screen.findByText("admin.pages.planLimits.unlimited")).toBeTruthy();            // 99999
    expect(screen.getAllByText(/admin.pages.planLimits.defaultValue/).length).toBe(2);       // enforced key, no rows
    expect(screen.getByText("admin.pages.planLimits.notSet")).toBeTruthy();                  // upload_window_days on Ultra
    expect(screen.getAllByText("admin.pages.planLimits.unused").length).toBe(2);             // keys the app never reads
    expect(screen.getAllByRole("button", { name: /admin.pages.planLimits.add/ }).length).toBe(3);
  });
});
