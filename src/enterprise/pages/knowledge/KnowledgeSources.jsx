import React, { useEffect, useState, useRef, useCallback } from "react";
import { enumLabel, useKnowledgeEnumLabels } from "@/utils/enumLabel";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon, BookOpenIcon, AcademicCapIcon,
  ClockIcon, TrashIcon, ArrowPathIcon, ExclamationTriangleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { knowledgeApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_COLORS = {
  easy:   { bg: "rgba(74,222,128,0.1)",  text: "#4ade80" },
  medium: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b" },
  hard:   { bg: "rgba(239,68,68,0.1)",  text: "#f87171" },
};


/** Server-side filter params for the processes list; empty filters are omitted. */
export function buildProcessFilterParams(typeFilter, diffFilter) {
  const params = {};
  if (typeFilter) params.process_type = typeFilter;
  if (diffFilter) params.difficulty = diffFilter;
  return params;
}

function usePillLabels() {
  const { t } = useLanguage();
  return {
    types: {
      course: t("enterprise.knowledge.sources.types.course"),
      tutorial: t("enterprise.knowledge.sources.types.tutorial"),
      study_material: t("enterprise.knowledge.sources.types.studyMaterial"),
    },
    typeColors: {
      course:         { bg: "rgba(94,106,210,0.12)", text: "#8B9CF4" },
      tutorial:       { bg: "rgba(34,197,94,0.1)",   text: "#4ade80" },
      study_material: { bg: "rgba(245,158,11,0.1)",  text: "#f59e0b" },
    },
  };
}

// ─── Pill badges ─────────────────────────────────────────────────────────────

function TypePill({ type }) {
  const { types, typeColors } = usePillLabels();
  const c = typeColors[type] || { bg: "var(--bg-elevated)", text: "var(--text-secondary)" };
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, letterSpacing: "0.03em" }}>
      {enumLabel(types, type, "process_type")}
    </span>
  );
}

function DifficultyPill({ difficulty }) {
  const ENUMS = useKnowledgeEnumLabels();
  const c = DIFFICULTY_COLORS[difficulty] || { bg: "var(--bg-elevated)", text: "var(--text-secondary)" };
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, textTransform: "capitalize" }}>
      {ENUMS.difficulty(difficulty)}
    </span>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyProcesos({ onNew }) {
  const { t } = useLanguage();
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}
      className="flex flex-col items-center py-16 px-8 text-center">
      <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <BookOpenIcon style={{ width: 28, height: 28, color: "var(--text-tertiary)" }} />
      </div>
      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>{t("enterprise.knowledge.sources.empty.title")}</p>
      <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4, maxWidth: 320, lineHeight: 1.6 }}>
        {t("enterprise.knowledge.sources.empty.message")}
      </p>
      <button onClick={onNew} className="ank-btn-accent text-xs mt-5">
        <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.knowledge.sources.newProcess")}
      </button>
    </div>
  );
}

