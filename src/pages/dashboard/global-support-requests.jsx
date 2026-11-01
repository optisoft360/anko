import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { XMarkIcon } from "@heroicons/react/24/outline";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import projectService from "@/services/projectService";
import { BTN_PRIMARY, BTN_SECONDARY, FOCUS, SelectInput, Spinner, TextArea } from "@/enterprise/components/ui/kit";
import { DateCell, EntityCell, StatusBadge, TruncatedText } from "@/widgets/admin/cells";
import { fetchAll } from "@/widgets/admin/fetchAll";
import { fieldErrors, formatDate } from "@/widgets/admin/format";

const STATUSES = ["new", "in_progress", "done"];
const TONE = { new: "sky", in_progress: "amber", done: "emerald" };

function usePlatformAdmins() {
  const [admins, setAdmins] = useState([]);
  useEffect(() => {
    Promise.all([fetchAll("users", { is_staff: "true" }), fetchAll("users", { role: "admin" })])
      .then(([a, b]) => setAdmins([...new Map([...a, ...b].map((u) => [u.id, u])).values()]))
      .catch(() => setAdmins([]));
  }, []);
  return admins;
}

/** Side panel: read the whole message, change status, assign it, keep an internal note. */
function SupportPanel({ item, onClose, onSaved }) {
  const { t, language } = useLanguage();
  const k = (key) => t(`admin.pages.support.${key}`);
  const admins = usePlatformAdmins();
  const [form, setForm] = useState({ status: item.status, assigned_to: item.assigned_to ?? "", internal_note: item.internal_note ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inbox = "assigned_to" in item; // older API: no inbox fields, status only

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    setSaving(true); setError("");
    const payload = { status: form.status };
    if (inbox) { payload.assigned_to = form.assigned_to === "" ? null : Number(form.assigned_to); payload.internal_note = form.internal_note; }
    try {
      await projectService.updateItem("support-requests", item.id, payload);
      onSaved();
    } catch (err) {
      const fe = fieldErrors(err?.response?.data ?? err);
      setError(Object.values(fe)[0] || t("admin.toast.error"));
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10050] flex justify-end bg-[#0F172A]/30" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside role="dialog" aria-modal="true" aria-labelledby="support-panel-title" className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#F1F5F9] px-5 py-4">
          <div className="min-w-0">
            <h2 id="support-panel-title" className="truncate text-base font-semibold text-[#0F172A]">{item.name || item.email}</h2>
            <p className="truncate text-sm text-[#64748B]">{item.email}{item.phone ? ` · ${item.phone}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("admin.modal.close")} className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9] ${FOCUS}`}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="text-xs text-[#64748B]">{formatDate(item.created_at, language)}{item.source ? ` · ${item.source}` : ""}</div>
          <p className="whitespace-pre-wrap rounded-lg bg-[#F8FAFC] p-3 text-sm leading-relaxed text-[#0F172A]">{item.message}</p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#334155]">{k("status")}</span>
            <SelectInput value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => <option key={s} value={s}>{k(`status_${s}`)}</option>)}
            </SelectInput>
          </label>
          {inbox && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#334155]">{k("assigned")}</span>
                <SelectInput value={String(form.assigned_to)} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}>
                  <option value="">{k("unassigned")}</option>
                  {admins.map((u) => <option key={u.id} value={u.id}>{u.username}</option>)}
                </SelectInput>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#334155]">{k("note")}</span>
                <TextArea rows={4} value={form.internal_note} onChange={(e) => setForm((f) => ({ ...f, internal_note: e.target.value }))} placeholder={k("notePlaceholder")} />
                <span className="mt-1 block text-xs text-[#64748B]">{k("noteHint")}</span>
              </label>
            </>
          )}
          {error && <p role="alert" className="text-sm text-[#BE123C]">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#F1F5F9] bg-[#F8FAFC] px-5 py-3">
          <button type="button" onClick={onClose} disabled={saving} className={BTN_SECONDARY}>{t("admin.modal.cancel")}</button>
          <button type="button" onClick={save} disabled={saving} className={BTN_PRIMARY}>{saving && <Spinner className="!h-4 !w-4 border-white/40 border-t-white" />}{t("admin.modal.save")}</button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function GlobalSupportRequests() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.support.${key}`);
  const statusLabels = Object.fromEntries(STATUSES.map((s) => [s, k(`status_${s}`)]));
  return (
    <GlobalCrudPage
      title={t("global.pages.support-requests.title")}
      subtitle={k("subtitle")}
      resource="support-requests"
      disableCreate
      searchable
      searchPlaceholder={k("search")}
      filters={[{ name: "status", label: k("status"), options: STATUSES.map((s) => ({ value: s, label: statusLabels[s] })) }]}
      editor={SupportPanel}
      rowOpensEditor
      columns={[
        { header: k("from"), cell: (r) => <EntityCell detail={{ name: r.name || r.email }} sub={r.name ? r.email : undefined} /> },
        { header: k("message"), cell: (r) => <TruncatedText value={r.message} max={70} /> },
        { header: k("source"), accessor: "source" },
        { header: k("date"), sortKey: "created_at", cell: (r) => <DateCell value={r.created_at} /> },
        { header: k("status"), sortKey: "status", cell: (r) => <StatusBadge value={r.status} tones={TONE} labels={statusLabels} /> },
        { header: k("assigned"), cell: (r) => <EntityCell detail={r.assigned_to_detail} id={r.assigned_to} /> },
      ]}
      fields={[]}
      deleteConfirm={(r) => ({ entityName: `${r.name || r.email}`, consequences: k("deleteConsequences") })}
    />
  );
}

export default GlobalSupportRequests;
