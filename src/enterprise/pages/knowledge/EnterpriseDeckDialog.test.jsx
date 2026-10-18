import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

afterEach(cleanup);

vi.mock("@/context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
vi.mock("../../../context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
vi.mock("../../api/enterpriseApi", () => ({
  knowledgeApi: { getDocumentsWithSections: vi.fn().mockResolvedValue([]) },
  collectionApi: {},
}));

const { EnterpriseDeckDialog } = await import("./ProcessDetail.jsx");
const K = "enterprise.knowledge.processDetail.deckDialog.";

function renderManual(onCreate) {
  render(<EnterpriseDeckDialog open projectId={8} onClose={() => {}} onCreate={onCreate} />);
  fireEvent.click(screen.getByRole("button", { name: `${K}generateDeck` })); // AI-tab validation error
  fireEvent.click(screen.getByRole("button", { name: `${K}tabManual` }));
  fireEvent.change(screen.getByPlaceholderText(`${K}titlePlaceholder`), { target: { value: "QA-TEST Deck" } });
}

describe("EnterpriseDeckDialog — manual mode (F-08)", () => {
  it("includes a complete card that was not added to the list", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    renderManual(onCreate);
    fireEvent.change(screen.getByPlaceholderText(`${K}frontPlaceholder`), { target: { value: "Q1" } });
    fireEvent.change(screen.getByPlaceholderText(`${K}backPlaceholder`), { target: { value: "A1" } });
    fireEvent.click(screen.getByText(`${K}createDeck`));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    const payload = onCreate.mock.calls[0][0];
    expect(payload.mode).toBe("manual");
    expect(payload.cards).toEqual([{ front: "Q1", back: "A1", notes: "" }]);
  });

  it("warns about a half-typed card and never shows the sections error", () => {
    const onCreate = vi.fn();
    renderManual(onCreate);
    expect(screen.queryAllByText("enterprise.knowledge.processDetail.noSectionsAvailable")).toHaveLength(0);
    fireEvent.change(screen.getByPlaceholderText(`${K}frontPlaceholder`), { target: { value: "Q1" } });
    fireEvent.click(screen.getByText(`${K}createDeck`));
    expect(screen.getByText(`${K}unsavedCard`)).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("keeps the modal open with the backend message and the typed data on error", async () => {
    const onCreate = vi.fn().mockRejectedValue({ title: ["Ensure this field has no more than 255 characters."] });
    renderManual(onCreate);
    fireEvent.change(screen.getByPlaceholderText(`${K}frontPlaceholder`), { target: { value: "Q1" } });
    fireEvent.change(screen.getByPlaceholderText(`${K}backPlaceholder`), { target: { value: "A1" } });
    fireEvent.click(screen.getByText(`${K}createDeck`));
    expect(await screen.findByText(/no more than 255 characters/)).toBeTruthy();
    expect(screen.getByPlaceholderText(`${K}titlePlaceholder`).value).toBe("QA-TEST Deck");
    expect(screen.getByText(`${K}createDeck`).closest("button").disabled).toBe(false);
  });
});
