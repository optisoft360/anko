import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { en } from "@/locales/en.js";
import { es } from "@/locales/es.js";

// Every admin.* key the admin pages use must exist in both languages (no raw keys, no
// hard-coded Spanish with the UI in English).
const ROOT = path.resolve(__dirname, "../..");
const FILES = [
  ...fs.readdirSync(path.join(ROOT, "pages/dashboard")).filter((f) => /^(global-|admin-).*\.jsx$/.test(f)).map((f) => `pages/dashboard/${f}`),
  ...fs.readdirSync(path.join(ROOT, "enterprise/pages/platform-admin")).filter((f) => f.endsWith(".jsx")).map((f) => `enterprise/pages/platform-admin/${f}`),
  ...fs.readdirSync(path.join(ROOT, "widgets/admin")).filter((f) => f.endsWith(".jsx")).map((f) => `widgets/admin/${f}`),
  "widgets/GlobalCrudPage.jsx",
];

const get = (obj, key) => key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);

function usedKeys() {
  const keys = new Set();
  for (const rel of FILES) {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    for (const m of src.matchAll(/t\("(admin\.[A-Za-z0-9_.]+)"/g)) keys.add(m[1]);
    // const k = (key) => t(`admin.pages.x.${key}`)  +  k("name"); each k applies until the next `const k =`
    const defs = [...src.matchAll(/const k = \(key[^)]*\) => t\(`(admin\.[A-Za-z.]+)\.\$\{key\}`/g)];
    defs.forEach((d, i) => {
      const chunk = src.slice(d.index, defs[i + 1]?.index ?? src.length);
      for (const m of chunk.matchAll(/\bk\("([A-Za-z0-9_.]+)"/g)) keys.add(`${d[1]}.${m[1]}`);
    });
  }
  return [...keys];
}

describe("admin translations", () => {
  const keys = usedKeys();
  it("finds the keys", () => expect(keys.length).toBeGreaterThan(100));
  it.each([["en", en], ["es", es]])("every key exists in %s", (_lang, dict) => {
    const missing = keys.filter((k) => typeof get(dict, k) !== "string" && typeof get(dict, k)?.other !== "string");
    expect(missing).toEqual([]);
  });
});
