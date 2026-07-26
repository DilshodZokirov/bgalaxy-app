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
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";

const TABS = [
  { key: "summary", label: "Umumiy" },
  { key: "transactions", label: "Tranzaksiyalar" },
  { key: "invoices", label: "Hisob-fakturalar" },
  { key: "payroll", label: "Ish haqi" },
];

const PERIOD_OPTIONS = [
  { value: "year", label: "1 yil" },
  { value: "6m", label: "6 oy" },
  { value: "3m", label: "3 oy" },
  { value: "1m", label: "1 oy" },
  { value: "1w", label: "1 hafta" },
];

const CHART_TYPES = [
  { value: "area", label: "Chiziqli" },
  { value: "bar", label: "Ustunli" },
  { value: "pie", label: "Doira" },
];

const SERIES = [
  { key: "income", name: "Kirim", color: "#22d3ee" },
  { key: "expense", name: "Chiqim", color: "#f59e0b" },
  { key: "payroll", name: "Oylik", color: "#a78bfa" },
  { key: "balance", name: "Balans", color: "#38bdf8" },
];

const MONTH_SHORT = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function money(n) {
  return new Intl.NumberFormat("uz-UZ").format(n || 0) + " so'm";
}

function compactMoney(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} mlrd`;
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mln`;
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)} ming`;
  return String(Math.round(v));
}

function formatBucketLabel(label) {
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [y, m] = label.split("-");
    return `${MONTH_SHORT[Number(m) - 1]} ${y.slice(2)}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const [, m, d] = label.split("-");
    return `${Number(d)} ${MONTH_SHORT[Number(m) - 1]}`;
  }
  return label;
}

function StatsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="acc-chart-tooltip">
      <div className="acc-chart-tooltip-label">{formatBucketLabel(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="acc-chart-tooltip-row">
          <span className="acc-chart-tooltip-dot" style={{ background: p.color }} />
          <span>{p.name}</span>
          <strong>{money(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Accounting() {
  const [company, setCompany] = useState(null);
  const [denied, setDenied] = useState(false);
  const [tab, setTab] = useState("summary");

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => setCompany(pickActiveCompany(list)))
      .catch(() => {});
  }, []);

  if (denied) {
    return (
      <AppShell>
        <div className="empty-card">
          <p>Sizda buxgalteriya bo'limiga kirish ruxsati yo'q.</p>
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <div className="page-header">
          <h1>Buxgalteriya</h1>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1>Buxgalteriya — {company.name}</h1>
        <p>Kirim/chiqim, hisob-fakturalar va ish haqi.</p>
      </div>

      <div className="acc-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`acc-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "summary" && <SummaryTab companyId={company.id} onDenied={() => setDenied(true)} />}
      {tab === "transactions" && <TransactionsTab companyId={company.id} onDenied={() => setDenied(true)} />}
      {tab === "invoices" && <InvoicesTab companyId={company.id} onDenied={() => setDenied(true)} />}
      {tab === "payroll" && <PayrollTab companyId={company.id} onDenied={() => setDenied(true)} />}
    </AppShell>
  );
}

function useDeniedCatch(onDenied) {
  return (err) => {
    if (err.message?.includes("ruxsat")) onDenied();
  };
}

/* ---------- shared: date-range popup (used by "Ko'rish" and "Yuklab olish") ---------- */

const FORMULA_OPTIONS = [
  { key: "sum", label: "Jami", hint: "SUM" },
  { key: "average", label: "O'rtacha", hint: "AVERAGE" },
  { key: "max", label: "Eng ko'p", hint: "MAX" },
  { key: "min", label: "Eng kam", hint: "MIN" },
  { key: "count", label: "Soni", hint: "COUNT" },
  { key: "median", label: "Mediana", hint: "MEDIAN" },
];

function DateRangeModal({ title, confirmLabel, onConfirm, onClose, allowExcel = false }) {
  const today = new Date();
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const [dateFrom, setDateFrom] = useState(isoDate(lastMonthStart));
  const [dateTo, setDateTo] = useState(isoDate(lastMonthEnd));
  const [format, setFormat] = useState(allowExcel ? "excel" : "csv");
  const [formulas, setFormulas] = useState(["sum"]);

  function toggleFormula(key) {
    setFormulas((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }

  function confirm() {
    const selected = format === "excel" ? formulas : [];
    onConfirm(dateFrom, dateTo, format, selected);
  }

  const actionLabel = allowExcel
    ? format === "excel"
      ? "Excelga chiqarish"
      : "CSV yuklab olish"
    : confirmLabel;

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal acc-download-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 15, margin: "0 0 14px" }}>{title}</h3>
        <label>Qachondan</label>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ marginBottom: 10 }} />
        <label>Qachongacha</label>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ marginBottom: allowExcel ? 14 : 16 }} />

        {allowExcel && (
          <>
            <label>Qaysi formatda yuklab olasiz?</label>
            <div className="acc-format-pills">
              <button type="button" className={`acc-pill ${format === "excel" ? "active" : ""}`} onClick={() => setFormat("excel")}>
                Excel
              </button>
              <button type="button" className={`acc-pill ${format === "csv" ? "active" : ""}`} onClick={() => setFormat("csv")}>
                CSV
              </button>
            </div>

            {format === "excel" && (
              <div className="acc-formula-box">
                <div className="acc-formula-box-head">
                  <div>
                    <strong>Qaysi formulalar bilan Excelga chiqaray?</strong>
                    <p>Tanlanganlar alohida «Xulosa» qatorida, tartibli chiqadi — ma'lumotlar aralashmaydi.</p>
                  </div>
                  <div className="acc-formula-box-actions">
                    <button type="button" className="secondary" onClick={() => setFormulas(FORMULA_OPTIONS.map((f) => f.key))}>
                      Hammasi
                    </button>
                    <button type="button" className="secondary" onClick={() => setFormulas([])}>
                      Tozalash
                    </button>
                  </div>
                </div>
                <div className="acc-formula-grid">
                  {FORMULA_OPTIONS.map((f) => (
                    <label className={`acc-formula-chip ${formulas.includes(f.key) ? "on" : ""}`} key={f.key}>
                      <input
                        type="checkbox"
                        checked={formulas.includes(f.key)}
                        onChange={() => toggleFormula(f.key)}
                      />
                      <span>{f.label}</span>
                      <small>{f.hint}</small>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={confirm}>{actionLabel}</button>
          <button className="secondary" onClick={onClose}>Bekor qilish</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- shared: report preview modal ---------- */

function ReportPreviewModal({ data, onClose }) {
  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acc-modal-header">
          <h3 style={{ fontSize: 16, margin: 0 }}>Hisobot — {data.date_from} / {data.date_to}</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕ Yopish</button>
        </div>

        <h4 style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 8px" }}>Tranzaksiyalar</h4>
        <table className="acc-table" style={{ marginBottom: 16 }}>
          <tbody>
            {data.transactions.map((t, i) => (
              <tr key={i}>
                <td>{t.occurred_on}</td>
                <td><span className={`acc-badge ${t.type}`}>{t.type === "income" ? "Kirim" : "Chiqim"}</span></td>
                <td>{t.category}</td>
                <td>{money(t.amount)}</td>
                <td style={{ color: "var(--text-dim)" }}>{t.created_by_name}</td>
              </tr>
            ))}
            {data.transactions.length === 0 && <tr><td style={{ color: "var(--text-dim)" }}>Yo'q</td></tr>}
          </tbody>
        </table>

        <h4 style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 8px" }}>Hisob-fakturalar</h4>
        <table className="acc-table" style={{ marginBottom: 16 }}>
          <tbody>
            {data.invoices.map((inv, i) => (
              <tr key={i}>
                <td>{inv.client_name}</td>
                <td>{money(inv.total_amount)}</td>
                <td><span className={`acc-badge ${inv.status}`}>{inv.status}</span></td>
                <td style={{ color: "var(--text-dim)" }}>{inv.created_by_name}</td>
              </tr>
            ))}
            {data.invoices.length === 0 && <tr><td style={{ color: "var(--text-dim)" }}>Yo'q</td></tr>}
          </tbody>
        </table>

        <h4 style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 8px" }}>Ish haqi</h4>
        <table className="acc-table">
          <tbody>
            {data.payroll.map((p, i) => (
              <tr key={i}>
                <td>{p.employee_name}</td>
                <td>{money(p.amount)}</td>
                <td><span className={`acc-badge ${p.status}`}>{p.status === "paid" ? "To'langan" : "Kutilmoqda"}</span></td>
              </tr>
            ))}
            {data.payroll.length === 0 && <tr><td style={{ color: "var(--text-dim)" }}>Yo'q</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- shared: statistics modal (chart type + period picker) ---------- */

function StatsModal({ companyId, onClose, onDenied }) {
  const [chartType, setChartType] = useState("area");
  const [period, setPeriod] = useState("6m");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState({ income: true, expense: true, payroll: true, balance: true });
  const catchDenied = useDeniedCatch(onDenied);

  useEffect(() => {
    setLoading(true);
    api
      .getAccountingStats(companyId, period)
      .then(setStats)
      .catch(catchDenied)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, period]);

  const chartData = useMemo(
    () => (stats?.buckets || []).map((b) => ({ ...b, label: b.label, display: formatBucketLabel(b.label) })),
    [stats],
  );

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Kirim", value: Math.abs(stats.totals.total_income), color: "#22d3ee" },
      { name: "Chiqim", value: Math.abs(stats.totals.total_expense), color: "#f59e0b" },
      { name: "Oylik", value: Math.abs(stats.totals.total_payroll), color: "#a78bfa" },
    ].filter((d) => d.value > 0);
  }, [stats]);

  function toggleSeries(key) {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  }

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label || period;

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal acc-stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acc-modal-header">
          <div>
            <h3 style={{ fontSize: 17, margin: 0 }}>Statistika</h3>
            <p className="acc-stats-sub">Moliyaviy oqim — {periodLabel}</p>
          </div>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕ Yopish</button>
        </div>

        <div className="acc-chart-controls">
          <div className="acc-format-pills">
            {CHART_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`acc-pill ${chartType === t.value ? "active" : ""}`}
                onClick={() => setChartType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="acc-format-pills">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`acc-pill ${period === p.value ? "active" : ""}`}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {chartType !== "pie" && (
          <div className="acc-series-toggles">
            {SERIES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`acc-series-chip ${visible[s.key] ? "on" : ""}`}
                style={{ "--series-color": s.color }}
                onClick={() => toggleSeries(s.key)}
              >
                <span className="acc-series-dot" />
                {s.name}
              </button>
            ))}
          </div>
        )}

        <div className="acc-chart-stage">
          {loading && <div className="acc-chart-loading">Grafik yuklanmoqda…</div>}
          {!loading && stats && chartData.length === 0 && (
            <div className="acc-chart-loading">Bu davr uchun ma'lumot yo'q</div>
          )}
          {!loading && stats && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={340}>
              {chartType === "area" ? (
                <AreaChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    {SERIES.map((s) => (
                      <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.45} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="display" stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} tickFormatter={compactMoney} tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={<StatsTooltip />} />
                  <Legend />
                  {SERIES.filter((s) => visible[s.key]).map((s) => (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.name}
                      stroke={s.color}
                      fill={`url(#grad-${s.key})`}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  ))}
                </AreaChart>
              ) : chartType === "bar" ? (
                <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={4} barCategoryGap="28%">
                  <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="display" stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} tickFormatter={compactMoney} tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={<StatsTooltip />} />
                  <Legend />
                  {SERIES.filter((s) => visible[s.key]).map((s) => (
                    <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  ))}
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={72}
                    outerRadius={118}
                    paddingAngle={3}
                    stroke="rgba(15,23,42,0.35)"
                    strokeWidth={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => money(v)} contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10 }} />
                  <Legend />
                  <text x="50%" y="48%" textAnchor="middle" fill="var(--text)" fontSize="13" fontWeight="600">
                    Balans
                  </text>
                  <text x="50%" y="56%" textAnchor="middle" fill="var(--text-dim)" fontSize="12">
                    {compactMoney(stats.totals.balance)}
                  </text>
                </PieChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {stats && (
          <div className="acc-period-totals">
            <div className="acc-kpi cyan">
              <div className="stat-label">Kirim</div>
              <div className="stat-value">{money(stats.totals.total_income)}</div>
            </div>
            <div className="acc-kpi orange">
              <div className="stat-label">Chiqim</div>
              <div className="stat-value">{money(stats.totals.total_expense)}</div>
            </div>
            <div className="acc-kpi purple">
              <div className="stat-label">Oylik</div>
              <div className="stat-value">{money(stats.totals.total_payroll)}</div>
            </div>
            <div className="acc-kpi blue">
              <div className="stat-label">Balans</div>
              <div className="stat-value">{money(stats.totals.balance)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- shared: generic paginated/filterable detail modal ---------- */

function DetailModal({ title, companyId, entity, onClose, onDenied }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusOrType, setStatusOrType] = useState("");
  const [sortBy, setSortBy] = useState(entity === "invoices" ? "issue_date" : entity === "payroll" ? "period" : "occurred_on");
  const [sortDir, setSortDir] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState(null);
  const pageSize = 10;
  const catchDenied = useDeniedCatch(onDenied);

  function fetchPage() {
    const params = { page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir };
    if (search) params.search = search;
    if (dateFrom) params[entity === "payroll" ? "period_from" : "date_from"] = entity === "payroll" ? dateFrom.slice(0, 7) : dateFrom;
    if (dateTo) params[entity === "payroll" ? "period_to" : "date_to"] = entity === "payroll" ? dateTo.slice(0, 7) : dateTo;
    if (statusOrType) params[entity === "invoices" ? "status" : "type"] = statusOrType;

    const fetchFn = entity === "transactions" ? api.getTransactions : entity === "invoices" ? api.getInvoices : api.getPayroll;
    fetchFn(companyId, params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(catchDenied);
  }

  useEffect(fetchPage, [companyId, page, search, statusOrType, sortBy, sortDir, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload() {
    setError(null);
    try {
      const from = dateFrom || "2000-01-01";
      const to = dateTo || isoDate(new Date());
      await api.downloadAccountingReport(companyId, from, to);
    } catch (err) {
      setError(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acc-modal-header">
          <h3 style={{ fontSize: 16, margin: 0 }}>{title} — batafsil</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕ Yopish</button>
        </div>

        <div className="acc-filter-bar">
          <input
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            style={{ minWidth: 160 }}
          />
          {entity === "transactions" && (
            <select value={statusOrType} onChange={(e) => { setPage(1); setStatusOrType(e.target.value); }}>
              <option value="">Barchasi</option>
              <option value="income">Kirim</option>
              <option value="expense">Chiqim</option>
            </select>
          )}
          {entity === "invoices" && (
            <select value={statusOrType} onChange={(e) => { setPage(1); setStatusOrType(e.target.value); }}>
              <option value="">Barchasi</option>
              <option value="draft">Qoralama</option>
              <option value="sent">Yuborilgan</option>
              <option value="paid">To'langan</option>
              <option value="overdue">Muddati o'tgan</option>
            </select>
          )}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {entity === "transactions" && (
              <>
                <option value="occurred_on">Sana bo'yicha</option>
                <option value="amount">Summasi bo'yicha</option>
                <option value="category">Kategoriya bo'yicha</option>
              </>
            )}
            {entity === "invoices" && (
              <>
                <option value="issue_date">Sana bo'yicha</option>
                <option value="total_amount">Summasi bo'yicha</option>
                <option value="client_name">Mijoz bo'yicha</option>
              </>
            )}
            {entity === "payroll" && (
              <>
                <option value="period">Davr bo'yicha</option>
                <option value="amount">Summasi bo'yicha</option>
              </>
            )}
          </select>
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">Kamayish</option>
            <option value="asc">O'sish</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
          <input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
          <button className="secondary" style={{ width: "auto", padding: "8px 14px", fontSize: 12.5 }} onClick={handleDownload}>
            ⬇️ Yuklab olish
          </button>
        </div>
        {error && <p className="error">{error}</p>}

        <table className="acc-table">
          <thead>
            {entity === "transactions" && (
              <tr><th>Sana</th><th>Turi</th><th>Kategoriya</th><th>Summasi</th><th>Kim kiritdi</th></tr>
            )}
            {entity === "invoices" && (
              <tr><th>Mijoz</th><th>Summasi</th><th>Sana</th><th>Holati</th><th>Kim yaratdi</th></tr>
            )}
            {entity === "payroll" && (
              <tr><th>Xodim</th><th>Davr</th><th>Summasi</th><th>Holati</th></tr>
            )}
          </thead>
          <tbody>
            {entity === "transactions" && items.map((t) => (
              <tr key={t.id}>
                <td>{t.occurred_on}</td>
                <td><span className={`acc-badge ${t.type}`}>{t.type === "income" ? "Kirim" : "Chiqim"}</span></td>
                <td>{t.category}</td>
                <td>{money(t.amount)}</td>
                <td style={{ color: "var(--text-dim)" }}>{t.created_by_name}</td>
              </tr>
            ))}
            {entity === "invoices" && items.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.client_name}</td>
                <td>{money(inv.total_amount)}</td>
                <td>{inv.issue_date}</td>
                <td><span className={`acc-badge ${inv.status}`}>{inv.status}</span></td>
                <td style={{ color: "var(--text-dim)" }}>{inv.created_by_name}</td>
              </tr>
            ))}
            {entity === "payroll" && items.map((p) => (
              <tr key={p.id}>
                <td>{p.employee_name}</td>
                <td>{p.period}</td>
                <td>{money(p.amount)}</td>
                <td><span className={`acc-badge ${p.status}`}>{p.status === "paid" ? "To'langan" : "Kutilmoqda"}</span></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} style={{ color: "var(--text-dim)", textAlign: "center" }}>Yozuv topilmadi</td></tr>
            )}
          </tbody>
        </table>

        <div className="acc-pagination">
          <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Oldingi</button>
          <span>{page} / {totalPages} ({total} ta yozuv)</span>
          <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Keyingi →</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Umumiy ---------- */

function SummaryTab({ companyId, onDenied }) {
  const [month, setMonth] = useState(currentMonth());
  const [summary, setSummary] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [rangeModal, setRangeModal] = useState(null); // "view" | "download" | null
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);
  const catchDenied = useDeniedCatch(onDenied);

  useEffect(() => {
    api.getAccountingSummary(companyId, month).then(setSummary).catch(catchDenied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, month]);

  async function handleRangeConfirm(dateFrom, dateTo, format, formulas) {
    setError(null);
    try {
      if (rangeModal === "view") {
        const data = await api.getAccountingReportData(companyId, dateFrom, dateTo);
        setPreviewData(data);
      } else if (format === "excel") {
        await api.downloadAccountingReportExcel(companyId, dateFrom, dateTo, formulas);
      } else {
        await api.downloadAccountingReport(companyId, dateFrom, dateTo);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRangeModal(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ maxWidth: 200 }} />
        <button className="secondary" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setRangeModal("view")}>
          👁️ Ko'rish
        </button>
        <button className="secondary" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setShowStats(true)}>
          📊 Statistika
        </button>
        <button style={{ width: "auto", padding: "10px 16px" }} onClick={() => setRangeModal("download")}>
          ⬇️ Yuklab olish
        </button>
      </div>
      {error && <p className="error">{error}</p>}

      {summary && (
        <div className="acc-summary-grid">
          <div className="card stat-card cyan">
            <div className="stat-label">Kirim</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{money(summary.total_income)}</div>
          </div>
          <div className="card stat-card orange">
            <div className="stat-label">Chiqim</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{money(summary.total_expense)}</div>
          </div>
          <div className="card stat-card purple">
            <div className="stat-label">Oylik</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{money(summary.total_payroll)}</div>
          </div>
          <div className="card stat-card blue">
            <div className="stat-label">Balans</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{money(summary.balance)}</div>
          </div>
        </div>
      )}

      {rangeModal && (
        <DateRangeModal
          title={rangeModal === "view" ? "Qaysi davr uchun ko'rasiz?" : "Hisobotni yuklab olish"}
          confirmLabel={rangeModal === "view" ? "Ko'rish" : "Excelga chiqarish"}
          onConfirm={handleRangeConfirm}
          onClose={() => setRangeModal(null)}
          allowExcel={rangeModal === "download"}
        />
      )}
      {previewData && <ReportPreviewModal data={previewData} onClose={() => setPreviewData(null)} />}
      {showStats && <StatsModal companyId={companyId} onClose={() => setShowStats(false)} onDenied={onDenied} />}
    </div>
  );
}

/* ---------- Transactions ---------- */

function TransactionsTab({ companyId, onDenied }) {
  const [items, setItems] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [type, setType] = useState("income");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(isoDate(new Date()));
  const [error, setError] = useState(null);
  const catchDenied = useDeniedCatch(onDenied);

  function refresh() {
    api.getTransactions(companyId, { page: 1, page_size: 5 }).then((res) => setItems(res.items)).catch(catchDenied);
  }

  useEffect(refresh, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.createTransaction(companyId, {
        type,
        category,
        amount: parseFloat(amount),
        description: description || null,
        occurred_on: occurredOn,
      });
      setCategory("");
      setAmount("");
      setDescription("");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteTransaction(companyId, id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleAdd} className="acc-form-row">
          <div>
            <label>Turi</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "10px" }}>
              <option value="income">Kirim</option>
              <option value="expense">Chiqim</option>
            </select>
          </div>
          <div>
            <label>Kategoriya</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ijara, Savdo..." required />
          </div>
          <div>
            <label>Summasi</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label>Sana</label>
            <input type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} required />
          </div>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label>Izoh</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ixtiyoriy" />
          </div>
          <button type="submit" style={{ width: "auto", padding: "10px 18px" }}>+ Qo'shish</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <div className="acc-section-header">
          <h3 style={{ fontSize: 14, margin: 0 }}>Oxirgi yozuvlar</h3>
          <button className="acc-detail-link" onClick={() => setShowDetail(true)}>Batafsil / To'liq ko'rish →</button>
        </div>
        <table className="acc-table">
          <thead>
            <tr><th>Sana</th><th>Turi</th><th>Kategoriya</th><th>Summasi</th><th>Izoh</th><th>Kim kiritdi</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td>{t.occurred_on}</td>
                <td><span className={`acc-badge ${t.type}`}>{t.type === "income" ? "Kirim" : "Chiqim"}</span></td>
                <td>{t.category}</td>
                <td>{money(t.amount)}</td>
                <td style={{ color: "var(--text-dim)" }}>{t.description || "—"}</td>
                <td style={{ color: "var(--text-dim)" }}>{t.created_by_name}</td>
                <td>
                  <button className="secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 11 }} onClick={() => handleDelete(t.id)}>
                    O'chirish
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={7} style={{ color: "var(--text-dim)", textAlign: "center" }}>Hali yozuv yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showDetail && (
        <DetailModal title="Tranzaksiyalar" companyId={companyId} entity="transactions" onClose={() => setShowDetail(false)} onDenied={onDenied} />
      )}
    </div>
  );
}

/* ---------- Invoices ---------- */

function InvoicesTab({ companyId, onDenied }) {
  const [items, setItems] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [clientName, setClientName] = useState("");
  const [issueDate, setIssueDate] = useState(isoDate(new Date()));
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState([{ name: "", quantity: 1, price: 0 }]);
  const [error, setError] = useState(null);
  const catchDenied = useDeniedCatch(onDenied);

  function refresh() {
    api.getInvoices(companyId, { page: 1, page_size: 5 }).then((res) => setItems(res.items)).catch(catchDenied);
  }

  useEffect(refresh, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateItem(i, field, value) {
    setLineItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    try {
      await api.createInvoice(companyId, {
        client_name: clientName,
        items: lineItems.map((it) => ({ ...it, quantity: parseFloat(it.quantity), price: parseFloat(it.price) })),
        issue_date: issueDate,
        due_date: dueDate || null,
      });
      setClientName("");
      setLineItems([{ name: "", quantity: 1, price: 0 }]);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await api.updateInvoice(companyId, id, { status });
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteInvoice(companyId, id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleCreate}>
          <div className="acc-form-row">
            <div style={{ flex: 1, minWidth: 160 }}>
              <label>Mijoz nomi</label>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
            </div>
            <div>
              <label>Sana</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </div>
            <div>
              <label>Muddat (ixtiyoriy)</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "14px 0 6px" }}>Buyum(lar)</p>
          {lineItems.map((it, i) => (
            <div className="acc-item-row" key={i}>
              <input placeholder="Nomi" value={it.name} onChange={(e) => updateItem(i, "name", e.target.value)} required />
              <input type="number" placeholder="Miqdor" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} style={{ maxWidth: 90 }} required />
              <input type="number" placeholder="Narxi" value={it.price} onChange={(e) => updateItem(i, "price", e.target.value)} style={{ maxWidth: 120 }} required />
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            style={{ width: "auto", padding: "6px 12px", fontSize: 12, marginBottom: 12 }}
            onClick={() => setLineItems((prev) => [...prev, { name: "", quantity: 1, price: 0 }])}
          >
            + Yana buyum
          </button>
          <br />
          {error && <p className="error">{error}</p>}
          <button type="submit" style={{ width: "auto", padding: "10px 18px" }}>Hisob-faktura yaratish</button>
        </form>
      </div>

      <div className="card">
        <div className="acc-section-header">
          <h3 style={{ fontSize: 14, margin: 0 }}>Oxirgi hisob-fakturalar</h3>
          <button className="acc-detail-link" onClick={() => setShowDetail(true)}>Batafsil / To'liq ko'rish →</button>
        </div>
        <table className="acc-table">
          <thead>
            <tr><th>Mijoz</th><th>Summasi</th><th>Sana</th><th>Holati</th><th>Kim yaratdi</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.client_name}</td>
                <td>{money(inv.total_amount)}</td>
                <td>{inv.issue_date}</td>
                <td>
                  <select
                    value={inv.status}
                    onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                    style={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: 6, padding: "4px 8px", fontSize: 12 }}
                  >
                    <option value="draft">Qoralama</option>
                    <option value="sent">Yuborilgan</option>
                    <option value="paid">To'langan</option>
                    <option value="overdue">Muddati o'tgan</option>
                  </select>
                </td>
                <td style={{ color: "var(--text-dim)" }}>{inv.created_by_name}</td>
                <td>
                  <button className="secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 11 }} onClick={() => handleDelete(inv.id)}>
                    O'chirish
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--text-dim)", textAlign: "center" }}>Hali hisob-faktura yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showDetail && (
        <DetailModal title="Hisob-fakturalar" companyId={companyId} entity="invoices" onClose={() => setShowDetail(false)} onDenied={onDenied} />
      )}
    </div>
  );
}

/* ---------- Payroll ---------- */

function PayrollTab({ companyId, onDenied }) {
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [period, setPeriod] = useState(currentMonth());
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const catchDenied = useDeniedCatch(onDenied);

  function refresh() {
    api.getPayroll(companyId, { page: 1, page_size: 5 }).then((res) => setItems(res.items)).catch(catchDenied);
    api.getMembers(companyId).then(setMembers).catch(() => {});
  }

  useEffect(refresh, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e) {
    e.preventDefault();
    setError(null);
    if (!employeeId) {
      setError("Xodimni tanlang");
      return;
    }
    try {
      await api.createPayroll(companyId, { employee_id: employeeId, period, amount: parseFloat(amount) });
      setAmount("");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMarkPaid(id) {
    try {
      await api.markPayrollPaid(companyId, id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <form onSubmit={handleAdd} className="acc-form-row">
          <div style={{ flex: 1, minWidth: 160 }}>
            <label>Xodim</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              style={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "10px" }}
            >
              <option value="">Tanlang</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Davr</label>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} required />
          </div>
          <div>
            <label>Summasi</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <button type="submit" style={{ width: "auto", padding: "10px 18px" }}>+ Qo'shish</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <div className="acc-section-header">
          <h3 style={{ fontSize: 14, margin: 0 }}>Oxirgi yozuvlar</h3>
          <button className="acc-detail-link" onClick={() => setShowDetail(true)}>Batafsil / To'liq ko'rish →</button>
        </div>
        <table className="acc-table">
          <thead>
            <tr><th>Xodim</th><th>Davr</th><th>Summasi</th><th>Holati</th><th>Kim kiritdi</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td>{p.employee_name}</td>
                <td>{p.period}</td>
                <td>{money(p.amount)}</td>
                <td><span className={`acc-badge ${p.status}`}>{p.status === "paid" ? "To'langan" : "Kutilmoqda"}</span></td>
                <td style={{ color: "var(--text-dim)" }}>{p.created_by_name}</td>
                <td>
                  {p.status !== "paid" && (
                    <button style={{ width: "auto", padding: "4px 10px", fontSize: 11 }} onClick={() => handleMarkPaid(p.id)}>
                      To'landi deb belgilash
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--text-dim)", textAlign: "center" }}>Hali yozuv yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showDetail && (
        <DetailModal title="Ish haqi" companyId={companyId} entity="payroll" onClose={() => setShowDetail(false)} onDenied={onDenied} />
      )}
    </div>
  );
}
