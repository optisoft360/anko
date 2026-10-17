import React, { useEffect, useState, useRef, useCallback } from "react";
import { apiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon, PencilIcon, CheckIcon, XMarkIcon, PlusIcon, TrashIcon,
  UserGroupIcon, UsersIcon, ArrowPathIcon, ShieldCheckIcon, CheckCircleIcon,
  ClockIcon, BookOpenIcon, ChartBarIcon,
} from "@heroicons/react/24/outline";
import { complianceApi, learningApi, companyApi, teamsApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useAuth } from "@/context/auth-context";
import { useCompanyRole } from "../../hooks/useCompanyRole";
import { useLanguage } from "../../../context/language-context";
import { StatusBadge } from "../../components/StatusBadge";
import { LearningPathAssignmentProgress } from "../learning/LearningPathAssignmentProgress";
import {
  ProgramFormFields, programToForm, programFormToPayload,
} from "./CompliancePrograms";

const INPUT = {
  width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#F1F5F9", outline: "none", boxSizing: "border-box",
};
const MODAL_BACKDROP = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 };
const MODAL_CARD = { background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" };

function useTypeLabels() {
  const { t } = useLanguage();
  return {
    regulatory: t("enterprise.compliance.programs.types.regulatory"),
    internal: t("enterprise.compliance.programs.types.internal"),
    certification: t("enterprise.compliance.programs.types.certification"),
    safety: t("enterprise.compliance.programs.types.safety"),
    other: t("enterprise.compliance.programs.types.other"),
  };
}
function useFreqLabels() {
  const { t } = useLanguage();
  return {
    one_time: t("enterprise.compliance.programs.frequencies.oneTime"),
    monthly: t("enterprise.compliance.programs.frequencies.monthly"),
    quarterly: t("enterprise.compliance.programs.frequencies.quarterly"),
    biannual: t("enterprise.compliance.programs.frequencies.biannual"),
    annual: t("enterprise.compliance.programs.frequencies.annual"),
    custom: t("enterprise.compliance.programs.frequencies.custom"),
  };
}

// ─── Edit Program Form ───────────────────────────────────────────────────────

function EditProgramForm({ program, onSaved, onCancel }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(() => programToForm(program));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setError(t("enterprise.compliance.programs.form.nameCodeRequired")); return; }
    setSaving(true);
    setError("");
    try {
      const updated = await complianceApi.updateProgram(program.id, programFormToPayload(form));
      onSaved(updated);
    } catch (err) {
      setError(err?.detail || err?.code?.[0] || err?.name?.[0] || err?.non_field_errors?.[0] || t("enterprise.compliance.programDetail.editForm.saveError"));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProgramFormFields form={form} onChange={setForm} />
      {error && <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
        <button type="submit" disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? t("enterprise.compliance.programDetail.editForm.saving") : <><CheckIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.editForm.save")}</>}
        </button>
      </div>
    </form>
  );
}

// ─── Add Requirement Modal ───────────────────────────────────────────────────

function AddRequirementModal({ program, existingPathIds, onClose, onAdded }) {
  const { t } = useLanguage();
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPathId, setSelectedPathId] = useState("");
  const [name, setName] = useState("");
  const [isMandatory, setIsMandatory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    learningApi.getPaths({ status: "published" })
      .then((d) => setPaths(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const available = paths.filter((p) => !existingPathIds.includes(p.id));

  const handleSelectPath = (id) => {
    setSelectedPathId(id);
    const path = paths.find((p) => String(p.id) === String(id));
    if (path && !name.trim()) setName(path.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPathId) { setError(t("enterprise.compliance.programDetail.addRequirement.selectPath")); return; }
    setSaving(true);
    setError("");
    try {
      const created = await complianceApi.createRequirement({
        program: program.id,
        learning_path: parseInt(selectedPathId, 10),
        name: name.trim() || paths.find((p) => String(p.id) === String(selectedPathId))?.name || t("enterprise.compliance.programDetail.addRequirement.defaultName"),
        order: existingPathIds.length,
        is_mandatory: isMandatory,
      });
      onAdded(created);
      onClose();
    } catch (err) {
      setError(err?.detail || err?.learning_path?.[0] || err?.non_field_errors?.[0] || t("enterprise.compliance.programDetail.addRequirement.error"));
    } finally { setSaving(false); }
  };

  return (
    <div style={MODAL_BACKDROP} onClick={onClose}>
      <div style={{ ...MODAL_CARD, padding: 24 }} className="space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{t("enterprise.compliance.programDetail.addRequirement.title")}</p>
          <button type="button" onClick={onClose} style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }} aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {t("enterprise.compliance.programDetail.addRequirement.hint")}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-5 h-5 border-2 rounded-full animate-spin" />
          </div>
        ) : available.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "16px 0" }}>
            {paths.length === 0 ? t("enterprise.compliance.programDetail.addRequirement.noPaths") : t("enterprise.compliance.programDetail.addRequirement.allAdded")}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 5 }} htmlFor="req-path">{t("enterprise.compliance.programDetail.addRequirement.pathLabel")} *</label>
              <select id="req-path" style={{ ...INPUT, cursor: "pointer" }} value={selectedPathId} onChange={(e) => handleSelectPath(e.target.value)} required>
                <option value="">{t("enterprise.compliance.programDetail.addRequirement.pathPlaceholder")}</option>
                {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 5 }} htmlFor="req-name">{t("enterprise.compliance.programDetail.addRequirement.nameLabel")}</label>
              <input id="req-name" style={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("enterprise.compliance.programDetail.addRequirement.namePlaceholder")} />
            </div>
            <div className="flex items-center gap-2">
              <input id="req-mandatory" type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />
              <label htmlFor="req-mandatory" style={{ fontSize: 12.5, color: "var(--text-primary)", cursor: "pointer" }}>{t("enterprise.compliance.programDetail.addRequirement.mandatoryLabel")}</label>
            </div>
            {error && <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
              <button type="submit" disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
                {saving ? t("enterprise.compliance.programDetail.addRequirement.adding") : <><PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.addRequirementBtn")}</>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Requirement row ─────────────────────────────────────────────────────────

function RequirementRow({ req, index, onRemoved, canRemove }) {
  const { t } = useLanguage();
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!confirm(t("enterprise.compliance.programDetail.requirementRow.confirmRemove", { name: req.name }))) return;
    setRemoving(true);
    try { await complianceApi.deleteRequirement(req.id); onRemoved(req.id); }
    catch { setRemoving(false); }
  };

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 7, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent-muted)", color: "var(--accent)", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{req.name}</p>
          {!req.is_mandatory && (
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)" }}>{t("enterprise.compliance.programs.optional")}</span>
          )}
        </div>
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
          <BookOpenIcon style={{ width: 11, height: 11 }} /> {req.learning_path_name || t("enterprise.compliance.programDetail.requirementRow.unlinked")}
        </p>
      </div>
      {canRemove && (
        <button onClick={handleRemove} disabled={removing} style={{ color: "var(--text-tertiary)", padding: 5, borderRadius: 5, flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}>
          {removing ? <ArrowPathIcon style={{ width: 13, height: 13 }} className="animate-spin" /> : <TrashIcon style={{ width: 13, height: 13 }} />}
        </button>
      )}
    </div>
  );
}

