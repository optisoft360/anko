import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/context/language-context", () => ({
  useLanguage: () => ({ t: (key) => key, language: "en" }),
}));

const { AddDocModal } = await import("./ProcessDetail.jsx");

const pdf = new File(["%PDF-1.4"], "manual.pdf", { type: "application/pdf" });
const exe = new File(["MZ"], "QA-TEST-malicioso.exe", { type: "application/x-msdownload" });

const uploadButton = () => screen.getByText("enterprise.knowledge.processDetail.addDocModal.upload").closest("button");

describe("AddDocModal", () => {
  afterEach(cleanup);

  it("lists a dropped executable with its reason and blocks Upload", () => {
    render(<AddDocModal ksId={1} companyId={1} onClose={() => {}} onAdded={() => {}} initialFiles={[pdf, exe]} />);
    expect(screen.getByText("QA-TEST-malicioso.exe")).toBeTruthy();
    expect(screen.getByText("upload_validation.unsupported")).toBeTruthy();
    expect(uploadButton().disabled).toBe(true);
  });

  it("validates files dropped on the modal itself", () => {
    const { container } = render(<AddDocModal ksId={1} companyId={1} onClose={() => {}} onAdded={() => {}} />);
    const zone = container.querySelector("div[style*='dashed']");
    fireEvent.drop(zone, { dataTransfer: { files: [exe] } });
    expect(screen.getByText("upload_validation.unsupported")).toBeTruthy();
    expect(uploadButton().disabled).toBe(true);
  });

  it("allows Upload when every file is valid", () => {
    render(<AddDocModal ksId={1} companyId={1} onClose={() => {}} onAdded={() => {}} initialFiles={[pdf]} />);
    expect(uploadButton().disabled).toBe(false);
  });
});
