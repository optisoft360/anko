import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { IconButton } from "@material-tailwind/react";
import {
  DashboardNavbar,
  Footer,
} from "@/widgets/layout";
import { MobileTabBar } from "@/widgets/layout/mobile-tab-bar";
import routes from "@/routes";

// Admin Area pages: the end-user bottom tab bar (Home / Projects / Batteries / Study) is not for them.
const ADMIN_PATHS = new Set(
  routes.flatMap((r) => r.pages || []).filter((p) => p.name === "admin-area")
    .flatMap((p) => p.children || []).filter((c) => c.path).map((c) => `/dashboard${c.path}`)
);
import { ProjectDetail, ProjectTopics } from "@/pages/dashboard";
import { useMaterialTailwindController, setOpenSidenav } from "@/context";
import { useAuth } from "@/context/auth-context";
import { useEnterprise } from "@/enterprise/context/enterprise-context";
import { EnterpriseSidenav } from "@/widgets/layout/enterprise-sidenav";
import { useLightTheme } from "@/hooks/useLightTheme";
import { ChatWidget } from "@/widgets/layout/chat-widget";
import { useHideNavWithoutCompany } from "@/config/navigation";

export function Dashboard() {
  const { pathname } = useLocation();
  const [controller, dispatch] = useMaterialTailwindController();
  const { sidenavType, openSidenav } = controller;
  const { isAdmin } = useAuth();
  const { activeCompany, role } = useEnterprise();
  useLightTheme();
  // M-07: no company → home only, without side menu or bottom tab bar (phones).
  const hideNav = useHideNavWithoutCompany();

  // "admin-area" is platform-wide (Users, Roles, Companies, ...) — gated purely
  // by isAdmin (is_staff/is_superuser/global "admin" role), same rule as in
  // layouts/enterprise.jsx.
  const filteredRoutes = routes.map((section) => ({
    ...section,
    pages: (section.pages || []).filter((page) => page.name !== "admin-area" || isAdmin),
  }));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app)" }}>
      {hideNav.desktop ? null : hideNav.mobile ? (
        <div className="hidden md:block"><EnterpriseSidenav routes={filteredRoutes} company={activeCompany} role={role} /></div>
      ) : (
        <EnterpriseSidenav routes={filteredRoutes} company={activeCompany} role={role} />
      )}

      <div
        className={`min-h-screen flex flex-col transition-all duration-200 ${hideNav.desktop ? "" : "md:ml-[var(--sidebar-w)]"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur md:static md:bg-transparent md:backdrop-blur-none">
          <DashboardNavbar hideMenu={hideNav} />
        </div>

        <ChatWidget />

        <div className="flex-grow flex flex-col px-4 pt-4 pb-36 md:p-6">
          <Routes>
            {routes.map(({ layout, pages }) =>
              layout === "dashboard" &&
              pages.map((page) => {
                if (page.key?.startsWith("dashboard.admin") && !isAdmin) {
                  return null;
                }
                if (page.children) {
                  return page.children.map(({ path, element, key }) => {
                    if (key?.startsWith("dashboard.admin") && !isAdmin) {
                      return null;
                    }
                    return <Route exact path={path} element={element} key={path} />;
                  });
                }
                return <Route exact path={page.path} element={page.element} key={page.path} />;
              })
            )}
            <Route path="/project/:projectId" element={<ProjectDetail />} />
            <Route path="/project/:projectId/topics" element={<ProjectTopics />} />
            <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
          </Routes>
        </div>

      </div>

      {!hideNav.mobile && !ADMIN_PATHS.has(pathname.replace(/\/$/, "")) && <MobileTabBar />}
    </div>
  );
}

Dashboard.displayName = "/src/layout/dashboard.jsx";

export default Dashboard;
