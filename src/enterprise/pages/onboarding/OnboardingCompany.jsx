import { Navigate } from "react-router-dom";
import { useEnterprise } from "../../context/enterprise-context";
import { useLanguage } from "../../../context/language-context";

// Company creation is restricted to platform admins (/platform-admin/companies).
// F-07: this route used to always redirect there, which is a blank page for everyone
// else; a member of a company is sent to its dashboard instead.
export default function OnboardingCompany() {
  const { initialized, loading, isEnterpriseMember, isPlatformAdmin } = useEnterprise();
  const { t } = useLanguage();
  if (!initialized || loading) return null;
  if (isEnterpriseMember) return <Navigate to="/enterprise/dashboard" replace />;
  if (isPlatformAdmin) return <Navigate to="/platform-admin/companies" replace />;
  return (
    <div style={{ maxWidth: 440, margin: "80px auto", textAlign: "center", color: "var(--text-secondary)" }}>
      <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{t("enterprise.onboarding.noCompanyTitle")}</p>
      <p style={{ fontSize: 13 }}>{t("enterprise.onboarding.noCompanyHint")}</p>
    </div>
  );
}
