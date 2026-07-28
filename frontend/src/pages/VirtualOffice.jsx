import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Room, RoomEvent } from "livekit-client";
import { api, wsUrl } from "../api/client";
import { useActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";
import OfficeScene3D from "../components/OfficeScene3D";
import OfficeCommsPanel from "../components/OfficeCommsPanel";

export default function VirtualOffice() {
  const navigate = useNavigate();
  const { company, loading: companyLoading } = useActiveCompany();
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
  const [immersive, setImmersive] = useState(true);
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

  // company comes from useActiveCompany — no separate fetch

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
    setImmersive(true);
    const el = wrapRef.current;
    if (el?.requestFullscreen) {
      el.requestFullscreen().catch(() => {
        // Browser may block FS without gesture — CSS immersive still covers viewport.
      });
    }
  }

  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setImmersive(false);
    setPaused(false);
  }

  useEffect(() => {
    function handleFsChange() {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        // ESC (or browser exit) shrinks the office automatically.
        setImmersive(false);
        setPaused(false);
      }
    }
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Keep browser fullscreen in sync while immersive; allow ESC to shrink.
  useEffect(() => {
    if (!company || !immersive) return undefined;
    function onKeyDown(e) {
      if (e.key !== "Escape") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      exitFullscreen();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [company, immersive]);

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


  const officeHeading = (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">3D Metaverse</p>
      <h1>Virtual Ofis{company ? ` — ${company.name}` : ""}</h1>
      <p>
        {companyLoading
          ? "Yuklanmoqda..."
          : company
            ? "3D xonada yuring — jamoa a’zolari real vaqtda ko‘rinadi va eshitiladi."
            : "Avval kompaniya yarating — keyin virtual ofisingiz ochiladi."}
      </p>
    </div>
  );

  if (companyLoading) {
    return (
      <AppShell topLeft={officeHeading}>
        <div className="office-page">
          <div className="empty-card office-empty">
            <p>Virtual ofis yuklanmoqda...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell topLeft={officeHeading}>
        <div className="office-page">
          <div className="empty-card office-empty">
            <p>Virtual ofisni ko‘rish uchun avval kompaniya yarating.</p>
            <button className="office-cta" onClick={() => navigate("/companies")}>
              + Kompaniya yaratish
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const officeScene = (
    <div className={`office-3d-wrap office-3d-wrap-galaxy ${immersive ? "is-immersive" : ""}`} ref={wrapRef} onContextMenu={handleRightClick}>
      <OfficeScene3D zoom={zoom} companyId={company.id} paused={paused || !immersive} />
      <div className="office-3d-controls">
        <button
          onClick={toggleMic}
          title={micOn ? "Mikrofonni o'chirish" : "Mikrofonni yoqish"}
          className={voiceStatus !== "connected" ? "is-dim" : undefined}
        >
          {micOn ? "🎤" : "🔇"}
        </button>
        <button onClick={zoomIn} title="Yaqinlashtirish">➕</button>
        <button onClick={zoomOut} title="Uzoqlashtirish">➖</button>
        {immersive ? (
          <button onClick={exitFullscreen} title="Kichraytirish (Esc)">⛶</button>
        ) : (
          <button onClick={enterFullscreen} title="To'liq ekran (Enter)">⛶</button>
        )}
        <button onClick={() => setPaused((p) => !p)} title={`Pauza (${keybinds.pause.toUpperCase()})`}>
          {paused ? "▶️" : "⏸️"}
        </button>
        <button
          className="office-phone-btn"
          onClick={() =>
            setShowComms((v) => {
              const next = !v;
              if (next) setPaused(true);
              return next;
            })
          }
          title="Telefon bo'limi (E)"
        >
          📱
          {officeUnread > 0 && <span className="office-unread-badge">{officeUnread}</span>}
          {hasActiveCall && <span className="office-call-dot" />}
        </button>
      </div>

      {hintVisible && immersive && (
        <div className="office-3d-hint">
          🖱️ Sichqoncha · WASD — yurish · M — mikrofon · Esc — kichraytirish ·{" "}
          {keybinds.pause.toUpperCase()} — pauza · {keybinds.phone.toUpperCase()} — telefon
          {voiceStatus === "connecting" && " · 🎙️ Ulanmoqda..."}
          {voiceStatus === "error" && " · ⚠️ Ovoz sozlanmagan"}
        </div>
      )}

      {immersive && paused && <div className="office-pause-badge">⏸ PAUSE</div>}

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
        <div className="office-incoming-backdrop">
          <div className="card office-incoming-card">
            <div className="office-incoming-icon">📞</div>
            <p>
              <strong>{incomingPrompt.callerName}</strong> qo‘ng‘iroq qilmoqda...
            </p>
            <div className="office-incoming-actions">
              <button onClick={handleAcceptIncoming}>✅ Qabul qilish</button>
              <button className="secondary office-reject-btn" onClick={handleRejectIncoming}>
                ❌ Rad etish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (immersive) {
    return (
      <AppShell immersive>
        <div ref={audioContainerRef} className="office-audio-sink" />
        <div className="office-immersive-top">
          <div>
            <strong>{company.name}</strong>
            <span>Virtual Ofis · Esc — chiqish</span>
          </div>
          <span className={`office-voice-pill is-${voiceStatus}`}>
            {voiceStatus === "connected" && "🎙️ Ulangan"}
            {voiceStatus === "connecting" && "🎙️ Ulanmoqda..."}
            {voiceStatus === "error" && "⚠️ Sozlanmagan"}
            {voiceStatus === "off" && "🔇 O‘chiq"}
          </span>
        </div>
        {officeScene}
      </AppShell>
    );
  }

  return (
    <AppShell topLeft={officeHeading}>
      <div className="office-page">
        <div className="office-status-row">
          <span className={`office-voice-pill is-${voiceStatus}`}>
            {voiceStatus === "connected" && "🎙️ Ovozli chat ulangan"}
            {voiceStatus === "connecting" && "🎙️ Ulanmoqda..."}
            {voiceStatus === "error" && "⚠️ Ovozli chat sozlanmagan"}
            {voiceStatus === "off" && "🔇 Ovoz o‘chiq"}
          </span>
          <span className="office-status-hint">Ofis kichraytirilgan — Enter yoki tugma bilan to‘liq ekranga qayting</span>
        </div>

        <div ref={audioContainerRef} className="office-audio-sink" />

        <div className="office-shrunk-wrap">
          {officeScene}
          <button type="button" className="office-enter-gate" onClick={enterFullscreen}>
            <span className="office-enter-card">⛶ To‘liq ekranga qaytish (Enter)</span>
          </button>
        </div>
      </div>
    </AppShell>
  );
}
