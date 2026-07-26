import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { setActiveCompanyId } from "../hooks/useCompany";
import CountdownBadge from "./CountdownBadge";
import { formatMeetingWhen, pickNextMeeting } from "./scheduledMeetingUtils";

/** Richer upcoming-meeting card for Dashboard (and similar surfaces). */
export default function UpcomingMeetingCard() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);

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

  function join() {
    if (next.company_id) setActiveCompanyId(next.company_id);
    navigate("/group-meeting");
  }

  return (
    <section className="upcoming-meeting-card" aria-label="Keyingi uchrashuv">
      <div className="upcoming-meeting-card-copy">
        <span className="upcoming-meeting-kicker">Belgilangan uchrashuv</span>
        <h3>{next.title}</h3>
        <p className="upcoming-meeting-card-meta">
          {formatMeetingWhen(next.starts_at)}
          {next.company_name ? ` · ${next.company_name}` : ""}
          {next.creator_name ? ` · ${next.creator_name}` : ""}
        </p>
        {next.description && <p className="upcoming-meeting-card-desc">{next.description}</p>}
      </div>
      <CountdownBadge startsAt={next.starts_at} onDue={refresh} />
      <div className="upcoming-meeting-card-actions">
        <button type="button" className="meetings-cta" onClick={join}>
          {new Date(next.starts_at) <= new Date() || next.status === "notified" ? "Uchrashuvga kirish" : "Erta kirish"}
        </button>
        <button type="button" className="secondary meetings-soft-btn" onClick={() => navigate("/meetings")}>
          Uchrashuvlar
        </button>
      </div>
    </section>
  );
}
