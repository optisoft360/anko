import { useCallback, useEffect, useRef } from "react";

const BODY_KEYS = ["overflow", "position", "top", "paddingRight"];

// Puts <body> back the way it was when the modal opened, unless another dialog is still open.
function restoreBody(saved) {
  if (document.querySelector("[role='dialog']")) return;
  const wasFixed = document.body.style.position === "fixed";
  BODY_KEYS.forEach((k) => { document.body.style[k] = saved[k]; });
  if (wasFixed) window.scrollTo(0, saved.scrollY);
}

/**
 * Phone safety net for full-screen modals (Material Tailwind Dialog):
 * - opening pushes a history entry, so the Android back button/gesture closes the modal
 *   instead of leaving the page;
 * - after it closes (or unmounts) <body> overflow/position/top/padding-right and the scroll
 *   position are restored even if the dialog's exit animation never finishes.
 * Returns `close()`: use it for every close action (X, Close, backdrop, Esc). It resolves once
 * `onClose` has run, so a caller can open another modal right after without racing the history.
 */
export function useModalGuard(active, onClose) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const tokenRef = useRef(null);
  const savedRef = useRef(null);
  const pendingRef = useRef(null);

  const finish = useCallback(() => {
    tokenRef.current = null;
    onCloseRef.current?.();
    pendingRef.current?.();
    pendingRef.current = null;
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    if (!tokenRef.current) tokenRef.current = `ank-modal-${Date.now()}-${Math.random()}`;
    const token = tokenRef.current;
    if (!savedRef.current) {
      savedRef.current = { scrollY: window.scrollY };
      BODY_KEYS.forEach((k) => { savedRef.current[k] = document.body.style[k]; });
    }
    // Idempotent: StrictMode re-runs this effect and must not push twice.
    if (window.history.state?.ankModal !== token) {
      window.history.pushState({ ...(window.history.state || {}), ankModal: token }, "");
    }
    const onPop = () => { if (window.history.state?.ankModal !== token && tokenRef.current === token) finish(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [active, finish]);

  useEffect(() => {
    if (active || !savedRef.current) return undefined;
    const saved = savedRef.current;
    savedRef.current = null;
    tokenRef.current = null;
    const timer = setTimeout(() => restoreBody(saved), 600);
    return () => clearTimeout(timer);
  }, [active]);

  // Unmounted while open (or right after closing): still clean up <body>.
  useEffect(() => () => {
    const saved = savedRef.current;
    if (saved) setTimeout(() => restoreBody(saved), 600);
  }, []);

  return useCallback(() => new Promise((resolve) => {
    pendingRef.current = resolve;
    const token = tokenRef.current;
    if (token && window.history.state?.ankModal === token) {
      window.history.back(); // popstate → finish()
      setTimeout(() => { if (tokenRef.current === token) finish(); }, 400);
    } else {
      finish();
    }
  }), [finish]);
}

export default useModalGuard;
