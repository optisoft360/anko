import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
vi.mock("../../../context/language-context", () => ({ useLanguage: () => ({ t: (k) => k, language: "en" }) }));
vi.mock("../../context/enterprise-context", () => ({ useEnterprise: () => ({ activeCompanyId: 1 }) }));
const api = vi.hoisted(() => ({
  getPrograms: vi.fn(), getPaths: vi.fn(), publishProgram: vi.fn(), getProgramVersions: vi.fn(),
}));
vi.mock("../../api/enterpriseApi", () => ({ learningApi: api }));

const { TrainingPrograms, buildPublishVersionPayload } = await import("./TrainingPrograms.jsx");

describe("Training Programs — publish version (F-10)", () => {
  it("sends learning_path_id as a number", () => {
    expect(buildPublishVersionPayload("2", "")).toEqual({ learning_path_id: 2, notes: "" });
  });

  it("shows the backend field error and keeps the modal open", async () => {
    api.getPrograms.mockResolvedValue([{ id: 7, name: "QA-TEST Programa", status: "draft", version_count: 1, current_version_number: 1 }]);
    api.getPaths.mockResolvedValue([{ id: 2, name: "QA-TEST Ruta" }]);
    api.publishProgram.mockRejectedValue({ learning_path_id: ["Only a published learning path can be used for a version."] });
    render(<TrainingPrograms />);
    fireEvent.click(await screen.findByText("enterprise.learning.trainingPrograms.newVersion"));
    fireEvent.change(await screen.findByRole("combobox"), { target: { value: "2" } });
    await screen.findByText("QA-TEST Ruta");
    fireEvent.click(screen.getByText("enterprise.learning.trainingPrograms.publishModal.publishVersion"));
    expect(await screen.findByText(/Only a published learning path/)).toBeTruthy();
    expect(api.publishProgram).toHaveBeenCalledWith(7, { learning_path_id: 2, notes: "" });
  });
});
