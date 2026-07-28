import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { fetchMyCompanies, getActiveCompanyId, invalidateCompaniesCache, setActiveCompanyId } from "../hooks/useCompany";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";
import RoleManager from "../components/RoleManager";
import { WarehouseSection } from "../components/SettingsSections";
import CompanyLocationMap from "../components/CompanyLocationMap";

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const COMPANY_TYPES = [
  { key: "kompaniya", mark: "K", label: "Kompaniya", industry: "Ishlab chiqarish" },
  { key: "distributor", mark: "D", label: "Distributiv", industry: "Distributsiya" },
  { key: "market", mark: "M", label: "Market", industry: "Chakana savdo" },
];

/** Joylashuv — tartib bo‘yicha viloyat/shahar ro‘yxati */
const UZ_REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon viloyati",
  "Buxoro viloyati",
  "Farg'ona viloyati",
  "Jizzax viloyati",
  "Xorazm viloyati",
  "Namangan viloyati",
  "Navoiy viloyati",
  "Qashqadaryo viloyati",
  "Samarqand viloyati",
  "Sirdaryo viloyati",
  "Surxondaryo viloyati",
  "Qoraqalpog'iston Respublikasi",
];

function resizeLogoToDataUrl(file, maxSize = 512) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const TABS = [
  { key: "overview", label: "Umumiy" },
  { key: "team", label: "Jamoa" },
  { key: "offices", label: "Ofislar" },
  { key: "settings", label: "Sozlamalar" },
  { key: "billing", label: "Billing" },
];

const SEAT_CAP = 50;

