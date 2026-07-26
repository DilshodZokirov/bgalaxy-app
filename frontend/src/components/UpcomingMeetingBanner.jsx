import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { setActiveCompanyId } from "../hooks/useCompany";
import CountdownBadge from "./CountdownBadge";
import { formatMeetingWhen, pickNextMeeting } from "./scheduledMeetingUtils";

function toLocalInputValue(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Global upcoming-meeting strip shown under the app bar on every AppShell page.
 * Creator gets Update / Delete; after the call ends the meeting is completed server-side.
 */
export default function UpcomingMeetingBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAt, setEditAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  function refresh() {
    api
      .getScheduledMeetings()
      .then(setMeetings)
      .catch(() => setMeetings([]));
  }

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  const next = pickNextMeeting(meetings);
  if (!next) return null;

  // Meetings hub already lists full scheduled cards — avoid a second copy there.
  if (location.pathname.startsWith("/meetings")) return null;

  const isCreator = user?.id === next.created_by;

  function join() {
    if (next.company_id) setActiveCompanyId(next.company_id);
    navigate(`/group-meeting?scheduled=${encodeURIComponent(next.id)}`);
  }

  function openEdit() {
    setError(null);
    setEditTitle(next.title || "");
    setEditDescription(next.description || "");
    setEditAt(toLocalInputValue(new Date(next.starts_at)));
    setEditing(true);
  }

  async function handleUpdate(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const startsAt = new Date(editAt);
      if (Number.isNaN(startsAt.getTime())) throw new Error("Vaqt noto‘g‘ri");
      await api.updateScheduledMeeting(next.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        starts_at: startsAt.toISOString(),
      });
      setEditing(false);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Uchrashuv bannerini o‘chirasizmi?")) return;
    setDeleting(true);
    setError(null);
    try {
      await api.cancelScheduledMeeting(next.id);
      setEditing(false);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className={`upcoming-meeting-banner ${next.status === "notified" ? "is-due" : ""}`}>
        <div className="upcoming-meeting-banner-copy">
          <span className="upcoming-meeting-kicker">Keyingi uchrashuv</span>
          <strong>{next.title}</strong>
          <p>
            {formatMeetingWhen(next.starts_at)}
            {next.company_name ? ` · ${next.company_name}` : ""}
            {next.description ? ` — ${next.description}` : ""}
          </p>
        </div>

        <CountdownBadge startsAt={next.starts_at} compact onDue={refresh} />

        <div className="upcoming-meeting-banner-actions">
          <button type="button" className="meetings-cta" onClick={join}>
            {new Date(next.starts_at) <= new Date() || next.status === "notified" ? "Kirish" : "Erta kirish"}
          </button>
          <button
            type="button"
            className="secondary meetings-soft-btn"
            onClick={() => navigate("/meetings")}
            title="Barcha belgilangan uchrashuvlar"
          >
            Barchasi
          </button>
          {isCreator && (
            <>
              <button
                type="button"
                className="secondary meetings-soft-btn"
                onClick={openEdit}
                title="Banner sozlamalarini o‘zgartirish"
              >
                Update
              </button>
              <button
                type="button"
                className="secondary meetings-soft-btn upcoming-meeting-delete"
                onClick={handleDelete}
                disabled={deleting}
                title="Bannerni o‘chirish"
              >
                {deleting ? "..." : "Delete"}
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="meetings-modal-backdrop" onClick={() => setEditing(false)}>
          <div className="card meetings-modal meetings-schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="meetings-modal-head">
              <h3>Uchrashuvni yangilash</h3>
              <button type="button" className="secondary meetings-soft-btn" onClick={() => setEditing(false)}>
                Yopish
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <label>Sarlavha</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
              <label>Mavzu / description</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
              <label>Sana va soat</label>
              <input
                type="datetime-local"
                value={editAt}
                min={toLocalInputValue(new Date())}
                onChange={(e) => setEditAt(e.target.value)}
                required
              />
              {error && <p className="error">{error}</p>}
              <div className="upcoming-meeting-edit-actions">
                <button type="submit" className="meetings-cta" disabled={saving}>
                  {saving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
                <button
                  type="button"
                  className="secondary meetings-soft-btn upcoming-meeting-delete"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
