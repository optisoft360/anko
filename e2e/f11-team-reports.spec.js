import { expect, test } from "@playwright/test";
import { setupApp } from "./helpers";

const teams = () => [{ id: 1, name: "QA-TEST Operaciones" }, { id: 2, name: "QA-TEST Vacía" }];

test("F-11: Team Retention per team", async ({ page }) => {
  const calls = await setupApp(page, {
    "GET /enterprise/teams/$": teams,
    "GET /enterprise/retention/team-retention/$": (req, url) => url.searchParams.get("team_id") === "1"
      ? { team_id: 1, member_count: 1, members: [{ user_id: 5, name: "Ana QA", retention_score: "45.00", risk_score: "72.00", open_gaps: 2, last_assessment: null }] }
      : { team_id: 2, member_count: 0, members: [] },
  });
  await page.goto("/enterprise/retention/team");
  await expect(page.getByText("Ana QA")).toBeVisible();
  await expect(page).toHaveURL(/team=1/);
  await page.getByLabel("Team").selectOption("2");
  await expect(page.getByText("This team has no members yet.")).toBeVisible();
  expect(calls.filter((c) => c.path.includes("team-retention")).every((c) => c.query.team_id)).toBe(true);
});

test("F-11: Team Compliance per team, without the missing summary endpoint", async ({ page }) => {
  const calls = await setupApp(page, {
    "GET /enterprise/teams/$": teams,
    "GET /enterprise/compliance-assignments/team-compliance/$": () => ({
      team_id: 1, member_count: 1, avg_compliance_rate: "50.00", compliant: 1, non_compliant: 1, pending: 0,
      members: [{ user_id: 5, user_name: "Ana QA", compliance_rate: "50.00", compliant: 1, non_compliant: 1, pending: 0 }],
    }),
  });
  await page.goto("/enterprise/compliance/team?team=1");
  await expect(page.getByText("Ana QA")).toBeVisible();
  await expect(page.getByText("50%").first()).toBeVisible();
  expect(calls.some((c) => c.path.includes("team-compliance-summary"))).toBe(false);
  expect(calls.find((c) => c.path.includes("team-compliance")).query.team_id).toBe("1");
});
