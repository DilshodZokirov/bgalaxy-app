import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { api } from "../api/client";
import { setActiveCompanyId, useActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";
import MeetingRoom from "../components/MeetingRoom";
import { ensureMeetingMediaAccess } from "../native";

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
  const [searchParams] = useSearchParams();
  const scheduledMeetingId = searchParams.get("scheduled");
  const companyFromQuery = searchParams.get("company");
  const autoJoin = searchParams.get("join") === "1";
  const { company, loading: companyLoading, refresh } = useActiveCompany();
  const [connection, setConnection] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canHost, setCanHost] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [mediaReady, setMediaReady] = useState({ audio: true, video: true });
  const [companyReady, setCompanyReady] = useState(!companyFromQuery);
  const autoJoinTried = useRef(false);

  // Bildirishnoma / deep-link: kompaniyani bootstrap orqali faollashtirish
  useEffect(() => {
    if (!companyFromQuery) {
      setCompanyReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setActiveCompanyId(companyFromQuery);
        await refresh({ force: true, activeCompanyId: companyFromQuery });
      } catch {
        // ignore — lobby still shows if company missing
      } finally {
        if (!cancelled) setCompanyReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyFromQuery, refresh]);

  useEffect(() => {
    if (!company) return;
    api
      .getMyPermissions(company.id)
      .then((p) => setCanHost(!!p.permissions?.host_meeting_controls))
      .catch(() => {});
  }, [company?.id]);

  useEffect(() => {
    if (!connection || !company) return;
    function refreshParticipants() {
      api
        .getActiveGroupCall(company.id)
        .then((res) => setParticipants(res.participants || []))
        .catch(() => {});
    }
    refreshParticipants();
    const interval = setInterval(refreshParticipants, 5000);
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
    if (!company) return;
    setError(null);
    setLoading(true);
    try {
      const media = await ensureMeetingMediaAccess();
      setMediaReady(media);
      const res = await api.getGroupCallToken(company.id);
      setConnection(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Bildirishnomadan kelganda avtomatik ulanish
  useEffect(() => {
    if (!autoJoin || !companyReady || !company || connection || autoJoinTried.current) return;
    autoJoinTried.current = true;
    handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin, companyReady, company?.id, connection]);

  const waitingCompany = companyLoading || (companyFromQuery && !companyReady);

  if (waitingCompany) {
    return (
      <AppShell topLeft={<GroupHeading />}>
        <div className="meetings-page">
          <section className="meetings-lobby">
            <h2>Yuklanmoqda...</h2>
            <p>Kompaniya ma’lumoti olinmoqda.</p>
          </section>
        </div>
      </AppShell>
    );
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
      <div className="meetings-call-shell">
        <LiveKitRoom
          serverUrl={connection.url}
          token={connection.token}
          connect={true}
          video={mediaReady.video}
          audio={mediaReady.audio}
          onDisconnected={() => {
            const companyId = company.id;
            api.leaveGroupCall(companyId, scheduledMeetingId).catch(() => {});
            setConnection(null);
            navigate("/meetings");
          }}
          style={{ height: "100%" }}
        >
          <MeetingRoom
            kicker="G4 MEETING ROOM"
            title={`${company.name} — guruh`}
            hostControls={
              canHost && participants.length > 0 ? (
                <div className="g4-host-controls">
                  <strong>Host boshqaruvi</strong>
                  {participants.map((p) => (
                    <div key={p.identity} className="g4-host-row">
                      <span>{p.name}</span>
                      <div>
                        <button type="button" onClick={() => handleMute(p.identity, "audio", true)}>
                          Mic off
                        </button>
                        <button type="button" onClick={() => handleMute(p.identity, "video", true)}>
                          Cam off
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null
            }
          />
        </LiveKitRoom>
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
