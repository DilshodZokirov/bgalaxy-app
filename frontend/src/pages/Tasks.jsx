import { useEffect, useRef, useState } from "react";
import { api, API_BASE, wsUrl } from "../api/client";
import { useActiveCompany } from "../hooks/useCompany";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/AppShell";

const COLUMNS = [
  { key: "todo", label: "Bajarilmagan" },
  { key: "in_progress", label: "Ishda" },
  { key: "testing", label: "Tekshiruvda" },
];

const VIEWS = [
  { key: "board", label: "Board" },
  { key: "rating", label: "Reyting" },
  { key: "history", label: "Tarix" },
];

const PRIORITY_LABELS = { hard: "Qiyin", medium: "O'rtacha", easy: "Oson" };
const PRIORITY_COLORS = { hard: "#f87171", medium: "#f59e0b", easy: "#34d399" };
const STATUS_BADGE = {
  accepted: { label: "Bajarilgan", color: "var(--green)" },
  rejected: { label: "Qabul qilinmagan", color: "#f87171" },
  failed: { label: "Bajarilmagan", color: "var(--text-dim)" },
};

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function isImage(name) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name || "");
}

function formatWhen(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TasksHeading({ companyName }) {
  return (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">Task Orbit</p>
      <h1>Vazifalar</h1>
      <p>{companyName ? `${companyName} — board, izoh va fayllar bitta oqimda.` : "Kompaniya vazifalari."}</p>
    </div>
  );
}

function TaskCard({ task, isPM, onDragStart, onOpen, onReview }) {
  return (
    <article
      className="tasks-card"
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onOpen(task)}
    >
      <div className="tasks-card-top">
        <span
          className="tasks-priority"
          style={{
            background: `${PRIORITY_COLORS[task.priority]}22`,
            color: PRIORITY_COLORS[task.priority],
          }}
        >
          {PRIORITY_LABELS[task.priority]}
        </span>
        <span className="tasks-due">{task.due_date}</span>
      </div>
      <h4 className="tasks-card-title">{task.title}</h4>
      {task.description && <p className="tasks-card-desc">{task.description}</p>}
      <div className="tasks-card-meta">
        <span className="tasks-assignee">{task.assignee_name}</span>
        <div className="tasks-card-stats">
          {(task.comment_count > 0 || task.file_count > 0) && (
            <span>
              {task.comment_count > 0 ? `${task.comment_count} izoh` : ""}
              {task.comment_count > 0 && task.file_count > 0 ? " · " : ""}
              {task.file_count > 0 ? `${task.file_count} fayl` : ""}
            </span>
          )}
        </div>
      </div>
      {isPM && task.status === "testing" && (
        <div className="tasks-card-review" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="tasks-accept" onClick={() => onReview(task.id, "accepted")}>
            Qabul
          </button>
          <button type="button" className="tasks-reject" onClick={() => onReview(task.id, "rejected")}>
            Rad
          </button>
        </div>
      )}
    </article>
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
      await onSave({
        title,
        description: description || null,
        priority,
        due_date: dueDate,
        target_type: targetType,
        target_ids,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="tasks-modal-backdrop" onClick={onClose}>
      <div className="card tasks-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tasks-modal-head">
          <h3>Yangi vazifa</h3>
          <button type="button" className="secondary tasks-soft-btn" onClick={onClose}>
            Yopish
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Sarlavha</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          <label>Tavsif (ixtiyoriy)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="tasks-form-row">
            <div>
              <label>Muhimlik</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="hard">Qiyin (+5 / -1)</option>
                <option value="medium">O&apos;rtacha (+3 / -2)</option>
                <option value="easy">Oson (+1 / -3)</option>
              </select>
            </div>
            <div>
              <label>Muddat</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required min={isoDate(today)} />
            </div>
          </div>
          <label>Kimga</label>
          <div className="tasks-target-row">
            {[
              ["users", "Aniq odam"],
              ["role", "Lavozim"],
              ["everyone", "Hammaga"],
            ].map(([key, label]) => (
              <label key={key}>
                <input
                  type="radio"
                  checked={targetType === key}
                  onChange={() => setTargetType(key)}
                />
                {label}
              </label>
            ))}
          </div>
          {targetType === "users" && (
            <div className="tasks-member-pick">
              {members.map((m) => (
                <label key={m.user_id}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(m.user_id)}
                    onChange={() => toggleUser(m.user_id)}
                  />
                  {m.full_name}
                </label>
              ))}
            </div>
          )}
          {targetType === "role" && (
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} required>
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
    <div className="tasks-modal-backdrop" onClick={onClose}>
      <div className="card tasks-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tasks-modal-head">
          <h3>Vazifani tahrirlash</h3>
          <button type="button" className="secondary tasks-soft-btn" onClick={onClose}>
            Yopish
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Sarlavha</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          <label>Tavsif (ixtiyoriy)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="tasks-form-row">
            <div>
              <label>Muhimlik</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="hard">Qiyin (+5 / -1)</option>
                <option value="medium">O&apos;rtacha (+3 / -2)</option>
                <option value="easy">Oson (+1 / -3)</option>
              </select>
            </div>
            <div>
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

function TaskDetailDrawer({
  companyId,
  task,
  user,
  isPM,
  liveTick,
  onClose,
  onEdit,
  onDelete,
  onReview,
}) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!task) return;
    setError(null);
    api.getTaskComments(companyId, task.id)
      .then(setComments)
      .catch((err) => setError(err.message));
  }, [companyId, task?.id, liveTick]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [comments]);

  if (!task) return null;

  async function handleSend(e) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const created = await api.addTaskComment(companyId, task.id, text, file);
      setComments((prev) => [...prev, created]);
      setText("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await api.deleteTaskComment(companyId, task.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="tasks-drawer-backdrop" onClick={onClose}>
      <aside className="tasks-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="tasks-drawer-head">
          <div>
            <span
              className="tasks-priority"
              style={{
                background: `${PRIORITY_COLORS[task.priority]}22`,
                color: PRIORITY_COLORS[task.priority],
              }}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            <h3>{task.title}</h3>
            <p className="tasks-drawer-meta">
              {task.assignee_name} · muddat {task.due_date}
            </p>
          </div>
          <button type="button" className="secondary tasks-soft-btn" onClick={onClose}>
            Yopish
          </button>
        </div>

        {task.description && <p className="tasks-drawer-desc">{task.description}</p>}

        <div className="tasks-drawer-actions">
          {isPM && task.status === "testing" && (
            <>
              <button type="button" className="tasks-accept" onClick={() => onReview(task.id, "accepted")}>
                Qabul qilish
              </button>
              <button type="button" className="tasks-reject" onClick={() => onReview(task.id, "rejected")}>
                Rad etish
              </button>
            </>
          )}
          {isPM && (
            <>
              <button type="button" className="secondary tasks-soft-btn" onClick={() => onEdit(task)}>
                Tahrirlash
              </button>
              <button type="button" className="secondary tasks-soft-btn danger" onClick={() => onDelete(task.id)}>
                O&apos;chirish
              </button>
            </>
          )}
        </div>

        <div className="tasks-comments-head">
          <h4>Izohlar va fayllar</h4>
          <span>{comments.length}</span>
        </div>

        <div className="tasks-comments" ref={listRef}>
          {comments.length === 0 && (
            <p className="tasks-empty-inline">Hali izoh yo&apos;q — birinchi bo&apos;lib yozing.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="tasks-comment">
              <div className="tasks-comment-top">
                <strong>{c.author_name || "Noma'lum"}</strong>
                <span>{formatWhen(c.created_at)}</span>
              </div>
              {c.content && <p>{c.content}</p>}
              {c.file_url && isImage(c.file_name) && (
                <a href={`${API_BASE}${c.file_url}`} target="_blank" rel="noreferrer">
                  <img className="tasks-comment-img" src={`${API_BASE}${c.file_url}`} alt={c.file_name || "Rasm"} />
                </a>
              )}
              {c.file_url && !isImage(c.file_name) && (
                <a className="tasks-file-link" href={`${API_BASE}${c.file_url}`} target="_blank" rel="noreferrer">
                  {c.file_name || "Fayl"}
                </a>
              )}
              {(isPM || String(c.author_id) === String(user?.id)) && (
                <button
                  type="button"
                  className="tasks-comment-del"
                  onClick={() => handleDeleteComment(c.id)}
                >
                  O&apos;chirish
                </button>
              )}
            </div>
          ))}
        </div>

        <form className="tasks-comment-form" onSubmit={handleSend}>
          {error && <p className="error">{error}</p>}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Izoh yozing..."
            rows={3}
          />
          <div className="tasks-comment-form-row">
            <label className="tasks-file-pick">
              <input
                ref={fileRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? file.name : "Fayl biriktirish"}
            </label>
            <button type="submit" disabled={sending || (!text.trim() && !file)}>
              {sending ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function HistoryPanel({ companyId, onOpenTask }) {
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

  useEffect(() => {
    const params = { page, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir };
    if (search) params.search = search;
    if (priority) params.priority = priority;
    if (status) params.status = status;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    api.getTaskHistory(companyId, params)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err.message));
  }, [companyId, page, search, priority, status, sortBy, sortDir, dateFrom, dateTo]);

  async function handleDownload() {
    setError(null);
    try {
      await api.downloadTaskHistoryExcel(companyId, dateFrom || "2000-01-01", dateTo || isoDate(new Date()));
    } catch (err) {
      setError(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="tasks-panel">
      <div className="tasks-filter-bar">
        <input placeholder="Qidirish..." value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
        <select value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value); }}>
          <option value="">Barcha darajalar</option>
          <option value="hard">Qiyin</option>
          <option value="medium">O&apos;rtacha</option>
          <option value="easy">Oson</option>
        </select>
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">Barcha holatlar</option>
          <option value="accepted">Bajarilgan</option>
          <option value="rejected">Qabul qilinmagan</option>
          <option value="failed">Bajarilmagan</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="completed_at">Tugatilgan sana</option>
          <option value="due_date">Muddat</option>
          <option value="priority">Daraja</option>
          <option value="title">Nomi</option>
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
          <option value="desc">Kamayish</option>
          <option value="asc">O&apos;sish</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setPage(1); setDateFrom(e.target.value); }} />
        <input type="date" value={dateTo} onChange={(e) => { setPage(1); setDateTo(e.target.value); }} />
        <button type="button" className="secondary tasks-soft-btn" onClick={handleDownload}>
          Excel
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="tasks-history-list">
        {items.map((t) => (
          <button key={t.id} type="button" className="tasks-history-row" onClick={() => onOpenTask(t)}>
            <div>
              <strong>{t.title}</strong>
              <span>
                {t.assignee_name} · {PRIORITY_LABELS[t.priority]} · {t.completed_at}
              </span>
            </div>
            <div className="tasks-history-right">
              <span
                className="tasks-status-badge"
                style={{
                  background: `${STATUS_BADGE[t.status]?.color}22`,
                  color: STATUS_BADGE[t.status]?.color,
                }}
              >
                {STATUS_BADGE[t.status]?.label}
              </span>
              <span style={{ color: t.points >= 0 ? "var(--green)" : "#f87171" }}>
                {t.points > 0 ? `+${t.points}` : t.points}
              </span>
            </div>
          </button>
        ))}
        {items.length === 0 && <p className="tasks-empty-inline">Yozuv topilmadi</p>}
      </div>
      <div className="tasks-pagination">
        <button type="button" className="secondary tasks-soft-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          Oldingi
        </button>
        <span>{page} / {totalPages} ({total})</span>
        <button type="button" className="secondary tasks-soft-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Keyingi
        </button>
      </div>
    </section>
  );
}

