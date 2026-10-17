import React, { useEffect, useState, useCallback } from "react";
import { enumLabel } from "@/utils/enumLabel";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon, RectangleStackIcon, ClockIcon, TrashIcon,
  ArrowRightIcon, ArrowLeftIcon, CheckIcon, CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { learningApi, knowledgeApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";

// ─── Status pills ─────────────────────────────────────────────────────────────

function useStatusMap() {
  const { t } = useLanguage();
  return {
    draft:     { bg: "rgba(255,255,255,0.08)", text: "#8B8B9C",  label: t("enterprise.learning.paths.status.draft") },
    published: { bg: "rgba(74,222,128,0.12)",  text: "#4ade80",  label: t("enterprise.learning.paths.status.published") },
    archived:  { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b",  label: t("enterprise.learning.paths.status.archived") },
  };
}

function StatusPill({ status }) {
  const STATUS = useStatusMap();
  const s = STATUS[status] || STATUS.draft;
  return (
    <span style={{ background: s.bg, color: s.text, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4 }}>
      {s.label}
    </span>
  );
}

// ─── Wizard Step 1 ─────────────────────────────────────────────────────────────

function WizardStep1({ form, onChange, onNext, onCancel }) {
  const { t } = useLanguage();
  const [error, setError] = useState("");
  const handleNext = () => {
    if (!form.name.trim()) { setError(t("enterprise.learning.paths.wizard.nameRequired")); return; }
    setError(""); onNext();
  };
  return (
    <div className="space-y-4">
      <div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{t("enterprise.learning.paths.wizard.name")} *</p>
        <input
          autoFocus
          placeholder={t("enterprise.learning.paths.wizard.namePlaceholder")}
          value={form.name}
          onChange={(e) => { onChange("name", e.target.value); setError(""); }}
          style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none" }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
          onKeyDown={(e) => { if (e.key === "Enter") handleNext(); }}
        />
        {error && <p style={{ color: "#f87171", fontSize: 11, marginTop: 4 }}>{error}</p>}
      </div>
      <div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
          {t("enterprise.learning.paths.wizard.description")} <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>({t("enterprise.learning.paths.wizard.optional")})</span>
        </p>
        <textarea
          rows={3}
          placeholder={t("enterprise.learning.paths.wizard.descriptionPlaceholder")}
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px", color: "var(--text-primary)", fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.6 }}
          onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
        />
      </div>
      <div className="flex justify-between gap-3 pt-1">
        <button onClick={onCancel} className="ank-btn-ghost text-xs">{t("enterprise.learning.paths.wizard.cancel")}</button>
        <button onClick={handleNext} className="ank-btn-accent text-xs">
          {t("enterprise.learning.paths.wizard.next")} <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Wizard Step 2 — Select procesos ─────────────────────────────────────────

const TYPE_COLORS = {
  course:         { bg: "rgba(94,106,210,0.15)", text: "#8B9CF4" },
  tutorial:       { bg: "rgba(34,197,94,0.12)",  text: "#4ade80" },
  study_material: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b" },
};

function useTypeLabels() {
  const { t } = useLanguage();
  return {
    course: t("enterprise.learning.paths.types.course"),
    tutorial: t("enterprise.learning.paths.types.tutorial"),
    study_material: t("enterprise.learning.paths.types.studyMaterial"),
  };
}

function WizardStep2({ selectedIds, onToggle, sources, loadingSources, onBack, onSubmit, saving, error }) {
  const { t } = useLanguage();
  const TYPE_LABELS = useTypeLabels();
  const [search, setSearch] = useState("");

  const filtered = sources.filter((s) =>
    !search || (s.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
          {t("enterprise.learning.paths.wizard.selectProcesses")}
        </p>
        <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.learning.paths.wizard.selectProcessesHint")}</p>
      </div>

      {/* Search */}
      <input
        placeholder={t("enterprise.learning.paths.wizard.searchProcesses")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", color: "var(--text-primary)", fontSize: 12, outline: "none" }}
        onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; }}
        onBlur={(e) => { e.target.style.borderColor = "var(--border)"; }}
      />

      {/* Module list */}
      <div style={{ maxHeight: 260, overflowY: "auto" }} className="space-y-1.5 pr-1">
        {loadingSources ? (
          <div className="flex items-center justify-center py-8">
            <div style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} className="w-5 h-5 border-2 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
            {sources.length === 0 ? t("enterprise.learning.paths.wizard.noProcessesYet") : t("enterprise.learning.paths.wizard.noResults")}
          </p>
        ) : (
          filtered.map((src) => {
            const selected = selectedIds.includes(src.id);
            const tc = TYPE_COLORS[src.process_type] || { bg: "var(--bg-elevated)", text: "var(--text-secondary)" };
            return (
              <button
                key={src.id}
                type="button"
                onClick={() => onToggle(src.id)}
                style={{
                  width: "100%", textAlign: "left",
                  background: selected ? "var(--bg-accent)" : "var(--bg-elevated)",
                  border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: 6, padding: "9px 12px", cursor: "pointer", transition: "all 150ms",
                }}
              >
                <div className="flex items-center gap-2">
                  <div style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: selected ? "var(--accent)" : "var(--bg-surface)",
                    border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {selected && <CheckIcon style={{ width: 11, height: 11, color: "#fff", strokeWidth: 3 }} />}
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{src.title}</span>
                  <span style={{ background: tc.bg, color: tc.text, fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 3 }}>
                    {enumLabel(TYPE_LABELS, src.process_type, "process_type")}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {selectedIds.length > 0 && (
        <p style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
          {t("enterprise.learning.paths.wizard.selectedCount", { count: selectedIds.length, plural: selectedIds.length !== 1 ? "s" : "" })}
        </p>
      )}

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "8px 12px" }}>
          <p style={{ color: "#f87171", fontSize: 12 }}>{error}</p>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-1">
        <button onClick={onBack} className="ank-btn-ghost text-xs">
          <ArrowLeftIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.paths.wizard.back")}
        </button>
        <button onClick={onSubmit} disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? t("enterprise.learning.paths.wizard.creating") : t("enterprise.learning.paths.wizard.createPath")}
          {!saving && <CheckIcon className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Create Wizard Modal ───────────────────────────────────────────────────────

function CreateWizard({ onCreated, onCancel }) {
  const { t } = useLanguage();
  const { activeCompanyId } = useEnterprise();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", description: "" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    knowledgeApi.list()
      .then((d) => setSources(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoadingSources(false));
  }, [activeCompanyId]);

  const onChange = (f, v) => setForm((prev) => ({ ...prev, [f]: v }));
  const onToggle = (id) => setSelectedIds((prev) =>
    prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
  );

  const handleSubmit = async () => {
    setSaving(true); setError("");
    let created;
    try {
      const payload = { name: form.name.trim() };
      if (form.description.trim()) payload.description = form.description.trim();
      created = await learningApi.createPath(payload);
    } catch (err) {
      setError(err?.detail || err?.name?.[0] || t("enterprise.learning.paths.wizard.createError"));
      setSaving(false);
      return;
    }

    // Same mechanism as "Add Process" in the detail page: each selected
    // Knowledge Source gets wrapped in its own learning module and linked in.
    if (selectedIds.length > 0) {
      const companyId = parseInt(localStorage.getItem("enterprise_company_id")) || null;
      let order = 1;
      for (const ksId of selectedIds) {
        const ks = sources.find((s) => s.id === ksId);
        if (!ks) continue;
        try {
          const newModule = await learningApi.createModule({
            company: companyId,
            knowledge_source: ks.id,
            name: ks.title,
            description: ks.description || "",
            process_type: ks.process_type || "course",
            difficulty: ks.difficulty || "medium",
            order,
          });
          await learningApi.addModule(created.id, { module_id: newModule.id, order });
          order += 1;
        } catch {
          // If one fails, the path already exists — it can be added later via "Add Process".
        }
      }
    }

    setSaving(false);
    onCreated(created);
  };

  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--accent)", borderRadius: 8, padding: "20px" }}>
      {/* Wizard header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {[1, 2].map((n) => (
            <React.Fragment key={n}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700,
                background: step > n ? "#4ade80" : step === n ? "var(--accent)" : "var(--bg-elevated)",
                color: step >= n ? "#fff" : "var(--text-tertiary)",
                border: `1px solid ${step > n ? "#4ade80" : step === n ? "var(--accent)" : "var(--border)"}`,
              }}>
                {step > n ? <CheckIcon style={{ width: 11, height: 11, strokeWidth: 3 }} /> : n}
              </div>
              {n < 2 && <div style={{ width: 30, height: 1, background: step > n ? "rgba(74,222,128,0.4)" : "var(--border)" }} />}
            </React.Fragment>
          ))}
          <span style={{ color: "var(--text-tertiary)", fontSize: 11, marginLeft: 6 }}>
            {step === 1 ? t("enterprise.learning.paths.wizard.basicInfo") : t("enterprise.learning.paths.wizard.selectProcessesStep")}
          </span>
        </div>
        <button onClick={onCancel} style={{ color: "var(--text-tertiary)", fontSize: 18, lineHeight: 1, cursor: "pointer" }}>×</button>
      </div>

      {step === 1 && (
        <WizardStep1 form={form} onChange={onChange} onNext={() => setStep(2)} onCancel={onCancel} />
      )}
      {step === 2 && (
        <WizardStep2 selectedIds={selectedIds} onToggle={onToggle}
          sources={sources} loadingSources={loadingSources}
          onBack={() => setStep(1)} onSubmit={handleSubmit} saving={saving} error={error} />
      )}
    </div>
  );
}

// ─── Path Card ────────────────────────────────────────────────────────────────

function PathCard({ path, onClick, onDelete }) {
  const { t } = useLanguage();
  const STATUS = useStatusMap();
  const [deleting, setDeleting] = useState(false);
  const count = path.module_count ?? path.modules?.length ?? 0;
  const s = STATUS[path.status] || STATUS.draft;

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(t("enterprise.learning.paths.card.confirmDelete", { name: path.name }))) return;
    setDeleting(true);
    try { await learningApi.deletePath(path.id); onDelete(path.id); }
    catch { setDeleting(false); }
  };

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8,
        padding: "14px 16px", cursor: "pointer", transition: "border-color 150ms, background 150ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div style={{ background: "var(--accent-muted)", borderRadius: 7, padding: 8, flexShrink: 0 }}>
            <RectangleStackIcon style={{ width: 15, height: 15, color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>{path.name}</p>
              <StatusPill status={path.status} />
            </div>
            {path.description && (
              <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2, lineHeight: 1.5 }} className="truncate">
                {path.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                {t("enterprise.learning.paths.card.processCount", { count, plural: count !== 1 ? "s" : "" })}
              </span>
              {path.estimated_duration_minutes && (
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1">
                  <ClockIcon style={{ width: 11, height: 11 }} />
                  {Math.round(path.estimated_duration_minutes / 60)}h
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ArrowRightIcon style={{ width: 13, height: 13, color: "var(--text-tertiary)" }} />
          <button onClick={handleDelete} disabled={deleting}
            style={{ color: "var(--text-tertiary)", padding: 5, borderRadius: 5, transition: "all 150ms", marginLeft: 4 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}>
            <TrashIcon style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer",
      background: active ? "var(--accent)" : "var(--bg-elevated)",
      color: active ? "#fff" : "var(--text-secondary)",
      border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
      transition: "all 150ms",
    }}>
      {label}
    </button>
  );
}

export function LearningPaths() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { activeCompanyId } = useEnterprise();
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showWizard, setShowWizard] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    learningApi.getPaths(params)
      .then((d) => setPaths(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCompanyId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (created) => {
    setShowWizard(false);
    navigate(`/enterprise/learning/paths/${created.id}`);
  };

  const handleDelete = (id) => setPaths((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 style={{ color: "var(--text-primary)" }} className="text-xl font-bold">{t("enterprise.learning.paths.title")}</h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-0.5">
            {t("enterprise.learning.paths.subtitle")}
          </p>
        </div>
        <button onClick={() => setShowWizard(true)} className="ank-btn-accent text-xs">
          <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.paths.newPath")}
        </button>
      </div>

      {/* Wizard */}
      {showWizard && (
        <CreateWizard onCreated={handleCreated} onCancel={() => setShowWizard(false)} />
      )}

      {/* Filters */}
      {!showWizard && (
        <div className="flex items-center gap-2 flex-wrap">
          <FilterChip label={t("enterprise.learning.paths.filters.all")} active={statusFilter === ""} onClick={() => setStatusFilter("")} />
          <FilterChip label={t("enterprise.learning.paths.status.draft")} active={statusFilter === "draft"} onClick={() => setStatusFilter("draft")} />
          <FilterChip label={t("enterprise.learning.paths.status.published")} active={statusFilter === "published"} onClick={() => setStatusFilter("published")} />
          <FilterChip label={t("enterprise.learning.paths.status.archived")} active={statusFilter === "archived"} onClick={() => setStatusFilter("archived")} />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, height: 76 }} className="animate-pulse" />
          ))}
        </div>
      ) : paths.length === 0 && !showWizard ? (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}
          className="flex flex-col items-center py-14 text-center">
          <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: 14, marginBottom: 12 }}>
            <RectangleStackIcon style={{ width: 26, height: 26, color: "var(--text-tertiary)" }} />
          </div>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>{t("enterprise.learning.paths.empty")}</p>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4, maxWidth: 300, lineHeight: 1.6 }}>
            {t("enterprise.learning.paths.emptyMessage")}
          </p>
          <button onClick={() => setShowWizard(true)} className="ank-btn-accent text-xs mt-4">
            <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.learning.paths.newPath")}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {paths.map((path) => (
            <PathCard key={path.id} path={path}
              onClick={() => navigate(`/enterprise/learning/paths/${path.id}`)}
              onDelete={handleDelete} />
          ))}
        </div>
      )}

      {!loading && paths.length > 0 && (
        <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
          {t("enterprise.learning.paths.count", { count: paths.length, plural: paths.length !== 1 ? "s" : "" })}
        </p>
      )}
    </div>
  );
}

export default LearningPaths;
