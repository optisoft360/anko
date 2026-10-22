import React, { useEffect, useState, useCallback, useMemo } from "react";
import { enumLabel, useKnowledgeEnumLabels } from "@/utils/enumLabel";
import { bestAttemptPercent } from "@/utils/batteryProgress";
import { useNavigate } from "react-router-dom";
import {
  CheckCircleIcon, LockClosedIcon, PlayIcon,
  ClockIcon, BoltIcon,
  ChevronRightIcon, ArrowPathIcon, BookOpenIcon,
  ViewColumnsIcon, XMarkIcon, ArrowTopRightOnSquareIcon, EyeIcon,
} from "@heroicons/react/24/outline";
import { learningApi, knowledgeApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";
import { ExamSimulatorDialog } from "@/widgets/dialogs/index";
import { FlashcardViewDialog } from "@/widgets/dialogs/flashcard-view-dialog";
import { FlashcardLearnDialog } from "@/widgets/dialogs/flashcard-learn-dialog";

// This component is the single place that renders "go complete this Learning
// Path assignment" — the process node list (Learn/Study/Simular + "Mark
// process complete") and the completed banner with the certificate link.
// Used by both the Learning Path "My Assignments" detail page and the
// Compliance Program detail page (a Compliance Requirement points at a real
// Learning Path, and completing it here is what completes the compliance
// assignment too — see ComplianceService.auto_complete_on_path_completion).

// ─── Shared helpers ───────────────────────────────────────────────────────────

function ProgressBar({ value, color = "var(--accent)" }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 400ms" }} />
    </div>
  );
}

// ─── Documents (read-only: viewable, not uploadable) ──────────────────────────

