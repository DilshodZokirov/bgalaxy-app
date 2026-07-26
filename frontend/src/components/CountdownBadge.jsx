import { useEffect, useState } from "react";
import { formatCountdown, pad2 } from "./scheduledMeetingUtils";

export default function CountdownBadge({ startsAt, onDue, compact = false }) {
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
    <div className={`meetings-countdown ${info.due ? "due" : ""} ${compact ? "compact" : ""}`}>
      <span className="meetings-countdown-label">{info.due ? "Uchrashuv vaqti" : "Qolgan vaqt"}</span>
      <strong className="meetings-countdown-digits">{info.label}</strong>
      {!info.due && !compact && (
        <div className="meetings-countdown-units" aria-hidden>
          <span>{pad2(info.parts.h)} soat</span>
          <span>{pad2(info.parts.m)} daq</span>
          <span>{pad2(info.parts.s)} son</span>
        </div>
      )}
    </div>
  );
}
