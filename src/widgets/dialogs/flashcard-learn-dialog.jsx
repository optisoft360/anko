import React, { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { Dialog } from "@material-tailwind/react";
import {
    XMarkIcon,
    ArrowPathIcon,
    LightBulbIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import projectService from "@/services/projectService";
import { API_BASE } from "@/services/api";
import { useLanguage } from "@/context/language-context";

const MEDIA_BASE = API_BASE.replace(/\/api\/?$/, "");
const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${MEDIA_BASE}/media/${path}`;
};

// Rating scale of the scheduler in anko_services (see api/services/flashcards_ws.py):
// 0 = Hard (shown again soon), 1 = Good (next learning step), 2 = Easy (graduates).
export const LEARN_RATINGS = { HARD: 0, GOOD: 1, EASY: 2 };
// "Next" without flipping counts as Good (product decision, F-05).
export const NEXT_RATING = LEARN_RATINGS.GOOD;

export function FlashcardLearnDialog({ open, onClose, deckId, deckTitle, jobId: initialJobId }) {
    const { t, language } = useLanguage();
    const [card, setCard] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(false);
    const [finished, setFinished] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [seq, setSeq] = useState(0);
    const [jobId, setJobId] = useState(null);
    const [startTime, setStartTime] = useState(Date.now());
    const [isReview, setIsReview] = useState(false);
    // seq only moves forward within a session; seen ids mark repeated cards as "Review".
    const lastSeqRef = useRef(0);
    const seenIdsRef = useRef(new Set());

    useEffect(() => {
        if (open && deckId) {
            setCard(null);
            setFinished(false);
            setErrorMsg(null);
            setSeq(0);
            setJobId(null);
            lastSeqRef.current = 0;
            seenIdsRef.current = new Set();
            loadNextCard(0);
        }
    }, [open, deckId, language]);

    const loadNextCard = async (lastSeq) => {
        try {
            setLoading(true);
            const resolvedJobId = jobId || initialJobId || null;
            const data = await projectService.wsPullCard({ deckId, jobId: resolvedJobId, lastSeq: Math.max(lastSeq, lastSeqRef.current) });
            if (!data || !data.card) {
                if (data?.message_type === "done") {
                    setFinished(true);
                } else {
                    const detail = data?.detail?.detail || data?.detail || data?.message_type || "No hay tarjetas disponibles.";
                    setErrorMsg(typeof detail === "string" ? detail : JSON.stringify(detail));
                }
                setCard(null);
            } else {
                const cardData = { ...data.card, seq: data.seq };
                setIsReview(data.kind === "review" || seenIdsRef.current.has(cardData.id));
                seenIdsRef.current.add(cardData.id);
                setCard(cardData);
                setIsFlipped(false);
                setStartTime(Date.now());
                if (data.seq) setSeq(data.seq);
                if (data.seq > lastSeqRef.current) lastSeqRef.current = data.seq;
                if (data.job_id) setJobId(data.job_id);
            }
        } catch (err) {
            console.error("Error pulling flashcard:", err);
            const msg = err?.detail || err?.message || err?.error || "Error al conectar con el servidor.";
            setErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
        } finally {
            setLoading(false);
        }
    };

    const handleRate = async (rating) => {
        if (!card) return;
        const timeToAnswer = Date.now() - startTime;
        try {
            setLoading(true);
            await projectService.wsPushFeedback({
                deckId, jobId,
                seq: card.seq || seq,
                cardId: card.id,
                rating,
                timeToAnswerMs: timeToAnswer,
            });
            await loadNextCard(card.seq || seq);
        } catch (err) {
            if (err?.message_type === "stale") {
                // Already rated (double click / retry): just move on.
                await loadNextCard(card.seq || seq);
                return;
            }
            console.error("Error pushing feedback:", err);
            setLoading(false);
        }
    };

    const handleFlip = () => setIsFlipped(f => !f);

    const handleShuffle = async () => {
        try {
            setLoading(true);
            await projectService.shuffleDeckCards(deckId);
            setFinished(false);
            setErrorMsg(null);
            setSeq(0);
            setJobId(null);
            lastSeqRef.current = 0;
            seenIdsRef.current = new Set();
            await loadNextCard(0);
        } catch (err) {
            console.error("Shuffle failed:", err);
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            handler={onClose}
            size="xl"
            className="bg-transparent shadow-none !mx-0 !my-0 !rounded-none !max-w-full !w-full !h-[100dvh] md:!mx-auto md:!my-8 md:!rounded-2xl md:!max-w-3xl md:!h-auto"
        >
            <div style={{ display: "flex", flexDirection: "column", background: "#060D1A", border: "1px solid rgba(255,255,255,0.08)" }}
                className="h-[100dvh] md:h-[85vh] md:max-h-[700px] md:rounded-2xl overflow-hidden">

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
                    <div style={{ minWidth: 0 }}>
                        <p style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 16, margin: 0 }} className="truncate">{deckTitle}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} className="animate-pulse" />
                            <p style={{ color: "#4ade80", fontSize: 11, fontWeight: 600, margin: 0 }}>
                                {language === "es" ? "Modo Aprendizaje" : "Learning Mode"}
                            </p>
                            {card && isReview && (
                                <span data-testid="review-badge" style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "1px 8px" }}>
                                    {language === "es" ? "Repaso" : "Review"}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 6, cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 150ms" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#F1F5F9"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#94A3B8"; }}
                    >
                        <XMarkIcon style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", overflow: "hidden" }}>

                    {/* Loading (initial) */}
                    {loading && !card ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.25)", borderTopColor: "#6366F1" }} className="animate-spin" />
                            <p style={{ color: "#94A3B8", fontSize: 13, fontStyle: "italic", margin: 0 }}>
                                {language === "es" ? "Cargando siguiente…" : "Loading next…"}
                            </p>
                        </div>

                    ) : errorMsg ? (
                        /* Error state */
                        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 380 }}>
                            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <ExclamationTriangleIcon style={{ width: 26, height: 26, color: "#f87171" }} />
                            </div>
                            <div>
                                <p style={{ color: "#F1F5F9", fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>
                                    {language === "es" ? "No se pudieron cargar las tarjetas" : "Could not load cards"}
                                </p>
                                <p style={{ color: "#64748B", fontSize: 12, margin: 0, lineHeight: 1.6 }}>{errorMsg}</p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{ padding: "10px 24px", borderRadius: 10, background: "transparent", border: "1px solid rgba(99,102,241,0.3)", color: "#818CF8", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                            >
                                {language === "es" ? "Cerrar" : "Close"}
                            </button>
                        </div>

                    ) : finished ? (
                        /* Finished state */
                        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <CheckCircleIcon style={{ width: 32, height: 32, color: "#4ade80" }} />
                            </div>
                            <div>
                                <p style={{ color: "#F1F5F9", fontWeight: 800, fontSize: 20, margin: "0 0 6px" }}>
                                    {language === "es" ? "¡Sesión Completada!" : "Session Complete!"}
                                </p>
                                <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
                                    {language === "es" ? "No hay más fichas por ahora." : "No more cards for now."}
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: 12 }}>
                                <button
                                    onClick={onClose}
                                    style={{ padding: "10px 20px", borderRadius: 10, background: "transparent", border: "1px solid rgba(99,102,241,0.3)", color: "#818CF8", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 150ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                                >
                                    {language === "es" ? "Volver" : "Back"}
                                </button>
                                <button
                                    onClick={handleShuffle}
                                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #818CF8)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "opacity 150ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                                >
                                    <ArrowPathIcon style={{ width: 14, height: 14 }} />
                                    {language === "es" ? "Barajar" : "Shuffle"}
                                </button>
                            </div>
                        </div>

                    ) : card ? (
                        <div style={{ width: "100%", maxWidth: 680, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}
                            className="perspective-1000">

                            {/* Card with flip */}
                            <div
                                style={{ position: "relative", width: "100%", cursor: "pointer", opacity: loading ? 0.6 : 1, transition: "opacity 200ms" }}
                                className={`aspect-[3/2] md:aspect-[16/9] transition-transform duration-700 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}
                                onClick={!loading ? handleFlip : undefined}
                            >
                                {/* Front */}
                                <div style={{
                                    position: "absolute", inset: 0,
                                    background: "#0F172A",
                                    border: "1px solid rgba(99,102,241,0.25)",
                                    borderRadius: 20,
                                    display: "flex", flexDirection: "column",
                                    alignItems: "center", justifyContent: "center",
                                    textAlign: "center", padding: "52px 32px 40px",
                                    boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08) inset",
                                }} className="backface-hidden">
                                    <div style={{ position: "absolute", top: 16, left: 20, display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.22)" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818CF8", display: "inline-block" }} className="animate-pulse" />
                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#818CF8", textTransform: "uppercase" }}>
                                            {t("global.actions.front") || "FRONT"}
                                        </span>
                                    </div>

                                    <p style={{ fontSize: "clamp(17px, 3vw, 26px)", fontWeight: 700, color: "#F1F5F9", lineHeight: 1.45, wordBreak: "break-word", overflowY: "auto", maxHeight: "100%", margin: 0 }}>
                                        {card.front || card.question}
                                    </p>

                                    <div style={{ position: "absolute", bottom: 16, display: "flex", alignItems: "center", gap: 6, color: "#334155" }}>
                                        <ArrowPathIcon style={{ width: 12, height: 12 }} />
                                        <span style={{ fontSize: 10, fontWeight: 500 }}>
                                            {language === "es" ? "Clic para girar" : "Click to flip"}
                                        </span>
                                    </div>
                                </div>

                                {/* Back */}
                                <div style={{
                                    position: "absolute", inset: 0,
                                    background: "linear-gradient(135deg, #0a1628 0%, #0d1a35 100%)",
                                    border: "1px solid rgba(74,222,128,0.22)",
                                    borderRadius: 20,
                                    display: "flex", flexDirection: "column",
                                    overflow: "hidden",
                                    boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(74,222,128,0.06) inset",
                                }} className="backface-hidden rotate-y-180">
                                    <div style={{ position: "absolute", top: 16, left: 20, zIndex: 1, display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.22)" }}>
                                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#4ade80", textTransform: "uppercase" }}>
                                            {t("global.actions.back") || "BACK"}
                                        </span>
                                    </div>

                                    {resolveImageUrl(card.back_image) ? (
                                        <div style={{ display: "flex", flexDirection: "column", height: "100%", paddingTop: 52 }}>
                                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", overflow: "hidden", minHeight: 0 }}>
                                                <img src={resolveImageUrl(card.back_image)} alt="back" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", borderRadius: 12 }} />
                                            </div>
                                            {card.back && (
                                                <div style={{ flexShrink: 0, padding: "12px 32px 20px", textAlign: "center", borderTop: "1px solid rgba(74,222,128,0.1)" }}>
                                                    <p style={{ fontSize: 16, fontWeight: 600, color: "#F1F5F9", lineHeight: 1.4, wordBreak: "break-word", margin: 0 }}>{card.back}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px 32px 24px", textAlign: "center" }}>
                                            <p style={{ fontSize: "clamp(15px, 2.5vw, 22px)", fontWeight: 600, color: "#F1F5F9", lineHeight: 1.5, wordBreak: "break-word", overflowY: "auto", maxHeight: "55%", margin: "0 0 16px" }}>
                                                {card.back || card.answer}
                                            </p>
                                            {card.explanation && (
                                                <div style={{ padding: "12px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, width: "100%", overflowY: "auto", maxHeight: 100 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 6 }}>
                                                        <LightBulbIcon style={{ width: 12, height: 12, color: "#f59e0b" }} />
                                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#f59e0b", textTransform: "uppercase" }}>
                                                            {t("global.actions.explanation") || "Explanation"}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: 11, color: "#CBD5E1", lineHeight: 1.6, margin: 0 }}>{card.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rating buttons */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", minHeight: 48 }}>
                                {!isFlipped ? (
                                    <button
                                        onClick={e => { e.stopPropagation(); handleRate(NEXT_RATING); }}
                                        disabled={loading}
                                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 32px", borderRadius: 30, background: "linear-gradient(135deg, #6366F1, #818CF8)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", boxShadow: "0 8px 24px rgba(99,102,241,0.35)", transition: "opacity 150ms", opacity: loading ? 0.6 : 1 }}
                                        onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = "0.85"; }}
                                        onMouseLeave={e => { e.currentTarget.style.opacity = loading ? "0.6" : "1"; }}
                                    >
                                        {language === "es" ? "Siguiente" : "Next"}
                                        <ChevronRightIcon style={{ width: 15, height: 15 }} />
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleRate(LEARN_RATINGS.HARD); }}
                                            disabled={loading}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 28px", borderRadius: 30, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", transition: "all 150ms", opacity: loading ? 0.5 : 1 }}
                                            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(248,113,113,0.18)"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.5)"; } }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(248,113,113,0.1)"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.3)"; }}
                                        >
                                            {language === "es" ? "Difícil" : "Hard"}
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleRate(LEARN_RATINGS.GOOD); }}
                                            disabled={loading}
                                            style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 28px", borderRadius: 30, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", fontSize: 14, fontWeight: 700, cursor: loading ? "default" : "pointer", transition: "all 150ms", opacity: loading ? 0.5 : 1 }}
                                            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(74,222,128,0.18)"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.5)"; } }}
                                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(74,222,128,0.1)"; e.currentTarget.style.borderColor = "rgba(74,222,128,0.3)"; }}
                                        >
                                            {language === "es" ? "Bien" : "Good"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
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

FlashcardLearnDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    deckId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    deckTitle: PropTypes.string,
    jobId: PropTypes.string,
};

export default FlashcardLearnDialog;
