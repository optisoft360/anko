import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/context/language-context";
import { FOCUS } from "@/enterprise/components/ui/kit";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog for the admin area: role=dialog + aria-modal + aria-labelledby, focus trap,
 * initial focus on the first field, Escape / outside click close (asking first when `dirty`).
 * Centered on desktop, bottom sheet on phones; rendered in a portal so no sticky/transformed
 * ancestor can clip it.
 */
export function AdminModal({ title, subtitle, onClose, children, footer, width = "max-w-lg", dirty = false }) {
  const { t } = useLanguage();
  const titleId = useId();
  const panel = useRef(null);
  const restore = useRef(null);

  // Refs so the document listener always sees the current values.
  const state = useRef({ dirty, onClose });
  state.current = { dirty, onClose };
  const requestClose = () => {
    if (state.current.dirty && !window.confirm(t("admin.modal.discard"))) return;
    state.current.onClose();
  };

  useEffect(() => {
    restore.current = document.activeElement;
    // First *enabled* field: a disabled one (e.g. a system role's name) can't take focus, which left
    // focus outside the dialog and Escape never reached it.
    const first = panel.current?.querySelector(
      "input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])",
    ) || panel.current?.querySelector(FOCUSABLE);
    (first || panel.current)?.focus();
    // Escape is handled on the document so it works wherever focus is. A field that consumes Escape
    // (a search box clearing itself) calls stopPropagation and keeps the dialog open.
    const onDocKey = (e) => { if (e.key === "Escape") requestClose(); };
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("keydown", onDocKey);
      if (restore.current && restore.current.focus) restore.current.focus();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e) => {
    if (e.key !== "Tab" || !panel.current) return;
    const items = [...panel.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-end justify-center bg-[#0F172A]/40 sm:items-center sm:p-6"
      onMouseDown={(e) => { if (e.target === e.currentTarget) requestClose(); }} onKeyDown={onKeyDown}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        className={`flex max-h-[92dvh] w-full ${width} flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.2)] sm:rounded-xl`}>
        <div className="flex items-start justify-between gap-3 border-b border-[#F1F5F9] px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-[#0F172A]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-[#64748B]">{subtitle}</p>}
          </div>
          <button type="button" onClick={requestClose} aria-label={t("admin.modal.close")}
            className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] ${FOCUS}`}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-[#F1F5F9] bg-[#F8FAFC] px-5 py-3 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export default AdminModal;
