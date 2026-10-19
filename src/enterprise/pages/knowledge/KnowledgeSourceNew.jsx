import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import { Dashboard } from "@uppy/react";
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon,
  DocumentArrowUpIcon, CheckCircleIcon as CheckCircleOutline,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { knowledgeApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import { applyUploadValidation, UPLOAD_ALLOWED_FILE_TYPES, MAX_UPLOAD_BYTES, uploadHelpText } from "@/utils/fileValidation";
import { API_BASE } from "@/services/api";
import { mapApiErrors } from "@/utils/apiError";
import { intInRange, noWheel } from "@/utils/numberInput";

// 17: bounds shared with the API (KnowledgeSourceCreateSerializer).
const NUMBER_FIELDS = {
  minimum_passing_score: [0, 100],
  estimated_duration_minutes: [1, 100000],
  cards_per_group: [1, 500],
  questions_per_group: [1, 500],
};
const STEP2_FIELDS = new Set(Object.keys(NUMBER_FIELDS).concat(["question_format", "process_type", "difficulty"]));

function FieldError({ message }) {
  return message ? <p role="alert" style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{message}</p> : null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%",
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "9px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

function useSourceTypes() {
  const { t } = useLanguage();
  return [
    { value: "policy", label: t("enterprise.knowledge.sourceNew.sourceTypes.policy") },
    { value: "procedure", label: t("enterprise.knowledge.sourceNew.sourceTypes.procedure") },
    { value: "regulation", label: t("enterprise.knowledge.sourceNew.sourceTypes.regulation") },
    { value: "manual", label: t("enterprise.knowledge.sourceNew.sourceTypes.manual") },
    { value: "training_material", label: t("enterprise.knowledge.sourceNew.sourceTypes.trainingMaterial") },
    { value: "other", label: t("enterprise.knowledge.sourceNew.sourceTypes.other") },
  ];
}

function useProcessTypes() {
  const { t } = useLanguage();
  return [
    { value: "course", label: t("enterprise.knowledge.sourceNew.processTypes.course.label"), desc: t("enterprise.knowledge.sourceNew.processTypes.course.desc") },
    { value: "tutorial", label: t("enterprise.knowledge.sourceNew.processTypes.tutorial.label"), desc: t("enterprise.knowledge.sourceNew.processTypes.tutorial.desc") },
    { value: "study_material", label: t("enterprise.knowledge.sourceNew.processTypes.studyMaterial.label"), desc: t("enterprise.knowledge.sourceNew.processTypes.studyMaterial.desc") },
  ];
}

function useDifficulties() {
  const { t } = useLanguage();
  return [
    { value: "easy", label: t("enterprise.knowledge.sources.difficulty.easy"), color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
    { value: "medium", label: t("enterprise.knowledge.sources.difficulty.medium"), color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    { value: "hard", label: t("enterprise.knowledge.sources.difficulty.hard"), color: "#f87171", bg: "rgba(239,68,68,0.1)" },
  ];
}

function useQuestionFormats() {
  const { t } = useLanguage();
  return [
    { value: "true_false", label: t("enterprise.knowledge.processDetail.batteryDialog.formatTrueFalse") },
    { value: "multiple_choice", label: t("enterprise.knowledge.processDetail.batteryDialog.formatMultipleChoice") },
    { value: "variety", label: t("enterprise.knowledge.processDetail.batteryDialog.formatVariety") },
  ];
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepBar({ current, steps }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <React.Fragment key={n}>
            <div className="flex items-center gap-2">
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: done ? "#4ade80" : active ? "var(--accent)" : "var(--bg-elevated)",
                border: `1px solid ${done ? "#4ade80" : active ? "var(--accent)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "all 200ms",
              }}>
                {done
                  ? <CheckIcon style={{ width: 13, height: 13, color: "#fff", strokeWidth: 3 }} />
                  : <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#fff" : "var(--text-tertiary)" }}>{n}</span>
                }
              </div>
              <span style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? "var(--text-primary)" : done ? "var(--text-secondary)" : "var(--text-tertiary)" }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? "rgba(74,222,128,0.4)" : "var(--border)", margin: "0 10px" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step 1: Información básica ───────────────────────────────────────────────

function Step1({ form, onChange, onNext, onCancel }) {
  const { t } = useLanguage();
  const SOURCE_TYPES = useSourceTypes();
  const [error, setError] = useState("");

  const handleNext = () => {
    if (!form.name.trim()) { setError(t("enterprise.knowledge.sourceNew.nameRequired")); return; }
    setError(""); onNext();
  };

  return (
    <div className="space-y-5">
      {/* Nombre */}
      <div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("enterprise.knowledge.sourceNew.nameLabel")}</p>
        <input
          autoFocus
          placeholder={t("enterprise.knowledge.sourceNew.namePlaceholder")}
          value={form.name}
          onChange={(e) => { onChange("name", e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleNext()}
          style={inputStyle}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        {error && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{error}</p>}
      </div>

      {/* Descripción */}
      <div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
          {t("enterprise.knowledge.sourceNew.descriptionLabel")} <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({t("enterprise.learning.paths.wizard.optional")})</span>
        </p>
        <textarea
          rows={3}
          placeholder={t("enterprise.knowledge.sourceNew.descriptionPlaceholder")}
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Tipo de fuente */}
      <div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t("enterprise.knowledge.sourceNew.sourceTypeLabel")}</p>
        <div className="grid grid-cols-2 gap-2">
          {SOURCE_TYPES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange("source_type", opt.value)}
              style={{
                background: form.source_type === opt.value ? "var(--bg-accent)" : "var(--bg-elevated)",
                border: `1px solid ${form.source_type === opt.value ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 6, padding: "8px 12px", textAlign: "left", cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: form.source_type === opt.value ? "var(--accent)" : "var(--text-primary)" }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between gap-3 pt-2">
        <button onClick={onCancel} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
        <button onClick={handleNext} className="ank-btn-accent text-xs">
          {t("enterprise.knowledge.sourceNew.next")} <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Configuración ────────────────────────────────────────────────────

function Step2({ form, onChange, onBack, onNext, saving, error, fieldErrors = {} }) {
  const { t } = useLanguage();
  const PROCESS_TYPES = useProcessTypes();
  const DIFFICULTIES = useDifficulties();
  const QUESTION_FORMATS = useQuestionFormats();
  return (
    <div className="space-y-6">
      {/* Tipo de proceso */}
      <div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t("enterprise.knowledge.sourceNew.processTypeLabel")}</p>
        <div className="grid grid-cols-1 gap-2">
          {PROCESS_TYPES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange("process_type", opt.value)}
              style={{
                background: form.process_type === opt.value ? "var(--bg-accent)" : "var(--bg-elevated)",
                border: `1px solid ${form.process_type === opt.value ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 6, padding: "10px 14px", textAlign: "left", cursor: "pointer", transition: "all 150ms",
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 13, fontWeight: 600, color: form.process_type === opt.value ? "var(--accent)" : "var(--text-primary)" }}>
                  {opt.label}
                </span>
                {form.process_type === opt.value && <CheckCircleIcon style={{ width: 16, height: 16, color: "var(--accent)" }} />}
              </div>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Dificultad */}
      <div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t("enterprise.knowledge.sourceNew.difficultyLabel")}</p>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => onChange("difficulty", d.value)}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                background: form.difficulty === d.value ? d.bg : "var(--bg-elevated)",
                border: `1px solid ${form.difficulty === d.value ? d.color : "var(--border)"}`,
                color: form.difficulty === d.value ? d.color : "var(--text-secondary)",
                fontSize: 13, fontWeight: 600, transition: "all 150ms",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Puntaje y duración */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("enterprise.knowledge.sourceNew.minScoreLabel")}</p>
          <div className="flex items-center gap-2">
            <input
              type="number" min="0" max="100" step="1" name="minimum_passing_score" {...noWheel}
              value={form.minimum_passing_score}
              onChange={(e) => onChange("minimum_passing_score", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <span style={{ color: "var(--text-tertiary)", fontSize: 13, flexShrink: 0 }}>%</span>
          </div>
          <FieldError message={fieldErrors.minimum_passing_score} />
        </div>
        <div>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("enterprise.knowledge.sourceNew.durationLabel")}</p>
          <div className="flex items-center gap-2">
            <input
              type="number" min="1" step="1" name="estimated_duration_minutes" {...noWheel} placeholder={t("enterprise.knowledge.sourceNew.durationPlaceholder")}
              value={form.estimated_duration_minutes ?? ""}
              onChange={(e) => onChange("estimated_duration_minutes", e.target.value === "" ? null : e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <span style={{ color: "var(--text-tertiary)", fontSize: 13, flexShrink: 0 }}>{t("enterprise.knowledge.sourceNew.minutesAbbr")}</span>
          </div>
          <FieldError message={fieldErrors.estimated_duration_minutes} />
        </div>
      </div>

      {/* Auto-generación: tarjetas/preguntas por grupo y formato de preguntas */}
      <div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>{t("enterprise.knowledge.sourceNew.autoGenLabel")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: 11, marginBottom: 6 }}>{t("enterprise.knowledge.sourceNew.cardsPerGroupLabel")}</p>
            <input
              type="number" min="1" max="500" step="1" name="cards_per_group" {...noWheel}
              value={form.cards_per_group}
              onChange={(e) => onChange("cards_per_group", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <FieldError message={fieldErrors.cards_per_group} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: 11, marginBottom: 6 }}>{t("enterprise.knowledge.sourceNew.questionsPerGroupLabel")}</p>
            <input
              type="number" min="1" max="500" step="1" name="questions_per_group" {...noWheel}
              value={form.questions_per_group}
              onChange={(e) => onChange("questions_per_group", e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
            <FieldError message={fieldErrors.questions_per_group} />
          </div>
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: 11, marginBottom: 6 }}>{t("enterprise.knowledge.sourceNew.questionFormatLabel")}</p>
            <select
              value={form.question_format}
              onChange={(e) => onChange("question_format", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            >
              {QUESTION_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <p style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 6 }}>{t("enterprise.knowledge.sourceNew.autoGenHint")}</p>
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "10px 14px" }}>
          <p style={{ color: "#f87171", fontSize: 12 }}>{error}</p>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <button onClick={onBack} className="ank-btn-ghost text-xs">
          <ArrowLeftIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.back")}
        </button>
        <button onClick={onNext} disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? t("enterprise.knowledge.sourceNew.creating") : <><CheckIcon className="h-3.5 w-3.5" /> {t("enterprise.knowledge.sourceNew.createProcess")}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Subir documentos con Uppy ───────────────────────────────────────

function Step3({ ksId, companyId, onFinish }) {
  const { t } = useLanguage();
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const uppyRef = useRef(null);

  const tRef = useRef(t);
  tRef.current = t;
  if (!uppyRef.current) {
    uppyRef.current = new Uppy({
      id: `ks-docs-${ksId}`,
      autoProceed: false,
      restrictions: {
        maxFileSize: MAX_UPLOAD_BYTES,
        maxNumberOfFiles: 30,
        allowedFileTypes: UPLOAD_ALLOWED_FILE_TYPES,
      },
    }).use(XHRUpload, {
      endpoint: `${API_BASE}/enterprise/knowledge-sources/${ksId}/add-document/`,
      method: "POST",
      formData: true,
      fieldName: "file",
      bundle: false,
      headers: {},
    });
    applyUploadValidation(uppyRef.current, () => tRef.current);
  }

  const uppy = uppyRef.current;

  useEffect(() => {
    const handleUpload = () => {
      const token = localStorage.getItem("token");
      uppy.getPlugin("XHRUpload").setOptions({
        endpoint: `${API_BASE}/enterprise/knowledge-sources/${ksId}/add-document/?company_id=${companyId}`,
        headers: { Authorization: `Token ${token}` },
      });
    };

    const handleSuccess = (file, response) => {
      const doc = response?.body?.documents?.slice(-1)[0];
      if (doc) setUploadedDocs((prev) => [...prev, doc]);
    };

    uppy.on("upload", handleUpload);
    uppy.on("upload-success", handleSuccess);
    return () => {
      uppy.off("upload", handleUpload);
      uppy.off("upload-success", handleSuccess);
    };
  }, [uppy, ksId, companyId]);

  return (
    <div className="space-y-4">
      <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6 }}>
        {t("enterprise.knowledge.sourceNew.step3.intro")}
      </p>

      <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
        <Dashboard
          uppy={uppy}
          width="100%"
          height={360}
          inline
          proudlyDisplayPoweredByUppy={false}
          showProgressDetails
          note={uploadHelpText(t)}
          theme="dark"
        />
      </div>

      {uploadedDocs.length > 0 && (
        <div className="space-y-1.5">
          {uploadedDocs.map((doc) => (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 6 }}>
              <CheckCircleOutline style={{ width: 14, height: 14, color: "#4ade80", flexShrink: 0 }} />
              <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 600 }}>{doc.filename}</span>
              <span style={{ color: "var(--text-tertiary)", fontSize: 11, marginLeft: "auto" }}>{doc.type?.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onFinish} className="ank-btn-ghost text-xs">
          {t("enterprise.knowledge.sourceNew.step3.skip")}
        </button>
        <button onClick={onFinish} className="ank-btn-accent text-xs">
          <DocumentArrowUpIcon className="h-3.5 w-3.5" />
          {uploadedDocs.length > 0 ? t("enterprise.knowledge.sourceNew.step3.finishWithCount", { count: uploadedDocs.length, plural: uploadedDocs.length !== 1 ? "s" : "" }) : t("enterprise.knowledge.sourceNew.step3.finish")}
        </button>
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function KnowledgeSourceNew() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { activeCompanyId, activeCompany } = useEnterprise();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdKsId, setCreatedKsId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    source_type: "other",
    process_type: "course",
    difficulty: "medium",
    minimum_passing_score: 70,
    estimated_duration_minutes: null,
    // Auto-generation preferences (flashcards + battery) — sent with the
    // create payload below and used as the defaults for this proceso's
    // auto-generate runs.
    cards_per_group: 20,
    questions_per_group: 15,
    question_format: "multiple_choice",
  });

  const onChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setFieldErrors((errs) => (errs[field] ? { ...errs, [field]: undefined } : errs));
  };

  const validateNumbers = () => {
    const errs = {};
    for (const [field, [min, max]] of Object.entries(NUMBER_FIELDS)) {
      const value = form[field];
      if (field === "estimated_duration_minutes" && (value === null || value === "")) continue;
      const problem = intInRange(value, min, max);
      if (problem) errs[field] = t(`enterprise.knowledge.sourceNew.numberError.${problem}`, { min, max });
    }
    return errs;
  };

  const handleCreateKS = async () => {
    if (saving) return;
    if (!form.name.trim()) { setError(t("enterprise.knowledge.sourceNew.nameRequiredShort")); return; }
    const errs = validateNumbers();
    setFieldErrors(errs);
    if (Object.keys(errs).length) { setError(""); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        title: form.name.trim(),
        description: form.description.trim(),
        source_type: form.source_type,
        process_type: form.process_type,
        difficulty: form.difficulty,
        minimum_passing_score: Number(form.minimum_passing_score),
        ...(form.estimated_duration_minutes && { estimated_duration_minutes: Number(form.estimated_duration_minutes) }),
        cards_per_group: Number(form.cards_per_group),
        questions_per_group: Number(form.questions_per_group),
        question_format: form.question_format,
      };
      const created = await knowledgeApi.create(payload);
      setCreatedKsId(created.id);
      setStep(3);
    } catch (err) {
      // 17: show DRF errors next to their field; anything else (e.g. title) in the banner.
      const { fields, general } = mapApiErrors(err, { title: "name" });
      const onStep2 = Object.fromEntries(Object.entries(fields).filter(([k]) => STEP2_FIELDS.has(k)));
      const elsewhere = Object.entries(fields).filter(([k]) => !STEP2_FIELDS.has(k));
      setFieldErrors(onStep2);
      setError(
        general
        || (elsewhere[0] && `${elsewhere[0][0] === "name" ? t("enterprise.knowledge.sourceNew.nameLabel") : elsewhere[0][0]}: ${elsewhere[0][1]}`)
        || (Object.keys(onStep2).length ? "" : t("enterprise.knowledge.sourceNew.createError"))
      );
    } finally {
      setSaving(false);
    }
  };

  const STEP_LABELS = [
    t("enterprise.knowledge.sourceNew.steps.info"),
    t("enterprise.knowledge.sourceNew.steps.config"),
    t("enterprise.knowledge.sourceNew.steps.documents"),
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/enterprise/knowledge")}
          className="flex items-center gap-1.5 text-xs mb-4 cursor-pointer transition-opacity hover:opacity-70"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" /> {t("enterprise.knowledge.sourceNew.backToProcesses")}
        </button>
        <h1 style={{ color: "var(--text-primary)" }} className="text-xl font-bold">{t("enterprise.knowledge.sources.newProcess")}</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-0.5">
          {t("enterprise.knowledge.sourceNew.subtitle")}
        </p>
      </div>

      {/* Step bar */}
      <StepBar current={step} steps={STEP_LABELS} />

      {/* Card */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "24px" }}>
        <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 16 }}>
          {t("enterprise.knowledge.sourceNew.stepLabel", { n: step, name: STEP_LABELS[step - 1] })}
        </p>

        {step === 1 && (
          <Step1
            form={form}
            onChange={onChange}
            onNext={() => setStep(2)}
            onCancel={() => navigate("/enterprise/knowledge")}
          />
        )}
        {step === 2 && (
          <Step2
            form={form}
            onChange={onChange}
            onBack={() => setStep(1)}
            onNext={handleCreateKS}
            saving={saving}
            error={error}
            fieldErrors={fieldErrors}
          />
        )}
        {step === 3 && createdKsId && (
          <Step3
            ksId={createdKsId}
            companyId={activeCompanyId}
            onFinish={() => navigate(`/enterprise/knowledge/${createdKsId}`)}
          />
        )}
      </div>

      {/* Footer info */}
      <div
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 14px" }}
        className="flex items-center justify-between"
      >
        <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
          {t("enterprise.knowledge.sourceNew.company")} <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{activeCompany?.company_name || `ID ${activeCompanyId}`}</span>
        </p>
        {createdKsId && (
          <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
            {t("enterprise.knowledge.sourceNew.processId")} <span style={{ color: "#4ade80", fontWeight: 600 }}>{createdKsId}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export default KnowledgeSourceNew;
