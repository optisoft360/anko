import { formatDate } from "@/utils/calendarDate";
import React, { useEffect, useState } from "react";
import { PlusIcon, RectangleStackIcon, XMarkIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { learningApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton } from "../../components/LoadingSkeleton";
import { apiErrorMessage } from "@/utils/apiError";

/** Payload expected by POST /training-programs/{id}/publish/. */
export function buildPublishVersionPayload(selectedPath, notes) {
  return { learning_path_id: Number(selectedPath), notes: notes || "" };
}

const STATUS_TONE = {
  draft:     { bg: "rgba(255,255,255,0.06)", text: "#8B8B9C" },
  published: { bg: "rgba(74,222,128,0.12)",  text: "#4ade80" },
  archived:  { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b" },
};

const INPUT = {
  width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#F1F5F9", outline: "none", boxSizing: "border-box",
};

function NewProgramForm({ onCreated, onCancel }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError(t("enterprise.learning.trainingPrograms.nameRequired")); return; }
    setSaving(true);
    setError("");
    try {
      const created = await learningApi.createProgram({ name: form.name.trim(), description: form.description.trim() });
      onCreated(created);
    } catch (err) {
      setError(err?.detail || err?.name?.[0] || t("enterprise.learning.trainingPrograms.createError"));
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: 20 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <p style={{ fontWeight: 700, color: "#C7D2FE", fontSize: 14 }}>{t("enterprise.learning.trainingPrograms.newProgram")}</p>
        <button type="button" onClick={onCancel} style={{ color: "#818CF8", background: "none", border: "none", cursor: "pointer" }}>
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 5 }}>{t("enterprise.learning.trainingPrograms.name")} *</label>
        <input style={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 5 }}>{t("enterprise.learning.trainingPrograms.description")}</label>
        <textarea rows={2} style={{ ...INPUT, resize: "vertical" }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      {error && <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="ank-btn-ghost text-xs">{t("enterprise.learning.trainingPrograms.cancel")}</button>
        <button type="submit" disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? t("enterprise.learning.trainingPrograms.creating") : t("enterprise.learning.trainingPrograms.createProgram")}
        </button>
      </div>
    </form>
  );
}

