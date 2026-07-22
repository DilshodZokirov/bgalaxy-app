import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, wsUrl } from "../api/client";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  function refresh() {
    api
      .getNotifications()
      .then(setNotifications)
      .catch(() => {});
  }

  useEffect(() => {
    refresh();

    const socket = new WebSocket(wsUrl("/ws/notifications"));
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notification") refresh();
      } catch {
        // ignore malformed frames
      }
    };

    // Slow fallback poll in case the socket ever drops silently.
    const interval = setInterval(refresh, 60000);
    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function markLocally(id, updates) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }

  async function handleAcceptInvite(n) {
    try {
      await api.acceptInvite(n.invite_token);
      await api.markNotificationRead(n.id);
      markLocally(n.id, { read: true, resolved: true });
    } catch {
      // ignore
    }
  }

  async function handleJoinPartnerCall(n) {
    try {
      await api.markNotificationRead(n.id);
      markLocally(n.id, { read: true });
    } catch {
      // ignore
    }
    setOpen(false);
    navigate(`/partner-call/${n.invite_token}`);
  }

  async function handleAccept(id) {
    try {
      await api.acceptJoinRequest(id);
      markLocally(id, { read: true, resolved: true });
    } catch {
      // ignore
    }
  }

  async function handleReject(id) {
    try {
      await api.rejectJoinRequest(id);
      markLocally(id, { read: true, resolved: true });
    } catch {
      // ignore
    }
  }

  async function handleDismiss(id) {
    try {
      await api.markNotificationRead(id);
      markLocally(id, { read: true });
    } catch {
      // ignore
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div ref={wrapRef}>
      <div className="notif-bell-wrap">
        <button className="notif-bell-btn" onClick={() => setOpen((v) => !v)}>
          🔔
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </button>
      </div>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <strong style={{ fontSize: 13.5 }}>Bildirishnomalar</strong>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}>Hammasini o'qilgan deb belgilash</button>
            )}
          </div>

          {notifications.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>
              Hali bildirishnoma yo'q
            </p>
          )}

          {notifications.map((n) => {
            const isActionable =
              !n.resolved &&
              (n.type === "join_request" ||
                n.type === "channel_invite" ||
                n.type === "direct_chat_invite" ||
                n.type === "invite" ||
                n.type === "partner_call" ||
                n.type === "task_assigned" ||
                n.type === "task_update" ||
                n.type === "direct_message");

            return (
              <div className="notif-item" key={n.id} style={{ opacity: n.read ? 0.55 : 1 }}>
                <div style={{ color: n.read ? "var(--text-dim)" : "var(--text)", fontWeight: n.read ? 400 : 600 }}>
                  {n.message}
                </div>
                {n.company_name && (
                  <div style={{ color: "var(--text-dim)", fontSize: 12 }}>{n.company_name}</div>
                )}
                <div className="notif-time">{timeAgo(n.created_at)}</div>

                {!isActionable ? (
                  !n.read && (
                    <div className="notif-item-actions">
                      <button className="secondary" onClick={() => handleDismiss(n.id)}>
                        O'qildi deb belgilash
                      </button>
                    </div>
                  )
                ) : n.type === "join_request" || n.type === "channel_invite" || n.type === "direct_chat_invite" ? (
                  <div className="notif-item-actions">
                    <button onClick={() => handleAccept(n.id)}>Qabul qilish</button>
                    <button className="secondary" onClick={() => handleReject(n.id)}>
                      Rad qilish
                    </button>
                  </div>
                ) : n.type === "invite" ? (
                  <div className="notif-item-actions">
                    <button onClick={() => handleAcceptInvite(n)}>A'zo bo'lish</button>
                    <button className="secondary" onClick={() => handleDismiss(n.id)}>
                      Rad qilish
                    </button>
                  </div>
                ) : n.type === "partner_call" ? (
                  <div className="notif-item-actions">
                    <button onClick={() => handleJoinPartnerCall(n)}>🎥 Qo'shilish</button>
                    <button className="secondary" onClick={() => handleDismiss(n.id)}>
                      Yopish
                    </button>
                  </div>
                ) : n.type === "task_assigned" || n.type === "task_update" ? (
                  <div className="notif-item-actions">
                    <button onClick={() => { handleDismiss(n.id); setOpen(false); navigate("/tasks"); }}>
                      🗂️ Ko'rish
                    </button>
                    <button className="secondary" onClick={() => handleDismiss(n.id)}>
                      Yopish
                    </button>
                  </div>
                ) : (
                  <div className="notif-item-actions">
                    <button onClick={() => { handleDismiss(n.id); setOpen(false); navigate("/direct-chat"); }}>
                      💬 Ko'rish
                    </button>
                    <button className="secondary" onClick={() => handleDismiss(n.id)}>
                      Yopish
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
