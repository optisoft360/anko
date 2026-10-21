import { noWheel } from "@/utils/numberInput";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { enumLabel, useKnowledgeEnumLabels } from "@/utils/enumLabel";
import { apiErrorMessage } from "@/utils/apiError";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon, PlusIcon, TrashIcon, ArrowPathIcon,
  ClockIcon, CheckCircleIcon, BookOpenIcon, PencilIcon,
  CheckIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon,
  RectangleStackIcon, UserGroupIcon, UsersIcon,
} from "@heroicons/react/24/outline";
import { learningApi, companyApi, teamsApi, knowledgeApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";

// ─── Constants ────────────────────────────────────────────────────────────────

function useStatusConfig() {
  const { t } = useLanguage();
  return {
    draft:     { bg: "rgba(255,255,255,0.08)", text: "#8B8B9C",  label: t("enterprise.learning.pathDetail.status.draft") },
    published: { bg: "rgba(74,222,128,0.12)",  text: "#4ade80",  label: t("enterprise.learning.pathDetail.status.published") },
    archived:  { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b",  label: t("enterprise.learning.pathDetail.status.archived") },
  };
}

const TYPE_COLORS = {
  course:         { bg: "rgba(94,106,210,0.15)", text: "#8B9CF4" },
  tutorial:       { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  study_material: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b" },
};

function useTypeLabels() {
  const { t } = useLanguage();
  return {
    course: t("enterprise.learning.pathDetail.types.course"),
    tutorial: t("enterprise.learning.pathDetail.types.tutorial"),
    study_material: t("enterprise.learning.pathDetail.types.studyMaterial"),
  };
}

const DIFF_COLORS = {
  easy:   { text: "#4ade80" }, medium: { text: "#f59e0b" }, hard: { text: "#f87171" },
};

// ─── Add Proceso Modal ────────────────────────────────────────────────────────

function AddProcesoModal({ pathId, currentModuleIds, onAdded, onClose }) {
  const { t } = useLanguage();
  const TYPE_LABELS = useTypeLabels();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [order, setOrder] = useState(currentModuleIds.length + 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    knowledgeApi.list()
      .then((d) => setModules(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const available = modules.filter((m) =>
    (!search || (m.title || "").toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async () => {
    if (!selectedId) return;
    setSaving(true); setError("");
    try {
      const ks = modules.find((m) => m.id === selectedId);
      const companyId = parseInt(localStorage.getItem("enterprise_company_id")) || null;
      const newModule = await learningApi.createModule({
        company: companyId,
        knowledge_source: ks.id,
        name: ks.title,
        description: ks.description || "",
        process_type: ks.process_type || "course",
        difficulty: ks.difficulty || "medium",
        order,
      });
      await learningApi.addModule(pathId, { module_id: newModule.id, order });
      onAdded();
      onClose();
    } catch (err) {
      const detail = err?.detail || err?.module_id?.[0] || err?.name?.[0] || t("enterprise.learning.pathDetail.addModal.error");
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "var(--lt-rgba-0-0-0-0-6, rgba(0,0,0,0.6))", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, width: "100%", maxWidth: 440, padding: 20 }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{t("enterprise.learning.pathDetail.addModal.title")}</p>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <input
          autoFocus
          placeholder={t("enterprise.learning.pathDetail.addModal.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", color: "var(--text-primary)", fontSize: 12, outline: "none", marginBottom: 10 }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
        />

        <div style={{ maxHeight: 240, overflowY: "auto" }} className="space-y-1.5 mb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-5 h-5 border-2 rounded-full animate-spin" />
            </div>
          ) : available.length === 0 ? (
            <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "16px 0" }}>
              {modules.length === 0 ? t("enterprise.learning.pathDetail.addModal.noProcesses") : t("enterprise.learning.pathDetail.addModal.allAdded")}
            </p>
          ) : (
            available.map((mod) => {
              const selected = selectedId === mod.id;
              const tc = TYPE_COLORS[mod.process_type] || { bg: "var(--bg-elevated)", text: "var(--text-secondary)" };
              return (
                <button key={mod.id} type="button" onClick={() => setSelectedId(selected ? null : mod.id)}
                  style={{ width: "100%", textAlign: "left", background: selected ? "var(--bg-accent)" : "var(--bg-elevated)", border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, padding: "9px 12px", cursor: "pointer", transition: "all 150ms" }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, background: selected ? "var(--accent)" : "var(--bg-surface)", border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selected && <CheckIcon style={{ width: 10, height: 10, color: "#fff", strokeWidth: 3 }} />}
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{mod.title}</span>
                    <span style={{ background: tc.bg, color: tc.text, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>
                      {enumLabel(TYPE_LABELS, mod.process_type, "process_type")}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {selectedId && (
          <div className="flex items-center gap-3 mb-4">
            <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>{t("enterprise.learning.pathDetail.addModal.position")}</p>
            <input type="number" {...noWheel} min="1" value={order} onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
              style={{ width: 70, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 5, padding: "5px 8px", color: "var(--text-primary)", fontSize: 12, outline: "none", textAlign: "center" }} />
          </div>
        )}

        {error && <p style={{ color: "var(--lt-f87171, #f87171)", fontSize: 11, marginBottom: 10 }}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.learning.pathDetail.cancel")}</button>
          <button onClick={handleAdd} disabled={!selectedId || saving} className="ank-btn-accent text-xs" style={{ opacity: !selectedId || saving ? 0.6 : 1 }}>
            {saving ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <><PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.pathDetail.addModal.add")}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Name/Desc inline ────────────────────────────────────────────────────

function EditHeaderForm({ path, onSaved, onCancel }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: path.name, description: path.description || "" });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await learningApi.updatePath(path.id, { name: form.name.trim(), description: form.description.trim() });
      onSaved(updated);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-2">
      <input
        autoFocus
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--accent)", borderRadius: 6, padding: "7px 10px", color: "var(--text-primary)", fontSize: 16, fontWeight: 700, outline: "none" }}
      />
      <textarea rows={2} placeholder={t("enterprise.learning.pathDetail.editForm.descriptionPlaceholder")}
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 10px", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "none" }}
      />
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="ank-btn-accent text-xs">
          {saving ? t("enterprise.learning.pathDetail.editForm.saving") : <><CheckIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.pathDetail.editForm.save")}</>}
        </button>
        <button onClick={onCancel} className="ank-btn-ghost text-xs">{t("enterprise.learning.pathDetail.cancel")}</button>
      </div>
    </div>
  );
}

// ─── Module row ───────────────────────────────────────────────────────────────

function ModuleRow({ mod, index, total, pathId, pathName, onRemoved, onMoveUp, onMoveDown }) {
  const ENUMS = useKnowledgeEnumLabels();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const TYPE_LABELS = useTypeLabels();
  const [removing, setRemoving] = useState(false);

  const handleRemove = async (e) => {
    e.stopPropagation();
    if (!confirm(t("enterprise.learning.pathDetail.moduleRow.confirmRemove", { name: mod.name }))) return;
    setRemoving(true);
    try { await learningApi.removeModule(pathId, { module_id: mod.id }); onRemoved(mod.id); }
    catch { setRemoving(false); }
  };

  // Only modules created from a real KnowledgeSource (knowledge_source set) can be
  // opened — older modules created before that link existed can't be resolved back
  // to a real process, so they stay non-clickable instead of guessing/misrouting.
  const isLinked = mod.knowledge_source != null;
  const handleOpen = () => {
    if (!isLinked) return;
    navigate(`/enterprise/knowledge/${mod.knowledge_source}`, {
      state: { from: { type: "learning-path", id: pathId, name: pathName } },
    });
  };

  const tc = TYPE_COLORS[mod.process_type] || { bg: "var(--bg-elevated)", text: "var(--text-secondary)" };
  const dc = DIFF_COLORS[mod.difficulty] || { text: "var(--text-tertiary)" };

  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
      <div className="flex items-center gap-2 px-3 py-3">
        {/* Order arrows */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button onClick={onMoveUp} disabled={index === 0}
            style={{ color: index === 0 ? "var(--text-tertiary)" : "var(--text-secondary)", opacity: index === 0 ? 0.3 : 1, cursor: index === 0 ? "default" : "pointer", padding: 1 }}>
            <ChevronUpIcon style={{ width: 12, height: 12 }} />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            style={{ color: index === total - 1 ? "var(--text-tertiary)" : "var(--text-secondary)", opacity: index === total - 1 ? 0.3 : 1, cursor: index === total - 1 ? "default" : "pointer", padding: 1 }}>
            <ChevronDownIcon style={{ width: 12, height: 12 }} />
          </button>
        </div>

        {/* Number */}
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-muted)", color: "var(--accent)", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {index + 1}
        </div>

        {/* Info */}
        <div
          className="flex-1 min-w-0"
          style={{ cursor: isLinked ? "pointer" : "default" }}
          onClick={handleOpen}
          title={isLinked ? undefined : t("enterprise.learning.pathDetail.moduleRow.unlinkedTitle")}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{mod.name}</p>
            <span style={{ background: tc.bg, color: tc.text, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>
              {enumLabel(TYPE_LABELS, mod.process_type, "process_type")}
            </span>
            {mod.difficulty && (
              <span style={{ color: dc.text, fontSize: 9, fontWeight: 700, }}>{ENUMS.difficulty(mod.difficulty)}</span>
            )}
            {!mod.is_required && (
              <span style={{ color: "var(--text-tertiary)", fontSize: 9, fontWeight: 700 }}>{t("enterprise.learning.pathDetail.moduleRow.optional")}</span>
            )}
            {!isLinked && (
              <span style={{ color: "var(--text-tertiary)", fontSize: 9, fontWeight: 700, fontStyle: "italic" }}>{t("enterprise.learning.pathDetail.moduleRow.unlinked")}</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {mod.item_count != null && (
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.learning.pathDetail.moduleRow.itemsCount", { n: mod.item_count })}</span>
            )}
            {mod.estimated_duration_minutes && (
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1">
                <ClockIcon style={{ width: 10, height: 10 }} /> {mod.estimated_duration_minutes} min
              </span>
            )}
            {mod.minimum_passing_score != null && (
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.learning.pathDetail.moduleRow.passingScore", { n: mod.minimum_passing_score })}</span>
            )}
          </div>
        </div>

        {/* Remove */}
        <button onClick={handleRemove} disabled={removing} style={{ color: "var(--text-tertiary)", padding: 5, borderRadius: 5, flexShrink: 0, transition: "all 150ms" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-f87171, #f87171)"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}>
          {removing ? <ArrowPathIcon style={{ width: 13, height: 13 }} className="animate-spin" /> : <XMarkIcon style={{ width: 13, height: 13 }} />}
        </button>
      </div>
    </div>
  );
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ pathId, companyId, onClose }) {
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
        if (!selectedUser) { setError(t("enterprise.learning.pathDetail.assignModal.selectUser")); setSaving(false); return; }
        await learningApi.assignPathToUser(pathId, { user_id: selectedUser.user, ...(dueDate && { due_date: dueDate }) });
        setSuccess(t("enterprise.learning.pathDetail.assignModal.assignedToUser", { name: selectedUser.full_name || selectedUser.username }));
      } else {
        if (!selectedTeam) { setError(t("enterprise.learning.pathDetail.assignModal.selectTeam")); setSaving(false); return; }
        await learningApi.assignPathToTeam(pathId, { team_id: selectedTeam.id, ...(dueDate && { due_date: dueDate }) });
        setSuccess(t("enterprise.learning.pathDetail.assignModal.assignedToTeam", { name: selectedTeam.name }));
      }
      setSelectedUser(null); setSelectedTeam(null); setDueDate(""); setSearch("");
    } catch (err) {
      setError(apiErrorMessage(err, t("enterprise.learning.pathDetail.assignModal.error")));
    } finally { setSaving(false); submittingRef.current = false; }
  };

  const filteredMembers = members.filter((m) =>
    !search || (m.full_name || m.username || m.email || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredTeams = teams.filter((tm) =>
    !search || tm.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--lt-rgba-0-0-0-0-65, rgba(0,0,0,0.65))", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, width: "100%", maxWidth: 460, padding: 22, boxShadow: "0 20px 60px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5))" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>{t("enterprise.learning.pathDetail.assignModal.title")}</p>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
          {[["user", t("enterprise.learning.pathDetail.assignModal.userTab"), UsersIcon], ["team", t("enterprise.learning.pathDetail.assignModal.teamTab"), UserGroupIcon]].map(([key, label, Icon]) => (
            <button key={key} onClick={() => { setTab(key); setSearch(""); setSelectedUser(null); setSelectedTeam(null); }}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderBottom: `2px solid ${tab === key ? "var(--accent)" : "transparent"}`, color: tab === key ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: tab === key ? 600 : 400, fontSize: 12.5, cursor: "pointer", background: "transparent" }}>
              <Icon style={{ width: 13, height: 13 }} /> {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input placeholder={tab === "user" ? t("enterprise.learning.pathDetail.assignModal.searchMember") : t("enterprise.learning.pathDetail.assignModal.searchTeam")} value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 11px", color: "var(--text-primary)", fontSize: 12, outline: "none", marginBottom: 10 }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }} />

        {/* List */}
        <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 14 }} className="space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-5 h-5 border-2 rounded-full animate-spin" />
            </div>
          ) : tab === "user" ? (
            filteredMembers.length === 0 ? (
              <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>{t("enterprise.learning.pathDetail.assignModal.noMembers")}</p>
            ) : filteredMembers.map((m) => {
              const sel = selectedUser?.user === m.user;
              return (
                <button key={m.user} type="button" onClick={() => setSelectedUser(sel ? null : m)}
                  style={{ width: "100%", textAlign: "left", background: sel ? "var(--bg-accent)" : "var(--bg-elevated)", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, padding: "8px 11px", cursor: "pointer", transition: "all 150ms" }}>
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
              <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>{t("enterprise.learning.pathDetail.assignModal.noTeams")}</p>
            ) : filteredTeams.map((tm) => {
              const sel = selectedTeam?.id === tm.id;
              return (
                <button key={tm.id} type="button" onClick={() => setSelectedTeam(sel ? null : tm)}
                  style={{ width: "100%", textAlign: "left", background: sel ? "var(--bg-accent)" : "var(--bg-elevated)", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, padding: "9px 11px", cursor: "pointer", transition: "all 150ms" }}>
                  <div className="flex items-center gap-2">
                    <div style={{ background: sel ? "var(--accent)" : "rgba(59,130,246,0.12)", borderRadius: 5, padding: 5, flexShrink: 0 }}>
                      <UserGroupIcon style={{ width: 13, height: 13, color: sel ? "#fff" : "var(--lt-60a5fa, #60a5fa)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)" }}>{tm.name}</p>
                      <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{t("enterprise.learning.pathDetail.assignModal.memberCount", { n: tm.member_count ?? 0 })}{tm.business_unit_name ? ` · ${tm.business_unit_name}` : ""}</p>
                    </div>
                    {sel && <CheckIcon style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Due date */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 12, marginBottom: 5 }}>{t("enterprise.learning.pathDetail.assignModal.dueDate")} <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({t("enterprise.learning.paths.wizard.optional")})</span></p>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 11px", color: "var(--text-primary)", fontSize: 12, outline: "none", colorScheme: "dark" }}
            onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
            onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }} />
        </div>

        {error && <p style={{ color: "var(--lt-f87171, #f87171)", fontSize: 12, marginBottom: 10 }}>{error}</p>}
        {success && <p style={{ color: "var(--lt-4ade80, #4ade80)", fontSize: 12, marginBottom: 10 }}>{success}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.learning.pathDetail.assignModal.close")}</button>
          <button onClick={handleAssign} disabled={saving || (!selectedUser && !selectedTeam)} className="ank-btn-accent text-xs"
            style={{ opacity: saving || (!selectedUser && !selectedTeam) ? 0.6 : 1 }}>
            {saving ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <><UserGroupIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.pathDetail.assignModal.assign")}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function LearningPathDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const STATUS_CONFIG = useStatusConfig();

  const [path, setPath] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { activeCompanyId } = useEnterprise();

  const load = useCallback(async () => {
    try {
      const data = await learningApi.getLearningPath(id);
      setPath(data);
      setModules(data.modules || []);
    } catch {} finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const updated = await learningApi.publishPath(id);
      setPath(updated);
    } finally { setPublishing(false); }
  };

  const handleRemoveModule = (modId) => {
    setModules((prev) => prev.filter((m) => m.id !== modId));
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    setModules((prev) => {
      const arr = [...prev];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      return arr;
    });
  };

  const handleMoveDown = (index) => {
    setModules((prev) => {
      if (index >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
      return arr;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-7 h-7 border-2 rounded-full animate-spin" />
      </div>
    );
  }

  if (!path) {
    return (
      <div className="flex flex-col items-center py-24">
        <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>{t("enterprise.learning.pathDetail.notFound")}</p>
        <button onClick={() => navigate("/enterprise/learning/paths")} className="ank-btn-ghost text-xs mt-4">
          <ArrowLeftIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.pathDetail.back")}
        </button>
      </div>
    );
  }

  const sc = STATUS_CONFIG[path.status] || STATUS_CONFIG.draft;
  const totalMin = modules.reduce((sum, m) => sum + (m.estimated_duration_minutes || 0), 0);

  return (
    <div className="w-full space-y-5">
      {/* Back */}
      <button onClick={() => navigate("/enterprise/learning/paths")}
        style={{ color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 5, fontSize: 12, cursor: "pointer" }}
        className="hover:opacity-70 transition-opacity">
        <ArrowLeftIcon style={{ width: 13, height: 13 }} /> {t("enterprise.learning.pathDetail.backToPaths")}
      </button>

      {/* Header card */}
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
        {editing ? (
          <EditHeaderForm path={path}
            onSaved={(updated) => { setPath(updated); setEditing(false); }}
            onCancel={() => setEditing(false)} />
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div style={{ width: 42, height: 42, borderRadius: 8, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                {path.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 17 }}>{path.name}</h1>
                  <span style={{ background: sc.bg, color: sc.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>{sc.label}</span>
                </div>
                {path.description && (
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>{path.description}</p>
                )}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1.5">
                    <RectangleStackIcon style={{ width: 12, height: 12 }} />
                    {t("enterprise.learning.pathDetail.processCount", { count: modules.length, plural: modules.length !== 1 ? "s" : "" })}
                  </span>
                  {totalMin > 0 && (
                    <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1.5">
                      <ClockIcon style={{ width: 12, height: 12 }} />
                      {totalMin >= 60 ? `${Math.round(totalMin / 60)}h ${totalMin % 60}m` : `${totalMin} min`}
                    </span>
                  )}
                  {path.final_battery && (
                    <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1.5">
                      <CheckCircleIcon style={{ width: 12, height: 12 }} />
                      {t("enterprise.learning.pathDetail.finalBattery")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => setEditing(true)} className="ank-btn-ghost text-xs">
                <PencilIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.pathDetail.edit")}
              </button>
              <button onClick={() => setShowAssignModal(true)} className="ank-btn-ghost text-xs">
                <UserGroupIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.pathDetail.assign")}
              </button>
              {path.status === "draft" && (
                <button onClick={handlePublish} disabled={publishing} className="ank-btn-accent text-xs" style={{ opacity: publishing ? 0.7 : 1 }}>
                  {publishing ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircleIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.pathDetail.publish")}</>}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modules section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            {t("enterprise.learning.pathDetail.processesHeading", { count: modules.length })}
          </p>
          <button onClick={() => setShowAddModal(true)} className="ank-btn-ghost text-xs">
            <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.pathDetail.addProcess")}
          </button>
        </div>

        {modules.length === 0 ? (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}
            className="flex flex-col items-center py-12 text-center">
            <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <BookOpenIcon style={{ width: 22, height: 22, color: "var(--text-tertiary)" }} />
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600 }}>{t("enterprise.learning.pathDetail.noProcesses")}</p>
            <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 3 }}>{t("enterprise.learning.pathDetail.noProcessesMessage")}</p>
            <button onClick={() => setShowAddModal(true)} className="ank-btn-accent text-xs mt-4">
              <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.pathDetail.addProcess")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {modules.map((mod, idx) => (
              <ModuleRow key={mod.id} mod={mod} index={idx} total={modules.length}
                pathId={id}
                pathName={path.name}
                onRemoved={handleRemoveModule}
                onMoveUp={() => handleMoveUp(idx)}
                onMoveDown={() => handleMoveDown(idx)} />
            ))}
          </div>
        )}
      </div>

      {/* Assign modal */}
      {showAssignModal && (
        <AssignModal pathId={id} companyId={activeCompanyId} onClose={() => setShowAssignModal(false)} />
      )}

      {/* Add proceso modal */}
      {showAddModal && (
        <AddProcesoModal
          pathId={id}
          currentModuleIds={modules.map((m) => m.id)}
          onAdded={load}
          onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

export default LearningPathDetail;
