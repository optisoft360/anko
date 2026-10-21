import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDownIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMaterialTailwindController, setOpenSidenav } from "@/context";
import { useLanguage } from "@/context/language-context";
import { APP_NAME } from "@/config/app";

export function Sidenav({ routes }) {
  const [controller, dispatch] = useMaterialTailwindController();
  const { t } = useLanguage();
  const { openSidenav } = controller;
  const location = useLocation();

  const getInitialExpanded = () => {
    const result = {};
    (routes || []).forEach(({ pages }) => {
      (pages || []).forEach((page) => {
        if (page.children && !page.alwaysOpen) {
          const isChildActive = page.children.some((child) => {
            const to = child.href || `/${page.layout || "dashboard"}${child.path || ""}`;
            return location.pathname.startsWith(to);
          });
          if (isChildActive) result[page.name] = true;
        }
      });
    });
    return result;
  };

  const [expanded, setExpanded] = useState(getInitialExpanded);

  useEffect(() => {
    (routes || []).forEach(({ pages, layout }) => {
      (pages || []).forEach((page) => {
        if (page.children && !page.alwaysOpen) {
          const isChildActive = page.children.some((child) => {
            const to = child.href || `/${layout || "dashboard"}${child.path || ""}`;
            return location.pathname.startsWith(to);
          });
          if (isChildActive) {
            setExpanded(prev => prev[page.name] ? prev : { ...prev, [page.name]: true });
          }
        }
      });
    });
  }, [location.pathname, routes]);

  const toggleGroup = (name) => setExpanded(prev => ({ ...prev, [name]: !prev[name] }));

  const visibleRoutes = (routes || [])
    .filter((route) => !route.hidden)
    .map((route) => ({
      ...route,
      pages: (route.pages || []).filter((page) => !page.hidden),
    }))
    .filter((route) => route.pages.length > 0 || route.layout === "auth");

  return (
    <>
      {/* Backdrop for mobile */}
      {openSidenav && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 md:hidden"
          onClick={() => setOpenSidenav(dispatch, false)}
        />
      )}

      <aside
        style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)", width: "var(--sidebar-w)" }}
        className={`fixed inset-y-0 left-0 z-[10000] md:z-40 flex flex-col transition-transform duration-200
          ${openSidenav ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <Link to="/enterprise/dashboard" className="flex items-center gap-2.5">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
              style={{ background: "var(--accent)" }}
            >
              A
            </div>
            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              {APP_NAME || "Ankard"}
            </span>
          </Link>
          <button
            onClick={() => setOpenSidenav(dispatch, false)}
            className="md:hidden p-1 rounded transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleRoutes.map(({ layout, pages }) =>
            (pages || []).map((page) => {
              const { icon, name, path, href, children, alwaysOpen } = page;
              const label = t(`sidenav.${name}`) || name;
              const hasChildren = children && children.length > 0;

              if (!hasChildren) {
                const to = href || `/${layout || "dashboard"}${path || ""}`;
                return (
                  <NavLink key={`${layout}-${name}`} to={to} end>
                    {({ isActive }) => (
                      <div className={`ank-nav-item ${isActive ? "active" : ""}`}>
                        {icon && React.cloneElement(icon, { className: "ank-nav-icon" })}
                        <span>{label}</span>
                      </div>
                    )}
                  </NavLink>
                );
              }

              if (alwaysOpen) {
                return (
                  <div key={`${layout}-${name}`}>
                    <div className="ank-section-label">{label}</div>
                    <div className="space-y-0.5">
                      {children.map((child) => {
                        const to = child.href || `/${layout || "dashboard"}${child.path || ""}`;
                        const childLabel = t(`sidenav.${child.name}`) || child.name;
                        return (
                          <NavLink key={to} to={to} end>
                            {({ isActive }) => (
                              <div className={`ank-nav-item ${isActive ? "active" : ""}`}>
                                {child.icon && React.cloneElement(child.icon, { className: "ank-nav-icon" })}
                                <span>{childLabel}</span>
                              </div>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Collapsible group
              const isExpanded = !!expanded[name];
              return (
                <div key={`${layout}-${name}`}>
                  <button
                    onClick={() => toggleGroup(name)}
                    className="ank-group-header w-full"
                  >
                    <div className="flex items-center gap-2">
                      {icon && React.cloneElement(icon, { className: "ank-nav-icon" })}
                      <span>{label}</span>
                    </div>
                    {isExpanded
                      ? <ChevronDownIcon className="h-3 w-3 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
                      : <ChevronRightIcon className="h-3 w-3 flex-shrink-0" style={{ color: "var(--text-tertiary)" }} />
                    }
                  </button>
                  {isExpanded && (
                    <div className="mt-0.5 ml-3 pl-2.5 space-y-0.5" style={{ borderLeft: "1px solid var(--sidebar-border)" }}>
                      {children.map((child) => {
                        const to = child.href || `/${layout || "dashboard"}${child.path || ""}`;
                        const childLabel = t(`sidenav.${child.name}`) || child.name;
                        return (
                          <NavLink key={to} to={to} end>
                            {({ isActive }) => (
                              <div className={`ank-nav-item ${isActive ? "active" : ""}`}>
                                {child.icon && React.cloneElement(child.icon, { className: "ank-nav-icon" })}
                                <span>{childLabel}</span>
                              </div>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <Link to="/dashboard/home">
            <div className="ank-nav-item">
              <svg className="ank-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <span>Dashboard</span>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}

Sidenav.defaultProps = {
  brandImg: "/img/logoanko.png",
  brandName: APP_NAME,
};

Sidenav.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Sidenav;
