import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { enumLabel, useKnowledgeEnumLabels } from "@/utils/enumLabel";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeftIcon, PlusIcon, DocumentArrowUpIcon,
  SparklesIcon, ViewColumnsIcon, BoltIcon,
  ArrowPathIcon, XMarkIcon, CheckCircleIcon,
  ExclamationTriangleIcon, ClockIcon, PlayIcon, ArrowDownTrayIcon, TrashIcon,
  BookOpenIcon, MagnifyingGlassIcon, FunnelIcon, ChevronDownIcon, ChevronRightIcon,
  EllipsisVerticalIcon, ArrowUpTrayIcon, Bars3Icon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/context/auth-context";
import { collectionApi } from "../../api/enterpriseApi";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { knowledgeApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import { API_BASE } from "@/services/api";
import { ExamSimulatorDialog } from "@/widgets/dialogs/index";
import { FlashcardViewDialog } from "@/widgets/dialogs/flashcard-view-dialog";
import { FlashcardLearnDialog } from "@/widgets/dialogs/flashcard-learn-dialog";
import projectService from "@/services/projectService";
import { UPLOAD_ACCEPT, uploadErrorMessage, uploadHelpText, validateUploadFile } from "@/utils/fileValidation";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  course:         { bg: "rgba(94,106,210,0.15)", text: "#8B9CF4" },
  tutorial:       { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  study_material: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b" },
};

const DIFF_COLORS = {
  easy:   { bg: "rgba(74,222,128,0.12)", text: "#4ade80" },
  medium: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b" },
  hard:   { bg: "rgba(239,68,68,0.12)",  text: "#f87171" },
};

const STATUS_BG = {
  pending:    { bg: "rgba(255,255,255,0.07)", text: "#8B8B9C" },
  processing: { bg: "rgba(94,106,210,0.15)", text: "#8B9CF4" },
  processed:  { bg: "rgba(74,222,128,0.12)", text: "#4ade80" },
  failed:     { bg: "rgba(239,68,68,0.12)",  text: "#f87171" },
};

function useSourceLabels() {
  const { t } = useLanguage();
  return {
    policy: t("enterprise.knowledge.sourceNew.sourceTypes.policy"),
    procedure: t("enterprise.knowledge.sourceNew.sourceTypes.procedure"),
    regulation: t("enterprise.knowledge.sourceNew.sourceTypes.regulation"),
    manual: t("enterprise.knowledge.sourceNew.sourceTypes.manual"),
    training_material: t("enterprise.knowledge.sourceNew.sourceTypes.trainingMaterial"),
    other: t("enterprise.knowledge.sourceNew.sourceTypes.other"),
  };
}

function useTypeLabels() {
  const { t } = useLanguage();
  return {
    course: t("enterprise.knowledge.sources.types.course"),
    tutorial: t("enterprise.knowledge.sources.types.tutorial"),
    study_material: t("enterprise.knowledge.sources.types.studyMaterial"),
  };
}

function useStatusLabels() {
  const { t } = useLanguage();
  return {
    pending: t("enterprise.knowledge.sourceDetail.status.pending"),
    processing: t("enterprise.knowledge.sourceDetail.status.processing"),
    processed: t("enterprise.knowledge.sourceDetail.status.processed"),
    failed: t("enterprise.knowledge.processDetail.status.error"),
  };
}

function useStageLabels() {
  const { t } = useLanguage();
  return {
    prepare: t("enterprise.knowledge.processDetail.stages.prepare"),
    preflight: t("enterprise.knowledge.processDetail.stages.preflight"),
    process_document: t("enterprise.knowledge.processDetail.stages.processDocument"),
    aggregate_unique_tags: t("enterprise.knowledge.processDetail.stages.aggregateTags"),
    partition_tags: t("enterprise.knowledge.processDetail.stages.partitionTags"),
    generate_flashcards: t("enterprise.knowledge.processDetail.stages.generateFlashcards"),
    generate_battery: t("enterprise.knowledge.processDetail.stages.generateBattery"),
    finalize: t("enterprise.knowledge.processDetail.stages.finalize"),
    finalize_outputs: t("enterprise.knowledge.processDetail.stages.finalize"),
    prepare_sources: t("enterprise.knowledge.processDetail.stages.prepareSources"),
    generate_questions: t("enterprise.knowledge.processDetail.stages.generateBattery"),
    finalize_deck: t("enterprise.knowledge.processDetail.stages.finalizeDeck"),
    finalize_battery: t("enterprise.knowledge.processDetail.stages.finalizeBattery"),
  };
}

const TERMINAL_STATUSES = new Set([
  "success", "completed", "completed_with_errors", "complete with errors", "complete",
  "terminado",
  "failed", "canceled", "cancelled",
]);
const SUCCESS_STATUSES = new Set([
  "success", "completed", "completed_with_errors", "complete with errors", "complete",
  "terminado",
]);
const FAILED_STATUSES  = new Set(["failed"]);
const CANCEL_STATUSES  = new Set(["canceled", "cancelled"]);

// ─── Small helpers ────────────────────────────────────────────────────────────

function Pill({ label, style }) {
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, ...style }}>{label}</span>;
}

