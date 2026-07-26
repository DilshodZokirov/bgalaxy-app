import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";

function GroupHeading({ companyName }) {
  return (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">Guruh uchrashuvi</p>
      <h1>{companyName || "Kompaniya xonasi"}</h1>
      <p>Bir nechta aʼzo bilan bir vaqtda video muloqot.</p>
    </div>
  );
}

export default function GroupMeeting() {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [connection, setConnection] = useState(null);
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
      <AppShell topLeft={<GroupHeading />}>
        <div className="meetings-page">
          <section className="meetings-lobby">
            <h2>Kompaniya kerak</h2>
            <p>Guruh uchrashuvi faol korxonaga bog‘langan. Avval kompaniya yarating yoki tanlang.</p>
            <button type="button" className="meetings-cta" onClick={() => navigate("/companies")}>
              Kompaniyalar paneli
            </button>
          </section>
        </div>
      </AppShell>
    );
  }

  if (connection) {
    return (
      <div className="meetings-call-shell" data-lk-theme="default">
        <LiveKitRoom
          serverUrl={connection.url}
          token={connection.token}
          connect={true}
          video={true}
          audio={true}
          onDisconnected={() => {
            setConnection(null);
            navigate("/meetings");
          }}
          style={{ height: "100%" }}
        >
          <VideoConference />
        </LiveKitRoom>

        {canHost && participants.length > 0 && (
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
      </div>
    );
  }

  return (
    <AppShell topLeft={<GroupHeading companyName={company.name} />}>
      <div className="meetings-page">
        <section className="meetings-lobby">
          <div className="meetings-lobby-mark" aria-hidden>
            G
          </div>
          <h2>{company.name}</h2>
          <p>
            Kompaniyangizning umumiy guruh xonasiga qo‘shiling — hozir u yerda bo‘lgan boshqa aʼzolarni ham
            ko‘rasiz.
          </p>
          {error && <p className="error">{error}</p>}
          <div className="meetings-lobby-actions">
            <button type="button" className="meetings-cta" onClick={handleJoin} disabled={loading}>
              {loading ? "Ulanmoqda..." : "Uchrashuvga qo‘shilish"}
            </button>
            <button type="button" className="secondary meetings-soft-btn" onClick={() => navigate("/meetings")}>
              Ortga
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
