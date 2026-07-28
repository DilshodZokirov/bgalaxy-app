import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { useActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";
import WarehouseFinanceStats from "../components/WarehouseFinanceStats";

function money(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(Number(n) || 0)) + " so'm";
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
const STAGE_COLORS = { todo: "#94a3b8", in_progress: "#38bdf8", testing: "#fbbf24" };
const PRIORITY_LABELS = { hard: "Qiyin", medium: "O'rtacha", easy: "Oson" };

const PERIODS = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "1 hafta" },
  { key: "month", label: "1 oy" },
  { key: "3m", label: "3 oy" },
  { key: "6m", label: "6 oy" },
  { key: "year", label: "1 yil" },
];

const TABS = [
  { key: "overview", label: "Umumiy" },
  { key: "tasks", label: "Vazifalar" },
  { key: "team", label: "Jamoa" },
  { key: "finance", label: "Moliya" },
  { key: "ombor", label: "Ombor" },
];

const TOOLTIP = {
  background: "rgba(15, 23, 42, 0.96)",
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: 12,
  color: "#f8fafc",
  boxShadow: "0 12px 28px rgba(2,6,23,0.45)",
};

const FIN_COLORS = { income: "#22d3ee", expense: "#f59e0b", net: "#a78bfa" };
const TASK_COLORS = { accepted: "#2dd4bf", rejected: "#fb7185" };

