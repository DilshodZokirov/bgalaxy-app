import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
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

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function money(n) {
  return new Intl.NumberFormat("uz-UZ").format(n) + " so'm";
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
  { key: "sum", label: "Jami (SUM)" },
  { key: "average", label: "O'rtacha (AVERAGE)" },
  { key: "max", label: "Eng ko'p (MAX)" },
  { key: "min", label: "Eng kam (MIN)" },
  { key: "count", label: "Soni (COUNT)" },
  { key: "median", label: "Mediana (MEDIAN)" },
];

function DateRangeModal({ title, confirmLabel, onConfirm, onClose, allowExcel = false }) {
  const today = new Date();
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const [dateFrom, setDateFrom] = useState(isoDate(lastMonthStart));
  const [dateTo, setDateTo] = useState(isoDate(lastMonthEnd));
  const [format, setFormat] = useState("csv");
  const [formulas, setFormulas] = useState(["sum", "average"]);

  function toggleFormula(key) {
    setFormulas((prev) => (prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]));
  }

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: 15, margin: "0 0 14px" }}>{title}</h3>
        <label>Qachondan</label>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ marginBottom: 10 }} />
        <label>Qachongacha</label>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ marginBottom: allowExcel ? 14 : 16 }} />

        {allowExcel && (
          <>
            <label>Format</label>
            <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="radio" checked={format === "csv"} onChange={() => setFormat("csv")} style={{ width: "auto" }} />
                CSV
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <input type="radio" checked={format === "excel"} onChange={() => setFormat("excel")} style={{ width: "auto" }} />
                Excel (formulalar bilan)
              </label>
            </div>

            {format === "excel" && (
              <>
                <label>Formulalar (Excel'da tirik hisoblanadi)</label>
                <div className="permission-grid" style={{ marginBottom: 16 }}>
                  {FORMULA_OPTIONS.map((f) => (
                    <label className="permission-check" key={f.key}>
                      <input
                        type="checkbox"
                        checked={formulas.includes(f.key)}
                        onChange={() => toggleFormula(f.key)}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => onConfirm(dateFrom, dateTo, format, formulas)}>{confirmLabel}</button>
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
  const [chartType, setChartType] = useState("line");
  const [period, setPeriod] = useState("6m");
  const [stats, setStats] = useState(null);
  const catchDenied = useDeniedCatch(onDenied);

  useEffect(() => {
    api.getAccountingStats(companyId, period).then(setStats).catch(catchDenied);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, period]);

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal" style={{ maxWidth: 780 }} onClick={(e) => e.stopPropagation()}>
        <div className="acc-modal-header">
          <h3 style={{ fontSize: 16, margin: 0 }}>Statistika</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕ Yopish</button>
        </div>

        <div className="acc-chart-controls">
          <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
            <option value="line">Line graph</option>
            <option value="bar">Bar chart</option>
            <option value="pie">Pie chart</option>
          </select>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {stats && (
          <>
            <ResponsiveContainer width="100%" height={320}>
              {chartType === "line" ? (
                <LineChart data={stats.buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="income" name="Kirim" stroke="#22d3ee" strokeWidth={2} />
                  <Line type="monotone" dataKey="expense" name="Chiqim" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="payroll" name="Oylik" stroke="#7c3aed" strokeWidth={2} />
                  <Line type="monotone" dataKey="balance" name="Balans" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              ) : chartType === "bar" ? (
                <BarChart data={stats.buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" fontSize={12} />
                  <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="income" name="Kirim" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Chiqim" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="payroll" name="Oylik" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="balance" name="Balans" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={[
                      { name: "Kirim", value: Math.abs(stats.totals.total_income) },
                      { name: "Chiqim", value: Math.abs(stats.totals.total_expense) },
                      { name: "Oylik", value: Math.abs(stats.totals.total_payroll) },
                      { name: "Balans", value: Math.abs(stats.totals.balance) },
                    ].filter((d) => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    <Cell fill="#22d3ee" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#7c3aed" />
                    <Cell fill="#2563eb" />
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>

            <div className="acc-period-totals">
              <div className="card stat-card cyan">
                <div className="stat-label">Kirim</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{money(stats.totals.total_income)}</div>
              </div>
              <div className="card stat-card orange">
                <div className="stat-label">Chiqim</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{money(stats.totals.total_expense)}</div>
              </div>
              <div className="card stat-card purple">
                <div className="stat-label">Oylik</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{money(stats.totals.total_payroll)}</div>
              </div>
              <div className="card stat-card blue">
                <div className="stat-label">Balans</div>
                <div className="stat-value" style={{ fontSize: 18 }}>{money(stats.totals.balance)}</div>
              </div>
            </div>
          </>
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
          title={rangeModal === "view" ? "Qaysi davr uchun ko'rasiz?" : "Qaysi davr uchun yuklab olasiz?"}
          confirmLabel={rangeModal === "view" ? "Ko'rish" : "Yuklab olish"}
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
