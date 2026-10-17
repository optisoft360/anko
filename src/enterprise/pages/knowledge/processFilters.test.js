import { describe, expect, it, vi } from "vitest";

vi.mock("@/context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
const { buildProcessFilterParams } = await import("./KnowledgeSources.jsx");

describe("buildProcessFilterParams", () => {
  it("sends both filters when set and omits 'All'", () => {
    expect(buildProcessFilterParams("tutorial", "easy")).toEqual({ process_type: "tutorial", difficulty: "easy" });
    expect(buildProcessFilterParams("", "easy")).toEqual({ difficulty: "easy" });
    expect(buildProcessFilterParams("course", "")).toEqual({ process_type: "course" });
    expect(buildProcessFilterParams("", "")).toEqual({});
  });
});
