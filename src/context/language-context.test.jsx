import React from "react";
import { describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { LanguageProvider, useLanguage } from "./language-context";

function Probe({ onReady }) {
  onReady(useLanguage());
  return null;
}

describe("t() plurals (18)", () => {
  it("picks one/other by count, in English and Spanish", () => {
    let ctx;
    render(<LanguageProvider><Probe onReady={(c) => { ctx = c; }} /></LanguageProvider>);
    expect(ctx.t("enterprise.knowledge.sources.processCount", { count: 0, plural: "s" })).toBe("0 processes");
    expect(ctx.t("enterprise.knowledge.sources.processCount", { count: 1, plural: "" })).toBe("1 process");
    expect(ctx.t("enterprise.knowledge.sources.processCount", { count: 2, plural: "s" })).toBe("2 processes");
    expect(ctx.t("enterprise.learning.progress.tagsCount", { n: 10 })).toBe("10 tags");
    expect(ctx.t("enterprise.knowledge.processDetail.cardsCount", { n: 1 })).toBe("1 card");
    expect(typeof ctx.t("enterprise.knowledge.processDetail.cardsCount")).toBe("string"); // no count -> "other", never an object
    act(() => ctx.changeLanguage("es"));
    expect(ctx.t("enterprise.knowledge.sources.processCount", { count: 1 })).toBe("1 proceso");
    expect(ctx.t("enterprise.learning.progress.tagsCount", { n: 10 })).toBe("10 etiquetas");
  });
});
