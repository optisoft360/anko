import { Routes, Route, Navigate } from "react-router-dom";
import { ChatBubbleLeftEllipsisIcon } from "@heroicons/react/24/solid";
import { DashboardNavbar, ChatPanel } from "@/widgets/layout";
import { EnterpriseSidenav } from "@/widgets/layout/enterprise-sidenav";
import { useLightTheme } from "@/hooks/useLightTheme";
import { EmployeeMobileTabBar } from "@/enterprise/components/EmployeeMobileTabBar";
import { AdminMobileTabBar } from "@/enterprise/components/AdminMobileTabBar";
import routes from "@/routes";
import { useMaterialTailwindController, setOpenConfigurator } from "@/context";
import { useAuth } from "@/context/auth-context";
import { useEnterprise } from "@/enterprise/context/enterprise-context";

import KnowledgeSources from "@/enterprise/pages/knowledge/KnowledgeSources";
import KnowledgeSourceNew from "@/enterprise/pages/knowledge/KnowledgeSourceNew";
import ProcessDetail from "@/enterprise/pages/knowledge/ProcessDetail";
import ChangeImpactDetail from "@/enterprise/pages/knowledge/ChangeImpactDetail";
import KnowledgeGraph from "@/enterprise/pages/knowledge/KnowledgeGraph";
import EnterpriseDashboard from "@/enterprise/pages/dashboards/EnterpriseDashboard";
import MyAssignments from "@/enterprise/pages/learning/MyAssignments";
import AssignmentsManager from "@/enterprise/pages/learning/AssignmentsManager";
import AssignmentDetail from "@/enterprise/pages/learning/AssignmentDetail";
import ReviewSchedules from "@/enterprise/pages/learning/ReviewSchedules";
import KnowledgeGaps from "@/enterprise/pages/learning/KnowledgeGaps";
import LearningPaths from "@/enterprise/pages/learning/LearningPaths";
import LearningPathDetail from "@/enterprise/pages/learning/LearningPathDetail";
import TrainingPrograms from "@/enterprise/pages/learning/TrainingPrograms";
import MyRetention from "@/enterprise/pages/retention/MyRetention";
import TeamRetention from "@/enterprise/pages/retention/TeamRetention";
import CompanyRetention from "@/enterprise/pages/retention/CompanyRetention";
import MyCompliance from "@/enterprise/pages/compliance/MyCompliance";
import CompliancePrograms from "@/enterprise/pages/compliance/CompliancePrograms";
import ComplianceProgramDetail from "@/enterprise/pages/compliance/ComplianceProgramDetail";
import CompanyCompliance from "@/enterprise/pages/compliance/CompanyCompliance";
import TeamCompliance from "@/enterprise/pages/compliance/TeamCompliance";
import ComplianceAssignments from "@/enterprise/pages/compliance/ComplianceAssignments";
import ComplianceAuditReport from "@/enterprise/pages/compliance/ComplianceAuditReport";
import CertificateTemplates from "@/enterprise/pages/certifications/CertificateTemplates";
import CertificateTemplateForm from "@/enterprise/pages/certifications/CertificateTemplateForm";
import MyCertifications from "@/enterprise/pages/certifications/MyCertifications";
import CertificateDetail from "@/enterprise/pages/certifications/CertificateDetail";
import CompanyCertifications from "@/enterprise/pages/certifications/CompanyCertifications";
import RetentionTrends from "@/enterprise/pages/analytics/RetentionTrends";
import ComplianceTrends from "@/enterprise/pages/analytics/ComplianceTrends";
import LearningTrends from "@/enterprise/pages/analytics/LearningTrends";
import CompanyHealth from "@/enterprise/pages/analytics/CompanyHealth";
import CompanySettings from "@/enterprise/pages/settings/CompanySettings";
import BusinessUnits from "@/enterprise/pages/settings/BusinessUnits";
import Teams from "@/enterprise/pages/settings/Teams";
import Members from "@/enterprise/pages/settings/Members";
import InviteUser from "@/enterprise/pages/settings/InviteUser";
import EnterpriseInvitations from "@/enterprise/pages/invitations/EnterpriseInvitations";
import EnterpriseProfile from "@/enterprise/pages/profile/EnterpriseProfile";
import OnboardingCompany from "@/enterprise/pages/onboarding/OnboardingCompany";
import OnboardingInvite from "@/enterprise/pages/onboarding/OnboardingInvite";

