import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Dialog } from "@material-tailwind/react";
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    LightBulbIcon,
} from "@heroicons/react/24/solid";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";

export function FlashcardViewDialog({ open, onClose, deckId, deckTitle }) {
    const { t, language } = useLanguage();
    const [flashcards, setFlashcards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(false);

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
};

export default FlashcardViewDialog;
