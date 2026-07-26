import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";

function MeetingsHeading() {
  return (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">Online Meeting</p>
      <h1>Uchrashuvlar</h1>
      <p>Guruh yoki hamkorlar bilan video uchrashuv — bitta markazda.</p>
    </div>
  );
}

export default function MeetingsHub() {
  const navigate = useNavigate();
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [partners, setPartners] = useState([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const [company, setCompany] = useState(null);
  const [activeGroupCall, setActiveGroupCall] = useState(null);
  const [activePartnerMeetings, setActivePartnerMeetings] = useState([]);

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => setCompany(pickActiveCompany(list)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshActive();
    const interval = setInterval(refreshActive, 15000);
    return () => clearInterval(interval);
  }, [company?.id]);

  function refreshActive() {
    api.getActivePartnerMeetings().then(setActivePartnerMeetings).catch(() => {});
    if (!company) {
      setActiveGroupCall(null);
      return;
    }
    api
      .getActiveGroupCall(company.id)
      .then((res) => setActiveGroupCall(res.active ? res : null))
      .catch(() => setActiveGroupCall(null));
  }

  function addPartner(u) {
    setPartners((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
  }

  function removePartner(id) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleStartPartnerMeeting() {
    if (partners.length === 0) return;
    setStarting(true);
    setError(null);
    try {
      const res = await api.startPartnerMeeting(partners.map((p) => p.id));
      navigate(`/partner-call/${res.room_name}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  const hasActive = activeGroupCall || activePartnerMeetings.length > 0;

  return (
    <AppShell topLeft={<MeetingsHeading />}>
      <div className="meetings-page">
        <div className="meetings-toolbar">
          <div>
            <h2>Uchrashuv markazi</h2>
            <p>
              {company
                ? `Faol korxona: ${company.name}`
                : "Guruh uchrashuvi uchun avval kompaniya tanlang"}
            </p>
          </div>
        </div>

        {hasActive && (
          <section className="meetings-live" aria-label="Faol uchrashuvlar">
            <div className="meetings-section-head">
              <h3>Faol uchrashuvlar</h3>
              <span className="meetings-live-dot" aria-hidden />
            </div>
            <div className="meetings-live-list">
              {activeGroupCall && (
                <article className="meetings-live-item">
                  <div>
                    <strong>Guruh uchrashuvi</strong>
                    <p>
                      {company?.name}
                      {activeGroupCall.participants?.length
                        ? ` · ${activeGroupCall.participants.map((p) => p.name).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <button type="button" className="meetings-cta" onClick={() => navigate("/group-meeting")}>
                    Kirish
                  </button>
                </article>
              )}
              {activePartnerMeetings.map((m) => (
                <article key={m.room_name} className="meetings-live-item">
                  <div>
                    <strong>Hamkorlar uchrashuvi</strong>
                    <p>{m.participants.map((p) => p.name).join(", ")}</p>
                  </div>
                  <button
                    type="button"
                    className="meetings-cta"
                    onClick={() => navigate(`/partner-call/${m.room_name}`)}
                  >
                    Kirish
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="meetings-launch" aria-label="Yangi uchrashuv">
          <button type="button" className="meetings-launch-card" onClick={() => navigate("/group-meeting")}>
            <span className="meetings-launch-mark" aria-hidden>
              G
            </span>
            <span className="meetings-launch-copy">
              <strong>Guruh uchrashuvi</strong>
              <em>Kompaniya aʼzolari bilan LiveKit xona</em>
            </span>
            <span className="meetings-launch-cta">Boshlash</span>
          </button>

          <button type="button" className="meetings-launch-card partner" onClick={() => setShowPartnerSearch(true)}>
            <span className="meetings-launch-mark" aria-hidden>
              H
            </span>
            <span className="meetings-launch-copy">
              <strong>Hamkorlar bilan</strong>
              <em>BG’dagi istalgan foydalanuvchi bilan</em>
            </span>
            <span className="meetings-launch-cta">Tanlash</span>
          </button>
        </section>
      </div>

      {showPartnerSearch && (
        <div className="meetings-modal-backdrop" onClick={() => setShowPartnerSearch(false)}>
          <div className="card meetings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="meetings-modal-head">
              <h3>Hamkorlar bilan uchrashuv</h3>
              <button type="button" className="secondary meetings-soft-btn" onClick={() => setShowPartnerSearch(false)}>
                Yopish
              </button>
            </div>

            <p className="meetings-modal-hint">
              Email orqali qidiring — bir nechta hamkorni qo‘shishingiz mumkin.
            </p>

            {partners.length > 0 && (
              <div className="meetings-chip-row">
                {partners.map((p) => (
                  <span key={p.id} className="meetings-chip">
                    {p.full_name}
                    <button type="button" onClick={() => removePartner(p.id)} aria-label="Olib tashlash">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <UserSearchInput selected={null} onSelect={addPartner} onClear={() => {}} />
            {error && <p className="error">{error}</p>}
            <button
              type="button"
              className="meetings-cta"
              onClick={handleStartPartnerMeeting}
              disabled={partners.length === 0 || starting}
            >
              {starting
                ? "Boshlanmoqda..."
                : `Uchrashuvni boshlash${partners.length > 1 ? ` (${partners.length})` : ""}`}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
