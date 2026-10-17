import { describe, expect, it } from "vitest";
import {
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  UPLOAD_FORMATS_LABEL,
  uploadErrorMessage,
  validateUploadFile,
} from "./fileValidation";

const file = (name, size = 1024) => ({ name, size });
const t = (key, params = {}) => `${key}|${JSON.stringify(params)}`;

describe("validateUploadFile", () => {
  it.each(["manual.pdf", "manual.docx", "report.xlsx", "deck.pptx", "notes.txt", "guide.md"])(
    "accepts %s",
    (name) => expect(validateUploadFile(file(name))).toBeNull()
  );

  it.each(["QA-TEST-malicioso.exe", "app.js", "page.html", "logo.svg", "script.bat", "installer.msi", "legacy.doc", "noextension"])(
    "rejects %s",
    (name) => expect(validateUploadFile(file(name))).toBe("type")
  );

  it("rejects double extensions", () => {
    expect(validateUploadFile(file("manual.pdf.exe"))).toBe("type");
    expect(validateUploadFile(file("manual.exe.pdf"))).toBe("type");
  });

  it("ignores the browser MIME type", () => {
    expect(validateUploadFile({ name: "program.exe", size: 10, type: "application/pdf" })).toBe("type");
  });

  it("rejects files over the size limit", () => {
    expect(validateUploadFile(file("big.pdf", MAX_UPLOAD_BYTES + 1))).toBe("size");
    expect(validateUploadFile(file("ok.pdf", MAX_UPLOAD_BYTES))).toBeNull();
  });
});

describe("shared constants", () => {
  it("builds accept and help text from the same list", () => {
    expect(UPLOAD_ACCEPT.split(",")).toEqual(ALLOWED_EXTENSIONS.map((e) => `.${e}`));
    for (const ext of ALLOWED_EXTENSIONS.filter((e) => e !== "markdown")) {
      expect(UPLOAD_FORMATS_LABEL).toContain(ext.toUpperCase());
    }
  });

  it("error messages carry the formats and size", () => {
    expect(uploadErrorMessage("type", t)).toContain(UPLOAD_FORMATS_LABEL);
    expect(uploadErrorMessage("size", t)).toContain("upload_validation.too_large");
  });
});
