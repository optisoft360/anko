import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon, ShieldCheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { complianceApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import { StatusBadge } from "../../components/StatusBadge";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton } from "../../components/LoadingSkeleton";
import { useCompanyRole } from "../../hooks/useCompanyRole";
import { mapApiErrors } from "@/utils/apiError";
import { intInRange, noWheel } from "@/utils/numberInput";

const INPUT = {
  width: "100%", background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--lt-f1f5f9, #F1F5F9)", outline: "none", boxSizing: "border-box",
};
const LABEL = { fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 5 };

function FieldError({ message }) {
  return message ? <p role="alert" style={{ fontSize: 11, color: "var(--lt-f87171, #f87171)", marginTop: 4 }}>{message}</p> : null;
}

/** 17: same rules as ComplianceProgramSerializer. Returns { field: message }. */
export function validateProgramForm(form, t) {
  const K = "enterprise.compliance.programs.form.errors.";
  const errs = {};
  if (!form.name.trim()) errs.name = t(`${K}required`);
  else if (form.name.trim().length > 200) errs.name = t(`${K}tooLong`, { max: 200 });
  if (!form.code.trim()) errs.code = t(`${K}required`);
  else if (form.code.trim().length > 50) errs.code = t(`${K}tooLong`, { max: 50 });
  if (form.effective_date && form.expiry_date && form.expiry_date <= form.effective_date) errs.expiry_date = t(`${K}expiryAfterEffective`);
  if (form.validity_days !== "" && intInRange(form.validity_days, 0, 3650)) errs.validity_days = t(`${K}range`, { min: 0, max: 3650 });
  if (form.requires_score) {
    const score = Number(form.passing_score);
    if (form.passing_score === "" || !Number.isFinite(score) || score < 0 || score > 100) errs.passing_score = t(`${K}range`, { min: 0, max: 100 });
  }
  return errs;
}

function useComplianceTypes() {
  const { t } = useLanguage();
  return [
    { value: "regulatory", label: t("enterprise.compliance.programs.types.regulatory") },
    { value: "internal", label: t("enterprise.compliance.programs.types.internal") },
    { value: "certification", label: t("enterprise.compliance.programs.types.certification") },
    { value: "safety", label: t("enterprise.compliance.programs.types.safety") },
    { value: "other", label: t("enterprise.compliance.programs.types.other") },
  ];
}
function useFrequencies() {
  const { t } = useLanguage();
  return [
    { value: "one_time", label: t("enterprise.compliance.programs.frequencies.oneTime") },
    { value: "monthly", label: t("enterprise.compliance.programs.frequencies.monthly") },
    { value: "quarterly", label: t("enterprise.compliance.programs.frequencies.quarterly") },
    { value: "biannual", label: t("enterprise.compliance.programs.frequencies.biannual") },
    { value: "annual", label: t("enterprise.compliance.programs.frequencies.annual") },
    { value: "custom", label: t("enterprise.compliance.programs.frequencies.custom") },
  ];
}

