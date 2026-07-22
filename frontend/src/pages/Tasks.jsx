import { useEffect, useState } from "react";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/AppShell";

const COLUMNS = [
  { key: "todo", label: "Bajarilmagan" },
  { key: "in_progress", label: "Ishda" },
  { key: "testing", label: "Tekshiruvda" },
];

const PRIORITY_LABELS = { hard: "Qiyin", medium: "O'rtacha", easy: "Oson" };
const PRIORITY_COLORS = { hard: "#f87171", medium: "#f59e0b", easy: "#10b981" };
const STATUS_BADGE = {
  accepted: { label: "Bajarilgan", color: "var(--green)" },
  rejected: { label: "Qabul qilinmagan", color: "#f87171" },
  failed: { label: "Bajarilmagan", color: "var(--text-dim)" },
};

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function TaskCard({ task, isPM, onDragStart, onEdit, onDelete, onReview }) {
  return (
    <div className="kanban-card" draggable onDragStart={(e) => onDragStart(e, task.id)}>
      <div className="title">{task.title}</div>
      {task.description && <div className="desc">{task.description}</div>}
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 999, background: `${PRIORITY_COLORS[task.priority]}22`, color: PRIORITY_COLORS[task.priority] }}>
          {PRIORITY_LABELS[task.priority]}
        </span>
        <span style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Muddat: {task.due_date}</span>
      </div>
      <div className="meta">
        <span className="assignee-tag">{task.assignee_name}</span>
        <div className="card-actions">
          {isPM && task.status === "testing" && (
            <>
              <button onClick={() => onReview(task.id, "accepted")} title="Qabul qilish">✅</button>
              <button onClick={() => onReview(task.id, "rejected")} title="Rad etish">❌</button>
            </>
          )}
          {isPM && (
            <>
              <button onClick={() => onEdit(task)}>✏️</button>
              <button onClick={() => onDelete(task.id)}>🗑️</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ members, roles, onClose, onSave }) {
  const today = new Date();
  const weekLater = new Date();
  weekLater.setDate(weekLater.getDate() + 7);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState(isoDate(weekLater));
  const [targetType, setTargetType] = useState("users");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function toggleUser(id) {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const target_ids = targetType === "users" ? selectedUsers : targetType === "role" ? [selectedRole] : [];
      await onSave({ title, description: description || null, priority, due_date: dueDate, target_type: targetType, target_ids });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Yangi vazifa</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Sarlavha</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          <label>Tavsif (ixtiyoriy)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Muhimlik darajasi</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "10px", width: "100%" }}>
                <option value="hard">Qiyin (+5 / -1)</option>
                <option value="medium">O'rtacha (+3 / -2)</option>
                <option value="easy">Oson (+1 / -3)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Muddat (tugash sanasi)</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </div>

          <label style={{ marginTop: 6 }}>Kimga</label>
          <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 13 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input type="radio" style={{ width: "auto" }} checked={targetType === "users"} onChange={() => setTargetType("users")} />
              Aniq odam(lar)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input type="radio" style={{ width: "auto" }} checked={targetType === "role"} onChange={() => setTargetType("role")} />
              Lavozim/guruh
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input type="radio" style={{ width: "auto" }} checked={targetType === "everyone"} onChange={() => setTargetType("everyone")} />
              Hammaga
            </label>
          </div>

          {targetType === "users" && (
            <div style={{ maxHeight: 140, overflowY: "auto", background: "var(--panel-2)", borderRadius: "var(--radius-sm)", padding: 8, marginBottom: 14 }}>
              {members.map((m) => (
                <label key={m.user_id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", fontSize: 13 }}>
                  <input type="checkbox" style={{ width: "auto" }} checked={selectedUsers.includes(m.user_id)} onChange={() => toggleUser(m.user_id)} />
                  {m.full_name}
                </label>
              ))}
            </div>
          )}

          {targetType === "role" && (
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              style={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "10px", width: "100%", marginBottom: 14 }}
            >
              <option value="">Tanlang</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>{saving ? "Yaratilmoqda..." : "Vazifa yaratish"}</button>
        </form>
      </div>
    </div>
  );
}

