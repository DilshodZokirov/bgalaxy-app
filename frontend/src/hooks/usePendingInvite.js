const KEY = "bgalaxy_pending_invite";

export function getPendingInvite() {
  return localStorage.getItem(KEY);
}

export function setPendingInvite(token) {
  localStorage.setItem(KEY, token);
}

export function clearPendingInvite() {
  localStorage.removeItem(KEY);
}
