import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { pickActiveCompany, setActiveCompanyId } from "../hooks/useCompany";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";

function MeetingsHeading() {
  return (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">Online Meeting</p>
      <h1>Uchrashuvlar</h1>
      <p>Hozir boshlang yoki vaqtga belgilang — mavzu va countdown bilan.</p>
    </div>
  );
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatCountdown(ms) {
  if (ms <= 0) return { label: "Vaqti keldi", parts: { d: 0, h: 0, m: 0, s: 0 }, due: true };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const label =
    d > 0
      ? `${d}k ${pad2(h)}:${pad2(m)}:${pad2(s)}`
      : `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return { label, parts: { d, h, m, s }, due: false };
}

function toLocalInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function CountdownBadge({ startsAt, onDue }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = new Date(startsAt).getTime() - now;
  const info = formatCountdown(ms);

  useEffect(() => {
    if (info.due && onDue) onDue();
  }, [info.due]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`meetings-countdown ${info.due ? "due" : ""}`}>
      <span className="meetings-countdown-label">{info.due ? "Uchrashuv vaqti" : "Qolgan vaqt"}</span>
      <strong className="meetings-countdown-digits">{info.label}</strong>
      {!info.due && (
        <div className="meetings-countdown-units" aria-hidden>
          <span>{pad2(info.parts.h)} soat</span>
          <span>{pad2(info.parts.m)} daq</span>
          <span>{pad2(info.parts.s)} son</span>
        </div>
      )}
    </div>
  );
}

export default function MeetingsHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [partners, setPartners] = useState([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const [company, setCompany] = useState(null);
  const [activeGroupCall, setActiveGroupCall] = useState(null);
  const [activePartnerMeetings, setActivePartnerMeetings] = useState([]);
  const [scheduled, setScheduled] = useState([]);

  const [schedTitle, setSchedTitle] = useState("");
  const [schedDescription, setSchedDescription] = useState("");
  const [schedAt, setSchedAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return toLocalInputValue(d);
  });
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedError, setSchedError] = useState(null);

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => setCompany(pickActiveCompany(list)))
      .catch(() => {});
  }, []);

  function refreshScheduled() {
    api.getScheduledMeetings().then(setScheduled).catch(() => setScheduled([]));
  }

  useEffect(() => {
    refreshActive();
    refreshScheduled();
    const interval = setInterval(() => {
      refreshActive();
      refreshScheduled();
    }, 15000);
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

  async function handleScheduleSubmit(e) {
    e.preventDefault();
    if (!company) {
      setSchedError("Avval faol kompaniyani tanlang");
      return;
    }
    setSchedSaving(true);
    setSchedError(null);
    try {
      const startsAt = new Date(schedAt);
      if (Number.isNaN(startsAt.getTime())) {
        throw new Error("Vaqt noto‘g‘ri");
      }
      await api.createScheduledMeeting({
        company_id: company.id,
        title: schedTitle.trim(),
        description: schedDescription.trim(),
        starts_at: startsAt.toISOString(),
      });
      setShowSchedule(false);
      setSchedTitle("");
      setSchedDescription("");
      refreshScheduled();
    } catch (err) {
      setSchedError(err.message);
    } finally {
      setSchedSaving(false);
    }
  }

  async function handleCancelScheduled(id) {
    try {
      await api.cancelScheduledMeeting(id);
      refreshScheduled();
    } catch {
      // ignore
    }
  }

  function joinScheduled(meeting) {
    if (meeting.company_id) setActiveCompanyId(meeting.company_id);
    navigate("/group-meeting");
  }

  const upcoming = useMemo(
    () => scheduled.filter((m) => m.status === "scheduled" || m.status === "notified"),
    [scheduled]
  );

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
          <button
            type="button"
            className="meetings-cta"
            disabled={!company}
            onClick={() => {
              setSchedError(null);
              setShowSchedule(true);
            }}
          >
            Vaqtga belgilash
          </button>
        </div>

        {upcoming.length > 0 && (
          <section className="meetings-scheduled" aria-label="Belgilangan uchrashuvlar">
            <div className="meetings-section-head">
              <h3>Belgilangan uchrashuvlar</h3>
            </div>
            <div className="meetings-scheduled-list">
              {upcoming.map((m) => {
                const when = new Date(m.starts_at);
                const whenLabel = when.toLocaleString("uz-UZ", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const isCreator = user?.id === m.created_by;
                return (
                  <article key={m.id} className={`meetings-scheduled-card ${m.status === "notified" ? "is-due" : ""}`}>
                    <div className="meetings-scheduled-copy">
                      <strong>{m.title}</strong>
                      <p className="meetings-scheduled-meta">
                        {m.company_name} · {whenLabel}
                        {m.creator_name ? ` · ${m.creator_name}` : ""}
                      </p>
                      {m.description && <p className="meetings-scheduled-desc">{m.description}</p>}
                    </div>
                    <CountdownBadge startsAt={m.starts_at} onDue={() => refreshScheduled()} />
                    <div className="meetings-scheduled-actions">
                      <button type="button" className="meetings-cta" onClick={() => joinScheduled(m)}>
                        {m.status === "notified" || new Date(m.starts_at) <= new Date()
                          ? "Uchrashuvga kirish"
                          : "Erta kirish"}
                      </button>
                      {isCreator && m.status === "scheduled" && (
                        <button
                          type="button"
                          className="secondary meetings-soft-btn"
                          onClick={() => handleCancelScheduled(m.id)}
                        >
                          Bekor qilish
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

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
              <em>Hozir kompaniya xonasiga qo‘shiling</em>
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

          <button
            type="button"
            className="meetings-launch-card schedule"
            disabled={!company}
            onClick={() => {
              setSchedError(null);
              setShowSchedule(true);
            }}
          >
            <span className="meetings-launch-mark" aria-hidden>
              V
            </span>
            <span className="meetings-launch-copy">
              <strong>Vaqtga belgilash</strong>
              <em>Mavzu + sana/soat + soniyagacha countdown</em>
            </span>
            <span className="meetings-launch-cta">Belgilash</span>
          </button>
        </section>
      </div>

      {showSchedule && (
        <div className="meetings-modal-backdrop" onClick={() => setShowSchedule(false)}>
          <div className="card meetings-modal meetings-schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="meetings-modal-head">
              <h3>Uchrashuvni vaqtga belgilash</h3>
              <button type="button" className="secondary meetings-soft-btn" onClick={() => setShowSchedule(false)}>
                Yopish
              </button>
            </div>
            <p className="meetings-modal-hint">
              Masalan: bugun soat 16:00 — mavzu “Oylik muammo”. Vaqt yaqinlashganda jamoa bildirishnoma oladi,
              countdown esa soniyagacha sanaydi.
            </p>
            <form onSubmit={handleScheduleSubmit}>
              <label>Sarlavha</label>
              <input
                value={schedTitle}
                onChange={(e) => setSchedTitle(e.target.value)}
                placeholder="Oylik muhokama"
                required
              />
              <label>Mavzu / description</label>
              <textarea
                value={schedDescription}
                onChange={(e) => setSchedDescription(e.target.value)}
                placeholder="Uchrashuvda oylik muammo haqida gaplashamiz..."
                rows={3}
              />
              <label>Sana va soat</label>
              <input
                type="datetime-local"
                value={schedAt}
                min={toLocalInputValue(new Date())}
                onChange={(e) => setSchedAt(e.target.value)}
                required
              />
              {schedError && <p className="error">{schedError}</p>}
              <button type="submit" className="meetings-cta" disabled={schedSaving || !company}>
                {schedSaving ? "Saqlanmoqda..." : "Belgilash"}
              </button>
            </form>
          </div>
        </div>
      )}

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
