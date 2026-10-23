import { useTemplateTypeLabels } from "./CertificateTemplateForm";
import { noWheel } from "@/utils/numberInput";
import React, { useEffect, useState } from "react";
import { PlusIcon, AcademicCapIcon, XMarkIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { certApi, companyApi } from "../../api/enterpriseApi";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";
import { EmptyState } from "../../components/EmptyState";
import { TableSkeleton } from "../../components/LoadingSkeleton";

const INPUT = {
  width: "100%", background: "var(--lt-rgba-255-255-255-0-05, rgba(255,255,255,0.05))", border: "1px solid var(--lt-rgba-255-255-255-0-12, rgba(255,255,255,0.12))",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--lt-f1f5f9, #F1F5F9)", outline: "none", boxSizing: "border-box",
};

function IssueCertModal({ template, onClose, onIssued }) {
  const { t } = useLanguage();
  const { activeCompanyId } = useEnterprise();
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [score, setScore] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    companyApi.getMembers(activeCompanyId, { status: "active" })
      .then((d) => setMembers(d.results || d || []))
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [activeCompanyId]);

  const handleIssue = async () => {
    if (!selectedUserId) { setError(t("enterprise.certifications.templates.issueModal.selectUser")); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { user_id: selectedUserId };
      if (template.requires_score && score !== "") payload.score = score;
      await certApi.issueCert(template.id, payload);
      setSuccess(t("enterprise.certifications.templates.issueModal.success"));
      onIssued?.();
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err?.detail || err?.score?.[0] || err?.user_id?.[0] || t("enterprise.certifications.templates.issueModal.error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--lt-rgba-0-0-0-0-6, rgba(0,0,0,0.6))", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "var(--lt-0f172a, #0F172A)", border: "1px solid var(--lt-rgba-255-255-255-0-1, rgba(255,255,255,0.1))", borderRadius: 16, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px var(--lt-rgba-0-0-0-0-7, rgba(0,0,0,0.7))" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ height: 2, background: "linear-gradient(90deg, #6366F1, #818CF8, #A78BFA)" }} />
        <div style={{ padding: "18px 20px" }} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{t("enterprise.certifications.templates.issueModal.title")}</p>
              <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{template.name}</p>
            </div>
            <button onClick={onClose} style={{ color: "var(--text-tertiary)", background: "none", border: "none", cursor: "pointer" }}><XMarkIcon className="h-5 w-5" /></button>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6 }}>{t("enterprise.certifications.templates.issueModal.userLabel")}</label>
            {loadingMembers ? (
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "8px 0" }}>{t("enterprise.certifications.templates.issueModal.loadingMembers")}</div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8 }}>
                {members.map((m) => {
                  const sel = selectedUserId === m.user;
                  return (
                    <button key={m.id} type="button" onClick={() => setSelectedUserId(m.user)}
                      style={{ width: "100%", textAlign: "left", padding: "9px 12px", background: sel ? "rgba(99,102,241,0.12)" : "transparent", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: sel ? 700 : 500, color: sel ? "#C7D2FE" : "var(--text-secondary)" }}>
                        {m.full_name || m.username}
                      </span>
                      {sel && <CheckBadgeIcon style={{ width: 14, height: 14, color: "var(--lt-818cf8, #818CF8)" }} />}
                    </button>
                  );
                })}
                {members.length === 0 && <p style={{ fontSize: 12, color: "var(--text-tertiary)", padding: "10px 12px" }}>{t("enterprise.certifications.templates.issueModal.noMembers")}</p>}
              </div>
            )}
          </div>

          {template.requires_score && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", display: "block", marginBottom: 6 }}>
                {t("enterprise.certifications.templates.issueModal.scoreLabel", { min: template.minimum_score })}
              </label>
              <input style={INPUT} type="number" {...noWheel} min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: "var(--lt-f87171, #f87171)" }}>{error}</p>}
          {success && <p style={{ fontSize: 12, color: "var(--lt-4ade80, #4ade80)", fontWeight: 700 }}>{success}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="ank-btn-ghost text-xs">{t("enterprise.compliance.programs.cancel")}</button>
            <button type="button" onClick={handleIssue} disabled={saving || !selectedUserId} className="ank-btn-accent text-xs" style={{ opacity: saving || !selectedUserId ? 0.6 : 1 }}>
              {saving ? t("enterprise.certifications.templates.issueModal.issuing") : t("enterprise.certifications.templates.issueModal.issue")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CertificateTemplates() {
  const { t } = useLanguage();
  const TYPE_LABELS = useTemplateTypeLabels();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issuingTemplate, setIssuingTemplate] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    certApi.getTemplates().then((d) => setTemplates(d.results || d || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (tpl) => {
    if (tpl.is_active) await certApi.deactivateTemplate(tpl.id);
    else await certApi.activateTemplate(tpl.id);
    load();
  };

  const btn = { fontSize: 11, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: "4px 8px" };

  const columns = [
    t("enterprise.certifications.templates.columns.code"),
    t("enterprise.certifications.templates.columns.name"),
    t("enterprise.certifications.templates.columns.type"),
    t("enterprise.certifications.templates.columns.validity"),
    t("enterprise.certifications.templates.columns.reqScore"),
    t("enterprise.certifications.templates.columns.active"),
    t("enterprise.certifications.templates.columns.issued"),
    t("enterprise.certifications.templates.columns.actions"),
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 style={{ color: "var(--text-primary)", fontSize: 20, fontWeight: 800 }}>{t("enterprise.certifications.templates.title")}</h1>
        <button onClick={() => navigate("/enterprise/certifications/templates/new")} className="ank-btn-accent text-xs">
          <PlusIcon className="h-3.5 w-3.5" /> {t("enterprise.certifications.templates.newTemplate")}
        </button>
      </div>

      {loading ? <TableSkeleton rows={4} cols={6} /> : templates.length === 0 ? (
        <EmptyState icon={AcademicCapIcon} title={t("enterprise.certifications.templates.empty.title")} message={t("enterprise.certifications.templates.empty.message")} action={t("enterprise.certifications.templates.newTemplate")} onAction={() => navigate("/enterprise/certifications/templates/new")} />
      ) : (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div className="ank-table-scroll ank-sticky-last" style={{ overflowX: "auto" }}>
            <table className="w-full" style={{ fontSize: 13, borderCollapse: "collapse" }}>
              <thead style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  {columns.map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--text-tertiary)" }}>{tpl.code}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--text-primary)" }}>{tpl.name}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{TYPE_LABELS[tpl.template_type] || "—"}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{tpl.validity_days === 0 ? t("enterprise.certifications.myCertifications.noExpiry") : `${tpl.validity_days}d`}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{tpl.requires_score ? `${tpl.minimum_score}%` : "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: tpl.is_active ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.06)", color: tpl.is_active ? "var(--lt-4ade80, #4ade80)" : "#8B8B9C" }}>
                        {tpl.is_active ? t("enterprise.certifications.templates.active") : t("enterprise.certifications.templates.inactive")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{tpl.issued_count ?? 0}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div className="flex gap-1 flex-wrap">
                        <button style={{ ...btn, color: "var(--lt-818cf8, #818CF8)" }} onClick={() => navigate(`/enterprise/certifications/templates/${tpl.id}/edit`)}>{t("enterprise.certifications.templates.edit")}</button>
                        <button style={{ ...btn, color: tpl.is_active ? "var(--text-tertiary)" : "var(--lt-4ade80, #4ade80)" }} onClick={() => toggle(tpl)}>
                          {tpl.is_active ? t("enterprise.certifications.templates.deactivate") : t("enterprise.certifications.templates.activate")}
                        </button>
                        <button style={{ ...btn, color: "var(--lt-818cf8, #818CF8)" }} onClick={() => setIssuingTemplate(tpl)}>{t("enterprise.certifications.templates.issue")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {issuingTemplate && (
        <IssueCertModal
          template={issuingTemplate}
          onClose={() => setIssuingTemplate(null)}
          onIssued={load}
        />
      )}
    </div>
  );
}

export default CertificateTemplates;
