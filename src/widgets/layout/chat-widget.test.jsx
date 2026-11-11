import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

let activeCompanyId = "7";
vi.mock("@/enterprise/context/enterprise-context", () => ({ useEnterprise: () => ({ activeCompanyId }) }));
const getChatDocuments = vi.fn();
vi.mock("@/services/projectService", () => ({ default: { getChatDocuments: (...a) => getChatDocuments(...a) } }));
vi.mock("@/widgets/layout/chat-panel", () => ({
  ChatPanel: ({ companyId, documents }) => <div data-testid="chat-panel">{companyId}:{documents.map((d) => d.filename).join(",")}</div>,
}));
vi.mock("@/widgets/layout/chat-fab", () => ({ ChatFab: () => <button data-testid="chat-fab">Chat</button> }));

const { ChatWidget } = await import("./chat-widget.jsx");

describe("ChatWidget", () => {
  afterEach(() => { cleanup(); getChatDocuments.mockReset(); activeCompanyId = "7"; });

  it("shows the chat with the active company's documents when the backend allows it", async () => {
    getChatDocuments.mockResolvedValue([{ id: 1, filename: "manual.pdf", processes: [] }]);
    render(<ChatWidget />);
    expect(await screen.findByTestId("chat-fab")).toBeTruthy();
    expect(screen.getByTestId("chat-panel").textContent).toBe("7:manual.pdf");
    expect(getChatDocuments).toHaveBeenCalledWith("7");
  });

  it("hides the chat for members the backend denies (employees, auditors)", async () => {
    getChatDocuments.mockRejectedValue({ response: { status: 403 } });
    render(<ChatWidget />);
    await waitFor(() => expect(getChatDocuments).toHaveBeenCalled());
    expect(screen.queryByTestId("chat-fab")).toBeNull();
    expect(screen.queryByTestId("chat-panel")).toBeNull();
  });

  it("has no chat without an active company", () => {
    activeCompanyId = null;
    render(<ChatWidget />);
    expect(getChatDocuments).not.toHaveBeenCalled();
    expect(screen.queryByTestId("chat-fab")).toBeNull();
  });
});
