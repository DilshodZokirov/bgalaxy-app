import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken } from "../api/client";
import {
  fetchBootstrap,
  getActiveCompanyId,
  invalidateBootstrapCache,
} from "./useCompany";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    // One round-trip: user + companies + nav (shared cache for the rest of the app)
    fetchBootstrap({ force: true, activeCompanyId: getActiveCompanyId() })
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("bgalaxy_token");
        invalidateBootstrapCache();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function login(tokenResponse) {
    localStorage.setItem("bgalaxy_token", tokenResponse.access_token);
    setUser(tokenResponse.user);
    invalidateBootstrapCache();
    // Warm bootstrap cache in background after login
    fetchBootstrap({ force: true, activeCompanyId: getActiveCompanyId() }).catch(() => {});
  }

  async function refreshUser() {
    const fresh = await api.getMe();
    setUser(fresh);
    return fresh;
  }

  function logout() {
    localStorage.removeItem("bgalaxy_token");
    localStorage.removeItem("bgalaxy_active_company_id");
    sessionStorage.removeItem("bgalaxy_nav_flags");
    invalidateBootstrapCache();
    setUser(null);
    setLocked(false);
  }

  function lockScreen() {
    if (user?.has_pin) setLocked(true);
  }

  function unlockScreen() {
    setLocked(false);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser, locked, lockScreen, unlockScreen }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
