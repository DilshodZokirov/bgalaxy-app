const READ_KEY = "bgalaxy_chat_read_v1";

function readMap() {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function writeMap(map) {
  localStorage.setItem(READ_KEY, JSON.stringify(map));
}

export function chatReadKey(kind, id) {
  return `${kind}:${id}`;
}

/** First time we see a chat, seed as read so old history isn't "unread". */
export function seedChatRead(kind, id, lastMessageAt) {
  const map = readMap();
  const key = chatReadKey(kind, id);
  if (!(key in map)) {
    map[key] = lastMessageAt || new Date(0).toISOString();
    writeMap(map);
  }
}

export function markChatRead(kind, id, at = new Date().toISOString()) {
  const map = readMap();
  map[chatReadKey(kind, id)] = at;
  writeMap(map);
}

export function isChatUnread(kind, id, lastMessageAt) {
  if (!lastMessageAt) return false;
  const readAt = readMap()[chatReadKey(kind, id)];
  if (!readAt) return false;
  return new Date(lastMessageAt).getTime() > new Date(readAt).getTime();
}

export function formatChatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "short" });
}
