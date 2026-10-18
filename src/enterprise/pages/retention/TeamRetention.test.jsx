import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

afterEach(cleanup);

vi.mock("../../../context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
const api = vi.hoisted(() => ({ teamRetention: vi.fn(), list: vi.fn() }));
vi.mock("../../api/enterpriseApi", () => ({ retentionApi: { teamRetention: api.teamRetention }, teamsApi: { list: api.list } }));

const { TeamRetention } = await import("./TeamRetention.jsx");
const K = "enterprise.retention.teamRetention.";
const show = (url = "/enterprise/retention/team") => render(<MemoryRouter initialEntries={[url]}><TeamRetention /></MemoryRouter>);

describe("Team Retention (F-11)", () => {
  it("sends team_id for the team in the URL and lists members", async () => {
    api.list.mockResolvedValue([{ id: 1, name: "QA-TEST A" }, { id: 2, name: "QA-TEST B" }]);
    api.teamRetention.mockResolvedValue({ members: [{ user_id: 5, name: "Ana QA", retention_score: "40.00", risk_score: "70.00", open_gaps: 1 }] });
    show("/enterprise/retention/team?team=2");
    expect(await screen.findByText("Ana QA")).toBeTruthy();
    expect(api.teamRetention).toHaveBeenCalledWith({ team_id: "2" });
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByText(`${K}atRisk`)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(`${K}team`), { target: { value: "1" } });
    await waitFor(() => expect(api.teamRetention).toHaveBeenLastCalledWith({ team_id: "1" }));
  });

  it("shows the backend error instead of an empty table", async () => {
    api.list.mockResolvedValue([{ id: 1, name: "QA-TEST A" }]);
    api.teamRetention.mockRejectedValue({ team_id: ["Team not found in this company."] });
    show();
    expect(await screen.findByText(/Team not found in this company/)).toBeTruthy();
  });

  it("explains when the company has no teams or the team has no members", async () => {
    api.list.mockResolvedValue([]);
    show();
    expect(await screen.findByText(`${K}noTeams`)).toBeTruthy();
    cleanup();
    api.list.mockResolvedValue([{ id: 1, name: "QA-TEST A" }]);
    api.teamRetention.mockResolvedValue({ members: [] });
    show();
    expect(await screen.findByText(`${K}noMembers`)).toBeTruthy();
  });
});
