import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, wsUrl } from "../api/client";
import { setActiveCompanyId } from "../hooks/useCompany";

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

const TYPE_META = {
  group_call_started: { icon: "📹", accent: "live", label: "Guruh uchrashuvi" },
  group_call_ended: { icon: "⌛", accent: "ended", label: "Uchrashuv yakunlandi" },
  partner_call: { icon: "🎥", accent: "live", label: "Hamkor chaqiruvi" },
  scheduled_meeting: { icon: "🗓️", accent: "meet", label: "Belgilangan uchrashuv" },
  scheduled_meeting_booked: { icon: "⏱️", accent: "meet", label: "Uchrashuv band qilindi" },
  join_request: { icon: "👤", accent: "invite", label: "A'zolik so'rovi" },
  invite: { icon: "✉️", accent: "invite", label: "Taklifnoma" },
  channel_invite: { icon: "💬", accent: "invite", label: "Kanal taklifi" },
  direct_chat_invite: { icon: "💬", accent: "invite", label: "Chat taklifi" },
  task_assigned: { icon: "🗂️", accent: "task", label: "Vazifa" },
  task_update: { icon: "🗂️", accent: "task", label: "Vazifa yangilandi" },
  direct_message: { icon: "✉️", accent: "chat", label: "Xabar" },
  mention: { icon: "@", accent: "chat", label: "Eslatma" },
  info: { icon: "ℹ️", accent: "info", label: "Ma'lumot" },
};

function metaFor(type) {
  return TYPE_META[type] || { icon: "🔔", accent: "info", label: "Bildirishnoma" };
}

