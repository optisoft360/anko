import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
vi.mock("../../../context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
const ROWS = [
  { id: 1, company: 2, company_name: "optisoft360", email: "new.hire@example.com", role: "employee", status: "pending",
    invited_by: 9, invited_by_email: "owner@example.com", invited_by_detail: { id: 9, username: "owner1", email: "owner@example.com" },
    created_at: "2026-10-30T10:00:00Z", expires_at: "2026-11-06T10:00:00Z" },
  { id: 2, company: 2, company_name: "optisoft360", email: "done@example.com", role: "manager", status: "accepted",
    invited_by_email: "owner@example.com", created_at: "2026-10-20T10:00:00Z", expires_at: "2026-10-27T10:00:00Z" },
];
const listGlobal = vi.fn(() => Promise.resolve(ROWS));
const resend = vi.fn(() => Promise.resolve({}));
vi.mock("@/services/invitationsService", () => ({ default: { listGlobal: (...a) => listGlobal(...a), resend: (...a) => resend(...a), cancel: vi.fn() } }));
vi.mock("@/services/api", () => ({ default: { get: () => Promise.resolve({ data: [] }) } }));

const { default: PlatformAdminInvitations } = await import("./PlatformAdminInvitations.jsx");

describe("Platform admin invitations", () => {
  afterEach(cleanup);

  it("renders a row per invitation with every column and actions only for pending ones", async () => {
    render(<MemoryRouter><PlatformAdminInvitations /></MemoryRouter>);
    const table = (await screen.findAllByRole("table"))[0];
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3); // header + 2
    expect(within(rows[0]).getAllByRole("columnheader")).toHaveLength(8);
    expect(within(rows[1]).getByText("new.hire@example.com")).toBeTruthy();
    expect(within(rows[1]).getByText("owner1")).toBeTruthy();
    expect(within(rows[1]).getAllByRole("button", { name: "enterprise.platformAdmin.invitations.resend" })).toHaveLength(1);
    expect(within(rows[2]).queryByRole("button", { name: "enterprise.platformAdmin.invitations.resend" })).toBeNull();
    fireEvent.click(within(rows[1]).getByRole("button", { name: "enterprise.platformAdmin.invitations.resend" }));
    expect(resend).toHaveBeenCalledWith(2, 1);
  });
});