function typeMeta(key) {
  return COMPANY_TYPES.find((t) => t.key === key) || COMPANY_TYPES[0];
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

function CompaniesHeading() {
  return (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">OS Company Panel</p>
      <h1>Kompaniya paneli</h1>
      <p>Korxona maʼlumotlari, jamoa va tezkor amallar — bitta stansiyada.</p>
    </div>
  );
}

function ActivityChart({ data }) {
  return (
    <div className="os-chart-wrap">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#111827",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: 10,
              color: "#f8fafc",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ r: 5, fill: "#a78bfa", stroke: "#1e1b4b", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Companies() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [companyType, setCompanyType] = useState("kompaniya");
  const [locationRegion, setLocationRegion] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [inn, setInn] = useState("");
  const [geo, setGeo] = useState(null);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permMap, setPermMap] = useState({});
  const [members, setMembers] = useState([]);
  const [activitySeries, setActivitySeries] = useState(null);
  const [rolesOpen, setRolesOpen] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
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

  useEffect(() => {
    if (companies && companies.length === 0) {
      setShowCreateForm(true);
    }
  }, [companies]);

  const createOpen = showCreateForm || (companies && companies.length === 0);

  useEffect(() => {
    if (!createOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [createOpen]);

  function refreshCompanies() {
    setListLoading(true);
    fetchMyCompanies({ force: true })
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
      .catch(() => setCompanies([]))
      .finally(() => setListLoading(false));
  }

  const activeCompany =
    companies?.find((c) => c.id === (activeId || companies[0]?.id)) || null;
  const otherCompanies = (companies || []).filter((c) => c.id !== activeCompany?.id);
  const meta = activeCompany ? typeMeta(activeCompany.company_type) : null;
  const perms = activeCompany ? permMap[activeCompany.id] : null;
  const canInvite =
    activeCompany && (activeCompany.owner_id === user?.id || perms?.permissions?.invite_members);
  const isOwner = activeCompany && activeCompany.owner_id === user?.id;
  const canViewAnalytics = !!(perms?.is_owner || perms?.permissions?.view_analytics);

  useEffect(() => {
    if (!activeCompany) {
      setMembers([]);
      setActivitySeries(null);
      return;
    }
    api
      .getMembers(activeCompany.id)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [activeCompany?.id]);

  useEffect(() => {
    if (!activeCompany) return;
    let cancelled = false;

    const fallback = [
      { label: "1-haft", value: 28 },
      { label: "2-haft", value: 42 },
      { label: "3-haft", value: 55 },
      { label: "1-oy", value: 68 },
      { label: "4-oy", value: Math.min(95, 40 + members.length * 4) },
    ];

    if (!canViewAnalytics) {
      setActivitySeries(fallback);
      return undefined;
    }

    api
      .getCompanyAnalytics(activeCompany.id, { task_period: "month", perf_period: "month", fin_period: "month" })
      .then((data) => {
        if (cancelled) return;
        const labels = ["1-haft", "2-haft", "3-haft", "1-oy", "4-oy"];
        const trend = data?.task_trend || [];
        if (!trend.length) {
          setActivitySeries(fallback);
          return;
        }
        const recent = trend.slice(-5);
        const mapped = labels.map((label, i) => {
          const row = recent[i] || recent[recent.length - 1] || {};
          const value =
            row.completion_rate != null
              ? row.completion_rate
              : Math.min(100, 18 + i * 12 + (row.accepted || 0) * 8);
          return { label, value };
        });
        setActivitySeries(mapped);
      })
      .catch(() => {
        if (!cancelled) setActivitySeries(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCompany?.id, canViewAnalytics, members.length]);

  const chartData = useMemo(
    () =>
      activitySeries || [
        { label: "1-haft", value: 20 },
        { label: "2-haft", value: 35 },
        { label: "3-haft", value: 48 },
        { label: "1-oy", value: 62 },
        { label: "4-oy", value: 78 },
      ],
    [activitySeries]
  );

  async function handleLogoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    setError(null);
    try {
      const dataUrl = await resizeLogoToDataUrl(file);
      setLogoUrl(dataUrl);
    } catch {
      setError("Brand rasmni yuklab bo‘lmadi");
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!locationRegion) {
      setError("Joylashuv (viloyat/shahar) tanlang");
      return;
    }
    const innDigits = inn.replace(/\D/g, "");
    if (innDigits.length !== 9) {
      setError("INN (STIR) 9 ta raqam bo‘lishi kerak");
      return;
    }
    if (geo?.latitude == null || geo?.longitude == null) {
      setError("Kartadan aniq joylashuvni tanlang");
      return;
    }
    setLoading(true);
    try {
      const res = await api.createCompany({
        name,
        slug: slugify(name),
        company_type: companyType,
        location_region: locationRegion,
        location_address: locationAddress.trim() || null,
        logo_url: logoUrl || null,
        inn: innDigits,
        latitude: geo.latitude,
        longitude: geo.longitude,
        geo_label: geo.geo_label || null,
      });
      invalidateCompaniesCache();
      setActiveCompanyId(res.id);
      setName("");
      setCompanyType("kompaniya");
      setLocationRegion("");
      setLocationAddress("");
      setInn("");
      setGeo(null);
      setLogoUrl(null);
      setShowCreateForm(false);
      setTab("overview");
      refreshCompanies();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteUser || !activeCompany) return;
    setInviteError(null);
    setInviteLoading(true);
    setInviteLink(null);
    try {
      const res = await api.createInvite(activeCompany.id, { email: inviteUser.email });
      setInviteLink(`${window.location.origin}/invite/${res.token}`);
      setInviteUser(null);
      api.getMembers(activeCompany.id).then(setMembers).catch(() => {});
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
    setTab("overview");
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteCompany(deleteTarget.id);
      invalidateCompaniesCache();
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
        <div className="os-company-page">
          <p className="companies-loading">Kompaniya paneli yuklanmoqda...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell topLeft={<CompaniesHeading />}>
      <div className="os-company-page">
        <div className="os-toolbar">
          <div>
            <p className="os-eyebrow">OS COMPANY PANEL</p>
            <h2>Korxona boshqaruvi</h2>
          </div>
          <div className="os-toolbar-actions">
            {!createOpen && otherCompanies.length > 0 && (
              <label className="os-switcher">
                <span>Faol</span>
                <select
                  value={activeCompany?.id || ""}
                  onChange={(e) => {
                    const next = companies.find((c) => c.id === e.target.value);
                    if (next) activate(next);
                  }}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="os-btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Yangi kompaniya
            </button>
          </div>
        </div>

        {createOpen &&
          createPortal(
            <div
              className="companies-modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="os-create-title"
              onClick={(e) => {
                if (e.target === e.currentTarget && companies.length > 0) {
                  setShowCreateForm(false);
                }
              }}
            >
              <section className="os-create os-create-pro companies-modal companies-modal-create">
                <div className="os-create-hero">
                  <div className="os-create-hero-row">
                    <span className="os-create-kicker">Yangi yozuv</span>
                    {companies.length > 0 && (
                      <button
                        type="button"
                        className="os-create-close"
                        onClick={() => setShowCreateForm(false)}
                        aria-label="Yopish"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <h3 id="os-create-title">Yangi kompaniya yaratish</h3>
                  <p>
                    Nom, INN, brand va kartadagi aniq joylashuv — siz avtomatik egasi bo‘lasiz.
                    Koordinatalar yetkazib berish uchun saqlanadi.
                  </p>
                </div>
                <form className="os-create-form" onSubmit={handleSubmit}>
                  <div className="os-create-section">
                    <div className="os-create-section-head">
                      <span className="os-create-step">01</span>
                      <div>
                        <h4>Asosiy ma’lumot</h4>
                        <p>Kompaniya nomi, turi va soliq identifikatori</p>
                      </div>
                    </div>

                    <div className="os-create-grid">
                      <label className="os-field os-field-span">
                        <span>Kompaniya nomi</span>
                        <input
                          type="text"
                          placeholder="Tech Solutions LLC"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                        {name.trim() && (
                          <em className="os-field-hint">
                            Ichki identifikator: /{slugify(name)} — URL va tizim uchun avtomatik
                          </em>
                        )}
                      </label>

                      <label className="os-field os-field-span">
                        <span>INN (STIR)</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="123456789"
                          value={inn}
                          onChange={(e) => setInn(e.target.value.replace(/\D/g, "").slice(0, 9))}
                          maxLength={9}
                          required
                          autoComplete="off"
                        />
                        <em className="os-field-hint">9 raqam — yuridik shaxs STIR</em>
                      </label>
                    </div>

                    <div className="os-type-grid" role="group" aria-label="Kompaniya turi">
                      {COMPANY_TYPES.map((t) => (
                        <button
                          key={t.key}
                          type="button"
                          className={`os-type-card ${companyType === t.key ? "active" : ""}`}
                          onClick={() => setCompanyType(t.key)}
                        >
                          <strong>{t.mark}</strong>
                          <span>
                            {t.label}
                            <small>{t.industry}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="os-create-section">
                    <div className="os-create-section-head">
                      <span className="os-create-step">02</span>
                      <div>
                        <h4>Brand</h4>
                        <p>Logo — panel va marketplace’da ko‘rinadi</p>
                      </div>
                    </div>

                    <label className={`os-logo-drop ${logoUrl ? "has-file" : ""}`}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoFile}
                        disabled={logoUploading}
                      />
                      <div className="os-logo os-logo-preview" aria-hidden>
                        {logoUrl ? (
                          <img src={logoUrl} alt="" />
                        ) : (
                          <span>{(name || "?").slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="os-logo-drop-copy">
                        <strong>
                          {logoUploading ? "Yuklanmoqda..." : logoUrl ? "Logo tanlandi" : "Logo yuklash"}
                        </strong>
                        <span>JPG / PNG / WEBP · kvadratga yaqin rasm tavsiya etiladi</span>
                        {logoUrl && (
                          <button
                            type="button"
                            className="os-text-danger"
                            onClick={(e) => {
                              e.preventDefault();
                              setLogoUrl(null);
                            }}
                          >
                            Rasmni olib tashlash
                          </button>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="os-create-section">
                    <div className="os-create-section-head">
                      <span className="os-create-step">03</span>
                      <div>
                        <h4>Joylashuv</h4>
                        <p>Viloyat + kartadan pin — yetkazib berish uchun</p>
                      </div>
                    </div>

                    <div className="os-create-grid">
                      <label className="os-field">
                        <span>Viloyat / shahar</span>
                        <select
                          value={locationRegion}
                          onChange={(e) => setLocationRegion(e.target.value)}
                          required
                        >
                          <option value="">Tanlang...</option>
                          {UZ_REGIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="os-field">
                        <span>Manzil (ixtiyoriy)</span>
                        <input
                          type="text"
                          placeholder="Ko‘cha, uy, ofis..."
                          value={locationAddress}
                          onChange={(e) => setLocationAddress(e.target.value)}
                          maxLength={255}
                        />
                      </label>
                    </div>

                    <CompanyLocationMap value={geo} onChange={setGeo} regionHint={locationRegion || null} />
                  </div>

                  {error && <p className="error">{error}</p>}
                  <div className="os-create-actions">
                    {companies.length > 0 && (
                      <button
                        type="button"
                        className="os-btn-ghost"
                        onClick={() => setShowCreateForm(false)}
                      >
                        Bekor qilish
                      </button>
                    )}
                    <button type="submit" className="os-btn-primary" disabled={loading || logoUploading}>
                      {loading ? "Yaratilmoqda..." : "Kompaniyani yaratish"}
                    </button>
                  </div>
                </form>
              </section>
            </div>,
            document.body
          )}

        {!createOpen && activeCompany && (
          <section className="os-panel">
            <header className="os-panel-header">
              <div className="os-brand">
                <div className="os-logo" aria-hidden>
                  {activeCompany.logo_url ? (
                    <img src={activeCompany.logo_url} alt="" />
                  ) : (
                    <span>{activeCompany.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <div className="os-brand-row">
                    <h3>{activeCompany.name}</h3>
                    <span className="os-plan-badge">Pro Plan</span>
                  </div>
                  <p className="os-brand-sub">
                    /{activeCompany.slug} · {meta.label}
                    {activeCompany.inn ? ` · INN ${activeCompany.inn}` : ""}
                    {activeCompany.location_region
                      ? ` · ${activeCompany.location_region}${
                          activeCompany.location_address ? `, ${activeCompany.location_address}` : ""
                        }`
                      : ""}
                    {activeCompany.latitude != null && activeCompany.longitude != null
                      ? ` · ${Number(activeCompany.latitude).toFixed(4)}, ${Number(activeCompany.longitude).toFixed(4)}`
                      : ""}
                  </p>
                </div>
              </div>
              {isOwner && (
                <button
                  type="button"
                  className="os-text-danger"
                  onClick={() => {
                    setDeleteTarget(activeCompany);
                    setDeleteError(null);
                  }}
                >
                  O‘chirish
                </button>
              )}
            </header>

            <nav className="os-tabs" aria-label="Kompaniya bo‘limlari">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`os-tab ${tab === item.key ? "active" : ""}`}
                  onClick={() => setTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {tab === "overview" && (
              <>
                <div className="os-overview-grid">
                  <div className="os-card">
                    <h4>Umumiy maʼlumot</h4>
                    <div className="os-info-list">
                      <div className="os-info-row">
                        <span>Kompaniya nomi</span>
                        <strong>{activeCompany.name}</strong>
                      </div>
                      <div className="os-info-row">
                        <span>Sanoat</span>
                        <strong>{meta.industry}</strong>
                      </div>
                      <div className="os-info-row">
                        <span>Aʼzo soni</span>
                        <strong>
                          {members.length} / {SEAT_CAP}
                        </strong>
                      </div>
                      <div className="os-info-row">
                        <span>Yaratilgan sana</span>
                        <strong>{formatDate(activeCompany.created_at)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="os-card os-card-chart">
                    <h4>Faoliyat statistikasi</h4>
                    <ActivityChart data={chartData} />
                  </div>
                </div>

                <div className="os-quick">
                  <h4>Tezkor amallar</h4>
                  <div className="os-quick-grid">
                    <button
                      type="button"
                      className="os-quick-btn"
                      disabled={!canInvite}
                      onClick={() => {
                        setInviteOpen(true);
                        setInviteLink(null);
                        setInviteError(null);
                        setInviteUser(null);
                      }}
                    >
                      <span className="os-quick-ico" aria-hidden>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="9" cy="8" r="3.2" />
                          <path d="M3.5 18c.6-3 2.7-4.5 5.5-4.5S14.4 15 15 18" />
                          <path d="M17 8v6M14 11h6" />
                        </svg>
                      </span>
                      Aʼzo qo‘shish
                    </button>
                    <button type="button" className="os-quick-btn" onClick={() => navigate("/office")}>
                      <span className="os-quick-ico" aria-hidden>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 20V6.5L12 4l8 2.5V20" />
                          <path d="M9 20v-6h6v6" />
                        </svg>
                      </span>
                      Ofis yaratish
                    </button>
                    <button type="button" className="os-quick-btn" onClick={() => navigate("/statistika")}>
                      <span className="os-quick-ico" aria-hidden>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 19h16" />
                          <path d="M7 16V9M12 16V5M17 16v-4" />
                        </svg>
                      </span>
                      Statistika
                    </button>
                    <button type="button" className="os-quick-btn" onClick={() => setTab("settings")}>
                      <span className="os-quick-ico" aria-hidden>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M12 3v2.2M12 18.8V21M4.9 6.2l1.6 1.6M17.5 16.2l1.6 1.6M3 12h2.2M18.8 12H21M4.9 17.8l1.6-1.6M17.5 7.8l1.6-1.6" />
                        </svg>
                      </span>
                      Sozlamalar
                    </button>
                  </div>
                </div>
              </>
            )}

            {tab === "team" && (
              <div className="os-card os-tab-panel">
                <div className="os-section-head">
                  <div>
                    <h4>Jamoa</h4>
                    <p>{members.length} ta aʼzo</p>
                  </div>
                  <div className="os-section-actions">
                    {canInvite && (
                      <button
                        type="button"
                        className="os-btn-primary"
                        onClick={() => {
                          setInviteOpen(true);
                          setInviteLink(null);
                          setInviteError(null);
                          setInviteUser(null);
                        }}
                      >
                        Aʼzo qo‘shish
                      </button>
                    )}
                    {isOwner && (
                      <button type="button" className="os-btn-ghost" onClick={() => setRolesOpen(true)}>
                        Lavozimlar
                      </button>
                    )}
                  </div>
                </div>
                <div className="os-member-list">
                  {members.map((m) => (
                    <div key={m.user_id} className="os-member-row">
                      <div className="os-member-avatar">{(m.full_name || "?").slice(0, 2).toUpperCase()}</div>
                      <div>
                        <strong>{m.full_name}</strong>
                        <span>
                          {m.is_owner ? "Egasi" : m.role_name || m.role}
                          {m.is_head_admin ? " · Head admin" : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!members.length && <p className="os-empty">Hali aʼzolar yo‘q.</p>}
                </div>
              </div>
            )}

            {tab === "offices" && (
              <div className="os-card os-tab-panel">
                <h4>Ofislar</h4>
                <p className="os-muted">Virtual Office — jamoangiz uchun 3D ish maydoni.</p>
                <div className="os-office-card">
                  <div>
                    <strong>Asosiy Virtual Office</strong>
                    <span>Open-space · real-time hamkorlik</span>
                  </div>
                  <button type="button" className="os-btn-primary" onClick={() => navigate("/office")}>
                    Ofisga kirish
                  </button>
                </div>
              </div>
            )}

            {tab === "settings" && (
              <div className="os-card os-tab-panel">
                <h4>Sozlamalar</h4>
                <p className="os-muted">Kompaniya ombori va boshqa korxona sozlamalari.</p>
                <WarehouseSection />
                <div className="os-settings-links">
                  <button type="button" className="os-btn-ghost" onClick={() => navigate(`/chat/${activeCompany.id}`)}>
                    Chatga o‘tish
                  </button>
                  {isOwner && (
                    <button type="button" className="os-btn-ghost" onClick={() => setRolesOpen(true)}>
                      Lavozimlarni boshqarish
                    </button>
                  )}
                </div>
              </div>
            )}

            {tab === "billing" && (
              <div className="os-card os-tab-panel">
                <h4>Billing</h4>
                <div className="os-billing">
                  <div>
                    <span className="os-plan-badge">Pro Plan</span>
                    <p>
                      {members.length} / {SEAT_CAP} o‘rin band
                    </p>
                  </div>
                  <p className="os-muted">To‘liq billing moduli tez orada ulanadi. Hozircha barcha asosiy funksiyalar ochiq.</p>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {rolesOpen && activeCompany && (
        <div className="companies-modal-backdrop" onClick={() => setRolesOpen(false)}>
          <div className="card companies-modal" onClick={(e) => e.stopPropagation()}>
            <div className="companies-modal-head">
              <h3>{activeCompany.name} — lavozimlar</h3>
              <button className="secondary companies-soft-btn" onClick={() => setRolesOpen(false)}>
                Yopish
              </button>
            </div>
            <RoleManager companyId={activeCompany.id} />
          </div>
        </div>
      )}

      {inviteOpen && activeCompany && (
        <div className="companies-modal-backdrop" onClick={() => setInviteOpen(false)}>
          <div className="card companies-modal companies-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="companies-modal-head">
              <h3>{activeCompany.name}ga aʼzo qo‘shish</h3>
              <button className="secondary companies-soft-btn" onClick={() => setInviteOpen(false)}>
                Yopish
              </button>
            </div>
            <form onSubmit={handleInvite}>
              <UserSearchInput
                selected={inviteUser}
                onSelect={setInviteUser}
                onClear={() => setInviteUser(null)}
                disabledIds={members.map((m) => m.user_id)}
                disabledLabel="Allaqachon ishxonada"
                placeholder="Ism yoki email yozing..."
              />
              {inviteError && <p className="error">{inviteError}</p>}
              <button type="submit" className="os-btn-primary" disabled={inviteLoading || !inviteUser}>
                {inviteLoading ? "Yuborilmoqda..." : "Ishga taklif qilish"}
              </button>
            </form>
            {inviteLink && (
              <div className="companies-invite-result">
                <p>Taklif yuborildi — bildirishnomada ko‘rinadi.</p>
                <div className="companies-invite-link">
                  <span>{inviteLink}</span>
                  <button
                    type="button"
                    className="secondary companies-soft-btn"
                    onClick={() => copy(inviteLink, "invite")}
                  >
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
              bo‘lmaydi.
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
