import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
const { AdminModal } = await import("./AdminModal.jsx");

function SearchInside({ onClose }) {
  const [q, setQ] = useState("abc");
  return (
    <AdminModal title="Edit role" onClose={onClose}>
      <input aria-label="name" disabled defaultValue="client" />
      <input aria-label="filter" value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape" && q) { e.stopPropagation(); setQ(""); } }} />
    </AdminModal>
  );
}

describe("AdminModal", () => {
  afterEach(cleanup);

  it("closes with Escape even when the first field is disabled (system role)", () => {
    const onClose = vi.fn();
    render(<AdminModal title="Edit role" onClose={onClose}><input aria-label="name" disabled /><input aria-label="desc" /></AdminModal>);
    expect(document.activeElement).toBe(screen.getByLabelText("desc"));
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks in-app (not window.confirm) before closing with unsaved changes", () => {
    const onClose = vi.fn();
    const native = vi.spyOn(window, "confirm");
    render(<AdminModal title="Edit role" onClose={onClose} dirty discardMessage="You have unsaved changes to this role."
      footer={<button type="button" data-modal-cancel onClick={onClose}>Cancel</button>}><input aria-label="x" /></AdminModal>);

    fireEvent.keyDown(document.body, { key: "Escape" });
    const ask = screen.getByRole("alertdialog");
    expect(ask.textContent).toContain("You have unsaved changes to this role.");
    expect(document.activeElement.textContent).toBe("admin.modal.keepEditing"); // safe button focused
    fireEvent.click(screen.getByText("admin.modal.keepEditing"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Cancel"));                 // footer Cancel asks too
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    fireEvent.keyDown(document.body, { key: "Escape" });          // Escape on the question = keep editing
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("admin.modal.close"));  // the X asks too
    fireEvent.click(screen.getByText("admin.modal.discardConfirm"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(native).not.toHaveBeenCalled();
    native.mockRestore();
  });

  it("closes straight away without changes", () => {
    const onClose = vi.fn();
    render(<AdminModal title="Edit" onClose={onClose}><input aria-label="x" /></AdminModal>);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("first Escape in a search box with text clears it, the second closes", () => {
    const onClose = vi.fn();
    render(<SearchInside onClose={onClose} />);
    const filter = screen.getByLabelText("filter");
    fireEvent.keyDown(filter, { key: "Escape" });
    expect(filter.value).toBe("");
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(filter, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
