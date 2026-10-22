import { useCompanySizes, useIndustries } from "../platform-admin/PlatformAdminCompanies";
import React, { useEffect, useState, useCallback } from "react";
import {
  PlusIcon, XMarkIcon, UsersIcon, BuildingOfficeIcon, CheckCircleIcon,
  UserPlusIcon, ChevronDownIcon, InformationCircleIcon, Squares2X2Icon, UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import { companyApi, businessUnitApi, teamsApi } from "../../api/enterpriseApi";
import {
  Avatar, BTN_PRIMARY, BTN_SECONDARY, Badge, Card, CardHeader, DotMenu, EmptyBlock, FOCUS, Field,
  Modal as KitModal, PageHeader, ROLE_TONE, SelectInput, Segmented, SkeletonRows, TONE, TextArea, TextInput,
} from "../../components/ui/kit";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES        = ["admin", "manager", "trainer", "employee", "auditor"];
const PLATFORM_ROLES   = ["owner", "admin", "manager", "trainer", "employee", "auditor"];
const STAGES = ["candidate", "onboarding", "trainee", "active_employee", "contractor", "former_employee"];

const STATUS_TONE = { active: "emerald", suspended: "amber", removed: "slate" };

function useStageLabels() {
  const { t } = useLanguage();
  return {
    candidate: t("enterprise.settings.company.stages.candidate"),
    onboarding: t("enterprise.settings.company.stages.onboarding"),
    trainee: t("enterprise.settings.company.stages.trainee"),
    active_employee: t("enterprise.settings.company.stages.activeEmployee"),
    contractor: t("enterprise.settings.company.stages.contractor"),
    former_employee: t("enterprise.settings.company.stages.formerEmployee"),
  };
}

function useRoleLabel() {
  const { t } = useLanguage();
  return (role) => (ROLE_TONE[role] ? t(`enterprise.roles.${role}`) : role);
}

function RolePill({ role }) {
  const label = useRoleLabel();
  return <Badge tone={ROLE_TONE[role] || "slate"}>{label(role)}</Badge>;
}

function StatusPill({ status }) {
  const { t } = useLanguage();
  const labels = {
    active: t("enterprise.settings.company.status.active"),
    suspended: t("enterprise.settings.company.status.suspended"),
    removed: t("enterprise.settings.company.status.removed"),
  };
  return <Badge tone={STATUS_TONE[status] || "slate"} dot>{labels[status] || status}</Badge>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldInput({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <Field label={label} required={required}>
      <TextInput type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} />
    </Field>
  );
}

function FieldSelect({ label, value, onChange, children, required }) {
  return (
    <Field label={label} required={required}>
      <SelectInput value={value} onChange={(e) => onChange(e.target.value)}>{children}</SelectInput>
    </Field>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <Field label={label}>
      <TextArea rows={rows} value={value} onChange={onChange} placeholder={placeholder} />
    </Field>
  );
}

function Modal({ title, onClose, children, width = 420 }) {
  return <KitModal title={title} onClose={onClose} width={width > 420 ? "max-w-lg" : "max-w-md"}>{children}</KitModal>;
}

function FilterChip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`inline-flex h-9 cursor-pointer items-center whitespace-nowrap rounded-full border px-3.5 text-sm transition-colors duration-150 ${FOCUS} ${
        active ? "border-[#4F46E5] bg-[#4F46E5] font-semibold text-white" : "border-[#E2E8F0] bg-white font-medium text-[#475569] hover:bg-[#F8FAFC]"}`}>
      {label}
    </button>
  );
}

function FormError({ children }) {
  return <p className="rounded-lg border border-[#FECDD3] bg-[#FFF1F2] px-3 py-2 text-sm text-[#BE123C]">{children}</p>;
}

