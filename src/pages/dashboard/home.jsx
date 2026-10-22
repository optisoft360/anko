import React from "react";
import { useNavigate } from "react-router-dom";
import {
  UserCircleIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  RectangleStackIcon,
  BoltIcon,
  TagIcon,
  ClipboardDocumentCheckIcon,
  UsersIcon,
  FolderIcon,
  BookOpenIcon,
  ArrowRightIcon,
  ChartBarIcon,
} from "@heroicons/react/24/solid";
import { useLanguage } from "@/context/language-context";
import { useAuth } from "@/context/auth-context";
import { useProjects } from "@/context/projects-context";
import projectService from "@/services/projectService";


// Light theme (palette C), same visual language as the enterprise dashboard.
// Material Tailwind replaces Tailwind's color scales, so colors are hex classes.
const TONE = {
  indigo:  "bg-[#EEF2FF] text-[#4F46E5]",
  violet:  "bg-[#F5F3FF] text-[#7C3AED]",
  blue:    "bg-[#EFF6FF] text-[#2563EB]",
  purple:  "bg-[#FAF5FF] text-[#9333EA]",
  emerald: "bg-[#ECFDF5] text-[#059669]",
  teal:    "bg-[#F0FDFA] text-[#0D9488]",
  amber:   "bg-[#FFFBEB] text-[#D97706]",
  sky:     "bg-[#F0F9FF] text-[#0284C7]",
  rose:    "bg-[#FFF1F2] text-[#E11D48]",
  orange:  "bg-[#FFF7ED] text-[#EA580C]",
  pink:    "bg-[#FDF2F8] text-[#DB2777]",
};

const CARD = "rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_0_rgb(15_23_42/0.04),0_1px_3px_0_rgb(15_23_42/0.06)]";
const FOCUS = "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366F1] focus-visible:ring-offset-2";

/* Admin action cards config */
const adminCards = (lang) => [
  { name: lang === "es" ? "Usuarios"        : "Users",          path: "/dashboard/users",          icon: UsersIcon,               tone: "indigo" },
  { name: lang === "es" ? "Recursos"        : "Resources",      path: "/dashboard/resources",      icon: ServerStackIcon,         tone: "violet" },
  { name: lang === "es" ? "Permisos"        : "Permissions",    path: "/dashboard/permissions",    icon: ShieldCheckIcon,         tone: "blue" },
  { name: lang === "es" ? "Roles"           : "Roles",          path: "/dashboard/roles",          icon: UserCircleIcon,          tone: "purple" },
  { name: lang === "es" ? "Planes"          : "Plans",          path: "/dashboard/plans",          icon: CreditCardIcon,          tone: "emerald" },
  { name: lang === "es" ? "Límites de Plan" : "Plan Limits",    path: "/dashboard/plan-limits",    icon: ClipboardDocumentCheckIcon, tone: "teal" },
  { name: lang === "es" ? "Suscripciones"  : "Subscriptions",  path: "/dashboard/subscriptions",  icon: TagIcon,                 tone: "amber" },
  { name: lang === "es" ? "Decks"          : "Decks",           path: "/dashboard/decks",          icon: RectangleStackIcon,      tone: "sky" },
  { name: lang === "es" ? "Baterías"       : "Batteries",       path: "/dashboard/batteries",      icon: BoltIcon,                tone: "indigo" },
  { name: lang === "es" ? "Flashcards"     : "Flashcards",      path: "/dashboard/flashcards",     icon: RectangleStackIcon,      tone: "blue" },
  { name: lang === "es" ? "Soporte"        : "Support",         path: "/dashboard/support-requests", icon: EnvelopeIcon,          tone: "rose" },
  { name: lang === "es" ? "Procesos"       : "Processes",       path: "/dashboard/global-projects", icon: FolderIcon,             tone: "orange" },
  { name: lang === "es" ? "Rutas Aprend."  : "Learning Paths",  href: "/enterprise/learning/paths", icon: BookOpenIcon,           tone: "pink" },
  { name: lang === "es" ? "Empresas"       : "Companies",       href: "/platform-admin/companies",  icon: BuildingOffice2Icon,    tone: "amber" },
];

