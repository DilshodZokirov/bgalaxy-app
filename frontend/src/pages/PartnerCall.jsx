import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { api } from "../api/client";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";

function PartnerHeading({ title = "Hamkorlar uchrashuvi" }) {
  return (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">Partner Call</p>
      <h1>{title}</h1>
      <p>BG foydalanuvchilari bilan chegara yo‘q video uchrashuv.</p>
    </div>
  );
}

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
      const res = await api.addToPartnerMeeting(
        roomName,
        addPartners.map((p) => p.id)
      );
      setAddedMsg(`${res.added.join(", ")} taklif qilindi.`);
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
      <AppShell topLeft={<PartnerHeading title="Ulanish xatosi" />}>
        <div className="meetings-page">
          <section className="meetings-lobby">
            <h2>Uchrashuvga ulanib bo‘lmadi</h2>
            <p className="error">{error}</p>
            <button type="button" className="meetings-cta" onClick={() => navigate("/meetings")}>
              Uchrashuvlar markazi
            </button>
          </section>
        </div>
      </AppShell>
    );
  }

  if (!connection) {
    return (
      <AppShell topLeft={<PartnerHeading title="Ulanmoqda..." />}>
        <div className="meetings-page">
          <section className="meetings-lobby">
            <div className="meetings-lobby-mark partner" aria-hidden>
              H
            </div>
            <h2>Uchrashuvga ulanmoqda</h2>
            <p>LiveKit xonasiga ulanish tayyorlanmoqda...</p>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <div className="meetings-call-shell" data-lk-theme="default">
      <button type="button" className="meetings-call-add" onClick={() => setShowAdd(true)}>
        Odam qo‘shish
      </button>

      {addedMsg && <div className="meetings-toast">{addedMsg}</div>}

      <LiveKitRoom
        serverUrl={connection.url}
        token={connection.token}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={() => navigate("/meetings")}
        style={{ height: "100%" }}
      >
        <VideoConference />
      </LiveKitRoom>

      {isHost && participants.length > 0 && (
        <aside className="meetings-host-panel">
          <strong>Ishtirokchilar</strong>
          {participants.map((p) => (
            <div key={p.identity} className="meetings-host-row">
              <span>{p.name}</span>
              <div className="meetings-host-actions">
                <button type="button" className="secondary" onClick={() => handleMute(p.identity, "audio", true)} title="Ovozni o‘chirish">
                  Mic
                </button>
                <button type="button" className="secondary" onClick={() => handleMute(p.identity, "video", true)} title="Kamerani o‘chirish">
                  Cam
                </button>
              </div>
            </div>
          ))}
        </aside>
      )}

      {showAdd && (
        <div className="meetings-modal-backdrop" onClick={() => setShowAdd(false)}>
          <div className="card meetings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="meetings-modal-head">
              <h3>Uchrashuvga odam qo‘shish</h3>
              <button type="button" className="secondary meetings-soft-btn" onClick={() => setShowAdd(false)}>
                Yopish
              </button>
            </div>

            {addPartners.length > 0 && (
              <div className="meetings-chip-row">
                {addPartners.map((p) => (
                  <span key={p.id} className="meetings-chip">
                    {p.full_name}
                    <button type="button" onClick={() => removePartner(p.id)} aria-label="Olib tashlash">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <UserSearchInput selected={null} onSelect={addPartner} onClear={() => {}} />
            {addError && <p className="error">{addError}</p>}
            <button
              type="button"
              className="meetings-cta"
              onClick={handleAddPartners}
              disabled={addPartners.length === 0 || adding}
            >
              {adding ? "Qo‘shilmoqda..." : "Taklif qilish"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
