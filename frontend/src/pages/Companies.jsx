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
  { key: "kompaniya", mark: "K", label: "Kompaniya", desc: "Ishlab chiqarish va boshqaruv" },
  { key: "distributor", mark: "D", label: "Distributiv", desc: "Ombordan buyurtma oladi" },
  { key: "market", mark: "M", label: "Market", desc: "Distributivdan buyurtma qiladi" },
];

function CompaniesHeading() {
  return (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">Korxona stansiyasi</p>
      <h1>Kompaniyalar</h1>
      <p>Faol korxonani boshqaring — jamoa, lavozimlar va takliflar bir joyda.</p>
    </div>
  );
}

function typeMeta(key) {
  return COMPANY_TYPES.find((t) => t.key === key) || COMPANY_TYPES[0];
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
  const [memberCount, setMemberCount] = useState(0);
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

  const activeCompany =
    companies?.find((c) => c.id === (activeId || companies[0]?.id)) || null;
  const otherCompanies = (companies || []).filter((c) => c.id !== activeCompany?.id);

  useEffect(() => {
    if (!activeCompany) {
      setMemberCount(0);
      return;
    }
    api
      .getMembers(activeCompany.id)
      .then((list) => setMemberCount(list.length))
      .catch(() => setMemberCount(0));
  }, [activeCompany?.id]);

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

  const canInvite =
    activeCompany &&
    (activeCompany.owner_id === user?.id || permMap[activeCompany.id]?.permissions?.invite_members);
  const isOwner = activeCompany && activeCompany.owner_id === user?.id;
  const activeType = activeCompany ? typeMeta(activeCompany.company_type) : null;

  return (
    <AppShell topLeft={<CompaniesHeading />}>
      <div className="companies-page">
        <div className="companies-toolbar">
          <div>
            <h2>Faol stansiya</h2>
            <p>
              {companies.length
                ? `${companies.length} ta korxona galaktikangizda`
                : "Hali korxona yo‘q — birinchisini yarating"}
            </p>
          </div>
          <button className="companies-cta" onClick={() => setShowCreateForm((v) => !v)}>
            {showCreateForm ? "Yopish" : "Yangi kompaniya"}
          </button>
        </div>

        {(showCreateForm || companies.length === 0) && (
          <section className="companies-create" aria-label="Yangi kompaniya">
            <div className="companies-create-head">
              <h3>Yangi kompaniya yaratish</h3>
              <p>Nomini kiriting — siz avtomatik egasi va admin bo‘lasiz.</p>
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
                    <span className="companies-type-mark">{t.mark}</span>
                    <span className="companies-type-label">{t.label}</span>
                    <span className="companies-type-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="companies-cta" disabled={loading}>
                {loading ? "Yaratilmoqda..." : "Kompaniya yaratish"}
              </button>
            </form>
          </section>
        )}

        {activeCompany && (
          <section className="companies-station" aria-label="Faol kompaniya">
            <div className="companies-station-glow" aria-hidden />
            <div className="companies-station-main">
              <div className="companies-station-mark" aria-hidden>
                {activeCompany.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="companies-station-copy">
                <div className="companies-station-title-row">
                  <h3>{activeCompany.name}</h3>
                  <span className="companies-active-badge">Faol</span>
                </div>
                <p className="companies-slug">/{activeCompany.slug}</p>
                <div className="companies-station-meta">
                  <span className="companies-type-pill">{activeType.label}</span>
                  <span className="companies-meta-dot">{memberCount} aʼzo</span>
                  {activeCompany.has_warehouse && <span className="companies-meta-dot">Ombor yoqilgan</span>}
                </div>
              </div>
              {isOwner && (
                <button
                  type="button"
                  className="companies-text-danger"
                  onClick={() => {
                    setDeleteTarget(activeCompany);
                    setDeleteError(null);
                  }}
                >
                  O‘chirish
                </button>
              )}
            </div>

            <div className="companies-action-dock">
              <button type="button" className="companies-action" onClick={() => navigate(`/chat/${activeCompany.id}`)}>
                <strong>Chat</strong>
                <span>Jamoa kanallari</span>
              </button>
              <button type="button" className="companies-action" onClick={() => navigate("/group-meeting")}>
                <strong>Uchrashuv</strong>
                <span>Guruh meeting</span>
              </button>
              {canInvite && (
                <button
                  type="button"
                  className="companies-action"
                  onClick={() => {
                    setInviteFor(activeCompany);
                    setInviteLink(null);
                    setInviteError(null);
                    setInviteUser(null);
                  }}
                >
                  <strong>Taklif</strong>
                  <span>Aʼzo qo‘shish</span>
                </button>
              )}
              {isOwner && (
                <button
                  type="button"
                  className="companies-action"
                  onClick={() => setRolesOpenFor(activeCompany.id)}
                >
                  <strong>Lavozimlar</strong>
                  <span>Huquqlar va rollar</span>
                </button>
              )}
              <button type="button" className="companies-action" onClick={() => navigate("/office")}>
                <strong>Ofis</strong>
                <span>Virtual Office</span>
              </button>
            </div>
          </section>
        )}

        {otherCompanies.length > 0 && (
          <section className="companies-fleet" aria-label="Boshqa kompaniyalar">
            <div className="companies-fleet-head">
              <h3>Boshqa stansiyalar</h3>
              <p>Bosib faol korxonani almashtiring</p>
            </div>
            <div className="companies-fleet-grid">
              {otherCompanies.map((c) => {
                const meta = typeMeta(c.company_type);
                return (
                  <button key={c.id} type="button" className="companies-fleet-item" onClick={() => activate(c)}>
                    <span className="companies-fleet-mark">{c.name.slice(0, 2).toUpperCase()}</span>
                    <span className="companies-fleet-copy">
                      <strong>{c.name}</strong>
                      <em>
                        {meta.label} · /{c.slug}
                      </em>
                    </span>
                    <span className="companies-fleet-cta">Faol qilish</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {rolesOpenFor && (
        <div className="companies-modal-backdrop" onClick={() => setRolesOpenFor(null)}>
          <div className="card companies-modal" onClick={(e) => e.stopPropagation()}>
            <div className="companies-modal-head">
              <h3>{companies.find((c) => c.id === rolesOpenFor)?.name} — lavozimlar</h3>
              <button className="secondary companies-soft-btn" onClick={() => setRolesOpenFor(null)}>
                Yopish
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
              <h3>{inviteFor.name}ga aʼzo qo‘shish</h3>
              <button className="secondary companies-soft-btn" onClick={() => setInviteFor(null)}>
                Yopish
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
                <p>Taklif yuborildi — bildirishnomada ko‘rinadi.</p>
                <div className="companies-invite-link">
                  <span>{inviteLink}</span>
                  <button type="button" className="secondary companies-soft-btn" onClick={() => copy(inviteLink, "invite")}>
                    {copiedKey === "invite" ? "Nusxalandi" : "Nusxalash"}
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
              bo‘lmaydi — chat va aʼzolik maʼlumotlari o‘chadi.
            </p>
            {deleteError && <p className="error">{deleteError}</p>}
            <div className="companies-delete-actions">
              <button onClick={handleDelete} disabled={deleting} className="companies-danger-btn">
                {deleting ? "O‘chirilmoqda..." : "Ha, o‘chirish"}
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