function RatingPanel({ companyId }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getTaskLeaderboard(companyId).then(setRows).catch((err) => setError(err.message));
  }, [companyId]);

  return (
    <section className="tasks-panel tasks-rating">
      {error && <p className="error">{error}</p>}
      {!rows && !error && <p className="tasks-empty-inline">Yuklanmoqda...</p>}
      {rows && rows.length === 0 && <p className="tasks-empty-inline">Hali reyting yo&apos;q</p>}
      {rows && rows.map((r, i) => (
        <div key={r.user_id} className={`tasks-rating-row ${i < 3 ? `top${i + 1}` : ""}`}>
          <div className="tasks-rating-rank">{i + 1}</div>
          <div className="tasks-rating-copy">
            <strong>{r.full_name}</strong>
            <span>{r.accepted} bajarilgan · {r.rejected} rad etilgan</span>
          </div>
          <div className="tasks-rating-score" style={{ color: r.score >= 0 ? "var(--green)" : "#f87171" }}>
            {r.score > 0 ? `+${r.score}` : r.score}
          </div>
        </div>
      ))}
    </section>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const { company, loading: companyLoading } = useActiveCompany();
  const [perms, setPerms] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [view, setView] = useState("board");
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const refreshTimer = useRef(null);

  function refreshTasks() {
    if (!company) return;
    return api.getTasks(company.id)
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    api.getMyPermissions(company.id).then(setPerms).catch(() => {});
    api.getMembers(company.id).then((list) => setMembers(list.filter((m) => m.user_id !== user?.id))).catch(() => {});
    api.getRoles(company.id).then(setRoles).catch(() => {});
    refreshTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  useEffect(() => {
    if (!company) return undefined;
    let socket;
    let closed = false;
    let retry;

    function connect() {
      socket = new WebSocket(wsUrl(`/ws/tasks/${company.id}`));
      socket.onopen = () => setLive(true);
      socket.onclose = () => {
        setLive(false);
        if (!closed) retry = setTimeout(connect, 2500);
      };
      socket.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          if (data.type === "tasks_changed" || data.type === "task_comment") {
            if (refreshTimer.current) clearTimeout(refreshTimer.current);
            refreshTimer.current = setTimeout(() => {
              refreshTasks();
              setLiveTick((n) => n + 1);
            }, 120);
          }
        } catch {
          /* ignore */
        }
      };
    }

    connect();
    return () => {
      closed = true;
      setLive(false);
      if (retry) clearTimeout(retry);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (socket) socket.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  useEffect(() => {
    if (!selectedTask) return;
    const fresh = tasks.find((t) => String(t.id) === String(selectedTask.id));
    if (fresh) setSelectedTask(fresh);
  }, [tasks, selectedTask?.id]);

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
      if (selectedTask && String(selectedTask.id) === String(taskId)) setSelectedTask(null);
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
    if (!window.confirm("Bu vazifani o'chirishni tasdiqlaysizmi?")) return;
    try {
      await api.deleteTask(company.id, taskId);
      if (selectedTask && String(selectedTask.id) === String(taskId)) setSelectedTask(null);
      refreshTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  if (companyLoading) {
    return (
      <AppShell>
        <TasksHeading />
        <p className="tasks-empty-inline">Kompaniya yuklanmoqda...</p>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <TasksHeading />
        <p className="tasks-empty-inline">Avval kompaniya yarating yoki tanlang.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="tasks-page">
        <TasksHeading companyName={company.name} />

        <div className="tasks-toolbar">
          <div className="tasks-view-tabs" role="tablist">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={view === v.key}
                className={view === v.key ? "active" : ""}
                onClick={() => setView(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="tasks-toolbar-right">
            <span className={`tasks-live ${live ? "on" : ""}`}>{live ? "Jonli" : "Ulanmoqda"}</span>
            {isPM && view === "board" && (
              <button type="button" className="tasks-cta" onClick={() => setShowModal(true)}>
                Vazifa qo&apos;shish
              </button>
            )}
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {view === "board" && (
          <div className="tasks-board">
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.key);
              return (
                <section
                  key={col.key}
                  className={`tasks-column ${dragOverCol === col.key ? "drag-over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverCol(col.key);
                  }}
                  onDragLeave={() => setDragOverCol(null)}
                  onDrop={(e) => handleDrop(e, col.key)}
                >
                  <div className="tasks-column-header">
                    <h3>{col.label}</h3>
                    <span>{colTasks.length}</span>
                  </div>
                  {loading && <p className="tasks-empty-inline">Yuklanmoqda...</p>}
                  {!loading && colTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      isPM={isPM}
                      onDragStart={handleDragStart}
                      onOpen={setSelectedTask}
                      onReview={handleReview}
                    />
                  ))}
                  {!loading && colTasks.length === 0 && (
                    <p className="tasks-empty-inline">Bo&apos;sh</p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {view === "rating" && <RatingPanel companyId={company.id} />}
        {view === "history" && (
          <HistoryPanel companyId={company.id} onOpenTask={setSelectedTask} />
        )}
      </div>

      {showModal && (
        <TaskModal members={members} roles={roles} onClose={() => setShowModal(false)} onSave={handleSaveTask} />
      )}
      {editingTask && (
        <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleUpdateTask} />
      )}
      {selectedTask && (
        <TaskDetailDrawer
          companyId={company.id}
          task={selectedTask}
          user={user}
          isPM={isPM}
          liveTick={liveTick}
          onClose={() => setSelectedTask(null)}
          onEdit={(task) => {
            setEditingTask(task);
          }}
          onDelete={handleDelete}
          onReview={handleReview}
        />
      )}
    </AppShell>
  );
}
