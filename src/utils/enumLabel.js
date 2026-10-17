import { useLanguage } from "@/context/language-context";

// The API returns stable enum keys ("course", "easy", "pending"…). The UI must only
// show translated labels for them, never the raw value (F-03).

export const UNKNOWN_ENUM_LABEL = "—";
const warned = new Set();

/**
 * Label for `value` from a `{ key: label }` map. Unknown keys render a neutral
 * placeholder and log one console warning per field/value.
 */
export function enumLabel(labels, value, field = "value") {
  if (value === null || value === undefined || value === "") return "";
  if (Object.prototype.hasOwnProperty.call(labels, value)) return labels[value];
  const id = `${field}:${value}`;
  if (!warned.has(id)) {
    warned.add(id);
    console.warn(`[enumLabel] Unknown ${field} "${value}" received from the API`);
  }
  return UNKNOWN_ENUM_LABEL;
}

/** Translated labels for knowledge-source (process) enums. */
export function useKnowledgeEnumLabels() {
  const { t } = useLanguage();
  const processTypes = {
    course: t("enterprise.knowledge.sources.types.course"),
    tutorial: t("enterprise.knowledge.sources.types.tutorial"),
    study_material: t("enterprise.knowledge.sources.types.studyMaterial"),
  };
  const difficulties = {
    easy: t("enterprise.knowledge.sources.difficulty.easy"),
    medium: t("enterprise.knowledge.sources.difficulty.medium"),
    hard: t("enterprise.knowledge.sources.difficulty.hard"),
  };
  const sourceTypes = {
    policy: t("enterprise.knowledge.sourceNew.sourceTypes.policy"),
    procedure: t("enterprise.knowledge.sourceNew.sourceTypes.procedure"),
    regulation: t("enterprise.knowledge.sourceNew.sourceTypes.regulation"),
    manual: t("enterprise.knowledge.sourceNew.sourceTypes.manual"),
    training_material: t("enterprise.knowledge.sourceNew.sourceTypes.trainingMaterial"),
    other: t("enterprise.knowledge.sourceNew.sourceTypes.other"),
  };
  return {
    processType: (v) => enumLabel(processTypes, v, "process_type"),
    difficulty: (v) => enumLabel(difficulties, v, "difficulty"),
    sourceType: (v) => enumLabel(sourceTypes, v, "source_type"),
  };
}
