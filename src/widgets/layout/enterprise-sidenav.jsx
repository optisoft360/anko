import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronRightIcon, MagnifyingGlassIcon, Squares2X2Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMaterialTailwindController, setOpenSidenav } from "@/context";
import { useLanguage } from "@/context/language-context";
import { APP_NAME } from "@/config/app";

// Enterprise sidebar (light, palette C). Same items and the same permission filtering
// as before (the layout passes the filtered routes); only the presentation changes:
// the Enterprise items are shown in collapsible groups (`group` in routes.jsx).
// Material Tailwind replaces Tailwind's color scales, so colors are hex values.

const GROUP_ORDER = ["content", "training", "retention", "compliance", "certifications", "analytics", "organization"];
const DEFAULT_OPEN = ["content", "training"];

const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1]";
const linkTo = (layout, item) => item.href || `/${layout || "dashboard"}${item.path || ""}`;

function NavItem({ to, icon, label, onNavigate }) {
  return (
    <NavLink to={to} end onClick={onNavigate}
      className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors duration-150 ${FOCUS} ${
        isActive ? "bg-[#EEF2FF] font-medium text-[#4338CA]" : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"}`}>
      {icon && React.cloneElement(icon, { className: "h-4 w-4 shrink-0", "aria-hidden": true })}
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

NavItem.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.node,
  label: PropTypes.string.isRequired,
  onNavigate: PropTypes.func,
};

function NavGroup({ id, label, open, onToggle, children }) {
  return (
    <div className="mt-3">
      <button type="button" onClick={() => onToggle(id)} aria-expanded={open}
        className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] transition-colors hover:text-[#475569] ${FOCUS}`}>
        <span className="truncate">{label}</span>
        <ChevronRightIcon className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

NavGroup.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  open: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export function EnterpriseSidenav({ routes, company, role }) {
  const [controller, dispatch] = useMaterialTailwindController();
  const { openSidenav } = controller;
  const { t } = useLanguage();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => Object.fromEntries(DEFAULT_OPEN.map((g) => [g, true])));
  const searchRef = useRef(null);

  // Sections in route order: plain links, collapsible pages (Admin Area) and the
  // Enterprise page, whose children are split into groups.
  const sections = useMemo(() => {
    const out = [];
    (routes || []).filter((r) => !r.hidden).forEach(({ layout, pages }) => {
      (pages || []).filter((p) => !p.hidden).forEach((page) => {
        const items = (page.children || []).map((c) => ({ ...c, to: linkTo(layout, c), label: t(`sidenav.${c.name}`) }));
        if (!page.children) {
          out.push({ kind: "link", key: `${layout}-${page.name}`, item: { ...page, to: linkTo(layout, page), label: t(`sidenav.${page.name}`) } });
        } else if (page.alwaysOpen) {
          const top = items.filter((c) => !c.group);
          const groups = GROUP_ORDER
            .map((g) => ({ id: g, label: t(`sidenav.groups.${g}`), items: items.filter((c) => c.group === g) }))
            .filter((g) => g.items.length > 0);
          out.push({ kind: "grouped", key: `${layout}-${page.name}`, top, groups });
        } else if (items.length > 0) {
          out.push({ kind: "group", key: `${layout}-${page.name}`, group: { id: page.name, label: t(`sidenav.${page.name}`), items } });
        }
      });
    });
    return out;
  }, [routes, t]);

  // The group holding the current page is always open.
  useEffect(() => {
    const active = [];
    sections.forEach((s) => {
      const groups = s.kind === "grouped" ? s.groups : s.kind === "group" ? [s.group] : [];
      groups.forEach((g) => { if (g.items.some((i) => location.pathname.startsWith(i.to))) active.push(g.id); });
    });
    if (active.length) setExpanded((prev) => (active.every((id) => prev[id]) ? prev : { ...prev, ...Object.fromEntries(active.map((id) => [id, true])) }));
  }, [location.pathname, sections]);

  // Cmd/Ctrl+K focuses the menu search.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (item) => !q || item.label.toLowerCase().includes(q);
  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const closeOnMobile = () => setOpenSidenav(dispatch, false);
  const companyName = company?.company_name || company?.name || "";

  const renderGroup = (g) => {
    const items = g.items.filter(matches);
    if (!items.length) return null;
    return (
      <NavGroup key={g.id} id={g.id} label={g.label} open={q ? true : !!expanded[g.id]} onToggle={toggle}>
        {items.map((i) => <NavItem key={i.to} to={i.to} icon={i.icon} label={i.label} onNavigate={closeOnMobile} />)}
      </NavGroup>
    );
  };

  return (
    <>
      {openSidenav && <div className="fixed inset-0 z-[9999] bg-[#0F172A]/40 md:hidden" onClick={closeOnMobile} />}

      <aside
        style={{ width: "var(--sidebar-w)" }}
        className={`fixed inset-y-0 left-0 z-[10000] flex flex-col border-r border-[#E2E8F0] bg-white transition-transform duration-200 md:z-40 md:translate-x-0 ${
          openSidenav ? "translate-x-0" : "-translate-x-full"}`}
        aria-label={t("sidenav.mainNavigation")}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[#E2E8F0] px-5">
          <Link to="/enterprise/dashboard" className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg ${FOCUS}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#4F46E5] text-sm font-bold text-white">A</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[#0F172A]">{APP_NAME || "Ankard"}</span>
              <span className="block truncate text-xs text-[#64748B]">{t("sidenav.enterprise")}</span>
            </span>
          </Link>
          <button type="button" onClick={closeOnMobile} aria-label={t("sidenav.closeMenu")}
            className={`rounded-md p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] md:hidden ${FOCUS}`}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-4">
          <label className="relative block">
            <span className="sr-only">{t("sidenav.searchLabel")}</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
            <input ref={searchRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={t("sidenav.searchPlaceholder")}
              className="h-9 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-12 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#6366F1] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E0E7FF]" />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#E2E8F0] bg-white px-1.5 text-[10px] font-medium text-[#94A3B8]">⌘K</kbd>
          </label>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {sections.map((s) => {
            if (s.kind === "link") {
              return matches(s.item) ? <NavItem key={s.key} to={s.item.to} icon={s.item.icon} label={s.item.label} onNavigate={closeOnMobile} /> : null;
            }
            if (s.kind === "group") return <React.Fragment key={s.key}>{renderGroup(s.group)}</React.Fragment>;
            return (
              <div key={s.key} className="mt-3 first:mt-0">
                <div className="space-y-0.5">
                  {s.top.filter(matches).map((i) => <NavItem key={i.to} to={i.to} icon={i.icon} label={i.label} onNavigate={closeOnMobile} />)}
                </div>
                {s.groups.map(renderGroup)}
              </div>
            );
          })}
        </nav>

        {/* Footer: personal app + current company */}
        <div className="space-y-1 border-t border-[#E2E8F0] p-3">
          <NavItem to="/dashboard/home" icon={<Squares2X2Icon />} label={t("sidenav.personalDashboard")} onNavigate={closeOnMobile} />
          {companyName && (
            <div className="flex items-center gap-3 rounded-lg p-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-sm font-semibold text-white">
                {companyName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#0F172A]">{companyName}</span>
                <span className="block truncate text-xs text-[#64748B]">
                  {t("sidenav.enterprise")}{role ? ` · ${t(`enterprise.roles.${role}`)}` : ""}
                </span>
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

EnterpriseSidenav.propTypes = {
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
  company: PropTypes.object,
  role: PropTypes.string,
};

export default EnterpriseSidenav;
