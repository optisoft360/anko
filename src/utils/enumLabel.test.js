import { describe, expect, it, vi } from "vitest";
import { UNKNOWN_ENUM_LABEL, enumLabel } from "./enumLabel";

const labels = { course: "Curso", easy: "Fácil" };

describe("enumLabel", () => {
  it("returns the translated label for known keys", () => {
    expect(enumLabel(labels, "course", "process_type")).toBe("Curso");
  });

  it("never shows the raw value for unknown keys and warns once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(enumLabel(labels, "Claro.", "process_type")).toBe(UNKNOWN_ENUM_LABEL);
    expect(enumLabel(labels, "Claro.", "process_type")).toBe(UNKNOWN_ENUM_LABEL);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("renders nothing for empty values", () => {
    expect(enumLabel(labels, null)).toBe("");
    expect(enumLabel(labels, "")).toBe("");
  });
});
