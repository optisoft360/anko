import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, IconButton } from "@material-tailwind/react";
import {
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentIcon,
  XMarkIcon,
  TrophyIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/solid";

import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModalGuard } from "@/hooks/useModalGuard";
import { DocumentViewerDialog } from "./document-viewer-dialog";

// ─── Dark theme tokens ────────────────────────────────────────────────────────
const T = {
  bg:          "var(--lt-0f172a, #0F172A)",
  bgElevated:  "var(--lt-1e293b, #1E293B)",
  bgCard:      "var(--lt-162032, #162032)",
  border: "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))",
  borderStrong:"var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))",
  textPrimary: "var(--lt-f1f5f9, #F1F5F9)",
  textMuted:   "var(--lt-94a3b8, #94A3B8)",
  textDim:     "var(--lt-64748b, #64748B)",
  accent:      "#6366F1",
  accentBg:    "rgba(99,102,241,0.12)",
  accentBorder:"rgba(99,102,241,0.35)",
  green:       "var(--lt-22c55e, #22C55E)",
  greenBg:     "rgba(34,197,94,0.10)",
  greenBorder: "rgba(34,197,94,0.35)",
  red:         "var(--lt-ef4444, #EF4444)",
  redBg:       "rgba(239,68,68,0.10)",
  redBorder:   "rgba(239,68,68,0.35)",
  amber:       "var(--lt-f59e0b, #F59E0B)",
  amberBg:     "rgba(245,158,11,0.08)",
  amberBorder: "rgba(245,158,11,0.25)",
};

const isMultiSelect = (type) => {
  if (!type) return false;
  const t = type.toLowerCase();
  return t === "multiselect" || t === "multiple_choice" || t === "multiple" || t === "checkbox";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.accent }}
      className="animate-spin" />
  );
}

function DarkBadge({ children, color = T.accent, bg = T.accentBg }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: bg, color, letterSpacing: "0.05em" }}>
      {children}
    </span>
  );
}

// Applied pass mark (the results screen compares against it; batteries carry no threshold of their own).
const PASS_PERCENT = 60;

// Same rule as calculateScore: every correct option and nothing else (multi), or the correct one.
function isAnsweredCorrectly(q, answer) {
  if (answer == null) return false;
  if (isMultiSelect(q.type)) {
    const correctIds = (q.options || []).filter((o) => o.correct).map((o) => o.id).sort();
    const userIds = (Array.isArray(answer) ? answer : []).slice().sort();
    return correctIds.length === userIds.length && correctIds.every((id, i) => id === userIds[i]);
  }
  return !!(q.options || []).find((o) => o.id === answer)?.correct;
}
const hasAnswer = (answer) => (Array.isArray(answer) ? answer.length > 0 : answer != null);

// Phone-only styles for the assignment page (amber text darkened to AA on the light theme).
const PHONE_CSS = `
  .ank-exam-m { height: 100vh; height: 100dvh; }
  .theme-light .ank-exam-m .ank-expl-text { color: #92400E !important; }
  .theme-light .ank-exam-m .ank-expl-strong { color: #B45309 !important; }
  .ank-exam-m .ank-opt:has(input:focus-visible) { outline: 2px solid #6366F1; outline-offset: 2px; }
`;

// ─── Answer pieces (question screen once "Answer" is shown, and the review) ───

function optionColors({ isSelected, isCorrect, showAnswer }) {
  if (showAnswer && isCorrect) return { borderCol: T.greenBorder, bgCol: T.greenBg };
  if (showAnswer && isSelected) return { borderCol: T.redBorder, bgCol: T.redBg };
  if (!showAnswer && isSelected) return { borderCol: T.accentBorder, bgCol: T.accentBg };
  return { borderCol: T.border, bgCol: T.bgElevated };
}

/** Inside of an option row: the radio/checkbox look, the text and, once answered, the ✓ / ✗. */
function OptionContent({ option, multi, isSelected, showAnswer }) {
  const isCorrect = !!option.correct;
  return (
    <>
      {/* Radio/checkbox */}
      <div aria-hidden style={{
        width: 17, height: 17,
        borderRadius: multi ? 5 : "50%",
        border: `2px solid ${isSelected ? T.accent : T.borderStrong}`,
        background: isSelected ? T.accent : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        transition: "all 0.15s",
      }}>
        {isSelected && <div style={{ width: 6, height: 6, borderRadius: multi ? 2 : "50%", background: "#fff" }} />}
      </div>
      <span style={{ fontSize: 13, color: T.textPrimary, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>{option.text}</span>
      {showAnswer && isCorrect   && <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: T.green }} />}
      {showAnswer && isSelected && !isCorrect && <XCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: T.red }} />}
    </>
  );
}

