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

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => setCompany(pickActiveCompany(list)))
      .catch(() => {});
  }, []);

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
      <div style={{ height: "100vh" }} data-lk-theme="default">
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
