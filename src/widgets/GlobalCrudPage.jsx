import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon, ChevronDownIcon, ChevronUpIcon, ChevronUpDownIcon, ExclamationCircleIcon,
  MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { AppPagination } from "@/components/AppPagination";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";
import {
  BTN_PRIMARY, BTN_SECONDARY, Card, EmptyBlock, FOCUS, PageHeader, SelectInput, SkeletonRows, Spinner, TextArea, TextInput,
} from "@/enterprise/components/ui/kit";
import { AdminModal } from "@/widgets/admin/AdminModal";
import { ConfirmDialog } from "@/widgets/admin/ConfirmDialog";
import { BooleanBadge, DASH, TruncatedText } from "@/widgets/admin/cells";
import { entityLabel, fieldErrors, normalizeList } from "@/widgets/admin/format";
import { fetchAll } from "@/widgets/admin/fetchAll";

const errBody = (err) => err?.response?.data ?? err;
const ICON_BTN = `grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`;

/** Renders any raw cell value readably: booleans as badges, objects by name, empty as a dash. */
function renderValue(v) {
  if (v === null || v === undefined || v === "") return DASH;
  if (typeof v === "boolean") return <BooleanBadge value={v} />;
  if (React.isValidElement(v)) return v;
  if (Array.isArray(v)) return v.length ? v.map((x) => (typeof x === "object" ? entityLabel(x) : x)).join(", ") : DASH;
  if (typeof v === "object") return entityLabel(v) || DASH;
  return <TruncatedText value={v} max={90} />;
}

function Toast({ toast, onDone }) {
  useEffect(() => { if (!toast) return undefined; const id = setTimeout(onDone, 3500); return () => clearTimeout(id); }, [toast, onDone]);
  if (!toast) return null;
  const ok = toast.type !== "error";
  return (
    <div role="status" aria-live="polite"
      className={`fixed bottom-5 left-1/2 z-[10060] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${ok ? "bg-[#047857]" : "bg-[#BE123C]"}`}>
      {toast.text}
    </div>
  );
}

/**
 * Generic admin list + CRUD page.
 *
 * Existing props keep their behavior. Optional ones:
 *  - subtitle, searchable, searchPlaceholder
 *  - filters: [{ name, label, options: [{value, label}] }]  → ?<name>=value
 *  - columns[].sortKey (enables ?ordering=), columns[].cell(item) (custom render), columns[].className
 *  - fields[].required, fields[].requiredOnCreate, fields[].hint, fields[].onlyOn ("create"|"edit")
 *  - deleteConfirm(item) → { entityName, consequences, confirmText }
 *  - canDelete(item) → true | "reason why not"; canEdit(item) → same
 *  - disableDelete, disableEdit, onRowClick(item)
 *  - editor: component replacing the generic form — receives { item | null, onClose, onSaved }
 *  - itemResource: endpoint for edit/delete when it differs from the listing (default: resource)
 *  - filters[].hidden: read from the URL (e.g. ?deck= from a link) but no select is shown
 *  - fields[].optionFilter(option): keep only some select-resource options
 *  - fields[].options for type "select" may come from state (e.g. companies)
 *  - rowOpensEditor: clicking a row opens the editor (inbox-style pages)
 */