function ExplanationBlock({ question, language, docId, onOpenDoc, tapStyle, blockRef }) {
  return (
    <div ref={blockRef} data-testid="exam-explanation" style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: 12, padding: "14px 16px", scrollMarginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <LightBulbIcon className="h-4 w-4 flex-shrink-0" style={{ color: T.amber }} />
        <p className="ank-expl-strong" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: T.amber }}>
          {language === "es" ? "Explicación" : "Explanation"}
        </p>
      </div>
      <p className="ank-expl-text" style={{ fontSize: 13, lineHeight: 1.6, color: "#FCD34D" }}>
        {question.explanation || (language === "es" ? "No se proporcionó explicación." : "No explanation provided.")}
      </p>
      {question.page_reference && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ank-expl-strong" style={{ fontSize: 11, fontWeight: 700, color: T.amber, fontStyle: "italic" }}>
            {language === "es" ? "Pág:" : "Page:"} {question.page_reference}
          </span>
          {docId && (
            <button onClick={() => onOpenDoc(question.source_document_id || question.document_id || question.document, question.page_reference)}
              aria-label={language === "es" ? "Ver documento" : "View document"}
              style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: 6, padding: "3px 7px", cursor: "pointer", display: "flex", alignItems: "center", ...tapStyle }}>
              <DocumentIcon className="h-3.5 w-3.5" style={{ color: T.amber }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function VerdictBadge({ correct, answered, language }) {
  return (
    <p data-testid="exam-verdict" role="status"
      style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
        color: correct ? T.green : T.red, background: correct ? T.greenBg : T.redBg, border: `1px solid ${correct ? T.greenBorder : T.redBorder}` }}>
      {correct ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
      {correct
        ? (language === "es" ? "Correcto" : "Correct")
        : !answered
          ? (language === "es" ? "Sin responder" : "Not answered")
          : (language === "es" ? "Incorrecto" : "Incorrect")}
    </p>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
// The wrapper unmounts the exam when there is no battery (the parent closes it by clearing the
// battery), so the inner component always runs the same hooks and starts fresh on every open.
export function ExamSimulatorDialog(props) {
  if (!props.battery) return null;
  return <ExamSimulatorDialogInner {...props} />;
}

/**
 * `mobileOptimized` (assignment page only): on phones, real radio/checkbox options, 44px targets,
 * correct/incorrect badge, Next once answered, review of missed questions, and the
 * back-button/body-restore guard. Desktop and the other callers are unchanged.
 */
function ExamSimulatorDialogInner({ open, handler, battery: initialBattery, onFinish, mobileOptimized = false }) {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const phone = mobileOptimized && isMobile;
  const guardedClose = useModalGuard(open && phone, handler);
  const close = phone ? guardedClose : handler;
  const explanationRef = useRef(null);
  // Results → "Review answers" (assignment page only): read-only view of every question.
  const [reviewing, setReviewing] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("missed");

  // ── Attempt state ──
  const [attempt, setAttempt]           = useState(null);
  const [savingAttempt, setSavingAttempt] = useState(false);
  const [battery, setBattery]           = useState(initialBattery);
  const [loadingBattery, setLoadingBattery] = useState(false);

  const startKeyRef  = useRef(null);
  const startingRef  = useRef(false);
  const didFinishRef = useRef(false);

  // ── Exam state ──
  const [activeStep, setActiveStep]   = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [answerShown, setAnswerShown] = useState(false);
  // Assignment page: once "Answer" shows the correction, that question stays corrected and
  // locked for the rest of the attempt (going Next/Prev used to reset it and allow re-answering).
  const lockAnswers = mobileOptimized;
  const [revealed, setRevealed]       = useState({});
  const [isFinished, setIsFinished]   = useState(false);
  // Bumped by Retry: every retake is a new attempt (a finished one rejects answers).
  const [round, setRound]             = useState(0);

  const questions      = useMemo(() => battery?.questions || [], [battery]);
  const totalQuestions = questions.length;
  const currentQuestion = questions[activeStep];
  const isLocked = (questionId) => lockAnswers && !!revealed[questionId];
  const showAnswer = lockAnswers ? isLocked(currentQuestion?.id) : answerShown;
  const scrollToExplanationRef = useRef(false);
  const revealAnswer = () => {
    scrollToExplanationRef.current = true;
    if (lockAnswers) setRevealed((prev) => ({ ...prev, [currentQuestion.id]: true }));
    else setAnswerShown(true);
  };

  const startKey = useMemo(() => {
    if (!open || !battery?.id) return null;
    return `${battery?.id}-opened-${round}`;
  }, [open, battery?.id, round]);

  // ── Cargar batería + preguntas ──
  // Independent requests: if only the battery detail fails, the exam still runs on the questions
  // (and the battery data the caller already has). Only a failed questions request is an error.
  const [loadError, setLoadError] = useState(false);
  const [loadRound, setLoadRound] = useState(0);
  useEffect(() => {
    if (open && initialBattery) {
      setLoadingBattery(true);
      setLoadError(false);
      Promise.allSettled([
        projectService.getBattery(initialBattery.id),
        projectService.getBatteryQuestions(initialBattery.id),
      ])
        .then(([fullData, qs]) => {
          if (fullData.status === "rejected") console.error("Battery detail failed:", fullData.reason);
          if (qs.status === "rejected") {
            console.error("Battery questions failed:", qs.reason);
            setLoadError(true);
          }
          const questionList = qs.status === "fulfilled" ? (Array.isArray(qs.value) ? qs.value : qs.value?.results || []) : [];
          const base = fullData.status === "fulfilled" ? fullData.value : initialBattery;
          setBattery({ ...base, questions: questionList });
        })
        .finally(() => setLoadingBattery(false));
    }
  }, [open, initialBattery, language, loadRound]);

  // ── Reset al cerrar ──
  useEffect(() => {
    if (open) return;
    setActiveStep(0);
    setUserAnswers({});
    setAnswerShown(false);
    setRevealed({});
    setIsFinished(false);
    setAttempt(null);
    setSavingAttempt(false);
    startKeyRef.current  = null;
    startingRef.current  = false;
    didFinishRef.current = false;
  }, [open]);

  // ── Start attempt ──
  useEffect(() => {
    const run = async () => {
      if (!startKey) return;
      if (!battery?.id) return;
      if (startKeyRef.current === startKey) return;
      if (startingRef.current) return;
      startingRef.current = true;
      try {
        const created = await projectService.startBatteryAttempt(battery.id);
        setAttempt(created);
        startKeyRef.current  = startKey;
        didFinishRef.current = false;
      } catch (e) {
        console.error("start_attempt failed", e);
        setAttempt(null);
        startKeyRef.current = null;
      } finally {
        startingRef.current = false;
      }
    };
    run();
  }, [startKey, battery?.id]);

  // ── Helpers ──
  const handleNext = () => {
    if (activeStep < totalQuestions - 1) {
      setActiveStep((c) => c + 1);
      setAnswerShown(false);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep((c) => c - 1);
      setAnswerShown(false);
    }
  };

  const [viewingDocument, setViewingDocument] = useState(null);
  const [viewingPage, setViewingPage]         = useState(null);

  const handleOpenViewer = (docId, page) => {
    const finalDocId = docId || battery.document_id || (battery.documents && battery.documents[0]?.id);
    if (finalDocId) { setViewingDocument({ id: finalDocId }); setViewingPage(page); }
  };

  const handleOptionSelect = async (questionId, optionId, type) => {
    if (lockAnswers ? isLocked(questionId) : answerShown) return;
    if (!attempt?.id) return;
    let newVal;
    const currentVal = userAnswers[questionId];
    if (isMultiSelect(type)) {
      const curr = Array.isArray(currentVal) ? currentVal : [];
      newVal = curr.includes(optionId) ? curr.filter((id) => id !== optionId) : [...curr, optionId];
    } else {
      newVal = optionId;
    }
    setUserAnswers((prev) => ({ ...prev, [questionId]: newVal }));
    try {
      const payload = { attempt_id: attempt.id, question_id: questionId };
      if (isMultiSelect(type)) payload.selected_option_ids = newVal;
      else payload.selected_option_id = newVal;
      await projectService.answerBatteryQuestion(battery.id, payload);
    } catch (err) { console.error("Error saving answer:", err); }
  };

  const isOptionSelected = (qId, optId, type) => {
    const ans = userAnswers[qId];
    if (ans == null) return false;
    if (isMultiSelect(type)) return Array.isArray(ans) && ans.includes(optId);
    return ans === optId;
  };

  const calculateScore = () => {
    let totalScore = 0, maxScore = 0, correctCount = 0;
    (questions || []).forEach((q) => {
      const qPts = Number(q?.points ?? 0);
      maxScore += qPts;
      const userAnswer = userAnswers[q.id];
      if (userAnswer == null) return;
      if (isMultiSelect(q.type)) {
        const correctIds = (q.options || []).filter((o) => o.correct).map((o) => o.id).slice().sort();
        const userIds    = (Array.isArray(userAnswer) ? userAnswer : []).slice().sort();
        if (correctIds.length === userIds.length && correctIds.every((id, i) => id === userIds[i])) {
          totalScore += qPts; correctCount += 1;
        }
      } else {
        const sel = (q.options || []).find((o) => o.id === userAnswer);
        if (sel?.correct) { totalScore += qPts; correctCount += 1; }
      }
    });
    return {
      totalScore:   Number.isFinite(totalScore)   ? totalScore   : 0,
      maxScore:     Number.isFinite(maxScore)      ? maxScore     : 0,
      correctCount: Number.isFinite(correctCount)  ? correctCount : 0,
    };
  };

  const finishAttempt = async () => {
    if (!battery?.id || !attempt?.id) return;
    const { totalScore, maxScore, correctCount } = calculateScore();
    await projectService.finishBatteryAttempt(battery.id, {
      attempt_id: attempt.id, total_score: totalScore,
      max_score: maxScore, correct_count: correctCount, total_questions: totalQuestions,
    });
  };

  useEffect(() => {
    const run = async () => {
      if (!open || !isFinished || !attempt?.id) return;
      if (didFinishRef.current) return;
      didFinishRef.current = true;
      setSavingAttempt(true);
      try {
        await finishAttempt();
        onFinish?.();
      }
      catch (e) { console.error("finish_attempt failed", e); }
      finally { setSavingAttempt(false); }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isFinished, attempt?.id]);

  const resetExam = () => {
    setActiveStep(0); setUserAnswers({}); setAnswerShown(false); setRevealed({}); setIsFinished(false); setReviewing(false); setReviewFilter("missed");
    setAttempt(null); didFinishRef.current = false; setRound((r) => r + 1);
  };

  // Phones: bring the explanation into view right after "Answer" (not when revisiting a locked question).
  useEffect(() => {
    if (!showAnswer || !scrollToExplanationRef.current) return;
    scrollToExplanationRef.current = false;
    if (phone) explanationRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [phone, showAnswer, activeStep]);

  // ─── Dialog base classes ───────────────────────────────────────────────────
  const dialogCls = [
    "overflow-hidden",
    "!mx-0 !my-0 !rounded-none !max-w-full !w-full !h-[100dvh]",
    "md:!mx-auto md:!my-8 md:!rounded-2xl md:!max-w-3xl md:!h-auto md:!w-auto",
    `!bg-[${T.bg}]`,
  ].join(" ");

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loadingBattery) {
    return (
      <Dialog open={open} handler={close} size="lg" className={`!bg-[var(--lt-0f172a,#0F172A)] !rounded-2xl`}>
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Spinner />
          <p style={{ fontSize: 14, color: T.textMuted, fontWeight: 500 }}>
            {language === "es" ? "Cargando examen..." : "Loading exam..."}
          </p>
        </div>
      </Dialog>
    );
  }

  // ─── Empty ────────────────────────────────────────────────────────────────
  if (!currentQuestion && !isFinished) {
    return (
      <Dialog open={open} handler={close} size="lg" className="!bg-[var(--lt-0f172a,#0F172A)] !rounded-2xl">
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-5">
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LightBulbIcon className="h-7 w-7" style={{ color: T.accent }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, textAlign: "center" }}>
            {loadError
              ? (language === "es" ? "No se pudieron cargar las preguntas." : "Couldn't load the questions.")
              : (language === "es" ? "Esta batería aún no tiene preguntas." : "This battery has no questions yet.")}
          </p>
          <div className="flex gap-2">
            {loadError && (
              <button onClick={() => setLoadRound((r) => r + 1)} style={{ padding: "10px 22px", borderRadius: 10, background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {language === "es" ? "Reintentar" : "Try again"}
              </button>
            )}
            <button onClick={close} style={{ padding: "10px 28px", borderRadius: 10, background: T.accent, color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
              {language === "es" ? "Cerrar" : "Close"}
            </button>
          </div>
        </div>
      </Dialog>
    );
  }

  // ─── Results screen ───────────────────────────────────────────────────────
  if (isFinished) {
    const { totalScore, maxScore, correctCount } = calculateScore();
    const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed  = percent >= PASS_PERCENT;
    const canReview = mobileOptimized;
    const missedIds = new Set(questions.filter((q) => !isAnsweredCorrectly(q, userAnswers[q.id])).map((q) => q.id));
    const reviewList = questions.filter((q) => reviewFilter === "all" || missedIds.has(q.id));
    const footerBtn = { ...(phone ? { minHeight: 44 } : {}), flex: 1, padding: "11px", borderRadius: 10, background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.15s" };

    const scoreAccent = passed ? T.green : T.red;
    const scoreBg     = passed ? T.greenBg : T.redBg;
    const scoreBorder = passed ? T.greenBorder : T.redBorder;

    return (
      <Dialog open={open} handler={close} size="lg"
        className="!bg-[var(--lt-0f172a,#0F172A)] !mx-0 !my-0 !rounded-none !max-w-full !w-full !h-[100dvh] md:!mx-auto md:!my-8 md:!rounded-2xl md:!max-w-lg md:!h-auto">
        <div className={`flex flex-col h-[100dvh] md:h-auto${phone ? " ank-exam-m" : ""}`} style={{ background: T.bg }}>

          {/* Header */}
          <div style={{ borderBottom: `1px solid ${T.border}`, padding: phone ? "6px 8px 6px 18px" : "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>
              {reviewing
                ? (language === "es" ? "Revisar respuestas" : "Review answers")
                : (language === "es" ? "Resultados del Examen" : "Exam Results")}
            </p>
            <button onClick={close} aria-label={language === "es" ? "Cerrar" : "Close"}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4, borderRadius: 6, ...(phone ? { minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" } : {}) }}
              className="hover:bg-white/5 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          {reviewing ? (
            <div className="flex-1 overflow-y-auto" data-testid="exam-review" style={{ padding: phone ? "16px 16px 24px" : "20px", display: "flex", flexDirection: "column", gap: 14, maxHeight: phone ? undefined : "70vh" }}>
              {/* Filter */}
              <div role="group" aria-label={language === "es" ? "Filtrar preguntas" : "Filter questions"} style={{ display: "flex", gap: 8 }}>
                {[
                  ["missed", language === "es" ? `Solo falladas (${missedIds.size})` : `Missed only (${missedIds.size})`],
                  ["all", language === "es" ? `Todas (${totalQuestions})` : `All (${totalQuestions})`],
                ].map(([key, label]) => {
                  const on = reviewFilter === key;
                  return (
                    <button key={key} onClick={() => setReviewFilter(key)} aria-pressed={on}
                      style={{ ...(phone ? { minHeight: 44 } : {}), flex: 1, padding: "9px 10px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                        background: on ? T.accentBg : T.bgElevated, border: `1px solid ${on ? T.accentBorder : T.border}`, color: on ? T.accent : T.textMuted }}>
                      {label}
                    </button>
                  );
                })}
              </div>

              {reviewList.length === 0 && (
                <p style={{ fontSize: 13, color: T.textMuted, textAlign: "center", padding: "24px 0" }}>
                  {language === "es" ? "No fallaste ninguna pregunta." : "You didn't miss any question."}
                </p>
              )}

              {reviewList.map((q) => {
                const ans = userAnswers[q.id];
                const qMulti = isMultiSelect(q.type);
                return (
                  <section key={q.id} data-testid="review-question" aria-label={`${language === "es" ? "Pregunta" : "Question"} ${questions.indexOf(q) + 1} / ${totalQuestions}`}
                    style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: 14, padding: "14px 16px" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.accent, marginBottom: 8 }}>
                        {language === "es" ? "Pregunta" : "Question"} {questions.indexOf(q) + 1} / {totalQuestions}
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, lineHeight: 1.55 }}>{q.question}</p>
                      <VerdictBadge correct={!missedIds.has(q.id)} answered={hasAnswer(ans)} language={language} />
                    </div>
                    {/* Read-only: the same rows as after "Answer", announced as disabled controls. */}
                    <div role={qMulti ? "group" : "radiogroup"} aria-label={q.question} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {(q.options || []).map((option) => {
                        const isSelected = qMulti ? Array.isArray(ans) && ans.includes(option.id) : ans === option.id;
                        const { borderCol, bgCol } = optionColors({ isSelected, isCorrect: !!option.correct, showAnswer: true });
                        return (
                          <div key={option.id} role={qMulti ? "checkbox" : "radio"} aria-checked={isSelected} aria-disabled="true" data-testid="review-option"
                            style={{ border: `1px solid ${borderCol}`, background: bgCol, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 11, cursor: "default" }}>
                            <OptionContent option={option} multi={qMulti} isSelected={isSelected} showAnswer />
                          </div>
                        );
                      })}
                    </div>
                    <ExplanationBlock question={q} language={language}
                      docId={q.source_document_id || q.document_id || battery.document_id}
                      onOpenDoc={handleOpenViewer} tapStyle={phone ? { minWidth: 44, minHeight: 44, justifyContent: "center" } : {}} />
                  </section>
                );
              })}
            </div>
          ) : (
          <div className="flex-1 overflow-y-auto" style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Score hero */}
            <div style={{ background: scoreBg, border: `1px solid ${scoreBorder}`, borderRadius: 16, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <TrophyIcon className="h-9 w-9 mb-1" style={{ color: scoreAccent }} />
              <p style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: scoreAccent }}>{percent}%</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: scoreAccent }}>
                {passed
                  ? (language === "es" ? "¡Aprobado!" : "Passed!")
                  : (language === "es" ? "No aprobado" : "Not passed")}
              </p>
              <p style={{ fontSize: 12, color: scoreAccent, opacity: 0.7, marginTop: 2 }}>
                {Number(totalScore || 0).toFixed(2)} / {Number(maxScore || 0).toFixed(2)} pts
              </p>
              {phone && (
                <p data-testid="exam-pass-mark" style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, marginTop: 2 }}>
                  {language === "es" ? "Mínimo para aprobar" : "Pass mark"}: {PASS_PERCENT}%
                </p>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, borderRadius: 999, background: T.border, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${percent}%`, background: scoreAccent, borderRadius: 999, transition: "width 0.5s ease" }} />
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: phone ? (language === "es" ? "Tema" : "Topic") : (language === "es" ? "Batería" : "Battery"), value: battery?.name || "—" },
                { label: language === "es" ? "Preguntas" : "Questions",   value: totalQuestions },
                { label: language === "es" ? "Correctas" : "Correct",     value: correctCount },
                { label: language === "es" ? "Puntuación" : "Score",      value: `${Number(totalScore || 0).toFixed(1)} / ${Number(maxScore || 0).toFixed(1)}` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: T.textDim, marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, wordBreak: "break-word" }}>{value}</p>
                </div>
              ))}
            </div>

            {savingAttempt && (
              <p style={{ fontSize: 11, color: T.textDim, textAlign: "center" }}>
                {language === "es" ? "Guardando intento..." : "Saving attempt..."}
              </p>
            )}
          </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${T.border}`, padding: "14px 18px", paddingBottom: phone ? "calc(14px + env(safe-area-inset-bottom, 0px))" : "max(14px, env(safe-area-inset-bottom, 14px))", display: "flex", flexWrap: canReview ? "wrap" : undefined, gap: 10, flexShrink: 0 }}>
            {canReview && reviewing && (
              <button onClick={() => setReviewing(false)} style={footerBtn}>
                <ChevronLeftIcon className="h-4 w-4" />
                {language === "es" ? "Volver a resultados" : "Back to results"}
              </button>
            )}
            {canReview && !reviewing && (
              <button onClick={() => { setReviewFilter("missed"); setReviewing(true); }}
                style={{ ...footerBtn, ...(phone ? { flexBasis: "100%" } : {}) }}>
                <CheckCircleIcon className="h-4 w-4" />
                {language === "es" ? "Revisar respuestas" : "Review answers"}
              </button>
            )}
            {!reviewing && <button onClick={resetExam} disabled={savingAttempt}
              style={{ ...(phone ? { minHeight: 44 } : {}), flex: 1, padding: "11px", borderRadius: 10, background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent, fontWeight: 700, fontSize: 13, cursor: savingAttempt ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: savingAttempt ? 0.5 : 1, transition: "opacity 0.15s" }}>
              <ArrowPathIcon className="h-4 w-4" />
              {language === "es" ? "Reintentar" : "Retry"}
            </button>}
            <button onClick={close} disabled={savingAttempt}
              style={{ ...(phone ? { minHeight: 44 } : {}), flex: 1, padding: "11px", borderRadius: 10, background: `linear-gradient(135deg, ${T.accent} 0%, #818CF8 100%)`, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: savingAttempt ? "default" : "pointer", opacity: savingAttempt ? 0.5 : 1, transition: "opacity 0.15s" }}>
              {language === "es" ? "Cerrar" : "Close"}
            </button>
          </div>
          {phone && <style>{PHONE_CSS}</style>}
        </div>
        {canReview && (
          <DocumentViewerDialog open={!!viewingDocument} onClose={() => setViewingDocument(null)} document={viewingDocument} page={viewingPage} />
        )}
      </Dialog>
    );
  }

  // ─── Question screen ──────────────────────────────────────────────────────
  const progressPct = totalQuestions > 0 ? ((activeStep + 1) / totalQuestions) * 100 : 0;
  const qType = currentQuestion.type === "trueFalse"
    ? (language === "es" ? "Verdadero / Falso" : "True / False")
    : isMultiSelect(currentQuestion.type)
      ? (language === "es" ? "Selección Múltiple" : "Multiple Selection")
      : (language === "es" ? "Opción Única" : "Single Choice");
  const multi = isMultiSelect(currentQuestion.type);
  const answered = hasAnswer(userAnswers[currentQuestion.id]);
  const gotItRight = isAnsweredCorrectly(currentQuestion, userAnswers[currentQuestion.id]);
  // Phones: answer before moving on (only once the attempt exists, so the exam never gets stuck).
  const nextBlocked = phone && !answered && !showAnswer && !!attempt?.id;
  const phoneTap = phone ? { minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" } : {};

  return (
    <Dialog open={open} handler={close} size="xl" className={dialogCls}>
      <div className={`flex flex-col h-full${phone ? " ank-exam-m" : ""}`} style={{ background: T.bg }}>

        {/* ── Header ── */}
        <div style={{ borderBottom: `1px solid ${T.border}`, padding: phone ? "4px 4px 4px 4px" : "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div className={`flex items-center ${phone ? "gap-1" : "gap-3"}`}>
            {/* Mobile back */}
            <button onClick={close} className="md:hidden flex items-center gap-1" aria-label={language === "es" ? "Volver" : "Back"}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 0, ...phoneTap }}>
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <div>
              <p style={{ fontSize: 12, color: T.textDim, fontWeight: 600, letterSpacing: "0.04em" }}>
                {battery?.name || battery?.title}
              </p>
              <p style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, lineHeight: 1.2 }}>
                {language === "es" ? "Pregunta" : "Question"}{" "}
                <span style={{ color: T.accent }}>{activeStep + 1}</span>
                <span style={{ color: T.textDim, fontWeight: 500, fontSize: 13 }}> / {totalQuestions}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DarkBadge color={T.amber} bg={T.amberBg}>
              {currentQuestion.points} pts
            </DarkBadge>
            <button onClick={close} aria-label={language === "es" ? "Cerrar" : "Close"}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4, borderRadius: 6, ...phoneTap }}
              className="hover:bg-white/5 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Progress strip ── */}
        <div style={{ height: 3, background: T.border, flexShrink: 0 }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: T.accent, borderRadius: 2, transition: "width 0.3s ease" }} />
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto" style={{ padding: phone ? "16px 16px 28px" : "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Question card */}
          <div style={{ background: T.accentBg, border: `1px solid ${T.accentBorder}`, borderRadius: 14, padding: "16px 18px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.accent, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              {qType}
              {currentQuestion.topicName && (
                <span style={{ color: T.textDim, fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>· {currentQuestion.topicName}</span>
              )}
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, lineHeight: 1.55 }}>
              {currentQuestion.question}
            </p>
            {phone && showAnswer && <VerdictBadge correct={gotItRight} answered={answered} language={language} />}
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}
            {...(phone ? { role: multi ? "group" : "radiogroup", "aria-label": currentQuestion.question } : {})}>
            {(currentQuestion.options || []).map((option) => {
              const isSelected = isOptionSelected(currentQuestion.id, option.id, currentQuestion.type);
              const { borderCol, bgCol } = optionColors({ isSelected, isCorrect: !!option.correct, showAnswer });

              // Phones: a real radio/checkbox in a label; the row looks exactly the same.
              const Row = phone ? "label" : "div";
              return (
                <Row key={option.id} {...(phone ? { className: "ank-opt hover:brightness-110" } : {})}
                  {...(lockAnswers && showAnswer ? { "aria-disabled": "true", "data-locked": "true" } : {})}
                  onClick={phone ? undefined : () => handleOptionSelect(currentQuestion.id, option.id, currentQuestion.type)}
                  style={{ border: `1px solid ${borderCol}`, background: bgCol, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 11, cursor: "pointer", transition: "all 0.15s" }}
                  {...(phone ? {} : { className: "hover:brightness-110" })}>
                  {phone && (
                    <input type={multi ? "checkbox" : "radio"} name={`q-${currentQuestion.id}`} className="sr-only"
                      checked={isSelected} disabled={showAnswer} aria-disabled={showAnswer || undefined}
                      onChange={() => handleOptionSelect(currentQuestion.id, option.id, currentQuestion.type)} />
                  )}
                  <OptionContent option={option} multi={multi} isSelected={isSelected} showAnswer={showAnswer} />
                </Row>
              );
            })}
          </div>

          {/* Explanation */}
          {showAnswer && (
            <ExplanationBlock question={currentQuestion} language={language} blockRef={explanationRef}
              docId={currentQuestion.source_document_id || currentQuestion.document_id || battery.document_id}
              onOpenDoc={handleOpenViewer} tapStyle={phoneTap} />
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: phone ? "10px 16px" : "13px 18px", paddingBottom: phone ? "calc(10px + env(safe-area-inset-bottom, 0px))" : "max(13px, env(safe-area-inset-bottom, 13px))", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Prev */}
          <button onClick={handlePrev} disabled={activeStep === 0} aria-label={language === "es" ? "Pregunta anterior" : "Previous question"}
            style={{ ...(phone ? { minWidth: 44, minHeight: 44, justifyContent: "center", padding: "10px 12px" } : { padding: "10px 16px" }), borderRadius: 10, background: activeStep === 0 ? "transparent" : T.bgElevated, border: `1px solid ${activeStep === 0 ? T.border : T.borderStrong}`, color: activeStep === 0 ? T.textDim : T.textMuted, fontWeight: 700, fontSize: 13, cursor: activeStep === 0 ? "default" : "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s", flexShrink: 0 }}>
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="hidden md:inline">{language === "es" ? "Anterior" : "Prev"}</span>
          </button>

          {/* Show answer */}
          {!showAnswer && (
            <button onClick={revealAnswer}
              style={{ ...(phone ? { minHeight: 44, minWidth: 0 } : {}), flex: 1, padding: "10px", borderRadius: 10, background: T.amberBg, border: `1px solid ${T.amberBorder}`, color: T.amber, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.15s" }}
              className="hover:brightness-110 ank-expl-strong">
              <LightBulbIcon className="h-4 w-4" />
              <span className="hidden md:inline">{language === "es" ? "Mostrar Respuesta" : "Show Answer"}</span>
              <span className="md:hidden">{language === "es" ? "Respuesta" : "Answer"}</span>
            </button>
          )}

          {/* Next / Finish */}
          <button onClick={handleNext} disabled={savingAttempt || nextBlocked}
            title={nextBlocked ? (language === "es" ? "Responde para continuar" : "Answer to continue") : undefined}
            style={{ flex: showAnswer ? 1 : "none", minWidth: phone ? 100 : 110, padding: phone ? "10px 14px" : "10px 20px", ...(phone ? { minHeight: 44 } : {}), borderRadius: 10, background: `linear-gradient(135deg, ${T.accent} 0%, #818CF8 100%)`, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: savingAttempt || nextBlocked ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: savingAttempt || nextBlocked ? 0.6 : 1, transition: "opacity 0.15s" }}
            className="hover:brightness-110">
            {activeStep === totalQuestions - 1
              ? (language === "es" ? "Finalizar" : "Finish")
              : (language === "es" ? "Siguiente" : "Next")}
            {activeStep !== totalQuestions - 1 && <ChevronRightIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <DocumentViewerDialog
        open={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        document={viewingDocument}
        page={viewingPage}
      />
      {phone && <style>{PHONE_CSS}</style>}
    </Dialog>
  );
}

export default ExamSimulatorDialog;