function TabButton({ label, icon: Icon, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "8px 14px", borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
      color: active ? "var(--text-primary)" : "var(--text-tertiary)",
      fontWeight: active ? 600 : 500, fontSize: 12.5, cursor: "pointer",
      background: "transparent", transition: "color 150ms, border-color 150ms", whiteSpace: "nowrap",
    }}>
      <Icon style={{ width: 14, height: 14 }} />
      {label}
      {count != null && (
        <span style={{ background: active ? "var(--accent-muted)" : "var(--bg-elevated)", color: active ? "var(--accent)" : "var(--text-tertiary)", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({ icon: Icon, title, message, cta, onCta }) {
  return (
    <div className="flex flex-col items-center py-14 text-center">
      <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <Icon style={{ width: 26, height: 26, color: "var(--text-tertiary)" }} />
      </div>
      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>{title}</p>
      <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 3, maxWidth: 280, lineHeight: 1.6 }}>{message}</p>
      {cta && (
        <button onClick={onCta} className="ank-btn-accent text-xs mt-4">
          <PlusIcon className="h-3.5 w-3.5" /> {cta}
        </button>
      )}
    </div>
  );
}

// ─── Auto-Generate Banner (inline, collapsible, non-blocking) ─────────────────

const STEP_STATUS_DOT = {
  success:   { color: "#4ade80" },
  terminado: { color: "#4ade80" },
  running:   { color: "var(--accent)", spin: true },
  failed:    { color: "#f87171" },
  pending:   { color: "rgba(255,255,255,0.2)" },
  queued:    { color: "rgba(255,255,255,0.2)" },
  skipped:   { color: "rgba(255,255,255,0.2)" },
};

function AutoGenBanner({ runState, collapsed, onToggle, onDismiss, onStop }) {
  const { status, progress, message, stage, artifacts, steps, error } = runState;
  const navigate = useNavigate();
  const { t } = useLanguage();
  const STAGE_LABELS = useStageLabels();

  const isTerminal = TERMINAL_STATUSES.has(status);
  const isSuccess  = SUCCESS_STATUSES.has(status);
  const isFailed   = FAILED_STATUSES.has(status);
  const isCanceled = CANCEL_STATUSES.has(status);

  const decks     = artifacts.filter((a) => a.artifact_type === "deck");
  const batteries = artifacts.filter((a) => a.artifact_type === "battery");

  const accentColor = isFailed ? "#f87171" : isCanceled ? "#f59e0b" : isSuccess ? "#4ade80" : "var(--accent)";
  const borderColor = isFailed ? "rgba(239,68,68,0.3)" : isCanceled ? "rgba(245,158,11,0.3)" : isSuccess ? "rgba(74,222,128,0.25)" : "rgba(94,106,210,0.35)";
  const bgColor     = isFailed ? "rgba(239,68,68,0.07)" : isCanceled ? "rgba(245,158,11,0.05)" : isSuccess ? "rgba(74,222,128,0.06)" : "rgba(94,106,210,0.08)";

  const deckWord = decks.length !== 1 ? t("enterprise.knowledge.processDetail.banner.decksWord") : t("enterprise.knowledge.processDetail.banner.deckWord");
  const batteryWord = batteries.length !== 1 ? t("enterprise.knowledge.processDetail.banner.batteriesWord") : t("enterprise.knowledge.processDetail.banner.batteryWord");
  const topLabel = isFailed   ? t("enterprise.knowledge.processDetail.banner.failed") :
                   isCanceled ? t("enterprise.knowledge.processDetail.banner.canceled") :
                   isSuccess  ? t("enterprise.knowledge.processDetail.banner.ready", { decks: decks.length, deckWord, batteries: batteries.length, batteryWord }) :
                   (STAGE_LABELS[stage] || message || t("enterprise.knowledge.processDetail.banner.generating"));

  return (
    <div style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 8, overflow: "hidden", transition: "all 200ms" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3" style={{ padding: "10px 14px" }}>
        {!isTerminal && <ArrowPathIcon style={{ width: 13, height: 13, color: accentColor, flexShrink: 0 }} className="animate-spin" />}
        {isFailed   && <ExclamationTriangleIcon style={{ width: 13, height: 13, color: accentColor, flexShrink: 0 }} />}
        {isCanceled && <XMarkIcon style={{ width: 13, height: 13, color: accentColor, flexShrink: 0 }} />}
        {isSuccess  && <CheckCircleSolid style={{ width: 13, height: 13, color: accentColor, flexShrink: 0 }} />}

        <span style={{ fontSize: 12, fontWeight: 600, color: accentColor, flexShrink: 0 }}>{topLabel}</span>

        {/* Progress bar */}
        {!isTerminal && (
          <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: accentColor, borderRadius: 2, transition: "width 600ms ease" }} />
          </div>
        )}
        {!isTerminal && (
          <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, flexShrink: 0 }}>{Math.round(progress)}%</span>
        )}

        {isTerminal && <div style={{ flex: 1 }} />}

        {/* Stop */}
        {!isTerminal && onStop && (
          <button onClick={onStop}
            style={{ color: "#f87171", cursor: "pointer", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
            title={t("enterprise.knowledge.processDetail.banner.stopTitle")}>
            {t("enterprise.knowledge.processDetail.banner.stop")}
          </button>
        )}

        {/* Toggle */}
        <button onClick={onToggle}
          style={{ color: "var(--text-tertiary)", cursor: "pointer", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}>
          {collapsed ? t("enterprise.knowledge.processDetail.banner.view") : t("enterprise.knowledge.processDetail.banner.hide")}
        </button>

        {/* Dismiss */}
        {isTerminal && (
          <button onClick={onDismiss} style={{ color: "var(--text-tertiary)", cursor: "pointer", flexShrink: 0 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}>
            <XMarkIcon style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Expandable body */}
      {!collapsed && (
        <div style={{ padding: "0 14px 14px", borderTop: `1px solid ${borderColor}` }}>

          {/* Running: steps pipeline */}
          {!isTerminal && steps.length > 0 && (
            <div className="space-y-1 mt-3">
              {steps.map((s) => {
                const dot = STEP_STATUS_DOT[s.status] || STEP_STATUS_DOT.pending;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: s.status === "running" ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: s.status === "running" ? 600 : 400, flex: 1 }} className="truncate">
                      {enumLabel(STAGE_LABELS, s.step_key, "step_key")}
                      {s.item_key ? ` (${s.item_key})` : ""}
                    </span>
                    {s.progress_percent != null && s.status === "running" && (
                      <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>{s.progress_percent}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!isTerminal && steps.length === 0 && (
            <p style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 10 }}>
              {message || t("enterprise.knowledge.processDetail.banner.mayTakeMinutes")}
            </p>
          )}

          {/* Failed */}
          {isFailed && (
            <p style={{ color: "#f87171", fontSize: 12, marginTop: 10, opacity: 0.85 }}>{error || message || t("enterprise.knowledge.processDetail.unexpectedError")}</p>
          )}

          {/* Canceled */}
          {isCanceled && (
            <p style={{ color: "#f59e0b", fontSize: 12, marginTop: 10, opacity: 0.85 }}>{t("enterprise.knowledge.processDetail.banner.canceledMessage")}</p>
          )}

          {/* Success results */}
          {isSuccess && (decks.length > 0 || batteries.length > 0) && (
            <div className="space-y-3 mt-3">
              {status === "completed_with_errors" && (
                <p style={{ color: "#f59e0b", fontSize: 11 }}>{t("enterprise.knowledge.processDetail.banner.partialFailure")}</p>
              )}
              <div className="grid grid-cols-1 gap-1.5">
                {[...decks.map((a) => ({ ...a, _t: "deck" })), ...batteries.map((a) => ({ ...a, _t: "battery" }))].map((a) => {
                  const title = a.payload?.title || a.payload?.deck_id && `Deck #${a.payload.deck_id}` || a.payload?.battery_id && `${t("enterprise.knowledge.processDetail.battery")} #${a.payload.battery_id}` || `${a._t === "deck" ? "Deck" : t("enterprise.knowledge.processDetail.battery")} #${a.resource_id}`;
                  const href  = a._t === "deck" ? `/decks/${a.resource_id}` : `/batteries/${a.resource_id}`;
                  return (
                    <button key={`${a._t}-${a.resource_id}`}
                      onClick={() => navigate(href)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 5, cursor: "pointer", textAlign: "left", width: "100%" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}>
                      {a._t === "deck"
                        ? <ViewColumnsIcon style={{ width: 12, height: 12, color: "var(--accent)", flexShrink: 0 }} />
                        : <BoltIcon style={{ width: 12, height: 12, color: "#f59e0b", flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, flex: 1 }} className="truncate">{title}</span>
                      <span style={{ fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0, textTransform: "capitalize" }}>{a._t}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Document Modal ───────────────────────────────────────────────────────

export function AddDocModal({ ksId, companyId, onClose, onAdded, initialFiles = [] }) {
  const { t } = useLanguage();
  // Every picked/dropped file is listed; rejected ones carry their reason and block "Upload".
  const [entries, setEntries] = useState([]);
  const files = entries.filter((e) => !e.error).map((e) => e.file);
  const hasRejected = entries.some((e) => e.error);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const selectFiles = (list) => {
    setError("");
    setEntries(Array.from(list || []).map((file) => {
      const code = validateUploadFile(file);
      return { file, error: code ? uploadErrorMessage(code, t) : null };
    }));
  };

  useEffect(() => {
    if (initialFiles.length) selectFiles(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    // Never send anything while a selected file fails the client-side policy.
    if (!files.length || hasRejected) return;
    setUploading(true); setError("");
    const done = [];
    for (const file of files) {
      try {
        const form = new FormData();
        form.append("file", file);
        const token = localStorage.getItem("token");
        const res = await fetch(
          `${API_BASE}/enterprise/knowledge-sources/${ksId}/add-document/?company_id=${companyId}`,
          { method: "POST", headers: { Authorization: `Token ${token}` }, body: form }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          done.push({ name: file.name, ok: false, reason: typeof body?.detail === "string" ? body.detail : "" });
          continue;
        }
        const data = await res.json();
        done.push({ name: file.name, ok: true, ks: data });
      } catch {
        done.push({ name: file.name, ok: false });
      }
    }
    setResults(done);
    setUploading(false);
    const lastKs = done.filter((d) => d.ok).slice(-1)[0]?.ks;
    if (lastKs) onAdded(lastKs);
  };

  const allDone = results.length > 0 && !uploading;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "24px", width: "100%", maxWidth: 420 }}>
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{t("enterprise.knowledge.processDetail.addDocModal.title")}</h2>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)", cursor: "pointer" }}>
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {!allDone ? (
          <div className="space-y-4">
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); selectFiles(e.dataTransfer.files); }}
              style={{ border: "2px dashed var(--border)", borderRadius: 8, padding: "28px 20px", textAlign: "center", cursor: "pointer", transition: "border-color 150ms" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>
              <DocumentArrowUpIcon style={{ width: 28, height: 28, color: "var(--text-tertiary)", margin: "0 auto 8px" }} />
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>
                {entries.length > 0 ? t("enterprise.knowledge.processDetail.addDocModal.filesSelected", { count: entries.length, plural: entries.length !== 1 ? "s" : "" }) : t("enterprise.knowledge.processDetail.addDocModal.clickOrDrag")}
              </p>
              <p style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 3 }}>{uploadHelpText(t)}</p>
            </div>
            <input ref={inputRef} type="file" multiple accept={UPLOAD_ACCEPT} style={{ display: "none" }}
              onChange={(e) => { selectFiles(e.target.files); e.target.value = ""; }} />

            {entries.length > 0 && (
              <div className="space-y-1">
                {entries.map(({ file: f, error: reason }, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0" }}>
                    {reason
                      ? <ExclamationTriangleIcon style={{ width: 12, height: 12, color: "#f87171", flexShrink: 0, marginTop: 2 }} />
                      : <DocumentArrowUpIcon style={{ width: 12, height: 12, color: "var(--text-tertiary)", flexShrink: 0, marginTop: 2 }} />}
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: reason ? "#f87171" : "var(--text-secondary)", display: "block" }} className="truncate">{f.name}</span>
                      {reason && <span style={{ fontSize: 11, color: "#f87171" }}>{reason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p style={{ color: "#f87171", fontSize: 12 }}>{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
              <button onClick={handleUpload} disabled={!files.length || hasRejected || uploading} className="ank-btn-accent text-xs"
                style={{ opacity: !files.length || hasRejected || uploading ? 0.6 : 1 }}>
                {uploading ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> {t("enterprise.knowledge.processDetail.addDocModal.uploading")}</> : <><DocumentArrowUpIcon className="h-3.5 w-3.5" /> {t("enterprise.knowledge.processDetail.addDocModal.upload")}</>}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-5">
            {results.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: r.ok ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${r.ok ? "rgba(74,222,128,0.2)" : "rgba(239,68,68,0.2)"}`, borderRadius: 6 }}>
                {r.ok
                  ? <CheckCircleSolid style={{ width: 14, height: 14, color: "#4ade80", flexShrink: 0 }} />
                  : <ExclamationTriangleIcon style={{ width: 14, height: 14, color: "#f87171", flexShrink: 0 }} />}
                <span style={{ fontSize: 12, color: r.ok ? "#4ade80" : "#f87171", fontWeight: 600 }} className="truncate">{r.name}{r.reason ? ` — ${r.reason}` : ""}</span>
              </div>
            ))}
            <div className="flex justify-end pt-3">
              <button onClick={onClose} className="ank-btn-accent text-xs">{t("enterprise.knowledge.processDetail.addDocModal.done")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Documents Tab ────────────────────────────────────────────────────────────

function DocumentsTab({ docs, onAdd, onAutoGen, genStatus }) {
  const isRunning = genStatus === "running";

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center py-14 text-center">
        <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <DocumentArrowUpIcon style={{ width: 26, height: 26, color: "var(--text-tertiary)" }} />
        </div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>No hay documentos asociados</p>
        <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 3, maxWidth: 300, lineHeight: 1.6 }}>
          Adjunta los documentos fuente de este proceso — PDFs, manuales, presentaciones.
          Al hacerlo, se generarán automáticamente tópicos, flashcards y baterías.
        </p>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={onAdd} className="ank-btn-accent text-xs">
            <PlusIcon className="h-3.5 w-3.5" /> Adjuntar documento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
          {docs.length} documento{docs.length !== 1 ? "s" : ""} adjunto{docs.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <button onClick={onAdd} className="ank-btn-ghost text-xs">
            <PlusIcon className="h-3.5 w-3.5" /> Agregar
          </button>
          <button
            onClick={onAutoGen}
            disabled={isRunning}
            className="ank-btn-accent text-xs"
            style={{ opacity: isRunning ? 0.7 : 1 }}>
            {isRunning
              ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Generando…</>
              : <><SparklesIcon className="h-3.5 w-3.5" /> Auto-generar todo</>}
          </button>
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-1.5">
        {docs.map((doc) => (
          <div key={doc.id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "11px 14px", display: "flex", alignItems: "center", gap: 3 }}>
            <DocumentArrowUpIcon style={{ width: 14, height: 14, color: "var(--text-secondary)", flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }} className="truncate">{doc.filename}</p>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                {doc.type?.toUpperCase()}
                {doc.size ? ` · ${(doc.size / 1024 / 1024).toFixed(1)} MB` : ""}
                {doc.added_by ? ` · por ${doc.added_by}` : ""}
                {doc.version_note ? ` · ${doc.version_note}` : ""}
              </p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: doc.status === "ready" ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.07)", color: doc.status === "ready" ? "#4ade80" : "#8B8B9C", flexShrink: 0 }}>
              {doc.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Topics Tab ───────────────────────────────────────────────────────────────

function TopicsTab({ topics, loading }) {
  if (loading) return (
    <div className="flex justify-center py-14">
      <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-6 h-6 border-2 rounded-full animate-spin" />
    </div>
  );

  if (!topics.length) return (
    <EmptyState
      icon={SparklesIcon}
      title="Sin tópicos generados"
      message="Los tópicos se generan automáticamente al procesar los documentos con IA. Usa 'Auto-generar' para crearlos."
    />
  );

  return (
    <div className="space-y-2">
      {topics.map((group) => (
        <div key={group.id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "12px 14px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Grupo {group.id} — {group.tags.length} temas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "rgba(94,106,210,0.15)", color: "#8B9CF4", fontWeight: 500 }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
// ─── Decks / Batteries Tabs ───────────────────────────────────────────────────

function ConfirmDeleteDialog({ target, onConfirm, onCancel, deleting }) {
  const { t } = useLanguage();
  if (!target) return null;
  const isDeck = target._kind === "deck";
  const isTopic = target._kind === "topic";
  const label = isTopic ? target.label : (target.name || target.title || `${isDeck ? "Deck" : "Battery"} #${target.id}`);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#0F172A", border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 16, padding: "28px 24px", maxWidth: 420, width: "100%",
        boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
      }}>
        {/* Icon */}
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <TrashIcon style={{ width: 22, height: 22, color: "#EF4444" }} />
        </div>
        {/* Title */}
        <p style={{ fontSize: 17, fontWeight: 800, color: "#F1F5F9", marginBottom: 8 }}>
          {isTopic ? t("enterprise.knowledge.processDetail.deleteDialog.titleTopic") : isDeck ? t("enterprise.knowledge.processDetail.deleteDialog.titleDeck") : t("enterprise.knowledge.processDetail.deleteDialog.titleBattery")}
        </p>
        {/* Body */}
        <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, marginBottom: 6 }}>
          {t("enterprise.knowledge.processDetail.deleteDialog.willDelete")}
        </p>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", marginBottom: 6, padding: "8px 12px", background: "rgba(255,255,255,0.05)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.55, marginBottom: 24 }}>
          {isTopic
            ? t("enterprise.knowledge.processDetail.deleteDialog.topicBody", { decks: target.deckCount, batteries: target.batteryCount })
            : isDeck
            ? t("enterprise.knowledge.processDetail.deleteDialog.deckBody")
            : t("enterprise.knowledge.processDetail.deleteDialog.batteryBody")}
        </p>
        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={deleting}
            style={{ flex: 1, padding: "11px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8", fontWeight: 700, fontSize: 13, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.5 : 1, transition: "opacity 0.15s" }}>
            {t("enterprise.compliance.programs.cancel")}
          </button>
          <button onClick={onConfirm} disabled={deleting}
            style={{ flex: 1, padding: "11px", borderRadius: 10, background: deleting ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: deleting ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "opacity 0.15s" }}>
            {deleting
              ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff" }} className="animate-spin" />{t("enterprise.knowledge.sources.deleteDialog.deleting")}</>
              : <><TrashIcon style={{ width: 14, height: 14 }} />{t("enterprise.knowledge.processDetail.deleteDialog.delete")}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function EnterpriseBatteryCard({ battery, onSimulate, onDelete }) {
  const [downloading, setDownloading] = useState(false);

  const diffKey = (battery.difficulty || "medium").toLowerCase();
  const diff = DIFF_COLORS[diffKey] || DIFF_COLORS.medium;

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try { await projectService.downloadBatteryPdf(battery.id, "es"); } catch {}
    finally { setDownloading(false); }
  };

  const visLabel = battery.visibility === "public" ? "PUBLIC" : battery.visibility === "shared" ? "SHARED" : "PRIVATE";

  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10,
      padding: "16px", display: "flex", flexDirection: "column", gap: 10,
      transition: "border-color 0.15s",
    }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#f59e0b")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {/* Row 1: visibility + date + download */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(94,106,210,0.18)", color: "#8B9CF4", letterSpacing: "0.04em" }}>
          VISIBILITY: {visLabel}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)" }}>{formatDate(battery.created_at)}</span>
        <button onClick={handleDownload} disabled={downloading}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)", opacity: downloading ? 0.5 : 1 }}
          title="Descargar PDF">
          <ArrowDownTrayIcon style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {/* Row 2: badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: diff.bg, color: diff.text }}>
          <BoltIcon style={{ width: 11, height: 11 }} />
          {(battery.difficulty || "Medium").charAt(0).toUpperCase() + (battery.difficulty || "medium").slice(1).toLowerCase()}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, background: "rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
          {battery.question_count ?? 0} QUESTIONS
        </span>
      </div>

      {/* Name */}
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.35, margin: 0 }}>
        {battery.name || battery.title || `Battery #${battery.id}`}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onSimulate(battery)}
          style={{
            flex: 1, padding: "10px", borderRadius: 8,
            background: "linear-gradient(135deg, #3949AB 0%, #5C6BC0 100%)",
            color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <PlayIcon style={{ width: 14, height: 14 }} />
          Simular
        </button>
        <button
          onClick={() => onDelete(battery)}
          title="Eliminar batería"
          style={{
            padding: "10px 12px", borderRadius: 8,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#EF4444", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}
        >
          <TrashIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
}

function BatteriesTab({ batteries, loading, emptyMessage, onSimulate, onDelete }) {
  if (loading) return <div className="flex justify-center py-14"><div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-6 h-6 border-2 rounded-full animate-spin" /></div>;
  if (!batteries.length) return <EmptyState icon={BoltIcon} title="Sin baterías generadas" message={emptyMessage} />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {batteries.map((battery) => (
        <EnterpriseBatteryCard key={battery.id} battery={battery} onSimulate={onSimulate} onDelete={onDelete} />
      ))}
    </div>
  );
}

function EnterpriseDeckCard({ deck, onStudy, onLearn }) {
  const [downloading, setDownloading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryUnavailable, setSummaryUnavailable] = useState(false);

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try { await projectService.downloadDeckPdf(deck.id, "es"); } catch {}
    finally { setDownloading(false); }
  };

  const handleToggleSummary = async (e) => {
    e.stopPropagation();
    if (showSummary) { setShowSummary(false); return; }
    if (summary) { setShowSummary(true); return; }
    setSummaryUnavailable(false);
    setLoadingSummary(true);
    try {
      const data = await projectService.getDeckSummary(deck.id, "es");
      if (data?.summary) { setSummary(data.summary); setShowSummary(true); }
      else { setSummaryUnavailable(true); }
    } catch {
      setSummaryUnavailable(true);
    }
    finally { setLoadingSummary(false); }
  };

  const vis = deck.visibility || "private";
  const visMap = {
    public:  { label: "PUBLIC",  bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
    shared:  { label: "SHARED",  bg: "rgba(56,189,248,0.12)",  color: "#38BDF8" },
    private: { label: "PRIVATE", bg: "rgba(99,102,241,0.12)",  color: "#818CF8" },
  };
  const visStyle = visMap[vis] || visMap.private;
  const cardCount = deck.flashcards_count ?? deck.cardsCount ?? deck.card_count ?? 0;
  const createdAt = deck.created_at
    ? new Date(deck.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div
      style={{
        background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10,
        padding: "16px", display: "flex", flexDirection: "column", gap: 10,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"; e.currentTarget.style.boxShadow = "0 0 0 1px rgba(99,102,241,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
    >
      {/* Row 1: visibility + count + date + download */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: visStyle.bg, color: visStyle.color, letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 }}>
          VISIBILITY: {visStyle.label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 4, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", flexShrink: 0 }}>
          <ViewColumnsIcon style={{ width: 11, height: 11, color: "#818CF8" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: "#818CF8" }}>{cardCount}</span>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)", flexShrink: 0 }}>{createdAt}</span>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)", opacity: downloading ? 0.5 : 1, flexShrink: 0 }}
          title="Descargar PDF"
        >
          <ArrowDownTrayIcon style={{ width: 15, height: 15 }} />
        </button>
      </div>

      {/* Row 2: AI Summary toggle (right-aligned) */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={handleToggleSummary}
          disabled={loadingSummary}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: summaryUnavailable ? "rgba(245,158,11,0.08)" : showSummary ? "rgba(255,255,255,0.05)" : "rgba(99,102,241,0.1)",
            color: summaryUnavailable ? "#f59e0b" : showSummary ? "#94A3B8" : "#818CF8",
            border: `1px solid ${summaryUnavailable ? "rgba(245,158,11,0.2)" : showSummary ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.2)"}`,
            cursor: loadingSummary ? "default" : "pointer", letterSpacing: "0.03em",
            transition: "all 150ms", opacity: loadingSummary ? 0.7 : 1,
          }}
        >
          <SparklesIcon style={{ width: 10, height: 10 }} />
          {loadingSummary ? "Cargando..." : summaryUnavailable ? "Sin resumen disponible" : showSummary ? "Ver descripción" : "VIEW AI SUMMARY"}
        </button>
      </div>

      {/* Summary or description */}
      {showSummary && summary ? (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
          <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.6, fontStyle: "italic", margin: 0 }}>"{summary}"</p>
        </div>
      ) : deck.description ? (
        <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5, margin: 0,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {deck.description}
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "#334155", fontStyle: "italic", margin: 0 }}>Sin descripción.</p>
      )}

      {/* Title */}
      <p style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", lineHeight: 1.35, margin: 0 }}>
        {deck.title}
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onLearn?.(deck)}
          style={{
            flex: 1, padding: "10px", borderRadius: 8,
            background: "transparent", border: "1px solid rgba(99,102,241,0.3)",
            color: "#818CF8", fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          <BookOpenIcon style={{ width: 13, height: 13 }} />
          Learn
        </button>
        <button
          onClick={() => onStudy?.(deck)}
          style={{
            flex: 1, padding: "10px", borderRadius: 8,
            background: "linear-gradient(135deg, #3949AB 0%, #5C6BC0 100%)",
            border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <BookOpenIcon style={{ width: 13, height: 13 }} />
          Study
        </button>
      </div>
    </div>
  );
}

function DecksTab({ decks, loading, emptyMessage, onStudy, onLearn }) {
  if (loading) return <div className="flex justify-center py-14"><div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-6 h-6 border-2 rounded-full animate-spin" /></div>;
  if (!decks.length) return <EmptyState icon={ViewColumnsIcon} title="Sin decks generados" message={emptyMessage} />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {decks.map((d) => (
        <EnterpriseDeckCard key={d.id} deck={d} onStudy={onStudy} onLearn={onLearn} />
      ))}
    </div>
  );
}

// ─── Drag & Drop: sortable row wrappers ──────────────────────────────────────

function SortableDeckRow({ deck, index, onStudy, onLearn, onDelete, canReorder, onAddDeck, job, onDismissJob }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deck.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}>
      <DeckRowItem
        deck={deck}
        index={index}
        onStudy={onStudy}
        onLearn={onLearn}
        onDelete={onDelete}
        dragHandleProps={canReorder ? { ...attributes, ...listeners } : undefined}
        onAddDeck={onAddDeck}
        job={job}
        onDismissJob={onDismissJob}
      />
    </div>
  );
}

function SortableBatteryRow({ battery, index, onSimulate, onDelete, canReorder, onAddBattery, job, onDismissJob }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: battery.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}>
      <BatteryRowItem
        battery={battery}
        index={index}
        onSimulate={onSimulate}
        onDelete={onDelete}
        dragHandleProps={canReorder ? { ...attributes, ...listeners } : undefined}
        onAddBattery={onAddBattery}
        job={job}
        onDismissJob={onDismissJob}
      />
    </div>
  );
}

// ─── TagGroup section (new Collection/TagGroup system) ────────────────────────

function TagGroupSection({ tagGroup, content, isLast, onStudy, onLearn, onSimulate, onDeleteBattery, onDeleteDeck, canReorder, onDecksReorder, onBatteriesReorder, onAddDeck, onAddBattery }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const decks = content?.decks || [];
  const batteries = content?.batteries || [];
  const isLoading = content === undefined;

  const handleDeckDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = decks.findIndex((d) => d.id === active.id);
    const newIdx = decks.findIndex((d) => d.id === over.id);
    onDecksReorder(tagGroup.id, arrayMove(decks, oldIdx, newIdx).map((d) => d.id));
  };

  const handleBatteryDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = batteries.findIndex((b) => b.id === active.id);
    const newIdx = batteries.findIndex((b) => b.id === over.id);
    onBatteriesReorder(tagGroup.id, arrayMove(batteries, oldIdx, newIdx).map((b) => b.id));
  };

  return (
    <div style={{ display: "flex", minWidth: 0 }}>
      {/* Timeline */}
      <div style={{ width: 22, display: "flex", flexDirection: "column", alignItems: "center", marginRight: 14, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#6366F1", border: "2px solid #0F172A", flexShrink: 0, marginTop: 7 }} />
        {!isLast && <div style={{ width: 2, flex: 1, background: "rgba(255,255,255,0.08)", minHeight: 24, marginTop: 4 }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 8 : 20 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: expanded ? 8 : 0, flexWrap: "nowrap" }}>
          <button onClick={() => setExpanded((v) => !v)} style={{ color: "#64748B", cursor: "pointer", padding: 0, background: "none", border: "none", display: "flex", alignItems: "center", flexShrink: 0 }}>
            {expanded ? <ChevronDownIcon style={{ width: 13, height: 13 }} /> : <ChevronRightIcon style={{ width: 13, height: 13 }} />}
          </button>
          <span style={{ fontWeight: 700, color: "#F1F5F9", fontSize: 13, flexShrink: 0, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {tagGroup.name}
          </span>
          <span style={{ padding: "1px 7px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "#64748B", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
            {t("enterprise.knowledge.processDetail.tagGroup.counts", { decks: decks.length, batteries: batteries.length })}
          </span>
          {tagGroup.status && (
            <span style={{ padding: "1px 7px", borderRadius: 4, background: "rgba(99,102,241,0.1)", color: "#818CF8", fontSize: 10, fontWeight: 700, flexShrink: 0, textTransform: "capitalize" }}>
              {tagGroup.status}
            </span>
          )}
          <span style={{ flex: 1 }} />
          {canReorder && (
            <span style={{ fontSize: 10, color: "#475569", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
              <Bars3Icon style={{ width: 11, height: 11 }} /> {t("enterprise.knowledge.processDetail.reorder")}
            </span>
          )}
        </div>

        {expanded && (
          <div style={{ marginLeft: 6 }}>
            {isLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                <div style={{ width: 14, height: 14, border: "2px solid rgba(99,102,241,0.25)", borderTopColor: "#6366F1", borderRadius: "50%" }} className="animate-spin" />
                <span style={{ fontSize: 12, color: "#475569" }}>{t("enterprise.knowledge.processDetail.loading")}</span>
              </div>
            ) : (
              <>
                {/* Decks sortable list */}
                {decks.length > 0 && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDeckDragEnd}>
                    <SortableContext items={decks.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                      {decks.map((deck, i) => (
                        <SortableDeckRow key={deck.id} deck={deck} index={i} onStudy={onStudy} onLearn={onLearn} onDelete={onDeleteDeck} canReorder={canReorder} onAddDeck={() => onAddDeck?.(tagGroup.id)} />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}

                {/* Batteries sortable list */}
                {batteries.length > 0 && (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBatteryDragEnd}>
                    <SortableContext items={batteries.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                      {batteries.map((battery, i) => (
                        <SortableBatteryRow key={battery.id} battery={battery} index={i} onSimulate={onSimulate} onDelete={onDeleteBattery} canReorder={canReorder} onAddBattery={() => onAddBattery?.(tagGroup.id)} />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}

                {decks.length === 0 && batteries.length === 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }}>
                    <p style={{ color: "#334155", fontSize: 12, fontStyle: "italic", margin: 0 }}>{t("enterprise.knowledge.processDetail.noContentTopic")}</p>
                    <button
                      onClick={() => onAddDeck?.(tagGroup.id)}
                      style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "#818CF8", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                    >+ Deck</button>
                    <button
                      onClick={() => onAddBattery?.(tagGroup.id)}
                      style={{ padding: "3px 8px", borderRadius: 6, background: "rgba(94,106,210,0.08)", border: "1px solid rgba(94,106,210,0.2)", color: "#818CF8", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                    >+ {t("enterprise.knowledge.processDetail.battery")}</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Documents Panel ──────────────────────────────────────────────────────────

function DocumentsPanel({ docs, onAdd }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const filtered = search
    ? docs.filter((d) => d.filename?.toLowerCase().includes(search.toLowerCase()))
    : docs;

  return (
    <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <h3 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 14, margin: 0 }}>{t("enterprise.knowledge.processDetail.documentsPanel.title")}</h3>
        <button
          onClick={onAdd}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 6, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818CF8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.22)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; }}
        >
          <PlusIcon style={{ width: 11, height: 11 }} /> {t("enterprise.knowledge.processDetail.documentsPanel.addDocument")}
        </button>
      </div>

      {/* Search + filter */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <MagnifyingGlassIcon style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#475569", pointerEvents: "none" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("enterprise.knowledge.processDetail.documentsPanel.searchPlaceholder")}
            style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "7px 10px 7px 30px", color: "#F1F5F9", fontSize: 12, outline: "none", boxSizing: "border-box" }}
          />
        </div>
        <button style={{ padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#64748B", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <FunnelIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Count */}
      <div style={{ padding: "8px 20px 4px" }}>
        <span style={{ color: "#475569", fontSize: 11 }}>
          {t("enterprise.knowledge.processDetail.documentsPanel.count", { count: filtered.length, plural: filtered.length !== 1 ? "s" : "" })}
        </span>
      </div>

      {/* Document list */}
      <div style={{ padding: "0 12px 4px" }}>
        {docs.length === 0 && (
          <div style={{ padding: "16px 8px", textAlign: "center" }}>
            <p style={{ color: "#475569", fontSize: 12, margin: 0 }}>{t("enterprise.knowledge.processDetail.documentsPanel.empty")}</p>
          </div>
        )}
        {filtered.map((doc) => {
          const ext = doc.type?.toUpperCase() || (doc.filename?.split(".").pop()?.toUpperCase()) || "FILE";
          const isPdf = ext === "PDF";
          return (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ width: 32, height: 38, background: isPdf ? "#DC2626" : "#3B82F6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#fff", fontSize: 7, fontWeight: 800, letterSpacing: "0.02em" }}>{ext.slice(0, 4)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#F1F5F9", fontWeight: 600, fontSize: 12, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.filename}</p>
                <p style={{ color: "#475569", fontSize: 10, margin: "2px 0 0" }}>
                  {ext}
                  {doc.size ? ` · ${(doc.size / 1024 / 1024).toFixed(1)} MB` : " · 0.0 MB"}
                  {doc.added_by ? ` · ${t("enterprise.knowledge.processDetail.by", { name: doc.added_by })}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: doc.status === "ready" ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.07)", color: doc.status === "ready" ? "#4ade80" : "#8B8B9C" }}>
                  {doc.status}
                </span>
                <button style={{ color: "#475569", cursor: "pointer", background: "none", border: "none", padding: 2, display: "flex" }}>
                  <EllipsisVerticalIcon style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Drag-drop zone */}
      <div
        onClick={() => onAdd()}
        style={{ margin: "8px 12px 12px", border: "1.5px dashed rgba(255,255,255,0.1)", borderRadius: 8, padding: "20px 16px", textAlign: "center", cursor: "pointer", transition: "border-color 150ms" }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
        onDragLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
        onDrop={(e) => { e.preventDefault(); onAdd(Array.from(e.dataTransfer.files || [])); }}
      >
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
          <ArrowUpTrayIcon style={{ width: 16, height: 16, color: "#64748B" }} />
        </div>
        <p style={{ color: "#64748B", fontSize: 12, margin: "0 0 3px" }}>{t("enterprise.knowledge.processDetail.documentsPanel.dragDrop")}</p>
        <span style={{ color: "#6366F1", fontSize: 12, fontWeight: 600 }}>{t("enterprise.knowledge.processDetail.documentsPanel.orSelectFiles")}</span>
      </div>
    </div>
  );
}

// ─── Knowledge Structure Panel components ──────────────────────────────────────

function ItemJobStrip({ job, accentColor }) {
  const { t } = useLanguage();
  const STAGE_LABELS = useStageLabels();
  const isFailed = FAILED_STATUSES.has(job.status);
  const isSuccess = SUCCESS_STATUSES.has(job.status);
  const isRunning = !isFailed && !isSuccess;
  const barColor = isFailed ? "#f87171" : isSuccess ? "#4ade80" : accentColor;
  const label = isFailed
    ? (job.error || t("enterprise.knowledge.processDetail.unexpectedError"))
    : isSuccess
    ? t("enterprise.knowledge.processDetail.ready")
    : (STAGE_LABELS[job.stage] || job.message || t("enterprise.knowledge.processDetail.generating"));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 8px" }}>
      {isRunning && <ArrowPathIcon className="animate-spin" style={{ width: 11, height: 11, color: barColor, flexShrink: 0 }} />}
      {isSuccess && <CheckCircleSolid style={{ width: 11, height: 11, color: barColor, flexShrink: 0 }} />}
      {isFailed && <ExclamationTriangleIcon style={{ width: 11, height: 11, color: barColor, flexShrink: 0 }} />}
      <span style={{ fontSize: 10.5, fontWeight: 600, color: barColor, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      {!isFailed && (
        <div style={{ width: 60, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
          <div style={{ height: "100%", width: `${isSuccess ? 100 : Math.max(4, job.progress || 0)}%`, background: barColor, borderRadius: 2, transition: "width 500ms ease" }} />
        </div>
      )}
      {!isFailed && (
        <span style={{ fontSize: 10, fontWeight: 700, color: barColor, flexShrink: 0, minWidth: 26, textAlign: "right" }}>
          {isSuccess ? "100%" : `${Math.round(job.progress || 0)}%`}
        </span>
      )}
    </div>
  );
}

function DeckRowItem({ deck, index, onStudy, onLearn, dragHandleProps, onAddDeck, onDelete, job, onDismissJob }) {
  const { t } = useLanguage();
  const cardCount = deck.flashcards_count ?? deck.cardsCount ?? deck.card_count ?? 0;
  const label = deck.title || `Deck ${index + 1}`;
  const isFailed = job && FAILED_STATUSES.has(job.status);
  const isSuccess = job && SUCCESS_STATUSES.has(job.status);
  const isRunning = job && !isFailed && !isSuccess;
  const borderColor = isFailed ? "rgba(239,68,68,0.35)" : isSuccess ? "rgba(74,222,128,0.35)" : isRunning ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.06)";
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${borderColor}`, borderRadius: 8, marginBottom: 6, minWidth: 0, transition: "border-color 250ms" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", minWidth: 0 }}>
        {dragHandleProps && (
          <div {...dragHandleProps} style={{ cursor: "grab", color: "#334155", display: "flex", alignItems: "center", flexShrink: 0, touchAction: "none" }} title={t("enterprise.knowledge.processDetail.dragToReorder")}>
            <Bars3Icon style={{ width: 14, height: 14 }} />
          </div>
        )}
        <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ViewColumnsIcon style={{ width: 13, height: 13, color: "#818CF8" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#F1F5F9", flexShrink: 0, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>{label}</span>
        <span style={{ padding: "1px 7px", borderRadius: 20, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", color: "#818CF8", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          {isRunning ? <ArrowPathIcon className="animate-spin" style={{ width: 9, height: 9, display: "inline-block" }} /> : t("enterprise.knowledge.processDetail.cardsCount", { n: cardCount })}
        </span>
        <span style={{ flex: 1, fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {deck.description || t("enterprise.knowledge.processDetail.deckDefaultDescription")}
        </span>
        <button
          onClick={() => onLearn?.(deck)}
          disabled={isRunning}
          style={{ padding: "4px 10px", borderRadius: 6, background: "transparent", border: "1px solid rgba(99,102,241,0.25)", color: "#818CF8", fontSize: 11, fontWeight: 700, cursor: isRunning ? "default" : "pointer", flexShrink: 0, whiteSpace: "nowrap", opacity: isRunning ? 0.4 : 1 }}
          onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
          {t("enterprise.knowledge.processDetail.learn")}
        </button>
        <button
          onClick={() => onStudy?.(deck)}
          disabled={isRunning}
          style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "#818CF8", fontSize: 11, fontWeight: 700, cursor: isRunning ? "default" : "pointer", flexShrink: 0, whiteSpace: "nowrap", opacity: isRunning ? 0.4 : 1 }}
          onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.background = "rgba(99,102,241,0.18)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
        >
          {t("enterprise.knowledge.processDetail.study")}
        </button>
        <button
          onClick={() => onAddDeck?.()}
          style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.18)", color: "#4ade80", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.07)"; }}
        >
          + {t("enterprise.knowledge.processDetail.addDeck")}
        </button>
        <button style={{ color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer", background: "none", border: "none", flexShrink: 0 }}>{t("enterprise.knowledge.processDetail.more")}</button>
        <button
          onClick={() => onDelete?.(deck)}
          title={t("enterprise.knowledge.processDetail.deleteDeckTitle")}
          disabled={isRunning}
          style={{ padding: "4px 7px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", cursor: isRunning ? "default" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", opacity: isRunning ? 0.4 : 1 }}
          onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.background = "rgba(239,68,68,0.14)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
        >
          <TrashIcon style={{ width: 12, height: 12 }} />
        </button>
      </div>
      {job && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}><ItemJobStrip job={job} accentColor="#818CF8" /></div>
          {isFailed && onDismissJob && (
            <button
              onClick={() => onDismissJob(job.id)}
              style={{ marginRight: 12, flexShrink: 0, fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            >
              {t("enterprise.knowledge.processDetail.dismiss")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BatteryRowItem({ battery, index, onSimulate, onDelete, dragHandleProps, onAddBattery, job, onDismissJob }) {
  const { t } = useLanguage();
  const questionCount = battery.question_count ?? 0;
  const label = battery.name || battery.title || `Battery ${index + 1}`;
  const pct = battery.last_attempt?.percent ?? null;
  const hasAttempt = pct !== null;
  const pctRounded = hasAttempt ? Math.round(pct) : 0;
  const pctColor = pctRounded >= 80 ? "#4ade80" : pctRounded >= 50 ? "#f59e0b" : "#818CF8";
  const isFailed = job && FAILED_STATUSES.has(job.status);
  const isSuccess = job && SUCCESS_STATUSES.has(job.status);
  const isRunning = job && !isFailed && !isSuccess;
  const borderColor = isFailed ? "rgba(239,68,68,0.35)" : isSuccess ? "rgba(74,222,128,0.35)" : isRunning ? "rgba(94,106,210,0.35)" : "rgba(255,255,255,0.06)";

  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${borderColor}`, borderRadius: 8, marginBottom: 6, minWidth: 0, transition: "border-color 250ms" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", minWidth: 0 }}>
        {dragHandleProps && (
          <div {...dragHandleProps} style={{ cursor: "grab", color: "#334155", display: "flex", alignItems: "center", flexShrink: 0, touchAction: "none" }} title={t("enterprise.knowledge.processDetail.dragToReorder")}>
            <Bars3Icon style={{ width: 14, height: 14 }} />
          </div>
        )}
        <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(94,106,210,0.12)", border: "1px solid rgba(94,106,210,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <BoltIcon style={{ width: 13, height: 13, color: "#818CF8" }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#F1F5F9", flexShrink: 0, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={label}>{label}</span>
        <span style={{ padding: "1px 7px", borderRadius: 20, background: "rgba(94,106,210,0.1)", border: "1px solid rgba(94,106,210,0.15)", color: "#818CF8", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
          {isRunning ? <ArrowPathIcon className="animate-spin" style={{ width: 9, height: 9, display: "inline-block" }} /> : t("enterprise.knowledge.processDetail.questionsCount", { n: questionCount })}
        </span>
        <span style={{ flex: 1, fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {battery.description || t("enterprise.knowledge.processDetail.batteryDefaultDescription")}
        </span>

        {/* Completion bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <div style={{ width: 52, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${hasAttempt ? pctRounded : 0}%`, background: pctColor, borderRadius: 2, transition: "width 400ms ease" }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: hasAttempt ? pctColor : "#334155", minWidth: 28, textAlign: "right" }}>
            {hasAttempt ? `${pctRounded}%` : "—"}
          </span>
        </div>

        <button
          onClick={() => onSimulate?.(battery)}
          disabled={isRunning}
          style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(94,106,210,0.1)", border: "1px solid rgba(94,106,210,0.2)", color: "#818CF8", fontSize: 11, fontWeight: 700, cursor: isRunning ? "default" : "pointer", flexShrink: 0, whiteSpace: "nowrap", opacity: isRunning ? 0.4 : 1 }}
          onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.background = "rgba(94,106,210,0.18)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(94,106,210,0.1)"; }}
        >
          {t("enterprise.knowledge.processDetail.simulate")}
        </button>
        <button
          onClick={() => onAddBattery?.()}
          style={{ padding: "4px 8px", borderRadius: 6, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.18)", color: "#4ade80", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.15)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(74,222,128,0.07)"; }}
        >
          + {t("enterprise.knowledge.processDetail.addBattery")}
        </button>
        <button
          onClick={() => onDelete?.(battery)}
          title={t("enterprise.knowledge.processDetail.deleteBatteryTitle")}
          disabled={isRunning}
          style={{ padding: "4px 7px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", cursor: isRunning ? "default" : "pointer", flexShrink: 0, display: "flex", alignItems: "center", opacity: isRunning ? 0.4 : 1 }}
          onMouseEnter={(e) => { if (!isRunning) e.currentTarget.style.background = "rgba(239,68,68,0.14)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
        >
          <TrashIcon style={{ width: 12, height: 12 }} />
        </button>
      </div>
      {job && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}><ItemJobStrip job={job} accentColor="#818CF8" /></div>
          {isFailed && onDismissJob && (
            <button
              onClick={() => onDismissJob(job.id)}
              style={{ marginRight: 12, flexShrink: 0, fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 5, padding: "2px 8px", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.18)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            >
              {t("enterprise.knowledge.processDetail.dismiss")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TopicTreeItem({
  topic, index, decks, batteries, isLast, onStudy, onLearn, onSimulate, onDeleteBattery, onDeleteDeck,
  canReorder, onDecksReorder, onBatteriesReorder, onAddDeck, onAddBattery, onDeleteTopic, itemJobs, onDismissItemJob,
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const tagCount = topic.tags?.length || 0;
  const description = topic.tags?.slice(0, 5).join(", ") || "";
  const addDeck = () => onAddDeck?.(topic.id);
  const addBattery = () => onAddBattery?.(topic.id);
  const deleteTopic = () => onDeleteTopic?.({
    id: topic.id,
    _kind: "topic",
    label: t("enterprise.knowledge.processDetail.topicLabel", { n: index + 1 }),
    deckCount: decks.length,
    batteryCount: batteries.length,
  });

  const topicJobs = itemJobs?.filter((j) => j.tagGroupId === String(topic.id)) || [];
  const jobFor = (kind, resourceId) => topicJobs.find((j) => j.kind === kind && j.resourceId === resourceId);
  // Covers the brief window between a job starting and its deck/battery row
  // showing up in `decks`/`batteries` (loadResults hasn't resolved yet).
  const pendingDeckJobs = topicJobs.filter((j) => j.kind === "deck" && !decks.some((d) => d.id === j.resourceId));
  const pendingBatteryJobs = topicJobs.filter((j) => j.kind === "battery" && !batteries.some((b) => b.id === j.resourceId));

  const handleDeckDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = decks.findIndex((d) => d.id === active.id);
    const newIdx = decks.findIndex((d) => d.id === over.id);
    onDecksReorder?.(topic.id, arrayMove(decks, oldIdx, newIdx).map((d) => d.id));
  };

  const handleBatteryDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIdx = batteries.findIndex((b) => b.id === active.id);
    const newIdx = batteries.findIndex((b) => b.id === over.id);
    onBatteriesReorder?.(topic.id, arrayMove(batteries, oldIdx, newIdx).map((b) => b.id));
  };

  return (
    <div style={{ display: "flex", minWidth: 0 }}>
      {/* Timeline */}
      <div style={{ width: 22, display: "flex", flexDirection: "column", alignItems: "center", marginRight: 14, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80", border: "2px solid #0F172A", flexShrink: 0, marginTop: 7 }} />
        {!isLast && (
          <div style={{ width: 2, flex: 1, background: "rgba(255,255,255,0.08)", minHeight: 24, marginTop: 4 }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 8 : 20 }}>
        {/* Topic header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: expanded ? 8 : 0, flexWrap: "nowrap" }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            style={{ color: "#64748B", cursor: "pointer", padding: 0, background: "none", border: "none", display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            {expanded
              ? <ChevronDownIcon style={{ width: 13, height: 13 }} />
              : <ChevronRightIcon style={{ width: 13, height: 13 }} />}
          </button>
          <span style={{ fontWeight: 700, color: "#F1F5F9", fontSize: 13, flexShrink: 0 }}>{t("enterprise.knowledge.processDetail.topicLabel", { n: index + 1 })}</span>
          <span style={{ padding: "1px 7px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", color: "#64748B", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
            {t("enterprise.knowledge.processDetail.tagsCount", { n: tagCount })}
          </span>
          <span style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
            {description}
          </span>
          {canReorder && (decks.length + batteries.length) > 1 && (
            <span style={{ fontSize: 10, color: "#475569", flexShrink: 0, display: "flex", alignItems: "center", gap: 3 }}>
              <Bars3Icon style={{ width: 11, height: 11 }} /> {t("enterprise.knowledge.processDetail.dragToReorderLong")}
            </span>
          )}
          <button style={{ color: "#475569", fontSize: 11, fontWeight: 600, cursor: "pointer", background: "none", border: "none", flexShrink: 0, whiteSpace: "nowrap" }}>{t("enterprise.knowledge.processDetail.more")}</button>
          <button
            onClick={deleteTopic}
            title={t("enterprise.knowledge.processDetail.deleteDialog.titleTopic")}
            style={{ padding: "4px 7px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#EF4444", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.14)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}
          >
            <TrashIcon style={{ width: 12, height: 12 }} />
          </button>
        </div>

        {/* Deck + Battery rows */}
        {expanded && (
          <div style={{ marginLeft: 6 }}>
            {decks.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDeckDragEnd}>
                <SortableContext items={decks.map((d) => d.id)} strategy={verticalListSortingStrategy}>
                  {decks.map((d, i) => (
                    <SortableDeckRow key={d.id} deck={d} index={i} onStudy={onStudy} onLearn={onLearn} onDelete={onDeleteDeck}
                      canReorder={canReorder} onAddDeck={addDeck} job={jobFor("deck", d.id)} onDismissJob={onDismissItemJob} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            {pendingDeckJobs.map((j) => (
              <DeckRowItem key={j.id} deck={{ id: j.resourceId, title: j.title }} index={0} onStudy={onStudy} onLearn={onLearn} onAddDeck={addDeck}
                job={j} onDismissJob={onDismissItemJob} />
            ))}
            {batteries.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBatteryDragEnd}>
                <SortableContext items={batteries.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {batteries.map((b, i) => (
                    <SortableBatteryRow key={b.id} battery={b} index={i} onSimulate={onSimulate} onDelete={onDeleteBattery}
                      canReorder={canReorder} onAddBattery={addBattery} job={jobFor("battery", b.id)} onDismissJob={onDismissItemJob} />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            {pendingBatteryJobs.map((j) => (
              <BatteryRowItem key={j.id} battery={{ id: j.resourceId, name: j.title }} index={0} onSimulate={onSimulate} onDelete={onDeleteBattery} onAddBattery={addBattery}
                job={j} onDismissJob={onDismissItemJob} />
            ))}
            {decks.length === 0 && batteries.length === 0 && pendingDeckJobs.length === 0 && pendingBatteryJobs.length === 0 && (
              <p style={{ color: "#334155", fontSize: 12, fontStyle: "italic", padding: "4px 8px", margin: 0 }}>{t("enterprise.knowledge.processDetail.noContentGenerated")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KnowledgeStructurePanel({
  topics, decks, batteries, loading,
  tagGroups, tagGroupContent, tagGroupsLoading,
  canReorder, onTagGroupDecksReorder, onTagGroupBatteriesReorder,
  onTopicDecksReorder, onTopicBatteriesReorder,
  onStudy, onLearn, onSimulate, onDeleteBattery, onDeleteDeck, onDeleteTopic, onAutoGen,
  onAddDeck, onAddBattery, itemJobs, onDismissItemJob,
}) {
  const { t } = useLanguage();
  const totalQuestions = batteries.reduce((s, b) => s + (b.question_count ?? 0), 0);
  const totalCards = decks.reduce((s, d) => s + (d.flashcards_count ?? d.cardsCount ?? d.card_count ?? 0), 0);
  const hasContent = topics.length > 0 || decks.length > 0 || batteries.length > 0;
  const useTagGroupSystem = tagGroups.length > 0;

  // Decks/batteries from old results that are NOT in any tag group → "sin clasificar"
  const allTagGroupDeckIds = useMemo(
    () => new Set(Object.values(tagGroupContent).flatMap((c) => (c.decks || []).map((d) => d.id))),
    [tagGroupContent]
  );
  const allTagGroupBatteryIds = useMemo(
    () => new Set(Object.values(tagGroupContent).flatMap((c) => (c.batteries || []).map((b) => b.id))),
    [tagGroupContent]
  );
  const unclassifiedDecks = useMemo(() => decks.filter((d) => !allTagGroupDeckIds.has(d.id)), [decks, allTagGroupDeckIds]);
  const unclassifiedBatteries = useMemo(() => batteries.filter((b) => !allTagGroupBatteryIds.has(b.id)), [batteries, allTagGroupBatteryIds]);

  // Proceso de completitud: promedio del last_attempt.percent de todas las baterías
  const battWithAttempts = batteries.filter((b) => b.last_attempt?.percent != null);
  const processCompletion = batteries.length > 0
    ? Math.round(battWithAttempts.reduce((s, b) => s + Number(b.last_attempt.percent), 0) / batteries.length)
    : 0;
  const completedBatteries = batteries.filter((b) => (b.last_attempt?.percent ?? 0) >= 80).length;
  const completionColor = processCompletion >= 80 ? "#4ade80" : processCompletion >= 50 ? "#f59e0b" : "#818CF8";

  return (
    <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, overflow: "hidden" }}>
      {/* Header with stats */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 14, margin: 0 }}>{t("enterprise.knowledge.processDetail.structurePanel.title")}</h3>
            <p style={{ color: "#475569", fontSize: 11, margin: "3px 0 0" }}>
              {t("enterprise.knowledge.processDetail.structurePanel.summary", { topics: topics.length, decks: decks.length, batteries: batteries.length })}
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {[
              { count: topics.length, label: t("enterprise.knowledge.processDetail.structurePanel.stats.topics") },
              { count: decks.length, label: t("enterprise.knowledge.processDetail.structurePanel.stats.decks") },
              { count: batteries.length, label: t("enterprise.knowledge.processDetail.structurePanel.stats.batteries") },
              { count: totalQuestions, label: t("enterprise.knowledge.processDetail.structurePanel.stats.questions") },
              { count: totalCards, label: t("enterprise.knowledge.processDetail.structurePanel.stats.cards") },
            ].map(({ count, label }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>{count}</span>
                <span style={{ fontSize: 10, color: "#475569" }}>{label}</span>
              </div>
            ))}
            <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.22)", borderRadius: 6, color: "#4ade80", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              <PlusIcon style={{ width: 11, height: 11 }} /> {t("enterprise.knowledge.processDetail.structurePanel.addTopic")}
            </button>
          </div>
        </div>

        {/* Proceso completion bar */}
        {batteries.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B", flexShrink: 0 }}>{t("enterprise.knowledge.processDetail.structurePanel.completion")}</span>
            <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${processCompletion}%`, background: processCompletion > 0 ? `linear-gradient(90deg, ${completionColor}99, ${completionColor})` : "transparent", borderRadius: 3, transition: "width 600ms ease" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: completionColor, flexShrink: 0, minWidth: 36, textAlign: "right" }}>
              {processCompletion}%
            </span>
            <span style={{ fontSize: 10, color: "#475569", flexShrink: 0, whiteSpace: "nowrap" }}>
              {t("enterprise.knowledge.processDetail.structurePanel.completedBatteries", { completed: completedBatteries, total: batteries.length })}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      {loading || tagGroupsLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
          <div style={{ width: 24, height: 24, border: "2px solid rgba(99,102,241,0.25)", borderTopColor: "#6366F1", borderRadius: "50%" }} className="animate-spin" />
        </div>
      ) : !hasContent && !useTagGroupSystem ? (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SparklesIcon style={{ width: 22, height: 22, color: "#334155" }} />
          </div>
          <p style={{ color: "#F1F5F9", fontWeight: 600, fontSize: 13, margin: "0 0 6px" }}>{t("enterprise.knowledge.processDetail.structurePanel.noStructure")}</p>
          <p style={{ color: "#475569", fontSize: 12, margin: "0 auto 16px", lineHeight: 1.7, maxWidth: 360 }}>
            {t("enterprise.knowledge.processDetail.structurePanel.noStructureHint")}
          </p>
          <button
            onClick={onAutoGen}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 8, background: "linear-gradient(135deg, #3949AB 0%, #5C6BC0 100%)", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            <SparklesIcon style={{ width: 12, height: 12 }} /> {t("enterprise.knowledge.processDetail.autoGenerate")}
          </button>
        </div>
      ) : (
        <div style={{ padding: "20px" }}>
          {/* ── NEW: TagGroup system ── */}
          {useTagGroupSystem && (
            <>
              {tagGroups.map((tg, i) => {
                const isLast = i === tagGroups.length - 1 && unclassifiedDecks.length === 0 && unclassifiedBatteries.length === 0;
                return (
                  <TagGroupSection
                    key={tg.id}
                    tagGroup={tg}
                    content={tagGroupContent[tg.id]}
                    isLast={isLast}
                    onStudy={onStudy}
                    onLearn={onLearn}
                    onSimulate={onSimulate}
                    onDeleteBattery={onDeleteBattery}
                    onDeleteDeck={onDeleteDeck}
                    canReorder={canReorder}
                    onDecksReorder={onTagGroupDecksReorder}
                    onBatteriesReorder={onTagGroupBatteriesReorder}
                    onAddDeck={onAddDeck}
                    onAddBattery={onAddBattery}
                  />
                );
              })}

              {/* Sin clasificar */}
              {(unclassifiedDecks.length > 0 || unclassifiedBatteries.length > 0) && (
                <div style={{ marginTop: 4 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 36 }}>
                    {t("enterprise.knowledge.processDetail.structurePanel.unclassified")}
                  </p>
                  {unclassifiedDecks.map((d, i) => (
                    <DeckRowItem key={d.id} deck={d} index={i} onStudy={onStudy} onLearn={onLearn} onAddDeck={onAddDeck} onDelete={onDeleteDeck} />
                  ))}
                  {unclassifiedBatteries.map((b, i) => (
                    <BatteryRowItem key={b.id} battery={b} index={i} onSimulate={onSimulate} onDelete={onDeleteBattery} onAddBattery={onAddBattery} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── FALLBACK: old topics system ── */}
          {!useTagGroupSystem && (
            <>
              {topics.length > 0 ? (
                topics.map((topic, i) => {
                  // Match by tag_group_id (real association from DeckSourceTagGroup /
                  // BatterySourceTagGroup), not by array position — positions can diverge
                  // as soon as a topic has zero or more than one deck/battery.
                  const topicDecks = decks.filter((d) => String(d.tag_group_id) === String(topic.id));
                  const topicBatteries = batteries.filter((b) => String(b.tag_group_id) === String(topic.id));
                  return (
                    <TopicTreeItem
                      key={topic.id}
                      topic={topic}
                      index={i}
                      decks={topicDecks}
                      batteries={topicBatteries}
                      isLast={i === topics.length - 1}
                      onStudy={onStudy}
                      onLearn={onLearn}
                      onSimulate={onSimulate}
                      onDeleteBattery={onDeleteBattery}
                      onDeleteDeck={onDeleteDeck}
                      onDeleteTopic={onDeleteTopic}
                      canReorder={canReorder}
                      onDecksReorder={onTopicDecksReorder}
                      onBatteriesReorder={onTopicBatteriesReorder}
                      onAddDeck={onAddDeck}
                      onAddBattery={onAddBattery}
                      itemJobs={itemJobs}
                      onDismissItemJob={onDismissItemJob}
                    />
                  );
                })
              ) : (
                <div className="space-y-4">
                  {decks.length > 0 && (
                    <div>
                      <p style={{ color: "#64748B", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("enterprise.knowledge.processDetail.structurePanel.stats.decks")}</p>
                      {decks.map((d, i) => (
                        <DeckRowItem key={d.id} deck={d} index={i} onStudy={onStudy} onLearn={onLearn} onAddDeck={onAddDeck} onDelete={onDeleteDeck}
                          job={itemJobs?.find((j) => j.kind === "deck" && j.resourceId === d.id)} onDismissJob={onDismissItemJob} />
                      ))}
                    </div>
                  )}
                  {batteries.length > 0 && (
                    <div>
                      <p style={{ color: "#64748B", fontSize: 11, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t("enterprise.knowledge.processDetail.structurePanel.stats.batteries")}</p>
                      {batteries.map((b, i) => (
                        <BatteryRowItem key={b.id} battery={b} index={i} onSimulate={onSimulate} onDelete={onDeleteBattery} onAddBattery={onAddBattery}
                          job={itemJobs?.find((j) => j.kind === "battery" && j.resourceId === b.id)} onDismissJob={onDismissItemJob} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Enterprise dark dialogs ──────────────────────────────────────────────────

const D = {
  bg:        "#0F172A",
  surface:   "#1E293B",
  subtle:    "rgba(255,255,255,0.04)",
  border:    "rgba(255,255,255,0.08)",
  borderHov: "rgba(255,255,255,0.14)",
  accent:    "#6366F1",
  accentSoft:"rgba(99,102,241,0.15)",
  accentBdr: "rgba(99,102,241,0.3)",
  text:      "#F1F5F9",
  muted:     "#94A3B8",
  dim:       "#64748B",
  error:     "#f87171",
  errorSoft: "rgba(239,68,68,0.12)",
};

function DarkInput({ value, onChange, name, placeholder, error, type = "text", style = {} }) {
  return (
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 14px", boxSizing: "border-box",
        background: D.surface, border: `1px solid ${error ? D.error : D.border}`,
        borderRadius: 10, color: D.text, fontSize: 13, outline: "none",
        fontFamily: "inherit", transition: "border-color 150ms",
        ...style,
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = error ? D.error : D.accent; }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = error ? D.error : D.border; }}
    />
  );
}

function DarkTextarea({ value, onChange, name, placeholder, rows = 3 }) {
  return (
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%", padding: "10px 14px", boxSizing: "border-box",
        background: D.surface, border: `1px solid ${D.border}`,
        borderRadius: 10, color: D.text, fontSize: 13, outline: "none",
        fontFamily: "inherit", resize: "none", lineHeight: 1.6,
        transition: "border-color 150ms",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = D.accent; }}
      onBlur={(e)  => { e.currentTarget.style.borderColor = D.border; }}
    />
  );
}

function DLbl({ children }) {
  return (
    <p style={{ color: D.muted, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 7px" }}>
      {children}
    </p>
  );
}

function SectionTree({ scannedDocuments, selectedIds, onToggleDoc, onToggleSection, error }) {
  const { t } = useLanguage();
  const [open, setOpen] = React.useState({});
  return (
    <div style={{ border: `1px solid ${error ? D.error : D.border}`, borderRadius: 10, overflow: "hidden" }}>
      {scannedDocuments.map((doc, i) => {
        const docSectionIds = (doc.sections || []).map(s => Number(s.id));
        const allSel = docSectionIds.length > 0 && docSectionIds.every(id => selectedIds.includes(id));
        const someSel = docSectionIds.some(id => selectedIds.includes(id));
        const isOpen = !!open[doc.id];
        return (
          <div key={doc.id} style={{ borderBottom: i < scannedDocuments.length - 1 ? `1px solid ${D.border}` : "none" }}>
            {/* Doc row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer" }}
              onClick={() => setOpen(p => ({ ...p, [doc.id]: !p[doc.id] }))}
            >
              {/* checkbox */}
              <div
                onClick={(e) => { e.stopPropagation(); onToggleDoc(doc); }}
                style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${allSel || someSel ? D.accent : D.border}`, background: allSel ? D.accent : someSel ? D.accentSoft : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
              >
                {allSel && <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, stroke: "#fff", strokeWidth: 3, fill: "none" }}><polyline points="20 6 9 17 4 12"/></svg>}
                {someSel && !allSel && <div style={{ width: 8, height: 2, background: D.accent }} />}
              </div>
              {/* pdf icon */}
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: "#f87171", strokeWidth: 1.8, fill: "none" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <span style={{ flex: 1, color: D.text, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.filename || doc.name}</span>
              <span style={{ fontSize: 10, color: D.dim, flexShrink: 0 }}>{t("enterprise.knowledge.processDetail.sectionsAbbr", { n: (doc.sections || []).length })}</span>
              <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: D.dim, strokeWidth: 2, fill: "none", flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms" }}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {/* Sections */}
            {isOpen && (
              <div style={{ background: "rgba(0,0,0,0.15)", padding: "4px 14px 10px 42px" }}>
                {(doc.sections || []).map(s => {
                  const sel = selectedIds.includes(Number(s.id));
                  return (
                    <div key={s.id} onClick={() => onToggleSection(s.id, doc.id)} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "7px 8px", borderRadius: 7, cursor: "pointer", marginBottom: 2, background: sel ? D.accentSoft : "transparent", border: `1px solid ${sel ? D.accentBdr : "transparent"}`, transition: "all 150ms" }}>
                      <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${sel ? D.accent : D.border}`, background: sel ? D.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                        {sel && <svg viewBox="0 0 24 24" style={{ width: 8, height: 8, stroke: "#fff", strokeWidth: 3, fill: "none" }}><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: sel ? D.text : D.muted, fontSize: 11, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title || t("enterprise.knowledge.processDetail.untitled")}</p>
                        {s.content && <p style={{ color: D.dim, fontSize: 10, margin: "2px 0 0", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{s.content}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EnterpriseDeckDialog({ open, onClose, onCreate, projectId }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState("ai");
  const [formData, setFormData] = React.useState({ title: "", description: "", visibility: "private", section_ids: [], document_ids: [], cards_count: 5, cards: [] });
  const [errors, setErrors] = React.useState({});
  const [submitting, setSubmitting] = React.useState(false);
  const [scannedDocuments, setScannedDocuments] = React.useState([]);
  const [loadingSections, setLoadingSections] = React.useState(false);
  const [currentCard, setCurrentCard] = React.useState({ front: "", back: "", notes: "" });

  React.useEffect(() => {
    if (!open) return;
    setErrors({}); setSubmitting(false); setActiveTab("ai");
    setFormData({ title: "", description: "", visibility: "private", section_ids: [], document_ids: [], cards_count: 5, cards: [] });
    setCurrentCard({ front: "", back: "", notes: "" });
    if (projectId) {
      setLoadingSections(true);
      knowledgeApi.getDocumentsWithSections(projectId)
        .then(data => setScannedDocuments(data.documents || []))
        .catch(() => setScannedDocuments([]))
        .finally(() => setLoadingSections(false));
    }
  }, [open, projectId]);

  if (!open) return null;

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleToggleDoc = (doc) => {
    const docId = Number(doc.id);
    const docSecIds = (doc.sections || []).map(s => Number(s.id));
    setFormData(prev => {
      const allSel = docSecIds.length > 0 && docSecIds.every(id => prev.section_ids.includes(id));
      const newSecIds = allSel
        ? prev.section_ids.filter(id => !docSecIds.includes(id))
        : [...new Set([...prev.section_ids, ...docSecIds])];
      const newDocIds = allSel ? prev.document_ids.filter(id => id !== docId) : [...new Set([...prev.document_ids, docId])];
      return { ...prev, section_ids: newSecIds, document_ids: newDocIds };
    });
  };

  const handleToggleSection = (sectionId, docId) => {
    const sId = Number(sectionId); const dId = Number(docId);
    setFormData(prev => {
      const updated = prev.section_ids.includes(sId) ? prev.section_ids.filter(id => id !== sId) : [...prev.section_ids, sId];
      const doc = scannedDocuments.find(d => Number(d.id) === dId);
      const allDocSel = (doc?.sections || []).map(s => Number(s.id)).every(id => updated.includes(id));
      const newDocIds = allDocSel ? [...new Set([...prev.document_ids, dId])] : prev.document_ids.filter(id => id !== dId);
      return { ...prev, section_ids: updated, document_ids: newDocIds };
    });
  };

  const addCard = () => {
    if (!currentCard.front.trim() || !currentCard.back.trim()) return;
    setFormData(p => ({ ...p, cards: [...p.cards, { ...currentCard }] }));
    setCurrentCard({ front: "", back: "", notes: "" });
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = t("enterprise.knowledge.processDetail.deckDialog.titleRequired");
    if (activeTab === "ai") {
      if (scannedDocuments.length === 0) errs.general = t("enterprise.knowledge.processDetail.noSectionsAvailable");
      else if (formData.section_ids.length === 0) errs.general = t("enterprise.knowledge.processDetail.selectSection");
    } else {
      if (formData.cards.length === 0) errs.general = t("enterprise.knowledge.processDetail.deckDialog.addAtLeastOneCard");
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    onCreate({ ...formData, mode: activeTab });
  };

  const btnBase = { padding: "0 16px", height: 40, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 150ms", border: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} onClick={onClose} />
      {/* Panel */}
      <div style={{ position: "relative", width: "100%", maxWidth: 620, maxHeight: "92vh", background: D.bg, border: `1px solid ${D.border}`, borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: D.accentSoft, border: `1px solid ${D.accentBdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ViewColumnsIcon style={{ width: 20, height: 20, color: "#818CF8" }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ color: D.text, fontWeight: 800, fontSize: 17, margin: 0, letterSpacing: "-0.3px" }}>{t("enterprise.knowledge.processDetail.deckDialog.title")}</h2>
              <p style={{ color: D.dim, fontSize: 12, margin: "2px 0 0" }}>{activeTab === "ai" ? t("enterprise.knowledge.processDetail.deckDialog.subtitleAi") : t("enterprise.knowledge.processDetail.deckDialog.subtitleManual")}</p>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: D.subtle, border: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: D.muted, flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = D.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = D.subtle; e.currentTarget.style.color = D.muted; }}>
              <XMarkIcon style={{ width: 15, height: 15 }} />
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", border: `1px solid ${D.border}`, borderRadius: "11px 11px 0 0", padding: "5px 5px 0" }}>
            {[{ key: "ai", label: t("enterprise.knowledge.processDetail.deckDialog.tabAi"), icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/> }, { key: "manual", label: t("enterprise.knowledge.processDetail.deckDialog.tabManual"), icon: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></> }].map(({ key, label, icon }) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{ flex: 1, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: "8px 8px 0 0", background: activeTab === key ? D.bg : "transparent", color: activeTab === key ? D.accent : D.dim, border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 150ms" }}>
                <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: "currentColor", strokeWidth: 2, fill: "none" }}>{icon}</svg>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Title */}
          <div>
            <DLbl>{t("enterprise.knowledge.processDetail.deckDialog.titleField")} <span style={{ color: D.error }}>*</span></DLbl>
            <DarkInput value={formData.title} onChange={e => { set("title", e.target.value); if (errors.title) setErrors(p => ({ ...p, title: "" })); }} name="title" placeholder={t("enterprise.knowledge.processDetail.deckDialog.titlePlaceholder")} error={!!errors.title} />
            {errors.title && <p style={{ color: D.error, fontSize: 11, marginTop: 4 }}>{errors.title}</p>}
          </div>

          {/* AI mode content */}
          {activeTab === "ai" && (
            <>
              {/* Cards count */}
              <div>
                <DLbl>{t("enterprise.knowledge.processDetail.deckDialog.cardsCountLabel")}</DLbl>
                <div style={{ display: "flex", alignItems: "center", background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: "hidden", height: 44 }}>
                  <button type="button" onClick={() => set("cards_count", Math.max(1, formData.cards_count - 1))} style={{ width: 48, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: D.muted, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={e => { e.currentTarget.style.background = D.subtle; e.currentTarget.style.color = D.text; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = D.muted; }}>
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 2.5, fill: "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <div style={{ flex: 1, textAlign: "center", color: D.text, fontWeight: 800, fontSize: 18 }}>{formData.cards_count}</div>
                  <button type="button" onClick={() => set("cards_count", Math.min(15, formData.cards_count + 1))} style={{ width: 48, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: D.muted, display: "flex", alignItems: "center", justifyContent: "center" }}
                    onMouseEnter={e => { e.currentTarget.style.background = D.subtle; e.currentTarget.style.color = D.text; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = D.muted; }}>
                    <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 2.5, fill: "none" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
                <p style={{ color: D.dim, fontSize: 10, marginTop: 5 }}>{t("enterprise.knowledge.processDetail.deckDialog.maxCards")}</p>
              </div>

              {/* Description */}
              <div>
                <DLbl>{t("enterprise.knowledge.processDetail.descriptionLabel")} <span style={{ color: D.dim, fontSize: 9, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>{t("enterprise.knowledge.processDetail.optional")}</span></DLbl>
                <DarkTextarea value={formData.description} onChange={e => set("description", e.target.value)} name="description" placeholder={t("enterprise.knowledge.processDetail.deckDialog.descriptionPlaceholder")} />
              </div>

              {/* Visibility */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "12px 16px" }}>
                <div>
                  <p style={{ color: D.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{t("enterprise.knowledge.processDetail.publicVisibility")}</p>
                  <p style={{ color: D.dim, fontSize: 11, margin: "2px 0 0" }}>{formData.visibility === "public" ? t("enterprise.knowledge.processDetail.visibleToAll") : t("enterprise.knowledge.processDetail.visibleToYou")}</p>
                </div>
                <label style={{ position: "relative", width: 42, height: 24, cursor: "pointer", display: "block", flexShrink: 0 }}>
                  <input type="checkbox" checked={formData.visibility === "public"} onChange={e => set("visibility", e.target.checked ? "public" : "private")} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
                  <div style={{ position: "absolute", inset: 0, background: formData.visibility === "public" ? D.accent : D.surface, border: `1px solid ${formData.visibility === "public" ? D.accent : D.border}`, borderRadius: 12, transition: "all 250ms" }} />
                  <div style={{ position: "absolute", top: 3, left: formData.visibility === "public" ? 21 : 3, width: 18, height: 18, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", transition: "left 250ms" }} />
                </label>
              </div>

              {/* Documents & Sections */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                  <DLbl>{t("enterprise.knowledge.processDetail.documentsAndSections")} <span style={{ color: D.error }}>*</span></DLbl>
                  {formData.section_ids.length > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: D.accent, background: D.accentSoft, border: `1px solid ${D.accentBdr}`, borderRadius: 20, padding: "2px 9px" }}>{t("enterprise.knowledge.processDetail.selectedAbbr", { n: formData.section_ids.length })}</span>
                  )}
                </div>
                {loadingSections ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: D.surface, borderRadius: 10 }}>
                    <div style={{ width: 16, height: 16, border: `2px solid ${D.accentSoft}`, borderTopColor: D.accent, borderRadius: "50%" }} className="animate-spin" />
                    <span style={{ color: D.dim, fontSize: 12 }}>{t("enterprise.knowledge.processDetail.loadingDocuments")}</span>
                  </div>
                ) : scannedDocuments.length === 0 ? (
                  <div style={{ padding: 16, background: D.errorSoft, border: `1px dashed ${D.error}`, borderRadius: 10, textAlign: "center" }}>
                    <ExclamationTriangleIcon style={{ width: 24, height: 24, color: D.error, margin: "0 auto 6px" }} />
                    <p style={{ color: D.error, fontSize: 12, fontWeight: 600, margin: 0 }}>{t("enterprise.knowledge.processDetail.noSectionsAvailable")}</p>
                  </div>
                ) : (
                  <SectionTree
                    scannedDocuments={scannedDocuments}
                    selectedIds={formData.section_ids}
                    onToggleDoc={handleToggleDoc}
                    onToggleSection={handleToggleSection}
                    error={!!errors.general && scannedDocuments.length > 0}
                  />
                )}
                {errors.general && <p style={{ color: D.error, fontSize: 11, marginTop: 5 }}>{errors.general}</p>}
              </div>
            </>
          )}

          {/* Manual mode content */}
          {activeTab === "manual" && (
            <>
              {/* Description */}
              <div>
                <DLbl>{t("enterprise.knowledge.processDetail.descriptionLabel")} <span style={{ color: D.dim, fontSize: 9, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>{t("enterprise.knowledge.processDetail.optional")}</span></DLbl>
                <DarkTextarea value={formData.description} onChange={e => set("description", e.target.value)} name="description" placeholder={t("enterprise.knowledge.processDetail.deckDialog.descriptionPlaceholder")} />
              </div>

              {/* Visibility */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "12px 16px" }}>
                <div>
                  <p style={{ color: D.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{t("enterprise.knowledge.processDetail.publicVisibility")}</p>
                  <p style={{ color: D.dim, fontSize: 11, margin: "2px 0 0" }}>{formData.visibility === "public" ? t("enterprise.knowledge.processDetail.visibleToAll") : t("enterprise.knowledge.processDetail.visibleToYou")}</p>
                </div>
                <label style={{ position: "relative", width: 42, height: 24, cursor: "pointer", display: "block", flexShrink: 0 }}>
                  <input type="checkbox" checked={formData.visibility === "public"} onChange={e => set("visibility", e.target.checked ? "public" : "private")} style={{ opacity: 0, width: 0, height: 0, position: "absolute" }} />
                  <div style={{ position: "absolute", inset: 0, background: formData.visibility === "public" ? D.accent : D.surface, border: `1px solid ${formData.visibility === "public" ? D.accent : D.border}`, borderRadius: 12, transition: "all 250ms" }} />
                  <div style={{ position: "absolute", top: 3, left: formData.visibility === "public" ? 21 : 3, width: 18, height: 18, background: "#fff", borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,0.4)", transition: "left 250ms" }} />
                </label>
              </div>

              {/* Card builder */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <DLbl>{t("enterprise.knowledge.processDetail.deckDialog.cardsLabel")}</DLbl>
                  <span style={{ fontSize: 10, fontWeight: 700, color: D.accent, background: D.accentSoft, border: `1px solid ${D.accentBdr}`, borderRadius: 20, padding: "2px 9px" }}>{formData.cards.length}</span>
                </div>
                {/* Added cards */}
                {formData.cards.map((card, i) => (
                  <div key={i} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, position: "relative" }}>
                    <span style={{ position: "absolute", top: -9, left: 12, background: D.accent, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.05em" }}>{t("enterprise.knowledge.processDetail.deckDialog.cardBadge", { n: i + 1 })}</span>
                    <button type="button" onClick={() => setFormData(p => ({ ...p, cards: p.cards.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: D.error }}>
                      <XMarkIcon style={{ width: 11, height: 11 }} />
                    </button>
                    <p style={{ color: D.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", margin: "8px 0 3px" }}>{t("enterprise.knowledge.processDetail.deckDialog.front")}</p>
                    <p style={{ color: D.text, fontSize: 12, margin: "0 0 8px" }}>{card.front}</p>
                    <p style={{ color: D.dim, fontSize: 10, fontWeight: 700, textTransform: "uppercase", margin: "0 0 3px" }}>{t("enterprise.knowledge.processDetail.deckDialog.back")}</p>
                    <p style={{ color: D.muted, fontSize: 12, margin: 0 }}>{card.back}</p>
                  </div>
                ))}
                {/* New card input */}
                <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, position: "relative" }}>
                  <span style={{ position: "absolute", top: -9, left: 12, background: D.accentSoft, color: D.accent, border: `1px solid ${D.accentBdr}`, fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 20, letterSpacing: "0.05em" }}>{t("enterprise.knowledge.processDetail.deckDialog.cardBadge", { n: formData.cards.length + 1 })}</span>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                    <DarkInput value={currentCard.front} onChange={e => setCurrentCard(p => ({ ...p, front: e.target.value }))} name="front" placeholder={t("enterprise.knowledge.processDetail.deckDialog.frontPlaceholder")} />
                    <DarkInput value={currentCard.back} onChange={e => setCurrentCard(p => ({ ...p, back: e.target.value }))} name="back" placeholder={t("enterprise.knowledge.processDetail.deckDialog.backPlaceholder")} />
                    <DarkInput value={currentCard.notes} onChange={e => setCurrentCard(p => ({ ...p, notes: e.target.value }))} name="notes" placeholder={t("enterprise.knowledge.processDetail.deckDialog.notesPlaceholder")} />
                  </div>
                </div>
                <button type="button" onClick={addCard} disabled={!currentCard.front.trim() || !currentCard.back.trim()}
                  style={{ width: "100%", padding: "11px", background: "transparent", border: `1.5px dashed ${D.accentBdr}`, borderRadius: 10, color: !currentCard.front.trim() || !currentCard.back.trim() ? D.dim : D.accent, fontSize: 12, fontWeight: 700, cursor: !currentCard.front.trim() || !currentCard.back.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, opacity: !currentCard.front.trim() || !currentCard.back.trim() ? 0.5 : 1 }}>
                  <PlusIcon style={{ width: 13, height: 13 }} /> {t("enterprise.knowledge.processDetail.deckDialog.addToList")}
                </button>
                {errors.general && <p style={{ color: D.error, fontSize: 11, marginTop: 6 }}>{errors.general}</p>}
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, padding: "16px 24px", borderTop: `1px solid ${D.border}`, flexShrink: 0, background: "rgba(0,0,0,0.2)" }}>
          <button type="button" onClick={onClose} style={{ ...btnBase, background: D.subtle, border: `1px solid ${D.border}`, color: D.muted, flex: 1 }}
            onMouseEnter={e => { e.currentTarget.style.background = D.surface; e.currentTarget.style.color = D.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = D.subtle; e.currentTarget.style.color = D.muted; }}>
            {t("enterprise.compliance.programs.cancel")}
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting || (loadingSections && activeTab === "ai")}
            style={{ ...btnBase, background: submitting ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)", color: "#fff", flex: 2, justifyContent: "center", boxShadow: "0 4px 16px rgba(99,102,241,0.3)", cursor: submitting ? "not-allowed" : "pointer" }}>
            {submitting ? (
              <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} className="animate-spin" /> {t("enterprise.knowledge.processDetail.generating")}</>
            ) : activeTab === "ai" ? (
              <><SparklesIcon style={{ width: 14, height: 14 }} /> {t("enterprise.knowledge.processDetail.deckDialog.generateDeck")}</>
            ) : (
              <><ViewColumnsIcon style={{ width: 14, height: 14 }} /> {t("enterprise.knowledge.processDetail.deckDialog.createDeck")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EnterpriseBatteryDialog({ open, onClose, onGenerate, projectId }) {
  const { t } = useLanguage();
  const [formData, setFormData] = React.useState({ rule: "", query_text: "", sections: [], quantity: 10, difficulty: "medium", question_format: "true_false" });
  const [errors, setErrors] = React.useState({});
  const [submitting, setSubmitting] = React.useState(false);
  const [scannedDocuments, setScannedDocuments] = React.useState([]);
  const [loadingSections, setLoadingSections] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setErrors({}); setSubmitting(false);
    setFormData({ rule: "", query_text: "", sections: [], quantity: 10, difficulty: "medium", question_format: "true_false" });
    if (projectId) {
      setLoadingSections(true);
      knowledgeApi.getDocumentsWithSections(projectId)
        .then(data => setScannedDocuments(data.documents || []))
        .catch(() => setScannedDocuments([]))
        .finally(() => setLoadingSections(false));
    }
  }, [open, projectId]);

  if (!open) return null;

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }));

  const handleToggleDoc = (doc) => {
    const docSecIds = (doc.sections || []).map(s => Number(s.id));
    setFormData(prev => {
      const allSel = docSecIds.length > 0 && docSecIds.every(id => prev.sections.includes(id));
      return { ...prev, sections: allSel ? prev.sections.filter(id => !docSecIds.includes(id)) : [...new Set([...prev.sections, ...docSecIds])] };
    });
  };

  const handleToggleSection = (sectionId) => {
    const sId = Number(sectionId);
    setFormData(prev => ({ ...prev, sections: prev.sections.includes(sId) ? prev.sections.filter(id => id !== sId) : [...prev.sections, sId] }));
  };

  const validate = () => {
    const errs = {};
    if (scannedDocuments.length === 0) errs.sections = t("enterprise.knowledge.processDetail.noSectionsAvailable");
    else if (formData.sections.length === 0) errs.sections = t("enterprise.knowledge.processDetail.selectSection");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const allSections = scannedDocuments.flatMap(d => d.sections || []);
    const selectedSections = formData.sections.map(id => allSections.find(s => s.id === id)).filter(Boolean);
    onGenerate({ ...formData, sections: selectedSections });
  };

  const btnBase = { padding: "0 16px", height: 40, borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, transition: "all 150ms", border: "none" };

  const diffOpts = [
    { val: "easy",   label: t("enterprise.knowledge.sources.difficulty.easy"),   active: { bg: "rgba(74,222,128,0.12)", bdr: "rgba(74,222,128,0.3)",  text: "#4ade80" } },
    { val: "medium", label: t("enterprise.knowledge.sources.difficulty.medium"), active: { bg: D.accentSoft,             bdr: D.accentBdr,              text: "#818CF8" } },
    { val: "hard",   label: t("enterprise.knowledge.sources.difficulty.hard"),   active: { bg: "rgba(239,68,68,0.12)",  bdr: "rgba(239,68,68,0.3)",   text: "#f87171" } },
  ];
  const fmtOpts = [
    { val: "true_false",      label: t("enterprise.knowledge.processDetail.batteryDialog.formatTrueFalse"),   ico: <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></> },
    { val: "multiple_choice", label: t("enterprise.knowledge.processDetail.batteryDialog.formatMultipleChoice"),ico: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
    { val: "variety",         label: t("enterprise.knowledge.processDetail.batteryDialog.formatVariety"),            ico: <><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></> },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "100%", maxWidth: 580, maxHeight: "92vh", background: D.bg, border: `1px solid ${D.border}`, borderRadius: 20, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${D.border}`, flexShrink: 0, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(94,106,210,0.15)", border: "1px solid rgba(94,106,210,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BoltIcon style={{ width: 20, height: 20, color: "#818CF8" }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ color: D.text, fontWeight: 800, fontSize: 17, margin: 0, letterSpacing: "-0.3px" }}>{t("enterprise.knowledge.processDetail.batteryDialog.title")}</h2>
            <p style={{ color: D.dim, fontSize: 12, margin: "2px 0 0" }}>{t("enterprise.knowledge.processDetail.batteryDialog.subtitle")}</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: D.subtle, border: `1px solid ${D.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: D.muted, flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = D.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = D.subtle; e.currentTarget.style.color = D.muted; }}>
            <XMarkIcon style={{ width: 15, height: 15 }} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Topic */}
          <div>
            <DLbl>{t("enterprise.knowledge.processDetail.batteryDialog.topicLabel")} <span style={{ color: D.dim, fontSize: 9, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>{t("enterprise.knowledge.processDetail.optional")}</span></DLbl>
            <DarkInput value={formData.query_text} onChange={e => set("query_text", e.target.value)} name="query_text" placeholder={t("enterprise.knowledge.processDetail.batteryDialog.topicPlaceholder")} />
            <p style={{ color: D.dim, fontSize: 10, marginTop: 4 }}>{t("enterprise.knowledge.processDetail.batteryDialog.topicHint")}</p>
          </div>

          {/* Documents & Sections */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
              <DLbl>{t("enterprise.knowledge.processDetail.documentsAndSections")} <span style={{ color: D.error }}>*</span></DLbl>
              {formData.sections.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, color: D.accent, background: D.accentSoft, border: `1px solid ${D.accentBdr}`, borderRadius: 20, padding: "2px 9px" }}>{t("enterprise.knowledge.processDetail.selectedAbbr", { n: formData.sections.length })}</span>
              )}
            </div>
            {loadingSections ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: D.surface, borderRadius: 10 }}>
                <div style={{ width: 16, height: 16, border: `2px solid ${D.accentSoft}`, borderTopColor: D.accent, borderRadius: "50%" }} className="animate-spin" />
                <span style={{ color: D.dim, fontSize: 12 }}>{t("enterprise.knowledge.processDetail.loadingDocuments")}</span>
              </div>
            ) : scannedDocuments.length === 0 ? (
              <div style={{ padding: 16, background: D.errorSoft, border: `1px dashed ${D.error}`, borderRadius: 10, textAlign: "center" }}>
                <ExclamationTriangleIcon style={{ width: 24, height: 24, color: D.error, margin: "0 auto 6px" }} />
                <p style={{ color: D.error, fontSize: 12, fontWeight: 600, margin: 0 }}>{t("enterprise.knowledge.processDetail.noSectionsAvailable")}</p>
              </div>
            ) : (
              <SectionTree scannedDocuments={scannedDocuments} selectedIds={formData.sections} onToggleDoc={handleToggleDoc} onToggleSection={handleToggleSection} error={!!errors.sections && scannedDocuments.length > 0} />
            )}
            {errors.sections && <p style={{ color: D.error, fontSize: 11, marginTop: 5 }}>{errors.sections}</p>}
          </div>

          {/* Quantity */}
          <div>
            <DLbl>{t("enterprise.knowledge.processDetail.batteryDialog.quantityLabel")}</DLbl>
            <div style={{ display: "flex", alignItems: "center", background: D.surface, border: `1px solid ${D.border}`, borderRadius: 10, overflow: "hidden", height: 44 }}>
              <button type="button" onClick={() => set("quantity", Math.max(1, formData.quantity - 5))} style={{ width: 48, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: D.muted, display: "flex", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={e => { e.currentTarget.style.background = D.subtle; e.currentTarget.style.color = D.text; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = D.muted; }}>
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 2.5, fill: "none" }}><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <div style={{ flex: 1, textAlign: "center", color: D.text, fontWeight: 800, fontSize: 18 }}>{formData.quantity}</div>
              <button type="button" onClick={() => set("quantity", Math.min(15, formData.quantity + 5))} style={{ width: 48, height: "100%", background: "transparent", border: "none", cursor: "pointer", color: D.muted, display: "flex", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={e => { e.currentTarget.style.background = D.subtle; e.currentTarget.style.color = D.text; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = D.muted; }}>
                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: "currentColor", strokeWidth: 2.5, fill: "none" }}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <DLbl>{t("enterprise.knowledge.sourceNew.difficultyLabel")}</DLbl>
            <div style={{ display: "flex", gap: 8 }}>
              {diffOpts.map(({ val, label, active }) => {
                const on = formData.difficulty === val;
                return (
                  <button key={val} type="button" onClick={() => set("difficulty", val)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1.5px solid ${on ? active.bdr : D.border}`, background: on ? active.bg : D.surface, color: on ? active.text : D.dim, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 150ms" }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format */}
          <div>
            <DLbl>{t("enterprise.knowledge.processDetail.batteryDialog.formatLabel")}</DLbl>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {fmtOpts.map(({ val, label, ico }) => {
                const on = formData.question_format === val;
                return (
                  <button key={val} type="button" onClick={() => set("question_format", val)} style={{ padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${on ? D.accentBdr : D.border}`, background: on ? D.accentSoft : D.surface, color: on ? "#818CF8" : D.dim, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 150ms" }}>
                    <svg viewBox="0 0 24 24" style={{ width: 12, height: 12, stroke: "currentColor", strokeWidth: 2, fill: "none" }}>{ico}</svg>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, padding: "16px 24px", borderTop: `1px solid ${D.border}`, flexShrink: 0, background: "rgba(0,0,0,0.2)" }}>
          <button type="button" onClick={onClose} style={{ ...btnBase, background: D.subtle, border: `1px solid ${D.border}`, color: D.muted, flex: 1 }}
            onMouseEnter={e => { e.currentTarget.style.background = D.surface; e.currentTarget.style.color = D.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = D.subtle; e.currentTarget.style.color = D.muted; }}>
            {t("enterprise.compliance.programs.cancel")}
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting || loadingSections || scannedDocuments.length === 0}
            style={{ ...btnBase, background: submitting ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)", color: "#fff", flex: 2, justifyContent: "center", boxShadow: "0 4px 16px rgba(99,102,241,0.3)", cursor: submitting || loadingSections || scannedDocuments.length === 0 ? "not-allowed" : "pointer", opacity: scannedDocuments.length === 0 && !loadingSections ? 0.5 : 1 }}>
            {submitting ? (
              <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }} className="animate-spin" /> {t("enterprise.knowledge.processDetail.generating")}</>
            ) : (
              <><BoltIcon style={{ width: 14, height: 14 }} /> {t("enterprise.knowledge.processDetail.batteryDialog.generateBattery")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABS = [
  { key: "documents",  label: "Documentos", Icon: DocumentArrowUpIcon },
  { key: "topics",     label: "Tópicos",    Icon: SparklesIcon         },
  { key: "decks",      label: "Decks",      Icon: ViewColumnsIcon      },
  { key: "batteries",  label: "Baterías",   Icon: BoltIcon             },
];

const INIT_GEN = { status: "idle", runId: null, progress: 0, message: "", stage: "", artifacts: [], steps: [], error: "" };

export function ProcessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const SOURCE_LABELS = useSourceLabels();
  const TYPE_LABELS = useTypeLabels();
  const ENUMS = useKnowledgeEnumLabels();
  const STATUS_LABELS = useStatusLabels();
  const { activeCompanyId, isPlatformAdmin, hasMinRole } = useEnterprise();
  const { user } = useAuth();

  // A process can be opened directly from the process list, or from a Learning
  // Path that references it — location.state carries which, so "back" returns
  // to wherever the user actually came from instead of always the flat list.
  const cameFromLearningPath = location.state?.from?.type === "learning-path" ? location.state.from : null;
  const backHref = cameFromLearningPath ? `/enterprise/learning/paths/${cameFromLearningPath.id}` : "/enterprise/knowledge";
  const backLabel = cameFromLearningPath ? t("enterprise.knowledge.processDetail.backToLearningPath", { name: cameFromLearningPath.name || "Learning Path" }) : t("enterprise.knowledge.processDetail.backToProcesses");

  const INIT_RESULTS = { batteries: [], decks: [], topics: [], run: null };

  const [ks, setKs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [results, setResults] = useState(INIT_RESULTS);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState([]);
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [showAddBattery, setShowAddBattery] = useState(false);
  const [activeTagGroupId, setActiveTagGroupId] = useState(null);
  const [genState, setGenState] = useState(INIT_GEN);
  const [tagGroups, setTagGroups] = useState([]);
  const [tagGroupContent, setTagGroupContent] = useState({});
  const [tagGroupsLoading, setTagGroupsLoading] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const [simulationBattery, setSimulationBattery] = useState(null);
  const [studyDeck, setStudyDeck] = useState(null);
  const [learnDeck, setLearnDeck] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [itemJobs, setItemJobs] = useState([]); // in-flight deck/battery generation jobs, tracked per-topic
  const pollRef = useRef(null);
  const itemPollRefs = useRef({});

  const loadKs = useCallback(async () => {
    try {
      const data = await knowledgeApi.get(id);
      setKs(data);
    } catch {
      setKs(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const data = await knowledgeApi.getResults(id);
      setResults(data);
    } catch {
      setResults(INIT_RESULTS);
    } finally {
      setResultsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadTagGroups = useCallback(async () => {
    setTagGroupsLoading(true);
    try {
      const rawGroups = await collectionApi.getTagGroups(id);
      const groups = Array.isArray(rawGroups) ? rawGroups : (rawGroups.results || []);
      setTagGroups(groups);

      if (groups.length > 0) {
        const contentMap = {};
        await Promise.all(
          groups.map(async (tg) => {
            try {
              const [decksData, batteriesData] = await Promise.all([
                collectionApi.getTagGroupDecks(tg.id),
                collectionApi.getTagGroupBatteries(tg.id),
              ]);
              contentMap[tg.id] = {
                decks: Array.isArray(decksData) ? decksData : (decksData.results || []),
                batteries: Array.isArray(batteriesData) ? batteriesData : (batteriesData.results || []),
              };
            } catch {
              contentMap[tg.id] = { decks: [], batteries: [] };
            }
          })
        );
        setTagGroupContent(contentMap);
      }
    } catch {
      // ignore — collection API may not exist for older KS
    } finally {
      setTagGroupsLoading(false);
    }
  }, [id]);

  const handleTagGroupDecksReorder = useCallback(async (tagGroupId, orderedIds) => {
    // Optimistic update
    setTagGroupContent((prev) => ({
      ...prev,
      [tagGroupId]: {
        ...prev[tagGroupId],
        decks: orderedIds.map((oid) => prev[tagGroupId].decks.find((d) => d.id === oid)).filter(Boolean),
      },
    }));
    try {
      await collectionApi.reorderDecks(tagGroupId, orderedIds);
    } catch {
      // Revert: refetch
      try {
        const data = await collectionApi.getTagGroupDecks(tagGroupId);
        setTagGroupContent((prev) => ({
          ...prev,
          [tagGroupId]: { ...prev[tagGroupId], decks: Array.isArray(data) ? data : (data.results || []) },
        }));
      } catch {}
    }
  }, []);

  const handleTagGroupBatteriesReorder = useCallback(async (tagGroupId, orderedIds) => {
    // Optimistic update
    setTagGroupContent((prev) => ({
      ...prev,
      [tagGroupId]: {
        ...prev[tagGroupId],
        batteries: orderedIds.map((oid) => prev[tagGroupId].batteries.find((b) => b.id === oid)).filter(Boolean),
      },
    }));
    try {
      await collectionApi.reorderBatteries(tagGroupId, orderedIds);
    } catch {
      // Revert: refetch
      try {
        const data = await collectionApi.getTagGroupBatteries(tagGroupId);
        setTagGroupContent((prev) => ({
          ...prev,
          [tagGroupId]: { ...prev[tagGroupId], batteries: Array.isArray(data) ? data : (data.results || []) },
        }));
      } catch {}
    }
  }, []);

  // Reorders decks/batteries within a single topic (real TagGroup id). Used by the
  // "old topics" fallback tree, which is what Enterprise Knowledge Source processes
  // actually render (their tag_groups have no Collection, so the newer TagGroupSection
  // grid never shows — see [[project-ks-project-collection-model]]). Reorders only the
  // items belonging to this topic; every other deck/battery keeps its relative order.
  const handleTopicDecksReorder = useCallback(async (tagGroupId, orderedIds) => {
    setResults((prev) => {
      const byId = new Map(prev.decks.map((d) => [d.id, d]));
      const reordered = orderedIds.map((oid) => byId.get(oid)).filter(Boolean);
      const others = prev.decks.filter((d) => String(d.tag_group_id) !== String(tagGroupId));
      return { ...prev, decks: [...others, ...reordered] };
    });
    try {
      await collectionApi.reorderDecks(tagGroupId, orderedIds);
    } catch {
      loadResults(); // revert to server truth
    }
  }, [loadResults]);

  const handleTopicBatteriesReorder = useCallback(async (tagGroupId, orderedIds) => {
    setResults((prev) => {
      const byId = new Map(prev.batteries.map((b) => [b.id, b]));
      const reordered = orderedIds.map((oid) => byId.get(oid)).filter(Boolean);
      const others = prev.batteries.filter((b) => String(b.tag_group_id) !== String(tagGroupId));
      return { ...prev, batteries: [...others, ...reordered] };
    });
    try {
      await collectionApi.reorderBatteries(tagGroupId, orderedIds);
    } catch {
      loadResults(); // revert to server truth
    }
  }, [loadResults]);

  useEffect(() => { loadKs(); loadResults(); loadTagGroups(); }, [loadKs, loadResults, loadTagGroups]);

  // ── Per-item (deck/battery) generation progress ──────────────────────────
  // Deck/battery rows are created synchronously by /start-generate/ — only the
  // flashcards/questions are filled in async. So the row already appears under
  // its topic right away (via loadResults); this just tracks the fill-in job
  // so its card/question count and the "Learn/Study/Simular" actions update
  // live instead of silently sitting at 0 until the user refreshes.
  const stopItemPoll = useCallback((jobId) => {
    const handle = itemPollRefs.current[jobId];
    if (handle) { clearInterval(handle); delete itemPollRefs.current[jobId]; }
  }, []);

  const removeItemJob = useCallback((jobId) => {
    stopItemPoll(jobId);
    setItemJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, [stopItemPoll]);

  const pollItemJobOnce = useCallback(async (jobId, runId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/process-runs/${runId}/`, { headers: { Authorization: `Token ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const terminal = TERMINAL_STATUSES.has(data.status);
      const isSuccess = SUCCESS_STATUSES.has(data.status);
      setItemJobs((prev) => prev.map((j) => (j.id !== jobId ? j : {
        ...j,
        status: data.status,
        progress: data.progress_percent ?? j.progress,
        stage: data.current_stage || j.stage,
        message: data.status_message || j.message,
        error: FAILED_STATUSES.has(data.status) ? (data.status_message || data.error_payload?.error || t("enterprise.knowledge.processDetail.unexpectedError")) : "",
      })));
      if (terminal) {
        stopItemPoll(jobId);
        loadResults();
        if (isSuccess) setTimeout(() => removeItemJob(jobId), 1800);
      }
    } catch {
      // transient network error — keep polling on the next tick
    }
  }, [loadResults, removeItemJob, stopItemPoll]);

  const trackItemJob = useCallback(({ kind, tagGroupId, resourceId, title, runId }) => {
    if (!runId) return;
    const jobId = runId;
    setItemJobs((prev) => [
      ...prev.filter((j) => j.id !== jobId),
      { id: jobId, runId, kind, tagGroupId: tagGroupId != null ? String(tagGroupId) : null, resourceId, title, status: "queued", progress: 5, stage: "", message: "", error: "" },
    ]);
    pollItemJobOnce(jobId, runId);
    itemPollRefs.current[jobId] = setInterval(() => pollItemJobOnce(jobId, runId), 2500);
  }, [pollItemJobOnce]);

  useEffect(() => () => { Object.values(itemPollRefs.current).forEach(clearInterval); }, []);

  const handleOpenAddDeck = useCallback((tagGroupId) => {
    setActiveTagGroupId(tagGroupId || null);
    setShowAddDeck(true);
  }, []);

  const handleOpenAddBattery = useCallback((tagGroupId) => {
    setActiveTagGroupId(tagGroupId || null);
    setShowAddBattery(true);
  }, []);

  const handleCreateDeck = async (deckData) => {
    try {
      if (deckData.mode === "manual") {
        // NOTE: this legacy endpoint still hard-requires a real Project id, which a
        // KnowledgeSource process doesn't have — manual mode remains broken for
        // Enterprise Knowledge Source decks until it's ported to start-generate too.
        await projectService.createDeckManual({
          project_id: Number(id),
          title: deckData.title,
          description: deckData.description,
          visibility: deckData.visibility,
          cards: deckData.cards,
        });
      } else {
        // Uses /decks/start-generate/ (not the legacy /decks/create-with-cards/, which
        // hard-requires a Project). `id` here is a KnowledgeSource id, not a Project id,
        // so no project_id is sent — the topic association goes through tag_group_ids.
        const tagGroupId = activeTagGroupId;
        const payload = {
          title: deckData.title,
          description: deckData.description,
          visibility: deckData.visibility,
          section_ids: deckData.section_ids,
          document_ids: deckData.document_ids,
          cards_count: Number(deckData.cards_count || 3),
        };
        if (tagGroupId) payload.tag_group_ids = [Number(tagGroupId)];
        const result = await projectService.startGenerateDeck(payload);
        const runId = result?.process_run?.run_id;
        if (runId) {
          trackItemJob({ kind: "deck", tagGroupId, resourceId: result?.deck?.id, title: deckData.title, runId });
        }
      }
      setShowAddDeck(false);
      setActiveTagGroupId(null);
      loadResults();
      loadTagGroups();
    } catch (err) {
      console.error("Deck creation error:", err);
      setShowAddDeck(false);
      setActiveTagGroupId(null);
    }
  };

  const handleGenerateBattery = async (batteryData) => {
    try {
      const tagGroupId = activeTagGroupId;
      const payload = {
        name: batteryData.query_text?.trim() || t("enterprise.knowledge.processDetail.battery"),
        query_text: batteryData.query_text,
        sections: batteryData.sections.map((s) => s.id),
        quantity: Number(batteryData.quantity),
        difficulty: batteryData.difficulty,
        question_format: batteryData.question_format,
      };
      if (batteryData.rule) payload.rule = Number(batteryData.rule);
      if (tagGroupId) payload.tag_group_ids = [Number(tagGroupId)];
      const result = await projectService.startGenerateBattery(payload);
      const runId = result?.process_run?.run_id;
      if (runId) {
        trackItemJob({ kind: "battery", tagGroupId, resourceId: result?.battery?.id, title: payload.name, runId });
      }
      setShowAddBattery(false);
      setActiveTagGroupId(null);
      loadResults();
      loadTagGroups();
    } catch (err) {
      console.error("Battery generation error:", err);
      setShowAddBattery(false);
      setActiveTagGroupId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget._kind === "topic") {
        await collectionApi.deleteTagGroup(deleteTarget.id);
        setResults((prev) => ({
          ...prev,
          topics: prev.topics.filter((t) => String(t.id) !== String(deleteTarget.id)),
          decks: prev.decks.filter((d) => String(d.tag_group_id) !== String(deleteTarget.id)),
          batteries: prev.batteries.filter((b) => String(b.tag_group_id) !== String(deleteTarget.id)),
        }));
      } else if (deleteTarget._kind === "deck") {
        await projectService.deleteDeck(deleteTarget.id);
        setResults((prev) => ({ ...prev, decks: prev.decks.filter((d) => d.id !== deleteTarget.id) }));
      } else {
        await projectService.deleteBattery(deleteTarget.id);
        setResults((prev) => ({ ...prev, batteries: prev.batteries.filter((b) => b.id !== deleteTarget.id) }));
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleting(false);
    }
  };

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Recover a previous run from localStorage or API, or auto-trigger for fresh KS
  useEffect(() => {
    if (!ks) return;
    if (genState.status !== "idle") return;

    const storedRunId = localStorage.getItem(`ks_run_${id}`);
    if (storedRunId) {
      recoverRun(storedRunId);
      return;
    }

    const docIds = (ks.documents || []).map((d) => d.id);
    if (!docIds.length) return;

    // Try to find a previous run for these exact documents
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const resourceId = [...docIds].sort((a, b) => a - b).join(",");
        const res = await fetch(
          `${API_BASE}/process-runs/?workflow_key=collection_auto_generate&resource_type=document_batch&resource_id=${encodeURIComponent(resourceId)}`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const runs = data.results || [];

        if (runs.length > 0) {
          // Prefer terminal runs (completed/failed) over queued/running ones
          const TERMINAL_PREF = ["completed", "completed_with_errors", "failed"];
          const bestRun = runs.find((r) => TERMINAL_PREF.includes(r.status))
            || runs.find((r) => r.status === "running");
          if (bestRun) {
            localStorage.setItem(`ks_run_${id}`, bestRun.run_id);
            recoverRun(bestRun.run_id);
          }
          // Any runs exist → don't auto-trigger (user can click manually)
          return;
        }
      } catch { /* ignore */ }

      // Truly no runs at all — auto-trigger only for a fresh pending KS
      if (ks.status === "pending" && ks.documents?.length > 0) {
        startAutoGen(docIds);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ks?.id]);

  const applyRunData = (data, runId) => {
    const terminal = TERMINAL_STATUSES.has(data.status);
    setGenState({
      status: data.status,
      runId,
      progress: data.progress_percent ?? 0,
      message: data.status_message || "",
      stage: data.current_stage || "",
      steps: data.steps || [],
      artifacts: data.artifacts || [],
      error: FAILED_STATUSES.has(data.status) ? (data.status_message || data.error_payload?.error || "") : "",
    });
    return terminal;
  };

  const recoverRun = async (runId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/process-runs/${runId}/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem(`ks_run_${id}`);
        return;
      }
      const data = await res.json();
      // Discard canceled or stuck-queued runs — let results tab handle display
      const useless = [...CANCEL_STATUSES, "queued", "draft"];
      if (useless.includes(data.status)) {
        localStorage.removeItem(`ks_run_${id}`);
        return;
      }
      const terminal = applyRunData(data, runId);
      setBannerVisible(true);
      setBannerCollapsed(terminal); // collapse banner when already done
      if (!terminal) startPolling(runId);
    } catch {
      // ignore
    }
  };

  const startAutoGen = async (docIds) => {
    if (!docIds?.length) return;
    setGenState({ ...INIT_GEN, status: "running" });
    setBannerVisible(true);
    setBannerCollapsed(false);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/process-runs/auto-generate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
        body: JSON.stringify({
          document_ids: docIds,
          tag_group_size: 10,
          flashcard_options: {
            cards_per_group: ks?.cards_per_group ?? 20,
            difficulty: ks?.difficulty ?? "medium",
          },
          battery_options: {
            questions_per_group: ks?.questions_per_group ?? 15,
            difficulty: ks?.difficulty ?? "medium",
            question_format: ks?.question_format ?? "multiple_choice",
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setGenState((s) => ({ ...s, status: "failed", error: json.detail || t("enterprise.knowledge.processDetail.errors.startGenFailed") }));
        return;
      }
      const runId = json.process_run?.run_id;
      localStorage.setItem(`ks_run_${id}`, runId);
      setGenState((s) => ({ ...s, runId }));
      startPolling(runId);
    } catch (e) {
      setGenState((s) => ({ ...s, status: "failed", error: t("enterprise.knowledge.processDetail.errors.connectionFailed") }));
    }
  };

  const startPolling = (runId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const token = localStorage.getItem("token");

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/process-runs/${runId}/`, {
          headers: { Authorization: `Token ${token}` },
        });
        const data = await res.json();
        const terminal = applyRunData(data, runId);

        if (terminal) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setBannerCollapsed(true); // auto-collapse when done
          loadKs();
          loadResults();
        }
      } catch {
        // ignore transient errors
      }
    }, 3000);
  };

  const handleStop = async () => {
    if (!genState.runId) return;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE}/process-runs/${genState.runId}/cancel/`, {
        method: "POST",
        headers: { Authorization: `Token ${token}` },
      });
    } catch {
      // best-effort
    }
    setGenState((s) => ({ ...s, status: "canceled", message: t("enterprise.knowledge.processDetail.errors.stoppedByUser") }));
  };

  const handleAutoGen = () => {
    setBannerCollapsed(false);
    // If already running, just reveal the banner
    if (genState.status === "running") { setBannerVisible(true); return; }
    // If no documents, open the add-doc modal instead
    if (!ks?.documents?.length) { setShowAddDoc(true); return; }
    startAutoGen(ks.documents.map((d) => d.id));
  };

  const handleDocAdded = (updatedKs) => {
    setKs(updatedKs);
    // Auto-trigger generation after first document is added
    const newDocs = updatedKs.documents || [];
    if (newDocs.length > 0 && genState.status === "idle") {
      startAutoGen(newDocs.map((d) => d.id));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-7 h-7 border-2 rounded-full animate-spin" />
    </div>
  );

  if (!ks) return (
    <div className="flex flex-col items-center py-24 text-center">
      <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>{t("enterprise.knowledge.processDetail.processNotFound")}</p>
      <button onClick={() => navigate(backHref)} className="ank-btn-ghost text-xs mt-4">
        <ArrowLeftIcon className="h-3.5 w-3.5" /> {backLabel}
      </button>
    </div>
  );

  // Can reorder if: Django staff, OR enterprise admin+, OR creator of this KS
  const canReorder = isPlatformAdmin || hasMinRole("admin") || (ks.created_by_id != null && ks.created_by_id === user?.id);
  const typeColor = TYPE_COLORS[ks.process_type] || { bg: "var(--bg-elevated)", text: "var(--text-secondary)" };
  const diffColor = DIFF_COLORS[ks.difficulty] || { bg: "var(--bg-elevated)", text: "var(--text-secondary)" };
  const statusBg = STATUS_BG[ks.status] || STATUS_BG.pending;
  const docs = ks.documents || [];
  const isRunning = genState.status === "running";

  return (
    <div className="space-y-0 w-full">
      {/* Back */}
      <button onClick={() => navigate(backHref)}
        style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 5, fontSize: 12, marginBottom: 20, cursor: "pointer" }}
        className="hover:opacity-70 transition-opacity">
        <ArrowLeftIcon style={{ width: 13, height: 13 }} /> {backLabel}
      </button>

      {/* Header */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
        <div className="flex items-start gap-4">
          <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, flexShrink: 0 }}>
            {(ks.title || "P").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18 }}>{ks.title}</h1>
              {ks.source_type && (
                <Pill label={enumLabel(SOURCE_LABELS, ks.source_type, "source_type")} style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }} />
              )}
              {ks.process_type && (
                <Pill label={enumLabel(TYPE_LABELS, ks.process_type, "process_type")} style={{ background: typeColor.bg, color: typeColor.text }} />
              )}
              {ks.difficulty && (
                <Pill label={ENUMS.difficulty(ks.difficulty)} style={{ background: diffColor.bg, color: diffColor.text }} />
              )}
              <Pill label={enumLabel(STATUS_LABELS, ks.status, "status")} style={{ background: statusBg.bg, color: statusBg.text }} />
            </div>
            {ks.description && (
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 5, lineHeight: 1.6 }}>{ks.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1.5">
                <DocumentArrowUpIcon style={{ width: 12, height: 12 }} />
                {t("enterprise.knowledge.processDetail.documentsCount", { count: docs.length, plural: docs.length !== 1 ? "s" : "" })}
              </span>
              {ks.estimated_duration_minutes && (
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1.5">
                  <ClockIcon style={{ width: 12, height: 12 }} />
                  {ks.estimated_duration_minutes} {t("enterprise.knowledge.sourceNew.minutesAbbr")}
                </span>
              )}
              {ks.minimum_passing_score != null && (
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1.5">
                  <CheckCircleIcon style={{ width: 12, height: 12 }} />
                  {t("enterprise.knowledge.processDetail.passingScore", { n: ks.minimum_passing_score })}
                </span>
              )}
              {isRunning && (
                <span style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }} className="flex items-center gap-1.5">
                  <ArrowPathIcon style={{ width: 12, height: 12 }} className="animate-spin" />
                  {t("enterprise.knowledge.processDetail.generatingContent")}
                </span>
              )}
            </div>
          </div>
          {/* Header actions — always visible */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAutoGen}
              disabled={isRunning}
              className="ank-btn-accent text-xs"
              style={{ opacity: isRunning ? 0.7 : 1 }}
              title={docs.length === 0 ? t("enterprise.knowledge.processDetail.attachDocumentFirst") : t("enterprise.knowledge.processDetail.generateFromDocumentsTitle")}>
              {isRunning
                ? <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> {t("enterprise.knowledge.processDetail.generating")}</>
                : <><SparklesIcon className="h-3.5 w-3.5" /> {t("enterprise.knowledge.processDetail.autoGenerate")}</>}
            </button>
            <button onClick={() => setShowAddDoc(true)} className="ank-btn-ghost text-xs">
              <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.knowledge.processDetail.addDoc")}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Gen Banner — inline, non-blocking */}
      {bannerVisible && (
        <AutoGenBanner
          runState={genState}
          collapsed={bannerCollapsed}
          onToggle={() => setBannerCollapsed((v) => !v)}
          onDismiss={() => { setBannerVisible(false); setGenState(INIT_GEN); localStorage.removeItem(`ks_run_${id}`); }}
          onStop={handleStop}
        />
      )}

      {/* Two-column layout: Documentos | Estructura de conocimiento */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 340px) 1fr", gap: 16, marginTop: 16, alignItems: "start" }}>
        <DocumentsPanel docs={docs} onAdd={(dropped) => { setDroppedFiles(dropped || []); setShowAddDoc(true); }} />
        <KnowledgeStructurePanel
          topics={results.topics}
          decks={results.decks}
          batteries={results.batteries}
          loading={resultsLoading}
          tagGroups={tagGroups}
          tagGroupContent={tagGroupContent}
          tagGroupsLoading={tagGroupsLoading}
          canReorder={canReorder}
          onTagGroupDecksReorder={handleTagGroupDecksReorder}
          onTagGroupBatteriesReorder={handleTagGroupBatteriesReorder}
          onTopicDecksReorder={handleTopicDecksReorder}
          onTopicBatteriesReorder={handleTopicBatteriesReorder}
          onStudy={setStudyDeck}
          onLearn={setLearnDeck}
          onSimulate={setSimulationBattery}
          onDeleteBattery={(b) => setDeleteTarget({ ...b, _kind: "battery" })}
          onDeleteDeck={(d) => setDeleteTarget({ ...d, _kind: "deck" })}
          onDeleteTopic={setDeleteTarget}
          onAutoGen={handleAutoGen}
          onAddDeck={handleOpenAddDeck}
          onAddBattery={handleOpenAddBattery}
          itemJobs={itemJobs}
          onDismissItemJob={removeItemJob}
        />
      </div>

      {/* Add Document Modal (still a modal — user explicitly triggered) */}
      {showAddDoc && (
        <AddDocModal
          ksId={id}
          companyId={activeCompanyId}
          onClose={() => { setShowAddDoc(false); setDroppedFiles([]); }}
          onAdded={handleDocAdded}
          initialFiles={droppedFiles}
        />
      )}

      <ExamSimulatorDialog
        open={!!simulationBattery}
        handler={() => setSimulationBattery(null)}
        battery={simulationBattery}
        onFinish={loadResults}
      />

      <FlashcardViewDialog
        open={!!studyDeck}
        onClose={() => setStudyDeck(null)}
        deckId={studyDeck?.id}
        deckTitle={studyDeck?.title}
      />

      <FlashcardLearnDialog
        open={!!learnDeck}
        onClose={() => setLearnDeck(null)}
        deckId={learnDeck?.id}
        deckTitle={learnDeck?.title}
        jobId={learnDeck?.external_job_id}
      />

      <ConfirmDeleteDialog
        target={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />

      <EnterpriseDeckDialog
        open={showAddDeck}
        onClose={() => { setShowAddDeck(false); setActiveTagGroupId(null); }}
        onCreate={handleCreateDeck}
        projectId={id}
      />

      <EnterpriseBatteryDialog
        open={showAddBattery}
        onClose={() => { setShowAddBattery(false); setActiveTagGroupId(null); }}
        onGenerate={handleGenerateBattery}
        projectId={id}
      />
    </div>
  );
}

export default ProcessDetail;
