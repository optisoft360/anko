import React, { useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import projectService from "@/services/projectService";
import { Badge, BTN_PRIMARY, BTN_SECONDARY, Field, Spinner, TextArea, TextInput } from "@/enterprise/components/ui/kit";
import { AdminModal } from "@/widgets/admin/AdminModal";
import { fetchAll } from "@/widgets/admin/fetchAll";
import { TruncatedText } from "@/widgets/admin/cells";
import { fieldErrors } from "@/widgets/admin/format";

// Internal implementation notes in seeded descriptions ("(CompanyMembership role='admin')") are not for admins.
const cleanDescription = (s) => String(s || "").replace(/\s*\(CompanyMembership[^)]*\)/g, "").trim();

function areaOf(key = "") {
  if (key.startsWith("dashboard.admin.")) return "admin";
  if (key.startsWith("enterprise.")) return "enterprise";
  if (key.startsWith("auth.")) return "auth";
  if (key.startsWith("dashboard.")) return "learning";
  return "other";
}
const AREA_ORDER = ["admin", "enterprise", "learning", "auth", "other"];

/** [{resource, resource_key, resource_name, permissions:[{id, action, code}]}] from the new endpoint or, on an old API, every page of /permissions/. */
async function loadPermissionGroups() {
  try {
    const data = await projectService.getList("permissions/all");
    if (Array.isArray(data)) return data;
  } catch { /* old API: fall back below */ }
  const flat = await fetchAll("permissions");
  const groups = new Map();
  flat.forEach((p) => {
    const rid = typeof p.resource === "object" && p.resource ? p.resource.id : p.resource;
    if (!groups.has(rid)) groups.set(rid, { resource: rid, resource_key: p.resourceKey || `#${rid}`, resource_name: p.resourceKey || `#${rid}`, permissions: [] });
    groups.get(rid).permissions.push({ id: p.id, action: p.action, code: p.code });
  });
  return [...groups.values()];
}

