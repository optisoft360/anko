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

// Single rating scale (FSRS convention), shared with the API (LearnRating in api/models.py).
export const Rating = Object.freeze({ Again: 1, Hard: 2, Good: 3, Easy: 4 });

const MAX_NETWORK_RETRIES = 2;

const RATING_BUTTONS = [
    { rating: Rating.Again, es: "Otra vez", en: "Again", color: "#f87171" },
    { rating: Rating.Hard, es: "Difícil", en: "Hard", color: "#f59e0b" },
    { rating: Rating.Good, es: "Bien", en: "Good", color: "#4ade80" },
    { rating: Rating.Easy, es: "Fácil", en: "Easy", color: "#38bdf8" },
];

function newJobId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return `learn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const isAbort = (err) => err?.name === "AbortError";

export function FlashcardLearnDialog({ open, onClose, deckId, deckTitle }) {
    const { t, language } = useLanguage();
    const [card, setCard] = useState(null);
    const [isFlipped, setIsFlipped] = useState(false);
    const [busy, setBusy] = useState(false);
    const [finished, setFinished] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);
    const [session, setSession] = useState(null);

    // Per-session values live in refs so re-renders never reset them.
    const jobIdRef = useRef(null);
    const seqRef = useRef(1);          // next seq to send; only advances on ack_seq
    const busyRef = useRef(false);     // one request in flight, ever
    const abortRef = useRef(null);
    const startTimeRef = useRef(Date.now());

    const applyPayload = (data) => {
        setSession(data?.session || null);
        if (!data?.next_card) {
            setCard(null);
            setFinished(true);
            return;
        }
        setCard(data.next_card);
        setIsFlipped(false);
        startTimeRef.current = Date.now();
    };

    const fail = (err) => {
        const detail = err?.data?.detail || err?.detail || err?.message;
        setErrorMsg(typeof detail === "string" && detail ? detail : (language === "es" ? "Error al conectar con el servidor." : "Could not reach the server."));
    };

    const startSession = async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        jobIdRef.current = newJobId();
        seqRef.current = 1;
        busyRef.current = true;
        setBusy(true); setCard(null); setFinished(false); setErrorMsg(null); setSession(null);
        try {
            const data = await projectService.learnStart({ deckId, jobId: jobIdRef.current, signal: controller.signal });
            if (!controller.signal.aborted) applyPayload(data);
        } catch (err) {
            if (!isAbort(err)) fail(err);
        } finally {
            if (abortRef.current === controller) { busyRef.current = false; setBusy(false); }
        }
    };

    // A new session (new job_id) every time the modal opens; pending requests are cancelled on close.
    useEffect(() => {
        if (open && deckId) startSession();
        return () => { abortRef.current?.abort(); busyRef.current = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, deckId]);

    const sendAnswer = async (answer) => {
        if (!card || busyRef.current) return; // ignore double clicks / re-entrant calls
        busyRef.current = true;
        setBusy(true);
        const controller = abortRef.current;
        const timeToAnswerMs = Date.now() - startTimeRef.current;
        let seq = seqRef.current;
        try {
            for (let attempt = 0; ; attempt += 1) {
                try {
                    const data = await projectService.learnAnswer({
                        deckId, jobId: jobIdRef.current, seq, cardId: card.card_id ?? card.id,
                        ...answer, timeToAnswerMs, signal: controller?.signal,
                    });
                    seqRef.current = data.ack_seq + 1;
                    applyPayload(data);
                    return;
                } catch (err) {
                    if (isAbort(err)) return;
                    if (err?.status === 409 && err?.data?.expected_seq && attempt < MAX_NETWORK_RETRIES) {
                        seq = err.data.expected_seq; // resync with the server
                        seqRef.current = seq;
                        continue;
                    }
                    if (err?.status === undefined && attempt < MAX_NETWORK_RETRIES) continue; // network: same seq
                    fail(err);
                    return;
                }
            }
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    };

    const handleRate = (rating) => sendAnswer({ rating });
    const handleSkip = () => sendAnswer({ action: "skip" });
    const handleFlip = () => { if (!busyRef.current) setIsFlipped(f => !f); };

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
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} className="animate-pulse" />
                            <p style={{ color: "var(--lt-4ade80, #4ade80)", fontSize: 11, fontWeight: 600, margin: 0 }}>
                                {language === "es" ? "Modo Aprendizaje" : "Learning Mode"}
                            </p>
                            {session && session.total > 0 && (
                                <span data-testid="session-progress" style={{ fontSize: 10, fontWeight: 700, color: "var(--lt-94a3b8, #94A3B8)" }}>
                                    {session.learned} / {session.total}
                                </span>
                            )}
                            {card?.is_review && (
                                <span data-testid="review-badge" style={{ fontSize: 10, fontWeight: 700, color: "var(--lt-f59e0b, #f59e0b)", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "1px 8px" }}>
                                    {language === "es" ? "Repaso" : "Review"}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 8, padding: 6, cursor: "pointer", color: "var(--lt-94a3b8, #94A3B8)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 150ms" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#F1F5F9"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#94A3B8"; }}
                    >
                        <XMarkIcon style={{ width: 18, height: 18 }} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px", overflow: "hidden" }}>

                    {/* Loading (initial) */}
                    {busy && !card && !finished ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(99,102,241,0.25)", borderTopColor: "#6366F1" }} className="animate-spin" />
                            <p style={{ color: "var(--lt-94a3b8, #94A3B8)", fontSize: 13, fontStyle: "italic", margin: 0 }}>
                                {language === "es" ? "Cargando siguiente…" : "Loading next…"}
                            </p>
                        </div>

                    ) : errorMsg ? (
                        /* Error state */
                        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 380 }}>
                            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <ExclamationTriangleIcon style={{ width: 26, height: 26, color: "var(--lt-f87171, #f87171)" }} />
                            </div>
                            <div>
                                <p style={{ color: "var(--lt-f1f5f9, #F1F5F9)", fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>
                                    {language === "es" ? "No se pudieron cargar las tarjetas" : "Could not load cards"}
                                </p>
                                <p style={{ color: "#64748B", fontSize: 12, margin: 0, lineHeight: 1.6 }}>{errorMsg}</p>
                            </div>
                            <button
                                onClick={onClose}
                                style={{ padding: "10px 24px", borderRadius: 10, background: "transparent", border: "1px solid rgba(99,102,241,0.3)", color: "var(--lt-818cf8, #818CF8)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                            >
                                {language === "es" ? "Cerrar" : "Close"}
                            </button>
                        </div>

                    ) : finished ? (
                        /* Finished state */
                        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
                            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <CheckCircleIcon style={{ width: 32, height: 32, color: "var(--lt-4ade80, #4ade80)" }} />
                            </div>
                            <div>
                                <p style={{ color: "var(--lt-f1f5f9, #F1F5F9)", fontWeight: 800, fontSize: 20, margin: "0 0 6px" }}>
                                    {language === "es" ? "¡Sesión Completada!" : "Session Complete!"}
                                </p>
                                <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
                                    {language === "es" ? "No hay más fichas por ahora." : "No more cards for now."}
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: 12 }}>
                                <button
                                    onClick={onClose}
                                    style={{ padding: "10px 20px", borderRadius: 10, background: "transparent", border: "1px solid rgba(99,102,241,0.3)", color: "var(--lt-818cf8, #818CF8)", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 150ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                                >
                                    {language === "es" ? "Cerrar" : "Close"}
                                </button>
                                <button
                                    onClick={startSession}
                                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #818CF8)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "opacity 150ms" }}
                                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
                                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                                >
                                    <ArrowPathIcon style={{ width: 14, height: 14 }} />
                                    {language === "es" ? "Repetir" : "Repeat"}
                                </button>
                            </div>
                        </div>

                    ) : card ? (
                        <div style={{ width: "100%", maxWidth: 680, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}
                            className="perspective-1000">

                            {/* Card with flip */}
                            <div
                                style={{ position: "relative", width: "100%", cursor: "pointer", opacity: busy ? 0.6 : 1, transition: "opacity 200ms" }}
                                className={`aspect-[3/2] md:aspect-[16/9] transition-transform duration-700 transform-style-3d ${isFlipped ? "rotate-y-180" : ""}`}
                                onClick={!busy ? handleFlip : undefined}
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
                                        {card.front || card.question}
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

                                    {resolveImageUrl(card.back_image) ? (
                                        <div style={{ display: "flex", flexDirection: "column", height: "100%", paddingTop: 52 }}>
                                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", overflow: "hidden", minHeight: 0 }}>
                                                <img src={resolveImageUrl(card.back_image)} alt="back" style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", borderRadius: 12 }} />
                                            </div>
                                            {card.back && (
                                                <div style={{ flexShrink: 0, padding: "12px 32px 20px", textAlign: "center", borderTop: "1px solid rgba(74,222,128,0.1)" }}>
                                                    <p style={{ fontSize: 16, fontWeight: 600, color: "var(--lt-f1f5f9, #F1F5F9)", lineHeight: 1.4, wordBreak: "break-word", margin: 0 }}>{card.back}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "52px 32px 24px", textAlign: "center" }}>
                                            <p style={{ fontSize: "clamp(15px, 2.5vw, 22px)", fontWeight: 600, color: "var(--lt-f1f5f9, #F1F5F9)", lineHeight: 1.5, wordBreak: "break-word", overflowY: "auto", maxHeight: "55%", margin: "0 0 16px" }}>
                                                {card.back || card.answer}
                                            </p>
                                            {card.explanation && (
                                                <div style={{ padding: "12px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, width: "100%", overflowY: "auto", maxHeight: 100 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 6 }}>
                                                        <LightBulbIcon style={{ width: 12, height: 12, color: "var(--lt-f59e0b, #f59e0b)" }} />
                                                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--lt-f59e0b, #f59e0b)", textTransform: "uppercase" }}>
                                                            {t("global.actions.explanation") || "Explanation"}
                                                        </span>
                                                    </div>
                                                    <p style={{ fontSize: 11, color: "var(--lt-cbd5e1, #CBD5E1)", lineHeight: 1.6, margin: 0 }}>{card.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Rating buttons — disabled while a request is in flight */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", flexWrap: "wrap", minHeight: 48 }}>
                                {!isFlipped ? (
                                    <>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleFlip(); }}
                                            disabled={busy}
                                            style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 32px", borderRadius: 30, background: "linear-gradient(135deg, #6366F1, #818CF8)", border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer", boxShadow: "0 8px 24px rgba(99,102,241,0.35)", transition: "opacity 150ms", opacity: busy ? 0.6 : 1 }}
                                        >
                                            {language === "es" ? "Siguiente" : "Next"}
                                            <ChevronRightIcon style={{ width: 15, height: 15 }} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleSkip(); }}
                                            disabled={busy}
                                            style={{ padding: "10px 18px", borderRadius: 30, background: "transparent", border: "1px solid rgba(148,163,184,0.25)", color: "var(--lt-94a3b8, #94A3B8)", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}
                                        >
                                            {language === "es" ? "Saltar" : "Skip"}
                                        </button>
                                    </>
                                ) : (
                                    RATING_BUTTONS.map(({ rating, es, en, color }) => (
                                        <button
                                            key={rating}
                                            onClick={e => { e.stopPropagation(); handleRate(rating); }}
                                            disabled={busy}
                                            style={{ padding: "11px 22px", borderRadius: 30, background: `${color}1A`, border: `1px solid ${color}4D`, color, fontSize: 14, fontWeight: 700, cursor: busy ? "default" : "pointer", transition: "all 150ms", opacity: busy ? 0.5 : 1 }}
                                        >
                                            {language === "es" ? es : en}
                                        </button>
                                    ))
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
};

export default FlashcardLearnDialog;
