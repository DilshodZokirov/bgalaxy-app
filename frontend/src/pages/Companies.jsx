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

export default function Companies() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
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
      const res = await api.createCompany({ name, slug: slugify(name) });
      setActiveCompanyId(res.id);
      setName("");
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
    setCompanies([...companies]); // trigger re-render for active badge
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
      <AppShell>
        <div className="page-header">
          <h1>Kompaniyalar</h1>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1>Kompaniyalar</h1>
          <p>Siz a'zo bo'lgan barcha kompaniyalar.</p>
        </div>
        {companies.length > 0 && (
          <button style={{ width: "auto", padding: "10px 18px" }} onClick={() => setShowCreateForm((v) => !v)}>
            + Yangi kompaniya
          </button>
        )}
      </div>

      {(showCreateForm || companies.length === 0) && (
        <div className="card" style={{ maxWidth: 420, marginBottom: 24 }}>
          <p style={{ marginTop: 0, color: "var(--text-dim)", fontSize: 14 }}>
            Kompaniya nomini kiriting — biz avtomatik ravishda admin sifatida sizni qo'shamiz.
          </p>
          <form onSubmit={handleSubmit}>
            <label>Kompaniya nomi</label>
            <input
              type="text"
              placeholder="Tech Solutions LLC"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading}>
              {loading ? "Yaratilmoqda..." : "+ Kompaniya yaratish"}
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {companies.filter((c) => c.id === (activeId || companies[0]?.id)).map((company) => (
          <div className="card" key={company.id} style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div className="avatar-circle" style={{ width: 44, height: 44, fontSize: 16 }}>
                {company.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{company.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-dim)" }}>/{company.slug}</div>
              </div>
              {company.id === activeId ? (
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--green)",
                    background: "var(--panel-2)",
                    padding: "4px 10px",
                    borderRadius: 999,
                  }}
                >
                  Faol
                </span>
              ) : (
                <button className="secondary" style={{ width: "auto", padding: "6px 14px", fontSize: 12.5 }} onClick={() => activate(company)}>
                  Faol qilish
                </button>
              )}
              {company.owner_id === user?.id && (
                <button
                  className="secondary"
                  style={{ width: "auto", padding: "6px 10px", fontSize: 12.5, color: "#f87171" }}
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

            <div className="quick-actions">
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
        ))}
      </div>

      {rolesOpenFor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
          onClick={() => setRolesOpenFor(null)}
        >
          <div
            className="card"
            style={{ maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>
                {companies.find((c) => c.id === rolesOpenFor)?.name} — lavozimlar
              </h3>
              <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={() => setRolesOpenFor(null)}>
                ✕
              </button>
            </div>
            <RoleManager companyId={rolesOpenFor} />
          </div>
        </div>
      )}

      {inviteFor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
          onClick={() => setInviteFor(null)}
        >
          <div className="card" style={{ maxWidth: 380, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>{inviteFor.name}ga a'zo qo'shish</h3>
              <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={() => setInviteFor(null)}>
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
              <button type="submit" disabled={inviteLoading || !inviteUser}>
                {inviteLoading ? "Yuborilmoqda..." : "Ishga taklif qilish"}
              </button>
            </form>

            {inviteLink && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12.5, color: "var(--green)", margin: "0 0 8px" }}>
                  ✓ Taklif yuborildi — u kishining o'z bildirishnomasida ko'rinadi.
                </p>
                <div
                  style={{
                    background: "var(--panel-2)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 11.5, color: "var(--text-dim)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inviteLink}
                  </span>
                  <button type="button" className="secondary" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={() => copy(inviteLink, "invite")}>
                    {copiedKey === "invite" ? "Nusxalandi ✓" : "Havolani nusxalash (zaxira)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div className="card" style={{ maxWidth: 360, textAlign: "center" }}>
            <p style={{ marginTop: 0 }}>
              <strong>{deleteTarget.name}</strong> kompaniyasini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi — barcha chat va a'zolik ma'lumotlari o'chib ketadi.
            </p>
            {deleteError && <p className="error">{deleteError}</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ background: "#dc2626" }}>
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
