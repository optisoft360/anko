import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

afterEach(cleanup);

vi.mock("@/context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
vi.mock("../../../context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
vi.mock("../../api/enterpriseApi", () => ({ knowledgeApi: {}, collectionApi: {} }));

const { AddTopicDialog } = await import("./ProcessDetail.jsx");
const K = "enterprise.knowledge.processDetail.topicDialog.";

describe("AddTopicDialog (F-09)", () => {
  it("sends trimmed title, description and comma-separated tags", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<AddTopicDialog open onClose={() => {}} onCreate={onCreate} />);
    fireEvent.change(screen.getByPlaceholderText(`${K}titlePlaceholder`), { target: { value: "  EPP  " } });
    fireEvent.change(screen.getByPlaceholderText(`${K}tagsPlaceholder`), { target: { value: "helmets, , boots " } });
    fireEvent.click(screen.getByText(`${K}create`));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({ title: "EPP", description: "", tags: ["helmets", "boots"] }));
  });

  it("requires a title and shows backend errors without closing", async () => {
    const onCreate = vi.fn().mockRejectedValue({ title: ["A topic with this name already exists in this process."] });
    render(<AddTopicDialog open onClose={() => {}} onCreate={onCreate} />);
    fireEvent.click(screen.getByText(`${K}create`));
    expect(screen.getByText(`${K}titleRequired`)).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();
    fireEvent.change(screen.getByPlaceholderText(`${K}titlePlaceholder`), { target: { value: "Topic 1" } });
    fireEvent.click(screen.getByText(`${K}create`));
    expect(await screen.findByText(/already exists in this process/)).toBeTruthy();
    expect(screen.getByPlaceholderText(`${K}titlePlaceholder`).value).toBe("Topic 1");
  });
});
