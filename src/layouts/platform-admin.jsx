import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardNavbar, ChatPanel } from "@/widgets/layout";
import { EnterpriseSidenav } from "@/widgets/layout/enterprise-sidenav";
import { useLightTheme } from "@/hooks/useLightTheme";
import { ChatFab } from "@/widgets/layout/chat-fab";
import { MobileTabBar } from "@/widgets/layout/mobile-tab-bar";
import routes from "@/routes";
import { useEnterprise } from "@/enterprise/context/enterprise-context";
import { useAuth } from "@/context/auth-context";

import PlatformAdminCompanies from "@/enterprise/pages/platform-admin/PlatformAdminCompanies";
import PlatformAdminUsers from "@/enterprise/pages/platform-admin/PlatformAdminUsers";
import PlatformAdminInvitations from "@/enterprise/pages/platform-admin/PlatformAdminInvitations";

export function PlatformAdmin() {
  const { isPlatformAdmin, initialized, activeCompany, role } = useEnterprise();
  const { allowedRoutes } = useAuth();
  useLightTheme();

  if (initialized && !isPlatformAdmin) {
    return <Navigate to="/enterprise/dashboard" replace />;
  }

  // "enterprise" children here are only ever shown to the extent this
  // platform admin ALSO has real company access (same allowedRoutes-based
  // filter used in layouts/enterprise.jsx) — "admin-area" itself is never
  // filtered here, since reaching this layout already implies isPlatformAdmin.
  const filteredRoutes = routes.map((section) => ({
    ...section,
    pages: (section.pages || []).map((page) => {
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

        <ChatFab />

        <div className="flex-grow flex flex-col px-4 pt-4 pb-36 md:p-6">
          <Routes>
            <Route path="companies" element={<PlatformAdminCompanies />} />
            <Route path="companies/:id/users" element={<PlatformAdminUsers />} />
            <Route path="invitations" element={<PlatformAdminInvitations />} />
            <Route index element={<Navigate to="companies" replace />} />
            <Route path="*" element={<Navigate to="companies" replace />} />
          </Routes>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
}

PlatformAdmin.displayName = "/src/layouts/platform-admin.jsx";

export default PlatformAdmin;