// ─── Shared program form fields (used by create modal here, and by the edit
// form on ComplianceProgramDetail) ──────────────────────────────────────────
export function ProgramFormFields({ form, onChange, errors = {} }) {
  const { t } = useLanguage();
  const COMPLIANCE_TYPES = useComplianceTypes();
  const FREQUENCIES = useFrequencies();
  const set = (field, value) => onChange({ ...form, [field]: value });
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label style={LABEL} htmlFor="cp-name">{t("enterprise.compliance.programs.form.name")} *</label>
          <input id="cp-name" style={INPUT} maxLength={200} value={form.name} onChange={(e) => set("name", e.target.value)} />
          <FieldError message={errors.name} />
        </div>
        <div>
          <label style={LABEL} htmlFor="cp-code">{t("enterprise.compliance.programs.form.code")} *</label>
          <input id="cp-code" style={{ ...INPUT, fontFamily: "monospace" }} placeholder={t("enterprise.compliance.programs.form.codePlaceholder")} maxLength={50} value={form.code} onChange={(e) => set("code", e.target.value)} />
          <FieldError message={errors.code} />
        </div>
      </div>

      <div>
        <label style={LABEL} htmlFor="cp-description">{t("enterprise.compliance.programs.form.description")}</label>
        <textarea id="cp-description" rows={2} style={{ ...INPUT, resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label style={LABEL} htmlFor="cp-type">{t("enterprise.compliance.programs.form.complianceType")}</label>
          <select id="cp-type" style={{ ...INPUT, cursor: "pointer" }} value={form.compliance_type} onChange={(e) => set("compliance_type", e.target.value)}>
            {COMPLIANCE_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="cp-frequency">{t("enterprise.compliance.programs.form.frequency")}</label>
          <select id="cp-frequency" style={{ ...INPUT, cursor: "pointer" }} value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
            {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label style={LABEL} htmlFor="cp-effective">{t("enterprise.compliance.programs.form.effectiveDate")}</label>
          <input id="cp-effective" type="date" style={{ ...INPUT, colorScheme: "dark" }} value={form.effective_date} onChange={(e) => set("effective_date", e.target.value)} />
          <FieldError message={errors.effective_date} />
        </div>
        <div>
          <label style={LABEL} htmlFor="cp-expiry">{t("enterprise.compliance.programs.form.expiryDate")}</label>
          <input id="cp-expiry" type="date" style={{ ...INPUT, colorScheme: "dark" }} min={form.effective_date || undefined} value={form.expiry_date} onChange={(e) => set("expiry_date", e.target.value)} />
          <FieldError message={errors.expiry_date} />
        </div>
      </div>

      <div>
        <label style={LABEL} htmlFor="cp-validity">{t("enterprise.compliance.programs.form.validity")}</label>
        <input id="cp-validity" type="number" min="0" max="3650" step="1" {...noWheel} style={INPUT} value={form.validity_days} onChange={(e) => set("validity_days", e.target.value)} />
        <FieldError message={errors.validity_days} />
        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>{t("enterprise.compliance.programs.form.validityHint")}</p>
      </div>

      <div className="flex items-center gap-2">
        <input id="cp-mandatory" type="checkbox" checked={form.is_mandatory} onChange={(e) => set("is_mandatory", e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />
        <label htmlFor="cp-mandatory" style={{ fontSize: 12.5, color: "var(--text-primary)", cursor: "pointer" }}>{t("enterprise.compliance.programs.form.mandatoryLabel")}</label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input id="cp-requires-score" type="checkbox" checked={form.requires_score} onChange={(e) => set("requires_score", e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer" }} />
          <label htmlFor="cp-requires-score" style={{ fontSize: 12.5, color: "var(--text-primary)", cursor: "pointer" }}>{t("enterprise.compliance.programs.form.requiresScoreLabel")}</label>
        </div>
        {form.requires_score && (
          <div>
            <label style={LABEL} htmlFor="cp-passing-score">{t("enterprise.compliance.programs.form.passingScore")}</label>
            <input id="cp-passing-score" type="number" min="0" max="100" {...noWheel} style={INPUT} value={form.passing_score} onChange={(e) => set("passing_score", e.target.value)} />
            <FieldError message={errors.passing_score} />
          </div>
        )}
      </div>
    </>
  );
}

export const emptyProgramForm = () => ({
  name: "", code: "", description: "",
  compliance_type: "regulatory", frequency: "annual",
  validity_days: "365", is_mandatory: true,
  requires_score: false, passing_score: "",
  effective_date: "", expiry_date: "",
});

export function programToForm(p) {
  return {
    name: p.name || "",
    code: p.code || "",
    description: p.description || "",
    compliance_type: p.compliance_type || "regulatory",
    frequency: p.frequency || "annual",
    validity_days: p.validity_days != null ? String(p.validity_days) : "365",
    is_mandatory: !!p.is_mandatory,
    requires_score: !!p.requires_score,
    passing_score: p.passing_score != null ? String(p.passing_score) : "",
    effective_date: p.effective_date || "",
    expiry_date: p.expiry_date || "",
  };
}

export function programFormToPayload(form) {
  const payload = {
    name: form.name.trim(),
    code: form.code.trim(),
    compliance_type: form.compliance_type,
    frequency: form.frequency,
    is_mandatory: form.is_mandatory,
    requires_score: form.requires_score,
  };
  if (form.description.trim()) payload.description = form.description.trim();
  if (form.validity_days) payload.validity_days = parseInt(form.validity_days, 10);
  if (form.requires_score && form.passing_score !== "") payload.passing_score = parseFloat(form.passing_score);
  if (form.effective_date) payload.effective_date = form.effective_date;
  if (form.expiry_date) payload.expiry_date = form.expiry_date;
  return payload;
}

// ─── Create Program Modal ───────────────────────────────────────────────────

function CreateProgramModal({ onClose, onCreated }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(emptyProgramForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    const local = validateProgramForm(form, t);
    setErrors(local);
    if (Object.keys(local).length) { setError(""); return; }
    setSaving(true);
    setError("");
    try {
      const created = await complianceApi.createProgram(programFormToPayload(form));
      onCreated(created);
    } catch (err) {
      const { fields, general } = mapApiErrors(err);
      setErrors(fields);
      setError(general || (Object.keys(fields).length ? "" : t("enterprise.compliance.programs.form.createError")));
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--lt-rgba-0-0-0-0-6, rgba(0,0,0,0.6))", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", padding: 24, boxShadow: "0 20px 60px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))" }} className="space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{t("enterprise.compliance.programs.createModal.title")}</p>
          <button type="button" onClick={onClose} style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }} aria-label="Close">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <ProgramFormFields form={form} onChange={setForm} errors={errors} />
          {error && <p style={{ fontSize: 12, color: "var(--lt-f87171, #f87171)" }}>{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
            <button type="submit" disabled={saving} className="ank-btn-accent text-xs" style={{ opacity: saving ? 0.7 : 1 }}>
              {saving ? t("enterprise.compliance.programs.creating") : t("enterprise.compliance.programs.createModal.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function CompliancePrograms() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { activeCompanyId } = useEnterprise();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { hasMinRole } = useCompanyRole();
  const canEdit = hasMinRole("manager");

  const load = () => {
    setLoading(true);
    const params = statusFilter ? { status: statusFilter } : {};
    complianceApi.getPrograms(params).then((d) => setPrograms(d.results || d || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeCompanyId, statusFilter]);

  const handleCreated = (created) => {
    setShowCreate(false);
    setPrograms((prev) => [created, ...prev]);
    navigate(`/enterprise/compliance/programs/${created.id}`);
  };

  const activate = async (e, id) => { e.stopPropagation(); await complianceApi.activateProgram(id); load(); };
  const archive = async (e, id) => { e.stopPropagation(); await complianceApi.archiveProgram(id); load(); };

  const btn = { fontSize: 11, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: "4px 8px" };

  const columnHeaders = [
    t("enterprise.compliance.programs.columns.code"),
    t("enterprise.compliance.programs.columns.name"),
    t("enterprise.compliance.programs.columns.type"),
    t("enterprise.compliance.programs.columns.frequency"),
    t("enterprise.compliance.programs.columns.status"),
    t("enterprise.compliance.programs.columns.mandatory"),
    t("enterprise.compliance.programs.columns.requirements"),
    ...(canEdit ? [t("enterprise.compliance.programs.columns.actions")] : []),
  ];

  return (
    <div className="space-y-5">
      {showCreate && <CreateProgramModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.compliance.programs.title")}</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--text-secondary)", outline: "none", cursor: "pointer" }}>
            <option value="">{t("enterprise.compliance.programs.filters.allStatuses")}</option>
            <option value="active">{t("enterprise.compliance.programs.filters.active")}</option>
            <option value="draft">{t("enterprise.compliance.programs.filters.draft")}</option>
            <option value="archived">{t("enterprise.compliance.programs.filters.archived")}</option>
          </select>
          {canEdit && (
            <button onClick={() => setShowCreate(true)} className="ank-btn-accent text-xs">
              <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.compliance.programs.newProgram")}
            </button>
          )}
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} cols={6} /> : programs.length === 0 ? (
        <EmptyState icon={ShieldCheckIcon} title={t("enterprise.compliance.programs.empty")} message={canEdit ? t("enterprise.compliance.programs.emptyMessageCanEdit") : t("enterprise.compliance.programs.emptyMessage")}
          action={canEdit ? t("enterprise.compliance.programs.newProgram") : undefined} onAction={canEdit ? () => setShowCreate(true) : undefined} />
      ) : (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div className={`ank-table-scroll ${canEdit ? "ank-sticky-last" : ""}`} style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ fontSize: 13, borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  {columnHeaders.map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/enterprise/compliance/programs/${p.id}`)}
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer", transition: "background 150ms" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--text-tertiary)" }}>{p.code}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{p.compliance_type}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{p.frequency}</td>
                    <td style={{ padding: "12px 16px" }}><StatusBadge status={p.status} /></td>
                    <td style={{ padding: "12px 16px" }}>
                      {p.is_mandatory ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--lt-f87171, #f87171)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", padding: "1px 8px", borderRadius: 20 }}>{t("enterprise.compliance.programs.required")}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t("enterprise.compliance.programs.optional")}</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-tertiary)", fontSize: 12 }}>{p.requirement_count ?? 0}</td>
                    {canEdit && (
                      <td style={{ padding: "12px 16px" }}>
                        <div className="flex gap-1 flex-wrap">
                          {p.status === "draft" && <button style={{ ...btn, color: "var(--lt-4ade80, #4ade80)" }} onClick={(e) => activate(e, p.id)}>{t("enterprise.compliance.programs.activate")}</button>}
                          {p.status === "active" && <button style={{ ...btn, color: "var(--text-tertiary)" }} onClick={(e) => archive(e, p.id)}>{t("enterprise.compliance.programs.archive")}</button>}
                        </div>
                      </td>
                    )}
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

export default CompliancePrograms;
