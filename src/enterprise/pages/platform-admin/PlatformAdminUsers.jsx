import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon, UserPlusIcon, EllipsisHorizontalIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { companyApi } from "../../api/enterpriseApi";
import { useLanguage } from "../../../context/language-context";

const ROLES = ["owner", "admin", "manager", "trainer", "employee", "auditor"];

function useStages() {
  const { t } = useLanguage();
  return [
    { value: "candidate",       label: t("enterprise.settings.company.stages.candidate") },
    { value: "onboarding",      label: t("enterprise.settings.company.stages.onboarding") },
    { value: "trainee",         label: t("enterprise.settings.company.stages.trainee") },
    { value: "active_employee", label: t("enterprise.settings.company.stages.activeEmployee") },
    { value: "contractor",      label: t("enterprise.settings.company.stages.contractor") },
    { value: "former_employee", label: t("enterprise.settings.company.stages.formerEmployee") },
  ];
}

function useStatusLabels() {
  const { t } = useLanguage();
  return {
    active: t("enterprise.settings.company.status.active"),
    invited: t("enterprise.platformAdmin.users.status.invited"),
    suspended: t("enterprise.settings.company.status.suspended"),
    removed: t("enterprise.settings.company.status.removed"),
  };
}

/* ── Design tokens ── */
const INPUT_S = {
  background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))",
  border: "1px solid var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))",
  borderRadius: 10,
  padding: "11px 14px",
  fontSize: 13,
  color: "var(--lt-f1f5f9, #F1F5F9)",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
  boxSizing: "border-box",
};
const focusIn  = (e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.background = "rgba(99,102,241,0.06)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; };
const focusOut = (e) => { e.target.style.borderColor = "var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))"; e.target.style.background = "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))"; e.target.style.boxShadow = "none"; };
const LABEL_S = { fontSize: 11, fontWeight: 700, color: "var(--lt-94a3b8, #94A3B8)", display: "block", marginBottom: 6, letterSpacing: "0.02em" };

const MODAL_BACKDROP = { position: "fixed", inset: 0, background: "var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" };
const MODAL_CARD = { background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 20, width: "100%", maxWidth: 440, boxShadow: "0 32px 80px var(--lt-rgba-0-0-0-0-6, rgba(0,0,0,0.6))" };

const ROLE_STYLES = {
  owner:    { background: "rgba(168,85,247,0.12)", color: "#C084FC", border: "1px solid rgba(168,85,247,0.25)" },
  admin:    { background: "rgba(239,68,68,0.1)",   color: "var(--lt-f87171, #F87171)", border: "1px solid rgba(239,68,68,0.22)" },
  manager:  { background: "rgba(59,130,246,0.1)",  color: "var(--lt-60a5fa, #60A5FA)", border: "1px solid rgba(59,130,246,0.22)" },
  trainer:  { background: "rgba(34,197,94,0.09)",  color: "var(--lt-4ade80, #4ADE80)", border: "1px solid rgba(34,197,94,0.2)" },
  employee: { background: "rgba(148,163,184,0.1)", color: "var(--lt-94a3b8, #94A3B8)", border: "1px solid rgba(148,163,184,0.2)" },
  auditor:  { background: "rgba(251,191,36,0.1)",  color: "#FCD34D", border: "1px solid rgba(251,191,36,0.22)" },
};

const STATUS_STYLES = {
  active:    { background: "rgba(34,197,94,0.09)",  color: "var(--lt-4ade80, #4ADE80)", border: "1px solid rgba(34,197,94,0.2)" },
  invited:   { background: "rgba(59,130,246,0.1)",  color: "var(--lt-60a5fa, #60A5FA)", border: "1px solid rgba(59,130,246,0.22)" },
  suspended: { background: "rgba(251,191,36,0.1)",  color: "#FCD34D", border: "1px solid rgba(251,191,36,0.22)" },
  removed:   { background: "rgba(148,163,184,0.08)", color: "#64748B", border: "1px solid rgba(148,163,184,0.15)" },
};

function Spin() {
  return <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--lt-rgba-255-255-255-0-25, rgba(255,255,255,0.25))", borderTopColor: "#fff", flexShrink: 0 }} className="animate-spin" />;
}

