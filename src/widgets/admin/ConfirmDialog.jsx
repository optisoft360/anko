import React, { useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/context/language-context";
import { BTN_SECONDARY, FOCUS, Spinner, TextInput } from "@/enterprise/components/ui/kit";
import { AdminModal } from "./AdminModal";

const BTN_DANGER = `inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#BE123C] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 ${FOCUS}`;

/**
 * Delete confirmation naming the entity and its consequences. With `confirmText`, the user must
 * type it (role, plan and company names) before the button enables.
 */
export function ConfirmDialog({ title, entityName, consequences, confirmText, confirmLabel, onConfirm, onClose }) {
  const { t } = useLanguage();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const blocked = confirmText ? typed.trim() !== String(confirmText).trim() : false;

  const run = async () => {
    setBusy(true); setError("");
    try { await onConfirm(); } catch (e) { setError(e?.detail || e?.message || t("admin.toast.error")); setBusy(false); }
  };

  return (
    <AdminModal title={title || t("admin.confirm.title")} onClose={busy ? () => {} : onClose} width="max-w-md"
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} className={BTN_SECONDARY}>{t("admin.modal.cancel")}</button>
        <button type="button" onClick={run} disabled={busy || blocked} className={BTN_DANGER}>
          {busy && <Spinner className="!h-4 !w-4 border-white/40 border-t-white" />}
          {confirmLabel || t("admin.confirm.delete")}
        </button>
      </>}>
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FFF1F2] text-[#E11D48]"><ExclamationTriangleIcon className="h-5 w-5" /></span>
        <div className="min-w-0 space-y-2 text-sm text-[#334155]">
          {entityName && <p>{t("admin.confirm.about")} <strong className="break-words text-[#0F172A]">{entityName}</strong></p>}
          <p className="text-[#64748B]">{consequences || t("admin.confirm.irreversible")}</p>
          {confirmText && (
            <label className="block pt-1">
              <span className="mb-1.5 block text-sm font-medium text-[#334155]">{t("admin.confirm.typeToConfirm", { name: confirmText })}</span>
              <TextInput value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" aria-label={t("admin.confirm.typeToConfirm", { name: confirmText })} />
            </label>
          )}
          {error && <p role="alert" className="text-[#BE123C]">{error}</p>}
        </div>
      </div>
    </AdminModal>
  );
}

export default ConfirmDialog;