export default function NotificationBell({ variant = "fixed" }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const inline = variant === "inline";

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

  function removeLocally(id) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
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
      await api.dismissNotification(n.id);
      removeLocally(n.id);
    } catch {
      // ignore
    }
    setOpen(false);
    navigate(`/partner-call/${n.invite_token}`);
  }

  async function handleJoinScheduledMeeting(n) {
    try {
      await api.markNotificationRead(n.id);
      markLocally(n.id, { read: true });
    } catch {
      // ignore
    }
    setOpen(false);
    if (n.company_id) setActiveCompanyId(n.company_id);
    const q = n.invite_token ? `?scheduled=${encodeURIComponent(n.invite_token)}` : "";
    navigate(`/group-meeting${q}`);
  }

  async function handleOpenMeetingsHub(n) {
    try {
      await api.markNotificationRead(n.id);
      markLocally(n.id, { read: true });
    } catch {
      // ignore
    }
    setOpen(false);
    if (n.company_id) setActiveCompanyId(n.company_id);
    navigate("/meetings");
  }

  async function handleJoinGroupCall(n) {
    try {
      await api.dismissNotification(n.id);
      removeLocally(n.id);
    } catch {
      // ignore
    }
    setOpen(false);
    if (n.company_id) setActiveCompanyId(n.company_id);
    navigate("/group-meeting");
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

  async function handleDismiss(n) {
    try {
      if (
        n.type === "group_call_started" ||
        n.type === "group_call_ended" ||
        n.type === "partner_call"
      ) {
        await api.dismissNotification(n.id);
        removeLocally(n.id);
      } else {
        await api.markNotificationRead(n.id);
        markLocally(n.id, { read: true, resolved: true });
      }
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
    <div ref={wrapRef} className={inline ? "notif-inline" : undefined}>
      <div className={inline ? "notif-bell-wrap notif-bell-inline" : "notif-bell-wrap"}>
        <button
          className={inline ? "galaxy-icon-btn notif-bell-btn" : "notif-bell-btn"}
          onClick={() => setOpen((v) => !v)}
          title="Bildirishnomalar"
          type="button"
        >
          🔔
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </button>
      </div>

      {open && (
        <div className={inline ? "notif-panel notif-panel-inline" : "notif-panel"}>
          <div className="notif-panel-header">
            <strong style={{ fontSize: 13.5 }}>Bildirishnomalar</strong>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}>Hammasini o'qilgan deb belgilash</button>
            )}
          </div>

          {notifications.length === 0 && (
            <p className="notif-empty">Hali bildirishnoma yo'q</p>
          )}

          {notifications.map((n) => {
            const meta = metaFor(n.type);
            const isActionable =
              !n.resolved &&
              (n.type === "join_request" ||
                n.type === "channel_invite" ||
                n.type === "direct_chat_invite" ||
                n.type === "invite" ||
                n.type === "partner_call" ||
                n.type === "group_call_started" ||
                n.type === "group_call_ended" ||
                n.type === "scheduled_meeting" ||
                n.type === "scheduled_meeting_booked" ||
                n.type === "task_assigned" ||
                n.type === "task_update" ||
                n.type === "direct_message");

            return (
              <article
                className={`notif-card ${n.read ? "is-read" : "is-unread"} accent-${meta.accent}`}
                key={n.id}
              >
                <div className="notif-card-icon" aria-hidden>
                  {meta.icon}
                </div>
                <div className="notif-card-body">
                  <div className="notif-card-meta">
                    <span className="notif-card-kind">{meta.label}</span>
                    <span className="notif-time">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="notif-card-message">{n.message}</p>
                  {n.company_name && <div className="notif-card-company">{n.company_name}</div>}

                  {!isActionable ? (
                    !n.read && (
                      <div className="notif-item-actions">
                        <button className="secondary" onClick={() => handleDismiss(n)}>
                          O'qildi
                        </button>
                      </div>
                    )
                  ) : n.type === "join_request" || n.type === "channel_invite" || n.type === "direct_chat_invite" ? (
                    <div className="notif-item-actions">
                      <button className="notif-btn-primary" onClick={() => handleAccept(n.id)}>
                        Qabul qilish
                      </button>
                      <button className="secondary" onClick={() => handleReject(n.id)}>
                        Rad qilish
                      </button>
                    </div>
                  ) : n.type === "invite" ? (
                    <div className="notif-item-actions">
                      <button className="notif-btn-primary" onClick={() => handleAcceptInvite(n)}>
                        A'zo bo'lish
                      </button>
                      <button className="secondary" onClick={() => handleDismiss(n)}>
                        Rad qilish
                      </button>
                    </div>
                  ) : n.type === "partner_call" ? (
                    <div className="notif-item-actions">
                      <button className="notif-btn-join" onClick={() => handleJoinPartnerCall(n)}>
                        Qo'shilish
                      </button>
                      <button className="secondary" onClick={() => handleDismiss(n)}>
                        Yopish
                      </button>
                    </div>
                  ) : n.type === "group_call_started" ? (
                    <div className="notif-item-actions">
                      <button className="notif-btn-join" onClick={() => handleJoinGroupCall(n)}>
                        Qo'shilish
                      </button>
                      <button className="secondary" onClick={() => handleDismiss(n)}>
                        Yopish
                      </button>
                    </div>
                  ) : n.type === "group_call_ended" ? (
                    <div className="notif-item-actions">
                      <button className="secondary" onClick={() => handleDismiss(n)}>
                        Tushundim
                      </button>
                    </div>
                  ) : n.type === "scheduled_meeting" ? (
                    <div className="notif-item-actions">
                      <button className="notif-btn-primary" onClick={() => handleJoinScheduledMeeting(n)}>
                        Uchrashuvga kirish
                      </button>
                      <button className="secondary" onClick={() => handleDismiss(n)}>
                        Yopish
                      </button>
                    </div>
                  ) : n.type === "scheduled_meeting_booked" ? (
                    <div className="notif-item-actions">
                      <button className="notif-btn-primary" onClick={() => handleOpenMeetingsHub(n)}>
                        Countdown ko‘rish
                      </button>
                      <button className="secondary" onClick={() => handleDismiss(n)}>
                        Yopish
                      </button>
                    </div>
                  ) : n.type === "task_assigned" || n.type === "task_update" ? (
                    <div className="notif-item-actions">
                      <button
                        className="notif-btn-primary"
                        onClick={() => {
                          handleDismiss(n);
                          setOpen(false);
                          navigate("/tasks");
                        }}
                      >
                        Ko'rish
                      </button>
                      <button className="secondary" onClick={() => handleDismiss(n)}>
                        Yopish
                      </button>
                    </div>
                  ) : (
                    <div className="notif-item-actions">
                      <button
                        className="notif-btn-primary"
                        onClick={() => {
                          handleDismiss(n);
                          setOpen(false);
                          navigate("/direct-chat");
                        }}
                      >
                        Ko'rish
                      </button>
                      <button className="secondary" onClick={() => handleDismiss(n)}>
                        Yopish
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