function PrimaryBtn({ children, disabled, loading, type = "button", onClick }) {
  return (
    <button type={type} disabled={disabled || loading} onClick={onClick}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px 20px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700,
        background: (disabled || loading) ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
        color: "#fff", cursor: (disabled || loading) ? "default" : "pointer", overflow: "hidden",
        boxShadow: (disabled || loading) ? "none" : "0 4px 16px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => { if (!disabled && !loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.15)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = (!disabled && !loading) ? "0 4px 16px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" : "none"; }}
      onMouseDown={(e) => { if (!disabled && !loading) e.currentTarget.style.transform = "scale(0.985)"; }}
      onMouseUp={(e) => { if (!disabled && !loading) e.currentTarget.style.transform = "translateY(-1px)"; }}>
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1)) 0%, transparent 55%)", pointerEvents: "none", borderRadius: 10 }} />
      <span style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>{children}</span>
    </button>
  );
}

function DarkSelect({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange}
      style={{ ...INPUT_S, appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", paddingRight: 36 }}
      onFocus={focusIn} onBlur={focusOut}>
      {children}
    </select>
  );
}

/* ── Add User Modal ── */
function AddUserModal({ companyId, onClose, onAdded }) {
  const { t } = useLanguage();
  const STAGES = useStages();
  const [form, setForm] = useState({ email: "", role: "employee", employee_stage: "onboarding" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { setError(t("enterprise.platformAdmin.users.addModal.emailRequired")); return; }
    setSaving(true); setError("");
    try {
      const result = await companyApi.addUser(companyId, {
        email: form.email.trim(), role: form.role, employee_stage: form.employee_stage,
      });
      onAdded(result);
    } catch (err) {
      const d = err?.response?.data || err;
      setError(d?.email?.[0] || d?.detail || d?.non_field_errors?.[0] || t("enterprise.platformAdmin.users.addModal.addError"));
    } finally { setSaving(false); }
  };

  return (
    <div style={MODAL_BACKDROP} onClick={onClose}>
      <div style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", letterSpacing: "-0.01em" }}>{t("enterprise.settings.company.members.addModal.title")}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lt-475569, #475569)", padding: 6, borderRadius: 8, display: "flex", transition: "color 0.15s, background 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lt-475569, #475569)"; e.currentTarget.style.background = "none"; }}>
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LABEL_S}>Email *</label>
            <input type="email" style={INPUT_S} placeholder="usuario@empresa.com" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} required onFocus={focusIn} onBlur={focusOut} />
            <p style={{ fontSize: 11, color: "#64748B", marginTop: 6, lineHeight: 1.55 }}>
              {t("enterprise.platformAdmin.users.addModal.hint")}
            </p>
          </div>

          <div>
            <label style={LABEL_S}>{t("enterprise.platformAdmin.users.addModal.roleLabel")}</label>
            <DarkSelect value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r} style={{ textTransform: "capitalize" }}>{r}</option>)}
            </DarkSelect>
          </div>

          <div>
            <label style={LABEL_S}>{t("enterprise.platformAdmin.users.addModal.stageLabel")}</label>
            <DarkSelect value={form.employee_stage} onChange={(e) => setForm({ ...form, employee_stage: e.target.value })}>
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </DarkSelect>
          </div>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 9, padding: "10px 14px" }}>
              <p style={{ fontSize: 12, color: "#FCA5A5" }}>{error}</p>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#64748B", background: "none", border: "none", borderRadius: 9, cursor: "pointer", transition: "color 0.15s, background 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.background = "none"; }}>
              {t("enterprise.compliance.programs.cancel")}
            </button>
            <PrimaryBtn type="submit" loading={saving}>
              {saving ? <><Spin /> {t("enterprise.settings.company.members.adding")}</> : <><UserPlusIcon style={{ width: 15, height: 15 }} /> {t("enterprise.platformAdmin.users.addModal.addArrow")}</>}
            </PrimaryBtn>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Change Role Modal ── */
