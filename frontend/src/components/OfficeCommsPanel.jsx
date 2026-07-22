import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { api } from "../api/client";
import UserSearchInput from "./UserSearchInput";

const SECTIONS = ["messages", "send", "call", "settings"];
const SEEN_KEY = "bgalaxy_office_messages_seen_at";
const ACTION_LABELS = { pause: "Pauza", phone: "Telefon bo'limi", fullscreen: "To'liq ekran" };

function SettingsSection({ keybinds, onKeybindChange }) {
  const [listeningFor, setListeningFor] = useState(null);

  useEffect(() => {
    if (!listeningFor) return;
    function handler(e) {
      e.preventDefault();
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      onKeybindChange(listeningFor, key);
      setListeningFor(null);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [listeningFor]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <p style={{ fontSize: 11.5, color: "var(--text-dim)", margin: "0 0 12px" }}>
        Har bir amal uchun klaviaturadagi tugmani o'zingiz belgilang.
      </p>
      {Object.entries(ACTION_LABELS).map(([action, label]) => (
        <div key={action} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12.5 }}>{label}</span>
          <button
            className="secondary"
            style={{ width: "auto", padding: "5px 12px", fontSize: 11, minWidth: 70 }}
            onClick={() => setListeningFor(action)}
          >
            {listeningFor === action ? "Kuting..." : keybinds[action]}
          </button>
        </div>
      ))}

      <p style={{ fontSize: 12.5, fontWeight: 700, margin: "20px 0 10px" }}>ℹ️ Umumiy haqida (hujjat)</p>
      <div style={{ fontSize: 11.5, color: "var(--text-dim)", lineHeight: 1.9 }}>
        <div><strong style={{ color: "var(--text)" }}>{keybinds.pause.toUpperCase()}</strong> — Pauza (sichqonchani ozod qilish, ovoz uzilmaydi)</div>
        <div><strong style={{ color: "var(--text)" }}>{keybinds.phone.toUpperCase()}</strong> — Telefon bo'limini ochish/yopish</div>
        <div><strong style={{ color: "var(--text)" }}>{keybinds.fullscreen}</strong> — To'liq ekranga o'tish</div>
        <div><strong style={{ color: "var(--text)" }}>M</strong> — Mikrofonni yoqish/o'chirish</div>
        <div><strong style={{ color: "var(--text)" }}>+ / −</strong> — Kattalashtirish / kichraytirish</div>
        <div><strong style={{ color: "var(--text)" }}>WASD</strong> — Yurish</div>
        <div><strong style={{ color: "var(--text)" }}>ESC</strong> — To'liq ekrandan chiqish</div>
      </div>
    </div>
  );
}

