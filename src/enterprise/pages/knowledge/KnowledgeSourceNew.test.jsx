import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

afterEach(cleanup);

vi.mock("../../../context/language-context", () => ({ useLanguage: () => ({ t: (k, p) => (p ? `${k} ${JSON.stringify(p)}` : k), language: "en" }) }));
vi.mock("../../context/enterprise-context", () => ({ useEnterprise: () => ({ activeCompanyId: 1, activeCompany: { company_name: "QA" } }) }));
const api = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../../api/enterpriseApi", () => ({ knowledgeApi: api }));
vi.mock("@uppy/react", () => ({ Dashboard: () => null }));

const { KnowledgeSourceNew } = await import("./KnowledgeSourceNew.jsx");
const K = "enterprise.knowledge.sourceNew.";

function goToStep2() {
  render(<MemoryRouter><KnowledgeSourceNew /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText(`${K}namePlaceholder`), { target: { value: "QA-TEST" } });
  fireEvent.click(screen.getByText(`${K}next`));
}

describe("New process wizard (17)", () => {
  it("validates numbers locally (0-100, whole numbers) before calling the API", () => {
    goToStep2();
    const score = document.querySelector('input[name="minimum_passing_score"]');
    fireEvent.change(score, { target: { value: "150" } });
    fireEvent.change(document.querySelector('input[name="cards_per_group"]'), { target: { value: "7.5" } });
    fireEvent.click(screen.getByText(`${K}createProcess`));
    expect(screen.getByText(`${K}numberError.range {"min":0,"max":100}`)).toBeTruthy();
    expect(screen.getByText(`${K}numberError.integer {"min":1,"max":500}`)).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();
  });

  it("shows the API error under its field instead of the generic message", async () => {
    api.create.mockRejectedValue({ minimum_passing_score: ["Ensure this value is less than or equal to 100."] });
    goToStep2();
    fireEvent.click(screen.getByText(`${K}createProcess`));
    expect(await screen.findByText("Ensure this value is less than or equal to 100.")).toBeTruthy();
    expect(screen.queryByText(`${K}createError`)).toBeNull();
  });

  it("the mouse wheel does not change number fields", () => {
    goToStep2();
    const input = document.querySelector('input[name="questions_per_group"]');
    input.focus();
    fireEvent.wheel(input, { deltaY: 100 });
    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe("15");
  });
});
