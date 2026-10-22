import React from "react";
import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  Squares2X2Icon,
  BoltIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  BoltIcon as BoltIconSolid,
  RectangleStackIcon as RectangleStackIconSolid,
} from "@heroicons/react/24/solid";
import { useLanguage } from "@/context/language-context";

// Bottom tab bar of the personal app on mobile. Same look as the enterprise
// AdminMobileTabBar (palette C, outline icon / solid when active).
export function MobileTabBar() {
  const { language } = useLanguage();
  const es = language === "es";

  const items = [
    { to: "/dashboard/home", label: es ? "Inicio" : "Home", outline: HomeIcon, solid: HomeIconSolid },
    { to: "/dashboard/projects", label: es ? "Proyectos" : "Projects", outline: Squares2X2Icon, solid: Squares2X2IconSolid },
    { to: "/dashboard/my-batteries", label: es ? "Baterías" : "Batteries", outline: BoltIcon, solid: BoltIconSolid },
    { to: "/dashboard/my-decks", label: es ? "Estudiar" : "Study", outline: RectangleStackIcon, solid: RectangleStackIconSolid },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9000] flex items-center justify-around"
      style={{
        height: 58,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {items.map(({ to, label, outline: Icon, solid: IconSolid }) => (
        <NavLink
          key={to}
          to={to}
          end
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-0 transition-colors duration-150"
        >
          {({ isActive }) => {
            const ActiveIcon = isActive ? IconSolid : Icon;
            return (
              <>
                <ActiveIcon style={{ width: 22, height: 22, color: isActive ? "var(--accent)" : "var(--text-tertiary)" }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? "var(--accent)" : "var(--text-tertiary)",
                    lineHeight: 1,
                    maxWidth: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    padding: "0 2px",
                  }}
                >
                  {label}
                </span>
              </>
            );
          }}
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileTabBar;
