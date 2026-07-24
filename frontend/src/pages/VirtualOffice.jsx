import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Room, RoomEvent } from "livekit-client";
import { api, wsUrl } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";
import OfficeScene3D from "../components/OfficeScene3D";
import OfficeCommsPanel from "../components/OfficeCommsPanel";

export default function VirtualOffice() {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [zoom, setZoom] = useState(5);
  const [voiceStatus, setVoiceStatus] = useState("connecting"); // connecting | connected | off | error
  const [micOn, setMicOn] = useState(true);
  const [showComms, setShowComms] = useState(false);
  const [paused, setPaused] = useState(false);
  const [incomingPrompt, setIncomingPrompt] = useState(null); // {roomName, callerId, callerName} while ringing
  const [acceptedCall, setAcceptedCall] = useState(null); // handed to the panel once accepted
  const [callSignal, setCallSignal] = useState(null); // relayed to the panel: cancel/reject events
  const [officeUnread, setOfficeUnread] = useState(0);
  const [hasActiveCall, setHasActiveCall] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);
  const [keybinds, setKeybinds] = useState(() => {
    try {
      return { pause: "q", phone: "e", fullscreen: "Enter", ...JSON.parse(localStorage.getItem("bgalaxy_office_keybinds") || "{}") };
    } catch {
      return { pause: "q", phone: "e", fullscreen: "Enter" };
    }
  });

  function updateKeybind(action, key) {
    setKeybinds((prev) => {
      const next = { ...prev, [action]: key };
      localStorage.setItem("bgalaxy_office_keybinds", JSON.stringify(next));
      return next;
    });
  }
  const wrapRef = useRef(null);
  const roomRef = useRef(null);
  const audioContainerRef = useRef(null);
  const ringtoneRef = useRef(null);

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => setCompany(pickActiveCompany(list)))
      .catch(() => {});
  }, []);

  // Shared, always-on voice room for everyone currently in the office —
  // audio only, no video tiles, no dedicated call UI.
  useEffect(() => {
    if (!company) return;
    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "audio") {
        const el = track.attach();
        el.autoplay = true;
        audioContainerRef.current?.appendChild(el);
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
    });
    room.on(RoomEvent.Disconnected, () => {
      if (!cancelled) setVoiceStatus("off");
    });

    (async () => {
      try {
        const { token, url } = await api.getOfficeVoiceToken(company.id);
        if (cancelled) return;
        await room.connect(url, token);
        await room.localParticipant.setMicrophoneEnabled(true);
        if (!cancelled) setVoiceStatus("connected");
      } catch {
        if (!cancelled) setVoiceStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      room.disconnect();
      if (audioContainerRef.current) audioContainerRef.current.innerHTML = "";
    };
  }, [company]);

  function startRingtone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      };
      playBeep();
      const interval = setInterval(playBeep, 1000);
      ringtoneRef.current = { ctx, interval };
    } catch {
      // ignore — audio not available
    }
  }

  function stopRingtone() {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current.interval);
      ringtoneRef.current.ctx.close();
      ringtoneRef.current = null;
    }
  }

  // Real-time call signaling — reuses the notification WebSocket but these
  // message types are live-only (never stored, never shown in the 🔔 bell).
  useEffect(() => {
    if (!company) return;
    const socket = new WebSocket(wsUrl("/ws/notifications"));
    socket.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === "incoming_office_call") {
        setIncomingPrompt({ roomName: data.room_name, callerId: data.caller_id, callerName: data.caller_name || "Kimdir" });
        startRingtone();
      } else if (data.type === "office_call_cancelled" || data.type === "office_call_rejected") {
        setIncomingPrompt((prev) => {
          if (prev && prev.roomName === data.room_name) {
            stopRingtone();
            return null;
          }
          return prev;
        });
        setCallSignal({ ...data, ts: Date.now() });
      }
    };
    return () => socket.close();
  }, [company]);

  function handleRightClick(e) {
    e.preventDefault();
    setShowComms((v) => {
      const next = !v;
      if (next) setPaused(true);
      return next;
    });
  }

  function toggleMic() {
    const room = roomRef.current;
    if (!room) return;
    const next = !micOn;
    room.localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  }

  // The office voice chat holds the microphone open the whole time this
  // page is mounted. Recording a voice/video message needs exclusive
  // access to the same hardware, so we release it here first and put it
  // back exactly how the user had it once recording is done.
  function pauseOfficeMicForRecording() {
    roomRef.current?.localParticipant.setMicrophoneEnabled(false);
  }

  function resumeOfficeMicAfterRecording() {
    if (micOn) roomRef.current?.localParticipant.setMicrophoneEnabled(true);
  }

  function enterFullscreen() {
    wrapRef.current?.requestFullscreen?.();
  }

  useEffect(() => {
    function handleFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) setPaused(false);
    }
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  function zoomIn() {
    setZoom((z) => Math.max(2, z - 1));
  }

  function zoomOut() {
    setZoom((z) => Math.min(12, z + 1));
  }

  // Keyboard shortcuts:
  //   M — mic on/off · +/- — zoom · Enter — fullscreen
  //   Q — pause (frees the mouse, voice call keeps running)
  //   E — open/close the Telefon bo'limi (forces pause on open)
  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
        setHintVisible(false);
      }

      if (e.key === "m" || e.key === "M") {
        toggleMic();
      } else if (e.key === "+" || e.key === "=") {
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        zoomOut();
      } else if (key === keybinds.fullscreen.toLowerCase() || e.key === keybinds.fullscreen) {
        enterFullscreen();
      } else if (key === keybinds.pause.toLowerCase()) {
        setPaused((prev) => !prev);
      } else if (key === keybinds.phone.toLowerCase()) {
        setShowComms((prev) => {
          const next = !prev;
          if (next) setPaused(true);
          return next;
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [micOn, keybinds]);

  function handleAcceptIncoming() {
    if (!incomingPrompt) return;
    stopRingtone();
    setAcceptedCall(incomingPrompt);
    setIncomingPrompt(null);
    setShowComms(true);
    setPaused(true);
  }

  async function handleRejectIncoming() {
    if (!incomingPrompt || !company) return;
    stopRingtone();
    try {
      await api.rejectOfficeCall(company.id, incomingPrompt.roomName, incomingPrompt.callerId);
    } catch {
      // ignore
    }
    setIncomingPrompt(null);
  }

  if (!company) {
    return (
      <AppShell>
        <div className="page-header">
          <h1>Virtual Ofis</h1>
        </div>
        <div className="empty-card">
          <p>Virtual ofisni ko'rish uchun avval kompaniya yarating.</p>
          <button onClick={() => navigate("/companies")}>+ Kompaniya yaratish</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1>Virtual Ofis — {company.name}</h1>
        <p>
          3D xonada yuring — jamoangizning boshqa a'zolari ham shu paytda xonada bo'lsa, real-vaqtda ko'rinadi va bir-biringizni eshitasiz.
        </p>
      </div>

      <div ref={audioContainerRef} style={{ display: "none" }} />

      <div className="office-3d-wrap" ref={wrapRef} onContextMenu={handleRightClick}>
        <OfficeScene3D zoom={zoom} companyId={company.id} paused={paused} />
        <div className="office-3d-controls">
          <button
            onClick={toggleMic}
            title={micOn ? "Mikrofonni o'chirish" : "Mikrofonni yoqish"}
            style={voiceStatus !== "connected" ? { opacity: 0.5 } : undefined}
          >
            {micOn ? "🎤" : "🔇"}
          </button>
          <button onClick={zoomIn} title="Yaqinlashtirish">➕</button>
          <button onClick={zoomOut} title="Uzoqlashtirish">➖</button>
          <button onClick={enterFullscreen} title="To'liq ekran (Enter)" style={{ display: isFullscreen ? "none" : undefined }}>⛶</button>
          <button onClick={() => setPaused((p) => !p)} title={`Pauza (${keybinds.pause.toUpperCase()})`}>
            {paused ? "▶️" : "⏸️"}
          </button>
          <button
            onClick={() =>
              setShowComms((v) => {
                const next = !v;
                if (next) setPaused(true);
                return next;
              })
            }
            title="Telefon bo'limi (E)"
            style={{ position: "relative" }}
          >
            📱
            {officeUnread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: "#f87171",
                  color: "white",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  fontSize: 9.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {officeUnread}
              </span>
            )}
            {hasActiveCall && (
              <span style={{ position: "absolute", bottom: -2, right: -2, width: 9, height: 9, borderRadius: "50%", background: "var(--green)" }} />
            )}
          </button>
        </div>
        {hintVisible && (
          <div className="office-3d-hint">
            🖱️ Sichqoncha bilan qarang · ⌨️ WASD — yurish · M — mikrofon · +/− kattalashtirish · {keybinds.fullscreen} — to'liq ekran · {keybinds.pause.toUpperCase()} — pauza · {keybinds.phone.toUpperCase()} — telefon
            {voiceStatus === "connecting" && " · 🎙️ Ovozli chatga ulanmoqda..."}
            {voiceStatus === "error" && " · ⚠️ Ovozli chat sozlanmagan"}
          </div>
        )}

        {!isFullscreen && (
          <div
            onClick={enterFullscreen}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(5, 7, 12, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 20,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "white",
                background: "var(--gradient)",
                padding: "18px 36px",
                borderRadius: 16,
              }}
            >
              ⏎ Enter tugmasini bosing
            </div>
          </div>
        )}

        {isFullscreen && paused && (
          <div
            style={{
              position: "absolute",
              top: 24,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: 4,
              color: "white",
              background: "rgba(0,0,0,0.5)",
              padding: "8px 28px",
              borderRadius: 999,
              zIndex: 20,
              pointerEvents: "none",
            }}
          >
            ⏸ PAUSE
          </div>
        )}

        <OfficeCommsPanel
          companyId={company.id}
          open={showComms}
          onOpenChange={setShowComms}
          incomingCall={acceptedCall}
          onIncomingHandled={() => setAcceptedCall(null)}
          onUnreadChange={setOfficeUnread}
          onCallStateChange={setHasActiveCall}
          keybinds={keybinds}
          onKeybindChange={updateKeybind}
          callSignal={callSignal}
          onBeforeRecording={pauseOfficeMicForRecording}
          onAfterRecording={resumeOfficeMicAfterRecording}
        />

        {incomingPrompt && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90 }}>
            <div className="card" style={{ maxWidth: 320, textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>📞</div>
              <p style={{ fontSize: 14, marginBottom: 18 }}><strong>{incomingPrompt.callerName}</strong> qo'ng'iroq qilmoqda...</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={handleAcceptIncoming}>✅ Qabul qilish</button>
                <button className="secondary" style={{ color: "#f87171" }} onClick={handleRejectIncoming}>❌ Rad etish</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
