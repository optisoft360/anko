import { useAuth } from "@/context/auth-context";

// M-07: a signed-in user who belongs to no company only gets the home page, without
// the side menu (hamburger / drawer) or the bottom tab bar. Phones only by default;
// set this to true to apply it on desktop as well.
export const HIDE_NAV_WITHOUT_COMPANY_ON_DESKTOP = false;

/**
 * Whether to hide the navigation for the current user, per screen size. Uses the
 * company context the app already loads (/auth/me/context/ → hasCompany), so it
 * updates without a reload when the user joins a company. Platform admins keep the
 * navigation (it holds the Admin Area). Route guards are not changed.
 */
export function useHideNavWithoutCompany() {
  const { user, hasCompany, isAdmin, loading } = useAuth();
  const hide = Boolean(user) && !loading && !hasCompany && !isAdmin;
  return { mobile: hide, desktop: hide && HIDE_NAV_WITHOUT_COMPANY_ON_DESKTOP };
}
