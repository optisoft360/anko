import {
  HomeIcon,
  UserCircleIcon,
  ServerStackIcon,
  RectangleStackIcon,
  FolderIcon,
  TagIcon,
  ClipboardDocumentCheckIcon,
  BoltIcon,
  CreditCardIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  BookOpenIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  CircleStackIcon,
} from "@heroicons/react/24/solid";
import {
  Home, Projects, GlobalTopics, GlobalRules, GlobalBatteries, GlobalSections, Billing, Faqs, AboutUs, ContactPage,
  GlobalResources, GlobalPermissions, GlobalRoles, GlobalPlans, GlobalPlanLimits, GlobalSubscriptions,
  GlobalBatteryShares, /* GlobalSavedBatteries: UNUSED-CLEANUP */ GlobalInvites, GlobalDecks, GlobalFlashcards, GlobalDeckShares, /* GlobalSavedDecks: UNUSED-CLEANUP */
  GlobalUsers, GlobalProjects, GlobalSupportRequests, GlobalLearningPaths, MyDecks, MyBatteries, PublicDecks, PublicBatteries
} from "@/pages/dashboard";
import { SignIn, SignUp, EmailVerification, ForgotPassword, ResetPassword } from "@/pages/auth";

const icon = { className: "w-5 h-5 text-inherit" };

