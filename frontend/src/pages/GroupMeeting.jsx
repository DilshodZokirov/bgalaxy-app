import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";

export default function GroupMeeting() {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [connection, setConnection] = useState(null); // { token, url }
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canHost, setCanHost] = useState(false);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => setCompany(pickActiveCompany(list)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!company) return;
    api
      .getMyPermissions(company.id)
      .then((p) => setCanHost(!!p.permissions?.host_meeting_controls))
      .catch(() => {});
  }, [company]);

  useEffect(() => {
    if (!connection || !company) return;
    function refresh() {
      api
        .getActiveGroupCall(company.id)
        .then((res) => setParticipants(res.participants || []))
        .catch(() => {});
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [connection, company]);

  async function handleMute(identity, kind, muted) {
    try {
      await api.muteGroupCallParticipant(company.id, identity, kind, muted);
    } catch {
      // ignore — best-effort UI action
    }
  }

  async function handleJoin() {
    setError(null);
    setLoading(true);
    try {
      const res = await api.getGroupCallToken(company.id);
      setConnection(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!company) {
    return (
      <AppShell>
        <div className="page-header">
          <h1>Guruh uchrashuvi</h1>
        </div>
        <div className="empty-card">
          <p>Avval kompaniya yarating.</p>
          <button onClick={() => navigate("/companies")}>+ Kompaniya yaratish</button>
        </div>
      </AppShell>
    );
  }

  if (connection) {
    return (
      <div style={{ height: "100vh", position: "relative" }} data-lk-theme="default">
        <LiveKitRoom
          serverUrl={connection.url}
          token={connection.token}
          connect={true}
          video={true}
          audio={true}
          onDisconnected={() => {
            setConnection(null);
            navigate("/dashboard");
          }}
          style={{ height: "100%" }}
        >
          <VideoConference />
        </LiveKitRoom>

        {canHost && participants.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 16,
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
      </div>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1>Guruh uchrashuvi — {company.name}</h1>
        <p>Bir nechta kishi bilan bir vaqtda video orqali muloqot qiling.</p>
      </div>
      <div className="empty-card">
        {error && <p className="error">{error}</p>}
        <p>Kompaniyangizning umumiy guruh xonasiga qo'shiling — hozir u yerda bo'lgan boshqa a'zolarni ham ko'rasiz.</p>
        <button onClick={handleJoin} disabled={loading}>
          {loading ? "Ulanmoqda..." : "🎥 Guruh uchrashuviga qo'shilish"}
        </button>
      </div>
    </AppShell>
  );
}