export function GlobalCrudPage({
  title, resource, columns, fields, extraParams = {}, extraActions = null, editTitle, createTitle, disableCreate = false,
  subtitle, searchable = false, searchPlaceholder, filters = [], deleteConfirm, canDelete, canEdit,
  disableDelete = false, disableEdit = false, onRowClick: onRowClickProp, headerActions, editor: Editor, itemResource,
  rowOpensEditor = false,
}) {
  const writeResource = itemResource || resource;
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pageSize = Number(params.get("page_size")) || 10;
  const ordering = params.get("ordering") || "";
  const query = params.get("search") || "";
  // Stable string key: `filters` is a new array on every render of the page.
  const filterKey = filters.map((f) => `${f.name}=${params.get(f.name) || ""}`).join("&");
  const filterValues = useMemo(() => Object.fromEntries(filterKey ? filterKey.split("&").map((kv) => kv.split("=")) : []), [filterKey]);

  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [state, setState] = useState("loading"); // loading | ready | error
  const [reload, setReload] = useState(0);
  const [searchText, setSearchText] = useState(query);
  const [toast, setToast] = useState(null);

  const update = useCallback((patch, resetPage = true) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([k, v]) => (v === "" || v == null ? next.delete(k) : next.set(k, String(v))));
      if (resetPage && !("page" in patch)) next.delete("page");
      return next;
    }, { replace: true });
  }, [setParams]);

  // Debounced search → URL (300 ms).
  useEffect(() => {
    if (searchText === query) return undefined;
    const id = setTimeout(() => update({ search: searchText.trim() }), 300);
    return () => clearTimeout(id);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSearchText(query); }, [query]);

  const extraKey = JSON.stringify(extraParams);
  useEffect(() => {
    let alive = true;
    setState("loading");
    const p = { ...extraParams, page, page_size: pageSize };
    if (query) p.search = query;
    if (ordering) p.ordering = ordering;
    Object.entries(filterValues).forEach(([k, v]) => { if (v !== "") p[k] = v; });
    projectService.getList(resource, p)
      .then((data) => { if (!alive) return; const n = normalizeList(data); setRows(n.rows); setCount(n.count); setState("ready"); })
      .catch((err) => { if (alive) { console.error(`Failed to fetch ${resource}`, err); setState("error"); } });
    return () => { alive = false; };
  }, [resource, page, pageSize, query, ordering, filterKey, extraKey, reload]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── select-resource options (every page, not just the first) ───────────────
  const [options, setOptions] = useState({});
  useEffect(() => {
    let alive = true;
    const selects = fields.filter((f) => f.type === "select-resource" && f.resource);
    Promise.all(selects.map((f) => fetchAll(f.resource).then((list) => [f.name, list]).catch(() => [f.name, []])))
      .then((pairs) => { if (alive) setOptions(Object.fromEntries(pairs)); });
    return () => { alive = false; };
  }, [resource]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── create / edit modal ───────────────────────────────────────────────────
  const [editing, setEditing] = useState(null); // null | { item }
  const [form, setForm] = useState({});
  const [initialForm, setInitialForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(editing?.item);
  const visibleFields = fields.filter((f) => !f.hidden && (!f.onlyOn || f.onlyOn === (isEdit ? "edit" : "create")));

  const openForm = (item = null) => {
    if (Editor) { setEditing({ item, custom: true }); return; }
    const data = {};
    fields.forEach((f) => {
      if (item) {
        let v = item[f.name];
        if (f.type === "select-resource" && f.multiple && Array.isArray(v)) v = v.map((x) => (x && typeof x === "object" ? x[f.valueAccessor || "id"] : x));
        if (f.type === "select-resource" && !f.multiple && v && typeof v === "object") v = v[f.valueAccessor || "id"];
        if (f.type === "password") v = "";
        data[f.name] = v ?? (f.type === "boolean" ? false : f.multiple ? [] : "");
      } else {
        data[f.name] = f.defaultValue !== undefined ? f.defaultValue : f.type === "boolean" ? false : f.multiple ? [] : "";
      }
    });
    setForm(data); setInitialForm(data); setErrors({}); setEditing({ item });
  };

  const validate = () => {
    const errs = {};
    visibleFields.forEach((f) => {
      if (isEdit && f.excludeOnUpdate) return;
      const needed = f.required || (!isEdit && f.requiredOnCreate);
      const v = form[f.name];
      if (needed && (v === "" || v == null || (Array.isArray(v) && !v.length))) errs[f.name] = t("admin.form.required");
      if (f.type === "email" && v && !/^\S+@\S+\.\S+$/.test(v)) errs[f.name] = t("admin.form.invalidEmail");
    });
    return errs;
  };

  const save = async () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const payload = {};
      fields.forEach((f) => {
        if (!(f.name in form)) return;
        if (isEdit && f.excludeOnUpdate) return;
        if (f.type === "password" && !form[f.name]) return; // blank = keep
        payload[f.name] = form[f.name];
      });
      if (isEdit) await projectService.updateItem(writeResource, editing.item.id, payload);
      else await projectService.createItem(resource, payload);
      setEditing(null);
      setToast({ type: "ok", text: isEdit ? t("admin.toast.saved") : t("admin.toast.created") });
      setReload((n) => n + 1);
    } catch (err) {
      const fe = fieldErrors(errBody(err));
      setErrors(Object.keys(fe).length ? fe : { _: t("admin.toast.error") });
      setToast({ type: "error", text: t("admin.toast.error") });
    } finally {
      setSaving(false);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const [deleting, setDeleting] = useState(null);
  const doDelete = async () => {
    try {
      await projectService.deleteItem(writeResource, deleting.id);
      setDeleting(null);
      setToast({ type: "ok", text: t("admin.toast.deleted") });
      setReload((n) => n + 1);
    } catch (err) {
      const body = errBody(err);
      throw { detail: body?.detail || t("admin.toast.error") };
    }
  };

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const onRowClick = onRowClickProp || (rowOpensEditor ? (item) => openForm(item) : undefined);
  const hasFilters = Boolean(query || Object.values(filterValues).some(Boolean));
  const clearFilters = () => { setSearchText(""); update({ search: "", ...Object.fromEntries(filters.map((f) => [f.name, ""])) }); };

  const sortIcon = (key) => {
    if (ordering === key) return <ChevronUpIcon className="h-3.5 w-3.5" />;
    if (ordering === `-${key}`) return <ChevronDownIcon className="h-3.5 w-3.5" />;
    return <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-40" />;
  };
  const toggleSort = (key) => update({ ordering: ordering === key ? `-${key}` : ordering === `-${key}` ? "" : key });
  const cellOf = (item, col) => (col.cell ? col.cell(item) : renderValue(typeof col.accessor === "function" ? col.accessor(item) : item[col.accessor]));
  const reasonOf = (fn, item) => { if (!fn) return true; const r = fn(item); return r === true || r === undefined ? true : r; };

  const renderActions = (item) => {
    const editOk = reasonOf(canEdit, item);
    const delOk = reasonOf(canDelete, item);
    return (
      <div className="flex items-center justify-end gap-1">
        {extraActions && extraActions(item)}
        {!disableEdit && (
          <button type="button" onClick={(e) => { e.stopPropagation(); openForm(item); }} disabled={editOk !== true}
            aria-label={t("admin.table.edit")} title={editOk === true ? t("admin.table.edit") : editOk} className={ICON_BTN}>
            <PencilSquareIcon className="h-4 w-4" />
          </button>
        )}
        {!disableDelete && (
          <button type="button" onClick={(e) => { e.stopPropagation(); setDeleting(item); }} disabled={delOk !== true}
            aria-label={t("admin.table.delete")} title={delOk === true ? t("admin.table.delete") : delOk}
            className={`${ICON_BTN} hover:!bg-[#FFF1F2] hover:!text-[#BE123C]`}>
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  const renderField = (f) => {
    const id = `f-${f.name}`;
    const err = errors[f.name];
    const required = f.required || (!isEdit && f.requiredOnCreate);
    const disabled = isEdit && f.excludeOnUpdate;
    const set = (v) => { setForm((p) => ({ ...p, [f.name]: v })); if (errors[f.name]) setErrors((p) => ({ ...p, [f.name]: undefined })); };
    const hint = f.type === "password" && isEdit ? t("admin.form.passwordKeep") : f.hint;
    let control;
    if (f.type === "boolean") {
      return (
        <label key={f.name} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#E2E8F0] px-3 py-2.5">
          <input id={id} type="checkbox" checked={Boolean(form[f.name])} onChange={(e) => set(e.target.checked)} disabled={disabled}
            className="h-4 w-4 cursor-pointer accent-[#4F46E5]" />
          <span className="text-sm font-medium text-[#334155]">{f.label}</span>
          {f.hint && <span className="ml-auto text-xs text-[#64748B]">{f.hint}</span>}
        </label>
      );
    }
    if (f.type === "select-resource" && f.multiple) {
      const opts = (options[f.name] || []).filter(f.optionFilter || (() => true));
      const vals = Array.isArray(form[f.name]) ? form[f.name].map(String) : [];
      control = (
        <div className="max-h-56 overflow-y-auto rounded-lg border border-[#E2E8F0] p-2">
          {opts.length === 0 && <p className="px-1 py-2 text-sm text-[#64748B]">{t("admin.table.loading")}</p>}
          {opts.map((o) => {
            const val = String(o[f.valueAccessor || "id"]);
            const label = typeof f.labelAccessor === "function" ? f.labelAccessor(o) : (o[f.labelAccessor || "name"] || o.title || o.email || `#${val}`);
            return (
              <label key={val} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm text-[#334155] hover:bg-[#F8FAFC]">
                <input type="checkbox" className="h-4 w-4 accent-[#4F46E5]" checked={vals.includes(val)}
                  onChange={(e) => set(e.target.checked ? [...(form[f.name] || []), o[f.valueAccessor || "id"]] : (form[f.name] || []).filter((v) => String(v) !== val))} />
                <span className="min-w-0 truncate">{label}</span>
              </label>
            );
          })}
        </div>
      );
    } else if (f.type === "select-resource" || f.type === "select") {
      const opts = f.type === "select" ? (f.options || []).map((o) => ({ value: o.value, label: o.label }))
        : (options[f.name] || []).filter(f.optionFilter || (() => true)).map((o) => ({
          value: o[f.valueAccessor || "id"],
          label: typeof f.labelAccessor === "function" ? f.labelAccessor(o) : (o[f.labelAccessor || "name"] || o.title || o.email || `#${o.id}`),
        }));
      control = (
        <SelectInput id={id} value={String(form[f.name] ?? "")} onChange={(e) => set(e.target.value)} disabled={disabled} aria-invalid={Boolean(err)}>
          <option value="">{t("admin.form.select")}</option>
          {opts.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
        </SelectInput>
      );
    } else if (f.type === "textarea") {
      control = <TextArea id={id} rows={4} value={form[f.name] ?? ""} onChange={(e) => set(e.target.value)} disabled={disabled} placeholder={f.placeholder} aria-invalid={Boolean(err)} />;
    } else {
      const type = f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "password" ? "password" : "text";
      control = <TextInput id={id} type={type} value={form[f.name] ?? ""} onChange={(e) => set(e.target.value)} disabled={disabled}
        placeholder={f.placeholder} autoComplete={f.type === "password" ? "new-password" : "off"} aria-invalid={Boolean(err)}
        className={disabled ? "cursor-not-allowed !bg-[#F8FAFC] !text-[#64748B]" : ""} />;
    }
    return (
      <div key={f.name}>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[#334155]">
          {f.label}{required && <span className="text-[#E11D48]"> *</span>}
        </label>
        {control}
        {err ? <p className="mt-1 text-xs text-[#BE123C]">{err}</p> : hint ? <p className="mt-1 text-xs text-[#64748B]">{hint}</p> : null}
      </div>
    );
  };

  const confirm = deleting ? (deleteConfirm ? deleteConfirm(deleting) : {}) : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 md:py-2">
      <PageHeader title={title} subtitle={subtitle}
        actions={<>
          {headerActions}
          {!disableCreate && (
            <button type="button" onClick={() => openForm()} className={BTN_PRIMARY}>
              <PlusIcon className="h-4 w-4" /> {createTitle || t("admin.table.create")}
            </button>
          )}
        </>} />

      <Card>
        {(searchable || filters.some((f) => !f.hidden) || hasFilters) && (
          <div className="flex flex-col gap-2 border-b border-[#F1F5F9] p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
            {searchable && (
              <div className="relative min-w-0 flex-1 sm:max-w-sm">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <TextInput type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)}
                  placeholder={searchPlaceholder || t("admin.table.search")} aria-label={searchPlaceholder || t("admin.table.search")} className="pl-9" />
              </div>
            )}
            {filters.filter((f) => !f.hidden).map((f) => (
              <SelectInput key={f.name} value={filterValues[f.name]} onChange={(e) => update({ [f.name]: e.target.value })}
                aria-label={f.label} className="sm:w-48">
                <option value="">{f.label}: {t("admin.table.all")}</option>
                {(f.options || []).map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
              </SelectInput>
            ))}
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={`${BTN_SECONDARY} !h-10`}>
                <XMarkIcon className="h-4 w-4" /> {t("admin.table.clear")}
              </button>
            )}
          </div>
        )}

        {state === "loading" ? (
          <SkeletonRows rows={Math.min(pageSize, 6)} height="h-11" />
        ) : state === "error" ? (
          <EmptyBlock icon={ExclamationCircleIcon} title={t("admin.table.errorTitle")} hint={t("admin.table.errorHint")}
            action={<button type="button" onClick={() => setReload((n) => n + 1)} className={BTN_SECONDARY}><ArrowPathIcon className="h-4 w-4" /> {t("admin.table.retry")}</button>} />
        ) : rows.length === 0 ? (
          <EmptyBlock icon={MagnifyingGlassIcon} title={t("admin.table.empty")} hint={hasFilters ? t("admin.table.emptyFiltered") : undefined}
            action={hasFilters ? <button type="button" onClick={clearFilters} className={BTN_SECONDARY}>{t("admin.table.clear")}</button> : undefined} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#F1F5F9] text-xs font-medium uppercase tracking-wide text-[#64748B]">
                    {columns.map((c, i) => (
                      <th key={i} scope="col" className={`whitespace-nowrap px-4 py-3 ${c.className || ""}`}
                        aria-sort={c.sortKey ? (ordering === c.sortKey ? "ascending" : ordering === `-${c.sortKey}` ? "descending" : "none") : undefined}>
                        {c.sortKey ? (
                          <button type="button" onClick={() => toggleSort(c.sortKey)} className={`inline-flex cursor-pointer items-center gap-1 uppercase hover:text-[#0F172A] ${FOCUS}`}>
                            {c.header} {sortIcon(c.sortKey)}
                          </button>
                        ) : c.header}
                      </th>
                    ))}
                    <th scope="col" className="sticky right-0 bg-white px-4 py-3 text-right">{t("admin.table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {rows.map((item) => (
                    <tr key={item.id} onClick={onRowClick ? () => onRowClick(item) : undefined}
                      className={`group text-[#334155] hover:bg-[#F8FAFC] ${onRowClick ? "cursor-pointer" : ""}`}>
                      {columns.map((c, i) => <td key={i} className={`max-w-[280px] px-4 py-3 align-middle ${c.className || ""}`}>{cellOf(item, c)}</td>)}
                      <td className="sticky right-0 bg-white px-3 py-2 group-hover:bg-[#F8FAFC]">{renderActions(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Phone cards: only fields with a value */}
            <ul className="divide-y divide-[#F1F5F9] md:hidden">
              {rows.map((item) => (
                <li key={item.id} className="p-4" onClick={onRowClick ? () => onRowClick(item) : undefined}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 font-medium text-[#0F172A]">{cellOf(item, columns[0])}</div>
                    {renderActions(item)}
                  </div>
                  <dl className="mt-2 space-y-1.5 text-sm">
                    {columns.slice(1).map((c, i) => {
                      const raw = typeof c.accessor === "function" ? c.accessor(item) : item[c.accessor];
                      if (!c.cell && (raw === null || raw === undefined || raw === "")) return null;
                      return (
                        <div key={i} className="flex justify-between gap-3">
                          <dt className="shrink-0 text-[#64748B]">{c.header}</dt>
                          <dd className="min-w-0 truncate text-right text-[#334155]">{cellOf(item, c)}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}

        {state === "ready" && count > 0 && (
          <div className="border-t border-[#F1F5F9] px-3 py-3 sm:px-4">
            <AppPagination page={page} pageSize={pageSize} totalCount={count}
              onPageChange={(p) => update({ page: p }, false)} onPageSizeChange={(s) => update({ page_size: s })} />
          </div>
        )}
      </Card>

      {editing?.custom && (
        <Editor item={editing.item} onClose={() => setEditing(null)}
          onSaved={(text) => { setEditing(null); setToast({ type: "ok", text: text || t("admin.toast.saved") }); setReload((n) => n + 1); }} />
      )}

      {editing && !editing.custom && (
        <AdminModal title={isEdit ? (editTitle || t("admin.modal.editTitle")) : (createTitle || t("admin.modal.createTitle"))}
          onClose={() => setEditing(null)} dirty={dirty}
          footer={<>
            <button type="button" onClick={() => setEditing(null)} disabled={saving} className={BTN_SECONDARY}>{t("admin.modal.cancel")}</button>
            <button type="button" onClick={save} disabled={saving} className={BTN_PRIMARY}>
              {saving && <Spinner className="!h-4 !w-4 border-white/40 border-t-white" />}
              {t("admin.modal.save")}
            </button>
          </>}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
            {errors._ && <p role="alert" className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-sm text-[#BE123C]">{errors._}</p>}
            {visibleFields.map(renderField)}
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
        </AdminModal>
      )}

      {deleting && (
        <ConfirmDialog entityName={confirm.entityName || entityLabel(deleting, deleting.id)} consequences={confirm.consequences}
          confirmText={confirm.confirmText} onConfirm={doDelete} onClose={() => setDeleting(null)} />
      )}

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  );
}

export default GlobalCrudPage;
