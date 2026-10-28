import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { Dialog } from "@material-tailwind/react";
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    LightBulbIcon,
    CheckCircleIcon,
} from "@heroicons/react/24/solid";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useModalGuard } from "@/hooks/useModalGuard";

// Study progress per deck. There is no endpoint for it, so it lives in this browser only.
const studyKey = (deckId) => `ank_study_progress_${deckId}`;
export function readStudyProgress(deckId) {
    try { return JSON.parse(localStorage.getItem(studyKey(deckId))) || null; } catch { return null; }
}
function writeStudyProgress(deckId, value) {
    try { localStorage.setItem(studyKey(deckId), JSON.stringify(value)); } catch { /* storage unavailable */ }
}

/**
 * `mobileOptimized` (assignment page only): on phones the modal uses a card that grows with
 * its content, swipe, a Finish step, and the back-button/body-restore guard. Desktop and the
 * other callers keep the original layout.
 */
export function FlashcardViewDialog({ open, onClose, deckId, deckTitle, mobileOptimized = false, onProgress, onGoToSimulate }) {
    const { t, language } = useLanguage();
    const isMobile = useIsMobile();
    const phone = mobileOptimized && isMobile;
    const guardedClose = useModalGuard(open && phone, onClose);
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(false);
    const [finished, setFinished] = useState(false);
    const [maxSeen, setMaxSeen] = useState(0);

    useEffect(() => { if (open) { setFinished(false); setMaxSeen(0); } }, [open, deckId]);
    useEffect(() => { setMaxSeen((m) => Math.max(m, currentIndex)); }, [currentIndex]);

    // Phones only: remember how far the deck was reviewed (never lowers a finished deck).
    useEffect(() => {
        if (!phone || !open || !deckId || flashcards.length === 0) return;
        const prev = readStudyProgress(deckId);
        const total = flashcards.length;
        const reviewed = finished ? total : Math.max(maxSeen + 1, prev?.total === total ? prev.reviewed : 0);
        const next = { reviewed: Math.min(reviewed, total), total, completed: finished || !!(prev?.completed && prev.total === total) };
        if (prev && prev.reviewed === next.reviewed && prev.total === next.total && prev.completed === next.completed) return;
        writeStudyProgress(deckId, next);
        onProgress?.(deckId, next);
    }, [phone, open, deckId, flashcards.length, maxSeen, finished, onProgress]);

    useEffect(() => {
        if (open && deckId) fetchFlashcards();
    }, [open, deckId, language]);

    const fetchFlashcards = async () => {
        try {
            setLoading(true);
            const data = await projectService.getDeckFlashcards(deckId);
            const cards = Array.isArray(data) ? data : data?.results || [];
            setFlashcards(cards);
            setCurrentIndex(0);
            setIsFlipped(false);
        } catch (err) {
            console.error("Error fetching flashcards:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(p => p + 1);
            setIsFlipped(false);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(p => p - 1);
            setIsFlipped(false);
        }
    };

    const handleFlip = () => setIsFlipped(f => !f);

    const currentCard = flashcards[currentIndex];
    const progressPct = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;
    const atStart = currentIndex === 0 || loading;
    const atEnd = currentIndex === flashcards.length - 1 || loading;

    if (phone) {
        if (!open) return null; // unmount at once: nothing waits on the exit animation
        return (
            <Dialog open={open} handler={guardedClose} size="xl"
                className="bg-transparent shadow-none !mx-0 !my-0 !rounded-none !max-w-full !w-full">
                <MobileStudy
                    language={language} t={t} deckTitle={deckTitle} loading={loading}
                    flashcards={flashcards} currentIndex={currentIndex} isFlipped={isFlipped} finished={finished}
                    onFlip={handleFlip} onPrev={handlePrev} onNext={handleNext} onClose={guardedClose}
                    onFinish={() => setFinished(true)}
                    onRestart={() => { setFinished(false); setCurrentIndex(0); setIsFlipped(false); }}
                    onGoToSimulate={onGoToSimulate ? () => guardedClose().then(() => onGoToSimulate()) : null}
                />
            </Dialog>
        );
    }

    return (
        <Dialog
            open={open}
            handler={onClose}
            size="xl"
            className="bg-transparent shadow-none !mx-0 !my-0 !rounded-none !max-w-full !w-full !h-[100dvh] md:!mx-auto md:!my-8 md:!rounded-2xl md:!max-w-3xl md:!h-auto"
        >
            <div style={{ display: "flex", flexDirection: "column", background: "var(--lt-060d1a, #060D1A)", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))" }}
                className="h-[100dvh] md:h-[85vh] md:max-h-[700px] md:rounded-2xl overflow-hidden">

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
                    <div style={{ minWidth: 0 }}>
                        <p style={{ color: "var(--lt-f1f5f9, #F1F5F9)", fontWeight: 700, fontSize: 16, margin: 0 }} className="truncate">{deckTitle}</p>
                        <p style={{ color: "#64748B", fontSize: 12, margin: "2px 0 0" }}>
                            {flashcards.length > 0 ? `${currentIndex + 1} / ${flashcards.length}` : "—"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--lt-94a3b8, #94A3B8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 150ms" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))"; e.currentTarget.style.color = "var(--lt-f1f5f9, #F1F5F9)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))"; e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; }}
                    >
                        <XMarkIcon style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", flexShrink: 0 }}>
                    <div style={{ height: "100%", width: `${progressPct}%`, background: "linear-gradient(90deg, #6366F1, #818CF8)", transition: "width 400ms ease", borderRadius: "0 2px 2px 0" }} />
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", overflow: "hidden" }}>
                    {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.25)", borderTopColor: "#6366F1" }} className="animate-spin" />
                            <p style={{ color: "var(--lt-94a3b8, #94A3B8)", fontSize: 13, fontStyle: "italic", margin: 0 }}>
                                {language === "es" ? "Cargando fichas…" : "Loading cards…"}
                            </p>
                        </div>
                    ) : flashcards.length === 0 ? (
                        <div style={{ textAlign: "center" }}>
                            <p style={{ color: "var(--lt-f1f5f9, #F1F5F9)", fontWeight: 600, fontSize: 16, margin: 0 }}>
                                {language === "es" ? "No hay fichas en este mazo" : "No flashcards in this deck"}
                            </p>
                        </div>
                    ) : (
                        <div style={{ width: "100%", maxWidth: 680, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                            className="perspective-1000">

                            <div
                                style={{ position: "relative", width: "100%", cursor: "pointer" }}
                                className={`aspect-[3/2] md:aspect-[16/9] transition-transform duration-700 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}
                                onClick={handleFlip}
                            >
                                {/* Front */}
                                <div style={{
                                    position: "absolute", inset: 0,
                                    background: "var(--lt-0f172a, #0F172A)",
                                    border: "1px solid rgba(99,102,241,0.25)",
                                    borderRadius: 20,
                                    display: "flex", flexDirection: "column",
                                    alignItems: "center", justifyContent: "center",
                                    textAlign: "center", padding: "52px 32px 40px",
                                    boxShadow: "0 24px 64px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5)), 0 0 0 1px rgba(99,102,241,0.08) inset",
                                }} className="backface-hidden">
                                    <div style={{ position: "absolute", top: 16, left: 20, display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818CF8", display: "inline-block" }} className="animate-pulse" />
                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--lt-818cf8, #818CF8)", textTransform: "uppercase" }}>
                                            {t("global.actions.front") || "FRONT"}
                                        </span>
                                    </div>

                                    <p style={{ fontSize: "clamp(17px, 3vw, 26px)", fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", lineHeight: 1.45, wordBreak: "break-word", overflowY: "auto", maxHeight: "100%", margin: 0 }}>
                                        {currentCard?.front || currentCard?.question || ""}
                                    </p>

                                    <div style={{ position: "absolute", bottom: 16, display: "flex", alignItems: "center", gap: 6, color: "var(--lt-334155, #334155)" }}>
                                        <ArrowPathIcon style={{ width: 12, height: 12 }} />
                                        <span style={{ fontSize: 10, fontWeight: 500 }}>
                                            {language === "es" ? "Clic para girar" : "Click to flip"}
                                        </span>
                                    </div>
                                </div>

                                {/* Back */}
                                <div style={{
                                    position: "absolute", inset: 0,
                                    background: "var(--lt-card-back, linear-gradient(135deg, #0a1628 0%, #0d1a35 100%))",
                                    border: "1px solid rgba(74,222,128,0.22)",
                                    borderRadius: 20,
                                    display: "flex", flexDirection: "column",
                                    overflow: "hidden",
                                    boxShadow: "0 24px 64px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5)), 0 0 0 1px rgba(74,222,128,0.06) inset",
                                }} className="backface-hidden rotate-y-180">
                                    <div style={{ position: "absolute", top: 16, left: 20, zIndex: 1, display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.22)" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--lt-4ade80, #4ade80)", textTransform: "uppercase" }}>
                                            {t("global.actions.back") || "BACK"}
                                        </span>
                                    </div>

                                    {currentCard?.backImageUrl ? (
                                        <div style={{ display: "flex", flexDirection: "column", height: "100%", paddingTop: 52 }}>
                                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", overflow: "hidden", minHeight: 0 }}>
                                                <img src={currentCard.backImageUrl} alt="back" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", borderRadius: 12 }} />
                                            </div>
                                            {currentCard?.back && (
                                                <div style={{ flexShrink: 0, padding: "12px 32px 20px", textAlign: "center", borderTop: "1px solid rgba(74,222,128,0.1)" }}>
                                                    <p style={{ fontSize: 16, fontWeight: 600, color: "var(--lt-f1f5f9, #F1F5F9)", lineHeight: 1.4, wordBreak: "break-word", margin: 0 }}>{currentCard.back}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px 32px 24px", textAlign: "center" }}>
                                            <p style={{ fontSize: "clamp(15px, 2.5vw, 22px)", fontWeight: 600, color: "var(--lt-f1f5f9, #F1F5F9)", lineHeight: 1.5, wordBreak: "break-word", overflowY: "auto", maxHeight: "55%", margin: "0 0 16px" }}>
                                                {currentCard?.back || currentCard?.answer || ""}
                                            </p>
                                            {currentCard?.explanation && (
                                                <div style={{ padding: "12px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, width: "100%", overflowY: "auto", maxHeight: 100 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 6 }}>
                                                        <LightBulbIcon style={{ width: 12, height: 12, color: "var(--lt-f59e0b, #f59e0b)" }} />
                                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--lt-f59e0b, #f59e0b)", textTransform: "uppercase" }}>
                                                            {t("global.actions.explanation") || "Explanation"}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: 11, color: "var(--lt-cbd5e1, #CBD5E1)", lineHeight: 1.6, margin: 0 }}>{currentCard.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {!loading && flashcards.length > 0 && (
                    <div style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 12px))", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", background: "var(--lt-footer, var(--lt-footer, rgba(6,13,26,0.8)))", flexShrink: 0 }}>
                        <button
                            onClick={handlePrev}
                            disabled={atStart}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", color: atStart ? "var(--lt-1e293b, #1E293B)" : "var(--lt-94a3b8, #94A3B8)", fontSize: 13, fontWeight: 600, cursor: atStart ? "default" : "pointer", transition: "all 150ms" }}
                            onMouseEnter={e => { if (!atStart) { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))"; e.currentTarget.style.color = "var(--lt-f1f5f9, #F1F5F9)"; } }}
                            onMouseLeave={e => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))"; e.currentTarget.style.color = atStart ? "var(--lt-1e293b, #1E293B)" : "var(--lt-94a3b8, #94A3B8)"; }}
                        >
                            <ChevronLeftIcon style={{ width: 14, height: 14 }} />
                            {language === "es" ? "Anterior" : "Previous"}
                        </button>

                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                            {flashcards.slice(Math.max(0, currentIndex - 2), Math.min(flashcards.length, currentIndex + 3)).map((_, idx) => {
                                const ai = Math.max(0, currentIndex - 2) + idx;
                                return <div key={ai} style={{ height: 5, borderRadius: 3, transition: "all 300ms", width: ai === currentIndex ? 18 : 5, background: ai === currentIndex ? "#6366F1" : "rgba(255,255,255,0.12)" }} />;
                            })}
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={atEnd}
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, background: atEnd ? "rgba(255,255,255,0.03)" : "rgba(99,102,241,0.15)", border: `1px solid ${atEnd ? "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))" : "rgba(99,102,241,0.3)"}`, color: atEnd ? "var(--lt-1e293b, #1E293B)" : "var(--lt-818cf8, #818CF8)", fontSize: 13, fontWeight: 600, cursor: atEnd ? "default" : "pointer", transition: "all 150ms" }}
                            onMouseEnter={e => { if (!atEnd) { e.currentTarget.style.background = "rgba(99,102,241,0.25)"; e.currentTarget.style.color = "var(--lt-f1f5f9, #F1F5F9)"; } }}
                            onMouseLeave={e => { e.currentTarget.style.background = atEnd ? "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))" : "rgba(99,102,241,0.15)"; e.currentTarget.style.color = atEnd ? "var(--lt-1e293b, #1E293B)" : "var(--lt-818cf8, #818CF8)"; }}
                        >
                            {language === "es" ? "Siguiente" : "Next"}
                            <ChevronRightIcon style={{ width: 14, height: 14 }} />
                        </button>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            ` }} />
        </Dialog>
    );
}

FlashcardViewDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    deckId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    deckTitle: PropTypes.string,
    mobileOptimized: PropTypes.bool,
    onProgress: PropTypes.func,
    onGoToSimulate: PropTypes.func,
};

// ─── Phone layout (assignment page) ───────────────────────────────────────────
// Header / card / footer in a flex column. Both faces share one grid cell, so the card is as
// tall as its longer face and nothing scrolls inside it; only when a card is taller than the
// screen does the middle area scroll, with a fade showing there is more below.

const tapTarget = { minWidth: 44, minHeight: 44 };

function MobileStudy({ language, t, deckTitle, loading, flashcards, currentIndex, isFlipped, finished, onFlip, onPrev, onNext, onClose, onFinish, onRestart, onGoToSimulate }) {
    const es = language === "es";
    const total = flashcards.length;
    const card = flashcards[currentIndex];
    const isLast = currentIndex === total - 1;
    const bodyRef = useRef(null);
    const touch = useRef(null);
    const [moreBelow, setMoreBelow] = useState(false);

    const updateMore = () => {
        const el = bodyRef.current;
        setMoreBelow(!!el && el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    };
    useEffect(() => {
        const el = bodyRef.current;
        if (el) el.scrollTop = 0;
        updateMore();
        const id = setTimeout(updateMore, 750); // after the flip
        return () => clearTimeout(id);
    }, [currentIndex, isFlipped, finished, total]);

    const onTouchStart = (e) => { const p = e.touches[0]; touch.current = { x: p.clientX, y: p.clientY, swiped: false }; };
    const onTouchEnd = (e) => {
        const start = touch.current;
        if (!start) return;
        const p = e.changedTouches[0];
        const dx = p.clientX - start.x, dy = p.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            start.swiped = true;
            if (dx < 0 && !isLast) onNext();
            if (dx > 0 && currentIndex > 0) onPrev();
        }
    };
    const onCardClick = () => {
        if (touch.current?.swiped) { touch.current = null; return; }
        onFlip();
    };
    const onCardKey = (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFlip(); }
        else if (e.key === "ArrowRight" && !isLast) onNext();
        else if (e.key === "ArrowLeft" && currentIndex > 0) onPrev();
    };

    const front = card?.front || card?.question || "";
    const back = card?.back || card?.answer || "";
    const sideLabel = isFlipped
        ? `${es ? "Reverso" : "Back"}: ${back}`
        : `${es ? "Anverso" : "Front"}: ${front}`;
    const faceBase = {
        gridArea: "1 / 1", borderRadius: 20, display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", padding: "48px 20px 40px", minHeight: 220,
    };

    return (
        <div className="ank-study-m" style={{ display: "flex", flexDirection: "column", background: "var(--lt-060d1a, #060D1A)", overflow: "hidden" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px 6px 16px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
                <div style={{ minWidth: 0 }}>
                    <p style={{ color: "var(--lt-f1f5f9, #F1F5F9)", fontWeight: 700, fontSize: 16, margin: 0 }} className="truncate">{deckTitle}</p>
                    <p style={{ color: "#64748B", fontSize: 12, margin: "2px 0 0" }}>{total > 0 ? `${currentIndex + 1} / ${total}` : "—"}</p>
                </div>
                <button onClick={onClose} aria-label={es ? "Cerrar" : "Close"}
                    style={{ ...tapTarget, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 8, padding: 6, color: "var(--lt-94a3b8, #94A3B8)", display: "flex" }}>
                        <XMarkIcon style={{ width: 18, height: 18 }} />
                    </span>
                </button>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", flexShrink: 0 }}>
                <div style={{ height: "100%", width: `${total ? ((finished ? total : currentIndex + 1) / total) * 100 : 0}%`, background: "linear-gradient(90deg, #6366F1, #818CF8)", transition: "width 400ms ease" }} />
            </div>

            {/* Body */}
            <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <div ref={bodyRef} onScroll={updateMore} data-testid="study-body"
                    style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px 20px", display: "flex", flexDirection: "column" }}>
                    {loading ? (
                        <div style={{ margin: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.25)", borderTopColor: "#6366F1" }} className="animate-spin" />
                            <p style={{ color: "var(--lt-94a3b8, #94A3B8)", fontSize: 13, fontStyle: "italic", margin: 0 }}>{es ? "Cargando fichas…" : "Loading cards…"}</p>
                        </div>
                    ) : total === 0 ? (
                        <p style={{ margin: "auto", color: "var(--lt-f1f5f9, #F1F5F9)", fontWeight: 600, fontSize: 16 }}>
                            {es ? "No hay fichas en este mazo" : "No flashcards in this deck"}
                        </p>
                    ) : finished ? (
                        <div data-testid="study-finished" style={{ margin: "auto 0", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14, padding: "24px 8px" }}>
                            <CheckCircleIcon style={{ width: 48, height: 48, color: "var(--lt-4ade80, #4ade80)" }} />
                            <p style={{ fontSize: 18, fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", margin: 0 }}>
                                {es ? `Has repasado las ${total} tarjetas` : `You reviewed all ${total} cards`}
                            </p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320, marginTop: 6 }}>
                                <button onClick={onRestart}
                                    style={{ minHeight: 44, borderRadius: 10, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", color: "var(--lt-94a3b8, #94A3B8)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                    <ArrowPathIcon style={{ width: 15, height: 15 }} /> {es ? "Repasar de nuevo" : "Review again"}
                                </button>
                                {onGoToSimulate && (
                                    <button onClick={onGoToSimulate}
                                        style={{ minHeight: 44, borderRadius: 10, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "var(--lt-818cf8, #818CF8)", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                                        {es ? "Ir a Simulate" : "Go to Simulate"} <ChevronRightIcon style={{ width: 14, height: 14 }} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="perspective-1000" style={{ flex: 1, display: "flex", flexDirection: "column", width: "100%" }}>
                            <div role="button" tabIndex={0} aria-label={sideLabel} data-testid="study-card"
                                onClick={onCardClick} onKeyDown={onCardKey} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
                                className={`transition-transform duration-700 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}
                                style={{ flex: 1, display: "grid", width: "100%", cursor: "pointer", outlineOffset: 4 }}>
                                {/* Front */}
                                <div className="backface-hidden" aria-hidden={isFlipped} style={{
                                    ...faceBase, justifyContent: "center", position: "relative",
                                    background: "var(--lt-0f172a, #0F172A)", border: "1px solid rgba(99,102,241,0.25)",
                                    boxShadow: "0 24px 64px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5)), 0 0 0 1px rgba(99,102,241,0.08) inset",
                                }}>
                                    <div style={{ position: "absolute", top: 14, left: 16, display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818CF8", display: "inline-block" }} className="animate-pulse" />
                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--lt-818cf8, #818CF8)", textTransform: "uppercase" }}>{t("global.actions.front") || "FRONT"}</span>
                                    </div>
                                    <p style={{ fontSize: 19, fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", lineHeight: 1.45, wordBreak: "break-word", margin: 0 }}>{front}</p>
                                    <div style={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--lt-64748b, #64748B)" }}>
                                        <ArrowPathIcon style={{ width: 12, height: 12 }} />
                                        <span style={{ fontSize: 11, fontWeight: 500 }}>{es ? "Toca para girar" : "Tap to flip"}</span>
                                    </div>
                                </div>

                                {/* Back */}
                                <div className="backface-hidden rotate-y-180" aria-hidden={!isFlipped} style={{
                                    ...faceBase, justifyContent: "center", position: "relative", padding: card?.backImageUrl ? "48px 16px 20px" : faceBase.padding,
                                    background: "var(--lt-card-back, linear-gradient(135deg, #0a1628 0%, #0d1a35 100%))", border: "1px solid rgba(74,222,128,0.22)",
                                    boxShadow: "0 24px 64px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5)), 0 0 0 1px rgba(74,222,128,0.06) inset",
                                }}>
                                    <div style={{ position: "absolute", top: 14, left: 16, display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.22)" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--lt-4ade80, #4ade80)", textTransform: "uppercase" }}>{t("global.actions.back") || "BACK"}</span>
                                    </div>
                                    {card?.backImageUrl && (
                                        <img src={card.backImageUrl} alt="back" style={{ maxWidth: "100%", maxHeight: "40vh", objectFit: "contain", borderRadius: 12, marginBottom: 12 }} />
                                    )}
                                    <p style={{ fontSize: 16, fontWeight: 600, color: "var(--lt-f1f5f9, #F1F5F9)", lineHeight: 1.5, wordBreak: "break-word", margin: 0 }}>{back}</p>
                                    {card?.explanation && (
                                        <div style={{ marginTop: 14, padding: "12px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, width: "100%" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 6 }}>
                                                <LightBulbIcon style={{ width: 12, height: 12, color: "var(--lt-f59e0b, #f59e0b)" }} />
                                                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--lt-f59e0b, #f59e0b)", textTransform: "uppercase" }}>{t("global.actions.explanation") || "Explanation"}</span>
                                            </div>
                                            <p style={{ fontSize: 12.5, color: "var(--lt-cbd5e1, #CBD5E1)", lineHeight: 1.6, margin: 0 }}>{card.explanation}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {moreBelow && (
                    <div aria-hidden data-testid="study-more" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 36, pointerEvents: "none", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 4, background: "linear-gradient(transparent, var(--lt-060d1a, #060D1A))" }}>
                        <ChevronRightIcon style={{ width: 14, height: 14, transform: "rotate(90deg)", color: "var(--lt-94a3b8, #94A3B8)" }} />
                    </div>
                )}
            </div>

            {/* Footer */}
            {!loading && total > 0 && !finished && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "10px 16px", paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", background: "var(--lt-footer, rgba(6,13,26,0.8))", flexShrink: 0 }}>
                    <button onClick={onPrev} disabled={currentIndex === 0} aria-hidden={currentIndex === 0} tabIndex={currentIndex === 0 ? -1 : 0}
                        style={{ minHeight: 44, visibility: currentIndex === 0 ? "hidden" : "visible", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", color: "var(--lt-94a3b8, #94A3B8)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        <ChevronLeftIcon style={{ width: 14, height: 14 }} /> {es ? "Anterior" : "Previous"}
                    </button>
                    <span aria-live="polite" style={{ fontSize: 13, fontWeight: 600, color: "var(--lt-94a3b8, #94A3B8)" }}>{currentIndex + 1} / {total}</span>
                    <button onClick={isLast ? onFinish : onNext}
                        style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "var(--lt-818cf8, #818CF8)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {isLast ? (es ? "Terminar" : "Finish") : (es ? "Siguiente" : "Next")}
                        {isLast ? <CheckCircleIcon style={{ width: 14, height: 14 }} /> : <ChevronRightIcon style={{ width: 14, height: 14 }} />}
                    </button>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .ank-study-m { height: 100vh; height: 100dvh; }
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            ` }} />
        </div>
    );
}

export default FlashcardViewDialog;
