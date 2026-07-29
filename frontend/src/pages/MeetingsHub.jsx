import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useActiveCompany, setActiveCompanyId } from "../hooks/useCompany";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/AppShell";
import CountdownBadge from "../components/CountdownBadge";
import UserSearchInput from "../components/UserSearchInput";
import { useIsMobileShell } from "../native";

function MeetingsHeading({ compact }) {
  return (
    <div className={`galaxy-page-heading ${compact ? "is-compact" : ""}`}>
      <p className="galaxy-page-kicker">Uchrashuvlar</p>
      <h1>Uchrashuvlar</h1>
      {!compact && <p>Hozir boshlang yoki vaqtga belgilang — mavzu va countdown bilan.</p>}
    </div>
  );
}

function toLocalInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function defaultSchedAt() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalInputValue(d);
}

export default function MeetingsHub() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { company, loading: companyLoading } = useActiveCompany();
  const isMobile = useIsMobileShell();
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [partners, setPartners] = useState([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const [activeGroupCall, setActiveGroupCall] = useState(null);
  const [activePartnerMeetings, setActivePartnerMeetings] = useState([]);
  const [scheduled, setScheduled] = useState([]);

  const [schedTitle, setSchedTitle] = useState("");
  const [schedDescription, setSchedDescription] = useState("");
  const [schedAt, setSchedAt] = useState(defaultSchedAt);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedError, setSchedError] = useState(null);

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

  function resetScheduleForm() {
    setEditingId(null);
    setSchedTitle("");
    setSchedDescription("");
    setSchedAt(defaultSchedAt());
    setSchedError(null);
  }

  function openCreateSchedule() {
    resetScheduleForm();
    setShowSchedule(true);
  }

  function openEditSchedule(meeting) {
    setEditingId(meeting.id);
    setSchedTitle(meeting.title || "");
    setSchedDescription(meeting.description || "");
    setSchedAt(toLocalInputValue(new Date(meeting.starts_at)));
    setSchedError(null);
    setShowSchedule(true);
  }

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !scheduled.length) return;
    const meeting = scheduled.find((m) => String(m.id) === String(editId));
    if (!meeting) return;
    openEditSchedule(meeting);
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduled, searchParams]);

  async function handleScheduleSubmit(e) {
    e.preventDefault();
    if (!editingId && !company) {
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
      if (editingId) {
        await api.updateScheduledMeeting(editingId, {
          title: schedTitle.trim(),
          description: schedDescription.trim(),
          starts_at: startsAt.toISOString(),
        });
      } else {
        await api.createScheduledMeeting({
          company_id: company.id,
          title: schedTitle.trim(),
          description: schedDescription.trim(),
          starts_at: startsAt.toISOString(),
        });
      }
      setShowSchedule(false);
      resetScheduleForm();
      refreshScheduled();
    } catch (err) {
      setSchedError(err.message);
    } finally {
      setSchedSaving(false);
    }
  }

  async function handleCancelScheduled(id) {
    if (!window.confirm("Uchrashuvni o‘chirasizmi?")) return;
    try {
      await api.cancelScheduledMeeting(id);
      if (editingId === id) {
        setShowSchedule(false);
        resetScheduleForm();
      }
      refreshScheduled();
    } catch {
      // ignore
    }
  }

  function joinScheduled(meeting) {
    if (meeting.company_id) setActiveCompanyId(meeting.company_id);
    navigate(`/group-meeting?scheduled=${encodeURIComponent(meeting.id)}`);
  }

  const upcoming = useMemo(
    () => scheduled.filter((m) => m.status === "scheduled" || m.status === "notified"),
    [scheduled]
  );

  const hasActive = activeGroupCall || activePartnerMeetings.length > 0;

  const launchSection = (
    <section className="meetings-launch" aria-label="Yangi uchrashuv">
      <button type="button" className="meetings-launch-card" onClick={() => navigate("/group-meeting")}>
        <span className="meetings-launch-mark" aria-hidden>
          G
        </span>
        <span className="meetings-launch-copy">
          <strong>Guruh uchrashuvi</strong>
          <em>{isMobile ? "Kompaniya xonasiga kirish" : "Hozir kompaniya xonasiga qo‘shiling"}</em>
        </span>
        <span className="meetings-launch-cta">Boshlash</span>
      </button>

      <button type="button" className="meetings-launch-card partner" onClick={() => setShowPartnerSearch(true)}>
        <span className="meetings-launch-mark" aria-hidden>
          H
        </span>
        <span className="meetings-launch-copy">
          <strong>Hamkorlar bilan</strong>
          <em>{isMobile ? "Istalgan foydalanuvchi" : "BG’dagi istalgan foydalanuvchi bilan"}</em>
        </span>
        <span className="meetings-launch-cta">Tanlash</span>
      </button>

      <button
        type="button"
        className="meetings-launch-card schedule"
        disabled={!company}
        onClick={openCreateSchedule}
      >
        <span className="meetings-launch-mark" aria-hidden>
          V
        </span>
        <span className="meetings-launch-copy">
          <strong>Vaqtga belgilash</strong>
          <em>{isMobile ? "Sana, soat va mavzu" : "Mavzu + sana/soat + soniyagacha countdown"}</em>
        </span>
        <span className="meetings-launch-cta">Belgilash</span>
      </button>
    </section>
  );

  const liveSection = hasActive ? (
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
  ) : null;

  const scheduledSection =
    upcoming.length > 0 ? (
      <section className="meetings-scheduled" aria-label="Belgilangan uchrashuvlar">
        <div className="meetings-section-head">
          <h3>Belgilangan uchrashuvlar</h3>
        </div>
        <div className="meetings-scheduled-list">
          {upcoming.map((m) => {
            const when = new Date(m.starts_at);
            const whenLabel = when.toLocaleString("uz-UZ", {
              weekday: "short",
              year: isMobile ? undefined : "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            const isCreator = user?.id === m.created_by;
            const canJoinNow = m.status === "notified" || new Date(m.starts_at) <= new Date();
            return (
              <article key={m.id} className={`meetings-scheduled-card ${m.status === "notified" ? "is-due" : ""}`}>
                <div className="meetings-scheduled-copy">
                  <strong>{m.title}</strong>
                  <p className="meetings-scheduled-meta">
                    {m.company_name} · {whenLabel}
                    {!isMobile && m.creator_name ? ` · ${m.creator_name}` : ""}
                  </p>
                  {m.description && <p className="meetings-scheduled-desc">{m.description}</p>}
                </div>
                <CountdownBadge startsAt={m.starts_at} onDue={() => refreshScheduled()} />
                <div className="meetings-scheduled-actions">
                  <button type="button" className="meetings-cta" onClick={() => joinScheduled(m)}>
                    {canJoinNow ? "Kirish" : "Erta kirish"}
                  </button>
                  {isCreator && (
                    <>
                      <button
                        type="button"
                        className="secondary meetings-soft-btn"
                        onClick={() => openEditSchedule(m)}
                      >
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        className="secondary meetings-soft-btn upcoming-meeting-delete"
                        onClick={() => handleCancelScheduled(m.id)}
                      >
                        O‘chirish
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    ) : null;

  return (
    <AppShell
      hideAppBar={isMobile}
      topLeft={isMobile ? null : <MeetingsHeading />}
    >
      <div className={`meetings-page ${isMobile ? "is-mobile" : ""}`}>
        {isMobile && <MeetingsHeading compact />}

        {!isMobile && (
          <div className="meetings-toolbar">
            <div>
              <h2>Uchrashuv markazi</h2>
              <p>
                {companyLoading
                  ? "Yuklanmoqda..."
                  : company
                    ? `Faol korxona: ${company.name}`
                    : "Guruh uchrashuvi uchun avval kompaniya tanlang"}
              </p>
            </div>
            <button
              type="button"
              className="meetings-cta"
              disabled={!company}
              onClick={openCreateSchedule}
            >
              Vaqtga belgilash
            </button>
          </div>
        )}

        {isMobile && (
          <p className="meetings-mobile-company">
            {companyLoading
              ? "Yuklanmoqda..."
              : company
                ? company.name
                : "Kompaniya tanlanmagan"}
          </p>
        )}

        {/* Mobil: avval harakatlar, keyin jonli, so‘ng reja */}
        {isMobile ? (
          <>
            {launchSection}
            {liveSection}
            {scheduledSection}
            {!hasActive && upcoming.length === 0 && (
              <p className="meetings-mobile-empty">Hali rejalashtirilgan uchrashuv yo‘q. Yuqoridan boshlang.</p>
            )}
          </>
        ) : (
          <>
            {scheduledSection}
            {liveSection}
            {launchSection}
          </>
        )}
      </div>

      {showSchedule && (
        <div
          className={`meetings-modal-backdrop ${isMobile ? "is-sheet" : ""}`}
          onClick={() => {
            setShowSchedule(false);
            resetScheduleForm();
          }}
        >
          <div className="card meetings-modal meetings-schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="meetings-modal-head">
              <h3>{editingId ? "Uchrashuvni yangilash" : "Vaqtga belgilash"}</h3>
              <button
                type="button"
                className="secondary meetings-soft-btn"
                onClick={() => {
                  setShowSchedule(false);
                  resetScheduleForm();
                }}
              >
                Yopish
              </button>
            </div>
            <p className="meetings-modal-hint">
              {editingId
                ? "Vaqt, sarlavha yoki mavzuni o‘zgartiring."
                : isMobile
                  ? "Sana, soat va mavzuni kiriting — jamoa bildirishnoma oladi."
                  : "Masalan: bugun soat 16:00 — mavzu “Oylik muammo”. Vaqt yaqinlashganda jamoa bildirishnoma oladi, countdown esa soniyagacha sanaydi."}
            </p>
            <form onSubmit={handleScheduleSubmit}>
              <label>Sarlavha</label>
              <input
                value={schedTitle}
                onChange={(e) => setSchedTitle(e.target.value)}
                placeholder="Oylik muhokama"
                required
              />
              <label>Mavzu</label>
              <textarea
                value={schedDescription}
                onChange={(e) => setSchedDescription(e.target.value)}
                placeholder="Uchrashuvda nima muhokama qilinadi..."
                rows={isMobile ? 2 : 3}
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
              <div className="upcoming-meeting-edit-actions">
                <button
                  type="submit"
                  className="meetings-cta"
                  disabled={schedSaving || (!editingId && !company)}
                >
                  {schedSaving ? "Saqlanmoqda..." : editingId ? "Saqlash" : "Belgilash"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="secondary meetings-soft-btn upcoming-meeting-delete"
                    onClick={() => handleCancelScheduled(editingId)}
                  >
                    O‘chirish
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {showPartnerSearch && (
        <div
          className={`meetings-modal-backdrop ${isMobile ? "is-sheet" : ""}`}
          onClick={() => setShowPartnerSearch(false)}
        >
          <div className="card meetings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="meetings-modal-head">
              <h3>Hamkorlar bilan</h3>
              <button type="button" className="secondary meetings-soft-btn" onClick={() => setShowPartnerSearch(false)}>
                Yopish
              </button>
            </div>

            <p className="meetings-modal-hint">
              Ism yoki email bo‘yicha qidiring — bir nechta hamkor qo‘shish mumkin.
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

            <UserSearchInput
              selected={null}
              onSelect={addPartner}
              onClear={() => {}}
              disabledIds={partners.map((p) => p.id)}
              disabledLabel="Allaqachon tanlangan"
            />
            {error && <p className="error">{error}</p>}
            <button
              type="button"
              className="meetings-cta"
              onClick={handleStartPartnerMeeting}
              disabled={partners.length === 0 || starting}
            >
              {starting
                ? "Boshlanmoqda..."
                : `Boshlash${partners.length > 1 ? ` (${partners.length})` : ""}`}
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
