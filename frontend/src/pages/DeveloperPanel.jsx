import { useEffect, useState } from "react";
import { api, API_BASE } from "../api/client";
import AppShell from "../components/AppShell";

const TABS = [
  { key: "logs", label: "🐞 Loglar" },
  { key: "complaints", label: "📢 Shikoyatlar" },
  { key: "developers", label: "👤 Dasturchilar" },
];

function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const pageSize = 30;

  function refresh() {
    const params = { page, page_size: pageSize };
    if (source) params.source = source;
    api.getLogs(params).then(setLogs).catch(() => {});
  }

  useEffect(refresh, [page, source]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="acc-filter-bar">
        <select value={source} onChange={(e) => { setPage(1); setSource(e.target.value); }}>
          <option value="">Barcha manbalar</option>
          <option value="backend">Backend</option>
          <option value="frontend">Frontend</option>
        </select>
        <button className="secondary" style={{ width: "auto", padding: "8px 14px", fontSize: 12.5 }} onClick={refresh}>
          🔄 Yangilash
        </button>
      </div>

      <div className="card">
        {logs.length === 0 && <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>Log topilmadi</p>}
        {logs.map((log) => (
          <div
            key={log.id}
            style={{ borderBottom: "1px solid var(--border)", padding: "12px 0", cursor: log.stack_trace ? "pointer" : "default" }}
            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="acc-badge" style={{ background: log.source === "backend" ? "rgba(37,99,235,0.15)" : "rgba(245,158,11,0.15)", color: log.source === "backend" ? "var(--blue)" : "var(--orange)" }}>
                {log.source}
              </span>
              {log.method && <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{log.method}</span>}
              {log.path && <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{log.path}</span>}
              <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto" }}>{new Date(log.created_at).toLocaleString("uz-UZ")}</span>
            </div>
            <div style={{ fontSize: 13.5, marginTop: 6 }}>{log.message}</div>
            {log.user_email && <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>👤 {log.user_email}</div>}
            {expandedId === log.id && log.stack_trace && (
              <pre style={{ marginTop: 10, padding: 10, background: "var(--panel-2)", borderRadius: "var(--radius-sm)", fontSize: 11, overflowX: "auto", whiteSpace: "pre-wrap", color: "var(--text-dim)" }}>
                {log.stack_trace}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="acc-pagination">
        <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Oldingi</button>
        <span>{page}-sahifa</span>
        <button className="secondary" disabled={logs.length < pageSize} onClick={() => setPage((p) => p + 1)}>Keyingi →</button>
      </div>
    </div>
  );
}

function ComplaintsTab() {
  const [complaints, setComplaints] = useState([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 30;

  function refresh() {
    const params = { page, page_size: pageSize };
    if (status) params.status = status;
    api.getComplaints(params).then(setComplaints).catch(() => {});
  }

  useEffect(refresh, [page, status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResolve(id) {
    try {
      await api.resolveComplaint(id);
      refresh();
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="acc-filter-bar">
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">Barchasi</option>
          <option value="open">Ochiq</option>
          <option value="resolved">Hal qilingan</option>
        </select>
      </div>

      <div className="card">
        {complaints.length === 0 && <p style={{ color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>Shikoyat yo'q</p>}
        {complaints.map((c) => (
          <div key={c.id} style={{ borderBottom: "1px solid var(--border)", padding: "12px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span className="acc-badge" style={{ background: c.status === "open" ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)", color: c.status === "open" ? "var(--orange)" : "var(--green)" }}>
                {c.status === "open" ? "Ochiq" : "Hal qilingan"}
              </span>
              {c.path && <span style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{c.path}</span>}
              <span style={{ fontSize: 11, color: "var(--text-dim)", marginLeft: "auto" }}>{new Date(c.created_at).toLocaleString("uz-UZ")}</span>
            </div>
            <div style={{ fontSize: 13.5, margin: "6px 0" }}>{c.message}</div>
            {Array.isArray(c.attachments) && c.attachments.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 10px" }}>
                {c.attachments.map((a) => (
                  <a
                    key={a.url}
                    href={`${API_BASE}${a.url}`}
                    target="_blank"
                    rel="noreferrer"
                    title={a.name || "Rasm"}
                    style={{
                      display: "block",
                      width: 96,
                      height: 96,
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      background: "var(--panel-2)",
                    }}
                  >
                    <img
                      src={`${API_BASE}${a.url}`}
                      alt={a.name || "Rasm"}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  </a>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12.5, marginBottom: 4 }}>
              📧 Javob uchun:{" "}
              <a href={`mailto:${c.contact_email || c.user_email}`} style={{ color: "var(--cyan, #22d3ee)", fontWeight: 600 }}>
                {c.contact_email || c.user_email}
              </a>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-dim)" }}>
              👤 {c.user_full_name}
              {c.user_email && c.contact_email && c.user_email !== c.contact_email
                ? ` · akkaunt: ${c.user_email}`
                : ""}
            </div>
            {c.status === "open" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <a
                  className="secondary"
                  href={`mailto:${c.contact_email || c.user_email}?subject=${encodeURIComponent("BG shikoyat javobi")}&body=${encodeURIComponent(`Salom ${c.user_full_name},\n\n`)}`}
                  style={{ width: "auto", padding: "5px 12px", fontSize: 11.5, textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                >
                  Email yozish
                </a>
                <button style={{ width: "auto", padding: "5px 12px", fontSize: 11.5 }} onClick={() => handleResolve(c.id)}>
                  ✓ Hal qilindi deb belgilash
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="acc-pagination">
        <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Oldingi</button>
        <span>{page}-sahifa</span>
        <button className="secondary" disabled={complaints.length < pageSize} onClick={() => setPage((p) => p + 1)}>Keyingi →</button>
      </div>
    </div>
  );
}

function DevelopersTab() {
  const [developers, setDevelopers] = useState([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);

  function refresh() {
    api.getDevelopers().then(setDevelopers).catch(() => {});
  }

  useEffect(refresh, []);

  async function handleGrant(e) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await api.grantDeveloper(email);
      setEmail("");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRevoke(id) {
    try {
      await api.revokeDeveloper(id);
      refresh();
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20, maxWidth: 420 }}>
        <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 10px" }}>
          Yangi dasturchi qo'shish — email ro'yxatdan o'tgan bo'lishi kerak.
        </p>
        <form onSubmit={handleGrant} style={{ display: "flex", gap: 8 }}>
          <input type="email" placeholder="dasturchi@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button type="submit" disabled={adding} style={{ width: "auto", padding: "10px 16px" }}>
            {adding ? "Qo'shilmoqda..." : "+ Qo'shish"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card" style={{ maxWidth: 420 }}>
        <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>Hozirgi dasturchilar</h3>
        {developers.map((d) => (
          <div key={d.id} className="member-row">
            <span style={{ flex: 1 }}>{d.full_name} <span style={{ color: "var(--text-dim)", fontSize: 12 }}>({d.email})</span></span>
            <button className="secondary" style={{ width: "auto", padding: "5px 12px", fontSize: 11.5 }} onClick={() => handleRevoke(d.id)}>
              Olib tashlash
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DeveloperPanel() {
  const [tab, setTab] = useState("logs");

  return (
    <AppShell>
      <div className="page-header">
        <h1>🛠️ Dasturchi paneli</h1>
        <p>Xatolar, shikoyatlar va dasturchilarga ruxsat berish.</p>
      </div>

      <div className="acc-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`acc-tab ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "logs" && <LogsTab />}
      {tab === "complaints" && <ComplaintsTab />}
      {tab === "developers" && <DevelopersTab />}
    </AppShell>
  );
}
