import { afterEach, describe, expect, it } from "vitest";
import { formatDate } from "./calendarDate";

const ZONES = ["America/New_York", "Europe/Madrid", "Pacific/Auckland"];
const ORIGINAL_TZ = process.env.TZ;
afterEach(() => { process.env.TZ = ORIGINAL_TZ; });

describe("formatDate (13)", () => {
  it.each(ZONES)("calendar dates never shift a day in %s", (zone) => {
    process.env.TZ = zone;
    expect(formatDate("2026-10-31", "en")).toBe("Oct 31, 2026");
    expect(formatDate("2026-10-17", "es")).toMatch(/17 oct 2026/);
  });

  it.each(ZONES)("timestamps are shown in the user's zone (%s)", (zone) => {
    // 17 Oct 2026 10:00 UTC is 17 Oct in all three zones (06:00 New York, 23:00 Auckland).
    expect(formatDate("2026-10-17T10:00:00Z", "en", { timeZone: zone })).toBe("Oct 17, 2026");
  });

  it("a timestamp late in the UTC day is the previous local day in New York and the next in Auckland", () => {
    expect(formatDate("2026-10-17T02:30:00Z", "en", { timeZone: "America/New_York" })).toBe("Oct 16, 2026");
    expect(formatDate("2026-10-17T02:30:00Z", "en", { timeZone: "Europe/Madrid" })).toBe("Oct 17, 2026");
    expect(formatDate("2026-10-16T13:00:00Z", "en", { timeZone: "Pacific/Auckland" })).toBe("Oct 17, 2026");
  });

  it.each(ZONES)("a certificate issued today with 30 days shows the same dates on every screen (%s)", (zone) => {
    const issued = new Date("2026-10-17T10:00:00Z");
    const expires = new Date(issued.getTime() + 30 * 24 * 3600 * 1000);
    const certificateData = { issued_at: "2026-10-17", issued_at_iso: issued.toISOString(), expires_at_iso: expires.toISOString() };
    const myCertificationsCard = { issued_at: issued.toISOString(), expires_at: expires.toISOString() };
    const view = formatDate(certificateData.issued_at_iso || certificateData.issued_at, "en", { timeZone: zone });
    const card = formatDate(myCertificationsCard.issued_at, "en", { timeZone: zone });
    expect(view).toBe(card);
    expect(formatDate(certificateData.expires_at_iso, "en", { timeZone: zone })).toBe(formatDate(myCertificationsCard.expires_at, "en", { timeZone: zone }));
    expect(formatDate(myCertificationsCard.expires_at, "en", { timeZone: zone })).toBe("Nov 16, 2026");
  });

  it("handles empty and invalid values", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate("")).toBeNull();
    expect(formatDate("not a date")).toBeNull();
  });
});