function MessagesSection({ conversations, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!selected) return;
    api.getDirectMessages(selected.id).then(setMessages).catch(() => {});
  }, [selected]);

  async function handleReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !selected) return;
    try {
      await api.sendDirectMessage(selected.id, replyText.trim(), null);
      setReplyText("");
      api.getDirectMessages(selected.id).then(setMessages).catch(() => {});
    } catch {
      // ignore
    }
  }

  async function handleDelete(messageId) {
    if (!selected) return;
    try {
      await api.deleteDirectMessage(selected.id, messageId);
      api.getDirectMessages(selected.id).then(setMessages).catch(() => {});
    } catch {
      // ignore
    }
  }

  if (selected) {
    return (
      <div>
        <button className="secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 11, marginBottom: 10 }} onClick={() => setSelected(null)}>
          ← Ro'yxatga
        </button>
        <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 10 }}>
          {messages.map((m) => (
            <div key={m.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <strong>{m.sender_name}:</strong>
                <button className="secondary" style={{ width: "auto", padding: "1px 6px", fontSize: 9.5 }} onClick={() => handleDelete(m.id)}>✕</button>
              </div>
              {m.file_url ? (
                m.file_name?.match(/^xabar-video|\.(mp4|mov)$/i) ? (
                  <video src={m.file_url} controls style={{ width: "100%", borderRadius: 6, marginTop: 4 }} />
                ) : m.file_name?.match(/^xabar-audio|\.(mp3|wav|ogg)$/i) ? (
                  <audio src={m.file_url} controls style={{ width: "100%", marginTop: 4 }} />
                ) : (
                  <a href={m.file_url} target="_blank" rel="noreferrer">📎 {m.file_name}</a>
                )
              ) : (
                <div>{m.content}</div>
              )}
            </div>
          ))}
          {messages.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: 11.5 }}>Xabar yo'q</p>}
        </div>
        <form onSubmit={handleReply} style={{ display: "flex", gap: 6 }}>
          <input value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Javob yozing..." style={{ flex: 1 }} />
          <button type="submit" style={{ width: "auto", padding: "6px 12px", fontSize: 11 }}>➤</button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <button className="secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 11, marginBottom: 10 }} onClick={onRefresh}>🔄</button>
      {conversations.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: 12 }}>Hali xabar yo'q</p>}
      {conversations.map((c) => (
        <div key={c.id} onClick={() => setSelected(c)} className="office-comms-row" style={{ padding: "8px 6px", borderRadius: 8, cursor: "pointer", fontSize: 12.5 }}>
          <strong>{c.participants.map((p) => p.full_name).join(", ")}</strong>
          {c.last_message && <div style={{ color: "var(--text-dim)", fontSize: 11 }}>{c.last_message}</div>}
        </div>
      ))}
    </div>
  );
}

