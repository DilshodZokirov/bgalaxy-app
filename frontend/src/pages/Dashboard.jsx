import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useActiveCompany, useBootstrap } from "../hooks/useCompany";
import { api } from "../api/client";
import AppShell from "../components/AppShell";
import GalaxyOrbitHub from "../components/GalaxyOrbitHub";
import GalaxyWelcome from "../components/GalaxyWelcome";
import { formatMeetingWhen } from "../components/scheduledMeetingUtils";

function Sparkline({ values, color }) {
  const points = useMemo(() => {
    if (!values?.length) return "";
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);
    return values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * 100;
        const y = 28 - ((v - min) / span) * 22;
        return `${x},${y}`;
      })
      .join(" ");
  }, [values]);

  return (
    <svg className="galaxy-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" points={points} />
    </svg>
  );
}

function StatGlass({ label, value, delta, color, series }) {
  const up = delta == null ? null : delta >= 0;
  return (
    <div className="galaxy-stat">
      <div className="galaxy-stat-label">{label}</div>
      <div className="galaxy-stat-row">
        <div className="galaxy-stat-value">{value}</div>
        {delta != null && (
          <span className={`galaxy-stat-delta ${up ? "up" : "down"}`}>
            {up ? "▲" : "▼"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <Sparkline values={series} color={color} />
    </div>
  );
}

/** Mockupdagi mobil Bosh sahifa */
function MobileHome({
  firstName,
  company,
  meetingsCount,
  tasksOpen,
  messagesCount,
  upcoming,
  onJoinMeeting,
  onCreateCompany,
  showWarehouse,
  showAnalytics,
}) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Xayrli tong" : hour < 18 ? "Salom" : "Xayrli kech";

  return (
    <div className="mhome">
      <header className="mhome-hero">
        <p className="mhome-kicker">Bosh sahifa</p>
        <h1>
          {hello}, {firstName}!
        </h1>
        <p className="mhome-sub">
          {company ? (
            <>
              <span>{company.name}</span> — bugungi galaktika holati
            </>
          ) : (
            "Kompaniya yarating va ishni boshlang"
          )}
        </p>
      </header>

      <section className="mhome-kpis" aria-label="Tezkor ko‘rsatkichlar">
        <Link to="/meetings" className="mhome-kpi meet">
          <span className="mhome-kpi-icon" aria-hidden>
            🎥
          </span>
          <strong>{meetingsCount}</strong>
          <em>Uchrashuv</em>
        </Link>
        <Link to="/tasks" className="mhome-kpi task">
          <span className="mhome-kpi-icon" aria-hidden>
            🗂️
          </span>
          <strong>{tasksOpen}</strong>
          <em>Vazifa</em>
        </Link>
        <Link to="/chat" className="mhome-kpi chat">
          <span className="mhome-kpi-icon" aria-hidden>
            💬
          </span>
          <strong>{messagesCount}</strong>
          <em>Xabar</em>
        </Link>
      </section>

      <section className="mhome-panel">
        <div className="mhome-panel-head">
          <h2>Yaqin uchrashuvlar</h2>
          <Link to="/meetings">Hammasi</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="mhome-empty">Yaqin uchrashuv yo‘q. Yangi uchrashuv rejalashtiring.</p>
        ) : (
          <ul className="mhome-meet-list">
            {upcoming.map((m) => (
              <li key={m.id}>
                <button type="button" className="mhome-meet" onClick={() => onJoinMeeting(m)}>
                  <span className="mhome-meet-when">{formatMeetingWhen(m.starts_at)}</span>
                  <strong>{m.title || "Uchrashuv"}</strong>
                  {m.description ? <em>{m.description}</em> : null}
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/meetings" className="mhome-cta">
          + Uchrashuv yaratish
        </Link>
      </section>

      <section className="mhome-shortcuts" aria-label="Tezkor yo‘llar">
        <Link to="/office" className="mhome-chip">
          🏙️ Ofislar
        </Link>
        {showWarehouse && (
          <Link to="/warehouse" className="mhome-chip">
            📦 Ombor
          </Link>
        )}
        {showAnalytics && (
          <Link to="/statistika" className="mhome-chip">
            📈 Analytics
          </Link>
        )}
        <Link to="/rafiq" className="mhome-chip">
          ✨ AI Ziyo
        </Link>
      </section>

      {!company && (
        <div className="mhome-panel mhome-empty-company">
          <p>Hali kompaniyangiz yo‘q.</p>
          <button type="button" className="mhome-cta solid" onClick={onCreateCompany}>
            + Kompaniya yaratish
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const skyMode = (user?.theme || "dark") === "light" ? "day" : "night";
  const { company, companies, loading: loadingCompany } = useActiveCompany();
  const { nav } = useBootstrap();
  const companyCount = companies.length;
  const [memberCount, setMemberCount] = useState(0);
  const [channelCount, setChannelCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [tasksOpen, setTasksOpen] = useState(0);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    if (!company) {
      setMemberCount(0);
      setChannelCount(0);
      setTasksOpen(0);
      return;
    }
    api.getMembers(company.id).then((m) => setMemberCount(m.length)).catch(() => setMemberCount(0));
    api.getChannels(company.id).then((c) => setChannelCount(c.length)).catch(() => setChannelCount(0));
    api
      .getTasks(company.id)
      .then((tasks) => {
        const list = Array.isArray(tasks) ? tasks : tasks?.items || [];
        const open = list.filter((t) => t.status === "todo" || t.status === "in_progress" || t.status === "testing").length;
        setTasksOpen(open);
      })
      .catch(() => setTasksOpen(0));
  }, [company?.id]);

  useEffect(() => {
    api.getConversations().then((list) => setConversationCount(list.length)).catch(() => setConversationCount(0));
  }, []);

  useEffect(() => {
    api
      .getScheduledMeetings()
      .then((list) => {
        const now = Date.now();
        const next = (list || [])
          .filter((m) => m.status === "scheduled" || m.status === "notified")
          .filter((m) => new Date(m.starts_at).getTime() >= now - 30 * 60 * 1000)
          .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
          .slice(0, 4);
        setUpcoming(next);
      })
      .catch(() => setUpcoming([]));
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "foydalanuvchi";
  const companySeries = [1, 2, 2, 3, 4, 3, Math.max(companyCount, 1)];
  const memberSeries = [40, 55, 48, 70, 82, 90, Math.max(memberCount, 8)];
  const channelSeries = [8, 12, 10, 16, 18, 20, Math.max(channelCount, 4)];
  const chatSeries = [5, 9, 7, 14, 18, 16, Math.max(conversationCount, 3)];

  function joinMeeting(m) {
    const q = new URLSearchParams();
    if (m.company_id) q.set("company", m.company_id);
    q.set("scheduled", m.id);
    q.set("join", "1");
    navigate(`/group-meeting?${q.toString()}`);
  }

  return (
    <AppShell topLeft={<GalaxyWelcome name={firstName} />}>
      <div className="dashboard-galaxy">
        <MobileHome
          firstName={firstName}
          company={company}
          meetingsCount={upcoming.length}
          tasksOpen={tasksOpen}
          messagesCount={conversationCount}
          upcoming={upcoming}
          onJoinMeeting={joinMeeting}
          onCreateCompany={() => navigate("/companies")}
          showWarehouse={!!nav?.warehouse}
          showAnalytics={!!nav?.analytics}
        />

        <div className="dashboard-desktop-only">
          <section className="galaxy-stage">
            <GalaxyOrbitHub companyName={company?.name} skyMode={skyMode} />
          </section>

          <section className="galaxy-stats">
            <StatGlass label="Faol xodimlar" value={memberCount || 0} delta={12} color="#60a5fa" series={memberSeries} />
            <StatGlass label="Kompaniya" value={companyCount} delta={8} color="#a78bfa" series={companySeries} />
            <StatGlass label="Chat kanallari" value={channelCount} delta={5} color="#22d3ee" series={channelSeries} />
            <StatGlass label="Maxfiy suhbatlar" value={conversationCount} delta={9} color="#fbbf24" series={chatSeries} />
            <aside className="galaxy-quote">
              <div className="galaxy-quote-visual" aria-hidden />
              <div>
                <p>“Katta g‘oyalar kattaroq galaktikalarda yaratiladi.”</p>
                <span>— BG Team</span>
              </div>
            </aside>
          </section>

          {!company && !loadingCompany && (
            <div className="galaxy-panel galaxy-empty">
              <p>Hali kompaniyangiz yo‘q. Boshlash uchun birinchi kompaniyangizni yarating.</p>
              <button onClick={() => navigate("/companies")}>+ Kompaniya yaratish</button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
