import { useCompanySizes, useIndustries } from "../platform-admin/PlatformAdminCompanies";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  PlusIcon, XMarkIcon, EllipsisHorizontalIcon, TrashIcon,
  PencilIcon, UsersIcon, BuildingOfficeIcon, CheckCircleIcon,
  UserPlusIcon, ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import { companyApi, businessUnitApi, teamsApi } from "../../api/enterpriseApi";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES        = ["admin", "manager", "trainer", "employee", "auditor"];
const PLATFORM_ROLES   = ["owner", "admin", "manager", "trainer", "employee", "auditor"];
const STAGES = ["candidate", "onboarding", "trainee", "active_employee", "contractor", "former_employee"];

const ROLE_COLORS = {
  owner:    { bg: "rgba(168,85,247,0.15)", text: "#a855f7" },
  admin:    { bg: "rgba(239,68,68,0.12)",  text: "#f87171" },
  manager:  { bg: "rgba(59,130,246,0.12)", text: "#60a5fa" },
  trainer:  { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  employee: { bg: "rgba(255,255,255,0.07)","text": "#8B8B9C" },
  auditor:  { bg: "rgba(245,158,11,0.12)", text: "#fbbf24" },
};

const STATUS_COLORS = {
  active:    { bg: "rgba(74,222,128,0.12)",  text: "#4ade80"  },
  suspended: { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b"  },
  removed:   { bg: "rgba(255,255,255,0.07)", text: "#8B8B9C" },
};

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

function RolePill({ role }) {
  const c = ROLE_COLORS[role] || { bg: "var(--bg-elevated)", text: "var(--text-secondary)" };
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "capitalize" }}>
      {role}
    </span>
  );
}

function StatusPill({ status }) {
  const { t } = useLanguage();
  const c = STATUS_COLORS[status] || STATUS_COLORS.removed;
  const labels = {
    active: t("enterprise.settings.company.status.active"),
    suspended: t("enterprise.settings.company.status.suspended"),
    removed: t("enterprise.settings.company.status.removed"),
  };
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
      {labels[status] || status}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FieldInput({ label, value, onChange, placeholder, type = "text", required }) {
  return (
    <div>
      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 12, marginBottom: 5 }}>
        {label}{required && " *"}
      </p>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 11px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
        onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }} />
    </div>
  );
}

function FieldSelect({ label, value, onChange, children, required }) {
  return (
    <div>
      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 12, marginBottom: 5 }}>
        {label}{required && " *"}
      </p>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 11px", color: "var(--text-primary)", fontSize: 13, outline: "none", cursor: "pointer" }}>
        {children}
      </select>
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 2 }) {
  return (
    <div>
      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 12, marginBottom: 5 }}>{label}</p>
      <textarea rows={rows} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 11px", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "vertical" }}
        onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }} />
    </div>
  );
}

// ─── Dropdown Menu ────────────────────────────────────────────────────────────

function DotMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ padding: "4px 6px", borderRadius: 5, color: "var(--text-secondary)", cursor: "pointer", transition: "background 150ms" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        <EllipsisHorizontalIcon style={{ width: 16, height: 16 }} />
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "100%", zIndex: 40, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 7, minWidth: 160, boxShadow: "0 8px 24px var(--lt-rgba-0-0-0-0-4, rgba(0,0,0,0.4))", overflow: "hidden" }}>
          {items.map((item, i) => (
            <button key={i} onClick={() => { item.action(); setOpen(false); }}
              style={{ width: "100%", textAlign: "left", padding: "8px 14px", fontSize: 12.5, color: item.danger ? "var(--lt-f87171, #f87171)" : "var(--text-primary)", cursor: "pointer", transition: "background 150ms" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = item.danger ? "rgba(239,68,68,0.08)" : "var(--bg-elevated)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, width = 420 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--lt-rgba-0-0-0-0-65, rgba(0,0,0,0.65))", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, width: "100%", maxWidth: width, padding: 22, boxShadow: "0 20px 60px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5))" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{title}</p>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", background: active ? "var(--accent)" : "var(--bg-elevated)", color: active ? "#fff" : "var(--text-secondary)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, transition: "all 150ms" }}>
      {label}
    </button>
  );
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
    <form onSubmit={handleSave} className="space-y-4" style={{ maxWidth: 520 }}>
      <FieldInput label={t("enterprise.settings.company.info.nameLabel")} value={form.name} onChange={set("name")} required />
      <FieldInput label={t("enterprise.settings.company.info.websiteLabel")} value={form.website} onChange={set("website")} placeholder="https://…" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
      </div>
      <FieldTextarea label={t("enterprise.settings.company.info.descriptionLabel")} value={form.description} onChange={set("description")} rows={3} />
      {error && <p style={{ color: "var(--lt-f87171, #f87171)", fontSize: 12 }}>{error}</p>}
      {success && (
        <div className="flex items-center gap-2">
          <CheckCircleIcon style={{ width: 14, height: 14, color: "var(--lt-4ade80, #4ade80)" }} />
          <p style={{ color: "var(--lt-4ade80, #4ade80)", fontSize: 12, fontWeight: 600 }}>{t("enterprise.settings.company.info.saved")}</p>
        </div>
      )}
      <button type="submit" disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
        {saving ? t("enterprise.settings.company.info.saving") : t("enterprise.settings.company.info.save")}
      </button>
    </form>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Members
// ═══════════════════════════════════════════════════════════════════════════════

function AddMemberModal({ companyId, availableRoles, onAdded, onClose }) {
  const { t } = useLanguage();
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
      <form onSubmit={handleSubmit} className="space-y-3">
        <FieldInput label="Email" type="email" value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="juan@empresa.com" required />
        <p style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: -6 }}>
          {t("enterprise.settings.company.members.addModal.hint")}
        </p>
        <FieldSelect label={t("enterprise.settings.company.members.addModal.roleLabel")} value={form.role} onChange={set("role")} required>
          {availableRoles.map((r) => <option key={r} value={r} style={{ textTransform: "capitalize" }}>{r}</option>)}
        </FieldSelect>
        <FieldSelect label={t("enterprise.settings.company.members.addModal.stageLabel")} value={form.employee_stage} onChange={set("employee_stage")} required>
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </FieldSelect>
        {error && <p style={{ color: "var(--lt-f87171, #f87171)", fontSize: 12 }}>{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
          <button type="submit" disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
            {saving ? t("enterprise.settings.company.members.adding") : <><UserPlusIcon className="h-3.5 w-3.5" /> {t("enterprise.settings.company.members.add")}</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ChangeRoleModal({ member, companyId, availableRoles, onChanged, onClose }) {
  const { t } = useLanguage();
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
      <div className="space-y-3">
        <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>
          {t("enterprise.settings.company.members.changeRoleModal.member")} <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{member.full_name || member.username || member.email}</span>
          <br />{t("enterprise.settings.company.members.changeRoleModal.currentRole")} <RolePill role={member.role} />
        </p>
        <FieldSelect label={t("enterprise.settings.company.members.changeRoleModal.newRole")} value={role} onChange={setRole}>
          {availableRoles.map((r) => <option key={r} value={r} style={{ textTransform: "capitalize" }}>{r}</option>)}
        </FieldSelect>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
          <button onClick={handleSave} disabled={saving} className="ank-btn-accent text-xs">
            {saving ? t("enterprise.settings.company.info.saving") : t("enterprise.settings.company.members.changeRoleModal.save")}
          </button>
        </div>
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
        <div style={{
          background: resendMsg.type === "ok" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
          border: `1px solid ${resendMsg.type === "ok" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
          color: resendMsg.type === "ok" ? "var(--lt-4ade80, #4ade80)" : "var(--lt-f87171, #f87171)",
          borderRadius: 7, padding: "8px 12px", fontSize: 12.5,
        }}>
          {resendMsg.text}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterChip label={t("enterprise.settings.company.members.filters.active")} active={statusFilter === "active"} onClick={() => setStatusFilter("active")} />
          <FilterChip label={t("enterprise.settings.company.members.filters.removed")} active={statusFilter === "removed"} onClick={() => setStatusFilter("removed")} />
          <FilterChip label={t("enterprise.settings.company.members.filters.all")} active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
        </div>
        {canManage && (
          <button onClick={() => setModal("add")} className="ank-btn-accent text-xs">
            <UserPlusIcon className="h-3.5 w-3.5" /> {t("enterprise.settings.company.members.addMember")}
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 44, background: "var(--bg-elevated)", borderRadius: 6 }} className="animate-pulse" />)}
        </div>
      ) : members.length === 0 ? (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "40px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{t("enterprise.settings.company.members.empty")}</p>
        </div>
      ) : (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {columns.map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", background: "var(--bg-elevated)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {m.full_name || m.username || "—"}
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 12, color: "var(--text-secondary)" }}>{m.email || "—"}</td>
                  <td style={{ padding: "10px 14px" }}><RolePill role={m.role} /></td>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-tertiary)" }}>
                    {STAGE_LABELS[m.employee_stage] || "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}><StatusPill status={m.status} /></td>
                  <td style={{ padding: "10px 14px" }}>
                    {canManage && m.role !== "owner" && (
                      <DotMenu items={[
                        { label: t("enterprise.settings.company.members.menu.changeRole"), action: () => setModal({ type: "role", member: m }) },
                        ...(m.status === "active" ? [{ label: t("enterprise.settings.company.members.menu.resendWelcome"), action: () => handleResendWelcome(m) }] : []),
                        ...(m.status !== "removed" ? [{ label: t("enterprise.settings.company.members.menu.remove"), danger: true, action: () => handleRemove(m) }] : []),
                      ]} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
      {!loading && <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.settings.company.members.count", { count: members.length, plural: members.length !== 1 ? "s" : "" })}</p>}
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
      <form onSubmit={handleSubmit} className="space-y-3">
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
        {error && <p style={{ color: "var(--lt-f87171, #f87171)", fontSize: 12 }}>{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
          <button type="submit" disabled={saving} className="ank-btn-accent text-xs">
            {saving ? t("enterprise.settings.company.info.saving") : editing ? t("enterprise.settings.company.info.save") : t("enterprise.settings.company.units.create")}
          </button>
        </div>
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
      <div className="flex justify-between items-center">
        <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.settings.company.units.count", { count: units.length, plural: units.length !== 1 ? (language === "es" ? "es" : "s") : "" })}</p>
        {canManage && (
          <button onClick={() => setModal("create")} className="ank-btn-accent text-xs">
            <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.settings.company.units.newUnit")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} style={{ height: 56, background: "var(--bg-elevated)", borderRadius: 6 }} className="animate-pulse" />)}
        </div>
      ) : units.length === 0 ? (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "36px 24px", textAlign: "center" }}>
          <BuildingOfficeIcon style={{ width: 24, height: 24, color: "var(--text-tertiary)", margin: "0 auto 8px" }} />
          <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{t("enterprise.settings.company.units.empty")}</p>
          {canManage && (
            <button onClick={() => setModal("create")} className="ank-btn-accent text-xs mt-3">
              <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.settings.company.units.newUnit")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {units.map((bu) => (
            <div key={bu.id}
              style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 7, padding: "12px 16px" }}
              className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span style={{ background: "var(--bg-elevated)", color: "var(--accent)", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, flexShrink: 0, letterSpacing: "0.05em" }}>
                  {bu.code}
                </span>
                <div className="min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{bu.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
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
            </div>
          ))}
        </div>
      )}
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
      <form onSubmit={handleSubmit} className="space-y-3">
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
        {error && <p style={{ color: "var(--lt-f87171, #f87171)", fontSize: 12 }}>{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
          <button type="submit" disabled={saving} className="ank-btn-accent text-xs">
            {saving ? t("enterprise.settings.company.info.saving") : editing ? t("enterprise.settings.company.members.changeRoleModal.save") : t("enterprise.settings.company.teams.createTeam")}
          </button>
        </div>
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
      <div className="space-y-3">
        <input placeholder={t("enterprise.settings.company.teams.addMemberModal.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 11px", color: "var(--text-primary)", fontSize: 12, outline: "none" }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }} />
        <div style={{ maxHeight: 200, overflowY: "auto" }} className="space-y-1">
          {available.length === 0 ? (
            <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>
              {t("enterprise.settings.company.teams.addMemberModal.noneAvailable")}
            </p>
          ) : available.map((m) => (
            <button key={m.user} type="button" onClick={() => setSelectedUser(selectedUser?.user === m.user ? null : m)}
              style={{ width: "100%", textAlign: "left", background: selectedUser?.user === m.user ? "var(--bg-accent)" : "var(--bg-elevated)", border: `1px solid ${selectedUser?.user === m.user ? "var(--accent)" : "var(--border)"}`, borderRadius: 5, padding: "8px 11px", cursor: "pointer", transition: "all 150ms" }}>
              <div className="flex items-center gap-2">
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-muted)", color: "var(--accent)", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {(m.full_name || m.username || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)" }}>{m.full_name || m.username}</p>
                  <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{m.email}</p>
                </div>
                <RolePill role={m.role} />
              </div>
            </button>
          ))}
        </div>
        {selectedUser && (
          <FieldSelect label={t("enterprise.settings.company.teams.addMemberModal.teamRole")} value={role} onChange={setRole}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
          </FieldSelect>
        )}
        {error && <p style={{ color: "var(--lt-f87171, #f87171)", fontSize: 12 }}>{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
          <button onClick={handleAdd} disabled={!selectedUser || saving} className="ank-btn-accent text-xs" style={{ opacity: !selectedUser || saving ? 0.6 : 1 }}>
            {saving ? t("enterprise.settings.company.members.adding") : t("enterprise.settings.company.members.add")}
          </button>
        </div>
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
    <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-elevated)", padding: "14px 16px" }}>
      {showAdd && (
        <AddTeamMemberModal
          team={team}
          companyMembers={companyMembers}
          currentMemberIds={members.map((m) => m.user)}
          onAdded={() => { setShowAdd(false); load(); }}
          onClose={() => setShowAdd(false)} />
      )}
      <div className="flex items-center justify-between mb-3">
        <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("enterprise.settings.company.teams.membersHeading", { count: members.length })}
        </p>
        <button onClick={() => setShowAdd(true)} className="ank-btn-ghost text-xs">
          <PlusIcon className="h-3 w-3" /> {t("enterprise.settings.company.members.add")}
        </button>
      </div>
      {loading ? (
        <div className="space-y-1.5">
          {[1, 2].map((i) => <div key={i} style={{ height: 34, background: "var(--bg-surface)", borderRadius: 5 }} className="animate-pulse" />)}
        </div>
      ) : members.length === 0 ? (
        <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "10px 0" }}>{t("enterprise.settings.company.teams.noMembersYet")}</p>
      ) : (
        <div className="space-y-1.5">
          {members.map((m) => (
            <div key={m.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "7px 10px" }}
              className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent-muted)", color: "var(--accent)", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {(m.full_name || m.username || "?").charAt(0).toUpperCase()}
                </div>
                <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{m.full_name || m.username}</p>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, textTransform: "capitalize", background: m.role === "manager" ? "rgba(59,130,246,0.12)" : "var(--bg-elevated)", color: m.role === "manager" ? "var(--lt-60a5fa, #60a5fa)" : "var(--text-tertiary)" }}>
                  {m.role}
                </span>
              </div>
              <button onClick={() => handleRemove(m.user)}
                style={{ color: "var(--text-tertiary)", padding: 3, borderRadius: 4, flexShrink: 0, cursor: "pointer", transition: "all 150ms" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-f87171, #f87171)"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}>
                <XMarkIcon style={{ width: 12, height: 12 }} />
              </button>
            </div>
          ))}
        </div>
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

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterChip label={t("enterprise.settings.company.members.filters.all")} active={buFilter === ""} onClick={() => setBuFilter("")} />
          {units.map((u) => (
            <FilterChip key={u.id} label={u.name} active={buFilter === String(u.id)} onClick={() => setBuFilter(String(u.id))} />
          ))}
        </div>
        {canManage && (
          <button onClick={() => setModal("create")} className="ank-btn-accent text-xs">
            <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.settings.company.teams.newTeam")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} style={{ height: 60, background: "var(--bg-elevated)", borderRadius: 6 }} className="animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "36px 24px", textAlign: "center" }}>
          <UsersIcon style={{ width: 24, height: 24, color: "var(--text-tertiary)", margin: "0 auto 8px" }} />
          <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{t("enterprise.settings.company.teams.empty")}</p>
          {canManage && (
            <button onClick={() => setModal("create")} className="ank-btn-accent text-xs mt-3">
              <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.settings.company.teams.newTeam")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((team) => (
            <div key={team.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px" }} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div style={{ background: "rgba(59,130,246,0.1)", borderRadius: 6, padding: 7, flexShrink: 0 }}>
                    <UsersIcon style={{ width: 14, height: 14, color: "var(--lt-60a5fa, #60a5fa)" }} />
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{team.name}</p>
                    <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>
                      {t("enterprise.settings.company.teams.memberCount", { count: team.member_count ?? 0, plural: team.member_count !== 1 ? "s" : "" })}
                      {team.business_unit_name ? ` · ${t("enterprise.settings.company.teams.buSuffix", { name: team.business_unit_name })}` : ""}
                      {team.manager_username ? ` · ${t("enterprise.settings.company.units.managerSuffix", { name: team.manager_username })}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpanded(expanded === team.id ? null : team.id)}
                    style={{ fontSize: 11, color: expanded === team.id ? "var(--accent)" : "var(--text-secondary)", padding: "4px 8px", borderRadius: 5, border: `1px solid ${expanded === team.id ? "var(--accent)" : "var(--border)"}`, cursor: "pointer", transition: "all 150ms" }}>
                    {expanded === team.id ? t("enterprise.settings.company.teams.hide") : t("enterprise.settings.company.teams.members")}
                  </button>
                  {canManage && (
                    <DotMenu items={[
                      { label: t("enterprise.settings.company.units.menu.edit"), action: () => setModal(team) },
                      { label: t("enterprise.settings.company.units.menu.delete"), danger: true, action: () => handleDelete(team) },
                    ]} />
                  )}
                </div>
              </div>
              {expanded === team.id && (
                <TeamMembersPanel team={team} companyMembers={companyMembers} onClose={() => setExpanded(null)} />
              )}
            </div>
          ))}
        </div>
      )}
      {!loading && <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.settings.company.teams.count", { count: filtered.length, plural: filtered.length !== 1 ? "s" : "" })}</p>}
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
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{t("enterprise.settings.company.noCompanySelected")}</p>
      </div>
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

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div>
        <h1 style={{ color: "var(--text-primary)" }} className="text-xl font-bold">{t("enterprise.settings.company.title")}</h1>
        <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-0.5">
          {company?.name || activeCompany?.company_name || t("enterprise.settings.company.yourCompany")} · ID: {activeCompanyId}
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 0 }}>
        {tabs.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            padding: "9px 16px", borderBottom: `2px solid ${activeTab === id ? "var(--accent)" : "transparent"}`,
            color: activeTab === id ? "var(--text-primary)" : "var(--text-tertiary)",
            fontWeight: activeTab === id ? 600 : 400, fontSize: 13, cursor: "pointer",
            background: "transparent", transition: "color 150ms, border-color 150ms", whiteSpace: "nowrap",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
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