function HistoryModal({ companyId, onClose }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("completed_at");
  const [sortDir, setSortDir] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState(null);
  const pageSize = 10;

  function fetchPage() {
    const params = { page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir };
    if (search) params.search = search;
    if (priority) params.priority = priority;
    if (status) params.status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    api.getTaskHistory(companyId, params).then((res) => { setItems(res.items); setTotal(res.total); }).catch((err) => setError(err.message));
  }

  useEffect(fetchPage, [companyId, page, search, priority, status, sortBy, sortDir, dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDownload() {
    setError(null);
    try {
      const from = dateFrom || "2000-01-01";
      const to = dateTo || isoDate(new Date());
      await api.downloadTaskHistoryExcel(companyId, from, to);
    } catch (err) {
      setError(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="acc-modal-backdrop" onClick={onClose}>
      <div className="acc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="acc-modal-header">
          <h3 style={{ fontSize: 16, margin: 0 }}>Vazifalar tarixi</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕ Yopish</button>
        </div>

        <div className="acc-filter-bar">
          <input placeholder="Qidirish..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} style={{ minWidth: 140 }} />
          <select value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value); }}>
            <option value="">Barcha darajalar</option>
            <option value="hard">Qiyin</option>
            <option value="medium">O'rtacha</option>
            <option value="easy">Oson</option>
          </select>
          <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">Barcha holatlar</option>
            <option value="accepted">Bajarilgan</option>
            <option value="rejected">Qabul qilinmagan</option>
            <option value="failed">Bajarilmagan</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="completed_at">Tugatilgan sana bo'yicha</option>
            <option value="due_date">Muddat bo'yicha</option>
            <option value="priority">Daraja bo'yicha</option>
            <option value="title">Nomi bo'yicha</option>
          </select>
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
            <option value="desc">Kamayish</option>
            <option value="asc">O'sish</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
          <input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
          <button className="secondary" style={{ width: "auto", padding: "8px 14px", fontSize: 12.5 }} onClick={handleDownload}>⬇️ Excel</button>
        </div>
        {error && <p className="error">{error}</p>}

        <table className="acc-table">
          <thead>
            <tr>
              <th>Sarlavha</th><th>Daraja</th><th>Kimga</th><th>Muddat</th><th>Tugatilgan</th><th>Tekshirgan</th><th>Holati</th><th>Ball</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{PRIORITY_LABELS[t.priority]}</td>
                <td>{t.assignee_name}</td>
                <td>{t.due_date}</td>
                <td>{t.completed_at}</td>
                <td style={{ color: "var(--text-dim)" }}>{t.checked_by_name || "Hech kim"}</td>
                <td>
                  <span className="acc-badge" style={{ background: `${STATUS_BADGE[t.status]?.color}22`, color: STATUS_BADGE[t.status]?.color }}>
                    {STATUS_BADGE[t.status]?.label}
                  </span>
                </td>
                <td style={{ color: t.points >= 0 ? "var(--green)" : "#f87171" }}>{t.points > 0 ? `+${t.points}` : t.points}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8} style={{ color: "var(--text-dim)", textAlign: "center" }}>Yozuv topilmadi</td></tr>}
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

function LeaderboardModal({ companyId, onClose }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTaskLeaderboard(companyId).then(setRows).catch((err) => setError(err.message));
  }, [companyId]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 420, width: "100%", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>🏆 Umumiy reyting</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        {error && <p className="error">{error}</p>}
        {!rows && !error && <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Yuklanmoqda...</p>}
        {rows && rows.length === 0 && <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Hali hech kim yo'q</p>}
        {rows && rows.map((r, i) => (
          <div key={r.user_id} className={`leaderboard-row ${i < 3 ? `top${i + 1}` : ""}`}>
            <div className="leaderboard-rank">{medals[i] || i + 1}</div>
            <div style={{ flex: 1 }}>
              <div className="leaderboard-name">{r.full_name}</div>
              <div className="leaderboard-sub">✅ {r.accepted} bajarilgan · ❌ {r.rejected} rad etilgan</div>
            </div>
            <div className="leaderboard-score" style={{ color: r.score >= 0 ? "var(--green)" : "#f87171" }}>
              {r.score > 0 ? `+${r.score}` : r.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditTaskModal({ task, onClose, onSave }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({ title, description: description || null, priority, due_date: dueDate });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Vazifani tahrirlash</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Sarlavha</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          <label>Tavsif (ixtiyoriy)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label>Muhimlik darajasi</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "10px", width: "100%" }}>
                <option value="hard">Qiyin (+5 / -1)</option>
                <option value="medium">O'rtacha (+3 / -2)</option>
                <option value="easy">Oson (+1 / -3)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Muddat</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button>
        </form>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [perms, setPerms] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getMyCompanies().then((list) => setCompany(pickActiveCompany(list))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!company) return;
    api.getMyPermissions(company.id).then(setPerms).catch(() => {});
    api.getMembers(company.id).then((list) => setMembers(list.filter((m) => m.user_id !== user?.id))).catch(() => {});
    api.getRoles(company.id).then(setRoles).catch(() => {});
    refreshTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  function refreshTasks() {
    if (!company) return;
    api.getTasks(company.id).then(setTasks).catch(() => {});
  }

  const isPM = perms && (perms.is_owner || perms.permissions?.manage_tasks);

  function handleDragStart(e, taskId) {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(e, status) {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    try {
      await api.updateTask(company.id, taskId, { status });
      refreshTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReview(taskId, status) {
    try {
      await api.updateTask(company.id, taskId, { status });
      refreshTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveTask(payload) {
    await api.createTask(company.id, payload);
    refreshTasks();
  }

  async function handleUpdateTask(payload) {
    await api.updateTask(company.id, editingTask.id, payload);
    refreshTasks();
  }

  async function handleDelete(taskId) {
    try {
      await api.deleteTask(company.id, taskId);
      refreshTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!company) {
    return (
      <AppShell>
        <div className="page-header"><h1>Vazifalar</h1></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1>Vazifalar — {company.name}</h1>
          <p>{isPM ? "Loyiha menejeri sifatida barcha vazifalarni boshqarasiz." : "Sizga tayinlangan vazifalar."}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="secondary" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setShowLeaderboard(true)}>
            🏆 Reyting
          </button>
          <button className="secondary" style={{ width: "auto", padding: "10px 16px" }} onClick={() => setShowHistory(true)}>
            🕘 Tarix
          </button>
          {isPM && (
            <button style={{ width: "auto", padding: "10px 18px" }} onClick={() => setShowModal(true)}>
              + Vazifa qo'shish
            </button>
          )}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="kanban-board">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={`kanban-column ${dragOverCol === col.key ? "drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(col.key); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, col.key)}
            >
              <div className="kanban-column-header">
                {col.label}
                <span className="kanban-count">{colTasks.length}</span>
              </div>
              {colTasks.map((t) => (
                <TaskCard key={t.id} task={t} isPM={isPM} onDragStart={handleDragStart} onEdit={(task) => setEditingTask(task)} onDelete={handleDelete} onReview={handleReview} />
              ))}
              {colTasks.length === 0 && <p style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "center", padding: "10px 0" }}>Bo'sh</p>}
            </div>
          );
        })}
      </div>

      {showModal && (
        <TaskModal members={members} roles={roles} onClose={() => setShowModal(false)} onSave={handleSaveTask} />
      )}
      {editingTask && (
        <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleUpdateTask} />
      )}
      {showHistory && <HistoryModal companyId={company.id} onClose={() => setShowHistory(false)} />}
      {showLeaderboard && <LeaderboardModal companyId={company.id} onClose={() => setShowLeaderboard(false)} />}
    </AppShell>
  );
}