function PeriodRow({ value, onChange }) {
  return (
    <div className="wh-period-row">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          type="button"
          className={value === p.key ? "active" : ""}
          onClick={() => onChange(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function ChartSeg({ value, onChange }) {
  return (
    <div className="wh-seg">
      {[
        ["line", "Chiziq"],
        ["bar", "Ustun"],
        ["pie", "Aylana"],
      ].map(([t, label]) => (
        <button key={t} type="button" className={value === t ? "active" : ""} onClick={() => onChange(t)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function EmptyTrend({ text = "Bu davrda maʼlumot yoʻq." }) {
  return <p className="wh-empty-inline st-chart-empty">{text}</p>;
}

function ChartPanel({ title, period, setPeriod, chartType, setChartType, hint, children }) {
  return (
    <section className="wh-panel st-panel-rise">
      <div className="wh-panel-head">
        <h3>{title}</h3>
        {chartType != null && <ChartSeg value={chartType} onChange={setChartType} />}
      </div>
      {period != null && <PeriodRow value={period} onChange={setPeriod} />}
      {hint && <p className="wh-hint">{hint}</p>}
      {children}
    </section>
  );
}

function MemberDetailModal({ companyId, member, period, onClose }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const pageSize = 10;

  useEffect(() => {
    const params = { period, page, page_size: pageSize };
    if (status) params.status = status;
    api
      .getMemberAnalytics(companyId, member.user_id, params)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [companyId, member.user_id, period, page, status]);

  const periodLabel = PERIODS.find((p) => p.key === period)?.label || period;
  const totalPages = data ? Math.max(1, Math.ceil(data.tasks.total / pageSize)) : 1;

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal st-member-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acc-modal-header">
          <div>
            <p className="st-modal-kicker">Member pulse</p>
            <h3 style={{ fontSize: 18, margin: 0 }}>
              {member.full_name} — {periodLabel}
            </h3>
          </div>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>
            Yopish
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        {!data && !error && <p className="wh-empty-inline">Yuklanmoqda...</p>}

        {data && (
          <>
            <div className="wh-stats st-modal-stats">
              <div className="wh-stat">
                <span>Saytda vaqt</span>
                <strong>{formatMinutes(data.time_spent_minutes)}</strong>
              </div>
              <div className="wh-stat good">
                <span>Bajarilgan</span>
                <strong>{data.tasks_total}</strong>
              </div>
              <div className="wh-stat">
                <span>Muvaffaqiyat</span>
                <strong>{data.success_rate !== null ? `${data.success_rate}%` : "—"}</strong>
              </div>
            </div>

            <div className="acc-filter-bar">
              <select
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">Barcha vazifalar</option>
                <option value="accepted">Bajarilgan</option>
                <option value="rejected">Qabul qilinmagan</option>
              </select>
            </div>

            <table className="acc-table">
              <thead>
                <tr>
                  <th>Sarlavha</th>
                  <th>Daraja</th>
                  <th>Holati</th>
                  <th>Sana</th>
                  <th>Ball</th>
                </tr>
              </thead>
              <tbody>
                {data.tasks.items.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{PRIORITY_LABELS[t.priority]}</td>
                    <td>{t.status === "accepted" ? "Bajarilgan" : "Qabul qilinmagan"}</td>
                    <td>{t.completed_at}</td>
                    <td style={{ color: t.points >= 0 ? "var(--green)" : "#f87171" }}>
                      {t.points > 0 ? `+${t.points}` : t.points}
                    </td>
                  </tr>
                ))}
                {data.tasks.items.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--text-dim)", textAlign: "center" }}>
                      Bu davrda vazifa yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {data.tasks.total > pageSize && (
              <div className="acc-pagination">
                <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ← Oldingi
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Keyingi →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TaskCharts({ data, period, setPeriod, chartType, setChartType }) {
  const trend = useMemo(
    () => (data.task_trend || []).map((row) => ({ ...row, label: row.month })),
    [data.task_trend]
  );
  const stageEntries = Object.entries(data.stage_counts || {});
  const maxStage = Math.max(1, ...stageEntries.map(([, c]) => c));
  const pieData = useMemo(() => {
    const accepted = trend.reduce((s, r) => s + (Number(r.accepted) || 0), 0);
    const rejected = trend.reduce((s, r) => s + (Number(r.rejected) || 0), 0);
    return [
      { name: "Bajarilgan", value: accepted, color: TASK_COLORS.accepted },
      { name: "Rad etilgan", value: rejected, color: TASK_COLORS.rejected },
    ].filter((d) => d.value > 0);
  }, [trend]);
  const hasTrend = trend.some((r) => (r.accepted || 0) + (r.rejected || 0) > 0);

  return (
    <div className="st-grid">
      <ChartPanel
        title="Vazifalar tendensiyasi"
        period={period}
        setPeriod={setPeriod}
        chartType={chartType}
        setChartType={setChartType}
        hint="Bajarilgan va rad etilgan vazifalar oqimi."
      >
        {!hasTrend ? (
          <EmptyTrend text="Bu davrda vazifa tendensiyasi yoʻq." />
        ) : chartType === "pie" ? (
          <div className="st-pie-wrap">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={104}
                  paddingAngle={3}
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth={3}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            {chartType === "line" ? (
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="taskAcceptedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TASK_COLORS.accepted} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={TASK_COLORS.accepted} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="taskRejectedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TASK_COLORS.rejected} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={TASK_COLORS.rejected} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="accepted"
                  name="Bajarilgan"
                  stroke={TASK_COLORS.accepted}
                  fill="url(#taskAcceptedFill)"
                  strokeWidth={2.6}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="rejected"
                  name="Rad etilgan"
                  stroke={TASK_COLORS.rejected}
                  fill="url(#taskRejectedFill)"
                  strokeWidth={2.2}
                  dot={false}
                />
              </AreaChart>
            ) : (
              <BarChart data={trend} barGap={6} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                <Legend />
                <Bar dataKey="accepted" name="Bajarilgan" fill={TASK_COLORS.accepted} radius={[8, 8, 0, 0]} maxBarSize={36} />
                <Bar dataKey="rejected" name="Rad etilgan" fill={TASK_COLORS.rejected} radius={[8, 8, 0, 0]} maxBarSize={36} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </ChartPanel>

      <section className="wh-panel st-panel-rise st-delay-1">
        <div className="wh-panel-head">
          <h3>Kanban holati</h3>
        </div>
        {stageEntries.length === 0 ? (
          <p className="wh-empty-inline">Bosqich ma'lumoti yo'q.</p>
        ) : (
          <div className="wh-bars">
            {stageEntries.map(([stage, count]) => (
              <div key={stage}>
                <div className="wh-bar-meta">
                  <span>{STAGE_LABELS[stage] || stage}</span>
                  <strong>{count}</strong>
                </div>
                <div className="wh-bar-track">
                  <div
                    className="cyan"
                    style={{
                      width: `${Math.max(4, (count / maxStage) * 100)}%`,
                      background: STAGE_COLORS[stage] || "#38bdf8",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const MONTH_UZ = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

function formatChampionMonth(monthKey) {
  if (!monthKey) return "O'tgan oy";
  const [y, m] = String(monthKey).split("-");
  const idx = Number(m) - 1;
  if (!y || Number.isNaN(idx) || idx < 0 || idx > 11) return "O'tgan oy";
  return `${MONTH_UZ[idx]} ${y}`;
}

function PrevMonthChampion({ champion }) {
  if (!champion) return null;
  const initials = champion.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="st-champion" role="status">
      <div className="st-champion-avatar" aria-hidden>
        {champion.avatar_url ? <img src={champion.avatar_url} alt="" /> : <span>{initials}</span>}
      </div>
      <div className="st-champion-copy">
        <span className="st-champion-kicker">O'tgan oyning eng faol ishchisi · {formatChampionMonth(champion.month)}</span>
        <strong>{champion.full_name}</strong>
        <em>{champion.role_name || "Lavozimsiz"}</em>
      </div>
      <div className="st-champion-stats">
        <span className="good">{champion.accepted}✓</span>
        <span className="bad">{champion.rejected}✕</span>
        <strong className={champion.score >= 0 ? "good" : "bad"}>
          {champion.score > 0 ? `+${champion.score}` : champion.score}
        </strong>
      </div>
    </div>
  );
}

function FinanceCharts({ data, period, setPeriod, chartType, setChartType }) {
  const trend = useMemo(
    () =>
      (data.financial_trend || []).map((row) => ({
        ...row,
        label: row.month,
        income: Number(row.income) || 0,
        expense: Number(row.expense) || 0,
      })),
    [data.financial_trend]
  );
  const totals = useMemo(() => {
    return trend.reduce(
      (acc, row) => {
        acc.income += row.income;
        acc.expense += row.expense;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [trend]);
  const pieData = useMemo(
    () =>
      [
        { name: "Kirim", value: totals.income, color: FIN_COLORS.income },
        { name: "Chiqim", value: totals.expense, color: FIN_COLORS.expense },
      ].filter((d) => d.value > 0),
    [totals]
  );
  const hasTrend = trend.some((r) => r.income > 0 || r.expense > 0);

  return (
    <>
      <div className="wh-stats st-kpi-pulse">
        <div className="wh-stat good">
          <span>Kirim</span>
          <strong>{money(totals.income)}</strong>
        </div>
        <div className="wh-stat warn">
          <span>Chiqim</span>
          <strong>{money(totals.expense)}</strong>
        </div>
        <div className={`wh-stat ${totals.income - totals.expense >= 0 ? "good" : "warn"}`}>
          <span>Sof</span>
          <strong>{money(totals.income - totals.expense)}</strong>
        </div>
      </div>

      <ChartPanel
        title="Buxgalteriya tendensiyasi"
        period={period}
        setPeriod={setPeriod}
        chartType={chartType}
        setChartType={setChartType}
        hint="Faqat buxgalteriya kirim/chiqimlari va to‘langan hisob-fakturalar. Ombor sotuv/xarid — pastdagi Ombor blokida yoki «Ombor» tabida."
      >
        {!hasTrend ? (
          <EmptyTrend text="Bu davrda moliyaviy harakat yoʻq." />
        ) : chartType === "pie" ? (
          <div className="st-pie-wrap">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={112}
                  paddingAngle={4}
                  stroke="rgba(15,23,42,0.9)"
                  strokeWidth={3}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP} formatter={(v) => money(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="st-pie-legend">
              <span>
                Kirim ulushi:{" "}
                <strong>
                  {totals.income + totals.expense > 0
                    ? Math.round((totals.income / (totals.income + totals.expense)) * 100)
                    : 0}
                  %
                </strong>
              </span>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            {chartType === "line" ? (
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="finIncomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={FIN_COLORS.income} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={FIN_COLORS.income} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="finExpenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={FIN_COLORS.expense} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={FIN_COLORS.expense} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v) => money(v)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Kirim"
                  stroke={FIN_COLORS.income}
                  fill="url(#finIncomeFill)"
                  strokeWidth={2.8}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Chiqim"
                  stroke={FIN_COLORS.expense}
                  fill="url(#finExpenseFill)"
                  strokeWidth={2.4}
                  dot={false}
                />
              </AreaChart>
            ) : (
              <BarChart data={trend} barGap={8} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" vertical={false} />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v) => money(v)} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                <Legend />
                <Bar dataKey="income" name="Kirim" fill={FIN_COLORS.income} radius={[10, 10, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Chiqim" fill={FIN_COLORS.expense} radius={[10, 10, 0, 0]} maxBarSize={40} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </ChartPanel>
    </>
  );
}

export default function Analytics() {
  const { company, loading: companyLoading } = useActiveCompany();
  const [data, setData] = useState(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");
  const [activityPeriod, setActivityPeriod] = useState("month");
  const [taskPeriod, setTaskPeriod] = useState("month");
  const [perfPeriod, setPerfPeriod] = useState("month");
  const [finPeriod, setFinPeriod] = useState("month");
  const [taskChartType, setTaskChartType] = useState("line");
  const [finChartType, setFinChartType] = useState("line");
  const [selectedMember, setSelectedMember] = useState(null);
  const [detailPeriod, setDetailPeriod] = useState("month");
  const [champion, setChampion] = useState(null);

  function openMember(member, periodKey) {
    setDetailPeriod(periodKey);
    setSelectedMember(member);
  }

  useEffect(() => {
    if (!company) return;
    api
      .getCompanyAnalytics(company.id, {
        task_period: taskPeriod,
        perf_period: perfPeriod,
        fin_period: finPeriod,
      })
      .then(setData)
      .catch((err) => {
        if (err.message?.includes("ruxsat")) setDenied(true);
        else setError(err.message);
      });
  }, [company?.id, taskPeriod, perfPeriod, finPeriod]);

  useEffect(() => {
    if (!company) {
      setChampion(null);
      return;
    }
    api.getMonthlyChampion(company.id).then(setChampion).catch(() => setChampion(null));
  }, [company?.id]);

  const kpis = useMemo(() => {
    if (!data) return null;
    const active = (data.team_activity || []).filter((m) => m.active).length;
    const members = (data.team_activity || []).length;
    const accepted = (data.member_performance || []).reduce((s, m) => s + (m.accepted || 0), 0);
    const rejected = (data.member_performance || []).reduce((s, m) => s + (m.rejected || 0), 0);
    const score = (data.member_performance || []).reduce((s, m) => s + (m.score || 0), 0);
    const stages = Object.values(data.stage_counts || {}).reduce((s, n) => s + n, 0);
    return { active, members, accepted, rejected, score, stages };
  }, [data]);

  const ranked = useMemo(() => {
    if (!data?.member_performance) return [];
    return [...data.member_performance].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [data]);

  if (companyLoading) {
    return (
      <AppShell>
        <div className="wh-page">
          <div className="galaxy-page-heading">
            <p className="galaxy-page-kicker">Stats Orbit</p>
            <h1>Statistika</h1>
            <p>Yuklanmoqda...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <div className="wh-page">
          <div className="galaxy-page-heading">
            <p className="galaxy-page-kicker">Stats Orbit</p>
            <h1>Statistika</h1>
            <p>Avval kompaniya yarating yoki tanlang.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (denied) {
    return (
      <AppShell>
        <div className="wh-page">
          <div className="galaxy-page-heading">
            <p className="galaxy-page-kicker">Stats Orbit</p>
            <h1>Statistika</h1>
            <p>Kompaniya statistikasini ko'rish uchun sizda ruxsat yo'q.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="wh-page st-page">
        <div className="galaxy-page-heading">
          <p className="galaxy-page-kicker">Stats Orbit</p>
          <h1>Statistika{company.name ? ` — ${company.name}` : ""}</h1>
          <p>Jamoa, vazifalar, buxgalteriya va ombor kirim/chiqim — barchasi shu sahifada.</p>
        </div>

        <div className="wh-toolbar">
          <div className="wh-tabs">
            {TABS.map((t) => (
              <button key={t.key} type="button" className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="error">{error}</p>}
        {!data && !error && <p className="wh-empty-inline">Yuklanmoqda...</p>}

        {data && kpis && (
          <>
            {data.unpaid_invoices?.count > 0 && (
              <div className="st-alert warn">
                <strong>{data.unpaid_invoices.count} ta to'lanmagan hisob-faktura</strong>
                <span>jami {money(data.unpaid_invoices.total)}</span>
              </div>
            )}

            {tab === "overview" && (
              <>
                <div className="wh-stats st-kpi-pulse">
                  <div className="wh-stat good">
                    <span>Faol a'zolar</span>
                    <strong>
                      {kpis.active}
                      <em>/{kpis.members}</em>
                    </strong>
                  </div>
                  <div className="wh-stat">
                    <span>Bajarilgan</span>
                    <strong>{kpis.accepted}</strong>
                  </div>
                  <div className="wh-stat warn">
                    <span>Rad etilgan</span>
                    <strong>{kpis.rejected}</strong>
                  </div>
                  <div className={`wh-stat ${kpis.score >= 0 ? "good" : "warn"}`}>
                    <span>Jamoa balli</span>
                    <strong>{kpis.score > 0 ? `+${kpis.score}` : kpis.score}</strong>
                  </div>
                </div>

                <div className="st-grid">
                  <section className="wh-panel st-panel-rise">
                    <div className="wh-panel-head">
                      <h3>Kanban snapshot</h3>
                      <span className="st-chip">{kpis.stages} ta ochiq</span>
                    </div>
                    <div className="wh-bars">
                      {Object.entries(data.stage_counts || {}).map(([stage, count]) => {
                        const max = Math.max(1, ...Object.values(data.stage_counts || {}));
                        return (
                          <div key={stage}>
                            <div className="wh-bar-meta">
                              <span>{STAGE_LABELS[stage] || stage}</span>
                              <strong>{count}</strong>
                            </div>
                            <div className="wh-bar-track">
                              <div
                                className="cyan"
                                style={{
                                  width: `${Math.max(4, (count / max) * 100)}%`,
                                  background: STAGE_COLORS[stage] || "#38bdf8",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="wh-panel st-panel-rise st-delay-1">
                    <div className="wh-panel-head">
                      <h3>Top samaradorlik</h3>
                    </div>
                    {ranked.length === 0 ? (
                      <p className="wh-empty-inline">Hali reyting yo'q.</p>
                    ) : (
                      <div className="st-rank-list">
                        {ranked.slice(0, 5).map((m, i) => (
                          <button
                            key={m.user_id}
                            type="button"
                            className="st-rank-row"
                            onClick={() => openMember(m, perfPeriod)}
                          >
                            <span className={`st-rank-n n${i + 1}`}>{i + 1}</span>
                            <span className="st-rank-name">{m.full_name}</span>
                            <span className="st-rank-meta">
                              {m.accepted}✓ · {m.rejected}✕
                            </span>
                            <strong className={m.score >= 0 ? "good" : "bad"}>
                              {m.score > 0 ? `+${m.score}` : m.score}
                            </strong>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

                <FinanceCharts
                  data={data}
                  period={finPeriod}
                  setPeriod={setFinPeriod}
                  chartType={finChartType}
                  setChartType={setFinChartType}
                />

                {company.has_warehouse && (
                  <section className="wh-dashboard st-panel-rise" style={{ marginTop: 18 }}>
                    <WarehouseFinanceStats companyId={company.id} warehouseId={null} multi />
                  </section>
                )}
              </>
            )}

            {tab === "tasks" && (
              <TaskCharts
                data={data}
                period={taskPeriod}
                setPeriod={setTaskPeriod}
                chartType={taskChartType}
                setChartType={setTaskChartType}
              />
            )}

            {tab === "team" && (
              <>
              <PrevMonthChampion champion={champion} />
              <div className="st-grid">
                <section className="wh-panel st-panel-rise">
                  <div className="wh-panel-head">
                    <h3>Jamoa faolligi</h3>
                  </div>
                  <PeriodRow value={activityPeriod} onChange={setActivityPeriod} />
                  <p className="wh-hint">A'zoni bosing — batafsil puls ochiladi.</p>
                  {(data.team_activity || []).length === 0 ? (
                    <p className="wh-empty-inline">A'zo yo'q</p>
                  ) : (
                    <div className="st-rank-list">
                      {data.team_activity.map((m) => (
                        <button
                          key={m.user_id}
                          type="button"
                          className="st-rank-row"
                          onClick={() => openMember(m, activityPeriod)}
                        >
                          <span className={`st-dot ${m.active ? "on" : ""}`} />
                          <span className="st-rank-name">{m.full_name}</span>
                          <span className="st-rank-meta">Oxirgi: {timeAgo(m.last_seen_at)}</span>
                          <strong className={m.active ? "good" : ""}>{m.active ? "Faol" : "Nofaol"}</strong>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section className="wh-panel st-panel-rise st-delay-1">
                  <div className="wh-panel-head">
                    <h3>A'zolar samaradorligi</h3>
                  </div>
                  <PeriodRow value={perfPeriod} onChange={setPerfPeriod} />
                  {ranked.length === 0 ? (
                    <p className="wh-empty-inline">Hali ma'lumot yo'q</p>
                  ) : (
                    <div className="st-rank-list">
                      {ranked.map((m, i) => (
                        <button
                          key={m.user_id}
                          type="button"
                          className="st-rank-row"
                          onClick={() => openMember(m, perfPeriod)}
                        >
                          <span className={`st-rank-n n${Math.min(i + 1, 3)}`}>{i + 1}</span>
                          <span className="st-rank-name">{m.full_name}</span>
                          <span className="st-rank-meta">
                            {m.accepted} bajarilgan · {m.rejected} rad
                          </span>
                          <strong className={m.score >= 0 ? "good" : "bad"}>
                            {m.score > 0 ? `+${m.score}` : m.score}
                          </strong>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </div>
              </>
            )}

            {tab === "finance" && (
              <FinanceCharts
                data={data}
                period={finPeriod}
                setPeriod={setFinPeriod}
                chartType={finChartType}
                setChartType={setFinChartType}
              />
            )}

            {tab === "ombor" && (
              company.has_warehouse ? (
                <section className="wh-dashboard">
                  <WarehouseFinanceStats companyId={company.id} warehouseId={null} multi />
                </section>
              ) : (
                <p className="wh-empty-inline">
                  Ombor yoqilmagan. Profil → Sozlamalar orqali ombor qo‘shing — keyin shu yerda ombor va
                  buxgalteriya grafiklari chiqadi.
                </p>
              )
            )}
          </>
        )}

        {selectedMember && (
          <MemberDetailModal
            companyId={company.id}
            member={selectedMember}
            period={detailPeriod}
            onClose={() => setSelectedMember(null)}
          />
        )}
      </div>
    </AppShell>
  );
}
