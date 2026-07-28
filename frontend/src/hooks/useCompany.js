// Active company selection + shared in-memory cache so pages don't flash
// "Avval kompaniya yarating" while /companies/mine is still loading.
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

const ACTIVE_KEY = "bgalaxy_active_company_id";
const NAV_FLAGS_KEY = "bgalaxy_nav_flags";

let cache = {
  companies: null, // null = never loaded
  promise: null,
  at: 0,
};

const CACHE_TTL_MS = 30_000;

export function getActiveCompanyId() {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveCompanyId(id) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

export function pickActiveCompany(companies) {
  if (!companies || companies.length === 0) return null;
  const activeId = getActiveCompanyId();
  return companies.find((c) => c.id === activeId) || companies[0];
}

export function invalidateCompaniesCache() {
  cache = { companies: null, promise: null, at: 0 };
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
    // ignore quota / private mode
  }
}

export async function fetchMyCompanies({ force = false } = {}) {
  const fresh = cache.companies && Date.now() - cache.at < CACHE_TTL_MS;
  if (!force && fresh) return cache.companies;
  if (!force && cache.promise) return cache.promise;

  cache.promise = api
    .getMyCompanies()
    .then((list) => {
      cache.companies = Array.isArray(list) ? list : [];
      cache.at = Date.now();
      cache.promise = null;
      return cache.companies;
    })
    .catch((err) => {
      cache.promise = null;
      throw err;
    });

  return cache.promise;
}

/** Hook: active company with an explicit loading flag (never confuse loading with empty). */
export function useActiveCompany() {
  const [companies, setCompanies] = useState(() => cache.companies || []);
  const [loading, setLoading] = useState(() => cache.companies == null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async ({ force = false } = {}) => {
    setLoading(cache.companies == null || force);
    setError(null);
    try {
      const list = await fetchMyCompanies({ force });
      setCompanies(list);
      const active = pickActiveCompany(list);
      if (active && getActiveCompanyId() !== active.id) {
        setActiveCompanyId(active.id);
      }
      return list;
    } catch (err) {
      setError(err?.message || "Kompaniyalar yuklanmadi");
      if (cache.companies == null) setCompanies([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const company = pickActiveCompany(companies);

  return { company, companies, loading, error, refresh };
}
