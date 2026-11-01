import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

vi.mock("@/context/language-context", () => ({
  useLanguage: () => ({ t: (key) => key, language: "en" }),
}));
const getList = vi.fn();
const updateItem = vi.fn();
const deleteItem = vi.fn();
vi.mock("@/services/projectService", () => ({ default: { getList: (...a) => getList(...a), updateItem: (...a) => updateItem(...a), deleteItem: (...a) => deleteItem(...a), createItem: vi.fn() } }));

const { GlobalCrudPage } = await import("./GlobalCrudPage.jsx");

let location;
function Spy() { location = useLocation(); return null; }
const renderPage = (props = {}, url = "/dashboard/x") => render(
  <MemoryRouter initialEntries={[url]}>
    <GlobalCrudPage title="Things" resource="things" disableCreate
      columns={[{ header: "Name", accessor: "name", sortKey: "name" }, { header: "Active", accessor: "is_active" }, { header: "Owner", accessor: "owner" }]}
      fields={[{ name: "name", label: "Name", type: "text", required: true }]} {...props} />
    <Spy />
  </MemoryRouter>,
);

describe("GlobalCrudPage (admin table)", () => {
  beforeEach(() => { getList.mockReset(); updateItem.mockReset(); deleteItem.mockReset(); });
  afterEach(cleanup);

  it("renders rows with readable booleans and entities, never an empty boolean", async () => {
    getList.mockResolvedValue({ count: 1, results: [{ id: 1, name: "Alpha", is_active: false, owner: { id: 4, username: "ana" } }] });
    renderPage();
    expect(await screen.findAllByText("Alpha")).toBeTruthy();
    expect(screen.getAllByText("admin.cells.no").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ana").length).toBeGreaterThan(0);
    expect(screen.queryByText("admin.table.empty")).toBeNull();
  });

  it("shows the empty state alone (not loading + empty)", async () => {
    getList.mockResolvedValue({ count: 0, results: [] });
    renderPage();
    expect(await screen.findByText("admin.table.empty")).toBeTruthy();
    expect(screen.queryByText("admin.table.loading")).toBeNull();
  });

  it("shows an error with Retry that reloads", async () => {
    getList.mockRejectedValueOnce(new Error("boom")).mockResolvedValue({ count: 1, results: [{ id: 1, name: "Back" }] });
    renderPage();
    fireEvent.click(await screen.findByText("admin.table.retry"));
    expect(await screen.findAllByText("Back")).toBeTruthy();
    expect(getList).toHaveBeenCalledTimes(2);
  });

  it("debounces search into the URL and sends ?search= only when set", async () => {
    getList.mockResolvedValue({ count: 0, results: [] });
    renderPage({ searchable: true });
    await screen.findByText("admin.table.empty");
    expect(getList.mock.calls[0][1]).not.toHaveProperty("search");
    vi.useFakeTimers();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ana" } });
    act(() => { vi.advanceTimersByTime(299); });
    expect(location.search).toBe("");
    act(() => { vi.advanceTimersByTime(1); });
    vi.useRealTimers();
    expect(location.search).toBe("?search=ana");
    await waitFor(() => expect(getList.mock.calls.at(-1)[1]).toMatchObject({ search: "ana" }));
  });

  it("sorts by column through ?ordering=", async () => {
    getList.mockResolvedValue({ count: 1, results: [{ id: 1, name: "A" }] });
    renderPage();
    await screen.findAllByText("A");
    fireEvent.click(screen.getByRole("button", { name: /Name/ }));
    await waitFor(() => expect(getList.mock.calls.at(-1)[1]).toMatchObject({ ordering: "name" }));
    expect(location.search).toBe("?ordering=name");
  });

  it("disables delete with the reason as tooltip", async () => {
    getList.mockResolvedValue({ count: 1, results: [{ id: 1, name: "Sys" }] });
    renderPage({ canDelete: () => "locked" });
    await screen.findAllByText("Sys");
    const del = screen.getAllByRole("button", { name: "admin.table.delete" })[0];
    expect(del.disabled).toBe(true);
    expect(del.getAttribute("title")).toBe("locked");
  });

  it("validates required fields and shows 400 errors under the field", async () => {
    getList.mockResolvedValue({ count: 1, results: [{ id: 1, name: "A" }] });
    updateItem.mockRejectedValue({ response: { status: 400, data: { name: ["Already taken."] } } });
    renderPage();
    await screen.findAllByText("A");
    fireEvent.click(screen.getAllByRole("button", { name: "admin.table.edit" })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const input = screen.getByLabelText(/Name/);
    expect(document.activeElement).toBe(input); // initial focus on the first field
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(screen.getByText("admin.modal.save"));
    expect(await screen.findByText("admin.form.required")).toBeTruthy();
    fireEvent.change(input, { target: { value: "B" } });
    fireEvent.click(screen.getByText("admin.modal.save"));
    expect(await screen.findByText("Already taken.")).toBeTruthy();
  });

  it("closes the modal with Escape", async () => {
    getList.mockResolvedValue({ count: 1, results: [{ id: 1, name: "A" }] });
    renderPage();
    await screen.findAllByText("A");
    fireEvent.click(screen.getAllByRole("button", { name: "admin.table.edit" })[0]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