function SendSection({ mode, setMode }) {
  const [target, setTarget] = useState(null);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function startRecording() {
    setBlob(null);
    setError(null);
    chunksRef.current = [];
    const constraints = mode === "video" ? { audio: true, video: true } : { audio: true };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        setBlob(new Blob(chunksRef.current, { type: mode === "video" ? "video/webm" : "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setError("Mikrofon/kamera ruxsati berilmadi yoki topilmadi: " + (err.message || err.name));
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function handleSend() {
    if (!target) return;
    setSending(true);
    setError(null);
    try {
      const conv = await api.startConversation([target.id], "office");
      let file = null;
      if (mode !== "chat" && blob) {
        file = new File([blob], mode === "video" ? "xabar-video.webm" : "xabar-audio.webm", { type: blob.type });
      }
      await api.sendDirectMessage(conv.id, mode === "chat" ? text : "", file);
      setSent(true);
      setText("");
      setBlob(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (!mode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => setMode("chat")}>💬 Chat</button>
        <button onClick={() => setMode("audio")}>🎙️ Ovoz</button>
        <button onClick={() => setMode("video")}>🎥 Video</button>
      </div>
    );
  }

  return (
    <div>
      <button className="secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 11, marginBottom: 10 }} onClick={() => { setMode(null); setBlob(null); setSent(false); }}>
        ← Orqaga
      </button>

      <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 8px" }}>Kimga:</p>
      {target ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12.5 }}>{target.full_name}</span>
          <button className="secondary" style={{ width: "auto", padding: "2px 8px", fontSize: 10.5 }} onClick={() => setTarget(null)}>✕</button>
        </div>
      ) : (
        <UserSearchInput selected={null} onSelect={setTarget} onClear={() => {}} />
      )}

      {mode === "chat" && <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Xabar matni..." style={{ marginBottom: 10 }} />}

      {mode !== "chat" && (
        <div style={{ marginBottom: 10 }}>
          {!recording && !blob && (
            <button type="button" style={{ width: "auto", padding: "8px 14px", fontSize: 12 }} onClick={startRecording}>⏺️ Yozishni boshlash</button>
          )}
          {recording && (
            <button type="button" style={{ width: "auto", padding: "8px 14px", fontSize: 12, background: "#f87171" }} onClick={stopRecording}>⏹️ To'xtatish</button>
          )}
          {blob && !recording && (
            <div>
              <p style={{ fontSize: 11.5, color: "var(--green)", marginBottom: 6 }}>✓ Tayyor — yuborishdan oldin tinglab/ko'rib oling:</p>
              {mode === "video" ? (
                <video src={URL.createObjectURL(blob)} controls style={{ width: "100%", borderRadius: 8 }} />
              ) : (
                <audio src={URL.createObjectURL(blob)} controls style={{ width: "100%" }} />
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {sent && <p style={{ color: "var(--green)", fontSize: 12 }}>✓ Yuborildi!</p>}
      <button
        disabled={sending || !target || (mode === "chat" ? !text.trim() : !blob)}
        onClick={handleSend}
        style={{ width: "auto", padding: "8px 16px", fontSize: 12 }}
      >
        {sending ? "Yuborilmoqda..." : "Yuborish"}
      </button>
    </div>
  );
}

function CallSection({ companyId, activeCall, onStartCall, onHangup, micOn, toggleMic, camOn, toggleCam }) {
  const [presence, setPresence] = useState([]);
  const [searchTarget, setSearchTarget] = useState(null);
  const [error, setError] = useState(null);
  const [calling, setCalling] = useState(false);

  function refresh() {
    api.getOfficePresence(companyId).then(setPresence).catch(() => {});
  }
  useEffect(refresh, [companyId]);

  async function handleCall(target) {
    setError(null);
    setCalling(true);
    try {
      await onStartCall(target);
    } catch (err) {
      setError(err.message);
    } finally {
      setCalling(false);
    }
  }

  if (activeCall) {
    return (
      <div style={{ textAlign: "center", padding: "6px 0" }}>
        <p style={{ fontSize: 13, marginBottom: 16 }}>📞 {activeCall.withName} bilan aloqada...</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 10 }}>
          <button className="secondary" style={{ width: "auto", padding: "8px 12px" }} onClick={toggleMic}>{micOn ? "🎤" : "🔇"}</button>
          <button className="secondary" style={{ width: "auto", padding: "8px 12px" }} onClick={toggleCam}>{camOn ? "🎥" : "📷"}</button>
          <button style={{ width: "auto", padding: "8px 12px", background: "#f87171" }} onClick={() => onHangup(true)}>📴</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 8px" }}>Istalgan foydalanuvchini qidiring:</p>
      {searchTarget ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, flex: 1 }}>{searchTarget.full_name}</span>
          <button className="secondary" style={{ width: "auto", padding: "2px 8px", fontSize: 10.5 }} onClick={() => setSearchTarget(null)}>✕</button>
          <button
            style={{ width: "auto", padding: "5px 12px", fontSize: 11 }}
            disabled={calling}
            onClick={() => handleCall({ user_id: searchTarget.id, name: searchTarget.full_name })}
          >
            {calling ? "..." : "📞 Qo'ng'iroq"}
          </button>
        </div>
      ) : (
        <UserSearchInput selected={null} onSelect={setSearchTarget} onClear={() => {}} />
      )}

      {error && <p className="error">{error}</p>}

      {presence.length > 0 && (
        <>
          <p style={{ fontSize: 11.5, color: "var(--text-dim)", margin: "14px 0 8px" }}>Hozir xonada:</p>
          {presence.map((p) => (
            <div key={p.user_id} className="office-comms-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 6px" }}>
              <span style={{ fontSize: 12.5 }}>🟢 {p.name}</span>
              <button className="secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 11 }} disabled={calling} onClick={() => handleCall(p)}>Qo'ng'iroq</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function OfficeCommsPanel({ companyId, open, onOpenChange, incomingCall, onIncomingHandled, onUnreadChange, onCallStateChange, keybinds, onKeybindChange, callSignal }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [view, setView] = useState("home");
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [sendMode, setSendMode] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(false);
  const roomRef = useRef(null);

  useEffect(() => {
    onCallStateChange?.(!!activeCall);
  }, [activeCall]); // eslint-disable-line react-hooks/exhaustive-deps

  function refreshConversations() {
    api
      .getConversations()
      .then((all) => {
        const office = all.filter((c) => c.channel === "office");
        setConversations(office);
        const seen = Number(localStorage.getItem(SEEN_KEY) || 0);
        const count = office.filter((c) => c.last_message_at && new Date(c.last_message_at).getTime() > seen).length;
        setUnreadCount(count);
        onUnreadChange?.(count);
      })
      .catch(() => {});
  }

  useEffect(() => {
    refreshConversations();
    const interval = setInterval(refreshConversations, 10000);
    return () => clearInterval(interval);
  }, [companyId]);

  useEffect(() => {
    if (open && view === "messages") {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
      setUnreadCount(0);
      onUnreadChange?.(0);
    }
  }, [open, view]); // eslint-disable-line react-hooks/exhaustive-deps

  async function connectToCall(roomName, token, url, withName, targetUserId) {
    const room = new Room();
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "audio") {
        const el = track.attach();
        document.getElementById("office-call-media")?.appendChild(el);
      } else if (track.kind === "video") {
        const el = track.attach();
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.objectFit = "cover";
        el.style.borderRadius = "12px";
        document.getElementById("office-call-video")?.appendChild(el);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
    });
    // The other participant actually left the LiveKit room (whether via our
    // own cancel/reject signal or just closing their tab) — clean up here
    // too, using the locals captured in this closure rather than React
    // state, since state read inside a listener set up once can go stale.
    room.on(RoomEvent.ParticipantDisconnected, () => {
      room.disconnect();
      roomRef.current = null;
      setActiveCall(null);
      const audioContainer = document.getElementById("office-call-media");
      if (audioContainer) audioContainer.innerHTML = "";
      const videoContainer = document.getElementById("office-call-video");
      if (videoContainer) videoContainer.innerHTML = "";
    });
    await room.connect(url, token);
    await room.localParticipant.setMicrophoneEnabled(true);
    roomRef.current = room;
    setMicOn(true);
    setCamOn(false);
    setActiveCall({ roomName, withName, targetUserId: targetUserId || null });
  }

  async function handleStartCall(target) {
    const res = await api.startOfficeCall(companyId, target.user_id);
    await connectToCall(res.room_name, res.token, res.url, target.name, target.user_id);
  }

  // Handle an incoming call being accepted from outside (NotificationBell → URL params).
  useEffect(() => {
    if (!incomingCall) return;
    (async () => {
      try {
        const res = await api.acceptOfficeCall(companyId, incomingCall.roomName);
        await connectToCall(res.room_name, res.token, res.url, incomingCall.callerName, incomingCall.callerId);
        setSectionIndex(2);
        setView("call");
        onOpenChange(true);
      } catch {
        // ignore
      } finally {
        onIncomingHandled();
      }
    })();
  }, [incomingCall]); // eslint-disable-line react-hooks/exhaustive-deps

  // The other side cancelled (before answering) or rejected our call —
  // drop it here too, no way to still pick it up.
  useEffect(() => {
    if (!callSignal || !activeCall) return;
    if (callSignal.room_name === activeCall.roomName) {
      handleHangup(false);
    }
  }, [callSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleHangup(notifyOther = true) {
    if (notifyOther && activeCall?.targetUserId) {
      api.cancelOfficeCall(companyId, activeCall.roomName, activeCall.targetUserId).catch(() => {});
    }
    roomRef.current?.disconnect();
    roomRef.current = null;
    setActiveCall(null);
    const container = document.getElementById("office-call-media");
    if (container) container.innerHTML = "";
    const videoContainer = document.getElementById("office-call-video");
    if (videoContainer) videoContainer.innerHTML = "";
  }

  function toggleMic() {
    const next = !micOn;
    roomRef.current?.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  function toggleCam() {
    const next = !camOn;
    roomRef.current?.localParticipant.setCameraEnabled(next);
    setCamOn(next);
  }

  const section = SECTIONS[sectionIndex];
  const isHome = view === "home";

  const CARD_META = {
    messages: { icon: "💬", color: "var(--blue)", title: "Xabarlar", desc: "Kelgan xabarlarni ko'ring va javob bering" },
    send: { icon: "📤", color: "var(--purple)", title: "Xabar jo'natish", desc: "Chat, ovoz yoki video xabar yuboring" },
    call: { icon: "📞", color: "var(--green)", title: "Qo'ng'iroq", desc: "Xonadagilarga qo'ng'iroq qiling" },
    settings: { icon: "⚙️", color: "var(--orange)", title: "Sozlamalar", desc: "Klaviatura tugmalarini o'zgartiring" },
  };

  function openSection(key) {
    setSectionIndex(SECTIONS.indexOf(key));
    setView(key);
  }

  return (
    <>
      <div id="office-call-media" style={{ display: "none" }} />
      {open && activeCall && (
        <div
          id="office-call-video"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 120,
            height: 90,
            background: "#000",
            borderRadius: 12,
            overflow: "hidden",
            zIndex: 60,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        />
      )}

      {open && (
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 12,
            width: 320,
            zIndex: 55,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 26,
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ padding: "18px 18px 14px" }}>
            {isHome ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)" }}>👋 Telefon bo'limi</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Kerakli bo'limni tanlang</div>
              </>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  className="secondary"
                  style={{ width: 30, height: 30, padding: 0, borderRadius: "50%" }}
                  onClick={() => setView("home")}
                >
                  ‹
                </button>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {CARD_META[section].icon} {CARD_META[section].title}
                </div>
              </div>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: "0 18px 14px", maxHeight: 340, overflowY: "auto" }}>
            {isHome ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {SECTIONS.map((key) => (
                  <div
                    key={key}
                    onClick={() => openSection(key)}
                    className="office-comms-row"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 14,
                      borderRadius: 16,
                      background: "var(--panel-2)",
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: CARD_META[key].color,
                        opacity: 0.9,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 19,
                        flexShrink: 0,
                      }}
                    >
                      {CARD_META[key].icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{CARD_META[key].title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{CARD_META[key].desc}</div>
                    </div>
                    <span style={{ color: "var(--text-dim)", fontSize: 16 }}>›</span>
                    {key === "messages" && unreadCount > 0 && (
                      <span
                        style={{ position: "absolute", top: 8, right: 26, background: "#f87171", color: "white", borderRadius: "50%", minWidth: 16, height: 16, fontSize: 9.5, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}
                      >
                        {unreadCount}
                      </span>
                    )}
                    {key === "call" && activeCall && (
                      <span style={{ position: "absolute", top: 8, right: 26, width: 9, height: 9, borderRadius: "50%", background: "var(--green)" }} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <>
                {section === "messages" && <MessagesSection conversations={conversations} onRefresh={refreshConversations} />}
                {section === "send" && <SendSection mode={sendMode} setMode={setSendMode} />}
                {section === "call" && (
                  <CallSection
                    companyId={companyId}
                    activeCall={activeCall}
                    onStartCall={handleStartCall}
                    onHangup={handleHangup}
                    micOn={micOn}
                    toggleMic={toggleMic}
                    camOn={camOn}
                    toggleCam={toggleCam}
                  />
                )}
                {section === "settings" && <SettingsSection keybinds={keybinds} onKeybindChange={onKeybindChange} />}
              </>
            )}
          </div>

          {/* Bottom tab bar */}
          <div style={{ display: "flex", borderTop: "1px solid var(--border)", background: "var(--panel-2)" }}>
            {SECTIONS.map((key) => (
              <button
                key={key}
                onClick={() => openSection(key)}
                className="secondary"
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: 0,
                  background: "transparent",
                  padding: "10px 4px",
                  fontSize: 9.5,
                  color: !isHome && section === key ? "var(--blue)" : "var(--text-dim)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{CARD_META[key].icon}</span>
                {CARD_META[key].title}
              </button>
            ))}
            <button
              onClick={() => onOpenChange(false)}
              className="secondary"
              style={{ flex: 1, border: "none", borderRadius: 0, background: "transparent", padding: "10px 4px", fontSize: 9.5, color: "var(--text-dim)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
            >
              <span style={{ fontSize: 16 }}>✕</span>
              Yopish
            </button>
          </div>
        </div>
      )}
    </>
  );
}