function DocumentsMiniPanel({ documents, onView }) {
  const { t } = useLanguage();
  if (!documents || documents.length === 0) return null;
  return (
    <>
      {/* Tablet/desktop — original compact list, unchanged */}
      <div className="hidden sm:block" style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
            {t("enterprise.learning.progress.documentsTitle", { count: documents.length })}
          </p>
        </div>
        <div style={{ padding: 8 }}>
          {documents.map((doc) => {
            const ext = doc.type?.toUpperCase() || (doc.filename?.split(".").pop()?.toUpperCase()) || "FILE";
            return (
              <button key={doc.id} onClick={() => onView(doc)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 7, background: "transparent", border: "none", cursor: "pointer", textAlign: "left", transition: "background 150ms" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-elevated)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ width: 26, height: 30, background: ext === "PDF" ? "#DC2626" : "#3B82F6", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontSize: 6, fontWeight: 800 }}>{ext.slice(0, 4)}</span>
                </div>
                <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.filename}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-tertiary)", flexShrink: 0 }}>{t("enterprise.learning.progress.viewArrow")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile — label above, each document as its own roomy card */}
      <div className="sm:hidden" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
          {t("enterprise.learning.progress.documentsTitle", { count: documents.length })}
        </p>
        {documents.map((doc) => {
          const ext = doc.type?.toUpperCase() || (doc.filename?.split(".").pop()?.toUpperCase()) || "FILE";
          return (
            <button key={doc.id} onClick={() => onView(doc)}
              className="w-full flex items-center gap-3"
              style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 8, cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 38, height: 44, background: ext === "PDF" ? "#DC2626" : "#3B82F6", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>{ext.slice(0, 4)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)" }} className="truncate">{doc.filename}</p>
                <p style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 2 }}>{t("enterprise.learning.progress.docSubtitle")}</p>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <EyeIcon style={{ width: 15, height: 15, color: "var(--text-secondary)" }} />
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function DocumentViewDialog({ doc, onClose }) {
  const { t } = useLanguage();
  if (!doc) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--lt-rgba-0-0-0-0-6, rgba(0,0,0,0.6))" }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ height: 2, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)", flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.filename}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748B", flexShrink: 0 }}>
            <XMarkIcon style={{ width: 16, height: 16 }} />
          </button>
        </div>
        {doc.url && (
          <div style={{ padding: "10px 18px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", flexShrink: 0 }}>
            <a href={doc.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--lt-818cf8, #818CF8)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, textDecoration: "none" }}>
              {t("enterprise.learning.progress.openOriginal")} <ArrowTopRightOnSquareIcon style={{ width: 12, height: 12 }} />
            </a>
          </div>
        )}
        <div style={{ padding: "14px 18px", overflowY: "auto" }}>
          {(!doc.sections || doc.sections.length === 0) ? (
            <p style={{ fontSize: 12, color: "var(--lt-475569, #475569)", textAlign: "center", padding: "20px 0" }}>{t("enterprise.learning.progress.noSections")}</p>
          ) : (
            <div className="space-y-3">
              {doc.sections.map((s) => (
                <div key={s.id}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--lt-e2e8f0, #E2E8F0)", marginBottom: 4 }}>{s.title || t("enterprise.learning.progress.noTitle")}</p>
                  {s.content && <p style={{ fontSize: 12, color: "var(--lt-94a3b8, #94A3B8)", lineHeight: 1.6 }}>{s.content}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Read-only deck / battery rows (Learn/Study/Simular only) ─────────────────

function ReadOnlyDeckRow({ deck, onLearn, onStudy }) {
  const { t } = useLanguage();
  const cardCount = deck.flashcards_count ?? deck.cardsCount ?? deck.card_count ?? 0;

  const icon = (
    <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <ViewColumnsIcon style={{ width: 13, height: 13, color: "var(--lt-818cf8, #818CF8)" }} />
    </div>
  );
  const badge = (
    <span style={{ padding: "1px 7px", borderRadius: 20, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.15)", color: "var(--lt-818cf8, #818CF8)", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{t("enterprise.learning.progress.cardsCount", { n: cardCount })}</span>
  );
  const learnBtn = (
    <button onClick={() => onLearn?.(deck)}
      style={{ padding: "5px 10px", borderRadius: 6, background: "transparent", border: "1px solid rgba(99,102,241,0.25)", color: "var(--lt-818cf8, #818CF8)", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      {t("enterprise.learning.progress.learnBtn")}
    </button>
  );
  const studyBtn = (
    <button onClick={() => onStudy?.(deck)}
      style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--lt-818cf8, #818CF8)", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.18)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}>
      {t("enterprise.learning.progress.studyBtn")}
    </button>
  );

  // Mobile-only variants — bigger icon, roomier card, matches the reference mock
  const mobileIcon = (
    <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(99,102,241,0.14)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <ViewColumnsIcon style={{ width: 21, height: 21, color: "var(--lt-818cf8, #818CF8)" }} />
    </div>
  );

  return (
    <>
      {/* Tablet/desktop — original single-row layout, unchanged */}
      <div className="hidden sm:flex sm:items-center sm:gap-2" style={{ background: "var(--lt-rgba-255-255-255-0-025, rgba(255,255,255,0.025))", border: "1px solid var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", borderRadius: 8, marginBottom: 6, padding: "8px 12px", minWidth: 0 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", flexShrink: 0, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={deck.title}>{deck.title}</span>
        {badge}
        <span style={{ flex: 1, fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {deck.description || t("enterprise.learning.progress.deckDefaultDesc")}
        </span>
        {learnBtn}
        {studyBtn}
      </div>

      {/* Mobile — real deck title (2 lines max) and the same actions as desktop (Learn + Study) */}
      <div className="sm:hidden" data-testid="assignment-deck-card" style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 10, padding: "14px" }}>
        <div className="flex items-start gap-3">
          {mobileIcon}
          <div className="flex-1 min-w-0">
            {badge}
            <p className="[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)", marginTop: 6, lineHeight: 1.35 }} title={deck.title}>
              {deck.title || t("enterprise.learning.progress.deckMobileTitle")}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => onLearn?.(deck)}
            className="min-h-[44px] flex-1 basis-[40%] rounded-[10px] border border-[#C7D2FE] bg-white px-3 text-sm font-bold text-[#4338CA] active:bg-[#EEF2FF]">
            {t("enterprise.learning.progress.learnBtn")}
          </button>
          <button onClick={() => onStudy?.(deck)}
            className="min-h-[44px] flex-1 basis-[40%] rounded-[10px] border border-[#C7D2FE] bg-[#EEF2FF] px-3 text-sm font-bold text-[#4338CA] active:bg-[#E0E7FF]">
            {t("enterprise.learning.progress.studyBtn")}
          </button>
        </div>
      </div>
    </>
  );
}

function ReadOnlyBatteryRow({ battery, onSimulate }) {
  const { t } = useLanguage();
  const questionCount = battery.question_count ?? 0;
  const pct = bestAttemptPercent(battery);  // 14: same rule as the process view
  const hasAttempt = pct !== null;
  const pctRounded = hasAttempt ? Math.round(pct) : 0;
  const pctColor = pctRounded >= 80 ? "#4ade80" : pctRounded >= 50 ? "#f59e0b" : "#818CF8";

  const icon = (
    <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(94,106,210,0.12)", border: "1px solid rgba(94,106,210,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <BoltIcon style={{ width: 13, height: 13, color: "var(--lt-818cf8, #818CF8)" }} />
    </div>
  );
  const badge = (
    <span style={{ padding: "1px 7px", borderRadius: 20, background: "rgba(94,106,210,0.1)", border: "1px solid rgba(94,106,210,0.15)", color: "var(--lt-818cf8, #818CF8)", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{t("enterprise.learning.progress.questionsCount", { n: questionCount })}</span>
  );
  const progressMini = (
    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
      <div style={{ width: 52, height: 4, background: "var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${hasAttempt ? pctRounded : 0}%`, background: pctColor, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: hasAttempt ? pctColor : "var(--lt-334155, #334155)", minWidth: 28, textAlign: "right" }}>
        {hasAttempt ? `${pctRounded}%` : "—"}
      </span>
    </div>
  );
  const simulateBtn = (
    <button onClick={() => onSimulate?.(battery)}
      style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(94,106,210,0.1)", border: "1px solid rgba(94,106,210,0.2)", color: "var(--lt-818cf8, #818CF8)", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(94,106,210,0.18)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(94,106,210,0.1)"; }}>
      {t("enterprise.learning.progress.simulateBtn")}
    </button>
  );

  // Mobile-only variants — bigger icon, roomier card, matches the reference mock
  const mobileIcon = (
    <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(94,106,210,0.16)", border: "1px solid rgba(94,106,210,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <BoltIcon style={{ width: 21, height: 21, color: "var(--lt-818cf8, #818CF8)" }} />
    </div>
  );
  const mobileProgressMini = hasAttempt && (
    <div className="flex items-center gap-2 mt-1.5">
      <div style={{ width: 70, height: 4, background: "var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", borderRadius: 2, overflow: "hidden", flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${pctRounded}%`, background: pctColor, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: pctColor }}>{pctRounded}%</span>
    </div>
  );

  return (
    <>
      {/* Tablet/desktop — original single-row layout, unchanged */}
      <div className="hidden sm:flex sm:items-center sm:gap-2" style={{ background: "var(--lt-rgba-255-255-255-0-025, rgba(255,255,255,0.025))", border: "1px solid var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", borderRadius: 8, marginBottom: 6, padding: "8px 12px", minWidth: 0 }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", flexShrink: 0, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={battery.name || battery.title}>{battery.name || battery.title}</span>
        {badge}
        <span style={{ flex: 1, fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
          {battery.description || t("enterprise.learning.progress.batteryDefaultDesc")}
        </span>
        {progressMini}
        {simulateBtn}
      </div>

      {/* Mobile — real battery name (2 lines max); progress once there's a real attempt; Simulate */}
      <div className="sm:hidden" data-testid="assignment-battery-card" style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 10, padding: "14px" }}>
        <div className="flex items-start gap-3">
          {mobileIcon}
          <div className="flex-1 min-w-0">
            {badge}
            <p className="[display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden" style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)", marginTop: 6, lineHeight: 1.35 }} title={battery.name || battery.title}>
              {battery.name || battery.title || t("enterprise.learning.progress.batteryMobileTitle")}
            </p>
            {mobileProgressMini}
          </div>
        </div>
        <button onClick={() => onSimulate?.(battery)}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1 rounded-[10px] border border-[#C7D2FE] bg-[#EEF2FF] px-3 text-sm font-bold text-[#4338CA] active:bg-[#E0E7FF]">
          {t("enterprise.learning.progress.simulateBtn")} <ChevronRightIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </>
  );
}

function ReadOnlyTopicSection({ topic, index, decks, batteries, isLast, onStudy, onLearn, onSimulate }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(true);
  const tagCount = topic.tags?.length || 0;
  const description = topic.tags?.slice(0, 5).join(", ") || "";

  return (
    <div style={{ display: "flex", minWidth: 0 }}>
      {/* Dot + connecting line gutter — tablet/desktop only. On mobile this was pushing the whole
          topic card to the right, leaving dead space on the left where the course/documents cards
          above start flush; the dot moves inline into the header there instead. */}
      <div className="hidden sm:flex" style={{ width: 22, flexDirection: "column", alignItems: "center", marginRight: 14, flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#4ade80", border: "2px solid var(--lt-0f172a, #0F172A)", flexShrink: 0, marginTop: 7 }} />
        {!isLast && <div style={{ width: 2, flex: 1, background: "var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", minHeight: 24, marginTop: 4 }} />}
      </div>
      {/* On mobile the header + rows sit flush-left inside their own bordered card (matches the
          reference mock); on tablet/desktop it stays the plain indented list it always was. */}
      <div
        className="rounded-2xl border-[var(--border)] bg-[var(--bg-app)] p-3.5 mb-4 sm:mb-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0"
        style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 8 : 20, borderWidth: 1 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: expanded ? 8 : 0 }}>
          <span className="inline-flex sm:hidden flex-shrink-0" style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
          <button onClick={() => setExpanded((v) => !v)} style={{ color: "#64748B", cursor: "pointer", padding: 0, background: "none", border: "none", display: "flex", alignItems: "center", flexShrink: 0 }}>
            {expanded ? <ChevronRightIcon style={{ width: 13, height: 13, transform: "rotate(90deg)" }} /> : <ChevronRightIcon style={{ width: 13, height: 13 }} />}
          </button>
          <span className="hidden sm:inline" style={{ fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", fontSize: 13, flexShrink: 0 }}>{t("enterprise.learning.progress.topicLabel", { n: index + 1 })}</span>
          <span className="sm:hidden min-w-0 flex-1 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden" style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 13.5, lineHeight: 1.35 }}>
            {topic.title || t("enterprise.learning.progress.topicLabel", { n: index + 1 })}
          </span>
          <span style={{ padding: "1px 7px", borderRadius: 20, background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", border: "1px solid var(--lt-rgba-255-255-255-0-09, rgba(255,255,255,0.09))", color: "#64748B", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>{t("enterprise.learning.progress.tagsCount", { n: tagCount })}</span>
          <span className="hidden sm:inline" style={{ fontSize: 11, color: "#64748B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{description}</span>
        </div>
        {expanded && (
          <div className="sm:ml-1.5">
            {decks.map((d) => <ReadOnlyDeckRow key={d.id} deck={d} onLearn={onLearn} onStudy={onStudy} />)}
            {batteries.map((b) => <ReadOnlyBatteryRow key={b.id} battery={b} onSimulate={onSimulate} />)}
            {decks.length === 0 && batteries.length === 0 && (
              <p style={{ fontSize: 11, color: "var(--lt-475569, #475569)", padding: "4px 0" }}>{t("enterprise.learning.progress.noTopicContent")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Process knowledge view (replaces the old empty legacy tabs) ──────────────
// Reads the module's real Knowledge Source structure (topics/decks/batteries),
// same data ProcessDetail.jsx uses, but strictly read-only: no upload, no
// auto-generate, no add/delete — just Learn/Study/Simular + document viewing.

function ProcessKnowledgeView({ ksId, moduleId, assignmentId, alreadyCompleted, onComplete, onProgress }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [topics, setTopics] = useState([]);
  const [contentByTopic, setContentByTopic] = useState({});
  const [viewingDoc, setViewingDoc] = useState(null);
  const [studyDeck, setStudyDeck] = useState(null);
  const [learnDeck, setLearnDeck] = useState(null);
  const [simulationBattery, setSimulationBattery] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [doneNow, setDoneNow] = useState(false);

  const loadContent = useCallback(({ silent } = {}) => {
    if (!ksId) { setLoading(false); return; }
    if (!silent) setLoading(true);

    return Promise.all([
      knowledgeApi.getDocumentsWithSections(ksId).catch(() => ({ documents: [] })),
      // NOTE: topics/decks/batteries for a KS process come from /results/, not
      // from collectionApi.getTagGroups — TagGroup.collection_id is always
      // null for KS-generated tag groups, so the tag-groups-by-collection
      // endpoint is always empty here (see project-ks-project-collection-model
      // memory). /results/ returns the real flat topics/decks/batteries,
      // matched via each deck/battery's own tag_group_id.
      knowledgeApi.getResults(ksId).catch(() => ({ topics: [], decks: [], batteries: [] })),
    ]).then(([docsRes, results]) => {
      setDocuments(docsRes.documents || []);
      const topicList = results.topics || [];
      setTopics(topicList);

      const contentMap = {};
      topicList.forEach((topic) => {
        contentMap[topic.id] = {
          decks: (results.decks || []).filter((d) => String(d.tag_group_id) === String(topic.id)),
          batteries: (results.batteries || []).filter((b) => String(b.tag_group_id) === String(topic.id)),
        };
      });
      setContentByTopic(contentMap);
    }).finally(() => setLoading(false));
  }, [ksId]);

  useEffect(() => { loadContent(); }, [loadContent]);

  // Average battery completion for this process — same calculation (and same
  // Number() fix to avoid NaN from the string "percent" the API returns) as
  // "Completitud del proceso" on the admin Knowledge Source page.
  const avgBatteryPercent = useMemo(() => {
    const allBatteries = Object.values(contentByTopic).flatMap((c) => c.batteries || []);
    if (allBatteries.length === 0) return null;
    const sum = allBatteries.reduce((s, b) => s + (bestAttemptPercent(b) ?? 0), 0);
    return Math.round(sum / allBatteries.length);
  }, [contentByTopic]);

  useEffect(() => {
    onProgress?.(moduleId, avgBatteryPercent);
  }, [avgBatteryPercent, moduleId, onProgress]);

  const isDone = alreadyCompleted || doneNow;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await learningApi.completeModule(assignmentId, { module_id: moduleId });
      setDoneNow(true);
      onComplete?.(moduleId);
    } catch {}
    setCompleting(false);
  };

  if (!ksId) {
    return (
      <div style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 8, padding: "28px 20px", textAlign: "center" }}>
        <BookOpenIcon style={{ width: 18, height: 18, color: "var(--text-tertiary)", margin: "0 auto 8px" }} />
        <p style={{ color: "var(--text-tertiary)", fontSize: 12 }}>{t("enterprise.learning.progress.notLinked")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-6 h-6 border-2 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg-app)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "16px 18px" }}>
        <DocumentsMiniPanel documents={documents} onView={setViewingDoc} />

        <p style={{ fontSize: 10, fontWeight: 800, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
          {t("enterprise.learning.progress.knowledgeStructure")}
        </p>

        {topics.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "12px 0" }}>{t("enterprise.learning.progress.noTopicsYet")}</p>
        ) : (
          topics.map((topic, i) => (
            <ReadOnlyTopicSection
              key={topic.id}
              topic={topic}
              index={i}
              isLast={i === topics.length - 1}
              decks={contentByTopic[topic.id]?.decks || []}
              batteries={contentByTopic[topic.id]?.batteries || []}
              onLearn={setLearnDeck}
              onStudy={setStudyDeck}
              onSimulate={setSimulationBattery}
            />
          ))
        )}
      </div>

      {!isDone && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px", background: "var(--bg-surface)", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleComplete} disabled={completing} className="ank-btn-accent text-xs min-h-[44px] w-full justify-center sm:min-h-0 sm:w-auto" style={{ opacity: completing ? 0.7 : 1 }}>
            {completing ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircleIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.progress.markComplete")}</>}
          </button>
        </div>
      )}
      {isDone && (
        <div style={{ borderTop: "1px solid var(--border)", padding: "10px 18px", background: "var(--bg-surface)", display: "flex", alignItems: "center", gap: 6, color: "var(--lt-4ade80, #4ade80)", fontSize: 11, fontWeight: 700 }}>
          <CheckCircleIcon style={{ width: 13, height: 13 }} /> {t("enterprise.learning.progress.completedLabel")}
        </div>
      )}

      <DocumentViewDialog doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      <FlashcardViewDialog open={!!studyDeck} onClose={() => setStudyDeck(null)} deckId={studyDeck?.id} deckTitle={studyDeck?.title} />
      <FlashcardLearnDialog open={!!learnDeck} onClose={() => setLearnDeck(null)} deckId={learnDeck?.id} deckTitle={learnDeck?.title} />
      <ExamSimulatorDialog open={!!simulationBattery} handler={() => setSimulationBattery(null)} battery={simulationBattery} onFinish={() => loadContent({ silent: true })} />
    </div>
  );
}

// ─── Process node (for the path node chain) ───────────────────────────────────

function NodeIcon({ status, size = 30, iconSize = 14 }) {
  if (status === "completed") return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(74,222,128,0.15)", border: "2px solid #4ade80", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <CheckCircleIcon style={{ width: iconSize, height: iconSize, color: "var(--lt-4ade80, #4ade80)" }} />
    </div>
  );
  if (status === "in_progress") return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "rgba(94,106,210,0.2)", border: "2px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <PlayIcon style={{ width: iconSize - 2, height: iconSize - 2, color: "var(--accent)" }} />
    </div>
  );
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--bg-elevated)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <LockClosedIcon style={{ width: iconSize - 2, height: iconSize - 2, color: "var(--text-tertiary)" }} />
    </div>
  );
}

function ProcessNode({ mod, index, status, isLast, isOpen, onClick, assignmentId, onModuleComplete, onModuleProgress, percent }) {
  const ENUMS = useKnowledgeEnumLabels();
  const { t } = useLanguage();
  const typeColor = { document: "#60a5fa", topic: "#a855f7", deck: "#f59e0b", battery: "#f87171", course: "#4ade80" }[mod.process_type] || "var(--text-tertiary)";
  const locked = status === "locked";
  const borderColor = status === "completed" ? "#4ade80" : status === "in_progress" ? "var(--accent)" : "var(--border)";
  const pctColor = status === "completed" ? "#4ade80" : "var(--accent)";

  const typeBadge = mod.process_type && (
    <span style={{ padding: "2px 8px", borderRadius: 20, background: "rgba(148,163,184,0.1)", border: `1px solid ${typeColor}`, color: typeColor, fontSize: 10, fontWeight: 700, textTransform: "uppercase", flexShrink: 0 }}>
      {ENUMS.processType(mod.process_type)}
    </span>
  );
  const durationLabel = (mod.estimated_duration_minutes || 0) > 0 && (
    <span style={{ fontSize: 10, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
      <ClockIcon style={{ width: 9, height: 9 }} /> {mod.estimated_duration_minutes} min
    </span>
  );

  return (
    <div>
      <div className="flex gap-3">
        <div className="hidden sm:flex" style={{ width: 30, flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          <NodeIcon status={status} />
          {!isLast && (
            <div style={{ width: 2, flex: 1, minHeight: 16, background: status === "completed" ? "rgba(74,222,128,0.3)" : "var(--border)", margin: "4px 0", borderRadius: 1 }} />
          )}
        </div>

        <div style={{ flex: 1, marginBottom: isLast ? 0 : 12, minWidth: 0 }}>
          {/* Tablet/desktop — original compact single-line layout, unchanged */}
          <div onClick={() => !locked && onClick()}
            className="hidden sm:block"
            style={{ background: isOpen ? "var(--bg-elevated)" : "var(--bg-surface)", border: `1px solid ${isOpen ? borderColor : "var(--border)"}`, borderRadius: 7, padding: "11px 14px", cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.45 : 1, transition: "all 150ms" }}
            onMouseEnter={(e) => { if (!locked) { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.background = "var(--bg-elevated)"; } }}
            onMouseLeave={(e) => { if (!locked) { e.currentTarget.style.borderColor = isOpen ? borderColor: "var(--border)"; e.currentTarget.style.background = isOpen ? "var(--bg-elevated)" : "var(--bg-surface)"; } }}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", flexShrink: 0 }}>#{index + 1}</span>
                <div className="min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }} className="truncate">{mod.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {mod.process_type && <span style={{ fontSize: 9, fontWeight: 700, color: typeColor, textTransform: "uppercase" }}>{ENUMS.processType(mod.process_type)}</span>}
                    {durationLabel}
                  </div>
                </div>
              </div>
              <ChevronRightIcon style={{ width: 14, height: 14, color: "var(--text-tertiary)", flexShrink: 0, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 200ms" }} />
            </div>
          </div>

          {/* Mobile — self-contained card: big icon top-left, title+badge, round toggle top-right,
              progress bar below (once loaded). Matches the reference mock. */}
          <div onClick={() => !locked && onClick()}
            className="flex sm:hidden flex-col"
            style={{ background: isOpen ? "var(--bg-elevated)" : "var(--bg-surface)", border: `1.5px solid ${isOpen ? borderColor : "var(--border)"}`, borderRadius: 16, padding: 16, cursor: locked ? "not-allowed" : "pointer", opacity: locked ? 0.45 : 1 }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <NodeIcon status={status} size={56} iconSize={24} />
                <div className="min-w-0 pt-0.5">
                  <p style={{
                    fontSize: 19, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.25,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>{mod.name}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {typeBadge}
                    {durationLabel}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", border: "1px solid var(--border)" }}>
                <ChevronRightIcon style={{ width: 13, height: 13, color: "var(--text-tertiary)", transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 200ms" }} />
              </div>
            </div>
            {percent != null && (
              <div style={{ marginTop: 16 }}>
                <ProgressBar value={percent} color={pctColor} />
                <div className="flex items-center justify-between" style={{ marginTop: 7 }}>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{t("enterprise.learning.progress.yourProgress")}</span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <b style={{ color: pctColor }}>{percent}%</b> {t("enterprise.learning.progress.completeWord")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {isOpen && !locked && (
            <div style={{ marginTop: 10 }}>
              <ProcessKnowledgeView
                ksId={mod.knowledge_source}
                moduleId={mod.id}
                assignmentId={assignmentId}
                alreadyCompleted={status === "completed"}
                onComplete={onModuleComplete}
                onProgress={onModuleProgress}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main shared component ─────────────────────────────────────────────────────

export function LearningPathAssignmentProgress({ assignmentId, onAssignmentLoaded, onCompleted }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [assignment, setAssignment] = useState(null);
  const [pathData, setPathData] = useState(null);
  const [singleModule, setSingleModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openNodeId, setOpenNodeId] = useState(null);
  const [completedModIds, setCompletedModIds] = useState(new Set());

  const load = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [a, prog] = await Promise.all([
        learningApi.getAssignment(assignmentId),
        learningApi.getMyProgress(assignmentId).catch(() => null),
      ]);
      setAssignment(a);
      onAssignmentLoaded?.(a);
      if (a.status === "completed") onCompleted?.(a);

      const doneIds = new Set(
        prog?.completed_module_ids ||
        prog?.completed_modules?.map?.((m) => (typeof m === "object" ? m.id : m)) ||
        []
      );
      setCompletedModIds(doneIds);

      const pathId = a.learning_path;
      if (pathId) {
        const pd = await learningApi.getLearningPath(pathId);
        setPathData(pd);
        if (!silent) {
          const mods = pd.modules || [];
          const firstOpen = mods.find((m) => !doneIds.has(m.id));
          if (firstOpen) setOpenNodeId(firstOpen.id);
          else if (mods.length > 0) setOpenNodeId(mods[0].id);
        }
      } else if (a.learning_module) {
        const mod = await learningApi.getModule(a.learning_module).catch(() => null);
        setSingleModule(mod);
      }
    } catch {}
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId]);

  useEffect(() => { load(); }, [load]);

  const getModuleStatus = (mod, idx, mods) => {
    if (completedModIds.has(mod.id)) return "completed";
    const prevOk = idx === 0 || completedModIds.has(mods[idx - 1]?.id);
    return prevOk ? "in_progress" : "locked";
  };

  const mods = pathData?.modules || [];

  const handleModuleComplete = useCallback((moduleId) => {
    setCompletedModIds((prev) => new Set([...prev, moduleId]));
    const idx = mods.findIndex((m) => m.id === moduleId);
    const next = mods[idx + 1];
    if (next) setOpenNodeId(next.id);
    // If that was the last required module, re-fetch so the "completed" state
    // (and anything it triggers server-side, like compliance auto-completion)
    // shows up right away instead of only after a page reload.
    const requiredMods = mods.filter((m) => m.is_required);
    const willAllBeDone = requiredMods.every((m) => m.id === moduleId || completedModIds.has(m.id));
    if (willAllBeDone) load({ silent: true });
  }, [mods, completedModIds, load]);

  // Battery-average progress per module, reported up by each ProcessNode's
  // ProcessKnowledgeView as its own topics/batteries load (see avgBatteryPercent
  // there — same Number()-safe average as "Completitud del proceso" on the
  // admin Knowledge Source page). A module only contributes once its node has
  // been opened at least once (its content is fetched lazily on expand).
  const [moduleBatteryProgress, setModuleBatteryProgress] = useState({});
  const handleModuleProgress = useCallback((moduleId, percent) => {
    setModuleBatteryProgress((prev) => (prev[moduleId] === percent ? prev : { ...prev, [moduleId]: percent }));
  }, []);

  const totalMods = mods.length || 1;
  const completedCount = mods.filter((m) => completedModIds.has(m.id)).length;
  const moduleProgressValues = mods.map((m) => moduleBatteryProgress[m.id]).filter((v) => v != null);
  const overallBatteryPercent = moduleProgressValues.length > 0
    ? Math.round(moduleProgressValues.reduce((s, v) => s + v, 0) / moduleProgressValues.length)
    : 0;
  const isDone = assignment?.status === "completed";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-6 h-6 border-2 rounded-full animate-spin" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>{t("enterprise.learning.progress.notFound")}</p>
    );
  }

  return (
    <div className="space-y-5">
      {mods.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.learning.progress.processesCompleted", { completed: completedCount, total: totalMods })}</span>
            <span style={{ color: isDone ? "var(--lt-4ade80, #4ade80)" : "var(--accent)", fontSize: 11, fontWeight: 700 }}>
              {overallBatteryPercent}%
            </span>
          </div>
          <ProgressBar value={overallBatteryPercent} color={isDone ? "#4ade80" : "var(--accent)"} />
        </div>
      )}

      {/* Process nodes */}
      {mods.length > 0 ? (
        <div>
          <p style={{ color: "var(--text-tertiary)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            {t("enterprise.learning.progress.pathProcesses")}
          </p>
          {mods.map((mod, idx) => (
            <ProcessNode
              key={mod.id}
              mod={mod}
              index={idx}
              status={getModuleStatus(mod, idx, mods)}
              isLast={idx === mods.length - 1}
              isOpen={openNodeId === mod.id}
              onClick={() => setOpenNodeId(openNodeId === mod.id ? null : mod.id)}
              assignmentId={assignmentId}
              onModuleComplete={handleModuleComplete}
              onModuleProgress={handleModuleProgress}
              percent={moduleBatteryProgress[mod.id]}
            />
          ))}
        </div>
      ) : (
        /* Single module assignment */
        <div>
          <p style={{ color: "var(--text-tertiary)", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            {t("enterprise.learning.progress.processContent")}
          </p>
          {assignment.learning_module ? (
            <ProcessKnowledgeView
              ksId={singleModule?.knowledge_source}
              moduleId={assignment.learning_module}
              assignmentId={assignmentId}
              alreadyCompleted={isDone}
            />
          ) : (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "40px 24px", textAlign: "center" }}>
              <BookOpenIcon style={{ width: 20, height: 20, color: "var(--text-tertiary)", margin: "0 auto 8px" }} />
              <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{t("enterprise.learning.progress.noModulesFound")}</p>
            </div>
          )}
        </div>
      )}

      {/* Completed banner */}
      {isDone && (
        <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 8, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div className="flex items-center gap-2.5">
            <CheckCircleIcon style={{ width: 18, height: 18, color: "var(--lt-4ade80, #4ade80)", flexShrink: 0 }} />
            <div>
              <p style={{ color: "var(--lt-4ade80, #4ade80)", fontWeight: 700, fontSize: 13 }}>{t("enterprise.learning.progress.completedTitle")}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>{t("enterprise.learning.progress.completedMessage")}</p>
            </div>
          </div>
          {assignment.issued_certification_id && (
            <button onClick={() => navigate(`/enterprise/certifications/${assignment.issued_certification_id}`)}
              className="ank-btn-accent text-xs" style={{ flexShrink: 0 }}>
              {t("enterprise.learning.progress.viewMyCertificate")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default LearningPathAssignmentProgress;
