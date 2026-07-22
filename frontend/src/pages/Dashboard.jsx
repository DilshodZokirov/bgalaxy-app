import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useAuth } from "../hooks/useAuth";
import { pickActiveCompany } from "../hooks/useCompany";
import { api } from "../api/client";
import AppShell from "../components/AppShell";

function money(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
}

function DeltaBadge({ value }) {
  if (value === null || value === undefined) return null;
  const positive = value >= 0;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: positive ? "var(--green)" : "#f87171", marginLeft: 8 }}>
      {positive ? "▲ +" : "▼ "}{new Intl.NumberFormat("uz-UZ").format(Math.round(value))}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    api
      .getMembers(company.id)
      .then((members) => setMemberCount(members.length))
      .catch(() => setMemberCount(0));
    api
      .getChannels(company.id)
      .then((channels) => setChannelCount(channels.length))
      .catch(() => setChannelCount(0));
    api
      .getMonthlyChampion(company.id)
      .then(setChampion)
      .catch(() => setChampion(null));
    api
      .getYearlySummary(company.id)
      .then((res) => setYearlySummary(res.years))
      .catch(() => setYearlySummary(null));
  }, [company]);

  useEffect(() => {
    api
      .getConversations()
      .then((list) => setConversationCount(list.length))
      .catch(() => setConversationCount(0));
  }, []);

  return (
    <AppShell>
      <div className="page-header">
        <h1>Xush kelibsiz, {user?.full_name?.split(" ")[0] || "foydalanuvchi"}! 👋</h1>
        <p>Bugun ajoyib kunni samarali boshlang.</p>
      </div>

      <div className="stat-grid">
        <div className="card stat-card blue">
          <div className="stat-label">Kompaniya</div>
          <div className="stat-value">{companyCount}</div>
        </div>
        <div className="card stat-card purple">
          <div className="stat-label">Jamoa a'zolari</div>
          <div className="stat-value">{memberCount}</div>
        </div>
        <div className="card stat-card cyan">
          <div className="stat-label">Chat kanallari</div>
          <div className="stat-value">{channelCount}</div>
        </div>
        <div className="card stat-card orange">
          <div className="stat-label">Maxfiy suhbatlar</div>
          <div className="stat-value">{conversationCount}</div>
        </div>
      </div>

      {yearlySummary && yearlySummary.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>📈 Yillik moliyaviy solishtirish (oxirgi 10 yil)</h3>
          {(() => {
            const current = yearlySummary[yearlySummary.length - 1];
            return (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", margin: "10px 0 16px" }}>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Kirim ({current.year})</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>
                    {money(current.income)}
                    <DeltaBadge value={current.income_delta} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Chiqim ({current.year})</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>
                    {money(current.expense)}
                    <DeltaBadge value={current.expense_delta !== null ? -current.expense_delta : null} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Balans ({current.year})</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>
                    {money(current.balance)}
                    <DeltaBadge value={current.balance_delta} />
                  </div>
                </div>
              </div>
            );
          })()}
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={yearlySummary}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="year" stroke="var(--text-dim)" fontSize={12} />
              <YAxis stroke="var(--text-dim)" fontSize={12} />
              <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Legend />
              <Bar dataKey="income" name="Kirim" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Chiqim" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="balance" name="Balans" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {champion && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(124,58,237,0.12))",
            border: "1px solid rgba(245,158,11,0.3)",
          }}
        >
          {champion.avatar_url ? (
            <img src={champion.avatar_url} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <div className="avatar-circle" style={{ width: 60, height: 60, fontSize: 20 }}>
              {champion.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--orange)", letterSpacing: 0.5 }}>
              🏆 OYNING ENG FAOL ISHCHISI
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{champion.full_name}</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>{champion.role_name || "Lavozimsiz"}</div>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: "var(--green)" }}>✅ {champion.accepted} bajarilgan</span>
              {"  ·  "}
              <span style={{ color: "#f87171" }}>❌ {champion.rejected} rad etilgan</span>
              {"  ·  "}
              <strong>{champion.score > 0 ? `+${champion.score}` : champion.score} ball</strong>
            </div>
          </div>
        </div>
      )}

      {company ? (
        <>
          <h2 style={{ fontSize: 16, marginBottom: 12 }}>Tezkor kirish — {company.name}</h2>
          <div className="quick-actions">
            <div className="quick-action" onClick={() => navigate(`/chat/${company.id}`)}>
              <div className="icon">💬</div>
              Chatga o'tish
            </div>
            <div className="quick-action" onClick={() => navigate("/meetings")}>
              <div className="icon">🎥</div>
              Uchrashuv boshlash
            </div>
            <div className="quick-action" onClick={() => navigate("/office")}>
              <div className="icon">🏙️</div>
              Virtual Ofis
            </div>
            <div className="quick-action" onClick={() => navigate("/rafiq")}>
              <div className="icon">🤖</div>
              AI Ziyo
            </div>
            <div className="quick-action" onClick={() => navigate("/companies")}>
              <div className="icon">🏢</div>
              Barcha kompaniyalar
            </div>
          </div>
        </>
      ) : (
        !loadingCompany && (
          <div className="empty-card">
            <p>Hali kompaniyangiz yo'q. Boshlash uchun birinchi kompaniyangizni yarating.</p>
            <button onClick={() => navigate("/companies")}>+ Kompaniya yaratish</button>
          </div>
        )
      )}
    </AppShell>
  );
}
