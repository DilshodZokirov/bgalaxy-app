import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { api } from "../api/client";
import Wh3DBarChart from "./Wh3DBarChart";

const PERIODS = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "1 hafta" },
  { key: "month", label: "1 oy" },
  { key: "3m", label: "3 oy" },
  { key: "6m", label: "6 oy" },
  { key: "year", label: "1 yil" },
];

const KIND_OPTIONS = [
  { key: "warehouse_income", label: "Ombor kirim" },
  { key: "warehouse_expense", label: "Ombor chiqim" },
  { key: "acc_income", label: "Bux. kirim" },
  { key: "acc_expense", label: "Bux. chiqim" },
  { key: "invoice", label: "Faktura" },
  { key: "payroll", label: "Oylik" },
];

const COLORS = {
  warehouse_income: "#2dd4bf",
  warehouse_expense: "#fb7185",
  acc_income: "#34d399",
  acc_expense: "#f97316",
  invoice: "#38bdf8",
  payroll: "#a78bfa",
  balance: "#94a3b8",
};

function money(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(Number(n) || 0)) + " so'm";
}

function ChartTypeRow({ chartType, setChartType }) {
  return (
    <div className="wh-seg">
      {[
        ["line", "Chiziq"],
        ["bar", "Ustun"],
        ["3d", "3D"],
      ].map(([t, label]) => (
        <button key={t} type="button" className={chartType === t ? "active" : ""} onClick={() => setChartType(t)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Full warehouse finance statistics:
 * - selectable series (warehouse + accounting + invoice + payroll)
 * - charts
 * - chronological ledger with filter + pagination
 * - CSV / Excel export
 */
export default function WarehouseFinanceStats({ companyId, warehouseId, multi }) {
  const [period, setPeriod] = useState("month");
  const [chartType, setChartType] = useState("bar");
  const [selected, setSelected] = useState(() => Object.fromEntries(KIND_OPTIONS.map((k) => [k.key, true])));
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);
  const pageSize = 15;

  const kindsParam = useMemo(() => {
    const keys = KIND_OPTIONS.map((k) => k.key).filter((k) => selected[k]);
    return keys.length ? keys.join(",") : "warehouse_income";
  }, [selected]);

  useEffect(() => {
    setPage(1);
  }, [period, kindsParam, warehouseId, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getWarehouseFinanceLedger(companyId, {
        period,
        kinds: kindsParam,
        warehouseId,
        search,
        page,
        pageSize,
      })
      .then((res) => {
        if (!cancelled) setLedger(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId, period, kindsParam, warehouseId, search, page]);

  const activeKinds = KIND_OPTIONS.filter((k) => selected[k.key]);

  const chartData = useMemo(() => ledger?.trend || [], [ledger]);

  const pieData = useMemo(() => {
    const totals = ledger?.totals || {};
    return activeKinds
      .map((k) => ({ name: k.label, value: Number(totals[k.key] || 0), key: k.key }))
      .filter((r) => r.value > 0);
  }, [ledger, activeKinds]);

  const summary = useMemo(() => {
    const t = ledger?.totals || {};
    const income =
      Number(t.warehouse_income || 0) + Number(t.acc_income || 0) + Number(selected.invoice ? 0 : 0);
    // Count paid invoices separately in UI cards via invoice total
    const expense =
      Number(t.warehouse_expense || 0) + Number(t.acc_expense || 0) + Number(t.payroll || 0);
    return {
      income: Number(t.warehouse_income || 0) + Number(t.acc_income || 0),
      expense,
      invoice: Number(t.invoice || 0),
      payroll: Number(t.payroll || 0),
      balance: Number(t.warehouse_income || 0) + Number(t.acc_income || 0) - expense,
    };
  }, [ledger, selected.invoice]);

  function toggleKind(key) {
    setSelected((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Keep at least one selected
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  }

  function selectAll(on) {
    if (on) {
      setSelected(Object.fromEntries(KIND_OPTIONS.map((k) => [k.key, true])));
      return;
    }
    setSelected(Object.fromEntries(KIND_OPTIONS.map((k, i) => [k.key, i === 0])));
  }

  async function handleExport(format) {
    setExportBusy(true);
    setError(null);
    try {
      await api.downloadWarehouseFinanceLedger(companyId, {
        period,
        kinds: kindsParam,
        warehouseId,
        search,
        format,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setExportBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil((ledger?.total || 0) / pageSize));
  const tooltipStyle = {
    background: "#0f172a",
    border: "1px solid rgba(148,163,184,0.25)",
    borderRadius: 10,
    color: "#f8fafc",
  };

  return (
    <div className="wh-finance-stats">
      <div className="wh-panel-head" style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Statistika — ombor va buxgalteriya</h3>
      </div>
      <p className="wh-hint">
        {multi && !warehouseId
          ? "Ombor kirim/chiqim, buxgalteriya, faktura va oylik — barchasi shu yerda. Kerakli turlarni belgilang; grafik, jurnal va eksport yangilanadi."
          : "Tanlangan ombor + buxgalteriya (kirim/chiqim, faktura, oylik). Pastda tartibli jurnal, filter, paginatsiya va CSV/Excel eksport."}
      </p>

      <div className="wh-kind-bar">
        <button type="button" className="secondary wh-soft-btn" onClick={() => selectAll(true)}>
          Barchasi
        </button>
        <button type="button" className="secondary wh-soft-btn" onClick={() => selectAll(false)}>
          Tozalash
        </button>
        {KIND_OPTIONS.map((k) => (
          <label key={k.key} className={`wh-kind-chip ${selected[k.key] ? "on" : ""}`}>
            <input type="checkbox" checked={!!selected[k.key]} onChange={() => toggleKind(k.key)} />
            <span style={{ "--chip": COLORS[k.key] }}>{k.label}</span>
          </label>
        ))}
      </div>

      <div className="wh-stats">
        <article className="wh-stat good">
          <span>Kirim (ombor+bux)</span>
          <strong>{money(summary.income)}</strong>
        </article>
        <article className="wh-stat warn">
          <span>Chiqim (+oylik)</span>
          <strong>{money(summary.expense)}</strong>
        </article>
        <article className="wh-stat">
          <span>Fakturalar</span>
          <strong>{money(summary.invoice)}</strong>
        </article>
        <article className="wh-stat">
          <span>Balans</span>
          <strong>{money(summary.balance)}</strong>
        </article>
      </div>

      <section className="wh-panel">
        <div className="wh-panel-head">
          <h3>Jarayon grafigi</h3>
          <ChartTypeRow chartType={chartType} setChartType={setChartType} />
        </div>
        <div className="wh-period-row">
          {PERIODS.map((p) => (
            <button key={p.key} type="button" className={period === p.key ? "active" : ""} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        {loading && !ledger ? (
          <p className="wh-empty-inline">Yuklanmoqda...</p>
        ) : (
          <>
            {chartType === "3d" ? (
              <div className="wh-dual-3d">
                {activeKinds.slice(0, 2).map((k) => (
                  <Wh3DBarChart
                    key={k.key}
                    data={chartData}
                    dataKey={k.key}
                    color={COLORS[k.key]}
                    valueFormatter={money}
                  />
                ))}
              </div>
            ) : chartType === "line" ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                  <Legend />
                  {activeKinds.map((k) => (
                    <Line key={k.key} type="monotone" dataKey={k.key} name={k.label} stroke={COLORS[k.key]} strokeWidth={2} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                  <Legend />
                  {activeKinds.map((k) => (
                    <Bar key={k.key} dataKey={k.key} name={k.label} fill={COLORS[k.key]} radius={[3, 3, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </section>

      <section className="wh-panel">
        <div className="wh-panel-head">
          <h3>Ulush</h3>
        </div>
        {pieData.length === 0 ? (
          <p className="wh-empty-inline">Tanlangan turlar bo‘yicha summa yo‘q.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {pieData.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="wh-panel">
        <div className="wh-panel-head">
          <h3>Umumiy jurnal (tartib bilan)</h3>
          <div className="wh-export-row">
            <button type="button" className="secondary wh-soft-btn" disabled={exportBusy} onClick={() => handleExport("csv")}>
              {exportBusy ? "..." : "CSV"}
            </button>
            <button type="button" className="wh-cta slim" disabled={exportBusy} onClick={() => handleExport("xlsx")}>
              Excel
            </button>
          </div>
        </div>

        <div className="wh-ledger-filters">
          <input
            type="search"
            placeholder="Qidirish (nom, tafsilot, tur)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            value={Object.entries(selected).filter(([, v]) => v).length === 1 ? Object.entries(selected).find(([, v]) => v)?.[0] : ""}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) {
                selectAll(true);
                return;
              }
              setSelected(Object.fromEntries(KIND_OPTIONS.map((k) => [k.key, k.key === v])));
            }}
          >
            <option value="">Filter: barcha tanlangan</option>
            {KIND_OPTIONS.map((k) => (
              <option key={k.key} value={k.key}>
                Faqat: {k.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="error">{error}</p>}
        {loading && <p className="wh-empty-inline">Jurnal yuklanmoqda...</p>}

        {!loading && (!ledger?.items || ledger.items.length === 0) ? (
          <p className="wh-empty-inline">Bu filter bo‘yicha yozuv yo‘q.</p>
        ) : (
          <div className="wh-ledger-table-wrap">
            <table className="wh-ledger-table">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Tur</th>
                  <th>Yo‘nalish</th>
                  <th>Sarlavha</th>
                  <th>Tafsilot</th>
                  <th>Summa</th>
                </tr>
              </thead>
              <tbody>
                {(ledger?.items || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.occurred_on}</td>
                    <td>
                      <span className="wh-kind-tag" style={{ borderColor: COLORS[row.kind] }}>
                        {row.kind_label}
                      </span>
                    </td>
                    <td className={row.direction === "income" ? "up" : row.direction === "expense" ? "down" : ""}>
                      {row.direction === "income" ? "Kirim" : row.direction === "expense" ? "Chiqim" : "—"}
                    </td>
                    <td>{row.title}</td>
                    <td className="wh-muted">{row.detail}</td>
                    <td className={row.direction === "income" ? "up" : row.direction === "expense" ? "down" : ""}>
                      {money(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="wh-pagination">
          <button type="button" className="secondary wh-soft-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Oldingi
          </button>
          <span>
            {page} / {totalPages} · jami {ledger?.total || 0} ta
          </span>
          <button
            type="button"
            className="secondary wh-soft-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Keyingi →
          </button>
        </div>
      </section>
    </div>
  );
}
