import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getActiveCompanyId, setActiveCompanyId } from "../hooks/useCompany";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";
import RoleManager from "../components/RoleManager";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const COMPANY_TYPES = [
  { key: "kompaniya", icon: "🏭", label: "Kompaniya", desc: "Ishlab chiqarish" },
  { key: "distributor", icon: "🚚", label: "Distributiv firma", desc: "Ombordan buyurtma qiladi" },
  { key: "market", icon: "🏪", label: "Market", desc: "Distributivdan buyurtma qiladi" },
];

function CompaniesHeading() {
  return (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">Korxona markazi</p>
      <h1>Kompaniyalar</h1>
      <p>Galaktikangizdagi barcha korxonalar — boshqaring, taklif qiling, o‘sing.</p>
    </div>
  );
}

export default function Companies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [companyType, setCompanyType] = useState("kompaniya");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permMap, setPermMap] = useState({});
  const [rolesOpenFor, setRolesOpenFor] = useState(null);
  const navigate = useNavigate();

  const [inviteFor, setInviteFor] = useState(null);
  const [inviteUser, setInviteUser] = useState(null);
  const [inviteError, setInviteError] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const activeId = getActiveCompanyId();

  useEffect(() => {
    refreshCompanies();
  }, []);

  function refreshCompanies() {
    api
      .getMyCompanies()
      .then((list) => {
        setCompanies(list);
        if (list.length > 0 && !getActiveCompanyId()) {
          setActiveCompanyId(list[0].id);
        }
        list.forEach((c) => {
          api
            .getMyPermissions(c.id)
            .then((info) => setPermMap((prev) => ({ ...prev, [c.id]: info })))
            .catch(() => {});
        });
      })
      .catch(() => setCompanies([]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.createCompany({ name, slug: slugify(name), company_type: companyType });
      setActiveCompanyId(res.id);
      setName("");
      setCompanyType("kompaniya");
      setShowCreateForm(false);
      refreshCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteUser) return;
    setInviteError(null);
    setInviteLoading(true);
    setInviteLink(null);
    try {
      const res = await api.createInvite(inviteFor.id, { email: inviteUser.email });
      const link = `${window.location.origin}/invite/${res.token}`;
      setInviteLink(link);
      setInviteUser(null);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function activate(company) {
    setActiveCompanyId(company.id);
    setCompanies([...companies]);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCompany(deleteTarget.id);
      if (getActiveCompanyId() === deleteTarget.id) {
        setActiveCompanyId(null);
      }
      setDeleteTarget(null);
      refreshCompanies();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (companies === null) {
    return (
      <AppShell topLeft={<CompaniesHeading />}>
        <div className="companies-page">
          <p className="companies-loading">Kompaniyalar yuklanmoqda...</p>
        </div>
      </AppShell>
    );
  }

  const visible = companies.filter((c) => c.id === (activeId || companies[0]?.id));

  return (
    <AppShell topLeft={<CompaniesHeading />}>
      <div className="companies-page">
        <div className="companies-toolbar">
          <div>
            <h2>Faol korxona</h2>
            <p>Tanlangan kompaniya galaktikangizning markaziy stansiyasi.</p>
          </div>
          {companies.length > 0 && (
            <button className="companies-cta" onClick={() => setShowCreateForm((v) => !v)}>
              {showCreateForm ? "Yopish" : "+ Yangi kompaniya"}
            </button>
          )}
        </div>

        {(showCreateForm || companies.length === 0) && (
          <div className="card companies-create">
            <div className="companies-create-head">
              <h3>Yangi kompaniya yaratish</h3>
              <p>Nomini kiriting — siz avtomatik admin bo‘lasiz.</p>
            </div>
            <form onSubmit={handleSubmit}>
              <label>Kompaniya nomi</label>
              <input
                type="text"
                placeholder="Tech Solutions LLC"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <label>Kompaniya turi</label>
              <div className="companies-type-grid">
                {COMPANY_TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`companies-type-card ${companyType === t.key ? "active" : ""}`}
                    onClick={() => setCompanyType(t.key)}
                  >
                    <span className="companies-type-icon">{t.icon}</span>
                    <span className="companies-type-label">{t.label}</span>
                    <span className="companies-type-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="companies-cta" disabled={loading}>
                {loading ? "Yaratilmoqda..." : "+ Kompaniya yaratish"}
              </button>
            </form>
          </div>
        )}

        <div className="companies-list">
          {visible.map((company) => {
            const typeMeta = COMPANY_TYPES.find((t) => t.key === company.company_type);
            return (
              <div className="card companies-card" key={company.id}>
                <div className="companies-card-top">
                  <div className="companies-avatar">{company.name.slice(0, 2).toUpperCase()}</div>
                  <div className="companies-card-meta">
                    <div className="companies-card-title">
                      <strong>{company.name}</strong>
                      <span className="companies-type-pill">
                        {typeMeta?.icon} {typeMeta?.label || "Kompaniya"}
                      </span>
                    </div>
                    <div className="companies-slug">/{company.slug}</div>
                  </div>
                  {company.id === activeId ? (
                    <span className="companies-active-badge">Faol</span>
                  ) : (
                    <button className="secondary companies-soft-btn" onClick={() => activate(company)}>
                      Faol qilish
                    </button>
                  )}
                  {company.owner_id === user?.id && (
                    <button
                      className="secondary companies-soft-btn companies-danger"
                      onClick={() => {
                        setDeleteTarget(company);
                        setDeleteError(null);
                      }}
                      title="Kompaniyani o'chirish"
                    >
                      🗑️
                    </button>
                  )}
                </div>

                <div className="quick-actions companies-actions">
                  <div className="quick-action" onClick={() => navigate(`/chat/${company.id}`)}>
                    <div className="icon">💬</div>
                    Chat
                  </div>
                  <div className="quick-action" onClick={() => navigate("/group-meeting")}>
                    <div className="icon">🎥</div>
                    Guruh uchrashuvi
                  </div>
                  {(company.owner_id === user?.id || permMap[company.id]?.permissions?.invite_members) && (
                    <div
                      className="quick-action"
                      onClick={() => {
                        setInviteFor(inviteFor?.id === company.id ? null : company);
                        setInviteLink(null);
                        setInviteError(null);
                        setInviteUser(null);
                      }}
                    >
                      <div className="icon">👥</div>
                      A'zo qo'shish
                    </div>
                  )}
                  {company.owner_id === user?.id && (
                    <div
                      className="quick-action"
                      onClick={() => setRolesOpenFor(rolesOpenFor === company.id ? null : company.id)}
                    >
                      <div className="icon">🛡️</div>
                      Lavozimlar
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {companies.length > 1 && (
          <div className="companies-switcher">
            <h3>Boshqa kompaniyalar</h3>
            <div className="companies-switcher-grid">
              {companies
                .filter((c) => c.id !== (activeId || companies[0]?.id))
                .map((c) => (
                  <button key={c.id} type="button" className="companies-switch-chip" onClick={() => activate(c)}>
                    <span>{c.name}</span>
                    <em>Faol qilish</em>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {rolesOpenFor && (
        <div className="companies-modal-backdrop" onClick={() => setRolesOpenFor(null)}>
          <div className="card companies-modal" onClick={(e) => e.stopPropagation()}>
            <div className="companies-modal-head">
              <h3>{companies.find((c) => c.id === rolesOpenFor)?.name} — lavozimlar</h3>
              <button className="secondary companies-soft-btn" onClick={() => setRolesOpenFor(null)}>
                ✕
              </button>
            </div>
            <RoleManager companyId={rolesOpenFor} />
          </div>
        </div>
      )}

      {inviteFor && (
        <div className="companies-modal-backdrop" onClick={() => setInviteFor(null)}>
          <div className="card companies-modal companies-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="companies-modal-head">
              <h3>{inviteFor.name}ga a'zo qo'shish</h3>
              <button className="secondary companies-soft-btn" onClick={() => setInviteFor(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite}>
              <UserSearchInput
                selected={inviteUser}
                onSelect={setInviteUser}
                onClear={() => setInviteUser(null)}
              />
              {inviteError && <p className="error">{inviteError}</p>}
              <button type="submit" className="companies-cta" disabled={inviteLoading || !inviteUser}>
                {inviteLoading ? "Yuborilmoqda..." : "Ishga taklif qilish"}
              </button>
            </form>

            {inviteLink && (
              <div className="companies-invite-result">
                <p>✓ Taklif yuborildi — u kishining bildirishnomasida ko‘rinadi.</p>
                <div className="companies-invite-link">
                  <span>{inviteLink}</span>
                  <button type="button" className="secondary companies-soft-btn" onClick={() => copy(inviteLink, "invite")}>
                    {copiedKey === "invite" ? "Nusxalandi ✓" : "Nusxalash"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="companies-modal-backdrop">
          <div className="card companies-modal companies-modal-sm companies-delete">
            <p>
              <strong>{deleteTarget.name}</strong> kompaniyasini o‘chirmoqchimisiz? Bu amalni ortga qaytarib
              bo‘lmaydi — chat va a’zolik ma’lumotlari o‘chadi.
            </p>
            {deleteError && <p className="error">{deleteError}</p>}
            <div className="companies-delete-actions">
              <button onClick={handleDelete} disabled={deleting} className="companies-danger-btn">
                {deleting ? "O'chirilmoqda..." : "Ha, o'chirish"}
              </button>
              <button className="secondary" onClick={() => setDeleteTarget(null)}>
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
