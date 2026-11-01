import React, { createContext, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import authService from "../services/authService";
import rbacService from "../services/rbacService";
import { setAuthToken } from "../services/api";
import { isAuthFailure } from "@/utils/authErrors";

const AuthContext = createContext(null);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Last good /auth/me/ for the current token, per tab. A transient failure (429, 5xx, network)
// on reload falls back to it instead of signing the user out; only a 401 ends the session.
const ME_CACHE_KEY = "auth_me_cache";
export function cacheMe(token, me) {
  try { sessionStorage.setItem(ME_CACHE_KEY, JSON.stringify({ token, me })); } catch { /* storage blocked */ }
}
export function cachedMe(token) {
  try {
    const raw = JSON.parse(sessionStorage.getItem(ME_CACHE_KEY) || "null");
    return raw && raw.token === token ? raw.me : null;
  } catch { return null; }
}
export function clearCachedMe() {
  try { sessionStorage.removeItem(ME_CACHE_KEY); } catch { /* storage blocked */ }
}

// A transient failure (429 throttling, brief network hiccup) on the RBAC/context
// fetch must not permanently blank the sidebar for the rest of the session — this
// is on the critical path for basic navigation, so retry a couple of times with a
// short backoff before giving up.
async function withRetry(fn, { attempts = 3, delayMs = 1500, stopIf } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (stopIf?.(err)) break;
      if (i < attempts - 1) await sleep(delayMs * (i + 1));
    }
  }
  throw lastErr;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowedRoutes, setAllowedRoutes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [hasCompany, setHasCompany] = useState(false);
  const [companyRole, setCompanyRole] = useState(null);

  const applyContext = (ctx) => {
    const list = ctx?.companies || [];
    setCompanies(list);
    setHasCompany(ctx?.has_company ?? list.length > 0);
    setCompanyRole(list[0]?.role || null);
    return list;
  };

  // Resolves the enterprise context first (to get the active company_id),
  // then fetches allowed_routes for that company in one call — this single
  // endpoint returns both dashboard.* (global User.roles) and enterprise.*
  // (CompanyMembership.role) keys together.
  const refreshRbacAndContext = async () => {
    let companyId = null;
    let hasCompanyResult = false;
    try {
      const ctx = await withRetry(() => authService.meContext());
      const list = applyContext(ctx);
      companyId = list?.[0]?.company_id;
      hasCompanyResult = ctx?.has_company ?? list.length > 0;
    } catch (err) {
      console.error("meContext fetch failed", err);
    }

    try {
      const rbac = await withRetry(() => rbacService.fetchAllowedRoutes(companyId));
      setAllowedRoutes(rbac.allowed_routes || []);
      setIsAdmin(rbac.is_admin || false);
      setRoles(rbac.roles || []);
    } catch (err) {
      console.error("RBAC fetch failed", err);
    }

    return hasCompanyResult;
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setAuthToken(token);
        // F-07: a throttled/failed /auth/me/ used to delete the token and sign the user out.
        // Retry transient errors; only an invalid/expired token ends the session.
        const me = await withRetry(async () => {
          try {
            return await authService.me();
          } catch (err) {
            if (isAuthFailure(err)) err.fatal = true;
            throw err;
          }
        }, { attempts: 3, delayMs: 1000, stopIf: (err) => err?.fatal });
        cacheMe(token, me);
        if (mounted) await refreshRbacAndContext();
        if (mounted) setUser(me);
      } catch (err) {
        if (isAuthFailure(err)) {
          localStorage.removeItem("token");
          setAuthToken(null);
          clearCachedMe();
          if (mounted) setUser(null);
        } else {
          // Not an authentication problem: keep the session with the last known user and
          // refresh in the background once the API recovers.
          const known = cachedMe(token);
          if (mounted) setUser(known);
          if (known) {
            refreshRbacAndContext().catch(() => {});
            setTimeout(() => {
              authService.me().then((fresh) => { cacheMe(token, fresh); if (mounted) setUser(fresh); }).catch(() => {});
            }, 30_000);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials) => {
    const { token, user: u } = await authService.login(credentials);
    window.localStorage.setItem("token", token);
    setAuthToken(token);
    const hasCompany = await refreshRbacAndContext();
    setUser(u);
    return { user: u, hasCompany };
  };

  const register = async (payload) => {
    const response = await authService.register(payload);
    const { token, user: u } = response;

    if (token) {
      window.localStorage.setItem("token", token);
      setAuthToken(token);
      await refreshRbacAndContext();
      setUser(u);
    }

    return { ...response, user: u || null };
  };

  // Every sign-in / profile change refreshes the per-tab fallback copy.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (user && token) cacheMe(token, user);
  }, [user]);

  const logout = () => {
    authService.logout();
    localStorage.removeItem("token");
    clearCachedMe();
    setUser(null);
    setAllowedRoutes([]);
    setIsAdmin(false);
    setRoles([]);
    setCompanies([]);
    setHasCompany(false);
    setCompanyRole(null);
  };

  const refreshContext = async () => {
    await refreshRbacAndContext();
  };

  const updateUser = async (data) => {
    const updatedUser = await authService.updateProfile(data);
    setUser(updatedUser);
    return updatedUser;
  };

  const socialLogin = async (provider, token) => {
    const { token: jwtToken, user: u } = await authService.socialLogin(provider, token);
    window.localStorage.setItem("token", jwtToken);
    setAuthToken(jwtToken);
    const hasCompany = await refreshRbacAndContext();
    setUser(u);
    return { user: u, hasCompany };
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    allowedRoutes,
    isAdmin,
    roles,
    companies,
    hasCompany,
    companyRole,
    login,
    register,
    logout,
    updateUser,
    socialLogin,
    refreshContext,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthProvider;
