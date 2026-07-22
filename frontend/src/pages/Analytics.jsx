import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";
import CollapsibleSection from "../components/CollapsibleSection";

function money(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
}

function timeAgo(iso) {
  if (!iso) return "Hech qachon";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "hozir";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} kun oldin`;
  return `${Math.floor(days / 30)} oy oldin`;
}

function formatMinutes(mins) {
  if (mins < 60) return `${mins} daqiqa`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} soat ${m} daqiqa` : `${h} soat`;
}

const STAGE_LABELS = { todo: "Bajarilmagan", in_progress: "Ishda", testing: "Tekshiruvda" };
const PRIORITY_LABELS = { hard: "Qiyin", medium: "O'rtacha", easy: "Oson" };
const PERIOD_OPTIONS = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "1 hafta" },
  { key: "month", label: "1 oy" },
  { key: "3m", label: "3 oy" },
  { key: "6m", label: "6 oy" },
  { key: "year", label: "1 yil" },
];

function PeriodPicker({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
      {PERIOD_OPTIONS.map((p) => (
        <button
          key={p.key}
          className={value === p.key ? "" : "secondary"}
          style={{ width: "auto", padding: "7px 14px", fontSize: 12.5 }}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}


function MemberDetailModal({ companyId, member, period, onClose }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const pageSize = 10;

  function refresh() {
    const params = { period, page, page_size: pageSize };
    if (status) params.status = status;
    api.getMemberAnalytics(companyId, member.user_id, params).then(setData).catch((err) => setError(err.message));
  }

  useEffect(refresh, [companyId, member.user_id, period, page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodLabel = PERIOD_OPTIONS.find((p) => p.key === period)?.label || period;
  const totalPages = data ? Math.max(1, Math.ceil(data.tasks.total / pageSize)) : 1;

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acc-modal-header">
          <h3 style={{ fontSize: 16, margin: 0 }}>{member.full_name} — {periodLabel}</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕ Yopish</button>
        </div>

        {error && <p className="error">{error}</p>}
        {!data && !error && <p style={{ color: "var(--text-dim)" }}>Yuklanmoqda...</p>}

        {data && (
          <>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", margin: "10px 0 20px" }}>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Saytda o'tkazgan vaqti</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatMinutes(data.time_spent_minutes)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Bajarilgan vazifalar</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{data.tasks_total}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Muvaffaqiyat foizi</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--green)" }}>
                  {data.success_rate !== null ? `${data.success_rate}%` : "—"}
                </div>
              </div>
            </div>

            <div className="acc-filter-bar">
              <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
                <option value="">Barcha vazifalar</option>
                <option value="accepted">Bajarilgan</option>
                <option value="rejected">Qabul qilinmagan</option>
              </select>
            </div>

            <table className="acc-table">
              <thead>
                <tr><th>Sarlavha</th><th>Daraja</th><th>Holati</th><th>Sana</th><th>Ball</th></tr>
              </thead>
              <tbody>
                {data.tasks.items.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{PRIORITY_LABELS[t.priority]}</td>
                    <td>{t.status === "accepted" ? "Bajarilgan" : "Qabul qilinmagan"}</td>
                    <td>{t.completed_at}</td>
                    <td style={{ color: t.points >= 0 ? "var(--green)" : "#f87171" }}>{t.points > 0 ? `+${t.points}` : t.points}</td>
                  </tr>
                ))}
                {data.tasks.items.length === 0 && (
                  <tr><td colSpan={5} style={{ color: "var(--text-dim)", textAlign: "center" }}>Bu davrda vazifa yo'q</td></tr>
                )}
              </tbody>
            </table>

            {data.tasks.total > pageSize && (
              <div className="acc-pagination">
                <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Oldingi</button>
                <span>{page} / {totalPages}</span>
                <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Keyingi →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [company, setCompany] = useState(null);
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState("month");
  const [taskPeriod, setTaskPeriod] = useState("month");
  const [perfPeriod, setPerfPeriod] = useState("month");
  const [finPeriod, setFinPeriod] = useState("month");
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    api.getMyCompanies().then((list) => setCompany(pickActiveCompany(list))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!company) return;
    api
      .getCompanyAnalytics(company.id, { task_period: taskPeriod, perf_period: perfPeriod, fin_period: finPeriod })
      .then(setData)
      .catch((err) => {
        if (err.message?.includes("ruxsat")) setDenied(true);
        else setError(err.message);
      });
  }, [company, taskPeriod, perfPeriod, finPeriod]);

  if (!company) {
    return (
      <AppShell>
        <div className="page-header"><h1>Analitika</h1></div>
      </AppShell>
    );
  }

  if (denied) {
    return (
      <AppShell>
        <div className="empty-card">
          <p>Kompaniya analitikasini ko'rish uchun sizda ruxsat yo'q.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1>📈 Kompaniya analitikasi — {company.name}</h1>
        <p>Jamoangizning faolligi, vazifalar samaradorligi va moliyaviy holati.</p>
      </div>

      {error && <p className="error">{error}</p>}
      {!data && !error && <p style={{ color: "var(--text-dim)" }}>Yuklanmoqda...</p>}

      {data && (
        <>
          {data.unpaid_invoices.count > 0 && (
            <div className="card" style={{ marginBottom: 16, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
              ⚠️ <strong>{data.unpaid_invoices.count} ta to'lanmagan hisob-faktura</strong> — jami {money(data.unpaid_invoices.total)}
            </div>
          )}

          <CollapsibleSection icon="👥" title="Jamoa faolligi">
            <PeriodPicker value={period} onChange={setPeriod} />

            {data.team_activity.length === 0 && <p style={{ color: "var(--text-dim)" }}>A'zo yo'q</p>}
            {data.team_activity.map((m) => (
              <div key={m.user_id} className="member-row" style={{ cursor: "pointer" }} onClick={() => setSelectedMember(m)}>
                <span style={{ flex: 1 }}>{m.full_name}</span>
                <span style={{ fontSize: 12, color: "var(--text-dim)", marginRight: 10 }}>Oxirgi faollik: {timeAgo(m.last_seen_at)}</span>
                <span
                  className="acc-badge"
                  style={{ background: m.active ? "rgba(16,185,129,0.15)" : "rgba(148,163,184,0.15)", color: m.active ? "var(--green)" : "var(--text-dim)" }}
                >
                  {m.active ? "Faol" : "Nofaol"}
                </span>
              </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection icon="🗂️" title="Vazifalar tendensiyasi va Kanban holati">
            <PeriodPicker value={taskPeriod} onChange={setTaskPeriod} />
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 380 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={data.task_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={11} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="accepted" name="Bajarilgan" stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="rejected" name="Rad etilgan" stroke="#f87171" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                {Object.entries(data.stage_counts).map(([stage, count]) => (
                  <div key={stage} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span>{STAGE_LABELS[stage]}</span>
                      <strong>{count}</strong>
                    </div>
                    <div style={{ height: 6, borderRadius: 4, background: "var(--panel-2)" }}>
                      <div style={{ height: 6, borderRadius: 4, background: "var(--blue)", width: `${Math.min(100, count * 12)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection icon="🏆" title="A'zolar samaradorligi">
            <PeriodPicker value={perfPeriod} onChange={setPerfPeriod} />
            {data.member_performance.length === 0 && <p style={{ color: "var(--text-dim)" }}>Hali ma'lumot yo'q</p>}
            {data.member_performance.map((m) => (
              <div key={m.user_id} className="member-row">
                <span style={{ flex: 1 }}>{m.full_name}</span>
                <span style={{ fontSize: 12, color: "var(--green)", marginRight: 10 }}>✅ {m.accepted}</span>
                <span style={{ fontSize: 12, color: "#f87171", marginRight: 10 }}>❌ {m.rejected}</span>
                <strong style={{ color: m.score >= 0 ? "var(--green)" : "#f87171" }}>{m.score > 0 ? `+${m.score}` : m.score}</strong>
              </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection icon="💰" title="Moliyaviy tendensiya">
            <PeriodPicker value={finPeriod} onChange={setFinPeriod} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.financial_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={11} />
                <YAxis stroke="var(--text-dim)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v) => money(v)} />
                <Legend />
                <Bar dataKey="income" name="Kirim" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Chiqim" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CollapsibleSection>
        </>
      )}

      {selectedMember && (
        <MemberDetailModal companyId={company.id} member={selectedMember} period={period} onClose={() => setSelectedMember(null)} />
      )}
    </AppShell>
  );
}
