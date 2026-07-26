export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function formatCountdown(ms) {
  if (ms <= 0) return { label: "Vaqti keldi", parts: { d: 0, h: 0, m: 0, s: 0 }, due: true };
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const label = d > 0 ? `${d}k ${pad2(h)}:${pad2(m)}:${pad2(s)}` : `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  return { label, parts: { d, h, m, s }, due: false };
}

/** Nearest upcoming meeting (scheduled/notified), soonest first. */
export function pickNextMeeting(list = [], now = Date.now()) {
  const active = (list || []).filter((m) => m.status === "scheduled" || m.status === "notified");
  if (!active.length) return null;
  return [...active].sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at) || 0)[0] || null;
}

export function formatMeetingWhen(iso) {
  return new Date(iso).toLocaleString("uz-UZ", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
