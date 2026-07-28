import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { wsUrl, api } from "../api/client";
import { useActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";

// MVP: 1-to-1 only. STUN/TURN comes from the coturn instance in docker-compose.yml.
const ICE_HOST = window.location.hostname;
const ICE_SERVERS = [
  { urls: `stun:${ICE_HOST}:3478` },
  {
    urls: `turn:${ICE_HOST}:3478`,
    username: "bgalaxy",
    credential: "bgalaxy",
  },
];

export default function Meeting() {
  const params = useParams();
  const navigate = useNavigate();
  const { company: activeCompany } = useActiveCompany();
  const callId = params.callId || (activeCompany ? `${activeCompany.id}-call` : null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const pollRef = useRef(null);

  const [joined, setJoined] = useState(false);
  const [connected, setConnected] = useState(false);
  const [selfName, setSelfName] = useState("Siz");
  const [selfUserId, setSelfUserId] = useState(null);
  const [peerName, setPeerName] = useState(null);
  const [peerUserId, setPeerUserId] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [endedByPeer, setEndedByPeer] = useState(false);
  const [duplicateConnection, setDuplicateConnection] = useState(false);
  const [kicked, setKicked] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [members, setMembers] = useState([]);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [videoLocked, setVideoLocked] = useState(false);
  const [micLocked, setMicLocked] = useState(false);
  const [callAlreadyActive, setCallAlreadyActive] = useState(false);
  const [callCreatorName, setCallCreatorName] = useState(null);
  const [joinRequestStatus, setJoinRequestStatus] = useState(null); // null | pending | denied
  const [pendingApprovals, setPendingApprovals] = useState([]);

  useEffect(() => {
    if (!activeCompany) return;
    api
      .getMembers(activeCompany.id)
      .then(setMembers)
      .catch(() => {});
  }, [activeCompany?.id]);

  // Poll call status while sitting in the lobby, so we know whether to offer
  // "start a new meeting" or "request to join the one in progress".
  useEffect(() => {
    if (!callId || joined) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await api.getCallStatus(activeCompany?.id || "");
        if (!cancelled) {
          setCallAlreadyActive(res.active);
          setCallCreatorName(res.creator_name);
        }
      } catch {
        // ignore
      }
    }
    poll();
    const interval = setInterval(poll, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [callId, joined, activeCompany?.id]);

  async function joinCall() {
    setMediaError(null);
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (err) {
      setMediaError("Kamera/mikrofonga ruxsat berilmadi: " + err.message);
      return;
    }
    setJoined(true);
  }

  async function requestToJoin() {
    setMediaError(null);
    try {
      const res = await api.requestJoin(callId);
      setJoinRequestStatus("pending");
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await api.getJoinRequestStatus(callId, res.request_id);
          if (statusRes.status === "approved") {
            clearInterval(pollRef.current);
            setJoinRequestStatus(null);
            joinCall();
          } else if (statusRes.status === "denied") {
            clearInterval(pollRef.current);
            setJoinRequestStatus("denied");
          }
        } catch {
          // ignore transient errors, keep polling
        }
      }, 2000);
    } catch (err) {
      setMediaError(err.message);
    }
  }

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  // Runs after `joined` flips true, once the video elements have actually
  // rendered — attaching the stream any earlier hits a null ref.
  useEffect(() => {
    if (!joined || !localStreamRef.current) return;
    const localStream = localStreamRef.current;
    localVideoRef.current.srcObject = localStream;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
      setConnected(true);
    };

    const socket = new WebSocket(wsUrl(`/ws/call/${callId}`));
    socketRef.current = socket;

    socket.onclose = (event) => {
      if (event.code === 4408) {
        setDuplicateConnection(true);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.send(JSON.stringify({ type: "ice-candidate", payload: event.candidate }));
      }
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "role") {
        setSelfName(data.self_name || "Siz");
        setSelfUserId(data.self_user_id);
        setIsOwner(data.owner);
        if (data.peer_name) setPeerName(data.peer_name);
        if (data.peer_user_id) setPeerUserId(data.peer_user_id);
        if (data.initiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.send(JSON.stringify({ type: "offer", payload: offer }));
        }
      } else if (data.type === "peer-joined") {
        setPeerName(data.name);
        setPeerUserId(data.user_id);
      } else if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.send(JSON.stringify({ type: "answer", payload: answer }));
      } else if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.payload));
      } else if (data.type === "ice-candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(data.payload));
      } else if (data.type === "peer-left") {
        setConnected(false);
        setPeerName(null);
        setPeerUserId(null);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      } else if (data.type === "call-ended") {
        setEndedByPeer(true);
        pcRef.current?.close();
        socketRef.current?.close();
      } else if (data.type === "join-request") {
        setPendingApprovals((prev) =>
          prev.some((r) => r.request_id === data.request_id) ? prev : [...prev, data]
        );
      } else if (data.type === "host-control") {
        const stream = localStreamRef.current;
        if (data.action === "mute-audio") {
          const track = stream?.getAudioTracks()[0];
          if (track) track.enabled = false;
          setMicOn(false);
          setMicLocked(true);
        } else if (data.action === "allow-audio") {
          setMicLocked(false);
        } else if (data.action === "disable-video") {
          const track = stream?.getVideoTracks()[0];
          if (track) track.enabled = false;
          setCameraOn(false);
          setVideoLocked(true);
        } else if (data.action === "allow-video") {
          setVideoLocked(false);
        } else if (data.action === "kick") {
          setKicked(true);
          pcRef.current?.close();
          socketRef.current?.close();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  useEffect(() => {
    return () => {
      pcRef.current?.close();
      socketRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function toggleMic() {
    if (micLocked) return;
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    }
  }

  function toggleCamera() {
    if (videoLocked) return;
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraOn(track.enabled);
    }
  }

  function sendHostControl(action) {
    if (!peerUserId) return;
    socketRef.current?.send(
      JSON.stringify({ type: "host-control", action, target_user_id: peerUserId })
    );
  }

  async function respondToRequest(request, approved) {
    try {
      await api.respondJoinRequest(callId, request.request_id, approved);
    } catch {
      // ignore — the requester's poll will simply keep waiting/time out
    }
    setPendingApprovals((prev) => prev.filter((r) => r.request_id !== request.request_id));
  }

  function cleanupAndLeave() {
    pcRef.current?.close();
    socketRef.current?.close();
    navigate("/dashboard");
  }

  function confirmJustLeave() {
    setShowLeaveDialog(false);
    cleanupAndLeave();
  }

  function confirmEndForAll() {
    socketRef.current?.send(JSON.stringify({ type: "end-call" }));
    setShowLeaveDialog(false);
    cleanupAndLeave();
  }

  if (!callId) {
    return (
      <AppShell>
        <div className="empty-card">
          <p>Uchrashuv boshlash uchun avval kompaniya yarating.</p>
          <button onClick={() => navigate("/companies")}>+ Kompaniya yaratish</button>
        </div>
      </AppShell>
    );
  }

  if (endedByPeer) {
    return (
      <AppShell>
        <div className="empty-card">
          <p>Uchrashuv boshqa ishtirokchi tomonidan yakunlandi.</p>
          <button onClick={() => navigate("/dashboard")}>Bosh sahifaga qaytish</button>
        </div>
      </AppShell>
    );
  }

  if (kicked) {
    return (
      <AppShell>
        <div className="empty-card">
          <p>Siz uchrashuvdan chiqarib yuborildingiz.</p>
          <button onClick={() => navigate("/dashboard")}>Bosh sahifaga qaytish</button>
        </div>
      </AppShell>
    );
  }

  if (duplicateConnection) {
    return (
      <AppShell>
        <div className="empty-card">
          <p>Siz allaqachon boshqa qurilmadan shu uchrashuvga ulangansiz. Bitta hisob bir vaqtda faqat bitta qurilmadan uchrashuvda bo'la oladi.</p>
          <button onClick={() => navigate("/dashboard")}>Bosh sahifaga qaytish</button>
        </div>
      </AppShell>
    );
  }

  if (!joined) {
    return (
      <AppShell>
        <div className="page-header">
          <h1>Uchrashuv</h1>
          <p>1-1 video qo'ng'iroq — WebRTC orqali.</p>
        </div>
        <div className="meeting-layout">
          <div className="empty-card">
            {joinRequestStatus === "pending" ? (
              <p>So'rov yuborildi — yaratuvchi ruxsat berishini kutmoqdamiz...</p>
            ) : joinRequestStatus === "denied" ? (
              <>
                <p>Yaratuvchi so'rovingizni rad etdi.</p>
                <button className="secondary" onClick={() => setJoinRequestStatus(null)}>
                  Ortga
                </button>
              </>
            ) : (
              <>
                <p>
                  {callAlreadyActive
                    ? `${activeCompany?.name || "Kompaniya"}da uchrashuv allaqachon ketmoqda${
                        callCreatorName ? ` — Yaratuvchi: ${callCreatorName}` : ""
                      }.`
                    : `${activeCompany?.name ? `${activeCompany.name} uchun yangi` : "Yangi"} uchrashuv boshlaymizmi?`}
                </p>
                {mediaError && <p className="error">{mediaError}</p>}
                <button onClick={callAlreadyActive ? requestToJoin : joinCall}>
                  {callAlreadyActive ? "Qo'shilish so'rovini yuborish" : "Yangi uchrashuv boshlash"}
                </button>
              </>
            )}
          </div>
          {members.length > 0 && (
            <div className="roster">
              <h3>Kompaniya a'zolari</h3>
              {members.map((m) => (
                <div className="roster-item" key={m.user_id}>
                  <span className="roster-dot" />
                  {m.full_name}
                </div>
              ))}
            </div>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1>Uchrashuv</h1>
        <p>1-1 video qo'ng'iroq — WebRTC orqali.</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span className={`status-pill ${connected ? "connected" : ""}`} style={{ marginBottom: 0 }}>
          {connected ? "● Ulandi" : "○ Kutilmoqda..."}
        </span>
      </div>

      {isOwner &&
        pendingApprovals.map((req) => (
          <div className="card" key={req.request_id} style={{ marginBottom: 12, maxWidth: 420 }}>
            <p style={{ margin: "0 0 10px", fontSize: 14 }}>
              <strong>{req.name}</strong> uchrashuvga qo'shilishni so'ramoqda.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ width: "auto", padding: "8px 16px" }} onClick={() => respondToRequest(req, true)}>
                Ruxsat berish
              </button>
              <button
                className="secondary"
                style={{ width: "auto", padding: "8px 16px" }}
                onClick={() => respondToRequest(req, false)}
              >
                Rad etish
              </button>
            </div>
          </div>
        ))}

      <div className="meeting-layout">
        <div>
          <div className="video-grid">
            <div className="video-tile">
              <video ref={localVideoRef} autoPlay muted playsInline style={{ opacity: cameraOn ? 1 : 0 }} />
              {!cameraOn && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--panel-2)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  <div className="avatar-circle" style={{ width: 64, height: 64, fontSize: 22 }}>
                    {selfName.slice(0, 2).toUpperCase()}
                  </div>
                </div>
              )}
              {!micOn && <span className="mute-badge">🔇</span>}
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>
                {selfName} (siz) — {cameraOn ? "video" : "faqat audio"}
                {videoLocked && " 🔒"}
              </div>
            </div>
            <div className="video-tile">
              <video ref={remoteVideoRef} autoPlay playsInline />
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6 }}>
                {peerName || "Kutilmoqda..."}
              </div>
              {isOwner && peerName && (
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button
                    className="secondary"
                    style={{ width: "auto", padding: "4px 8px", fontSize: 11 }}
                    onClick={() => sendHostControl("mute-audio")}
                  >
                    🔇 Ovozini yopish
                  </button>
                  <button
                    className="secondary"
                    style={{ width: "auto", padding: "4px 8px", fontSize: 11 }}
                    onClick={() => sendHostControl("allow-audio")}
                  >
                    🔊 Ovozga ruxsat
                  </button>
                  <button
                    className="secondary"
                    style={{ width: "auto", padding: "4px 8px", fontSize: 11 }}
                    onClick={() => sendHostControl("disable-video")}
                  >
                    🚫🎥 Videosini yopish
                  </button>
                  <button
                    className="secondary"
                    style={{ width: "auto", padding: "4px 8px", fontSize: 11 }}
                    onClick={() => sendHostControl("allow-video")}
                  >
                    🔓 Videoga ruxsat
                  </button>
                  <button
                    className="secondary"
                    style={{ width: "auto", padding: "4px 8px", fontSize: 11, color: "#f87171" }}
                    onClick={() => sendHostControl("kick")}
                  >
                    ⛔ Chiqarish
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="control-bar">
            <button
              className={`control-btn ${micOn ? "" : "off"}`}
              onClick={toggleMic}
              disabled={micLocked}
              title={
                micLocked
                  ? "Ovozingiz yaratuvchi tomonidan o'chirilgan"
                  : micOn
                  ? "Mikrofonni o'chirish"
                  : "Mikrofonni yoqish"
              }
            >
              {micLocked ? "🔒" : micOn ? "🎙️" : "🔇"}
            </button>
            <button
              className={`control-btn ${cameraOn ? "" : "off"}`}
              onClick={toggleCamera}
              disabled={videoLocked}
              title={
                videoLocked
                  ? "Video yaratuvchi tomonidan bloklangan"
                  : cameraOn
                  ? "Kamerani o'chirish (faqat audio)"
                  : "Kamerani yoqish"
              }
            >
              {videoLocked ? "🔒" : cameraOn ? "🎥" : "🚫"}
            </button>
            <button className="control-btn hangup" onClick={() => setShowLeaveDialog(true)} title="Suhbatni tugatish">
              📞
            </button>
          </div>
        </div>

        {members.length > 0 && (
          <div className="roster">
            <h3>Kompaniya a'zolari</h3>
            {members.map((m) => {
              const inCall = m.full_name === selfName || m.full_name === peerName;
              return (
                <div className="roster-item" key={m.user_id}>
                  <span className={`roster-dot ${inCall ? "in-call" : ""}`} />
                  {m.full_name}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showLeaveDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div className="card" style={{ maxWidth: 360, textAlign: "center" }}>
            {isOwner ? (
              <>
                <p style={{ marginTop: 0 }}>Chiqib ketmoqchimisiz yoki uchrashuvni barcha uchun yakunlamoqchimisiz?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={confirmJustLeave}>Faqat chiqib ketish</button>
                  <button className="secondary" onClick={confirmEndForAll}>
                    Barcha uchun yakunlash
                  </button>
                  <button className="secondary" onClick={() => setShowLeaveDialog(false)}>
                    Bekor qilish
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ marginTop: 0 }}>Uchrashuvdan chiqmoqchimisiz?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button onClick={confirmJustLeave}>Ha, chiqish</button>
                  <button className="secondary" onClick={() => setShowLeaveDialog(false)}>
                    Bekor qilish
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