export function Enterprise() {
  const [, dispatch] = useMaterialTailwindController();
  const { loading, hasCompany, allowedRoutes, isAdmin } = useAuth();
  const { role, activeCompany } = useEnterprise();

  useLightTheme();

  if (loading) return null;

  if (!hasCompany) {
    return <Navigate to="/waiting" replace />;
  }

  const filteredRoutes = routes.map((section) => ({
    ...section,
    pages: (section.pages || [])
      // "admin-area" is platform-wide (Users, Roles, Companies, ...) — never
      // shown here just because the viewer is a company owner/admin; that's
      // gated purely by isAdmin (is_staff/is_superuser/global "admin" role),
      // completely independent of any CompanyMembership role.
      .filter((page) => page.name !== "admin-area" || isAdmin)
      .map((page) => {
      if (page.name !== "enterprise" || !page.children) return page;
      return {
        ...page,
        children: page.children.filter((child) => {
          if (!child.name) return true;
          return allowedRoutes.includes(`enterprise.${child.name}`);
        }),
      };
    }),
  }));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app)" }}>
      <EnterpriseSidenav routes={filteredRoutes} company={activeCompany} role={role} />

      <div
        className="min-h-screen flex flex-col transition-all duration-200 md:ml-[var(--sidebar-w)]"
      >
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur md:static md:bg-transparent md:backdrop-blur-none">
          <DashboardNavbar />
        </div>

        <ChatPanel />

        <button
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 rounded-full flex items-center justify-center cursor-pointer"
          style={{ width: 44, height: 44, background: "var(--accent)", border: "none", boxShadow: "0 4px 16px rgba(94,106,210,0.4)" }}
          onClick={() => setOpenConfigurator(dispatch, true)}
        >
          <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-white" />
        </button>

        <div className="flex-grow flex flex-col px-4 pt-4 pb-24 md:p-6">
          <Routes>
            {/* Paths are relative to /enterprise/* */}
            <Route path="knowledge" element={<KnowledgeSources />} />
            <Route path="knowledge/new" element={<KnowledgeSourceNew />} />
            <Route path="knowledge/graph" element={<KnowledgeGraph />} />
            <Route path="knowledge/change-impact/:id" element={<ChangeImpactDetail />} />
            <Route path="knowledge/:id" element={<ProcessDetail />} />
            <Route path="dashboard" element={<EnterpriseDashboard />} />
            <Route path="learning/assignments" element={<MyAssignments />} />
            <Route path="learning/assignments/:id" element={<AssignmentDetail />} />
            <Route path="learning/manage-assignments" element={<AssignmentsManager />} />
            <Route path="learning/reviews" element={<ReviewSchedules />} />
            <Route path="learning/gaps" element={<KnowledgeGaps />} />
            <Route path="learning/paths" element={<LearningPaths />} />
            <Route path="learning/paths/:id" element={<LearningPathDetail />} />
            <Route path="learning/programs" element={<TrainingPrograms />} />
            <Route path="retention/me" element={<MyRetention />} />
            <Route path="retention/team" element={<TeamRetention />} />
            <Route path="retention/company" element={<CompanyRetention />} />
            <Route path="compliance/me" element={<MyCompliance />} />
            <Route path="compliance/programs" element={<CompliancePrograms />} />
            <Route path="compliance/programs/:id" element={<ComplianceProgramDetail />} />
            <Route path="compliance/programs/:id/audit" element={<ComplianceAuditReport />} />
            <Route path="compliance/company" element={<CompanyCompliance />} />
            <Route path="compliance/team" element={<TeamCompliance />} />
            <Route path="compliance/assignments" element={<ComplianceAssignments />} />
            <Route path="certifications" element={<MyCertifications />} />
            <Route path="certifications/templates" element={<CertificateTemplates />} />
            <Route path="certifications/templates/new" element={<CertificateTemplateForm />} />
            <Route path="certifications/templates/:id/edit" element={<CertificateTemplateForm />} />
            <Route path="certifications/:id" element={<CertificateDetail />} />
            <Route path="certifications/company" element={<CompanyCertifications />} />
            <Route path="analytics/retention" element={<RetentionTrends />} />
            <Route path="analytics/compliance" element={<ComplianceTrends />} />
            <Route path="analytics/learning" element={<LearningTrends />} />
            <Route path="analytics/health" element={<CompanyHealth />} />
            <Route path="invitations" element={<EnterpriseInvitations />} />
            <Route path="settings" element={<CompanySettings />} />
            <Route path="settings/units" element={<BusinessUnits />} />
            <Route path="settings/teams" element={<Teams />} />
            <Route path="settings/members" element={<Members />} />
            <Route path="settings/invite" element={<InviteUser />} />
            <Route path="profile" element={<EnterpriseProfile />} />
            <Route path="onboarding/company" element={<OnboardingCompany />} />
            <Route path="onboarding/invite" element={<OnboardingInvite />} />
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>

      </div>

      {role === "employee" ? <EmployeeMobileTabBar /> : <AdminMobileTabBar />}
    </div>
  );
}

Enterprise.displayName = "/src/layouts/enterprise.jsx";

export default Enterprise;
