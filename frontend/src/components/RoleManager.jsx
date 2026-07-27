import { useEffect, useState } from "react";
import { api } from "../api/client";

const PERMISSION_LABELS = {
  invite_members: "A'zo qo'shish",
  remove_members: "A'zoni chiqarish",
  start_meeting: "Uchrashuv boshlash",
  host_meeting_controls: "Uchrashuvni boshqarish",
  edit_company_settings: "Sozlamalarni tahrirlash",
  manage_accounting: "Buxgalteriyani boshqarish",
  manage_tasks: "Vazifalarni boshqarish (Loyiha menejeri)",
  view_analytics: "Kompaniya statistikasini ko'rish",
  manage_warehouse: "Ombor bo'limini boshqarish",
  ombor_ishchi: "Ombor ishchisi (faqat ko'rish)",
  warehouse_loader: "Ombor yuklovchi (yuklash tasdiqi)",
  warehouse_courier: "Yetkazib beruvchi (yo'l / yetkazish)",
};
const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS);

function TransferOwnershipModal({ companyId, targetMember, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.transferOwnership(companyId, targetMember.user_id, password);
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 380, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>⚠️ Egalikni topshirish</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14 }}>
          Kompaniya egaligini <strong>{targetMember.full_name}</strong>ga topshirmoqchisiz. Bu amalni <strong>bekor qilib bo'lmaydi</strong> — tasdiqlash uchun parolingizni kiriting.
        </p>
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="Parolingiz" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving} style={{ background: "#f87171" }}>
            {saving ? "Topshirilmoqda..." : "Ha, egalikni topshirish"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RoleManager({ companyId }) {
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);

  useEffect(() => {
    refresh();
  }, [companyId]);

  function refresh() {
    api.getRoles(companyId).then(setRoles).catch(() => {});
    api.getMembers(companyId).then(setMembers).catch(() => {});
    api.getMyPermissions(companyId).then((info) => setIsOwner(info.is_owner)).catch(() => {});
  }

  async function togglePermission(role, key) {
    const updated = { ...role.permissions, [key]: !role.permissions[key] };
    setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...r, permissions: updated } : r)));
    try {
      await api.updateRole(companyId, role.id, { permissions: updated });
    } catch (err) {
      setError(err.message);
      refresh();
    }
  }

  async function handleCreateRole(e) {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setError(null);
    try {
      await api.createRole(companyId, {
        name: newRoleName.trim(),
        permissions: Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])),
      });
      setNewRoleName("");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteRole(role) {
    setError(null);
    try {
      await api.deleteRole(companyId, role.id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAssignRole(userId, roleId) {
    setError(null);
    try {
      await api.assignMemberRole(companyId, userId, roleId);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveMember(userId) {
    setError(null);
    try {
      await api.removeMember(companyId, userId);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleHeadAdmin(member) {
    setError(null);
    try {
      await api.setHeadAdmin(companyId, member.is_head_admin ? null : member.user_id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}

      {roles.map((role) => (
        <div className="role-card" key={role.id}>
          <div className="role-card-header">
            <span className="role-name">{role.name}</span>
            {!["Admin", "Menejer", "Buxgalter", "Xodim"].includes(role.name) && (
              <button
                type="button"
                className="secondary"
                style={{ width: "auto", padding: "3px 8px", fontSize: 11, color: "#f87171" }}
                onClick={() => handleDeleteRole(role)}
              >
                O'chirish
              </button>
            )}
          </div>
          <div className="permission-grid">
            {PERMISSION_KEYS.map((key) => (
              <label className="permission-check" key={key}>
                <input
                  type="checkbox"
                  checked={!!role.permissions[key]}
                  onChange={() => togglePermission(role, key)}
                />
                {PERMISSION_LABELS[key]}
              </label>
            ))}
          </div>
        </div>
      ))}

      <form onSubmit={handleCreateRole} style={{ flexDirection: "row", marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Yangi lavozim nomi"
          value={newRoleName}
          onChange={(e) => setNewRoleName(e.target.value)}
        />
        <button type="submit" style={{ width: "auto", padding: "10px 16px" }}>
          + Qo'shish
        </button>
      </form>

      <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>Jamoa a'zolari</h3>
      {members.map((m) => (
        <div className="member-row" key={m.user_id}>
          <span style={{ flex: 1 }}>
            {m.full_name}
            {m.is_owner && <span className="member-pending-badge" style={{ background: "rgba(37,99,235,0.15)", color: "var(--blue)" }}>Owner</span>}
            {m.is_head_admin && <span className="member-pending-badge" style={{ background: "rgba(245,158,11,0.15)", color: "var(--orange)" }}>Bosh admin</span>}
            {!m.approved && <span className="member-pending-badge">Kutilmoqda</span>}
          </span>

          {m.is_owner ? (
            <span style={{ fontSize: 12, color: "var(--text-dim)", padding: "0 10px" }}>— o'zgartirib bo'lmaydi —</span>
          ) : (
            <select
              value={roles.find((r) => r.name === m.role_name)?.id || ""}
              onChange={(e) => handleAssignRole(m.user_id, e.target.value)}
            >
              <option value="" disabled>
                {m.role_name || "Lavozim yo'q"}
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

          {isOwner && !m.is_owner && (
            <button
              type="button"
              className="secondary"
              style={{ width: "auto", padding: "5px 10px", fontSize: 11 }}
              onClick={() => handleToggleHeadAdmin(m)}
            >
              {m.is_head_admin ? "Bosh admindan olish" : "Bosh admin qilish"}
            </button>
          )}

          {isOwner && !m.is_owner && (
            <button
              type="button"
              className="secondary"
              style={{ width: "auto", padding: "5px 10px", fontSize: 11, color: "#f87171" }}
              onClick={() => setTransferTarget(m)}
            >
              Egalikni topshirish
            </button>
          )}

          {!m.is_owner && (
            <button type="button" className="remove-btn" onClick={() => handleRemoveMember(m.user_id)}>
              Chiqarish
            </button>
          )}
        </div>
      ))}

      {transferTarget && (
        <TransferOwnershipModal
          companyId={companyId}
          targetMember={transferTarget}
          onClose={() => setTransferTarget(null)}
          onDone={refresh}
        />
      )}
    </div>
  );
}
