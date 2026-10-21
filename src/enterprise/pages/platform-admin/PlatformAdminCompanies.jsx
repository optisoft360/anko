import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusIcon, MagnifyingGlassIcon, BuildingOffice2Icon,
  UsersIcon, PencilIcon, TrashIcon, XMarkIcon,
} from "@heroicons/react/24/outline";
import { companyApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";

export function useIndustries() {
  const { t } = useLanguage();
  return [
    { value: "aviation",      label: t("enterprise.platformAdmin.companies.industries.aviation") },
    { value: "healthcare",    label: t("enterprise.platformAdmin.companies.industries.healthcare") },
    { value: "manufacturing", label: t("enterprise.platformAdmin.companies.industries.manufacturing") },
    { value: "logistics",     label: t("enterprise.platformAdmin.companies.industries.logistics") },
    { value: "technology",    label: t("enterprise.platformAdmin.companies.industries.technology") },
    { value: "finance",       label: t("enterprise.platformAdmin.companies.industries.finance") },
    { value: "education",     label: t("enterprise.platformAdmin.companies.industries.education") },
    { value: "other",         label: t("enterprise.platformAdmin.companies.industries.other") },
  ];
}

export function useCompanySizes() {
  const { t } = useLanguage();
  return [
    { value: "1_10",      label: t("enterprise.platformAdmin.companies.sizes.s1_10") },
    { value: "11_50",     label: t("enterprise.platformAdmin.companies.sizes.s11_50") },
    { value: "51_200",    label: t("enterprise.platformAdmin.companies.sizes.s51_200") },
    { value: "201_500",   label: t("enterprise.platformAdmin.companies.sizes.s201_500") },
    { value: "501_1000",  label: t("enterprise.platformAdmin.companies.sizes.s501_1000") },
    { value: "1000_plus", label: t("enterprise.platformAdmin.companies.sizes.s1000Plus") },
  ];
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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

function PrimaryBtn({ children, disabled, loading, type = "button", onClick, style }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "10px 20px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700,
        background: (disabled || loading) ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
        color: "#fff", cursor: (disabled || loading) ? "default" : "pointer", overflow: "hidden",
        boxShadow: (disabled || loading) ? "none" : "0 4px 16px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
        transition: "all 0.2s", ...style,
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

function Spin() {
  return <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--lt-rgba-255-255-255-0-25, rgba(255,255,255,0.25))", borderTopColor: "#fff", flexShrink: 0 }} className="animate-spin" />;
}

/* ── Active-company selector ── */
function ActiveCompanyToggle({ active, onClick }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onClick}
      title={active ? t("enterprise.platformAdmin.companies.activeInDashboard") : t("enterprise.platformAdmin.companies.operateAsCompany")}
      style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0, padding: 0,
        border: `2px solid ${active ? "#818CF8" : "var(--lt-rgba-255-255-255-0-22, rgba(255,255,255,0.22))"}`,
        background: active ? "rgba(99,102,241,0.18)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = "rgba(129,140,248,0.6)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = "var(--lt-rgba-255-255-255-0-22, rgba(255,255,255,0.22))"; }}
    >
      {active && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#818CF8" }} />}
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

/* ── Create Company Modal ── */
function CreateCompanyModal({ onClose, onCreate }) {
  const { t } = useLanguage();
  const INDUSTRIES = useIndustries();
  const COMPANY_SIZES = useCompanySizes();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (value) => { setName(value); if (!slugEdited) setSlug(slugify(value)); };
  const handleSlugChange = (value) => { setSlug(value); setSlugEdited(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) { setError(t("enterprise.platformAdmin.companies.createModal.nameSlugRequired")); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        name: name.trim(), slug: slug.trim(),
        ...(industry && { industry }),
        ...(companySize && { company_size: companySize }),
        ...(website.trim() && { website: website.trim() }),
      };
      const created = await companyApi.createCompany(payload);
      onCreate(created);
    } catch (err) {
      setError(err?.name?.[0] || err?.slug?.[0] || err?.detail || err?.non_field_errors?.[0] || t("enterprise.platformAdmin.companies.createModal.createError"));
    } finally { setSaving(false); }
  };

  return (
    <div style={MODAL_BACKDROP} onClick={onClose}>
      <div style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", letterSpacing: "-0.01em" }}>{t("enterprise.platformAdmin.companies.createModal.title")}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lt-475569, #475569)", padding: 6, borderRadius: 8, display: "flex", transition: "color 0.15s, background 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lt-475569, #475569)"; e.currentTarget.style.background = "none"; }}>
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LABEL_S}>{t("enterprise.platformAdmin.companies.createModal.nameLabel")}</label>
            <input style={INPUT_S} placeholder="Acme Corp" value={name} onChange={(e) => handleNameChange(e.target.value)} required autoFocus onFocus={focusIn} onBlur={focusOut} />
          </div>

          <div>
            <label style={LABEL_S}>{t("enterprise.platformAdmin.companies.createModal.slugLabel")}</label>
            <div style={{ display: "flex", border: "1px solid var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))", borderRadius: 10, overflow: "hidden", background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", transition: "border-color 0.2s, box-shadow 0.2s" }}
              onFocusCapture={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.7)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.12)"; }}
              onBlurCapture={(e) => { e.currentTarget.style.borderColor = "var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))"; e.currentTarget.style.boxShadow = "none"; }}>
              <span style={{ padding: "11px 12px", background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", color: "#64748B", fontSize: 12, borderRight: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", whiteSpace: "nowrap", userSelect: "none" }}>
                ankard.io/
              </span>
              <input style={{ flex: 1, padding: "11px 14px", fontSize: 13, color: "var(--lt-f1f5f9, #F1F5F9)", background: "none", border: "none", outline: "none", fontFamily: "inherit" }}
                placeholder="acme-corp" value={slug} onChange={(e) => handleSlugChange(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LABEL_S}>{t("enterprise.platformAdmin.companies.createModal.industryLabel")}</label>
              <DarkSelect value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="">{t("enterprise.platformAdmin.companies.createModal.selectPlaceholder")}</option>
                {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </DarkSelect>
            </div>
            <div>
              <label style={LABEL_S}>{t("enterprise.platformAdmin.companies.createModal.sizeLabel")}</label>
              <DarkSelect value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                <option value="">{t("enterprise.platformAdmin.companies.createModal.selectPlaceholder")}</option>
                {COMPANY_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </DarkSelect>
            </div>
          </div>

          <div>
            <label style={LABEL_S}>{t("enterprise.platformAdmin.companies.createModal.websiteLabel")}</label>
            <input type="url" style={INPUT_S} placeholder="https://acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} onFocus={focusIn} onBlur={focusOut} />
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
            <PrimaryBtn type="submit" disabled={saving} loading={saving}>
              {saving ? <><Spin /> {t("enterprise.platformAdmin.companies.createModal.creating")}</> : t("enterprise.platformAdmin.companies.createModal.create")}
            </PrimaryBtn>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Edit Company Modal ── */
function EditCompanyModal({ company, onClose, onSaved }) {
  const { t } = useLanguage();
  const INDUSTRIES = useIndustries();
  const COMPANY_SIZES = useCompanySizes();
  const [name, setName] = useState(company.name || "");
  const [website, setWebsite] = useState(company.website || "");
  const [industry, setIndustry] = useState(company.industry || "");
  const [companySize, setCompanySize] = useState(company.company_size || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const updated = await companyApi.updateCompany(company.id, {
        name: name.trim(), website: website.trim(),
        ...(industry && { industry }),
        ...(companySize && { company_size: companySize }),
      });
      onSaved(updated);
    } catch (err) {
      setError(err?.detail || err?.name?.[0] || t("enterprise.platformAdmin.companies.editModal.updateError"));
    } finally { setSaving(false); }
  };

  return (
    <div style={MODAL_BACKDROP} onClick={onClose}>
      <div style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 24px 18px", borderBottom: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))" }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", letterSpacing: "-0.01em" }}>{t("enterprise.platformAdmin.companies.editModal.title")}</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--lt-475569, #475569)", padding: 6, borderRadius: 8, display: "flex", transition: "color 0.15s, background 0.15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lt-475569, #475569)"; e.currentTarget.style.background = "none"; }}>
            <XMarkIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LABEL_S}>{t("enterprise.platformAdmin.companies.createModal.nameLabelNoAsterisk")}</label>
            <input style={INPUT_S} value={name} onChange={(e) => setName(e.target.value)} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div>
            <label style={LABEL_S}>{t("enterprise.platformAdmin.companies.createModal.websiteLabel")}</label>
            <input type="url" style={INPUT_S} placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LABEL_S}>{t("enterprise.platformAdmin.companies.createModal.industryLabel")}</label>
              <DarkSelect value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="">{t("enterprise.platformAdmin.companies.createModal.selectPlaceholder")}</option>
                {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </DarkSelect>
            </div>
            <div>
              <label style={LABEL_S}>{t("enterprise.platformAdmin.companies.createModal.sizeLabel")}</label>
              <DarkSelect value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                <option value="">{t("enterprise.platformAdmin.companies.createModal.selectPlaceholder")}</option>
                {COMPANY_SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </DarkSelect>
            </div>
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
            <PrimaryBtn type="submit" disabled={saving} loading={saving}>
              {saving ? <><Spin /> {t("enterprise.settings.company.info.saving")}</> : t("enterprise.settings.company.members.changeRoleModal.save")}
            </PrimaryBtn>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function PlatformAdminCompanies() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId, switchCompany } = useEnterprise();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");
  const INDUSTRY_LABELS_MAP = Object.fromEntries(useIndustries().map((i) => [i.value, i.label]));
  const SIZE_LABELS_MAP = Object.fromEntries(useCompanySizes().map((s) => [s.value, s.label]));

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const load = useCallback(() => {
    setLoading(true);
    companyApi.myCompanies()
      .then((d) => setCompanies(d.results || d || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (company) => {
    setShowCreate(false);
    showToast(t("enterprise.platformAdmin.companies.toast.created", { name: company.name }));
    load();
    navigate(`/platform-admin/companies/${company.id}/users`);
  };

  const handleSaved = (updated) => {
    setCompanies((prev) => prev.map((c) => c.id === updated.id ? updated : c));
    setEditTarget(null);
    showToast(t("enterprise.platformAdmin.companies.toast.updated"));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await companyApi.deleteCompany(deleteTarget.id);
      setCompanies((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast(t("enterprise.platformAdmin.companies.toast.deleted"));
    } catch (err) {
      showToast(err?.detail || t("enterprise.platformAdmin.companies.toast.deleteError"));
    } finally { setDeleting(false); }
  };

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 860 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, background: "var(--lt-toast, rgba(15,23,42,0.95))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", color: "var(--lt-f1f5f9, #F1F5F9)", fontSize: 13, fontWeight: 600, padding: "12px 22px", borderRadius: 12, backdropFilter: "blur(12px)", boxShadow: "0 8px 32px var(--lt-rgba-0-0-0-0-5, rgba(0,0,0,0.5))", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Modals */}
      {showCreate && <CreateCompanyModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />}
      {editTarget && <EditCompanyModal company={editTarget} onClose={() => setEditTarget(null)} onSaved={handleSaved} />}

      {/* Delete confirm */}
      {deleteTarget && (
        <div style={MODAL_BACKDROP}>
          <div style={{ ...MODAL_CARD, maxWidth: 380, padding: 28 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: "var(--lt-f1f5f9, #F1F5F9)", marginBottom: 12 }}>{t("enterprise.platformAdmin.companies.deleteModal.title")}</p>
            <p style={{ fontSize: 13, color: "var(--lt-94a3b8, #94A3B8)", lineHeight: 1.65, marginBottom: 24 }}>
              {t("enterprise.platformAdmin.companies.deleteModal.confirm")} <strong style={{ color: "var(--lt-f1f5f9, #F1F5F9)" }}>{deleteTarget.name}</strong>? {t("enterprise.platformAdmin.companies.deleteModal.cannotUndo")}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)}
                style={{ padding: "10px 18px", fontSize: 13, fontWeight: 600, color: "#64748B", background: "none", border: "none", borderRadius: 9, cursor: "pointer", transition: "color 0.15s, background 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#64748B"; e.currentTarget.style.background = "none"; }}>
                {t("enterprise.compliance.programs.cancel")}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: "10px 20px", fontSize: 13, fontWeight: 700, background: deleting ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg, #EF4444, #F87171)", color: "#fff", border: "none", borderRadius: 9, cursor: deleting ? "default" : "pointer", display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s", boxShadow: deleting ? "none" : "0 4px 16px rgba(239,68,68,0.35)" }}>
                {deleting ? <><Spin /> {t("enterprise.knowledge.sources.deleteDialog.deleting")}</> : t("enterprise.knowledge.processDetail.deleteDialog.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ padding: "3px 8px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "var(--lt-f87171, #F87171)", fontSize: 10, fontWeight: 800, borderRadius: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Platform Admin
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--lt-f1f5f9, #F1F5F9)", letterSpacing: "-0.02em", marginBottom: 4 }}>
            {t("enterprise.platformAdmin.companies.title")}
          </h1>
          <p style={{ fontSize: 13, color: "#64748B" }}>
            {t("enterprise.platformAdmin.companies.subtitle", { count: companies.length, word: companies.length !== 1 ? t("enterprise.platformAdmin.companies.companiesWord") : t("enterprise.platformAdmin.companies.companyWord") })}
          </p>
        </div>
        <PrimaryBtn onClick={() => setShowCreate(true)}>
          <PlusIcon style={{ width: 16, height: 16 }} /> {t("enterprise.platformAdmin.companies.newCompany")}
        </PrimaryBtn>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 20 }}>
        <MagnifyingGlassIcon style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "var(--lt-475569, #475569)", pointerEvents: "none" }} />
        <input
          style={{ ...INPUT_S, paddingLeft: 40, borderRadius: 12 }}
          placeholder={t("enterprise.platformAdmin.companies.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={focusIn} onBlur={focusOut}
        />
      </div>

      {/* Company List */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))", border: "1px solid var(--lt-rgba-255-255-255-0-07, rgba(255,255,255,0.07))", borderRadius: 16, padding: 20 }} className="animate-pulse">
              <div style={{ height: 14, background: "var(--lt-rgba-255-255-255-0-06, rgba(255,255,255,0.06))", borderRadius: 6, width: "33%", marginBottom: 10 }} />
              <div style={{ height: 11, background: "var(--lt-rgba-255-255-255-0-04, rgba(255,255,255,0.04))", borderRadius: 6, width: "50%" }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <BuildingOffice2Icon style={{ width: 48, height: 48, margin: "0 auto 12px", opacity: 0.3, color: "#64748B" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--lt-475569, #475569)" }}>
            {search ? t("enterprise.platformAdmin.companies.noneFound") : t("enterprise.platformAdmin.companies.noneRegistered")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((company) => (
            <div key={company.id}
              style={{ background: "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))", border: "1px solid var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))", borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", transition: "border-color 0.2s, background 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--lt-rgba-255-255-255-0-08, rgba(255,255,255,0.08))"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-03, rgba(255,255,255,0.03))"; }}>

              {/* Info */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <ActiveCompanyToggle
                  active={String(activeCompanyId) === String(company.id)}
                  onClick={() => switchCompany(company.id)}
                />
                <div style={{ width: 42, height: 42, borderRadius: 12, background: "linear-gradient(135deg, #6366F1, #818CF8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: "#fff", flexShrink: 0, boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                  {company.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--lt-f1f5f9, #F1F5F9)", marginBottom: 3 }}>{company.name}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {company.company_size && (
                      <span style={{ fontSize: 11, color: "#64748B" }}>{SIZE_LABELS_MAP[company.company_size] || company.company_size}</span>
                    )}
                    {company.company_size && company.industry && <span style={{ fontSize: 11, color: "var(--lt-334155, #334155)" }}>·</span>}
                    {company.industry && (
                      <span style={{ fontSize: 11, color: "#64748B" }}>{INDUSTRY_LABELS_MAP[company.industry] || company.industry}</span>
                    )}
                    {company.member_count != null && (
                      <>
                        <span style={{ fontSize: 11, color: "var(--lt-334155, #334155)" }}>·</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748B" }}>
                          <UsersIcon style={{ width: 11, height: 11 }} />
                          {t("enterprise.platformAdmin.companies.userCount", { count: company.member_count, plural: company.member_count !== 1 ? "s" : "" })}
                        </span>
                      </>
                    )}
                    {String(activeCompanyId) === String(company.id) && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.3)", color: "var(--lt-a5b4fc, #A5B4FC)" }}>{t("enterprise.platformAdmin.companies.activeBadge")}</span>
                    )}
                    {!company.is_active && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--lt-f87171, #F87171)" }}>{t("enterprise.platformAdmin.companies.inactiveBadge")}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button onClick={() => { switchCompany(company.id); navigate(`/enterprise/dashboard`); }}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "var(--lt-94a3b8, #94A3B8)", background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 8, cursor: "pointer", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-f1f5f9, #F1F5F9)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-09, rgba(255,255,255,0.09))"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lt-94a3b8, #94A3B8)"; e.currentTarget.style.background = "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))"; }}>
                  {t("enterprise.platformAdmin.companies.view")}
                </button>
                <button onClick={() => navigate(`/platform-admin/companies/${company.id}/users`)}
                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, color: "var(--lt-818cf8, #818CF8)", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.18)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)"; }}>
                  <UsersIcon style={{ width: 13, height: 13 }} /> {t("enterprise.platformAdmin.companies.usersBtn")}
                </button>
                <button onClick={() => setEditTarget(company)}
                  style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 8, cursor: "pointer", color: "var(--lt-475569, #475569)", transition: "color 0.15s, background 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-818cf8, #818CF8)"; e.currentTarget.style.background = "rgba(99,102,241,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lt-475569, #475569)"; e.currentTarget.style.background = "none"; }}>
                  <PencilIcon style={{ width: 15, height: 15 }} />
                </button>
                <button onClick={() => setDeleteTarget(company)}
                  style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", borderRadius: 8, cursor: "pointer", color: "var(--lt-475569, #475569)", transition: "color 0.15s, background 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--lt-f87171, #F87171)"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--lt-475569, #475569)"; e.currentTarget.style.background = "none"; }}>
                  <TrashIcon style={{ width: 15, height: 15 }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PlatformAdminCompanies;