export const routes = [
  {
    layout: "dashboard",
    pages: [
      // ─── Route registrations (hidden from sidenav — appear inside Dashboard group) ───
      { name: "home",              path: "/home",              element: <Home />,                hidden: true },
      { name: "projects",         path: "/projects",          element: <Projects />,             hidden: true },
      { name: "my-decks",         path: "/my-decks",          element: <MyDecks />,              hidden: true },
      { name: "my-batteries",     path: "/my-batteries",      element: <MyBatteries />,          hidden: true },
      { name: "public-decks",     path: "/public-decks",      element: <PublicDecks />,          hidden: true },
      { name: "public-batteries", path: "/public-batteries",  element: <PublicBatteries />,      hidden: true },
      { name: "topics",           path: "/topics",            element: <GlobalTopics />,         hidden: true },
      { name: "rules",            path: "/rules",             element: <GlobalRules />,          hidden: true },
      { name: "batteries",        path: "/batteries",         element: <GlobalBatteries />,      hidden: true },
      { name: "sections",         path: "/sections",          element: <GlobalSections />,       hidden: true },
      { name: "billing",          path: "/billing",           element: <Billing />,              hidden: true },
      { name: "faqs",             path: "/faqs",              element: <Faqs />,                 hidden: true },
      { name: "about-us",         path: "/about-us",          element: <AboutUs />,              hidden: true },
      { name: "contact-us",       path: "/contact-us",        element: <ContactPage />,          hidden: true },
      // Admin routes (hidden)
      { name: "users",            path: "/users",             element: <GlobalUsers />,          hidden: true },
      { name: "resources",        path: "/resources",         element: <GlobalResources />,      hidden: true },
      { name: "permissions",      path: "/permissions",       element: <GlobalPermissions />,    hidden: true },
      { name: "roles",            path: "/roles",             element: <GlobalRoles />,          hidden: true },
      { name: "plans",            path: "/plans",             element: <GlobalPlans />,          hidden: true },
      { name: "plan-limits",      path: "/plan-limits",       element: <GlobalPlanLimits />,     hidden: true },
      { name: "subscriptions",    path: "/subscriptions",     element: <GlobalSubscriptions />,  hidden: true },
      { name: "battery-shares",   path: "/battery-shares",   element: <GlobalBatteryShares />,  hidden: true },
      // UNUSED-CLEANUP (2026-10-11): endpoint admin/saved-batteries comentado en el backend
      // { name: "saved-batteries",  path: "/saved-batteries",  element: <GlobalSavedBatteries />, hidden: true },
      { name: "invites",          path: "/invites",           element: <GlobalInvites />,        hidden: true },
      { name: "decks",            path: "/decks",             element: <GlobalDecks />,          hidden: true },
      { name: "flashcards",       path: "/flashcards",        element: <GlobalFlashcards />,     hidden: true },
      { name: "deck-shares",      path: "/deck-shares",       element: <GlobalDeckShares />,     hidden: true },
      // UNUSED-CLEANUP (2026-10-11): endpoint admin/saved-decks comentado en el backend
      // { name: "saved-decks",      path: "/saved-decks",       element: <GlobalSavedDecks />,     hidden: true },
      { name: "global-projects",  path: "/global-projects",   element: <GlobalProjects />,       hidden: true },
      { name: "support-requests",    path: "/support-requests",     element: <GlobalSupportRequests />,  hidden: true },
      { name: "global-learning-paths", path: "/global-learning-paths", element: <GlobalLearningPaths />, hidden: true },

      // ─── ADMIN AREA group (collapsible) ─────────────────────────────────────────
      {
        icon: <ShieldCheckIcon {...icon} />,
        name: "admin-area",
        children: [
          { icon: <UsersIcon {...icon} />,                  name: "users",                path: "/users" },
          { icon: <ServerStackIcon {...icon} />,            name: "resources",            path: "/resources" },
          { icon: <ShieldCheckIcon {...icon} />,            name: "permissions",          path: "/permissions" },
          { icon: <UserCircleIcon {...icon} />,             name: "roles",                path: "/roles" },
          { icon: <CreditCardIcon {...icon} />,             name: "plans",                path: "/plans" },
          { icon: <ClipboardDocumentCheckIcon {...icon} />, name: "plan-limits",          path: "/plan-limits" },
          { icon: <TagIcon {...icon} />,                    name: "subscriptions",        path: "/subscriptions" },
          { icon: <RectangleStackIcon {...icon} />,         name: "decks",                path: "/decks" },
          { icon: <BoltIcon {...icon} />,                   name: "batteries",            path: "/batteries" },
          { icon: <RectangleStackIcon {...icon} />,         name: "flashcards",           path: "/flashcards" },
          { icon: <EnvelopeIcon {...icon} />,               name: "support-requests",     path: "/support-requests" },
          { icon: <FolderIcon {...icon} />,                 name: "global-process",       path: "/global-projects" },
          { icon: <BookOpenIcon {...icon} />,               name: "global-learning-path", path: "/global-learning-paths" },
          { icon: <BuildingOffice2Icon {...icon} />,        name: "companies",            href: "/platform-admin/companies" },
          { icon: <EnvelopeIcon {...icon} />,               name: "pa-invitations",       href: "/platform-admin/invitations" },
        ],
      },

      // ─── ENTERPRISE group (always open, never collapses) ─────────────────────────
      {
        icon: <BuildingOffice2Icon {...icon} />,
        name: "enterprise",
        alwaysOpen: true,
        children: [
          { icon: <HomeIcon {...icon} />,                   name: "ent-dashboard",           href: "/enterprise/dashboard" },
          { icon: <DocumentTextIcon {...icon} />,           name: "ent-knowledge",           href: "/enterprise/knowledge" },
          { icon: <RectangleStackIcon {...icon} />,         name: "ent-paths",               href: "/enterprise/learning/paths" },
          { icon: <UsersIcon {...icon} />,                  name: "ent-manage-assignments",  href: "/enterprise/learning/manage-assignments" },
          { icon: <CircleStackIcon {...icon} />,            name: "ent-knowledge-graph",     href: "/enterprise/knowledge/graph" },
          { icon: <BookOpenIcon {...icon} />,               name: "ent-assignments",         href: "/enterprise/learning/assignments" },
          { icon: <ClipboardDocumentCheckIcon {...icon} />, name: "ent-reviews",             href: "/enterprise/learning/reviews" },
          { icon: <ChartBarIcon {...icon} />,               name: "ent-gaps",                href: "/enterprise/learning/gaps" },
          { icon: <BookOpenIcon {...icon} />,               name: "ent-programs",            href: "/enterprise/learning/programs" },
          { icon: <ArrowTrendingUpIcon {...icon} />,        name: "ent-retention-me",        href: "/enterprise/retention/me" },
          { icon: <ArrowTrendingUpIcon {...icon} />,        name: "ent-retention-team",      href: "/enterprise/retention/team" },
          { icon: <ArrowTrendingUpIcon {...icon} />,        name: "ent-retention-company",   href: "/enterprise/retention/company" },
          { icon: <ShieldCheckIcon {...icon} />,            name: "ent-compliance-me",       href: "/enterprise/compliance/me" },
          { icon: <ShieldCheckIcon {...icon} />,            name: "ent-compliance-programs", href: "/enterprise/compliance/programs" },
          { icon: <ShieldCheckIcon {...icon} />,            name: "ent-compliance-team",     href: "/enterprise/compliance/team" },
          { icon: <ShieldCheckIcon {...icon} />,            name: "ent-compliance-company",  href: "/enterprise/compliance/company" },
          { icon: <AcademicCapIcon {...icon} />,            name: "ent-certs-me",            href: "/enterprise/certifications" },
          { icon: <AcademicCapIcon {...icon} />,            name: "ent-certs-templates",     href: "/enterprise/certifications/templates" },
          { icon: <AcademicCapIcon {...icon} />,            name: "ent-certs-company",       href: "/enterprise/certifications/company" },
          { icon: <ChartBarIcon {...icon} />,               name: "ent-analytics-retention", href: "/enterprise/analytics/retention" },
          { icon: <ChartBarIcon {...icon} />,               name: "ent-analytics-compliance",href: "/enterprise/analytics/compliance" },
          { icon: <ChartBarIcon {...icon} />,               name: "ent-analytics-learning",  href: "/enterprise/analytics/learning" },
          { icon: <ChartBarIcon {...icon} />,               name: "ent-analytics-health",    href: "/enterprise/analytics/health" },
          { icon: <EnvelopeIcon {...icon} />,               name: "ent-invitations",         href: "/enterprise/invitations" },
          { icon: <Cog6ToothIcon {...icon} />,              name: "ent-settings",            href: "/enterprise/settings" },
        ],
      },
    ],
  },
  {
    layout: "auth",
    hidden: true,
    pages: [
      { path: "/sign-in",                    element: <SignIn />,         hidden: true },
      { path: "/sign-up",                    element: <SignUp />,         hidden: true },
      { path: "/email-verification",         element: <EmailVerification />, hidden: true },
      { path: "/forgot-password",            element: <ForgotPassword />, hidden: true },
      { path: "/reset-password/:uid/:token", element: <ResetPassword />, hidden: true },
    ],
  },
];

export default routes;
