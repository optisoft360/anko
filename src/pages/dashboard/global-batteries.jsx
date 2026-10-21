import React, { useEffect, useMemo, useState, useCallback } from "react";
import { AppPagination } from "@/components/AppPagination";
import { useMaterialTailwindController } from "@/context";
import { PencilIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/solid";
import projectService from "@/services/projectService";
import { useLanguage } from "@/context/language-context";

/* ── Design tokens ── */
const INPUT = {
  width: "100%", background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))",
  borderRadius: 10, padding: "10px 13px", fontSize: 13, color: "var(--lt-f1f5f9, #F1F5F9)",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
};
const SELECT_S = {
  ...INPUT, appearance: "none", cursor: "pointer",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%2364748B' viewBox='0 0 20 20'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: 16, paddingRight: 36,
};
const LBL = { fontSize: 11, fontWeight: 700, color: "var(--lt-94a3b8, #94A3B8)", display: "block", marginBottom: 5, letterSpacing: "0.03em" };
const focusIn  = (e) => { e.target.style.borderColor = "rgba(99,102,241,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; };
const focusOut = (e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; };

function Spin({ size = 18 }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", border: "2px solid var(--lt-rgba-255-255-255-0-15, rgba(255,255,255,0.15))", borderTopColor: "#818CF8" }} className="animate-spin" />;
}

function StatusBadge({ status }) {
  const cfg = status === "Ready"
    ? { bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)", color: "var(--lt-4ade80, #4ADE80)" }
    : { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.25)", color: "var(--lt-94a3b8, #94A3B8)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: 999, background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: "0.04em" }}>
      {status}
    </span>
  );
}

function DiffBadge({ diff }) {
  const cfg = diff === "Easy"
    ? { bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)",   color: "var(--lt-4ade80, #4ADE80)" }
    : diff === "Hard"
    ? { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   color: "var(--lt-f87171, #F87171)" }
    : { bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)", color: "#FCD34D" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 9px", borderRadius: 999, background: cfg.bg, border: `1px solid ${cfg.border}`, fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: "0.04em" }}>
      {diff || "Medium"}
    </span>
  );
}

export function GlobalBatteries() {
  const { t, language } = useLanguage();
  const [controller] = useMaterialTailwindController();
  void controller;

  const [batteries, setBatteries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rules, setRules] = useState([]);
  const [topics, setTopics] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [loadingBatteries, setLoadingBatteries] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRules, setLoadingRules] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);

  const [error, setError] = useState(null);
  const [rowBusy, setRowBusy] = useState({});
  const setBusy = (batteryId, value) => setRowBusy((p) => ({ ...p, [batteryId]: value }));

  const [editOpen, setEditOpen] = useState(false);
  const [editBattery, setEditBattery] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", status: "Draft", difficulty: "Medium", rule: null });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBattery, setDeleteBattery] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await projectService.getProjects();
      setProjects(Array.isArray(data) ? data : data?.results || []);
    } catch { setProjects([]); } finally { setLoadingProjects(false); }
  };

  const fetchTopics = async () => {
    try {
      setLoadingTopics(true);
      const data = await projectService.getTopics();
      setTopics(Array.isArray(data) ? data : data?.results || []);
    } catch { setTopics([]); } finally { setLoadingTopics(false); }
  };

  const fetchRules = async () => {
    try {
      setLoadingRules(true);
      const data = await projectService.getAllRules?.();
      if (data) { setRules(Array.isArray(data) ? data : data?.results || []); return; }
      const projs = Array.isArray(projects) && projects.length ? projects : (await projectService.getProjects());
      const projsList = Array.isArray(projs) ? projs : projs?.results || [];
      const all = [];
      for (const p of projsList) {
        try { const r = await projectService.getProjectRules(p.id); all.push(...(Array.isArray(r) ? r : r?.results || [])); } catch { }
      }
      const map = new Map();
      all.forEach((r) => map.set(r.id, r));
      setRules(Array.from(map.values()));
    } catch { setRules([]); } finally { setLoadingRules(false); }
  };

  const fetchBatteries = useCallback(async () => {
    try {
      setLoadingBatteries(true); setError(null);
      const data = await projectService.getAllBatteries(page, pageSize);
      const list = Array.isArray(data) ? data : data?.results || [];
      setBatteries(list);
      setTotalCount(typeof data?.count === "number" ? data.count : list.length);
    } catch (e) {
      setBatteries([]); setTotalCount(0);
      setError(e?.error || e?.detail || "Failed to load batteries");
    } finally { setLoadingBatteries(false); }
  }, [page, pageSize]);

  useEffect(() => { fetchProjects(); fetchTopics(); fetchRules(); }, []);
  useEffect(() => { fetchBatteries(); }, [fetchBatteries]);

  const projectNameById = useMemo(() => { const m = new Map(); (projects || []).forEach(p => m.set(p.id, p.title || p.name || `#${p.id}`)); return m; }, [projects]);
  const ruleNameById    = useMemo(() => { const m = new Map(); (rules   || []).forEach(r => m.set(r.id, r.name  || `Rule #${r.id}`)); return m; }, [rules]);
  const topicNameById   = useMemo(() => { const m = new Map(); (topics  || []).forEach(t => m.set(t.id, t.name  || `Topic #${t.id}`)); return m; }, [topics]);

  const getProjectName      = (id) => projectNameById.get(id) || (id ? `Project #${id}` : "—");
  const getRuleName         = (id) => ruleNameById.get(id)    || (id ? `Rule #${id}` : "Unknown");
  const getTopicName        = (id) => id ? (topicNameById.get(id) || `Topic #${id}`) : "Global";
  const getBatteryProjectId = (b) => b?.projectId ?? b?.project ?? b?.project_id ?? null;
  const getBatteryRuleId    = (b) => b?.ruleId ?? b?.rule ?? b?.courseId ?? b?.course_id ?? null;
  const getBatteryStatus    = (b) => b?.status ?? "Draft";
  const getBatteryDifficulty = (b) => b?.difficulty ?? "Medium";
  const getBatteryQuestionsCount = (b) => {
    if (typeof b?.question_count === "number") return b.question_count;
    if (typeof b?.questionsCount  === "number") return b.questionsCount;
    if (typeof b?.questions_count === "number") return b.questions_count;
    if (Array.isArray(b?.questions)) return b.questions.length;
    if (Array.isArray(b?.questions_rel)) return b.questions_rel.length;
    return 0;
  };
  const getRuleTopicScopeId = (ruleId) => { const r = (rules || []).find(x => x.id === ruleId); return r?.topic_scope ?? r?.topicScope ?? null; };

  const openEdit = (battery) => {
    setEditBattery(battery);
    setEditForm({ name: battery?.name || "", status: getBatteryStatus(battery) || "Draft", difficulty: getBatteryDifficulty(battery) || "Medium", rule: getBatteryRuleId(battery) });
    setEditOpen(true);
  };
  const closeEdit = () => { if (savingEdit) return; setEditOpen(false); setEditBattery(null); };

  const saveEdit = async () => {
    if (!editBattery?.id) return;
    const name = (editForm.name || "").trim();
    if (!name) { setError("Battery name is required."); return; }
    setSavingEdit(true); setBusy(editBattery.id, true); setError(null);
    try {
      await projectService.updateBattery(editBattery.id, { name, status: editForm.status, difficulty: editForm.difficulty, rule: editForm.rule || null });
      setEditOpen(false); setEditBattery(null); await fetchBatteries();
    } catch (e) { setError(e?.detail || e?.error || "Failed to update battery"); }
    finally { setSavingEdit(false); setBusy(editBattery.id, false); }
  };

  const openDelete   = (battery) => { setDeleteBattery(battery); setDeleteOpen(true); };
  const closeDelete  = () => { if (deleting) return; setDeleteOpen(false); setDeleteBattery(null); };
  const confirmDelete = async () => {
    if (!deleteBattery?.id) return;
    setDeleting(true); setBusy(deleteBattery.id, true); setError(null);
    try {
      await projectService.deleteBattery(deleteBattery.id);
      setDeleteOpen(false); setDeleteBattery(null); await fetchBatteries();
    } catch (e) { setError(e?.detail || e?.error || "Failed to delete battery"); }
    finally { setDeleting(false); setBusy(deleteBattery.id, false); }
  };

  const isLoading = loadingProjects || loadingRules || loadingTopics || loadingBatteries;
  const COLS = [t("global.batteries.table.name"), t("project_detail.docs.table.status"), t("global.batteries.table.difficulty"), t("global.batteries.table.project"), t("global.batteries.table.rule"), t("global.batteries.table.topic"), t("global.batteries.table.questions"), t("global.batteries.table.actions")];

  return (
    <div style={{ marginTop: 48, display: "flex", flexDirection: "column" }}>

      {/* ── Main Card ── */}
      <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px var(--lt-rgba-0-0-0-0-4, rgba(0,0,0,0.4))" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", letterSpacing: "-0.01em" }}>{t("global.batteries.title")}</p>
        </div>

        {error && (
          <div style={{ margin: "12px 24px 0", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ fontSize: 12, color: "#FCA5A5" }}>{error}</p>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 0", gap: 14 }}>
              <Spin size={28} />
              <span style={{ fontSize: 11, color: "var(--lt-475569, #475569)" }}>{t("global.batteries.loading")}</span>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))" }}>
                  {COLS.map(col => (
                    <th key={col} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batteries.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--lt-475569, #475569)" }}>{t("global.batteries.no_batteries")}</td></tr>
                ) : batteries.map((b, key) => {
                  const projectId = getBatteryProjectId(b);
                  const ruleId = getBatteryRuleId(b);
                  const topicScopeId = getRuleTopicScopeId(ruleId);
                  const status = getBatteryStatus(b);
                  const difficulty = getBatteryDifficulty(b);
                  const questionsCount = getBatteryQuestionsCount(b);
                  const busy = !!rowBusy[b.id];
                  return (
                    <tr key={b.id} style={{ borderBottom: key < batteries.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", transition: "background 0.1s" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "12px 20px", fontSize: 12, fontWeight: 700, color: "var(--lt-e2e8f0, #E2E8F0)" }}>{b.name}</td>
                      <td style={{ padding: "12px 20px" }}><StatusBadge status={status} /></td>
                      <td style={{ padding: "12px 20px" }}><DiffBadge diff={difficulty} /></td>
                      <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--lt-94a3b8, #94A3B8)", fontWeight: 600 }}>{getProjectName(projectId)}</td>
                      <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--lt-94a3b8, #94A3B8)" }}>{getRuleName(ruleId)}</td>
                      <td style={{ padding: "12px 20px", fontSize: 12, color: "var(--lt-94a3b8, #94A3B8)" }}>{getTopicName(topicScopeId)}</td>
                      <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 800, color: "var(--lt-818cf8, #818CF8)" }}>{questionsCount}</td>
                      <td style={{ padding: "12px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button onClick={() => openEdit(b)} disabled={busy} title={language === "es" ? "Editar" : "Edit"}
                            style={{ width: 30, height: 30, borderRadius: 8, background: "none", border: "none", cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", transition: "all 0.15s", opacity: busy ? 0.4 : 1 }}
                            onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.color = "#818CF8"; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748B"; }}>
                            <PencilIcon style={{ width: 14, height: 14 }} />
                          </button>
                          <button onClick={() => openDelete(b)} disabled={busy} title={language === "es" ? "Eliminar" : "Delete"}
                            style={{ width: 30, height: 30, borderRadius: 8, background: "none", border: "none", cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B", transition: "all 0.15s", opacity: busy ? 0.4 : 1 }}
                            onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.color = "#F87171"; } }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#64748B"; }}>
                            <TrashIcon style={{ width: 14, height: 14 }} />
                          </button>
                          {busy && <Spin size={14} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Pagination ── */}
      {/* bottom-14 on mobile clears the fixed MobileTabBar (56px, z-[9000]) below
          md; left-0 there too since the sidebar is off-canvas on mobile. */}
      <div className="fixed bottom-14 right-0 left-0 md:bottom-0 md:left-[var(--sidebar-w)] px-4 py-2.5 md:pr-[88px] md:pl-8 md:py-2.5"
        style={{ zIndex: 30, background: "var(--lt-footer, rgba(6,13,26,0.92))", backdropFilter: "blur(12px)", borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", transition: "left 0.3s" }}>
        <AppPagination
          page={page} pageSize={pageSize} totalCount={totalCount}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(s) => { setPageSize(Number(s)); setPage(1); }}
          disabled={loadingBatteries}
        />
      </div>

      {/* ── Edit Modal ── */}
      {editOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--lt-rgba-0-0-0-0-78, rgba(0,0,0,0.78))", backdropFilter: "blur(5px)" }}
          onClick={closeEdit}>
          <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 40px 100px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))", overflow: "hidden", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 3, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)", flexShrink: 0 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)" }}>{language === "es" ? "Editar Batería" : "Edit Battery"}</p>
              <button onClick={closeEdit} disabled={savingEdit}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lt-475569, #475569)", padding: 4, display: "flex" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#94A3B8"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#475569"}>
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={LBL}>{language === "es" ? "Nombre" : "Name"}</label>
                <input style={INPUT} value={editForm.name} onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={language === "es" ? "Nombre de la batería" : "Battery name"} onFocus={focusIn} onBlur={focusOut} />
              </div>
              <div>
                <label style={LBL}>{t("project_detail.docs.table.status")}</label>
                <select style={SELECT_S} value={editForm.status} onChange={(e) => setEditForm(p => ({ ...p, status: e.target.value }))} onFocus={focusIn} onBlur={focusOut}>
                  <option value="Draft" style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>{language === "es" ? "Borrador" : "Draft"}</option>
                  <option value="Ready" style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>{language === "es" ? "Listo" : "Ready"}</option>
                </select>
              </div>
              <div>
                <label style={LBL}>{t("global.batteries.table.difficulty")}</label>
                <select style={SELECT_S} value={editForm.difficulty} onChange={(e) => setEditForm(p => ({ ...p, difficulty: e.target.value }))} onFocus={focusIn} onBlur={focusOut}>
                  <option value="Easy"   style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>{language === "es" ? "Fácil" : "Easy"}</option>
                  <option value="Medium" style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>{language === "es" ? "Medio" : "Medium"}</option>
                  <option value="Hard"   style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>{language === "es" ? "Difícil" : "Hard"}</option>
                </select>
              </div>
              <div>
                <label style={LBL}>{t("global.batteries.table.rule")}</label>
                <select style={SELECT_S} value={editForm.rule ? String(editForm.rule) : "null"} onChange={(e) => setEditForm(p => ({ ...p, rule: e.target.value === "null" ? null : Number(e.target.value) }))} onFocus={focusIn} onBlur={focusOut}>
                  <option value="null" style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>{language === "es" ? "Sin regla" : "No rule"}</option>
                  {(rules || []).map(r => <option key={r.id} value={String(r.id)} style={{ background: "var(--lt-0f172a, #0F172A)", color: "var(--lt-f1f5f9, #F1F5F9)" }}>{r.name}</option>)}
                </select>
              </div>
              {editBattery?.id && (
                <p style={{ fontSize: 11, color: "var(--lt-334155, #334155)" }}>Battery ID: {editBattery.id}</p>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", flexShrink: 0 }}>
              <button onClick={closeEdit} disabled={savingEdit}
                style={{ padding: "9px 18px", borderRadius: 10, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button onClick={saveEdit} disabled={savingEdit}
                style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #818CF8)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: savingEdit ? "default" : "pointer", opacity: savingEdit ? 0.7 : 1, boxShadow: "0 2px 12px rgba(99,102,241,0.35)" }}>
                {savingEdit ? (language === "es" ? "Guardando..." : "Saving...") : (language === "es" ? "Guardar" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--lt-rgba-0-0-0-0-78, rgba(0,0,0,0.78))", backdropFilter: "blur(5px)" }}
          onClick={closeDelete}>
          <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 40px 100px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ height: 3, background: "linear-gradient(90deg, #EF4444, #F87171)" }} />
            <div style={{ padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <TrashIcon style={{ width: 18, height: 18, color: "var(--lt-f87171, #F87171)" }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)" }}>{language === "es" ? "Eliminar Batería" : "Delete Battery"}</p>
              </div>
              <p style={{ fontSize: 13, color: "var(--lt-94a3b8, #94A3B8)", lineHeight: 1.6 }}>
                {language === "es" ? "¿Estás seguro de que quieres eliminar " : "Are you sure you want to delete "}
                <span style={{ fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)" }}>{deleteBattery?.name}</span>?
              </p>
              <p style={{ fontSize: 11, color: "var(--lt-475569, #475569)", marginTop: 6 }}>
                {language === "es" ? "Esta acción no se puede deshacer." : "This action cannot be undone."}
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "12px 24px 20px", borderTop: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
              <button onClick={closeDelete} disabled={deleting}
                style={{ padding: "9px 18px", borderRadius: 10, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", color: "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, #EF4444, #F87171)", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.7 : 1, boxShadow: "0 2px 12px rgba(239,68,68,0.35)" }}>
                {deleting ? (language === "es" ? "Eliminando..." : "Deleting...") : (language === "es" ? "Eliminar" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GlobalBatteries;
