import React, { useState } from "react";
import { BuildingOffice2Icon, ChartBarIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import GlobalCrudPage from "@/widgets/GlobalCrudPage";
import { useLanguage } from "@/context/language-context";
import { UserStatisticsDialog } from "@/widgets/dialogs/user-statistics-dialog";
import projectService from "@/services/projectService";
import { companyApi } from "@/enterprise/api/enterpriseApi";
import { Avatar, Badge, BTN_PRIMARY, BTN_SECONDARY, FOCUS, ROLE_TONE, SelectInput, Spinner } from "@/enterprise/components/ui/kit";
import { AdminModal } from "@/widgets/admin/AdminModal";
import { BooleanBadge } from "@/widgets/admin/cells";
import { useCompanyOptions } from "@/widgets/admin/useCompanyOptions";

const COMPANY_ROLES = ["owner", "admin", "manager", "trainer", "employee", "auditor"];
const PLATFORM_ROLES = ["admin", "client"];
const ICON_BTN = `grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#0F172A] ${FOCUS}`;
const roleName = (r) => (typeof r === "object" && r ? r.name : r);

function CompanyMembershipsDialog({ user, onClose, onChanged }) {
  const { t } = useLanguage();
  const k = (key, p) => t(`admin.pages.users.memberships.${key}`, p);
  const companies = useCompanyOptions();
  const [memberships, setMemberships] = useState(user?.company_memberships || []);
  const [busy, setBusy] = useState(null);
  const [pending, setPending] = useState(null); // { id, role } awaiting confirmation
  const [error, setError] = useState("");
  const [adding, setAdding] = useState({ company: "", role: "employee" });

  const changeRole = async () => {
    const { id, role } = pending;
    setBusy(id); setError("");
    try {
      await projectService.updateItem("company-memberships", id, { role });
      setMemberships((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)));
      onChanged();
    } catch { setError(t("admin.toast.error")); }
    setBusy(null); setPending(null);
  };
  const remove = async (id) => {
    setBusy(id); setError("");
    try {
      await projectService.deleteItem("company-memberships", id);
      setMemberships((prev) => prev.filter((m) => m.id !== id));
      onChanged();
    } catch { setError(t("admin.toast.error")); }
    setBusy(null);
  };
  const add = async () => {
    if (!adding.company) return;
    setBusy("add"); setError("");
    try {
      await companyApi.addUser(adding.company, { email: user.email, role: adding.role });
      const name = companies.find((c) => String(c.value) === String(adding.company))?.label;
      setMemberships((prev) => [...prev, { id: `new-${adding.company}`, company_id: Number(adding.company), company_name: name, role: adding.role, status: "active" }]);
      setAdding({ company: "", role: "employee" });
      onChanged();
    } catch (e) { setError(e?.detail || e?.email?.[0] || t("admin.toast.error")); }
    setBusy(null);
  };
  const free = companies.filter((c) => !memberships.some((m) => String(m.company_id) === String(c.value)));

  return (
    <AdminModal title={k("title")} subtitle={`${user.username} · ${user.email}`} onClose={onClose} width="max-w-lg"
      footer={<button type="button" onClick={onClose} className={BTN_SECONDARY}>{t("admin.modal.close")}</button>}>
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-sm text-[#BE123C]">{error}</p>}
        {memberships.length === 0 ? (
          <p className="text-sm text-[#64748B]">{k("none")}</p>
        ) : (
          <ul className="divide-y divide-[#F1F5F9] rounded-lg border border-[#E2E8F0]">
            {memberships.map((m) => (
              <li key={m.id} className="flex items-center gap-2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#0F172A]">{m.company_name}</p>
                  <p className="text-xs text-[#64748B]">{m.status}</p>
                </div>
                {pending?.id === m.id ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className="text-[#334155]">{k("confirmRole", { role: t(`admin.companyRoles.${pending.role}`) })}</span>
                    <button type="button" onClick={changeRole} disabled={busy === m.id} className={`${BTN_PRIMARY} !h-8 !px-2.5 !text-xs`}>{t("admin.modal.save")}</button>
                    <button type="button" onClick={() => setPending(null)} className={`${BTN_SECONDARY} !h-8 !px-2.5 !text-xs`}>{t("admin.modal.cancel")}</button>
                  </span>
                ) : (
                  <>
                    <SelectInput aria-label={k("role")} value={m.role} disabled={busy === m.id || String(m.id).startsWith("new-")}
                      onChange={(e) => setPending({ id: m.id, role: e.target.value })} className="!h-9 w-36">
                      {COMPANY_ROLES.map((r) => <option key={r} value={r}>{t(`admin.companyRoles.${r}`)}</option>)}
                    </SelectInput>
                    <button type="button" onClick={() => remove(m.id)} disabled={busy === m.id || String(m.id).startsWith("new-")}
                      aria-label={k("remove", { company: m.company_name })} title={k("remove", { company: m.company_name })}
                      className={`${ICON_BTN} hover:!bg-[#FFF1F2] hover:!text-[#BE123C]`}>
                      {busy === m.id ? <Spinner className="!h-4 !w-4" /> : <TrashIcon className="h-4 w-4" />}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {free.length > 0 && (
          <div className="rounded-lg border border-dashed border-[#CBD5E1] p-3">
            <p className="mb-2 text-sm font-medium text-[#334155]">{k("add")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <SelectInput aria-label={k("company")} value={adding.company} onChange={(e) => setAdding((a) => ({ ...a, company: e.target.value }))}>
                <option value="">{k("company")}…</option>
                {free.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </SelectInput>
              <SelectInput aria-label={k("role")} value={adding.role} onChange={(e) => setAdding((a) => ({ ...a, role: e.target.value }))} className="sm:w-40">
                {COMPANY_ROLES.map((r) => <option key={r} value={r}>{t(`admin.companyRoles.${r}`)}</option>)}
              </SelectInput>
              <button type="button" onClick={add} disabled={!adding.company || busy === "add"} className={BTN_PRIMARY}>
                {busy === "add" ? <Spinner className="!h-4 !w-4 border-white/40 border-t-white" /> : <PlusIcon className="h-4 w-4" />} {k("addButton")}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminModal>
  );
}

export function GlobalUsers() {
  const { t } = useLanguage();
  const k = (key) => t(`admin.pages.users.${key}`);
  const companies = useCompanyOptions();
  const [statsUser, setStatsUser] = useState(null);
  const [membershipsUser, setMembershipsUser] = useState(null);
  const [version, setVersion] = useState(0);
  const yesNo = [{ value: "true", label: t("admin.cells.yes") }, { value: "false", label: t("admin.cells.no") }];

  return (
    <>
      <GlobalCrudPage
        key={version}
        title={t("global.pages.users.title")}
        subtitle={k("subtitle")}
        resource="users"
        createTitle={k("createTitle")}
        editTitle={k("editTitle")}
        searchable
        searchPlaceholder={k("search")}
        filters={[
          { name: "is_active", label: k("active"), options: yesNo },
          { name: "is_staff", label: k("staff"), options: yesNo },
          { name: "company", label: k("company"), options: companies },
          { name: "role", label: k("platformRole"), options: PLATFORM_ROLES.map((r) => ({ value: r, label: r })) },
        ]}
        columns={[
          // Email sits under the username (full name in its tooltip) so the table fits at 1024px.
          { header: k("user"), sortKey: "username", maxWidth: "max-w-[260px]", cell: (u) => (
            <span className="flex min-w-0 items-center gap-2.5">
              <Avatar name={u.username} size="sm" />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-medium text-[#0F172A]">{u.username}</span>
                  {u.is_staff && <Badge tone="violet">{k("staff")}</Badge>}
                </span>
                <span className="block truncate text-xs text-[#64748B]" title={[[u.first_name, u.last_name].filter(Boolean).join(" "), u.email].filter(Boolean).join(" · ")}>{u.email}</span>
              </span>
            </span>
          ) },
          { header: k("roles"), cell: (u) => {
            const global = (u.roles || []).map(roleName).filter(Boolean);
            const company = u.company_memberships || [];
            if (!global.length && !company.length) return <span className="text-[#94A3B8]">—</span>;
            return (
              <span className="flex max-w-[230px] flex-wrap gap-1">
                {global.map((r) => <Badge key={r} tone={r === "admin" ? "rose" : "slate"}>{r}</Badge>)}
                {company.map((m) => <Badge key={m.id} tone={ROLE_TONE[m.role] || "slate"}><span className="max-w-[170px] truncate">{`${m.company_name}: ${t(`admin.companyRoles.${m.role}`)}`}</span></Badge>)}
              </span>
            );
          } },
          { header: k("active"), cell: (u) => <BooleanBadge value={u.is_active} /> },
        ]}
        fields={[
          { name: "username", label: k("username"), type: "text", required: true, excludeOnUpdate: true },
          { name: "email", label: k("email"), type: "email", required: true },
          { name: "first_name", label: k("firstName"), type: "text", required: true },
          { name: "last_name", label: k("lastName"), type: "text" },
          { name: "password", label: k("password"), type: "password", requiredOnCreate: true },
          { name: "is_active", label: k("active"), type: "boolean", defaultValue: true },
          { name: "is_staff", label: k("staff"), type: "boolean", hint: k("staffHint") },
          { name: "roles", label: k("platformRoles"), type: "select-resource", resource: "roles", multiple: true,
            labelAccessor: "name", valueAccessor: "id", hint: k("platformRolesHint"),
            optionFilter: (r) => PLATFORM_ROLES.includes(r.name) },
          { name: "company_id", label: k("company"), type: "select", options: companies, onlyOn: "create", hint: k("companyHint") },
          { name: "company_role", label: k("companyRole"), type: "select", defaultValue: "employee", onlyOn: "create",
            options: COMPANY_ROLES.map((r) => ({ value: r, label: t(`admin.companyRoles.${r}`) })) },
        ]}
        deleteConfirm={(u) => ({ entityName: `${u.username} (${u.email})`, confirmText: u.username, consequences: k("deleteConsequences") })}
        extraActions={(u) => (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); setMembershipsUser(u); }} aria-label={k("companyRolesAction")} title={k("companyRolesAction")} className={ICON_BTN}>
              <BuildingOffice2Icon className="h-4 w-4" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); setStatsUser(u); }} aria-label={k("statsAction")} title={k("statsAction")} className={ICON_BTN}>
              <ChartBarIcon className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <UserStatisticsDialog open={Boolean(statsUser)} handler={() => setStatsUser(null)} userId={statsUser?.id} userName={statsUser?.username} />

      {membershipsUser && (
        <CompanyMembershipsDialog user={membershipsUser} onClose={() => setMembershipsUser(null)} onChanged={() => setVersion((v) => v + 1)} />
      )}
    </>
  );
}

export default GlobalUsers;
