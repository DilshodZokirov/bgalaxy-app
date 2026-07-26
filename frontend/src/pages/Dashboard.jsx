import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from "../hooks/useAuth";
import { pickActiveCompany } from "../hooks/useCompany";
import { api } from "../api/client";
import AppShell from "../components/AppShell";
import GalaxyOrbitHub from "../components/GalaxyOrbitHub";
import GalaxyWelcome from "../components/GalaxyWelcome";

function money(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
}

function DeltaBadge({ value }) {
  if (value === null || value === undefined) return null;
  const positive = value >= 0;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: positive ? "#34d399" : "#f87171", marginLeft: 8 }}>
      {positive ? "▲ +" : "▼ "}{new Intl.NumberFormat("uz-UZ").format(Math.round(value))}
    </span>
  );
}

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

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const skyMode = (user?.theme || "dark") === "light" ? "day" : "night";
  const [company, setCompany] = useState(null);
  const [companyCount, setCompanyCount] = useState(0);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [channelCount, setChannelCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [champion, setChampion] = useState(null);
  const [yearlySummary, setYearlySummary] = useState(null);

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => {
        setCompanyCount(list.length);
        setCompany(pickActiveCompany(list));
      })
      .finally(() => setLoadingCompany(false));
  }, []);

  useEffect(() => {
    if (!company) {
      setMemberCount(0);
      setChannelCount(0);
      setChampion(null);
      setYearlySummary(null);
      return;
    }
    api.getMembers(company.id).then((m) => setMemberCount(m.length)).catch(() => setMemberCount(0));
    api.getChannels(company.id).then((c) => setChannelCount(c.length)).catch(() => setChannelCount(0));
    api.getMonthlyChampion(company.id).then(setChampion).catch(() => setChampion(null));
    api.getYearlySummary(company.id).then((res) => setYearlySummary(res.years)).catch(() => setYearlySummary(null));
  }, [company]);

  useEffect(() => {
    api.getConversations().then((list) => setConversationCount(list.length)).catch(() => setConversationCount(0));
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "foydalanuvchi";
  const incomeSeries = yearlySummary?.map((y) => y.income) || [12, 18, 15, 22, 28, 24, 32];
  const memberSeries = [40, 55, 48, 70, 82, 90, Math.max(memberCount, 8)];
  const channelSeries = [8, 12, 10, 16, 18, 20, Math.max(channelCount, 4)];
  const chatSeries = [5, 9, 7, 14, 18, 16, Math.max(conversationCount, 3)];

  return (
    <AppShell topLeft={<GalaxyWelcome name={firstName} />}>
      <div className="dashboard-galaxy">
        <section className="galaxy-stage">
          <GalaxyOrbitHub companyName={company?.name} skyMode={skyMode} />
        </section>

        <section className="galaxy-stats">
          <StatGlass label="Faol xodimlar" value={memberCount || 0} delta={12} color="#60a5fa" series={memberSeries} />
          <StatGlass
            label="Kompaniya"
            value={companyCount}
            delta={8}
            color="#a78bfa"
            series={incomeSeries.slice(-7).map((n, i) => (typeof n === "number" ? n / 1e6 || i + 2 : i + 2))}
          />
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

        {yearlySummary && yearlySummary.length > 0 && (
          <div className="galaxy-panel">
            <h3>Yillik moliyaviy solishtirish</h3>
            {(() => {
              const current = yearlySummary[yearlySummary.length - 1];
              return (
                <div className="galaxy-finance-row">
                  <div>
                    <div className="muted">Kirim ({current.year})</div>
                    <div className="strong">{money(current.income)}<DeltaBadge value={current.income_delta} /></div>
                  </div>
                  <div>
                    <div className="muted">Chiqim ({current.year})</div>
                    <div className="strong">
                      {money(current.expense)}
                      <DeltaBadge value={current.expense_delta !== null ? -current.expense_delta : null} />
                    </div>
                  </div>
                  <div>
                    <div className="muted">Balans ({current.year})</div>
                    <div className="strong">{money(current.balance)}<DeltaBadge value={current.balance_delta} /></div>
                  </div>
                </div>
              );
            })()}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={yearlySummary}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ background: "#111827", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="income" name="Kirim" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Chiqim" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="balance" name="Balans" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {champion && (
          <div className="galaxy-panel galaxy-champion">
            {champion.avatar_url ? (
              <img src={champion.avatar_url} alt="" />
            ) : (
              <div className="avatar-circle" style={{ width: 60, height: 60, fontSize: 20 }}>
                {champion.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
              </div>
            )}
            <div>
              <div className="galaxy-champion-label">OYNING ENG FAOL ISHCHISI</div>
              <div className="galaxy-champion-name">{champion.full_name}</div>
              <div className="muted">{champion.role_name || "Lavozimsiz"}</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                <span style={{ color: "#34d399" }}>✅ {champion.accepted} bajarilgan</span>
                {"  ·  "}
                <span style={{ color: "#f87171" }}>❌ {champion.rejected} rad etilgan</span>
                {"  ·  "}
                <strong>{champion.score > 0 ? `+${champion.score}` : champion.score} ball</strong>
              </div>
            </div>
          </div>
        )}

        {!company && !loadingCompany && (
          <div className="galaxy-panel galaxy-empty">
            <p>Hali kompaniyangiz yo‘q. Boshlash uchun birinchi kompaniyangizni yarating.</p>
            <button onClick={() => navigate("/companies")}>+ Kompaniya yaratish</button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
