import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "./apiError";

describe("apiErrorMessage", () => {
  it("prefers detail (409)", () => {
    expect(apiErrorMessage({ detail: "This content is already assigned to this user." }, "x")).toMatch(/already assigned/);
  });
  it("shows field errors (400)", () => {
    expect(apiErrorMessage({ due_date: ["Due date cannot be in the past."] }, "x")).toBe("Due date cannot be in the past.");
    expect(apiErrorMessage({ response: { data: { non_field_errors: ["Nope"] } } }, "x")).toBe("Nope");
  });
  it("falls back to the generic message", () => {
    expect(apiErrorMessage(undefined, "Could not assign")).toBe("Could not assign");
    expect(apiErrorMessage({}, "Could not assign")).toBe("Could not assign");
  });
});
