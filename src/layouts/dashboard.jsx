import { Routes, Route, Navigate } from "react-router-dom";
import { ChatBubbleLeftEllipsisIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { IconButton } from "@material-tailwind/react";
import {
  DashboardNavbar,
  ChatPanel,
  Footer,
} from "@/widgets/layout";
import { MobileTabBar } from "@/widgets/layout/mobile-tab-bar";
import routes from "@/routes";
import { ProjectDetail, ProjectTopics } from "@/pages/dashboard";
import { useMaterialTailwindController, setOpenConfigurator, setOpenSidenav } from "@/context";
import { useAuth } from "@/context/auth-context";
import { useEnterprise } from "@/enterprise/context/enterprise-context";
import { EnterpriseSidenav } from "@/widgets/layout/enterprise-sidenav";
import { useLightTheme } from "@/hooks/useLightTheme";

export function Dashboard() {
  const [controller, dispatch] = useMaterialTailwindController();
  const { sidenavType, openSidenav } = controller;
  const { isAdmin } = useAuth();
  const { activeCompany, role } = useEnterprise();
  useLightTheme();

  // "admin-area" is platform-wide (Users, Roles, Companies, ...) — gated purely
  // by isAdmin (is_staff/is_superuser/global "admin" role), same rule as in
  // layouts/enterprise.jsx.
  const filteredRoutes = routes.map((section) => ({
    ...section,
    pages: (section.pages || []).filter((page) => page.name !== "admin-area" || isAdmin),
  }));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app)" }}>
      <EnterpriseSidenav routes={filteredRoutes} company={activeCompany} role={role} />

      <div
        className="min-h-screen flex flex-col transition-all duration-200 md:ml-[var(--sidebar-w)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="hidden md:block">
          <DashboardNavbar />
        </div>

        <ChatPanel />

        <button
          className="fixed bottom-6 right-6 z-40 rounded-full flex items-center justify-center cursor-pointer"
          style={{ width: 44, height: 44, background: "var(--accent)", border: "none", boxShadow: "0 4px 16px rgba(94,106,210,0.4)" }}
          onClick={() => setOpenConfigurator(dispatch, true)}
        >
          <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-white" />
        </button>

        <div className="flex-grow flex flex-col px-4 pt-4 pb-24 md:p-6">
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

      <MobileTabBar />
    </div>
  );
}

Dashboard.displayName = "/src/layout/dashboard.jsx";

export default Dashboard;
