import { describe, expect, it } from "vitest";

// The axios clients (src/services/api.js, src/enterprise/api/enterpriseApi.js) use
// baseURL = API_BASE, which already ends in "/api". A path starting with "/api/"
// becomes ".../api/api/..." and 404s (F-06). This guard fails on any such path.
const sources = import.meta.glob(["/src/**/*.{js,jsx}", "!/src/**/*.test.{js,jsx}"], {
  query: "?raw",
  import: "default",
  eager: true,
});

const DUPLICATED_PREFIX = /["'`]\/api\//;

describe("HTTP client paths", () => {
  it("never start with /api/ (baseURL already includes it)", () => {
    const offenders = [];
    for (const [file, text] of Object.entries(sources)) {
      if (file.includes("/locales/")) continue;
      text.split("\n").forEach((line, i) => {
        if (DUPLICATED_PREFIX.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("the guard itself detects the bug", () => {
    expect(DUPLICATED_PREFIX.test('const BASE = "/api/enterprise";')).toBe(true);
    expect(DUPLICATED_PREFIX.test("api.get(`/enterprise/companies/${id}/invitations/`)")).toBe(false);
  });
});
