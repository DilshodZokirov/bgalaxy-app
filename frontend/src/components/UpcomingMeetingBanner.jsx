import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { setActiveCompanyId } from "../hooks/useCompany";
import CountdownBadge from "./CountdownBadge";
import { formatMeetingWhen, pickNextMeeting } from "./scheduledMeetingUtils";

/**
 * Global upcoming-meeting strip shown under the app bar on every AppShell page.
 */
export default function UpcomingMeetingBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [meetings, setMeetings] = useState([]);
  const [hiddenId, setHiddenId] = useState(null);

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
  if (!next || next.id === hiddenId) return null;

  // On Meetings hub we already show the full cards — keep a slim reminder only.
  const slim = location.pathname.startsWith("/meetings");

  function join() {
    if (next.company_id) setActiveCompanyId(next.company_id);
    navigate("/group-meeting");
  }

  return (
    <div className={`upcoming-meeting-banner ${slim ? "slim" : ""} ${next.status === "notified" ? "is-due" : ""}`}>
      <div className="upcoming-meeting-banner-copy">
        <span className="upcoming-meeting-kicker">Keyingi uchrashuv</span>
        <strong>{next.title}</strong>
        {!slim && (
          <p>
            {formatMeetingWhen(next.starts_at)}
            {next.company_name ? ` · ${next.company_name}` : ""}
            {next.description ? ` — ${next.description}` : ""}
          </p>
        )}
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
        <button
          type="button"
          className="upcoming-meeting-dismiss"
          onClick={() => setHiddenId(next.id)}
          title="Hozircha yashirish"
          aria-label="Yashirish"
        >
          ×
        </button>
      </div>
    </div>
  );
}
