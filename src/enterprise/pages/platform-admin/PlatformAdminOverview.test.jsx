import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider, useLanguage } from "@/context/language-context";

const stats = (staff) => ({
  companies: { total: 1, active: 1 }, users: { total: 12, active: 11, staff, new_last_30d: 0 },
  subscriptions: { by_plan: [] }, content: {}, invitations: { pending: 0 }, support: { open: 0 }, generation_jobs: { processing: 0, failed: 0 },
});
const getList = vi.fn();
vi.mock("@/services/projectService", () => ({ default: { getList: (...a) => getList(...a) } }));
const { default: PlatformAdminOverview } = await import("./PlatformAdminOverview.jsx");

// The app always starts in English; switch like the language picker does.
function UseLanguage({ lang }) {
  const { language, changeLanguage } = useLanguage();
  React.useEffect(() => { if (language !== lang) changeLanguage(lang); }, [lang, language, changeLanguage]);
  return null;
}
const renderIn = (lang) => render(
  <LanguageProvider><UseLanguage lang={lang} /><MemoryRouter><PlatformAdminOverview /></MemoryRouter></LanguageProvider>,
);

describe("Overview pluralization", () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it("singular and plural platform admins (EN)", async () => {
    getList.mockResolvedValueOnce(stats(1));
    renderIn("en");
    expect(await screen.findByText("11 active · 1 platform admin")).toBeTruthy();
    cleanup();
    getList.mockResolvedValueOnce(stats(2));
    renderIn("en");
    expect(await screen.findByText("11 active · 2 platform admins")).toBeTruthy();
  });

  it("singular in Spanish", async () => {
    getList.mockResolvedValueOnce(stats(1));
    renderIn("es");
    expect(await screen.findByText("11 activos · 1 admin de plataforma")).toBeTruthy();
    expect(screen.getByText("1 activa")).toBeTruthy();
  });
});
