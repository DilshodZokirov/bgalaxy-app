// Shared session bootstrap: one backend call for user shell data.
// Pages read from this cache instead of firing getMyCompanies + permissions
// on every route change.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken } from "../api/client";

const ACTIVE_KEY = "bgalaxy_active_company_id";
const NAV_FLAGS_KEY = "bgalaxy_nav_flags";

const BootstrapContext = createContext(null);

let cache = {
  data: null, // BootstrapOut | null
  promise: null,
  at: 0,
};

const CACHE_TTL_MS = 60_000;

export function getActiveCompanyId() {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveCompanyId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function pickActiveCompany(companies) {
  if (!companies || companies.length === 0) return null;
  const activeId = getActiveCompanyId();
  return companies.find((c) => c.id === activeId) || companies[0];
}

export function getCachedNavFlags() {
  try {
    return JSON.parse(sessionStorage.getItem(NAV_FLAGS_KEY) || "null");
  } catch {
    return null;
  }
}

export function setCachedNavFlags(flags) {
  try {
    sessionStorage.setItem(NAV_FLAGS_KEY, JSON.stringify(flags));
  } catch {
    // ignore
  }
}

export function invalidateCompaniesCache() {
  cache = { data: null, promise: null, at: 0 };
}

export function invalidateBootstrapCache() {
  invalidateCompaniesCache();
}

function applyBootstrapSideEffects(data) {
  if (data?.active_company_id) {
    setActiveCompanyId(data.active_company_id);
  } else if (data?.companies?.length) {
    const picked = pickActiveCompany(data.companies);
    if (picked) setActiveCompanyId(picked.id);
  }
  if (data?.nav) {
    setCachedNavFlags(data.nav);
  }
  return data;
}

export async function fetchBootstrap({ force = false, activeCompanyId = null } = {}) {
  const fresh = cache.data && Date.now() - cache.at < CACHE_TTL_MS;
  if (!force && fresh) return cache.data;
  if (!force && cache.promise) return cache.promise;

  const id = activeCompanyId || getActiveCompanyId();
  cache.promise = api
    .getBootstrap(id)
    .then((data) => {
      cache.data = applyBootstrapSideEffects(data);
      cache.at = Date.now();
      cache.promise = null;
      return cache.data;
    })
    .catch((err) => {
      cache.promise = null;
      throw err;
    });

  return cache.promise;
}

/** Backward-compatible companies fetch — uses bootstrap under the hood. */
export async function fetchMyCompanies({ force = false } = {}) {
  const data = await fetchBootstrap({ force });
  return data?.companies || [];
}

export function BootstrapProvider({ children, enabled = true }) {
  const cachedNav = getCachedNavFlags();
  const [data, setData] = useState(() => cache.data);
  const [loading, setLoading] = useState(() => enabled && cache.data == null && !!getToken());
  const [error, setError] = useState(null);

  const refresh = useCallback(async ({ force = false, activeCompanyId = null } = {}) => {
    if (!getToken()) {
      setData(null);
      setLoading(false);
      return null;
    }
    setLoading(cache.data == null || force);
    setError(null);
    try {
      const next = await fetchBootstrap({ force, activeCompanyId });
      setData(next);
      return next;
    } catch (err) {
      setError(err?.message || "Sessiya yuklanmadi");
      if (cache.data == null) setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!getToken()) {
      setData(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [enabled, refresh]);

  const companies = data?.companies || [];
  const company = useMemo(() => {
    if (!companies.length) return null;
    if (data?.active_company_id) {
      return companies.find((c) => c.id === data.active_company_id) || companies[0];
    }
    return pickActiveCompany(companies);
  }, [companies, data?.active_company_id]);

  const nav = data?.nav || cachedNav || { accounting: false, analytics: false, warehouse: false };
  const permissions = data?.permissions || null;

  const switchCompany = useCallback(
    async (companyId) => {
      setActiveCompanyId(companyId);
      invalidateBootstrapCache();
      await refresh({ force: true, activeCompanyId: companyId });
      // Soft navigation refresh for page-local state
      window.location.reload();
    },
    [refresh]
  );

  const value = {
    data,
    companies,
    company,
    permissions,
    nav,
    loading,
    error,
    refresh,
    switchCompany,
  };

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useBootstrap() {
  const ctx = useContext(BootstrapContext);
  if (!ctx) {
    // Fallback for rare trees outside provider — still use module cache.
    return {
      data: cache.data,
      companies: cache.data?.companies || [],
      company: pickActiveCompany(cache.data?.companies || []),
      permissions: cache.data?.permissions || null,
      nav: cache.data?.nav || getCachedNavFlags() || { accounting: false, analytics: false, warehouse: false },
      loading: cache.data == null && !!getToken(),
      error: null,
      refresh: fetchBootstrap,
      switchCompany: async (id) => {
        setActiveCompanyId(id);
        invalidateBootstrapCache();
        window.location.reload();
      },
    };
  }
  return ctx;
}

/** Hook used by pages: active company with explicit loading flag. */
export function useActiveCompany() {
  const { company, companies, loading, error, refresh } = useBootstrap();
  return {
    company,
    companies,
    loading,
    error,
    refresh: async ({ force = false } = {}) => {
      const data = await refresh({ force });
      return data?.companies || [];
    },
  };
}
