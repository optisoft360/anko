import React, { useEffect, useState, useRef, useCallback } from "react";
import { enumLabel, useKnowledgeEnumLabels } from "@/utils/enumLabel";
import { formatCalendarDate } from "@/utils/calendarDate";
import { apiErrorMessage } from "@/utils/apiError";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon, ClockIcon, CheckCircleIcon, PlayIcon,
  ExclamationCircleIcon, UserGroupIcon, UsersIcon,
  ArrowPathIcon, CheckIcon, XMarkIcon, RectangleStackIcon,
} from "@heroicons/react/24/outline";
import { learningApi, companyApi, teamsApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";

// ─── Status config ────────────────────────────────────────────────────────────

function useStatusMap() {
  const { t } = useLanguage();
  return {
    pending:     { bg: "rgba(255,255,255,0.08)", text: "#8B8B9C",  label: t("enterprise.learning.assignmentsManager.status.pending"),    Icon: ClockIcon },
    in_progress: { bg: "rgba(94,106,210,0.15)",  text: "#8B9CF4",  label: t("enterprise.learning.assignmentsManager.status.inProgress"), Icon: PlayIcon },
    completed:   { bg: "rgba(74,222,128,0.12)",  text: "#4ade80",  label: t("enterprise.learning.assignmentsManager.status.completed"), Icon: CheckCircleIcon },
    overdue:     { bg: "rgba(239,68,68,0.12)",   text: "#f87171",  label: t("enterprise.learning.assignmentsManager.status.overdue"),   Icon: ExclamationCircleIcon },
  };
}

function StatusPill({ status }) {
  const STATUS = useStatusMap();
  const s = STATUS[status] || STATUS.pending;
  const { Icon } = s;
  return (
    <span style={{ background: s.bg, color: s.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Icon style={{ width: 10, height: 10 }} /> {s.label}
    </span>
  );
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  return (
    <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#4ade80" : "var(--accent)", borderRadius: 2, transition: "width 300ms" }} />
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", background: active ? "var(--accent)" : "var(--bg-elevated)", color: active ? "#fff" : "var(--text-secondary)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`, transition: "all 150ms" }}>
      {label}
    </button>
  );
}

// ─── New Assignment Modal ─────────────────────────────────────────────────────

function NewAssignmentModal({ companyId, onCreated, onClose }) {
  const ENUMS = useKnowledgeEnumLabels();
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [contentType, setContentType] = useState("path"); // "path" | "module"
  const [paths, setPaths] = useState([]);
  const [modules, setModules] = useState([]);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null); // path or module
  const [tab, setTab] = useState("user");
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      learningApi.getPaths().then((d) => d.results || d || []),
      learningApi.getModules().then((d) => d.results || d || []),
      companyApi.getMembers(companyId, { status: "active" }).then((d) => d.results || d || []),
      teamsApi.list({ company_id: companyId }).then((d) => d.results || d || []),
    ]).then(([p, mod, m, tms]) => { setPaths(p); setModules(mod); setMembers(m); setTeams(tms); }).catch(() => {}).finally(() => setLoading(false));
  }, [companyId]);

  const submittingRef = useRef(false);
  const handleAssign = async () => {
    if (submittingRef.current) return; // no double submit
    submittingRef.current = true;
    setSaving(true); setError("");
    try {
      const due = dueDate || undefined;
      const duePay = due ? { due_date: due } : {};
      if (contentType === "path") {
        if (tab === "user" && selectedUser)
          await learningApi.assignPathToUser(selectedItem.id, { user_id: selectedUser.user, ...duePay });
        else if (tab === "team" && selectedTeam)
          await learningApi.assignPathToTeam(selectedItem.id, { team_id: selectedTeam.id, ...duePay });
        else { setError(t("enterprise.learning.assignmentsManager.modal.selectTarget")); setSaving(false); return; }
      } else {
        if (tab === "user" && selectedUser)
          await learningApi.assignModuleToUser(selectedItem.id, { user_id: selectedUser.user, ...duePay });
        else if (tab === "team" && selectedTeam)
          await learningApi.assignModuleToTeam(selectedItem.id, { team_id: selectedTeam.id, ...duePay });
        else { setError(t("enterprise.learning.assignmentsManager.modal.selectTarget")); setSaving(false); return; }
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, t("enterprise.learning.assignmentsManager.modal.assignError")));
    } finally { setSaving(false); submittingRef.current = false; }
  };

  const filteredMembers = members.filter((m) => !search || (m.full_name || m.username || m.email || "").toLowerCase().includes(search.toLowerCase()));
  const filteredTeams   = teams.filter((tm)  => !search || tm.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--lt-rgba-0-0-0-0-65, rgba(0,0,0,0.65))", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 10, width: "100%", maxWidth: 500, padding: 22, boxShadow: "0 20px 60px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5))", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button onClick={() => { setStep(1); setSelectedItem(null); setSelectedUser(null); setSelectedTeam(null); }}
                style={{ color: "var(--text-tertiary)", cursor: "pointer" }}>←</button>
            )}
            <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 14 }}>
              {step === 1 ? t("enterprise.learning.assignmentsManager.modal.whatToAssign") : t("enterprise.learning.assignmentsManager.modal.assignTitle", { name: selectedItem?.name })}
            </p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2].map((n) => (
            <React.Fragment key={n}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: step > n ? "#4ade80" : step === n ? "var(--accent)" : "var(--bg-elevated)", color: step >= n ? "#fff" : "var(--text-tertiary)", border: `1px solid ${step > n ? "#4ade80" : step === n ? "var(--accent)" : "var(--border)"}` }}>
                {step > n ? <CheckIcon style={{ width: 10, height: 10, strokeWidth: 3 }} /> : n}
              </div>
              {n < 2 && <div style={{ flex: 1, height: 1, background: step > n ? "rgba(74,222,128,0.4)" : "var(--border)" }} />}
            </React.Fragment>
          ))}
          <p style={{ color: "var(--text-tertiary)", fontSize: 11, marginLeft: 4 }}>
            {step === 1 ? t("enterprise.learning.assignmentsManager.modal.chooseContent") : t("enterprise.learning.assignmentsManager.modal.chooseRecipient")}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-6 h-6 border-2 rounded-full animate-spin" />
          </div>
        ) : step === 1 ? (
          /* ── Step 1: Pick type + item ── */
          <div>
            {/* Type tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 14 }}>
              {[["path", "Learning Path", RectangleStackIcon], ["module", t("enterprise.learning.assignmentsManager.modal.process"), CheckCircleIcon]].map(([key, label, Icon]) => (
                <button key={key} onClick={() => { setContentType(key); setSelectedItem(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderBottom: `2px solid ${contentType === key ? "var(--accent)" : "transparent"}`, color: contentType === key ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: contentType === key ? 600 : 400, fontSize: 12.5, cursor: "pointer", background: "transparent" }}>
                  <Icon style={{ width: 13, height: 13 }} /> {label}
                </button>
              ))}
            </div>

            <div style={{ maxHeight: 280, overflowY: "auto" }} className="space-y-1.5">
              {contentType === "path" ? (
                paths.length === 0 ? (
                  <p style={{ color: "var(--text-tertiary)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>{t("enterprise.learning.assignmentsManager.modal.noPaths")}</p>
                ) : paths.map((p) => {
                  const sel = selectedItem?.id === p.id && contentType === "path";
                  const sc = { draft: "#8B8B9C", published: "#4ade80", archived: "#f59e0b" }[p.status] || "#8B8B9C";
                  return (
                    <button key={p.id} type="button" onClick={() => setSelectedItem(sel ? null : p)}
                      style={{ width: "100%", textAlign: "left", background: sel ? "var(--bg-accent)" : "var(--bg-elevated)", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, padding: "10px 12px", cursor: "pointer", transition: "all 150ms" }}>
                      <div className="flex items-center gap-2">
                        <div style={{ background: sel ? "var(--accent)" : "var(--accent-muted)", borderRadius: 5, padding: 6, flexShrink: 0 }}>
                          <RectangleStackIcon style={{ width: 12, height: 12, color: sel ? "#fff" : "var(--accent)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</p>
                          <p style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>
                            {t("enterprise.learning.assignmentsManager.modal.processCount", { n: p.module_count ?? 0 })} · <span style={{ color: sc }}>{p.status}</span>
                          </p>
                        </div>
                        {sel && <CheckIcon style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />}
                      </div>
                    </button>
                  );
                })
              ) : (
                modules.length === 0 ? (
                  <p style={{ color: "var(--text-tertiary)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>{t("enterprise.learning.assignmentsManager.modal.noProcesses")}</p>
                ) : modules.map((mod) => {
                  const sel = selectedItem?.id === mod.id && contentType === "module";
                  const typeColors = { document: "#60a5fa", topic: "#a855f7", deck: "#f59e0b", battery: "#f87171" };
                  const tc = typeColors[mod.process_type] || "var(--text-tertiary)";
                  return (
                    <button key={mod.id} type="button" onClick={() => setSelectedItem(sel ? null : mod)}
                      style={{ width: "100%", textAlign: "left", background: sel ? "var(--bg-accent)" : "var(--bg-elevated)", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, padding: "10px 12px", cursor: "pointer", transition: "all 150ms" }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 26, height: 26, borderRadius: 5, background: sel ? "var(--accent)" : "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 10, color: sel ? "#fff" : tc, flexShrink: 0 }}>
                          {(mod.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)" }}>{mod.name}</p>
                          <p style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>
                            {mod.process_type || t("enterprise.learning.assignmentsManager.modal.process")}
                            {mod.difficulty ? ` · ${ENUMS.difficulty(mod.difficulty)}` : ""}
                            {mod.estimated_duration_minutes ? ` · ${mod.estimated_duration_minutes} min` : ""}
                          </p>
                        </div>
                        {sel && <CheckIcon style={{ width: 14, height: 14, color: "var(--accent)", flexShrink: 0 }} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.learning.assignmentsManager.modal.cancel")}</button>
              <button onClick={() => setStep(2)} disabled={!selectedItem} className="ank-btn-accent text-xs" style={{ opacity: !selectedItem ? 0.5 : 1 }}>
                {t("enterprise.learning.assignmentsManager.modal.next")}
              </button>
            </div>
          </div>
        ) : (
          /* ── Step 2: Pick target ── */
          <div>
            {/* Tabs user/team */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 12 }}>
              {[["user", t("enterprise.learning.assignmentsManager.modal.userTab"), UsersIcon], ["team", t("enterprise.learning.assignmentsManager.modal.teamTab"), UserGroupIcon]].map(([key, label, Icon]) => (
                <button key={key} onClick={() => { setTab(key); setSearch(""); setSelectedUser(null); setSelectedTeam(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", borderBottom: `2px solid ${tab === key ? "var(--accent)" : "transparent"}`, color: tab === key ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: tab === key ? 600 : 400, fontSize: 12.5, cursor: "pointer", background: "transparent" }}>
                  <Icon style={{ width: 13, height: 13 }} /> {label}
                </button>
              ))}
            </div>

            <input placeholder={tab === "user" ? t("enterprise.learning.assignmentsManager.modal.searchMember") : t("enterprise.learning.assignmentsManager.modal.searchTeam")} value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 11px", color: "var(--text-primary)", fontSize: 12, outline: "none", marginBottom: 10 }}
              onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
              onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }} />

            <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 14 }} className="space-y-1.5">
              {tab === "user" ? (
                filteredMembers.length === 0 ? (
                  <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>{t("enterprise.learning.assignmentsManager.modal.noMembers")}</p>
                ) : filteredMembers.map((m) => {
                  const sel = selectedUser?.user === m.user;
                  return (
                    <button key={m.user} type="button" onClick={() => setSelectedUser(sel ? null : m)}
                      style={{ width: "100%", textAlign: "left", background: sel ? "var(--bg-accent)" : "var(--bg-elevated)", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, padding: "8px 11px", cursor: "pointer", transition: "all 150ms" }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent-muted)", color: "var(--accent)", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {(m.full_name || m.username || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)" }}>{m.full_name || m.username}</p>
                          <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{m.email}</p>
                        </div>
                        {sel && <CheckIcon style={{ width: 13, height: 13, color: "var(--accent)", flexShrink: 0 }} />}
                      </div>
                    </button>
                  );
                })
              ) : (
                filteredTeams.length === 0 ? (
                  <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "12px 0" }}>{t("enterprise.learning.assignmentsManager.modal.noTeams")}</p>
                ) : filteredTeams.map((tm) => {
                  const sel = selectedTeam?.id === tm.id;
                  return (
                    <button key={tm.id} type="button" onClick={() => setSelectedTeam(sel ? null : tm)}
                      style={{ width: "100%", textAlign: "left", background: sel ? "var(--bg-accent)" : "var(--bg-elevated)", border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`, borderRadius: 6, padding: "9px 11px", cursor: "pointer", transition: "all 150ms" }}>
                      <div className="flex items-center gap-2">
                        <div style={{ background: sel ? "var(--accent)" : "rgba(59,130,246,0.12)", borderRadius: 5, padding: 5, flexShrink: 0 }}>
                          <UserGroupIcon style={{ width: 12, height: 12, color: sel ? "#fff" : "var(--lt-60a5fa, #60a5fa)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)" }}>{tm.name}</p>
                          <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{t("enterprise.learning.assignmentsManager.modal.memberCount", { n: tm.member_count ?? 0 })}</p>
                        </div>
                        {sel && <CheckIcon style={{ width: 13, height: 13, color: "var(--accent)", flexShrink: 0 }} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Due date */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 12, marginBottom: 5 }}>
                {t("enterprise.learning.assignmentsManager.modal.dueDate")} <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({t("enterprise.learning.paths.wizard.optional")})</span>
              </p>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "7px 11px", color: "var(--text-primary)", fontSize: 12, outline: "none", colorScheme: "dark" }} />
            </div>

            {error && <p style={{ color: "var(--lt-f87171, #f87171)", fontSize: 12, marginBottom: 10 }}>{error}</p>}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.learning.assignmentsManager.modal.cancel")}</button>
              <button onClick={handleAssign}
                disabled={saving || (tab === "user" ? !selectedUser : !selectedTeam)}
                className="ank-btn-accent text-xs"
                style={{ opacity: saving || (tab === "user" ? !selectedUser : !selectedTeam) ? 0.6 : 1 }}>
                {saving ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <><UserGroupIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.assignmentsManager.modal.assign")}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Assignment Row ───────────────────────────────────────────────────────────

// 18: one column definition for the header and every row (path, assignee, status,
// progress, due date). Rows always render the five cells so a missing progress or
// due date never shifts STATUS under PROGRESS.
const COLUMN_FLEX = ["2 1 160px", "2 1 130px", "1 0 100px", "2 1 120px", "1 0 90px"];
const EMPTY_CELL = <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>—</span>;

function AssignmentRow({ a, onClick, variant = "row" }) {
  const { t, language } = useLanguage();
  const pct = a.progress?.percent_required ?? a.progress?.percent_total ?? 0;
  const completedMods = a.progress?.completed_modules ?? 0;
  const totalMods = a.progress?.total_modules ?? 0;
  const dueStr = formatCalendarDate(a.due_date, language);
  const isOverdue = a.is_overdue || a.status === "overdue";

  const pathName = a.learning_path_name || a.path_name || a.name || "—";
  const assignee = a.user_username || a.user
    ? (a.full_name || a.user_username || `ID ${a.user}`)
    : (a.team_name || a.team ? (a.team_name || t("enterprise.learning.assignmentsManager.row.team", { id: a.team })) : null);
  const AssigneeIcon = a.user_username || a.user ? UsersIcon : UserGroupIcon;

  if (variant === "card") return (
    <div data-testid="assignment-card" onClick={onClick}
      style={{ background: "var(--bg-surface)", border: `1px solid ${isOverdue ? "rgba(239,68,68,0.3)" : "var(--border)"}`, borderRadius: 10, padding: "14px", cursor: onClick ? "pointer" : "default" }}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-semibold leading-snug [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden" style={{ color: "var(--text-primary)" }} title={pathName}>
          {pathName}
        </p>
        <span className="shrink-0"><StatusPill status={isOverdue ? "overdue" : a.status} /></span>
      </div>
      <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
        <AssigneeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
        <span className="shrink-0" style={{ color: "var(--text-tertiary)" }}>{t("enterprise.learning.assignmentsManager.columns.assignedTo")}:</span>
        <span className="truncate">{assignee || "—"}</span>
      </p>
      {totalMods > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1"><ProgressBar value={pct} /></div>
          <span className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color: "var(--text-tertiary)" }}>{completedMods}/{totalMods}</span>
        </div>
      )}
      {dueStr && (
        <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: isOverdue ? "var(--lt-f87171, #f87171)" : "var(--text-tertiary)" }}>
          <ClockIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.assignmentsManager.columns.dueDate")}: {dueStr}
        </p>
      )}
      {a.assigned_by_username && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>{t("enterprise.learning.assignmentsManager.row.by", { name: a.assigned_by_username })}</p>
      )}
    </div>
  );

  return (
    <div style={{ background: "var(--bg-surface)", border: `1px solid ${isOverdue ? "rgba(239,68,68,0.3)" : "var(--border)"}`, borderRadius: 7, padding: "12px 16px", cursor: onClick ? "pointer" : "default", transition: "border-color 150ms, background 150ms" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-surface)"; }}
      onClick={onClick}>
      <div className="flex items-center gap-3">
        {/* Path */}
        <div style={{ flex: COLUMN_FLEX[0], minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }} className="truncate">
            {a.learning_path_name || a.path_name || a.name || "—"}
          </p>
          {a.assigned_by_username && (
            <p style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>{t("enterprise.learning.assignmentsManager.row.by", { name: a.assigned_by_username })}</p>
          )}
        </div>

        {/* Assignee */}
        <div style={{ flex: COLUMN_FLEX[1], minWidth: 0 }}>
          {a.user_username || a.user ? (
            <div className="flex items-center gap-1.5">
              <UsersIcon style={{ width: 11, height: 11, color: "var(--text-tertiary)" }} />
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }} className="truncate">{a.full_name || a.user_username || `ID ${a.user}`}</p>
            </div>
          ) : a.team_name || a.team ? (
            <div className="flex items-center gap-1.5">
              <UserGroupIcon style={{ width: 11, height: 11, color: "var(--lt-60a5fa, #60a5fa)" }} />
              <p style={{ fontSize: 12, color: "var(--text-secondary)" }} className="truncate">{a.team_name || t("enterprise.learning.assignmentsManager.row.team", { id: a.team })}</p>
            </div>
          ) : EMPTY_CELL}
        </div>

        {/* Status */}
        <div style={{ flex: COLUMN_FLEX[2], minWidth: 0 }}>
          <StatusPill status={isOverdue ? "overdue" : a.status} />
        </div>

        {/* Progress */}
        <div style={{ flex: COLUMN_FLEX[3], minWidth: 0 }}>
          {totalMods > 0 ? (
            <div className="flex items-center gap-2">
              <ProgressBar value={pct} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", flexShrink: 0 }}>
                {completedMods}/{totalMods}
              </span>
            </div>
          ) : EMPTY_CELL}
        </div>

        {/* Due date */}
        <div style={{ flex: COLUMN_FLEX[4], minWidth: 0 }}>
          {dueStr ? (
            <p style={{ fontSize: 11, color: isOverdue ? "var(--lt-f87171, #f87171)" : "var(--text-tertiary)" }} className="flex items-center gap-1">
              <ClockIcon style={{ width: 10, height: 10 }} /> {dueStr}
            </p>
          ) : EMPTY_CELL}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AssignmentsManager() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { activeCompanyId, role: myRole, isPlatformAdmin } = useEnterprise();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    learningApi.getAssignments(params)
      .then((d) => setAssignments(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCompanyId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = assignments;

  const canAssign = ["owner", "admin", "manager", "trainer"].includes(myRole) || isPlatformAdmin;

  const columnHeaders = [
    t("enterprise.learning.assignmentsManager.columns.learningPath"),
    t("enterprise.learning.assignmentsManager.columns.assignedTo"),
    t("enterprise.learning.assignmentsManager.columns.status"),
    t("enterprise.learning.assignmentsManager.columns.progress"),
    t("enterprise.learning.assignmentsManager.columns.dueDate"),
  ];

  return (
    <div className="w-full space-y-5">
      {showModal && (
        <NewAssignmentModal companyId={activeCompanyId} onCreated={load} onClose={() => setShowModal(false)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 style={{ color: "var(--text-primary)" }} className="text-xl font-bold">{t("enterprise.learning.assignmentsManager.title")}</h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-0.5">
            {t("enterprise.learning.assignmentsManager.subtitle")}
          </p>
        </div>
        {canAssign && (
          <button onClick={() => setShowModal(true)} className="ank-btn-accent text-xs">
            <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.assignmentsManager.newAssignment")}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 [&>button]:shrink-0 [&>button]:min-h-[40px] md:[&>button]:min-h-0">
        <FilterChip label={t("enterprise.learning.assignmentsManager.filters.all")} active={statusFilter === ""} onClick={() => setStatusFilter("")} />
        <FilterChip label={t("enterprise.learning.assignmentsManager.status.pending")} active={statusFilter === "pending"} onClick={() => setStatusFilter("pending")} />
        <FilterChip label={t("enterprise.learning.assignmentsManager.status.inProgress")} active={statusFilter === "in_progress"} onClick={() => setStatusFilter("in_progress")} />
        <FilterChip label={t("enterprise.learning.assignmentsManager.status.completed")} active={statusFilter === "completed"} onClick={() => setStatusFilter("completed")} />
        <FilterChip label={t("enterprise.learning.assignmentsManager.status.overdue")} active={statusFilter === "overdue"} onClick={() => setStatusFilter("overdue")} />
      </div>

      {/* Column labels */}
      {!loading && filtered.length > 0 && (
        <div data-testid="assignments-header" className="hidden md:flex" style={{ gap: 12, padding: "0 17px" }}>
          {columnHeaders.map((h, i) => (
            <p key={h} style={{ flex: COLUMN_FLEX[i], minWidth: 0, fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {h}
            </p>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 56, background: "var(--bg-elevated)", borderRadius: 7 }} className="animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: 14, display: "inline-flex", marginBottom: 12 }}>
            <RectangleStackIcon style={{ width: 24, height: 24, color: "var(--text-tertiary)" }} />
          </div>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>{t("enterprise.learning.assignmentsManager.empty")}</p>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>
            {t("enterprise.learning.assignmentsManager.emptyMessage")}
          </p>
          {canAssign && (
            <button onClick={() => setShowModal(true)} className="ank-btn-accent text-xs mt-4">
              <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.assignmentsManager.newAssignment")}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Phones: cards. md and up: the original rows. */}
          <div className="space-y-2 md:hidden">
            {filtered.map((a) => <AssignmentRow key={a.id} a={a} variant="card" />)}
          </div>
          <div className="hidden space-y-2 md:block">
            {filtered.map((a) => (
              <AssignmentRow key={a.id} a={a} />
            ))}
          </div>
        </>
      )}

      {!loading && filtered.length > 0 && (
        <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
          {t("enterprise.learning.assignmentsManager.count", { count: filtered.length, plural: filtered.length !== 1 ? (language === "es" ? "es" : "s") : "" })}
        </p>
      )}
    </div>
  );
}

export default AssignmentsManager;
