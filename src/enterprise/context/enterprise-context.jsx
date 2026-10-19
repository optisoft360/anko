import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { companyApi } from "../api/enterpriseApi";
import { useAuth } from "@/context/auth-context";

const EnterpriseContext = createContext(null);
const ROLE_HIERARCHY = ["employee", "trainer", "auditor", "manager", "admin", "owner"];

function normalizeCompany(c) {
  return {
    ...c,
    company_id: c.id ?? c.company_id,
    company_name: c.name ?? c.company_name,
    role: c.user_role ?? c.role ?? "employee",
  };
}

export function EnterpriseProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState(
    () => localStorage.getItem("enterprise_company_id") || null
  );
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const isPlatformAdmin = !!(user?.is_staff);

  const switchCompany = useCallback((companyId) => {
    const id = String(companyId);
    localStorage.setItem("enterprise_company_id", id);
    setActiveCompanyId(id);
  }, []);

  const init = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); setInitialized(true); return; }

    try {
      const data = await companyApi.myCompanies();
      const list = (data.results || data || []).map(normalizeCompany);
      setCompanies(list);

      if (list.length > 0) {
        const savedId = localStorage.getItem("enterprise_company_id");
        const valid = list.find((c) => String(c.company_id) === String(savedId));
        const selected = valid || list[0];
        switchCompany(selected.company_id);
        setMembership(selected);
      } else {
        // No companies — clear stored id so it doesn't cause stale state
        localStorage.removeItem("enterprise_company_id");
        setActiveCompanyId(null);
        setMembership(null);
      }
      setLoadError(null);
    } catch (err) {
      // F-07: a failed request is not "no companies" — keep what we had and let the UI offer a retry
      // instead of sending a member to onboarding.
      setLoadError(err || true);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [switchCompany]);

  // Wait for auth to finish before initializing enterprise context.
  // Also re-run when the authenticated user's identity changes (e.g. logout
  // then login as a different account without a full page reload) — without
  // this, `authLoading` only ever flips false→true once at app boot, so a
  // later login would keep the previous user's companies/role stale.
  useEffect(() => {
    if (!authLoading) init();
  }, [authLoading, user?.id, init]);

  useEffect(() => {
    if (!activeCompanyId || companies.length === 0) return;
    const found = companies.find((c) => String(c.company_id) === String(activeCompanyId));
    if (found) setMembership(found);
  }, [activeCompanyId, companies]);

  const role = membership?.role || null;
  const hasRole = useCallback((...roles) => roles.includes(role), [role]);
  const hasMinRole = useCallback((minRole) => {
    const myIdx = ROLE_HIERARCHY.indexOf(role);
    const minIdx = ROLE_HIERARCHY.indexOf(minRole);
    return myIdx >= minIdx;
  }, [role]);

  const isEnterpriseMember = companies.length > 0;
  const activeCompany = companies.find((c) => String(c.company_id) === String(activeCompanyId)) || null;

  const value = {
    companies,
    setCompanies,
    activeCompanyId,
    activeCompany,
    membership,
    role,
    loading: loading || authLoading,
    initialized,
    isEnterpriseMember,
    loadError,
    isPlatformAdmin,
    switchCompany,
    hasRole,
    hasMinRole,
    refresh: init,
  };

  return <EnterpriseContext.Provider value={value}>{children}</EnterpriseContext.Provider>;
}

export function useEnterprise() {
  const ctx = useContext(EnterpriseContext);
  if (!ctx) throw new Error("useEnterprise must be used within EnterpriseProvider");
  return ctx;
}

export default EnterpriseProvider;
