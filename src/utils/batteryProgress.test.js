import { describe, expect, it } from "vitest";
import { bestAttemptPercent } from "./batteryProgress";

describe("bestAttemptPercent (14)", () => {
  it("uses the best finished attempt, never an abandoned last one", () => {
    expect(bestAttemptPercent({ best_attempt: { percent: "20.00" }, last_attempt: { status: "in_progress", percent: "0.00" } })).toBe(20);
    expect(bestAttemptPercent({ last_attempt: { status: "finished", percent: "45.50" } })).toBe(45.5);
    expect(bestAttemptPercent({ last_attempt: { status: "in_progress", percent: "0.00" } })).toBeNull();
    expect(bestAttemptPercent({})).toBeNull();
  });
});
