import { describe, expect, it } from "vitest";
import { formatCalendarDate, parseCalendarDate } from "./calendarDate";

describe("calendar due dates", () => {
  it("keeps the chosen day regardless of the time part / timezone", () => {
    for (const value of ["2026-10-30", "2026-10-30T23:59:59Z", "2026-10-30T00:00:00+00:00"]) {
      const d = parseCalendarDate(value);
      expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 10, 30]);
    }
  });

  it("formats and handles empty values", () => {
    expect(formatCalendarDate("2026-10-30", "en")).toContain("30");
    expect(formatCalendarDate(null)).toBeNull();
    expect(parseCalendarDate("not a date")).toBeNull();
  });
});