// Filters active but nothing matches: not the same as having no processes (M-05.2).
function NoMatchingProcesos({ onClear }) {
  const { t } = useLanguage();
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8 }}
      className="flex flex-col items-center py-16 px-8 text-center" data-testid="processes-no-match">
      <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <FunnelIcon style={{ width: 28, height: 28, color: "var(--text-tertiary)" }} />
      </div>
      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14 }}>{t("enterprise.knowledge.sources.empty.noMatchTitle")}</p>
      <button onClick={onClear} className="ank-btn-ghost text-xs mt-5 min-h-[44px] md:min-h-0">
        {t("enterprise.knowledge.sources.empty.clearFilters")}
      </button>
    </div>
  );
}

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDeleteDialog({ mod, onConfirm, onCancel, deleting }) {
  const { t } = useLanguage();
  if (!mod) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))", backdropFilter: "blur(5px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "var(--lt-0f172a, #0F172A)", border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 16, padding: "28px 24px", maxWidth: 440, width: "100%",
        boxShadow: "0 25px 60px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))",
        animation: "fadeIn 0.15s ease",
      }}>
        {/* Icon */}
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
          <ExclamationTriangleIcon style={{ width: 24, height: 24, color: "var(--lt-ef4444, #EF4444)" }} />
        </div>
        {/* Title */}
        <p style={{ fontSize: 17, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", marginBottom: 8 }}>
          {t("enterprise.knowledge.sources.deleteDialog.title")}
        </p>
        {/* Process name */}
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", marginBottom: 10, padding: "9px 13px", background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", borderRadius: 8, border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))" }}>
          {mod.title}
        </p>
        {/* Warning */}
        <p style={{ fontSize: 12, color: "var(--lt-94a3b8, #94A3B8)", lineHeight: 1.65, marginBottom: 6 }}>
          {t("enterprise.knowledge.sources.deleteDialog.willDelete")}
        </p>
        <ul style={{ fontSize: 12, color: "#64748B", lineHeight: 1.8, marginBottom: 22, paddingLeft: 16 }}>
          <li>{t("enterprise.knowledge.sources.deleteDialog.item1")}</li>
          <li>{t("enterprise.knowledge.sources.deleteDialog.item2")}</li>
          <li>{t("enterprise.knowledge.sources.deleteDialog.item3")}</li>
          <li>{t("enterprise.knowledge.sources.deleteDialog.item4")}</li>
        </ul>
        <p style={{ fontSize: 11, color: "var(--lt-ef4444, #EF4444)", fontWeight: 600, marginBottom: 20 }}>
          {t("enterprise.knowledge.sources.deleteDialog.irreversible")}
        </p>
        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} disabled={deleting}
            style={{ flex: 1, padding: "11px", borderRadius: 10, background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", color: "var(--lt-94a3b8, #94A3B8)", fontWeight: 700, fontSize: 13, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.5 : 1, transition: "opacity 0.15s" }}>
            {t("enterprise.compliance.programs.cancel")}
          </button>
          <button onClick={onConfirm} disabled={deleting}
            style={{ flex: 1, padding: "11px", borderRadius: 10, background: deleting ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #DC2626 0%, #EF4444 100%)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: deleting ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "opacity 0.15s" }}>
            {deleting
              ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--lt-rgba-255-255-255-0-3, rgba(255,255,255,0.3))", borderTopColor: "#fff" }} className="animate-spin" />{t("enterprise.knowledge.sources.deleteDialog.deleting")}</>
              : <><TrashIcon style={{ width: 14, height: 14 }} />{t("enterprise.knowledge.sources.deleteDialog.deleteAll")}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Module Row ───────────────────────────────────────────────────────────────

function ModuleRow({ mod, onDeleteRequest }) {
  const navigate = useNavigate();
  const { t, language } = useLanguage();

  return (
    <div
      onClick={() => navigate(`/enterprise/knowledge/${mod.id}`)}
      style={{
        background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8,
        padding: "14px 16px", cursor: "pointer", transition: "border-color 150ms, background 150ms",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-hover)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left */}
        <div className="flex items-start gap-3 min-w-0">
          <div style={{ background: "var(--accent-muted)", borderRadius: 7, padding: 8, flexShrink: 0 }}>
            <BookOpenIcon style={{ width: 15, height: 15, color: "var(--accent)" }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>{mod.title}</p>
              <TypePill type={mod.process_type} />
              <DifficultyPill difficulty={mod.difficulty} />
              {mod.is_required && (
                <span style={{ background: "rgba(239,68,68,0.1)", color: "var(--lt-f87171, #f87171)", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>
                  {t("enterprise.compliance.programs.required")}
                </span>
              )}
            </div>
            {mod.description && (
              <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 3, lineHeight: 1.5 }}
                className="truncate">{mod.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2" style={{ flexWrap: "wrap" }}>
              {mod.item_count != null && (
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1">
                  <AcademicCapIcon style={{ width: 11, height: 11 }} />
                  {t("enterprise.knowledge.sources.itemCount", { count: mod.item_count, plural: mod.item_count !== 1 ? "s" : "" })}
                </span>
              )}
              {mod.estimated_duration_minutes && (
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }} className="flex items-center gap-1">
                  <ClockIcon style={{ width: 11, height: 11 }} />
                  {t("enterprise.knowledge.sources.minutes", { n: mod.estimated_duration_minutes })}
                </span>
              )}
              {mod.order != null && (
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                  {t("enterprise.knowledge.sources.order", { n: mod.order })}
                </span>
              )}
              {mod.created_at && (
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                  {new Date(mod.created_at).toLocaleDateString(language === "es" ? "es" : "en", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(mod); }}
            style={{ color: "var(--text-tertiary)", padding: 5, borderRadius: 5, transition: "color 150ms, background 150ms", background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-f87171, #f87171)"; e.currentTarget.style.background = "rgba(239,68,68,0.1)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.background = "transparent"; }}
          >
            <TrashIcon style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export function KnowledgeSources() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { activeCompanyId } = useEnterprise();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [diffFilter, setDiffFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Only the latest request may update the list (fast filter changes can resolve out of order).
  const requestSeq = useRef(0);
  const load = useCallback(() => {
    const seq = ++requestSeq.current;
    setLoading(true);
    knowledgeApi.list(buildProcessFilterParams(typeFilter, diffFilter))
      .then((d) => { if (seq === requestSeq.current) setItems(d.results || d || []); })
      .catch(() => { if (seq === requestSeq.current) setItems([]); })
      .finally(() => { if (seq === requestSeq.current) setLoading(false); });
  }, [activeCompanyId, typeFilter, diffFilter]);

  useEffect(() => { load(); }, [load]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await knowledgeApi.remove(deleteTarget.id);
      setItems((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // keep dialog open on error
    } finally {
      setDeleting(false);
    }
  };

  const filtered = items; // server-filtered already

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 style={{ color: "var(--text-primary)" }} className="text-xl font-bold">{t("enterprise.knowledge.sources.title")}</h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-0.5">
            {t("enterprise.knowledge.sources.subtitle")}
          </p>
        </div>
        <button onClick={() => navigate("/enterprise/knowledge/new")} className="ank-btn-accent text-xs">
          <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.knowledge.sources.newProcess")}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.knowledge.sources.filters.type")}</span>
        <FilterChip label={t("enterprise.knowledge.sources.filters.all")} active={typeFilter === ""} onClick={() => setTypeFilter("")} />
        <FilterChip label={t("enterprise.knowledge.sources.types.course")} active={typeFilter === "course"} onClick={() => setTypeFilter("course")} />
        <FilterChip label={t("enterprise.knowledge.sources.types.tutorial")} active={typeFilter === "tutorial"} onClick={() => setTypeFilter("tutorial")} />
        <FilterChip label={t("enterprise.knowledge.sources.types.studyMaterial")} active={typeFilter === "study_material"} onClick={() => setTypeFilter("study_material")} />

        <span style={{ color: "var(--border)", marginLeft: 4 }}>|</span>

        <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{t("enterprise.knowledge.sources.filters.difficulty")}</span>
        <FilterChip label={t("enterprise.knowledge.sources.filters.all")} active={diffFilter === ""} onClick={() => setDiffFilter("")} />
        <FilterChip label={t("enterprise.knowledge.sources.difficulty.easy")} active={diffFilter === "easy"} onClick={() => setDiffFilter("easy")} />
        <FilterChip label={t("enterprise.knowledge.sources.difficulty.medium")} active={diffFilter === "medium"} onClick={() => setDiffFilter("medium")} />
        <FilterChip label={t("enterprise.knowledge.sources.difficulty.hard")} active={diffFilter === "hard"} onClick={() => setDiffFilter("hard")} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, height: 80 }}
              className="animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 && (typeFilter || diffFilter) ? (
        <NoMatchingProcesos onClear={() => { setTypeFilter(""); setDiffFilter(""); }} />
      ) : filtered.length === 0 ? (
        <EmptyProcesos onNew={() => navigate("/enterprise/knowledge/new")} />
      ) : (
        <div className="space-y-2">
          {filtered.map((mod) => (
            <ModuleRow key={mod.id} mod={mod} onDeleteRequest={setDeleteTarget} />
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && filtered.length > 0 && (
        <p style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
          {t("enterprise.knowledge.sources.processCount", { count: filtered.length, plural: filtered.length !== 1 ? "s" : "" })}
        </p>
      )}

      <ConfirmDeleteDialog
        mod={deleteTarget}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        deleting={deleting}
      />
    </div>
  );
}

export default KnowledgeSources;
