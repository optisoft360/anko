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

describe("mapApiErrors (17)", () => {
  it("maps DRF field errors, aliases and general messages", async () => {
    const { mapApiErrors } = await import("./apiError");
    expect(mapApiErrors({ minimum_passing_score: ["Ensure this value is less than or equal to 100."], title: ["Too long."] }, { title: "name" }))
      .toEqual({ fields: { minimum_passing_score: "Ensure this value is less than or equal to 100.", name: "Too long." }, general: null });
    expect(mapApiErrors({ response: { data: { detail: "Forbidden." } } })).toEqual({ fields: {}, general: "Forbidden." });
    expect(mapApiErrors({ flashcards: [{}, { back: ["Required."] }] }).fields.flashcards).toBe("Required.");
    expect(mapApiErrors(undefined)).toEqual({ fields: {}, general: null });
  });
});