function PublishVersionModal({ program, onClose, onPublished }) {
  const { t } = useLanguage();
  const [paths, setPaths] = useState([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    learningApi.getPaths({ status: "published" })
      .then((d) => setPaths(d.results || d || []))
      .catch(() => {});
  }, []);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!selectedPath) { setError(t("enterprise.learning.trainingPrograms.selectPath")); return; }
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await learningApi.publishProgram(program.id, buildPublishVersionPayload(selectedPath, notes));
      onPublished();
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, t("enterprise.learning.trainingPrograms.publishError")));
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "100%", maxWidth: 440, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }} className="space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{t("enterprise.learning.trainingPrograms.publishModal.title")}</p>
          <button onClick={onClose} style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          {t("enterprise.learning.trainingPrograms.publishModal.hint")}
        </p>
        <form onSubmit={handlePublish} className="space-y-4">
          <select style={{ ...INPUT, cursor: "pointer" }} value={selectedPath} onChange={(e) => { setSelectedPath(e.target.value); setError(""); }}>
            <option value="">{t("enterprise.learning.trainingPrograms.publishModal.selectPlaceholder")}</option>
            {paths.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <textarea rows={2} placeholder={t("enterprise.learning.trainingPrograms.publishModal.releaseNotes")} style={{ ...INPUT, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <p style={{ fontSize: 12, color: "#f87171" }}>{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.learning.trainingPrograms.cancel")}</button>
            <button type="submit" disabled={saving} className="ank-btn-accent text-xs" style={{ background: "linear-gradient(135deg, #22C55E, #4ade80)", opacity: saving ? 0.7 : 1 }}>
              <CheckBadgeIcon className="h-3.5 w-3.5" /> {saving ? t("enterprise.learning.trainingPrograms.publishModal.publishing") : t("enterprise.learning.trainingPrograms.publishModal.publishVersion")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProgramCard({ program, onPublishVersion }) {
  const { t, language } = useLanguage();
  const hasAI = program.metadata?.knowledge_source_id;
  const [expanded, setExpanded] = useState(false);
  const [versions, setVersions] = useState(program.versions || null);
  const currentNumber = program.current_version_number ?? program.versions?.find((v) => v.is_current)?.version_number;
  const versionCount = program.version_count ?? program.versions?.length ?? 0;

  const toggleHistory = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      learningApi.getProgramVersions(program.id)
        .then((d) => setVersions(Array.isArray(d) ? d : d.results || []))
        .catch(() => setVersions([]));
    }
  };
  const tone = STATUS_TONE[program.status] || STATUS_TONE.draft;

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: 18 }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div style={{ padding: 8, background: "rgba(192,132,252,0.12)", borderRadius: 8, marginTop: 2, flexShrink: 0 }}>
              <RectangleStackIcon style={{ width: 18, height: 18, color: "#C084FC" }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{program.name}</p>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: tone.bg, color: tone.text }}>
                  {program.status}
                </span>
                {hasAI && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: "rgba(192,132,252,0.12)", color: "#C084FC" }}>
                    <SparklesIcon style={{ width: 10, height: 10 }} /> AI
                  </span>
                )}
              </div>
              {program.description && (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 3 }}>{program.description}</p>
              )}
              <div className="flex gap-3 mt-1.5">
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t("enterprise.learning.trainingPrograms.versionCount", { n: versionCount })}</span>
                {currentNumber != null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80" }}>{t("enterprise.learning.trainingPrograms.currentVersion", { n: currentNumber })}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => onPublishVersion(program)}
              style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <CheckBadgeIcon style={{ width: 13, height: 13 }} /> {t("enterprise.learning.trainingPrograms.newVersion")}
            </button>
            {versionCount > 0 && (
              <button onClick={toggleHistory}
                style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", cursor: "pointer" }}>
                {t("enterprise.learning.trainingPrograms.history")}
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--border)", background: "var(--bg-app)", padding: "12px 18px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{t("enterprise.learning.trainingPrograms.versionHistory")}</p>
          <div className="space-y-2">
            {versions === null && <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>…</p>}
            {(versions || []).map((v) => (
              <div key={v.id} className="flex items-center gap-3 flex-wrap" style={{ fontSize: 12 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, background: v.is_current ? "#22C55E" : "var(--bg-elevated)", color: v.is_current ? "#fff" : "var(--text-tertiary)" }}>
                  {v.version_number}
                </span>
                <span style={{ color: "var(--text-secondary)" }}>{v.learning_path_name || "—"}</span>
                {v.is_current && <span style={{ fontSize: 10, fontWeight: 700, color: "#4ade80" }}>{t("enterprise.learning.trainingPrograms.current")}</span>}
                {v.notes && <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>· {v.notes}</span>}
                {v.created_by_username && <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>· {v.created_by_username}</span>}
                <span style={{ color: "var(--text-tertiary)", fontSize: 11, marginLeft: "auto" }}>{v.created_at ? formatDate(v.created_at, language) : "—"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TrainingPrograms() {
  const { t } = useLanguage();
  const { activeCompanyId } = useEnterprise();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);

  const load = () => {
    setLoading(true);
    learningApi.getPrograms()
      .then((d) => setPrograms(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeCompanyId]);

  const handleCreated = (created) => {
    setShowForm(false);
    setPrograms((prev) => [created, ...prev]);
  };

  return (
    <div className="space-y-5">
      {publishTarget && (
        <PublishVersionModal
          program={publishTarget}
          onClose={() => setPublishTarget(null)}
          onPublished={() => { load(); setPublishTarget(null); }}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.learning.trainingPrograms.title")}</h1>
          <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 2 }}>{t("enterprise.learning.trainingPrograms.subtitle")}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="ank-btn-accent text-xs">
          <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.trainingPrograms.newProgram")}
        </button>
      </div>

      {showForm && <NewProgramForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="space-y-3"><TableSkeleton rows={3} cols={1} /></div>
      ) : programs.length === 0 && !showForm ? (
        <EmptyState icon={RectangleStackIcon} title={t("enterprise.learning.trainingPrograms.empty")}
          message={t("enterprise.learning.trainingPrograms.emptyMessage")} />
      ) : (
        <div className="space-y-3">
          {programs.map((prog) => (
            <ProgramCard key={prog.id} program={prog} onPublishVersion={setPublishTarget} />
          ))}
        </div>
      )}
    </div>
  );
}

export default TrainingPrograms;
