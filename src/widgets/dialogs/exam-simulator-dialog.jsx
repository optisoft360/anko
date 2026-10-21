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

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ExamSimulatorDialog({ open, handler, battery: initialBattery, onFinish }) {
  const { language } = useLanguage();
  if (!initialBattery) return null;

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
  const [showAnswer, setShowAnswer]   = useState(false);
  const [isFinished, setIsFinished]   = useState(false);

  const questions      = useMemo(() => battery?.questions || [], [battery]);
  const totalQuestions = questions.length;
  const currentQuestion = questions[activeStep];

  const startKey = useMemo(() => {
    if (!open || !battery?.id) return null;
    return `${battery?.id}-opened`;
  }, [open, battery?.id]);

  // ── Cargar batería + preguntas ──
  useEffect(() => {
    if (open && initialBattery) {
      setLoadingBattery(true);
      Promise.all([
        projectService.getBattery(initialBattery.id),
        projectService.getBatteryQuestions(initialBattery.id),
      ])
        .then(([fullData, qs]) => {
          const questionList = Array.isArray(qs) ? qs : qs?.results || [];
          setBattery({ ...fullData, questions: questionList });
        })
        .catch(() => setBattery(initialBattery))
        .finally(() => setLoadingBattery(false));
    }
  }, [open, initialBattery, language]);

  // ── Reset al cerrar ──
  useEffect(() => {
    if (open) return;
    setActiveStep(0);
    setUserAnswers({});
    setShowAnswer(false);
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
      setShowAnswer(false);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    if (activeStep > 0) {
      setActiveStep((c) => c - 1);
      setShowAnswer(false);
    }
  };

  const [viewingDocument, setViewingDocument] = useState(null);
  const [viewingPage, setViewingPage]         = useState(null);

  const handleOpenViewer = (docId, page) => {
    const finalDocId = docId || battery.document_id || (battery.documents && battery.documents[0]?.id);
    if (finalDocId) { setViewingDocument({ id: finalDocId }); setViewingPage(page); }
  };

  const handleOptionSelect = async (questionId, optionId, type) => {
    if (showAnswer) return;
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
    setActiveStep(0); setUserAnswers({}); setShowAnswer(false); setIsFinished(false);
  };

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
      <Dialog open={open} handler={handler} size="lg" className={`!bg-[var(--lt-0f172a,#0F172A)] !rounded-2xl`}>
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
      <Dialog open={open} handler={handler} size="lg" className="!bg-[var(--lt-0f172a,#0F172A)] !rounded-2xl">
        <div className="flex flex-col items-center justify-center py-20 px-6 gap-5">
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LightBulbIcon className="h-7 w-7" style={{ color: T.accent }} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, textAlign: "center" }}>
            {language === "es" ? "Esta batería aún no tiene preguntas." : "This battery has no questions yet."}
          </p>
          <button onClick={handler} style={{ padding: "10px 28px", borderRadius: 10, background: T.accent, color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}>
            {language === "es" ? "Cerrar" : "Close"}
          </button>
        </div>
      </Dialog>
    );
  }

  // ─── Results screen ───────────────────────────────────────────────────────
  if (isFinished) {
    const { totalScore, maxScore, correctCount } = calculateScore();
    const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed  = percent >= 60;

    const scoreAccent = passed ? T.green : T.red;
    const scoreBg     = passed ? T.greenBg : T.redBg;
    const scoreBorder = passed ? T.greenBorder : T.redBorder;

    return (
      <Dialog open={open} handler={handler} size="lg"
        className="!bg-[var(--lt-0f172a,#0F172A)] !mx-0 !my-0 !rounded-none !max-w-full !w-full !h-[100dvh] md:!mx-auto md:!my-8 md:!rounded-2xl md:!max-w-lg md:!h-auto">
        <div className="flex flex-col h-[100dvh] md:h-auto" style={{ background: T.bg }}>

          {/* Header */}
          <div style={{ borderBottom: `1px solid ${T.border}`, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.textPrimary }}>
              {language === "es" ? "Resultados del Examen" : "Exam Results"}
            </p>
            <button onClick={handler} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4, borderRadius: 6 }}
              className="hover:bg-white/5 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
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
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, borderRadius: 999, background: T.border, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${percent}%`, background: scoreAccent, borderRadius: 999, transition: "width 0.5s ease" }} />
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: language === "es" ? "Batería" : "Battery",      value: battery?.name || "—" },
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

          {/* Footer */}
          <div style={{ borderTop: `1px solid ${T.border}`, padding: "14px 18px", paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))", display: "flex", gap: 10, flexShrink: 0 }}>
            <button onClick={resetExam} disabled={savingAttempt}
              style={{ flex: 1, padding: "11px", borderRadius: 10, background: T.accentBg, border: `1px solid ${T.accentBorder}`, color: T.accent, fontWeight: 700, fontSize: 13, cursor: savingAttempt ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: savingAttempt ? 0.5 : 1, transition: "opacity 0.15s" }}>
              <ArrowPathIcon className="h-4 w-4" />
              {language === "es" ? "Reintentar" : "Retry"}
            </button>
            <button onClick={handler} disabled={savingAttempt}
              style={{ flex: 1, padding: "11px", borderRadius: 10, background: `linear-gradient(135deg, ${T.accent} 0%, #818CF8 100%)`, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: savingAttempt ? "default" : "pointer", opacity: savingAttempt ? 0.5 : 1, transition: "opacity 0.15s" }}>
              {language === "es" ? "Cerrar" : "Close"}
            </button>
          </div>
        </div>
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

  return (
    <Dialog open={open} handler={handler} size="xl" className={dialogCls}>
      <div className="flex flex-col h-full" style={{ background: T.bg }}>

        {/* ── Header ── */}
        <div style={{ borderBottom: `1px solid ${T.border}`, padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            {/* Mobile back */}
            <button onClick={handler} className="md:hidden flex items-center gap-1"
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 0 }}>
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
            <button onClick={handler}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4, borderRadius: 6 }}
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
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

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
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(currentQuestion.options || []).map((option) => {
              const isSelected = isOptionSelected(currentQuestion.id, option.id, currentQuestion.type);
              const isCorrect  = !!option.correct;

              let borderCol = T.border;
              let bgCol     = T.bgElevated;
              let textCol   = T.textPrimary;

              if (showAnswer) {
                if (isCorrect)              { borderCol = T.greenBorder; bgCol = T.greenBg; }
                else if (isSelected)        { borderCol = T.redBorder;   bgCol = T.redBg;   }
              } else if (isSelected) {
                borderCol = T.accentBorder; bgCol = T.accentBg;
              }

              return (
                <div key={option.id}
                  onClick={() => handleOptionSelect(currentQuestion.id, option.id, currentQuestion.type)}
                  style={{ border: `1px solid ${borderCol}`, background: bgCol, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 11, cursor: "pointer", transition: "all 0.15s" }}
                  className="hover:brightness-110">
                  {/* Radio/checkbox */}
                  <div style={{
                    width: 17, height: 17,
                    borderRadius: isMultiSelect(currentQuestion.type) ? 5 : "50%",
                    border: `2px solid ${isSelected ? T.accent : T.borderStrong}`,
                    background: isSelected ? T.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    transition: "all 0.15s",
                  }}>
                    {isSelected && <div style={{ width: 6, height: 6, borderRadius: isMultiSelect(currentQuestion.type) ? 2 : "50%", background: "#fff" }} />}
                  </div>
                  <span style={{ fontSize: 13, color: textCol, fontWeight: 500, flex: 1, lineHeight: 1.4 }}>{option.text}</span>
                  {showAnswer && isCorrect   && <CheckCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: T.green }} />}
                  {showAnswer && isSelected && !isCorrect && <XCircleIcon className="h-5 w-5 flex-shrink-0" style={{ color: T.red }} />}
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          {showAnswer && (
            <div style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <LightBulbIcon className="h-4 w-4 flex-shrink-0" style={{ color: T.amber }} />
                <p style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: T.amber }}>
                  {language === "es" ? "Explicación" : "Explanation"}
                </p>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "#FCD34D" }}>
                {currentQuestion.explanation || (language === "es" ? "No se proporcionó explicación." : "No explanation provided.")}
              </p>
              {currentQuestion.page_reference && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.amber, fontStyle: "italic" }}>
                    {language === "es" ? "Pág:" : "Page:"} {currentQuestion.page_reference}
                  </span>
                  {(currentQuestion.source_document_id || currentQuestion.document_id || battery.document_id) && (
                    <button onClick={() => handleOpenViewer(currentQuestion.source_document_id || currentQuestion.document_id || currentQuestion.document, currentQuestion.page_reference)}
                      style={{ background: T.amberBg, border: `1px solid ${T.amberBorder}`, borderRadius: 6, padding: "3px 7px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <DocumentIcon className="h-3.5 w-3.5" style={{ color: T.amber }} />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "13px 18px", paddingBottom: "max(13px, env(safe-area-inset-bottom, 13px))", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Prev */}
          <button onClick={handlePrev} disabled={activeStep === 0}
            style={{ padding: "10px 16px", borderRadius: 10, background: activeStep === 0 ? "transparent" : T.bgElevated, border: `1px solid ${activeStep === 0 ? T.border : T.borderStrong}`, color: activeStep === 0 ? T.textDim : T.textMuted, fontWeight: 700, fontSize: 13, cursor: activeStep === 0 ? "default" : "pointer", display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s", flexShrink: 0 }}>
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="hidden md:inline">{language === "es" ? "Anterior" : "Prev"}</span>
          </button>

          {/* Show answer */}
          {!showAnswer && (
            <button onClick={() => setShowAnswer(true)}
              style={{ flex: 1, padding: "10px", borderRadius: 10, background: T.amberBg, border: `1px solid ${T.amberBorder}`, color: T.amber, fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "opacity 0.15s" }}
              className="hover:brightness-110">
              <LightBulbIcon className="h-4 w-4" />
              <span className="hidden md:inline">{language === "es" ? "Mostrar Respuesta" : "Show Answer"}</span>
              <span className="md:hidden">{language === "es" ? "Respuesta" : "Answer"}</span>
            </button>
          )}

          {/* Next / Finish */}
          <button onClick={handleNext} disabled={savingAttempt}
            style={{ flex: showAnswer ? 1 : "none", minWidth: 110, padding: "10px 20px", borderRadius: 10, background: `linear-gradient(135deg, ${T.accent} 0%, #818CF8 100%)`, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: savingAttempt ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: savingAttempt ? 0.6 : 1, transition: "opacity 0.15s" }}
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
    </Dialog>
  );
}

export default ExamSimulatorDialog;