function ChangeRoleModal({ member, onClose, onSaved, companyId }) {
  const { t } = useLanguage();
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      await companyApi.changeMemberRole(companyId, { membership_id: member.id, role });
      onSaved(member.id, role);
    } catch (err) {
      setError(err?.detail || t("enterprise.platformAdmin.users.changeRoleModal.error"));
    } finally { setSaving(false); }
  };

  return (
    <div style={MODAL_BACKDROP} onClick={onClose}>
      <div style={{ ...MODAL_CARD, maxWidth: 360 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", letterSpacing: "-0.01em" }}>{t("enterprise.settings.company.members.changeRoleModal.title")}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lt-475569, #475569)", padding: 6, borderRadius: 8, display: "flex", transition: "color 0.15s, background 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lt-475569, #475569)"; e.currentTarget.style.background = "none"; }}>
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <form onSubmit={handleSave} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ fontSize: 13, color: "var(--lt-94a3b8, #94A3B8)" }}>
            {t("enterprise.platformAdmin.users.changeRoleModal.user")} <strong style={{ color: "var(--lt-f1f5f9, #F1F5F9)" }}>{member.full_name || member.email}</strong>
          </p>
          <div>
            <label style={LABEL_S}>{t("enterprise.settings.company.members.changeRoleModal.newRole")}</label>
            <DarkSelect value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r} style={{ textTransform: "capitalize" }}>{r}</option>)}
            </DarkSelect>
          </div>
          {error && (
            <p style={{ fontSize: 12, color: "var(--lt-f87171, #F87171)" }}>{error}</p>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 8, borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#64748B", background: "none", border: "none", borderRadius: 9, cursor: "pointer", transition: "color 0.15s, background 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.background = "none"; }}>
              {t("enterprise.compliance.programs.cancel")}
            </button>
            <PrimaryBtn type="submit" loading={saving}>
              {saving ? <><Spin /> {t("enterprise.settings.company.info.saving")}</> : t("enterprise.settings.company.members.changeRoleModal.save")}
            </PrimaryBtn>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function PlatformAdminUsers() {
  const { t } = useLanguage();
  const { id: companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [showAdd, setShowAdd] = useState(false);
  const [changeRole, setChangeRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [acting, setActing] = useState(false);
  const [toast, setToast] = useState("");
  const STAGES = useStages();
  const STATUS_LABELS = useStatusLabels();

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      companyApi.getCompany(companyId),
      companyApi.getMembers(companyId, { status: statusFilter }),
    ])
      .then(([co, mems]) => { setCompany(co); setMembers(mems.results || mems || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAdded = () => { setShowAdd(false); showToast(t("enterprise.platformAdmin.users.toast.added")); load(); };

  const handleRoleSaved = (memberId, newRole) => {
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
    setChangeRole(null);
    showToast(t("enterprise.platformAdmin.users.toast.roleUpdated"));
  };

  const handleRemove = async (member) => {
    if (!window.confirm(t("enterprise.settings.company.members.confirmRemove", { name: member.full_name || member.email }))) return;
    setActing(true);
    try {
      await companyApi.removeMember(companyId, { membership_id: member.id });
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      showToast(t("enterprise.platformAdmin.users.toast.removed"));
    } catch (err) {
      showToast(err?.detail || t("enterprise.platformAdmin.users.toast.removeError"));
    } finally { setActing(false); setMenuOpen(null); }
  };

  const roleStyle = (r) => ROLE_STYLES[r] || ROLE_STYLES.employee;
  const statusStyle = (s) => STATUS_STYLES[s] || STATUS_STYLES.removed;

  const columns = [
    t("enterprise.settings.company.members.columns.name"),
    t("enterprise.settings.company.members.columns.email"),
    t("enterprise.settings.company.members.columns.role"),
    t("enterprise.settings.company.members.columns.stage"),
    t("enterprise.settings.company.members.columns.status"),
    "",
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "var(--lt-toast, rgba(15,23,42,0.95))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", color: "var(--lt-f1f5f9, #F1F5F9)", fontSize: 13, fontWeight: 600, padding: "12px 22px", borderRadius: 12, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5))", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {showAdd && <AddUserModal companyId={companyId} onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
      {changeRole && <ChangeRoleModal member={changeRole} companyId={companyId} onClose={() => setChangeRole(null)} onSaved={handleRoleSaved} />}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => navigate("/platform-admin/companies")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--lt-475569, #475569)", background: "none", border: "none", cursor: "pointer", marginBottom: 16, padding: 0, transition: "color 0.15s" }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--lt-818cf8, #818CF8)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--lt-475569, #475569)"}>
          <ArrowLeftIcon style={{ width: 14, height: 14 }} /> {t("enterprise.platformAdmin.users.backToCompanies")}
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ padding: "3px 8px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--lt-f87171, #F87171)", fontSize: 10, fontWeight: 800, borderRadius: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Platform Admin
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--lt-f1f5f9, #F1F5F9)", letterSpacing: "-0.02em", marginBottom: 4 }}>
              {t("enterprise.platformAdmin.users.title", { name: company?.name || t("enterprise.platformAdmin.users.companyFallback", { id: companyId }) })}
            </h1>
            <p style={{ fontSize: 13, color: "#64748B" }}>
              {t("enterprise.settings.company.members.count", { count: members.length, plural: members.length !== 1 ? "s" : "" })} {statusFilter !== "all" ? `(${STATUS_LABELS[statusFilter] || statusFilter})` : ""}
            </p>
          </div>
          <PrimaryBtn onClick={() => setShowAdd(true)}>
            <UserPlusIcon style={{ width: 15, height: 15 }} /> {t("enterprise.settings.company.members.addMember")}
          </PrimaryBtn>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", borderRadius: 12, padding: 4, width: "fit-content", marginBottom: 20 }}>
        {[{ key: "active", label: t("enterprise.settings.company.members.filters.active") }, { key: "all", label: t("enterprise.settings.company.members.filters.all") }].map(({ key, label }) => (
          <button key={key} onClick={() => setStatusFilter(key)}
            style={{
              padding: "7px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.15s",
              background: statusFilter === key ? "rgba(99,102,241,0.15)" : "none",
              color: statusFilter === key ? "var(--lt-818cf8, #818CF8)" : "#64748B",
              boxShadow: statusFilter === key ? "inset 0 0 0 1px rgba(99,102,241,0.3)" : "none",
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ background: "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))", border: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", borderRadius: 12, padding: "16px 20px" }} className="animate-pulse">
              <div style={{ height: 13, background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", borderRadius: 5, width: "25%", marginBottom: 8 }} />
              <div style={{ height: 10, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", borderRadius: 5, width: "35%" }} />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <UserPlusIcon style={{ width: 48, height: 48, margin: "0 auto 12px", opacity: 0.3, color: "#64748B" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--lt-475569, #475569)", marginBottom: 4 }}>{t("enterprise.platformAdmin.users.empty")}</p>
          <p style={{ fontSize: 13, color: "var(--lt-334155, #334155)" }}>{t("enterprise.platformAdmin.users.emptyHint")}</p>
        </div>
      ) : (
        <div style={{ background: "var(--lt-rgba-255-255-255-0-02, rgba(255,255,255,0.02))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", borderRadius: 16, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", background: "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))" }}>
                {columns.map((h, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "12px 16px", fontSize: 10, fontWeight: 800, color: "var(--lt-475569, #475569)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => (
                <tr key={m.id}
                  style={{ borderBottom: idx < members.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}>
                  <td style={{ padding: "13px 16px", fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)" }}>
                    {m.full_name || m.username || "—"}
                  </td>
                  <td style={{ padding: "13px 16px", color: "#64748B", fontSize: 12 }}>{m.email || "—"}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, textTransform: "capitalize", ...roleStyle(m.role) }}>
                      {m.role}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px", color: "#64748B", fontSize: 12 }}>
                    {STAGES.find((s) => s.value === m.employee_stage)?.label || m.employee_stage || "—"}
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6, ...statusStyle(m.status) }}>
                      {STATUS_LABELS[m.status] || m.status}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                        style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 7, cursor: "pointer", color: "var(--lt-475569, #475569)", transition: "color 0.15s, background 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lt-475569, #475569)"; e.currentTarget.style.background = "none"; }}>
                        <EllipsisHorizontalIcon style={{ width: 16, height: 16 }} />
                      </button>
                      {menuOpen === m.id && (
                        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20, background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 12, width: 160, padding: "4px 0", boxShadow: "0 16px 48px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5))" }}>
                          <button
                            style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, color: "var(--lt-94a3b8, #94A3B8)", background: "none", border: "none", cursor: "pointer", transition: "background 0.12s, color 0.12s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))"; e.currentTarget.style.color = "var(--lt-f1f5f9, #F1F5F9)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; }}
                            onClick={() => { setChangeRole(m); setMenuOpen(null); }}>
                            {t("enterprise.settings.company.members.menu.changeRole")}
                          </button>
                          {m.role !== "owner" && (
                            <button
                              style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, color: "var(--lt-f87171, #F87171)", background: "none", border: "none", cursor: "pointer", transition: "background 0.12s" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.07)"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                              onClick={() => handleRemove(m)}>
                              {t("enterprise.settings.company.members.menu.remove")}
                            </button>
                          )}
                          <button
                            style={{ width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 13, color: "var(--lt-475569, #475569)", background: "none", border: "none", cursor: "pointer", transition: "background 0.12s" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                            onClick={() => setMenuOpen(null)}>
                            {t("enterprise.platformAdmin.users.close")}
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PlatformAdminUsers;