function SectionTitle({ children }) {
  return <h2 className="text-base font-semibold text-[#0F172A]">{children}</h2>;
}

export function Home() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { projects, batteries } = useProjects();
  const [deckCount, setDeckCount] = React.useState(null);
  const [recentDecks, setRecentDecks] = React.useState([]);

  React.useEffect(() => {
    projectService.getUserDecks(1, 3)
      .then(data => {
        const results = data.results || (Array.isArray(data) ? data : []);
        const count = data.count ?? (Array.isArray(data) ? data.length : null);
        setDeckCount(count);
        setRecentDecks(results);
      })
      .catch(() => setDeckCount(null));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return language === "es" ? "Buenos días" : "Good morning";
    if (h < 18) return language === "es" ? "Buenas tardes" : "Good afternoon";
    return language === "es" ? "Buenas noches" : "Good evening";
  };

  const displayName = user?.first_name || user?.username || "Admin";
  const es = language === "es";
  const cards = adminCards(language);
  const go = (item) => navigate(item.href || item.path);

  const stats = [
    { num: projects.length, label: es ? "Proyectos" : "Projects", icon: FolderIcon, tone: "indigo", path: "/dashboard/projects" },
    { num: batteries.length, label: es ? "Baterías" : "Batteries", icon: BoltIcon, tone: "emerald", path: "/dashboard/my-batteries" },
    { num: deckCount ?? "—", label: "Decks", icon: RectangleStackIcon, tone: "sky", path: "/dashboard/my-decks" },
  ];

  const content = [
    { num: deckCount ?? "—", label: es ? "Decks totales" : "Total Decks", tone: "sky", path: "/dashboard/decks", icon: RectangleStackIcon },
    { num: batteries.length, label: es ? "Baterías activas" : "Active Batteries", tone: "indigo", path: "/dashboard/batteries", icon: BoltIcon },
    { num: projects.length, label: es ? "Proyectos" : "Projects", tone: "emerald", path: "/dashboard/global-projects", icon: FolderIcon },
    { num: "—", label: "Flashcards", tone: "pink", path: "/dashboard/flashcards", icon: RectangleStackIcon },
  ];

  const critical = [
    { label: es ? "Gestionar usuarios globales" : "Manage global users", sub: es ? "Altas, bajas, roles" : "Create, disable, assign roles", path: "/dashboard/users", icon: UsersIcon, tone: "indigo" },
    { label: es ? "Revisar mensajes de soporte" : "Review support messages", sub: es ? "Tickets pendientes de respuesta" : "Tickets awaiting response", path: "/dashboard/support-requests", icon: EnvelopeIcon, tone: "rose" },
    { label: es ? "Administrar empresas Enterprise" : "Manage Enterprise companies", sub: es ? "Altas, configuración, usuarios" : "Onboard, configure, manage users", href: "/platform-admin/companies", icon: BuildingOffice2Icon, tone: "amber" },
    { label: es ? "Configurar planes y límites" : "Configure plans & limits", sub: es ? "Precios, cuotas, restricciones" : "Pricing, quotas, restrictions", path: "/dashboard/plans", icon: CreditCardIcon, tone: "emerald" },
    { label: es ? "Control de permisos y roles" : "Permissions & roles", sub: es ? "Accesos y privilegios del sistema" : "System access and privileges", path: "/dashboard/permissions", icon: ShieldCheckIcon, tone: "violet" },
    { label: es ? "Suscripciones activas" : "Active subscriptions", sub: es ? "Estado y gestión de suscripciones" : "Subscription status and management", path: "/dashboard/subscriptions", icon: TagIcon, tone: "amber" },
  ];

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-5 sm:space-y-8 md:py-2">
      {/* Header */}
      <section className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#4F46E5]">{greeting()}</p>
          <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-[#0F172A] sm:text-3xl">{displayName}</h1>
          {isAdmin && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#FFE4E6] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#BE123C]">Platform Admin</span>
              <p className="text-sm text-[#64748B]">{es ? "Control total de la plataforma Ankard" : "Full control of the Ankard platform"}</p>
            </div>
          )}
        </div>

      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((s) => (
          <button key={s.label} type="button" onClick={() => navigate(s.path)}
            className={`group ${CARD} flex cursor-pointer flex-col items-start gap-2 p-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-5 ${FOCUS}`}>
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg sm:h-11 sm:w-11 ${TONE[s.tone]}`}><s.icon className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-2xl font-semibold tabular-nums text-[#0F172A] sm:text-3xl">{s.num}</span>
              <span className="block truncate text-xs font-medium text-[#64748B] sm:text-sm">{s.label}</span>
            </span>
            <ArrowRightIcon className="hidden h-4 w-4 text-[#CBD5E1] transition-colors group-hover:text-[#4F46E5] sm:block" />
          </button>
        ))}
      </section>

      {/* Administration modules */}
      {isAdmin && (
        <section className={CARD}>
          <div className="border-b border-[#F1F5F9] px-4 py-4 sm:px-6">
            <SectionTitle>{es ? "Módulos de Administración" : "Administration Modules"}</SectionTitle>
            <p className="text-sm text-[#64748B]">{es ? "Toda la configuración de la plataforma, a un clic." : "Every platform setting, one click away."}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-7 sm:p-6">
            {cards.map((card) => (
              <button key={card.name} type="button" onClick={() => go(card)}
                className={`group flex cursor-pointer flex-col items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white px-2 py-4 text-center transition duration-200 hover:-translate-y-0.5 hover:border-[#C7D2FE] hover:shadow-md ${FOCUS}`}>
                <span className={`grid h-11 w-11 place-items-center rounded-lg ${TONE[card.tone]}`}><card.icon className="h-5 w-5" /></span>
                <span className="text-xs font-medium leading-tight text-[#334155]">{card.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Platform overview */}
      <section className={`grid grid-cols-1 gap-5 sm:gap-6 ${isAdmin ? "xl:grid-cols-2" : ""}`}>
        <div className={`${CARD} p-4 sm:p-6`}>
          <div className="flex items-center gap-3">
            <span className={`grid h-9 w-9 place-items-center rounded-lg ${TONE.indigo}`}><ChartBarIcon className="h-4 w-4" /></span>
            <SectionTitle>{es ? "Contenido de la Plataforma" : "Platform Content"}</SectionTitle>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {content.map((c) => (
              <button key={c.label} type="button" onClick={() => navigate(c.path)}
                className={`group cursor-pointer rounded-xl border border-[#E2E8F0] bg-white p-4 text-left transition duration-200 hover:border-[#C7D2FE] hover:bg-[#F8FAFC] ${FOCUS}`}>
                <span className="flex items-center justify-between">
                  <span className={`grid h-8 w-8 place-items-center rounded-md ${TONE[c.tone]}`}><c.icon className="h-4 w-4" /></span>
                  <ArrowRightIcon className="h-3.5 w-3.5 text-[#CBD5E1] transition-colors group-hover:text-[#4F46E5]" />
                </span>
                <span className="mt-3 block text-2xl font-semibold tabular-nums text-[#0F172A]">{c.num}</span>
                <span className="block text-xs font-medium text-[#64748B]">{c.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#22C55E]" />
            <p className="text-sm font-medium text-[#15803D]">{es ? "Plataforma operativa — todos los servicios activos" : "Platform operational — all services active"}</p>
          </div>
        </div>

        {isAdmin && (
          <div className={`${CARD} p-4 sm:p-6`}>
            <div className="flex items-center gap-3">
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${TONE.rose}`}><ShieldCheckIcon className="h-4 w-4" /></span>
              <SectionTitle>{es ? "Acciones Críticas de Admin" : "Critical Admin Actions"}</SectionTitle>
            </div>
            <ul className="mt-5 divide-y divide-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
              {critical.map((item) => (
                <li key={item.label}>
                  <button type="button" onClick={() => go(item)}
                    className={`group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-[#F8FAFC] first:rounded-t-xl last:rounded-b-xl ${FOCUS}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${TONE[item.tone]}`}><item.icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-[#0F172A]">{item.label}</span>
                      <span className="block text-xs text-[#64748B]">{item.sub}</span>
                    </span>
                    <ArrowRightIcon className="h-4 w-4 shrink-0 text-[#CBD5E1] transition-colors group-hover:text-[#4F46E5]" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

export default Home;