// ─── Assign Modal (user or team) ─────────────────────────────────────────────

function AssignModal({ program, companyId, onClose, onAssigned }) {
  const { t } = useLanguage();
  const [tab, setTab] = useState("user");
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      companyApi.getMembers(companyId, { status: "active" }).then((d) => d.results || d || []),
      teamsApi.list({ company_id: companyId }).then((d) => d.results || d || []),
    ]).then(([m, tms]) => { setMembers(m); setTeams(tms); }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId]);

  const submittingRef = useRef(false);
  const handleAssign = async () => {
    if (submittingRef.current) return; // no double submit
    submittingRef.current = true;
    setSaving(true); setError(""); setSuccess("");
    try {
      if (tab === "user") {
        if (!selectedUser) { setError(t("enterprise.compliance.programDetail.assignModal.selectUser")); setSaving(false); return; }
        await complianceApi.assignToUser(program.id, { user_id: selectedUser.user, ...(dueDate && { due_date: dueDate }) });
        setSuccess(t("enterprise.compliance.programDetail.assignModal.assignedToUser", { name: selectedUser.full_name || selectedUser.username }));
      } else {
        if (!selectedTeam) { setError(t("enterprise.compliance.programDetail.assignModal.selectTeam")); setSaving(false); return; }
        await complianceApi.assignToTeam(program.id, { team_id: selectedTeam.id, ...(dueDate && { due_date: dueDate }) });
        setSuccess(t("enterprise.compliance.programDetail.assignModal.assignedToTeam", { name: selectedTeam.name }));
      }
      setSelectedUser(null); setSelectedTeam(null); setDueDate(""); setSearch("");
      onAssigned?.();
    } catch (err) {
      setError(apiErrorMessage(err, t("enterprise.compliance.programDetail.assignModal.error")));
    } finally { setSaving(false); submittingRef.current = false; }
  };

  const filteredMembers = members.filter((m) =>
    !search || (m.full_name || m.username || m.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredTeams = teams.filter((tm) =>
    !search || tm.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={MODAL_BACKDROP} onClick={onClose}>
      <div style={{ ...MODAL_CARD, padding: 22 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{t("enterprise.compliance.programDetail.assignModal.title")}</p>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)", fontSize: 20, cursor: "pointer", background: "none", border: "none" }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
          {[["user", t("enterprise.compliance.programDetail.assignModal.userTab"), UsersIcon], ["team", t("enterprise.compliance.programDetail.assignModal.teamTab"), UserGroupIcon]].map(([key, label, Icon]) => (
            <button key={key} onClick={() => { setTab(key); setSearch(""); setSelectedUser(null); setSelectedTeam(null); }}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderBottom: `2px solid ${tab === key ? "var(--accent)" : "transparent"}`, color: tab === key ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: tab === key ? 600 : 400, fontSize: 12.5, cursor: "pointer", background: "transparent", border: "none", borderBottomWidth: 2 }}>
              <Icon style={{ width: 13, height: 13 }} /> {label}
            </button>
          ))}
        </div>

        <input placeholder={tab === "user" ? t("enterprise.compliance.programDetail.assignModal.searchMember") : t("enterprise.compliance.programDetail.assignModal.searchTeam")} value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ ...INPUT, marginBottom: 10 }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; }} />

        <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 14 }} className="space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-5 h-5 border-2 rounded-full animate-spin" />
            </div>
          ) : tab === "user" ? (
            filteredMembers.length === 0 ? (
              <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>{t("enterprise.compliance.programDetail.assignModal.noMembers")}</p>
            ) : filteredMembers.map((m) => {
              const sel = selectedUser?.user === m.user;
              return (
                <button key={m.user} type="button" onClick={() => setSelectedUser(sel ? null : m)}
                  style={{ width: "100%", textAlign: "left", background: sel ? "rgba(99,102,241,0.12)" : "var(--bg-elevated)", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, padding: "8px 11px", cursor: "pointer" }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-muted)", color: "var(--accent)", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {(m.full_name || m.username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)" }}>{m.full_name || m.username}</p>
                      <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{m.email}</p>
                    </div>
                    {sel && <CheckIcon style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />}
                  </div>
                </button>
              );
            })
          ) : (
            filteredTeams.length === 0 ? (
              <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>{t("enterprise.compliance.programDetail.assignModal.noTeams")}</p>
            ) : filteredTeams.map((tm) => {
              const sel = selectedTeam?.id === tm.id;
              return (
                <button key={tm.id} type="button" onClick={() => setSelectedTeam(sel ? null : tm)}
                  style={{ width: "100%", textAlign: "left", background: sel ? "rgba(99,102,241,0.12)" : "var(--bg-elevated)", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, padding: "9px 11px", cursor: "pointer" }}>
                  <div className="flex items-center gap-2">
                    <div style={{ background: sel ? "var(--accent)" : "rgba(59,130,246,0.12)", borderRadius: 5, padding: 5, flexShrink: 0 }}>
                      <UserGroupIcon style={{ width: 13, height: 13, color: sel ? "#fff" : "#60a5fa" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)" }}>{tm.name}</p>
                      <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{t("enterprise.compliance.programDetail.assignModal.memberCount", { n: tm.member_count ?? 0, plural: (tm.member_count ?? 0) !== 1 ? "s" : "" })}</p>
                    </div>
                    {sel && <CheckIcon style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 12, marginBottom: 5 }}>{t("enterprise.compliance.programDetail.assignModal.dueDate")} <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({t("enterprise.learning.paths.wizard.optional")})</span></p>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            style={{ ...INPUT, width: "auto", colorScheme: "dark" }} />
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 12, marginBottom: 10 }}>{error}</p>}
        {success && <p style={{ color: "#4ade80", fontSize: 12, marginBottom: 10 }}>{success}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programDetail.assignModal.close")}</button>
          <button onClick={handleAssign} disabled={saving || (!selectedUser && !selectedTeam)} className="ank-btn-accent text-xs"
            style={{ opacity: saving || (!selectedUser && !selectedTeam) ? 0.6 : 1 }}>
            {saving ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <><UserGroupIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.assignModal.assign")}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ComplianceProgramDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { activeCompanyId } = useEnterprise();
  const { user } = useAuth();
  const { hasMinRole } = useCompanyRole();
  const canManage = hasMinRole("manager");
  const TYPE_LABELS = useTypeLabels();
  const FREQ_LABELS = useFreqLabels();

  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAddRequirement, setShowAddRequirement] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [myPathAssignments, setMyPathAssignments] = useState({});

  const load = useCallback(async () => {
    try { setProgram(await complianceApi.getProgram(id)); }
    catch {} finally { setLoading(false); }
  }, [id]);

  const loadAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const d = await complianceApi.getAssignments();
      const all = d.results || d || [];
      setAssignments(all.filter((a) => String(a.program) === String(id)));
    } catch {} finally { setLoadingAssignments(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const myComplianceAssignment = assignments.find((a) => a.user === user?.id) || null;

  // Resolve, for the requirements' Learning Paths, the LearningPathAssignment
  // the current user already has for each one — that's what lets them
  // actually complete this program through the same Learning Path experience.
  useEffect(() => {
    if (!myComplianceAssignment || !program) return;
    const pathIds = (program.requirements || []).map((r) => r.learning_path).filter(Boolean);
    if (pathIds.length === 0) return;
    learningApi.getAssignments().then((d) => {
      const mine = d.results || d || [];
      const map = {};
      mine.forEach((a) => {
        if (pathIds.includes(a.learning_path)) map[a.learning_path] = a.id;
      });
      setMyPathAssignments(map);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myComplianceAssignment?.id, program?.id]);

  const handleActivate = async () => {
    setBusy(true);
    try { setProgram(await complianceApi.activateProgram(id)); } finally { setBusy(false); }
  };
  const handleArchive = async () => {
    setBusy(true);
    try { await complianceApi.archiveProgram(id); setProgram((p) => ({ ...p, status: "archived" })); } finally { setBusy(false); }
  };

  const handleRequirementAdded = (req) => {
    setProgram((p) => ({ ...p, requirements: [...(p.requirements || []), req], requirement_count: (p.requirement_count || 0) + 1 }));
  };
  const handleRequirementRemoved = (reqId) => {
    setProgram((p) => ({ ...p, requirements: (p.requirements || []).filter((r) => r.id !== reqId), requirement_count: Math.max(0, (p.requirement_count || 1) - 1) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-7 h-7 border-2 rounded-full animate-spin" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center py-24">
        <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>{t("enterprise.compliance.programDetail.notFound")}</p>
        <button onClick={() => navigate("/enterprise/compliance/programs")} className="ank-btn-ghost text-xs mt-4">
          <ArrowLeftIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.back")}
        </button>
      </div>
    );
  }

  const requirements = program.requirements || [];
  const existingPathIds = requirements.map((r) => r.learning_path).filter(Boolean);

  return (
    <div className="w-full space-y-5">
      <button onClick={() => navigate("/enterprise/compliance/programs")}
        style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer", background: "none", border: "none" }}
        className="hover:opacity-70 transition-opacity">
        <ArrowLeftIcon style={{ width: 13, height: 13 }} /> {t("enterprise.compliance.programs.title")}
      </button>

      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
        {editing ? (
          <EditProgramForm program={program} onSaved={(updated) => { setProgram((p) => ({ ...p, ...updated })); setEditing(false); }} onCancel={() => setEditing(false)} />
        ) : (
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <div style={{ background: "var(--accent-muted)", borderRadius: 8, padding: 10, flexShrink: 0 }}>
                <ShieldCheckIcon style={{ width: 20, height: 20, color: "var(--accent)" }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 17 }}>{program.name}</h1>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-tertiary)" }}>{program.code}</span>
                  <StatusBadge status={program.status} />
                </div>
                {program.description && (
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>{program.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span style={{ color: "var(--text-tertiary)", fontSize: 11, textTransform: "capitalize" }}>{TYPE_LABELS[program.compliance_type] || program.compliance_type}</span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>·</span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{FREQ_LABELS[program.frequency] || program.frequency}</span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>·</span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                    <ClockIcon style={{ width: 11, height: 11 }} /> {t("enterprise.compliance.programDetail.validDays", { n: program.validity_days })}
                  </span>
                  {program.is_mandatory && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", padding: "1px 8px", borderRadius: 20 }}>{t("enterprise.compliance.programs.required")}</span>
                  )}
                  {program.requires_score && program.passing_score != null && (
                    <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.compliance.programDetail.passingScore", { n: program.passing_score })}</span>
                  )}
                </div>
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => setEditing(true)} className="ank-btn-ghost text-xs">
                  <PencilIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.edit")}
                </button>
                <button onClick={() => setShowAssign(true)} className="ank-btn-ghost text-xs">
                  <UserGroupIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.assign")}
                </button>
                <button onClick={() => navigate(`/enterprise/compliance/programs/${id}/audit`)} className="ank-btn-ghost text-xs">
                  <ChartBarIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.auditReport")}
                </button>
                {program.status === "draft" && (
                  <button onClick={handleActivate} disabled={busy} className="ank-btn-accent text-xs" style={{ opacity: busy ? 0.7 : 1 }}>
                    {busy ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircleIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programs.activate")}</>}
                  </button>
                )}
                {program.status === "active" && (
                  <button onClick={handleArchive} disabled={busy} className="ank-btn-ghost text-xs" style={{ opacity: busy ? 0.7 : 1 }}>
                    {busy ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : t("enterprise.compliance.programs.archive")}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {myComplianceAssignment && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {t("enterprise.compliance.programDetail.completeThisProgram")}
            </p>
            <StatusBadge status={myComplianceAssignment.status} />
          </div>
          {requirements.filter((r) => r.learning_path).length === 0 ? (
            <p style={{ color: "var(--text-tertiary)", fontSize: 12, padding: "8px 0" }}>{t("enterprise.compliance.programDetail.noRequirementsYet")}</p>
          ) : (
            <div className="space-y-4">
              {requirements.filter((r) => r.learning_path).map((req) => {
                const pathAssignmentId = myPathAssignments[req.learning_path];
                return (
                  <div key={req.id} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "16px 18px" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>{req.name}</p>
                    {pathAssignmentId ? (
                      <LearningPathAssignmentProgress
                        assignmentId={pathAssignmentId}
                        onCompleted={loadAssignments}
                      />
                    ) : (
                      <p style={{ color: "var(--text-tertiary)", fontSize: 12 }}>{t("enterprise.compliance.programDetail.preparingAssignment")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            {t("enterprise.compliance.programDetail.requirementsHeading", { count: requirements.length })}
          </p>
          {canManage && (
            <button onClick={() => setShowAddRequirement(true)} className="ank-btn-ghost text-xs">
              <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.addRequirementBtn")}
            </button>
          )}
        </div>

        {requirements.length === 0 ? (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}
            className="flex flex-col items-center py-12 text-center">
            <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <BookOpenIcon style={{ width: 22, height: 22, color: "var(--text-tertiary)" }} />
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>{t("enterprise.compliance.programDetail.noRequirements")}</p>
            {canManage && (
              <>
                <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 3 }}>{t("enterprise.compliance.programDetail.noRequirementsMessage")}</p>
                <button onClick={() => setShowAddRequirement(true)} className="ank-btn-accent text-xs mt-4">
                  <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programDetail.addRequirementBtn")}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {requirements.map((req, idx) => (
              <RequirementRow key={req.id} req={req} index={idx} onRemoved={handleRequirementRemoved} canRemove={canManage} />
            ))}
          </div>
        )}
      </div>

      {canManage && (
        <div>
          <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 12 }}>
            {t("enterprise.compliance.programDetail.assignedHeading", { count: assignments.length })}
          </p>

          {loadingAssignments ? (
            <div className="flex items-center justify-center py-8">
              <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-5 h-5 border-2 rounded-full animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}
              className="flex flex-col items-center py-10 text-center">
              <p style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>{t("enterprise.compliance.programDetail.notAssigned")}</p>
              <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 3 }}>{t("enterprise.compliance.programDetail.notAssignedMessage")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <div key={a.id} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 7, padding: "10px 14px" }}
                  className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-muted)", color: "var(--accent)", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {(a.user_username || a.team_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{a.user_username || a.team_name}</p>
                    {a.team && !a.user && <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-tertiary)" }}>{t("enterprise.compliance.programDetail.teamTag")}</span>}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {a.due_date && <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t("enterprise.compliance.programDetail.due", { date: a.due_date })}</span>}
                    <StatusBadge status={a.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddRequirement && (
        <AddRequirementModal
          program={program}
          existingPathIds={existingPathIds}
          onAdded={handleRequirementAdded}
          onClose={() => setShowAddRequirement(false)}
        />
      )}

      {showAssign && (
        <AssignModal program={program} companyId={activeCompanyId} onAssigned={loadAssignments} onClose={() => setShowAssign(false)} />
      )}
    </div>
  );
}

export default ComplianceProgramDetail;