function ModalActions({ children }) {
  return <div className="flex flex-col-reverse gap-2 border-t border-[#F1F5F9] pt-4 sm:flex-row sm:justify-end">{children}</div>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Company Info
// ═══════════════════════════════════════════════════════════════════════════════

function InfoTab({ company, companyId }) {
  const { t } = useLanguage();
  const { refresh } = useEnterprise();
  const [form, setForm] = useState({ name: "", website: "", industry: "", company_size: "", description: "" });
  const INDUSTRIES = useIndustries();
  const SIZES = useCompanySizes();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (company) setForm({ name: company.name || "", website: company.website || "", industry: company.industry || "", company_size: company.company_size || "", description: company.description || "" });
  }, [company]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess(false);
    try {
      await companyApi.updateCompany(companyId, form);
      setSuccess(true); await refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err?.detail || err?.name?.[0] || t("enterprise.settings.company.info.saveError"));
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader icon={BuildingOfficeIcon} title={t("enterprise.settings.company.info.sectionTitle")} subtitle={t("enterprise.settings.company.info.sectionHint")} />
      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 md:grid-cols-2 md:gap-5">
          <FieldInput label={t("enterprise.settings.company.info.nameLabel")} value={form.name} onChange={set("name")} required />
          <FieldInput label={t("enterprise.settings.company.info.websiteLabel")} value={form.website} onChange={set("website")} placeholder="https://…" />
          {/* 18: Industry / Size are enum keys ("healthcare", "11_50"): choose them from translated options. */}
          <FieldSelect label={t("enterprise.settings.company.info.industryLabel")} value={form.industry} onChange={(v) => setForm((f) => ({ ...f, industry: v }))}>
            <option value="">—</option>
            {INDUSTRIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            {form.industry && !INDUSTRIES.some((o) => o.value === form.industry) && <option value={form.industry}>{form.industry}</option>}
          </FieldSelect>
          <FieldSelect label={t("enterprise.settings.company.info.sizeLabel")} value={form.company_size} onChange={(v) => setForm((f) => ({ ...f, company_size: v }))}>
            <option value="">{t("enterprise.settings.company.info.sizePlaceholder")}</option>
            {SIZES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            {form.company_size && !SIZES.some((o) => o.value === form.company_size) && <option value={form.company_size}>{form.company_size}</option>}
          </FieldSelect>
          <div className="md:col-span-2">
            <FieldTextarea label={t("enterprise.settings.company.info.descriptionLabel")} value={form.description} onChange={set("description")} rows={4} />
          </div>
          {error && <div className="md:col-span-2"><FormError>{error}</FormError></div>}
        </div>
        <div className="flex flex-col gap-3 border-t border-[#F1F5F9] bg-[#F8FAFC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 rounded-b-xl">
          <div className="min-h-[20px]">
            {success && (
              <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[#047857]">
                <CheckCircleIcon className="h-4 w-4" /> {t("enterprise.settings.company.info.saved")}
              </p>
            )}
          </div>
          <button type="submit" disabled={saving} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
            {saving ? t("enterprise.settings.company.info.saving") : t("enterprise.settings.company.info.save")}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Members
// ═══════════════════════════════════════════════════════════════════════════════

function AddMemberModal({ companyId, availableRoles, onAdded, onClose }) {
  const { t } = useLanguage();
  const roleLabel = useRoleLabel();
  const [form, setForm] = useState({ email: "", role: "employee", employee_stage: "onboarding" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const STAGE_LABELS = useStageLabels();

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await companyApi.addUser(companyId, form);
      onAdded();
      onClose();
    } catch (err) {
      setError(err?.email?.[0] || err?.non_field_errors?.[0] || err?.detail || t("enterprise.settings.company.members.addError"));
    } finally { setSaving(false); }
  };

  return (
    <Modal title={t("enterprise.settings.company.members.addModal.title")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput label="Email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="juan@empresa.com" required />
        <p className="-mt-1 text-xs text-[#64748B]">{t("enterprise.settings.company.members.addModal.hint")}</p>
        <FieldSelect label={t("enterprise.settings.company.members.addModal.roleLabel")} value={form.role} onChange={set("role")} required>
          {availableRoles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </FieldSelect>
        <FieldSelect label={t("enterprise.settings.company.members.addModal.stageLabel")} value={form.employee_stage} onChange={set("employee_stage")} required>
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </FieldSelect>
        {error && <FormError>{error}</FormError>}
        <ModalActions>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>{t("enterprise.compliance.programs.cancel")}</button>
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving ? t("enterprise.settings.company.members.adding") : <><UserPlusIcon className="h-3.5 w-3.5" /> {t("enterprise.settings.company.members.add")}</>}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function ChangeRoleModal({ member, companyId, availableRoles, onChanged, onClose }) {
  const { t } = useLanguage();
  const roleLabel = useRoleLabel();
  const [role, setRole] = useState(member.role === "owner" ? availableRoles[0] : member.role);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await companyApi.changeMemberRole(companyId, { membership_id: member.id, role });
      onChanged();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal title={t("enterprise.settings.company.members.changeRoleModal.title")} onClose={onClose} width={360}>
      <div className="space-y-4">
        <div className="space-y-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-sm text-[#475569]">
          <p>{t("enterprise.settings.company.members.changeRoleModal.member")} <span className="font-semibold text-[#0F172A]">{member.full_name || member.username || member.email}</span></p>
          <p className="flex items-center gap-2">{t("enterprise.settings.company.members.changeRoleModal.currentRole")} <RolePill role={member.role} /></p>
        </div>
        <FieldSelect label={t("enterprise.settings.company.members.changeRoleModal.newRole")} value={role} onChange={setRole}>
          {availableRoles.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </FieldSelect>
        <ModalActions>
          <button onClick={onClose} className={BTN_SECONDARY}>{t("enterprise.compliance.programs.cancel")}</button>
          <button onClick={handleSave} disabled={saving} className={BTN_PRIMARY}>
            {saving ? t("enterprise.settings.company.info.saving") : t("enterprise.settings.company.members.changeRoleModal.save")}
          </button>
        </ModalActions>
      </div>
    </Modal>
  );
}

function MembersTab({ companyId }) {
  const { t } = useLanguage();
  const { isPlatformAdmin, role: myRole } = useEnterprise();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [modal, setModal] = useState(null); // "add" | {type:"role",member}
  const [resendMsg, setResendMsg] = useState(null); // {type:"ok"|"error", text}
  const STAGE_LABELS = useStageLabels();

  const canManage = ["owner", "admin"].includes(myRole) || isPlatformAdmin;
  const availableRoles = isPlatformAdmin ? PLATFORM_ROLES.filter((r) => r !== "owner") : ALL_ROLES;

  const load = useCallback(() => {
    setLoading(true);
    const params = statusFilter === "all" ? { status: "all" } : { status: statusFilter };
    companyApi.getMembers(companyId, params)
      .then((d) => setMembers(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (member) => {
    if (!confirm(t("enterprise.settings.company.members.confirmRemove", { name: member.full_name || member.email }))) return;
    try { await companyApi.removeMember(companyId, { membership_id: member.id }); load(); } catch {}
  };

  const handleResendWelcome = async (member) => {
    try {
      await companyApi.resendWelcome(companyId, { membership_id: member.id });
      setResendMsg({ type: "ok", text: t("enterprise.settings.company.members.welcomeResent", { name: member.full_name || member.email }) });
    } catch (err) {
      setResendMsg({ type: "error", text: err?.response?.data?.membership_id || t("enterprise.settings.company.members.resendError") });
    } finally {
      setTimeout(() => setResendMsg(null), 4000);
    }
  };

  const memberMenu = (m) => [
    { label: t("enterprise.settings.company.members.menu.changeRole"), action: () => setModal({ type: "role", member: m }) },
    ...(m.status === "active" ? [{ label: t("enterprise.settings.company.members.menu.resendWelcome"), action: () => handleResendWelcome(m) }] : []),
    ...(m.status !== "removed" ? [{ label: t("enterprise.settings.company.members.menu.remove"), danger: true, action: () => handleRemove(m) }] : []),
  ];

  const columns = [
    t("enterprise.settings.company.members.columns.name"),
    t("enterprise.settings.company.members.columns.email"),
    t("enterprise.settings.company.members.columns.role"),
    t("enterprise.settings.company.members.columns.stage"),
    t("enterprise.settings.company.members.columns.status"),
    "",
  ];

  return (
    <div className="space-y-4">
      {modal === "add" && (
        <AddMemberModal companyId={companyId} availableRoles={availableRoles} onAdded={load} onClose={() => setModal(null)} />
      )}
      {modal?.type === "role" && (
        <ChangeRoleModal member={modal.member} companyId={companyId} availableRoles={availableRoles} onChanged={load} onClose={() => setModal(null)} />
      )}

      {resendMsg && (
        <p role="status" className={`rounded-lg border px-3.5 py-2.5 text-sm ${resendMsg.type === "ok" ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]" : "border-[#FECDD3] bg-[#FFF1F2] text-[#BE123C]"}`}>
          {resendMsg.text}
        </p>
      )}

      <Card>
        <CardHeader
          icon={UserGroupIcon}
          title={t("enterprise.settings.company.tabs.members")}
          subtitle={!loading ? t("enterprise.settings.company.members.count", { count: members.length, plural: members.length !== 1 ? "s" : "" }) : undefined}
          actions={canManage && (
            <button type="button" onClick={() => setModal("add")} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
              <UserPlusIcon className="h-4 w-4" /> {t("enterprise.settings.company.members.addMember")}
            </button>
          )}
        />
        <div className="flex gap-2 overflow-x-auto border-b border-[#F1F5F9] px-4 py-3 sm:px-6">
          <FilterChip label={t("enterprise.settings.company.members.filters.active")} active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
          <FilterChip label={t("enterprise.settings.company.members.filters.removed")} active={statusFilter === "removed"} onClick={() => setStatusFilter("removed")} />
          <FilterChip label={t("enterprise.settings.company.members.filters.all")} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        </div>

        {loading ? (
          <SkeletonRows rows={3} />
        ) : members.length === 0 ? (
          <EmptyBlock icon={UsersIcon} title={t("enterprise.settings.company.members.empty")} />
        ) : (
          <>
            {/* Phones: one card per member */}
            <ul className="divide-y divide-[#F1F5F9] md:hidden">
              {members.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-4 py-4">
                  <Avatar name={m.full_name || m.username || m.email} tone={ROLE_TONE[m.role] || "indigo"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#0F172A]">{m.full_name || m.username || "—"}</p>
                    <p className="break-all text-xs text-[#64748B]">{m.email || "—"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <RolePill role={m.role} />
                      <StatusPill status={m.status} />
                      {STAGE_LABELS[m.employee_stage] && <Badge tone="slate">{STAGE_LABELS[m.employee_stage]}</Badge>}
                    </div>
                  </div>
                  {canManage && m.role !== "owner" && <DotMenu items={memberMenu(m)} />}
                </li>
              ))}
            </ul>

            {/* md and up: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {columns.map((h, i) => (
                      <th key={i} scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[#64748B]">
                        {h || <span className="sr-only">{t("enterprise.invitations.columns.actions")}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {members.map((m) => (
                    <tr key={m.id} className="transition-colors duration-150 hover:bg-[#F8FAFC]">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={m.full_name || m.username || m.email} tone={ROLE_TONE[m.role] || "indigo"} size="sm" />
                          <span className="font-medium text-[#0F172A]">{m.full_name || m.username || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-[#64748B]">{m.email || "—"}</td>
                      <td className="px-6 py-3.5"><RolePill role={m.role} /></td>
                      <td className="px-6 py-3.5 text-[#64748B]">{STAGE_LABELS[m.employee_stage] || "—"}</td>
                      <td className="px-6 py-3.5"><StatusPill status={m.status} /></td>
                      <td className="px-6 py-3.5 text-right">
                        {canManage && m.role !== "owner" && <div className="flex justify-end"><DotMenu items={memberMenu(m)} /></div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Business Units
// ═══════════════════════════════════════════════════════════════════════════════

function BUModal({ companyId, bu, members, onSaved, onClose }) {
  const { t } = useLanguage();
  const editing = !!bu;
  const [form, setForm] = useState({ name: bu?.name || "", code: bu?.code || "", description: bu?.description || "", manager: bu?.manager || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return;
    setSaving(true); setError("");
    try {
      const payload = { name: form.name.trim(), code: form.code.trim().toUpperCase(), description: form.description.trim(), manager: form.manager || null };
      if (editing) await businessUnitApi.update(bu.id, payload);
      else await businessUnitApi.create({ ...payload, company: companyId });
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.code?.[0] || err?.name?.[0] || err?.detail || t("enterprise.settings.company.units.saveError"));
    } finally { setSaving(false); }
  };

  return (
    <Modal title={editing ? t("enterprise.settings.company.units.editModal.title") : t("enterprise.settings.company.units.editModal.newTitle")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FieldInput label={t("enterprise.settings.company.units.editModal.nameLabel")} value={form.name} onChange={(e) => set("name")(e.target.value)} required />
          <FieldInput label={t("enterprise.settings.company.units.editModal.codeLabel")} value={form.code} onChange={(e) => set("code")(e.target.value.toUpperCase())} placeholder="COM" required />
        </div>
        <FieldTextarea label={t("enterprise.settings.company.info.descriptionLabel")} value={form.description} onChange={(e) => set("description")(e.target.value)} />
        <FieldSelect label={t("enterprise.settings.company.units.editModal.managerLabel")} value={form.manager} onChange={set("manager")}>
          <option value="">{t("enterprise.settings.company.units.editModal.noManager")}</option>
          {members.filter((m) => m.status === "active").map((m) => (
            <option key={m.user} value={m.user}>{m.full_name || m.username} ({m.role})</option>
          ))}
        </FieldSelect>
        {error && <FormError>{error}</FormError>}
        <ModalActions>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>{t("enterprise.compliance.programs.cancel")}</button>
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving ? t("enterprise.settings.company.info.saving") : editing ? t("enterprise.settings.company.info.save") : t("enterprise.settings.company.units.create")}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function BusinessUnitsTab({ companyId }) {
  const { t, language } = useLanguage();
  const { role: myRole, isPlatformAdmin } = useEnterprise();
  const [units, setUnits] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "create" | bu (for edit)

  const canManage = ["owner", "admin"].includes(myRole) || isPlatformAdmin;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      businessUnitApi.list({ company_id: companyId }).then((d) => d.results || d || []),
      companyApi.getMembers(companyId, { status: "active" }).then((d) => d.results || d || []),
    ]).then(([u, m]) => { setUnits(u); setMembers(m); }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (bu) => {
    if (!confirm(t("enterprise.settings.company.units.confirmDelete", { name: bu.name }))) return;
    try { await businessUnitApi.remove(bu.id); load(); } catch {}
  };

  return (
    <div className="space-y-4">
      {modal && (
        <BUModal companyId={companyId} bu={modal === "create" ? null : modal} members={members} onSaved={load} onClose={() => setModal(null)} />
      )}
      <Card>
        <CardHeader
          icon={Squares2X2Icon}
          title={t("enterprise.settings.company.tabs.units")}
          subtitle={!loading ? t("enterprise.settings.company.units.count", { count: units.length, plural: units.length !== 1 ? (language === "es" ? "es" : "s") : "" }) : undefined}
          actions={canManage && units.length > 0 && (
            <button type="button" onClick={() => setModal("create")} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
              <PlusIcon className="h-4 w-4" /> {t("enterprise.settings.company.units.newUnit")}
            </button>
          )}
        />
        {loading ? (
          <SkeletonRows rows={2} height="h-16" />
        ) : units.length === 0 ? (
          <EmptyBlock
            icon={BuildingOfficeIcon}
            title={t("enterprise.settings.company.units.empty")}
            action={canManage && (
              <button type="button" onClick={() => setModal("create")} className={BTN_PRIMARY}>
                <PlusIcon className="h-4 w-4" /> {t("enterprise.settings.company.units.newUnit")}
              </button>
            )}
          />
        ) : (
          <ul className="divide-y divide-[#F1F5F9]">
            {units.map((bu) => (
              <li key={bu.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-10 min-w-[2.75rem] shrink-0 place-items-center rounded-lg px-2 text-xs font-bold tracking-wide ${TONE.indigo.icon}`}>
                    {bu.code}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#0F172A]">{bu.name}</p>
                    <p className="truncate text-xs text-[#64748B]">
                      {t("enterprise.settings.company.units.teamCount", { count: bu.team_count ?? 0, plural: bu.team_count !== 1 ? "s" : "" })}
                      {bu.manager_username ? ` · ${t("enterprise.settings.company.units.managerSuffix", { name: bu.manager_username })}` : ""}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <DotMenu items={[
                    { label: t("enterprise.settings.company.units.menu.edit"), action: () => setModal(bu) },
                    { label: t("enterprise.settings.company.units.menu.delete"), danger: true, action: () => handleDelete(bu) },
                  ]} />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Teams
// ═══════════════════════════════════════════════════════════════════════════════

function TeamModal({ companyId, team, members, units, onSaved, onClose }) {
  const { t } = useLanguage();
  const editing = !!team;
  const [form, setForm] = useState({ name: team?.name || "", description: team?.description || "", business_unit: team?.business_unit || "", manager: team?.manager || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true); setError("");
    try {
      const payload = { name: form.name.trim(), description: form.description.trim(), business_unit: form.business_unit || null, manager: form.manager || null };
      if (editing) await teamsApi.update(team.id, payload);
      else await teamsApi.create({ ...payload, company: companyId });
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.name?.[0] || err?.detail || t("enterprise.settings.company.units.saveError"));
    } finally { setSaving(false); }
  };

  return (
    <Modal title={editing ? t("enterprise.settings.company.teams.editModal.title") : t("enterprise.settings.company.teams.editModal.newTitle")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldInput label={t("enterprise.settings.company.units.editModal.nameLabel")} value={form.name} onChange={(e) => set("name")(e.target.value)} required />
        <FieldSelect label={t("enterprise.settings.company.teams.editModal.buLabel")} value={form.business_unit} onChange={set("business_unit")}>
          <option value="">{t("enterprise.settings.company.teams.editModal.noUnit")}</option>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.code})</option>)}
        </FieldSelect>
        <FieldSelect label={t("enterprise.settings.company.units.editModal.managerLabel")} value={form.manager} onChange={set("manager")}>
          <option value="">{t("enterprise.settings.company.units.editModal.noManager")}</option>
          {members.filter((m) => m.status === "active").map((m) => (
            <option key={m.user} value={m.user}>{m.full_name || m.username} ({m.role})</option>
          ))}
        </FieldSelect>
        <FieldTextarea label={t("enterprise.settings.company.info.descriptionLabel")} value={form.description} onChange={(e) => set("description")(e.target.value)} />
        {error && <FormError>{error}</FormError>}
        <ModalActions>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>{t("enterprise.compliance.programs.cancel")}</button>
          <button type="submit" disabled={saving} className={BTN_PRIMARY}>
            {saving ? t("enterprise.settings.company.info.saving") : editing ? t("enterprise.settings.company.members.changeRoleModal.save") : t("enterprise.settings.company.teams.createTeam")}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function AddTeamMemberModal({ team, companyMembers, currentMemberIds, onAdded, onClose }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [role, setRole] = useState("member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const available = companyMembers.filter((m) =>
    m.status === "active" && !currentMemberIds.includes(m.user) &&
    (!search || (m.full_name || m.username || m.email || "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async () => {
    if (!selectedUser) return;
    setSaving(true); setError("");
    try {
      await teamsApi.addMember(team.id, { user_id: selectedUser.user, role });
      onAdded();
      onClose();
    } catch (err) {
      setError(err?.detail || err?.non_field_errors?.[0] || t("enterprise.settings.company.teams.addMemberError"));
    } finally { setSaving(false); }
  };

  return (
    <Modal title={t("enterprise.settings.company.teams.addMemberModal.title", { name: team.name })} onClose={onClose}>
      <div className="space-y-4">
        <TextInput placeholder={t("enterprise.settings.company.teams.addMemberModal.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {available.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#64748B]">{t("enterprise.settings.company.teams.addMemberModal.noneAvailable")}</p>
          ) : available.map((m) => {
            const selected = selectedUser?.user === m.user;
            return (
              <button key={m.user} type="button" onClick={() => setSelectedUser(selected ? null : m)} aria-pressed={selected}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ${FOCUS} ${
                  selected ? "border-[#6366F1] bg-[#EEF2FF]" : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"}`}>
                <Avatar name={m.full_name || m.username} tone={ROLE_TONE[m.role] || "indigo"} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#0F172A]">{m.full_name || m.username}</span>
                  <span className="block truncate text-xs text-[#64748B]">{m.email}</span>
                </span>
                <RolePill role={m.role} />
              </button>
            );
          })}
        </div>
        {selectedUser && (
          <FieldSelect label={t("enterprise.settings.company.teams.addMemberModal.teamRole")} value={role} onChange={setRole}>
            <option value="member">{t("enterprise.settings.company.teams.memberRole")}</option>
            <option value="manager">{t("enterprise.roles.manager")}</option>
          </FieldSelect>
        )}
        {error && <FormError>{error}</FormError>}
        <ModalActions>
          <button onClick={onClose} className={BTN_SECONDARY}>{t("enterprise.compliance.programs.cancel")}</button>
          <button onClick={handleAdd} disabled={!selectedUser || saving} className={BTN_PRIMARY}>
            {saving ? t("enterprise.settings.company.members.adding") : t("enterprise.settings.company.members.add")}
          </button>
        </ModalActions>
      </div>
    </Modal>
  );
}

function TeamMembersPanel({ team, companyMembers, onClose }) {
  const { t } = useLanguage();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    teamsApi.getMembers(team.id)
      .then((d) => setMembers(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [team.id]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (userId) => {
    try { await teamsApi.removeMember(team.id, { user_id: userId }); load(); } catch {}
  };

  return (
    <div className="border-t border-[#F1F5F9] bg-[#F8FAFC] px-4 py-4 sm:px-6">
      {showAdd && (
        <AddTeamMemberModal
          team={team}
          companyMembers={companyMembers}
          currentMemberIds={members.map((m) => m.user)}
          onAdded={() => { setShowAdd(false); load(); }}
          onClose={() => setShowAdd(false)} />
      )}
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
          {t("enterprise.settings.company.teams.membersHeading", { count: members.length })}
        </p>
        <button type="button" onClick={() => setShowAdd(true)} className={BTN_SECONDARY}>
          <PlusIcon className="h-4 w-4" /> {t("enterprise.settings.company.members.add")}
        </button>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white" />)}
        </div>
      ) : members.length === 0 ? (
        <p className="py-3 text-center text-sm text-[#64748B]">{t("enterprise.settings.company.teams.noMembersYet")}</p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={m.full_name || m.username} tone={m.role === "manager" ? "sky" : "indigo"} size="sm" />
                <p className="truncate text-sm font-medium text-[#0F172A]">{m.full_name || m.username}</p>
                <Badge tone={m.role === "manager" ? "sky" : "slate"}>{m.role === "manager" ? t("enterprise.roles.manager") : t("enterprise.settings.company.teams.memberRole")}</Badge>
              </div>
              <button type="button" onClick={() => handleRemove(m.user)} aria-label={t("enterprise.settings.company.members.menu.remove")}
                className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[#94A3B8] transition-colors hover:bg-[#FFF1F2] hover:text-[#E11D48] ${FOCUS}`}>
                <XMarkIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TeamsTab({ companyId }) {
  const { t } = useLanguage();
  const { role: myRole, isPlatformAdmin } = useEnterprise();
  const [teams, setTeams] = useState([]);
  const [companyMembers, setCompanyMembers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buFilter, setBuFilter] = useState("");
  const [modal, setModal] = useState(null);     // null | "create" | team (edit)
  const [expanded, setExpanded] = useState(null); // team id with members open

  const canManage = ["owner", "admin", "manager"].includes(myRole) || isPlatformAdmin;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      teamsApi.list({ company_id: companyId }).then((d) => d.results || d || []),
      companyApi.getMembers(companyId, { status: "active" }).then((d) => d.results || d || []),
      businessUnitApi.list({ company_id: companyId }).then((d) => d.results || d || []),
    ]).then(([tms, m, u]) => { setTeams(tms); setCompanyMembers(m); setUnits(u); }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (team) => {
    if (!confirm(t("enterprise.settings.company.teams.confirmDelete", { name: team.name }))) return;
    try { await teamsApi.remove(team.id); load(); } catch {}
  };

  const filtered = buFilter ? teams.filter((tm) => String(tm.business_unit) === buFilter) : teams;

  return (
    <div className="space-y-4">
      {modal && (
        <TeamModal companyId={companyId} team={modal === "create" ? null : modal}
          members={companyMembers} units={units} onSaved={load} onClose={() => setModal(null)} />
      )}

      <Card>
        <CardHeader
          icon={UsersIcon}
          title={t("enterprise.settings.company.tabs.teams")}
          subtitle={!loading ? t("enterprise.settings.company.teams.count", { count: filtered.length, plural: filtered.length !== 1 ? "s" : "" }) : undefined}
          actions={canManage && (
            <button type="button" onClick={() => setModal("create")} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
              <PlusIcon className="h-4 w-4" /> {t("enterprise.settings.company.teams.newTeam")}
            </button>
          )}
        />
        {units.length > 0 && (
          <div className="flex gap-2 overflow-x-auto border-b border-[#F1F5F9] px-4 py-3 sm:px-6">
            <FilterChip label={t("enterprise.settings.company.members.filters.all")} active={buFilter === ""} onClick={() => setBuFilter("")} />
            {units.map((u) => (
              <FilterChip key={u.id} label={u.name} active={buFilter === String(u.id)} onClick={() => setBuFilter(String(u.id))} />
            ))}
          </div>
        )}

        {loading ? (
          <SkeletonRows rows={3} height="h-16" />
        ) : filtered.length === 0 ? (
          <EmptyBlock
            icon={UsersIcon}
            title={t("enterprise.settings.company.teams.empty")}
            action={canManage && (
              <button type="button" onClick={() => setModal("create")} className={BTN_PRIMARY}>
                <PlusIcon className="h-4 w-4" /> {t("enterprise.settings.company.teams.newTeam")}
              </button>
            )}
          />
        ) : (
          <ul className="divide-y divide-[#F1F5F9]">
            {filtered.map((team) => {
              const open = expanded === team.id;
              return (
                <li key={team.id}>
                  <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${TONE.sky.icon}`}><UsersIcon className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0F172A]">{team.name}</p>
                        <p className="text-xs text-[#64748B]">
                          {t("enterprise.settings.company.teams.memberCount", { count: team.member_count ?? 0, plural: team.member_count !== 1 ? "s" : "" })}
                          {team.business_unit_name ? ` · ${t("enterprise.settings.company.teams.buSuffix", { name: team.business_unit_name })}` : ""}
                          {team.manager_username ? ` · ${t("enterprise.settings.company.units.managerSuffix", { name: team.manager_username })}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => setExpanded(open ? null : team.id)} aria-expanded={open}
                        aria-label={open ? t("enterprise.settings.company.teams.hide") : t("enterprise.settings.company.teams.members")}
                        className={`inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 sm:h-9 ${FOCUS} ${
                          open ? "border-[#C7D2FE] bg-[#EEF2FF] text-[#4338CA]" : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"}`}>
                        <span className="hidden sm:inline">{open ? t("enterprise.settings.company.teams.hide") : t("enterprise.settings.company.teams.members")}</span>
                        <UsersIcon className="h-4 w-4 sm:hidden" />
                        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
                      </button>
                      {canManage && (
                        <DotMenu items={[
                          { label: t("enterprise.settings.company.units.menu.edit"), action: () => setModal(team) },
                          { label: t("enterprise.settings.company.units.menu.delete"), danger: true, action: () => handleDelete(team) },
                        ]} />
                      )}
                    </div>
                  </div>
                  {open && <TeamMembersPanel team={team} companyMembers={companyMembers} onClose={() => setExpanded(null)} />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function CompanySettings() {
  const { t } = useLanguage();
  const { activeCompanyId, activeCompany, role: myRole, isPlatformAdmin } = useEnterprise();
  const [activeTab, setActiveTab] = useState("info");
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (!activeCompanyId) return;
    companyApi.getCompany(activeCompanyId).then(setCompany).catch(() => {});
  }, [activeCompanyId]);

  if (!activeCompanyId) {
    return (
      <Card className="mx-auto max-w-lg"><EmptyBlock icon={BuildingOfficeIcon} title={t("enterprise.settings.company.noCompanySelected")} /></Card>
    );
  }

  const canViewMembers = ["owner", "admin", "manager"].includes(myRole) || isPlatformAdmin;
  const canViewTeams   = ["owner", "admin", "manager"].includes(myRole) || isPlatformAdmin;
  const canViewBU      = ["owner", "admin", "manager"].includes(myRole) || isPlatformAdmin;

  const tabs = [
    { id: "info",    label: t("enterprise.settings.company.tabs.info") },
    ...(canViewBU      ? [{ id: "units",   label: t("enterprise.settings.company.tabs.units") }] : []),
    ...(canViewTeams   ? [{ id: "teams",   label: t("enterprise.settings.company.tabs.teams") }] : []),
    ...(canViewMembers ? [{ id: "members", label: t("enterprise.settings.company.tabs.members") }] : []),
  ];

  const tabIcons = { info: InformationCircleIcon, units: Squares2X2Icon, teams: UsersIcon, members: UserGroupIcon };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6 md:py-2">
      <PageHeader
        title={t("enterprise.settings.company.title")}
        subtitle={`${company?.name || activeCompany?.company_name || t("enterprise.settings.company.yourCompany")} · ID: ${activeCompanyId}`}
      />

      <Segmented
        ariaLabel={t("enterprise.settings.company.title")}
        value={activeTab}
        onChange={setActiveTab}
        items={tabs.map(({ id, label }) => ({ value: id, label, icon: tabIcons[id] }))}
      />

      <div>
        {activeTab === "info"    && <InfoTab company={company} companyId={activeCompanyId} />}
        {activeTab === "members" && canViewMembers && <MembersTab companyId={activeCompanyId} />}
        {activeTab === "teams"   && canViewTeams   && <TeamsTab companyId={activeCompanyId} />}
        {activeTab === "units"   && canViewBU      && <BusinessUnitsTab companyId={activeCompanyId} />}
      </div>
    </div>
  );
}

export default CompanySettings;
