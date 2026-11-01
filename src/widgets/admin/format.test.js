import { describe, expect, it } from "vitest";
import { entityLabel, fieldErrors, formatDate, formatMoney, normalizeList, toBool, truncate } from "./format";

describe("admin formatters", () => {
  it("formats money from cents with period", () => {
    expect(formatMoney(999, "USD", "monthly", "en")).toBe("$9.99 / month");
    expect(formatMoney(999, "EUR", "monthly", "es")).toMatch(/9,99\s?€ \/ mes/);
    expect(formatMoney(0, "USD", null, "en")).toBe("$0.00");
    expect(formatMoney(null, "USD", "monthly", "en")).toBe("");
    expect(formatMoney(500, "???", null, "en")).toBe("5.00 ???");
  });

  it("formats dates and ignores invalid input", () => {
    expect(formatDate("2026-10-26T10:00:00Z", "en", { withTime: false })).toMatch(/Oct.*2026/);
    expect(formatDate("", "en")).toBe("");
    expect(formatDate("not a date", "en")).toBe("");
  });

  it("labels entities with fallback to id", () => {
    expect(entityLabel({ id: 3, name: "Acme" }, 3)).toBe("Acme");
    expect(entityLabel({ id: 3, username: "ana" })).toBe("ana");
    expect(entityLabel(null, 7)).toBe("#7");
    expect(entityLabel(undefined, null)).toBe("");
  });

  it("reads booleans strictly", () => {
    expect(toBool(true)).toBe(true);
    expect(toBool("true")).toBe(true);
    expect(toBool(null)).toBe(false);
    expect(toBool("false")).toBe(false);
  });

  it("truncates on a word boundary", () => {
    expect(truncate("short", 10)).toBe("short");
    expect(truncate("hello wonderful world", 18)).toBe("hello wonderful…");
    expect(truncate("hello wonderful world", 12)).toBe("hello wonder…"); // space too early: hard cut
  });

  it("normalizes list responses", () => {
    expect(normalizeList([{ id: 1 }])).toEqual({ rows: [{ id: 1 }], count: 1 });
    expect(normalizeList({ count: 40, results: [{ id: 1 }] })).toEqual({ rows: [{ id: 1 }], count: 40 });
    expect(normalizeList(null)).toEqual({ rows: [], count: 0 });
  });

  it("maps DRF 400 bodies to field errors", () => {
    expect(fieldErrors({ email: ["Taken."], detail: "Nope" })).toEqual({ email: "Taken.", _: "Nope" });
    expect(fieldErrors(null)).toEqual({});
  });
});
