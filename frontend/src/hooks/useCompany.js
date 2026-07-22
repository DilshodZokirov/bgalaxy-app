// Tracks which company is "active" for quick-actions (Dashboard shortcuts,
// default chat/meeting links). The full list of companies a user belongs to
// always comes from the backend (api.getMyCompanies) — this only remembers
// which one is currently selected in the switcher.
const ACTIVE_KEY = "bgalaxy_active_company_id";

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

// Picks the active company from a list, falling back to the first one.
export function pickActiveCompany(companies) {
  if (!companies || companies.length === 0) return null;
  const activeId = getActiveCompanyId();
  return companies.find((c) => c.id === activeId) || companies[0];
}
