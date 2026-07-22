import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { wsUrl, api, API_BASE } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
function isImage(fileName) {
  if (!fileName) return false;
  const lower = fileName.toLowerCase();
  return IMAGE_EXT.some((ext) => lower.endsWith(ext));
}

function MemberPickerModal({ title, confirmLabel, onConfirm, onClose }) {
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState(null);

  function add(u) {
    setPicked((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
  }
  function remove(id) {
    setPicked((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 400, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>{title}</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        {picked.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {picked.map((p) => (
              <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--panel-2)", borderRadius: 999, padding: "5px 6px 5px 12px", fontSize: 12.5 }}>
                {p.full_name}
                <button type="button" onClick={() => remove(p.id)} style={{ width: 18, height: 18, padding: 0, borderRadius: "50%", background: "var(--border)", fontSize: 11, lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
        )}
        <UserSearchInput selected={null} onSelect={add} onClear={() => {}} />
        {error && <p className="error">{error}</p>}
        <button
          disabled={picked.length === 0}
          onClick={async () => {
            setError(null);
            try {
              await onConfirm(picked.map((p) => p.id));
            } catch (err) {
              setError(err.message);
            }
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

function NewChannelModal({ onClose, onConfirm }) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState(null);

  function add(u) {
    setPicked((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
  }
  function remove(id) {
    setPicked((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await onConfirm(name, picked.map((p) => p.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 400, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Yangi kanal</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Kanal nomi</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="masalan: moliya" required />

          <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "10px 0" }}>A'zolarni tanlang:</p>
          {picked.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {picked.map((p) => (
                <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--panel-2)", borderRadius: 999, padding: "5px 6px 5px 12px", fontSize: 12.5 }}>
                  {p.full_name}
                  <button type="button" onClick={() => remove(p.id)} style={{ width: 18, height: 18, padding: 0, borderRadius: "50%", background: "var(--border)", fontSize: 11, lineHeight: 1 }}>✕</button>
                </span>
              ))}
            </div>
          )}
          <UserSearchInput selected={null} onSelect={add} onClear={() => {}} />
          {error && <p className="error">{error}</p>}
          <button type="submit">Kanal yaratish</button>
        </form>
      </div>
    </div>
  );
}

function NewConversationModal({ onClose, onStart }) {
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);

  function add(u) {
    setPicked((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
  }
  function remove(id) {
    setPicked((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleStart() {
    if (picked.length === 0) return;
    setStarting(true);
    setError(null);
    try {
      await onStart(picked.map((p) => p.id));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }} onClick={onClose}>
      <div className="card" style={{ maxWidth: 380, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Yangi maxfiy suhbat</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 10px" }}>
          Email orqali qidiring — BG (Business Galaxy)'da ro'yxatdan o'tgan istalgan kishi bilan, kompaniyangizdan tashqarida ham.
        </p>
        {picked.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {picked.map((p) => (
              <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--panel-2)", borderRadius: 999, padding: "5px 6px 5px 12px", fontSize: 12.5 }}>
                {p.full_name}
                <button type="button" onClick={() => remove(p.id)} style={{ width: 18, height: 18, padding: 0, borderRadius: "50%", background: "var(--border)", fontSize: 11, lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
        )}
        <UserSearchInput selected={null} onSelect={add} onClear={() => {}} />
        {error && <p className="error">{error}</p>}
        <button disabled={picked.length === 0 || starting} onClick={handleStart}>
          {starting ? "Boshlanmoqda..." : "Suhbatni boshlash"}
        </button>
      </div>
    </div>
  );
}

export default function Chat() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [companyId, setCompanyId] = useState(params.companyId || null);
  const [channels, setChannels] = useState([]);
  const [conversations, setConversations] = useState([]);

  const [activeKind, setActiveKind] = useState(params.conversationId ? "direct" : "channel");
  const [activeChannelId, setActiveChannelId] = useState(params.channelId || null);
  const [activeConversationId, setActiveConversationId] = useState(params.conversationId || null);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [file, setFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [channelMembers, setChannelMembers] = useState([]);
  const [mentionCandidates, setMentionCandidates] = useState([]);
  const [dmMembers, setDmMembers] = useState([]);
  const [showDmMembersPanel, setShowDmMembersPanel] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const membersPanelRef = useRef(null);

  useEffect(() => {
    if (params.companyId) {
      setCompanyId(params.companyId);
      return;
    }
    api.getMyCompanies().then((list) => setCompanyId(pickActiveCompany(list)?.id || null)).catch(() => setCompanyId(null));
  }, [params.companyId]);

  function refreshChannels() {
    if (!companyId) return;
    api.getChannels(companyId).then((list) => {
      setChannels(list);
      if (!activeChannelId && !activeConversationId && list.length > 0) {
        setActiveKind("channel");
        setActiveChannelId(list[0].id);
      }
    }).catch(() => {});
  }

  function refreshConversations() {
    api.getConversations().then(setConversations).catch(() => {});
  }

  useEffect(refreshChannels, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(refreshConversations, []);

  useEffect(() => {
    if (params.channelId) {
      setActiveKind("channel");
      setActiveChannelId(params.channelId);
    } else if (params.conversationId) {
      setActiveKind("direct");
      setActiveConversationId(params.conversationId);
    }
  }, [params.channelId, params.conversationId]);

  useEffect(() => {
    setShowMembersPanel(false);
    setShowDmMembersPanel(false);
  }, [activeChannelId, activeConversationId]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (membersPanelRef.current && !membersPanelRef.current.contains(e.target)) {
        setShowMembersPanel(false);
      }
    }
    if (showMembersPanel) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMembersPanel]);

  useEffect(() => {
    const id = activeKind === "channel" ? activeChannelId : activeConversationId;
    if (!id) return;

    if (activeKind === "channel") {
      api.getMessages(id).then(setMessages).catch(() => setMessages([]));
    } else {
      api.getDirectMessages(id).then(setMessages).catch(() => setMessages([]));
    }

    const path = activeKind === "channel" ? `/ws/chat/${id}` : `/ws/direct/${id}`;
    const socket = new WebSocket(wsUrl(path));
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message_updated") {
        setMessages((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      } else if (data.type === "message_deleted") {
        setMessages((prev) => prev.map((m) => (m.id === data.id ? { ...m, deleted: true, content: "Xabar o'chirildi" } : m)));
      } else {
        setMessages((prev) => [...prev, data]);
      }
    };
    socketRef.current = socket;
    return () => socket.close();
  }, [activeKind, activeChannelId, activeConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function selectChannel(id) {
    setActiveKind("channel");
    setActiveChannelId(id);
    navigate(`/chat/${companyId}/${id}`);
  }

  function selectConversation(id) {
    setActiveKind("direct");
    setActiveConversationId(id);
    navigate(`/direct-chat/${id}`);
  }

  function loadChannelMembers() {
    if (!companyId || !activeChannelId) return;
    api.getChannelMembers(companyId, activeChannelId).then(setChannelMembers).catch(() => setChannelMembers([]));
  }

  function toggleMembersPanel() {
    setShowMembersPanel((v) => {
      const next = !v;
      if (next) loadChannelMembers();
      return next;
    });
  }

  async function handleRemoveMember(userId) {
    try {
      await api.removeChannelMember(companyId, activeChannelId, userId);
      loadChannelMembers();
      refreshChannels();
    } catch {
      // ignore
    }
  }

  async function handleCloseChannel() {
    if (!activeChannelId) return;
    try {
      await api.deleteChannel(companyId, activeChannelId);
      setShowMembersPanel(false);
      const remaining = channels.filter((c) => c.id !== activeChannelId);
      setChannels(remaining);
      setActiveChannelId(remaining[0]?.id || null);
      navigate(remaining[0] ? `/chat/${companyId}/${remaining[0].id}` : `/chat/${companyId}`);
    } catch {
      // ignore
    }
  }

  async function handleRenameChannel() {
    if (!activeChannel) return;
    const newName = window.prompt("Kanalning yangi nomi:", activeChannel.name);
    if (!newName || !newName.trim() || newName.trim() === activeChannel.name) return;
    try {
      await api.renameChannel(companyId, activeChannel.id, newName.trim());
      refreshChannels();
    } catch {
      // ignore
    }
  }

  async function handleDeleteConversation() {
    if (!activeConversationId) return;
    try {
      await api.deleteConversation(activeConversationId);
      const remaining = conversations.filter((c) => c.id !== activeConversationId);
      setConversations(remaining);
      setActiveConversationId(null);
      setActiveKind("channel");
      navigate("/direct-chat");
    } catch {
      // ignore
    }
  }

  function loadDmMembers() {
    if (!activeConversationId) return;
    api.getConversationMembers(activeConversationId).then(setDmMembers).catch(() => setDmMembers([]));
  }

  function toggleDmMembersPanel() {
    setShowDmMembersPanel((v) => {
      const next = !v;
      if (next) loadDmMembers();
      return next;
    });
  }

  async function handleLeaveConversation() {
    if (!activeConversationId) return;
    try {
      await api.leaveConversation(activeConversationId);
      const remaining = conversations.filter((c) => c.id !== activeConversationId);
      setConversations(remaining);
      setActiveConversationId(null);
      setActiveKind("channel");
      setShowDmMembersPanel(false);
      navigate("/direct-chat");
    } catch {
      // ignore
    }
  }

  function handleDraftChange(e) {
    const value = e.target.value;
    setDraft(value);
    if (activeKind !== "channel") return;

    const cursor = e.target.selectionStart;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/#(\w*)$/);
    if (match && companyId && activeChannelId) {
      api.getMentionCandidates(companyId, activeChannelId, match[1]).then(setMentionCandidates).catch(() => setMentionCandidates([]));
    } else {
      setMentionCandidates([]);
    }
  }

  function pickMention(candidate) {
    const cursor = inputRef.current?.selectionStart ?? draft.length;
    const upToCursor = draft.slice(0, cursor);
    const rest = draft.slice(cursor);
    const newUpToCursor = upToCursor.replace(/#(\w*)$/, `#${candidate.key} `);
    setDraft(newUpToCursor + rest);
    setMentionCandidates([]);
    inputRef.current?.focus();
  }

  async function sendMessage(e) {
    e.preventDefault();
    if (activeKind === "channel") {
      if (!draft.trim() || !socketRef.current) return;
      socketRef.current.send(JSON.stringify({ content: draft, reply_to_id: replyTo?.id || null }));
      setDraft("");
      setReplyTo(null);
      setMentionCandidates([]);
    } else {
      if (!draft.trim() && !file) return;
      try {
        await api.sendDirectMessage(activeConversationId, draft, file);
        setDraft("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        refreshConversations();
      } catch {
        // ignore
      }
    }
  }

  async function handleForwardTo(targetChannelId) {
    if (!forwardMsg) return;
    try {
      await api.forwardMessage(targetChannelId, { content: forwardMsg.content, forwarded_from: forwardMsg.sender_name });
    } catch {
      // ignore
    }
    setForwardMsg(null);
  }

  async function handleSaveEdit(messageId) {
    try {
      if (activeKind === "channel") {
        await api.updateMessage(activeChannelId, messageId, editDraft);
      } else {
        await api.updateDirectMessage(activeConversationId, messageId, editDraft);
      }
      setEditingId(null);
    } catch {
      // ignore
    }
  }

  async function handleDelete(messageId) {
    try {
      if (activeKind === "channel") {
        await api.deleteMessage(activeChannelId, messageId);
      } else {
        await api.deleteDirectMessage(activeConversationId, messageId);
      }
    } catch {
      // ignore
    }
  }

  async function handleCreateChannel(name, memberIds) {
    const channel = await api.createChannel(companyId, { name, member_ids: memberIds });
    setShowNewChannel(false);
    refreshChannels();
    selectChannel(channel.id);
  }

  async function handleStartConversation(partnerIds) {
    const conv = await api.startConversation(partnerIds);
    refreshConversations();
    selectConversation(conv.id);
  }

  if (!companyId && channels.length === 0 && conversations.length === 0) {
    return (
      <AppShell>
        <div className="empty-card">
          <p>Chatdan foydalanish uchun avval kompaniya yarating yoki maxfiy suhbat boshlang.</p>
          <button onClick={() => navigate("/companies")}>+ Kompaniya yaratish</button>
        </div>
      </AppShell>
    );
  }

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const headerTitle =
    activeKind === "channel"
      ? activeChannel
        ? `#${activeChannel.name}`
        : "Chat"
      : activeConversation
      ? activeConversation.participants.map((p) => p.full_name).join(", ")
      : "Maxfiy chat";

  return (
    <AppShell>
      <div className="page-header">
        <h1>{headerTitle}</h1>
        <p>Jamoangiz va hamkorlaringiz bilan real vaqtda muloqot qiling.</p>
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ width: 210, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong style={{ fontSize: 12.5, color: "var(--text-dim)" }}>KANALLAR</strong>
            <button className="secondary" style={{ width: "auto", padding: "3px 8px", fontSize: 11 }} onClick={() => setShowNewChannel(true)}>+</button>
          </div>
          {channels.map((c) => (
            <div
              key={c.id}
              onClick={() => selectChannel(c.id)}
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: 13.5,
                marginBottom: 4,
                background: activeKind === "channel" && c.id === activeChannelId ? "var(--panel-2)" : "transparent",
                color: activeKind === "channel" && c.id === activeChannelId ? "var(--text)" : "var(--text-dim)",
              }}
            >
              #{c.name}
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 0 8px" }}>
            <strong style={{ fontSize: 12.5, color: "var(--text-dim)" }}>MAXFIY SUHBATLAR</strong>
            <button className="secondary" style={{ width: "auto", padding: "3px 8px", fontSize: 11 }} onClick={() => setShowNewConversation(true)}>+</button>
          </div>
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => selectConversation(c.id)}
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                fontSize: 13,
                marginBottom: 4,
                background: activeKind === "direct" && c.id === activeConversationId ? "var(--panel-2)" : "transparent",
                color: activeKind === "direct" && c.id === activeConversationId ? "var(--text)" : "var(--text-dim)",
              }}
            >
              🔒 {c.participants.map((p) => p.full_name).join(", ") || "Suhbat"}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {activeKind === "channel" && activeChannel && (
            <div ref={membersPanelRef} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, position: "relative" }}>
              <button className="secondary chat-members-btn" onClick={toggleMembersPanel}>
                👥 A'zolar ({activeChannel.member_count})
              </button>
              {showMembersPanel && (
                <div className="chat-members-panel">
                  <h4>Kanal a'zolari</h4>
                  {channelMembers.map((m) => (
                    <div className="chat-member-row" key={m.user_id}>
                      <div className="avatar-circle" style={{ width: 26, height: 26, fontSize: 10.5 }}>
                        {m.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="name">
                        {m.full_name}
                        {m.user_id === activeChannel.created_by && (
                          <span style={{ fontSize: 10.5, color: "var(--text-dim)", marginLeft: 6 }}>(egasi)</span>
                        )}
                      </span>
                      {m.user_id !== user?.id && m.user_id !== activeChannel.created_by && (
                        <button className="remove-btn" onClick={() => handleRemoveMember(m.user_id)}>Chiqarish</button>
                      )}
                    </div>
                  ))}
                  <button className="chat-members-add-btn" onClick={() => { setShowMembersPanel(false); setShowAddMembers(true); }}>
                    + A'zo qo'shish
                  </button>
                  {activeChannel.created_by === user?.id && (
                    <button className="secondary chat-members-add-btn" onClick={handleRenameChannel}>
                      ✏️ Nomini o'zgartirish
                    </button>
                  )}
                  {activeChannel.created_by === user?.id && (
                    <button className="secondary chat-members-add-btn" style={{ color: "#f87171" }} onClick={handleCloseChannel}>
                      🗑️ Kanalni yopish
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {activeKind === "direct" && activeConversation && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, position: "relative" }}>
              <button className="secondary chat-members-btn" onClick={toggleDmMembersPanel}>
                👥 A'zolar
              </button>
              {showDmMembersPanel && (
                <div className="chat-members-panel">
                  <h4>Suhbat a'zolari</h4>
                  {dmMembers.map((m) => (
                    <div className="chat-member-row" key={m.user_id}>
                      <div className="avatar-circle" style={{ width: 26, height: 26, fontSize: 10.5 }}>
                        {m.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="name">{m.full_name}</span>
                      <span
                        style={{
                          fontSize: 10.5,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: m.approved ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                          color: m.approved ? "var(--green)" : "var(--orange)",
                        }}
                      >
                        {m.approved ? "Active" : "Pending"}
                      </span>
                    </div>
                  ))}
                  <button className="secondary chat-members-add-btn" style={{ color: "var(--orange)" }} onClick={handleLeaveConversation}>
                    🚪 Chatdan chiqish
                  </button>
                  {activeConversation.created_by === user?.id && (
                    <button className="secondary chat-members-add-btn" style={{ color: "#f87171" }} onClick={handleDeleteConversation}>
                      🗑️ Suhbatni o'chirish
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="chat-page">
            <div className="messages">
              {messages.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: 14 }}>Hali xabar yo'q — birinchi bo'lib yozing!</p>}
              {messages.map((m) => {
                const isMine = m.sender_id === user?.id;
                const isEditing = editingId === m.id;
                return (
                  <div className={`message-row ${isMine ? "mine" : "theirs"}`} key={m.id}>
                    {!m.deleted && (
                      <div className="message-actions">
                        {activeKind === "channel" && <button type="button" onClick={() => setReplyTo(m)}>↩ Javob</button>}
                        {activeKind === "channel" && <button type="button" onClick={() => setForwardMsg(m)}>↪ Forward</button>}
                        {isMine && (
                          <button type="button" onClick={() => { setEditingId(m.id); setEditDraft(m.content || ""); }}>✏️</button>
                        )}
                        {isMine && <button type="button" onClick={() => handleDelete(m.id)}>🗑️</button>}
                      </div>
                    )}
                    <div className="message-bubble">
                      {m.forwarded_from && <span className="forwarded-label">↪ Forwarded from {m.forwarded_from}</span>}
                      {!isMine && <span className="sender">{m.sender_name || "Foydalanuvchi"}</span>}
                      {m.reply_to_id && (
                        <div className="reply-quote"><strong>{m.reply_sender_name}</strong>: {m.reply_preview}</div>
                      )}
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                          <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)} style={{ fontSize: 13.5 }} />
                          <button type="button" style={{ width: "auto", padding: "4px 10px", fontSize: 11 }} onClick={() => handleSaveEdit(m.id)}>Saqlash</button>
                          <button type="button" className="secondary" style={{ width: "auto", padding: "4px 10px", fontSize: 11 }} onClick={() => setEditingId(null)}>Bekor</button>
                        </div>
                      ) : (
                        <div className="dm-file-bubble">
                          {m.content}
                          {m.file_url && isImage(m.file_name) && (
                            <img
                              src={`${API_BASE}${m.file_url}`}
                              alt={m.file_name}
                              style={{ cursor: "zoom-in" }}
                              onClick={() => setLightboxUrl(`${API_BASE}${m.file_url}`)}
                            />
                          )}
                          {m.file_url && !isImage(m.file_name) && (
                            <a className="dm-file-link" href={`${API_BASE}${m.file_url}`} target="_blank" rel="noreferrer">📎 {m.file_name}</a>
                          )}
                          {m.edited && !m.deleted && <span style={{ fontSize: 10.5, color: "var(--text-dim)", marginLeft: 6 }}>(tahrirlangan)</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {replyTo && activeKind === "channel" && (
              <div className="reply-preview-bar">
                <span><strong>{replyTo.sender_name}</strong>ga javob: {replyTo.content.slice(0, 60)}</span>
                <button type="button" className="close-btn" onClick={() => setReplyTo(null)}>✕</button>
              </div>
            )}
            {file && activeKind === "direct" && (
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 6 }}>
                📎 {file.name} <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} style={{ width: "auto", padding: "2px 8px", fontSize: 10.5 }}>✕</button>
              </div>
            )}

            <div style={{ position: "relative" }}>
              {mentionCandidates.length > 0 && (
                <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 6, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden", zIndex: 10, minWidth: 220 }}>
                  {mentionCandidates.map((c) => (
                    <div key={c.key} onMouseDown={(e) => { e.preventDefault(); pickMention(c); }} style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid var(--border)" }}>
                      #{c.key} <span style={{ color: "var(--text-dim)", fontSize: 11.5 }}>— {c.label}</span>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={sendMessage}>
                {activeKind === "direct" && (
                  <>
                    <button type="button" className="secondary dm-attach-btn" onClick={() => fileInputRef.current?.click()}>📎</button>
                    <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </>
                )}
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={handleDraftChange}
                  placeholder={activeKind === "channel" ? "Xabar yozing... (#lavozim yoki #Ism bilan eslatish mumkin)" : "Xabar yozing..."}
                />
                <button type="submit">Yuborish</button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {forwardMsg && (
        <div className="forward-modal-backdrop" onClick={() => setForwardMsg(null)}>
          <div className="forward-modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Qaysi kanalga forward qilamiz?</h3>
            {channels.map((c) => (
              <div key={c.id} className="company-option" onClick={() => handleForwardTo(c.id)}>#{c.name}</div>
            ))}
            <button className="secondary" style={{ marginTop: 8 }} onClick={() => setForwardMsg(null)}>Bekor qilish</button>
          </div>
        </div>
      )}

      {showNewChannel && <NewChannelModal onClose={() => setShowNewChannel(false)} onConfirm={handleCreateChannel} />}
      {showNewConversation && <NewConversationModal onClose={() => setShowNewConversation(false)} onStart={handleStartConversation} />}

      {showAddMembers && activeChannel && (
        <MemberPickerModal
          title={`#${activeChannel.name}ga a'zo qo'shish`}
          confirmLabel="Qo'shish"
          onClose={() => setShowAddMembers(false)}
          onConfirm={async (ids) => {
            await api.addChannelMembers(companyId, activeChannel.id, ids);
            setShowAddMembers(false);
            refreshChannels();
            loadChannelMembers();
          }}
        />
      )}
      {lightboxUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 80,
            padding: 20,
            cursor: "zoom-out",
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 8 }} />
          <button
            className="secondary"
            style={{ position: "fixed", top: 20, right: 20, width: "auto", padding: "8px 14px" }}
            onClick={() => setLightboxUrl(null)}
          >
            ✕ Yopish
          </button>
        </div>
      )}
    </AppShell>
  );
}
