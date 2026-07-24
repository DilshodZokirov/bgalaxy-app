import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { api } from "../api/client";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";

export default function PartnerCall() {
  const { roomName } = useParams();
  const navigate = useNavigate();
  const [connection, setConnection] = useState(null);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addPartners, setAddPartners] = useState([]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addedMsg, setAddedMsg] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    api
      .joinPartnerMeeting(roomName)
      .then(setConnection)
      .catch((err) => setError(err.message));
  }, [roomName]);

  useEffect(() => {
    if (!connection) return;
    function refresh() {
      api
        .getActivePartnerMeetings()
        .then((list) => {
          const mine = list.find((m) => m.room_name === roomName);
          setIsHost(!!mine?.is_host);
          setParticipants(mine?.participants || []);
        })
        .catch(() => {});
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [connection, roomName]);

  async function handleMute(identity, kind, muted) {
    try {
      await api.mutePartnerMeetingParticipant(roomName, identity, kind, muted);
    } catch {
      // ignore — best-effort UI action
    }
  }

  function addPartner(u) {
    setAddPartners((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
  }

  function removePartner(id) {
    setAddPartners((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAddPartners() {
    if (addPartners.length === 0) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await api.addToPartnerMeeting(roomName, addPartners.map((p) => p.id));
      setAddedMsg(`✓ ${res.added.join(", ")} taklif qilindi.`);
      setAddPartners([]);
      setTimeout(() => setAddedMsg(null), 4000);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAdding(false);
    }
  }

  if (error) {
    return (
      <AppShell>
        <div className="empty-card">
          <p className="error">{error}</p>
          <button onClick={() => navigate("/meetings")}>Ortga</button>
        </div>
      </AppShell>
    );
  }

  if (!connection) {
    return (
      <AppShell>
        <div className="page-header">
          <h1>Uchrashuvga ulanmoqda...</h1>
        </div>
      </AppShell>
    );
  }

  return (
    <div style={{ height: "100vh", position: "relative" }} data-lk-theme="default">
      <button
        className="secondary"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 60,
          width: "auto",
          padding: "8px 14px",
          fontSize: 12.5,
        }}
        onClick={() => setShowAdd(true)}
      >
        ➕ Odam qo'shish
      </button>

      {addedMsg && (
        <div
          style={{
            position: "fixed",
            top: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 16px",
            fontSize: 12.5,
            color: "var(--green)",
          }}
        >
          {addedMsg}
        </div>
      )}

      <LiveKitRoom
        serverUrl={connection.url}
        token={connection.token}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={() => navigate("/dashboard")}
        style={{ height: "100%" }}
      >
        <VideoConference />
      </LiveKitRoom>

      {isHost && participants.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 16,
            width: 260,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 14,
            zIndex: 50,
            maxHeight: "60vh",
            overflowY: "auto",
          }}
        >
          <strong style={{ fontSize: 12.5, display: "block", marginBottom: 10 }}>👑 Ishtirokchilarni boshqarish</strong>
          {participants.map((p) => (
            <div key={p.identity} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12 }}>{p.name}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button className="secondary" style={{ width: "auto", padding: "3px 8px", fontSize: 11 }} onClick={() => handleMute(p.identity, "audio", true)} title="Ovozini o'chirish">🔇</button>
                <button className="secondary" style={{ width: "auto", padding: "3px 8px", fontSize: 11 }} onClick={() => handleMute(p.identity, "video", true)} title="Kamerasini o'chirish">📷</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
            padding: 20,
          }}
          onClick={() => setShowAdd(false)}
        >
          <div className="card" style={{ maxWidth: 380, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>Uchrashuvga odam qo'shish</h3>
              <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={() => setShowAdd(false)}>
                ✕
              </button>
            </div>

            {addPartners.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {addPartners.map((p) => (
                  <span
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--panel-2)",
                      borderRadius: 999,
                      padding: "5px 6px 5px 12px",
                      fontSize: 12.5,
                    }}
                  >
                    {p.full_name}
                    <button
                      type="button"
                      onClick={() => removePartner(p.id)}
                      style={{ width: 18, height: 18, padding: 0, borderRadius: "50%", background: "var(--border)", fontSize: 11, lineHeight: 1 }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <UserSearchInput selected={null} onSelect={addPartner} onClear={() => {}} />
            {addError && <p className="error">{addError}</p>}
            <button onClick={handleAddPartners} disabled={addPartners.length === 0 || adding}>
              {adding ? "Qo'shilmoqda..." : "Taklif qilish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