function RoleEditor({ item, onClose, onSaved }) {
  const { t } = useLanguage();
  const k = (key, params) => t(`admin.roles.${key}`, params);
  const isEdit = Boolean(item);
  const isSystem = Boolean(item?.is_system);
  const [groups, setGroups] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(false);
  const [name, setName] = useState(item?.name || "");
  const [description, setDescription] = useState(item?.description || "");
  const initialIds = useMemo(() => (item?.permission_ids || item?.permissions || []).map((p) => (typeof p === "object" ? p.id : p)), [item]);
  const [selected, setSelected] = useState(() => new Set(initialIds));
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadPermissionGroups().then(setGroups).catch(() => setLoadError(true));
  }, []);

  const total = groups ? groups.reduce((n, g) => n + g.permissions.length, 0) : 0;
  const byArea = useMemo(() => {
    if (!groups) return [];
    const q = filter.trim().toLowerCase();
    const map = new Map(AREA_ORDER.map((a) => [a, []]));
    groups.forEach((g) => {
      if (q && !`${g.resource_key} ${g.resource_name}`.toLowerCase().includes(q)) return;
      map.get(areaOf(g.resource_key)).push(g);
    });
    return [...map.entries()].filter(([, list]) => list.length).map(([area, list]) => [area, list.sort((a, b) => a.resource_key.localeCompare(b.resource_key))]);
  }, [groups, filter]);

  const toggle = (id, on) => setSelected((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; });
  const setMany = (ids, on) => setSelected((prev) => { const next = new Set(prev); ids.forEach((id) => (on ? next.add(id) : next.delete(id))); return next; });

  const dirty = name !== (item?.name || "") || description !== (item?.description || "")
    || selected.size !== initialIds.length || initialIds.some((id) => !selected.has(id));

  const save = async () => {
    if (!name.trim()) { setErrors({ name: t("admin.form.required") }); return; }
    setSaving(true); setErrors({});
    const ids = [...selected];
    try {
      if (!isEdit) {
        await projectService.createItem("roles", { name: name.trim(), description, permissions: ids });
      } else {
        const patch = { description };
        if (!isSystem) patch.name = name.trim();
        await projectService.updateItem("roles", item.id, patch);
        try {
          await projectService.putRolePermissions(item.id, ids);
        } catch (err) {
          if (![404, 405].includes(err?.response?.status)) throw err;
          await projectService.updateItem("roles", item.id, { permissions: ids }); // old API: full list, never partial
        }
      }
      onSaved(t(isEdit ? "admin.toast.saved" : "admin.toast.created"));
    } catch (err) {
      const fe = fieldErrors(err?.response?.data ?? err);
      setErrors(Object.keys(fe).length ? fe : { _: t("admin.toast.error") });
      setSaving(false);
    }
  };

  return (
    <AdminModal title={isEdit ? k("editTitle") : k("createTitle")} subtitle={isSystem ? k("systemHint") : undefined}
      onClose={onClose} dirty={dirty} width="max-w-3xl" discardMessage={k("discardBody")}
      footer={<>
        <span className="mr-auto self-center text-sm tabular-nums text-[#64748B]">{groups ? k("count", { a: selected.size, b: total }) : ""}</span>
        <button type="button" data-modal-cancel onClick={onClose} disabled={saving} className={BTN_SECONDARY}>{t("admin.modal.cancel")}</button>
        <button type="button" onClick={save} disabled={saving || !groups} title={!groups ? k("waitLoad") : undefined} className={BTN_PRIMARY}>
          {saving && <Spinner className="!h-4 !w-4 border-white/40 border-t-white" />}
          {t("admin.modal.save")}
        </button>
      </>}>
      <div className="space-y-4">
        {errors._ && <p role="alert" className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-sm text-[#BE123C]">{errors._}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={<>{k("name")} <span className="text-[#E11D48]">*</span></>} hint={errors.name ? <span className="text-[#BE123C]">{errors.name}</span> : isSystem ? k("nameLocked") : null}>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} disabled={isSystem}
              className={isSystem ? "cursor-not-allowed !bg-[#F8FAFC] !text-[#64748B]" : ""} />
          </Field>
          <Field label={k("description")} hint={errors.description}>
            <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>

        <div>
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-[#0F172A]">{k("permissions")}</h3>
            <div className="relative sm:w-64">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <TextInput type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={k("filter")} aria-label={k("filter")} className="pl-9"
                onKeyDown={(e) => { if (e.key === "Escape" && filter) { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation?.(); setFilter(""); } }} />
            </div>
          </div>

          {loadError ? (
            <p role="alert" className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-sm text-[#BE123C]">{k("loadError")}</p>
          ) : !groups ? (
            <div className="grid place-items-center py-10"><Spinner /></div>
          ) : (
            <div className="space-y-4">
              {byArea.map(([area, list]) => {
                const ids = list.flatMap((g) => g.permissions.map((p) => p.id));
                const on = ids.filter((id) => selected.has(id)).length;
                return (
                  <section key={area} className="overflow-hidden rounded-lg border border-[#E2E8F0]">
                    <div className="flex items-center justify-between gap-2 bg-[#F8FAFC] px-3 py-2">
                      <span className="text-sm font-semibold text-[#0F172A]">{k(`areas.${area}`)} <span className="font-normal tabular-nums text-[#64748B]">· {on}/{ids.length}</span></span>
                      <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#475569]">
                        <input type="checkbox" className="h-4 w-4 accent-[#4F46E5]" checked={on === ids.length}
                          ref={(el) => { if (el) el.indeterminate = on > 0 && on < ids.length; }}
                          onChange={(e) => setMany(ids, e.target.checked)} />
                        {k("selectGroup")}
                      </label>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="sr-only"><tr><th>{k("resource")}</th><th>View</th><th>Manage</th></tr></thead>
                      <tbody className="divide-y divide-[#F1F5F9]">
                        {list.map((g) => (
                          <tr key={g.resource}>
                            <td className="px-3 py-2">
                              <span className="block text-[#334155]">{g.resource_name}</span>
                              {g.resource_name !== g.resource_key && <span className="block font-mono text-[11px] text-[#94A3B8]">{g.resource_key}</span>}
                            </td>
                            {["view", "manage"].map((action) => {
                              const p = g.permissions.find((x) => x.action === action);
                              return (
                                <td key={action} className="w-24 px-2 py-2 text-center">
                                  {p ? (
                                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-[#475569]">
                                      <input type="checkbox" className="h-4 w-4 accent-[#4F46E5]" checked={selected.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)}
                                        aria-label={`${g.resource_name} · ${k(`actions.${action}`)}`} />
                                      {k(`actions.${action}`)}
                                    </label>
                                  ) : <span className="text-[#CBD5E1]">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}

export function GlobalRoles() {
  const { t } = useLanguage();
  const k = (key, params) => t(`admin.roles.${key}`, params);
  return (
    <GlobalCrudPage
      title={t("global.pages.roles.title")}
      subtitle={k("subtitle")}
      resource="roles"
      createTitle={k("createTitle")}
      editor={RoleEditor}
      columns={[
        { header: k("name"), accessor: "name", cell: (r) => (
          <span className="flex items-center gap-2">
            <span className="font-medium text-[#0F172A]">{r.name}</span>
            {r.is_system && <Badge tone="violet">{k("system")}</Badge>}
          </span>
        ) },
        { header: k("description"), accessor: "description", cell: (r) => <TruncatedText value={cleanDescription(r.description)} max={90} /> },
        { header: k("permissions"), accessor: (r) => (r.permission_ids || r.permissions || []).length, className: "tabular-nums" },
      ]}
      fields={[]}
      canDelete={(r) => (r.is_system ? k("systemNoDelete") : true)}
      deleteConfirm={(r) => ({ entityName: r.name, confirmText: r.name, consequences: k("deleteConsequences") })}
    />
  );
}

export default GlobalRoles;
