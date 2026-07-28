import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { wsUrl, api, API_BASE } from "../api/client";
import { useActiveCompany } from "../hooks/useCompany";
import { useAuth } from "../hooks/useAuth";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";
import { formatChatTime, isChatUnread, markChatRead, seedChatRead } from "../components/chatUnread";

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
function isImage(fileName) {
  if (!fileName) return false;
  const lower = fileName.toLowerCase();
  return IMAGE_EXT.some((ext) => lower.endsWith(ext));
}

function fileKindLabel(fileName) {
  if (!fileName) return "FILE";
  const ext = fileName.split(".").pop()?.toUpperCase() || "FILE";
  return ext.slice(0, 4);
}

function MemberPickerModal({ title, confirmLabel, onConfirm, onClose, companyId, excludeIds = [] }) {
  const [picked, setPicked] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const excluded = new Set(excludeIds.map(String));

  useEffect(() => {
    if (!companyId) return;
    api
      .getMembers(companyId)
      .then((list) => setTeammates(list.filter((m) => m.approved !== false)))
      .catch(() => setTeammates([]));
  }, [companyId]);

  function add(u) {
    const id = u.id || u.user_id;
    if (excluded.has(String(id))) return;
    setPicked((prev) => (prev.some((p) => String(p.id) === String(id)) ? prev : [...prev, { id, full_name: u.full_name, email: u.email }]));
    setInfo(null);
    setError(null);
  }
  function remove(id) {
    setPicked((prev) => prev.filter((p) => String(p.id) !== String(id)));
  }

  return (
    <div className="chat-modal-backdrop" onClick={onClose}>
      <div className="card chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-head">
          <h3>{title}</h3>
          <button type="button" className="secondary chat-soft-btn" onClick={onClose}>
            Yopish
          </button>
        </div>
        <p className="chat-modal-hint">Kompaniya aʼzosini tanlang yoki ism/email bo‘yicha qidiring.</p>

        {teammates.length > 0 && (
          <div className="chat-teammate-list">
            {teammates.slice(0, 12).map((m) => {
              const id = m.user_id || m.id;
              const alreadyIn = excluded.has(String(id));
              const alreadyPicked = picked.some((p) => String(p.id) === String(id));
              const disabled = alreadyIn || alreadyPicked;
              return (
                <button
                  key={id}
                  type="button"
                  className={`chat-teammate-item ${disabled ? "is-disabled" : ""}`}
                  disabled={disabled}
                  onClick={() => add(m)}
                >
                  <span className="avatar-circle chat-mini-avatar">{(m.full_name || "?").slice(0, 2).toUpperCase()}</span>
                  <span>{m.full_name}</span>
                  {alreadyIn ? <em>Kanalda</em> : alreadyPicked ? <em>Tanlandi</em> : <strong>+</strong>}
                </button>
              );
            })}
          </div>
        )}

        {picked.length > 0 && (
          <div className="chat-chip-row">
            {picked.map((p) => (
              <span key={p.id} className="chat-chip">
                {p.full_name}
                <button type="button" onClick={() => remove(p.id)} aria-label="Olib tashlash">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <UserSearchInput
          selected={null}
          onSelect={add}
          onClear={() => {}}
          disabledIds={[...excludeIds, ...picked.map((p) => p.id)]}
          disabledLabel="Allaqachon kanalda"
        />
        {error && <p className="error">{error}</p>}
        {info && <p className="chat-success-msg">{info}</p>}
        <button
          type="button"
          className="chat-cta"
          disabled={picked.length === 0 || saving}
          onClick={async () => {
            setError(null);
            setInfo(null);
            setSaving(true);
            try {
              const res = await onConfirm(picked.map((p) => p.id));
              if (res?.message) setInfo(res.message);
              else setInfo("Tayyor");
              setTimeout(() => onClose(), 700);
            } catch (err) {
              setError(err.message);
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Qo‘shilmoqda..." : confirmLabel}
        </button>
      </div>
    </div>
  );
}

function RenameChannelModal({ currentName, onClose, onConfirm }) {
  const [name, setName] = useState(currentName || "");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const next = name.trim();
    if (!next || next === currentName) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(next);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="chat-modal-backdrop" onClick={onClose}>
      <div className="card chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-head">
          <h3>Kanal nomini o‘zgartirish</h3>
          <button type="button" className="secondary chat-soft-btn" onClick={onClose}>
            Yopish
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Yangi nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="chat-cta" disabled={saving || !name.trim()}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
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
    <div className="chat-modal-backdrop" onClick={onClose}>
      <div className="card chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-head">
          <h3>Yangi kanal</h3>
          <button type="button" className="secondary chat-soft-btn" onClick={onClose}>
            Yopish
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Kanal nomi</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="masalan: moliya" required />
          <p className="chat-modal-hint">Aʼzolar ixtiyoriy — keyinroq ham qo‘shishingiz mumkin.</p>
          {picked.length > 0 && (
            <div className="chat-chip-row">
              {picked.map((p) => (
                <span key={p.id} className="chat-chip">
                  {p.full_name}
                  <button type="button" onClick={() => remove(p.id)} aria-label="Olib tashlash">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <UserSearchInput
            selected={null}
            onSelect={add}
            onClear={() => {}}
            disabledIds={picked.map((p) => p.id)}
            disabledLabel="Allaqachon tanlangan"
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="chat-cta">
            Kanal yaratish
          </button>
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
    <div className="chat-modal-backdrop" onClick={onClose}>
      <div className="card chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-head">
          <h3>Yangi suhbat</h3>
          <button type="button" className="secondary chat-soft-btn" onClick={onClose}>
            Yopish
          </button>
        </div>
        <p className="chat-modal-hint">
          Bir yoki bir nechta odamni tanlang. Har safar <strong>yangi parallel chat</strong> ochiladi — eski
          suhbatlar pastki qatorda qoladi.
        </p>
        {picked.length > 0 && (
          <div className="chat-chip-row">
            {picked.map((p) => (
              <span key={p.id} className="chat-chip">
                {p.full_name}
                <button type="button" onClick={() => remove(p.id)} aria-label="Olib tashlash">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <UserSearchInput
          selected={null}
          onSelect={add}
          onClear={() => {}}
          disabledIds={picked.map((p) => p.id)}
          disabledLabel="Allaqachon tanlangan"
        />
        {error && <p className="error">{error}</p>}
        <button type="button" className="chat-cta" disabled={picked.length === 0 || starting} onClick={handleStart}>
          {starting ? "Boshlanmoqda..." : "Yangi chat yaratish"}
        </button>
      </div>
    </div>
  );
}

function ChatLauncherModal({
  onClose,
  channels,
  conversations,
  canCreateChannel,
  onJoinChannel,
  onJoinConversation,
  onCreateChannel,
  onCreateConversation,
}) {
  const [tab, setTab] = useState("join"); // join | channel | conversation
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredChannels = channels.filter((c) => !q || `#${c.name}`.toLowerCase().includes(q));
  const filteredConversations = conversations.filter((c) => {
    const label = c.participants.map((p) => p.full_name).join(", ").toLowerCase();
    return !q || label.includes(q);
  });

  return (
    <div className="chat-modal-backdrop" onClick={onClose}>
      <div className="card chat-modal chat-launcher" onClick={(e) => e.stopPropagation()}>
        <div className="chat-modal-head">
          <h3>Chatlar</h3>
          <button type="button" className="secondary chat-soft-btn" onClick={onClose}>
            Yopish
          </button>
        </div>

        <div className="chat-launcher-tabs">
          <button type="button" className={tab === "join" ? "active" : ""} onClick={() => setTab("join")}>
            Mavjud chatlar
          </button>
          {canCreateChannel && (
            <button type="button" className={tab === "channel" ? "active" : ""} onClick={() => setTab("channel")}>
              Yangi kanal
            </button>
          )}
          <button
            type="button"
            className={tab === "conversation" ? "active" : ""}
            onClick={() => setTab("conversation")}
          >
            Yangi suhbat
          </button>
        </div>

        {tab === "join" && (
          <>
            <input
              className="chat-launcher-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Chat qidirish..."
            />
            <div className="chat-launcher-list">
              {filteredChannels.map((c) => (
                <button
                  key={`ch-${c.id}`}
                  type="button"
                  className="chat-launcher-item"
                  onClick={() => {
                    onJoinChannel(c.id);
                    onClose();
                  }}
                >
                  <strong>#{c.name}</strong>
                  <span>Kanal · {c.member_count || 0} aʼzo</span>
                </button>
              ))}
              {filteredConversations.map((c) => (
                <button
                  key={`dm-${c.id}`}
                  type="button"
                  className="chat-launcher-item"
                  onClick={() => {
                    onJoinConversation(c.id);
                    onClose();
                  }}
                >
                  <strong>{c.participants.map((p) => p.full_name).join(", ") || "Suhbat"}</strong>
                  <span>{c.last_message || "Maxfiy suhbat"}</span>
                </button>
              ))}
              {!filteredChannels.length && !filteredConversations.length && (
                <p className="chat-modal-hint">Hali chat yo‘q — yangi kanal yoki suhbat yarating.</p>
              )}
            </div>
          </>
        )}

        {tab === "channel" && canCreateChannel && (
          <div className="chat-launcher-embed">
            <p className="chat-modal-hint">Kompaniya ichida yangi guruh kanali ochiladi.</p>
            <button
              type="button"
              className="chat-cta"
              onClick={() => {
                onClose();
                onCreateChannel();
              }}
            >
              Kanal yaratish formasini ochish
            </button>
          </div>
        )}

        {tab === "conversation" && (
          <div className="chat-launcher-embed">
            <p className="chat-modal-hint">
              Yangi parallel maxfiy suhbat — bir xil odam bilan ham alohida chat ochishingiz mumkin.
            </p>
            <button
              type="button"
              className="chat-cta"
              onClick={() => {
                onClose();
                onCreateConversation();
              }}
            >
              Suhbat yaratish formasini ochish
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const params = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { company, loading: companyLoading } = useActiveCompany();

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
  const [showLauncher, setShowLauncher] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [channelMembers, setChannelMembers] = useState([]);
  const [mentionCandidates, setMentionCandidates] = useState([]);
  const [dmMembers, setDmMembers] = useState([]);
  const [showDmMembersPanel, setShowDmMembersPanel] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [unreadTick, setUnreadTick] = useState(0);

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const membersPanelRef = useRef(null);

  function bumpUnread() {
    setUnreadTick((n) => n + 1);
  }

  function markActiveRead(at) {
    if (activeKind === "channel" && activeChannelId) {
      markChatRead("channel", activeChannelId, at);
      bumpUnread();
    } else if (activeKind === "direct" && activeConversationId) {
      markChatRead("direct", activeConversationId, at);
      bumpUnread();
    }
  }

  useEffect(() => {
    if (params.companyId) {
      setCompanyId(params.companyId);
      return;
    }
    if (companyLoading) return;
    setCompanyId(company?.id || null);
  }, [params.companyId, company?.id, companyLoading]);

  function refreshChannels() {
    if (!companyId) return;
    api.getChannels(companyId).then((list) => {
      list.forEach((c) => seedChatRead("channel", c.id, c.last_message_at));
      setChannels(list);
      bumpUnread();
      if (!activeChannelId && !activeConversationId && list.length > 0) {
        setActiveKind("channel");
        setActiveChannelId(list[0].id);
      }
    }).catch(() => {});
  }

  function refreshConversations() {
    api
      .getConversations()
      .then((list) => {
        const chats = list.filter((c) => c.channel !== "office");
        chats.forEach((c) => seedChatRead("direct", c.id, c.last_message_at));
        setConversations(chats);
        bumpUnread();
      })
      .catch(() => {});
  }

  useEffect(refreshChannels, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(refreshConversations, []);

  // Keep dock unread badges fresh while other chats receive messages.
  useEffect(() => {
    const interval = setInterval(() => {
      refreshChannels();
      refreshConversations();
    }, 20000);
    return () => clearInterval(interval);
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const kind = activeKind === "channel" ? "channel" : "direct";
    markChatRead(kind, id);
    bumpUnread();

    const load = activeKind === "channel" ? api.getMessages(id) : api.getDirectMessages(id);
    load
      .then((list) => {
        setMessages(list);
        const last = list[list.length - 1];
        markChatRead(kind, id, last?.created_at || new Date().toISOString());
        bumpUnread();
      })
      .catch(() => setMessages([]));

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
        markChatRead(kind, id, data.created_at || new Date().toISOString());
        bumpUnread();
        if (kind === "direct") refreshConversations();
        else refreshChannels();
      }
    };
    socketRef.current = socket;
    return () => socket.close();
  }, [activeKind, activeChannelId, activeConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleRenameChannel(newName) {
    if (!activeChannel) return;
    await api.renameChannel(companyId, activeChannel.id, newName);
    refreshChannels();
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
      markActiveRead();
    } else {
      if (!draft.trim() && !file) return;
      try {
        await api.sendDirectMessage(activeConversationId, draft, file);
        setDraft("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        markActiveRead();
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
    if (!companyId) throw new Error("Kanal uchun avval kompaniya tanlang");
    const channel = await api.createChannel(companyId, { name, member_ids: memberIds });
    setShowNewChannel(false);
    refreshChannels();
    selectChannel(channel.id);
  }

  async function handleStartConversation(partnerIds) {
    // Always open a new parallel thread — existing ones stay in the bottom dock.
    const conv = await api.startConversation(partnerIds, "chat", true);
    refreshConversations();
    selectConversation(conv.id);
  }

  if (companyLoading && !params.companyId && channels.length === 0 && conversations.length === 0) {
    return (
      <AppShell>
        <div className="chat-workspace">
          <div className="chat-empty-hero">
            <h2>Chat markazi</h2>
            <p>Yuklanmoqda...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!companyId && channels.length === 0 && conversations.length === 0) {
    return (
      <AppShell>
        <div className="chat-workspace">
          <div className="chat-empty-hero">
            <h2>Chat markazi</h2>
            <p>Kompaniya kanallari yoki maxfiy suhbatlar — bir nechta live chat birga ishlaydi.</p>
            <div className="chat-empty-actions">
              <button type="button" className="chat-cta" onClick={() => setShowNewConversation(true)}>
                Yangi suhbat
              </button>
              <button type="button" className="secondary" onClick={() => navigate("/companies")}>
                Kompaniya yaratish
              </button>
            </div>
          </div>
        </div>
        {showNewConversation && (
          <NewConversationModal onClose={() => setShowNewConversation(false)} onStart={handleStartConversation} />
        )}
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

  const headerHint =
    activeKind === "channel"
      ? activeChannel?.last_message
        ? activeChannel.last_message
        : "Kanalda jamoa bilan yozing — #bilan eslatish mumkin."
      : activeConversation?.last_message
      ? activeConversation.last_message
      : "Maxfiy parallel suhbat — fayl yuborish mumkin.";

  void unreadTick;
  const liveChats = [
    ...channels.map((c) => ({
      key: `ch-${c.id}`,
      kind: "channel",
      id: c.id,
      label: `#${c.name}`,
      preview: c.last_message || "",
      active: activeKind === "channel" && c.id === activeChannelId,
      unread: isChatUnread("channel", c.id, c.last_message_at),
    })),
    ...conversations.map((c) => ({
      key: `dm-${c.id}`,
      kind: "direct",
      id: c.id,
      label: c.participants.map((p) => p.full_name).join(", ") || "Suhbat",
      preview: c.last_message || "",
      active: activeKind === "direct" && c.id === activeConversationId,
      unread: isChatUnread("direct", c.id, c.last_message_at),
    })),
  ];

  const unreadTotal = liveChats.filter((c) => c.unread && !c.active).length;

  return (
    <AppShell>
      <div className="chat-workspace">
        <div className="chat-workspace-head">
          <div>
            <p className="chat-kicker">Live Chat Hub</p>
            <h1>{headerTitle}</h1>
            <p className="chat-head-preview">{headerHint}</p>
          </div>
          <div className="chat-head-actions">
            {unreadTotal > 0 && <span className="chat-unread-pill">{unreadTotal} ta yangi</span>}
            <button type="button" className="chat-cta" onClick={() => setShowLauncher(true)}>
              Chatlar / Yangi
            </button>
          </div>
        </div>

        <div className="chat-workspace-body">
          <aside className="chat-side-list">
            <div className="chat-side-section">
              <div className="chat-side-head">
                <strong>Kanallar</strong>
                <button type="button" className="secondary chat-soft-btn" onClick={() => setShowNewChannel(true)} disabled={!companyId}>
                  +
                </button>
              </div>
              {channels.map((c) => {
                const unread = isChatUnread("channel", c.id, c.last_message_at);
                const active = activeKind === "channel" && c.id === activeChannelId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`chat-side-item ${active ? "active" : ""} ${unread && !active ? "has-unread" : ""}`}
                    onClick={() => selectChannel(c.id)}
                  >
                    <span className="chat-side-item-main">
                      <span className="chat-side-item-title">#{c.name}</span>
                      {c.last_message && <span className="chat-side-item-preview">{c.last_message}</span>}
                    </span>
                    <span className="chat-side-item-meta">
                      {c.last_message_at && <span>{formatChatTime(c.last_message_at)}</span>}
                      {unread && !active && <i className="chat-unread-dot" aria-label="O‘qilmagan" />}
                    </span>
                  </button>
                );
              })}
              {!channels.length && <p className="chat-side-empty">Kanal yo‘q</p>}
            </div>

            <div className="chat-side-section">
              <div className="chat-side-head">
                <strong>Suhbatlar</strong>
                <button type="button" className="secondary chat-soft-btn" onClick={() => setShowNewConversation(true)}>
                  +
                </button>
              </div>
              {conversations.map((c) => {
                const unread = isChatUnread("direct", c.id, c.last_message_at);
                const active = activeKind === "direct" && c.id === activeConversationId;
                const title = c.participants.map((p) => p.full_name).join(", ") || "Suhbat";
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`chat-side-item ${active ? "active" : ""} ${unread && !active ? "has-unread" : ""}`}
                    onClick={() => selectConversation(c.id)}
                  >
                    <span className="chat-side-item-main">
                      <span className="chat-side-item-title">{title}</span>
                      {c.last_message && <span className="chat-side-item-preview">{c.last_message}</span>}
                    </span>
                    <span className="chat-side-item-meta">
                      {c.last_message_at && <span>{formatChatTime(c.last_message_at)}</span>}
                      {unread && !active && <i className="chat-unread-dot" aria-label="O‘qilmagan" />}
                    </span>
                  </button>
                );
              })}
              {!conversations.length && <p className="chat-side-empty">Suhbat yo‘q</p>}
            </div>
          </aside>

          <div className="chat-main-pane">
            {(activeChannel || activeConversation) && (
              <div className="chat-room-bar" ref={membersPanelRef}>
                <div className="chat-room-bar-copy">
                  <strong>{headerTitle}</strong>
                  <span>
                    {activeKind === "channel"
                      ? `${activeChannel?.member_count || 0} aʼzo`
                      : `${activeConversation?.participants?.length || 0} ishtirokchi`}
                  </span>
                </div>
                <div className="chat-room-bar-actions">
                  {activeKind === "channel" && activeChannel && (
                    <>
                      <button
                        type="button"
                        className="chat-cta chat-soft-btn"
                        onClick={() => {
                          loadChannelMembers();
                          setShowMembersPanel(false);
                          setShowAddMembers(true);
                        }}
                      >
                        + Aʼzo
                      </button>
                      <button type="button" className="secondary chat-soft-btn" onClick={toggleMembersPanel}>
                        Aʼzolar
                      </button>
                    </>
                  )}
                  {activeKind === "direct" && activeConversation && (
                    <button type="button" className="secondary chat-soft-btn" onClick={toggleDmMembersPanel}>
                      Aʼzolar
                    </button>
                  )}
                </div>

                {showMembersPanel && activeChannel && (
                  <div className="chat-members-panel">
                    <h4>Kanal aʼzolari</h4>
                    {channelMembers.map((m) => (
                      <div className="chat-member-row" key={m.user_id}>
                        <div className="avatar-circle chat-mini-avatar">{m.full_name.slice(0, 2).toUpperCase()}</div>
                        <span className="name">
                          {m.full_name}
                          {m.user_id === activeChannel.created_by && <span className="chat-owner-tag">egasi</span>}
                        </span>
                        {m.approved === false && <span className="chat-status-pill pending">Kutilmoqda</span>}
                        {m.user_id !== user?.id && m.user_id !== activeChannel.created_by && (
                          <button type="button" className="remove-btn" onClick={() => handleRemoveMember(m.user_id)}>
                            Chiqarish
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      className="chat-members-add-btn"
                      onClick={() => {
                        loadChannelMembers();
                        setShowMembersPanel(false);
                        setShowAddMembers(true);
                      }}
                    >
                      + Aʼzo qo‘shish
                    </button>
                    {activeChannel.created_by === user?.id && (
                      <button
                        type="button"
                        className="secondary chat-members-add-btn"
                        onClick={() => {
                          setShowMembersPanel(false);
                          setShowRename(true);
                        }}
                      >
                        Nomini o‘zgartirish
                      </button>
                    )}
                    {activeChannel.created_by === user?.id && (
                      <button type="button" className="secondary chat-members-add-btn chat-danger-btn" onClick={handleCloseChannel}>
                        Kanalni yopish
                      </button>
                    )}
                  </div>
                )}

                {showDmMembersPanel && activeConversation && (
                  <div className="chat-members-panel">
                    <h4>Suhbat aʼzolari</h4>
                    {dmMembers.map((m) => (
                      <div className="chat-member-row" key={m.user_id}>
                        <div className="avatar-circle chat-mini-avatar">{m.full_name.slice(0, 2).toUpperCase()}</div>
                        <span className="name">{m.full_name}</span>
                        <span className={`chat-status-pill ${m.approved ? "ok" : "pending"}`}>
                          {m.approved ? "Active" : "Pending"}
                        </span>
                      </div>
                    ))}
                    <button type="button" className="secondary chat-members-add-btn" onClick={handleLeaveConversation}>
                      Chatdan chiqish
                    </button>
                    {activeConversation.created_by === user?.id && (
                      <button type="button" className="secondary chat-members-add-btn chat-danger-btn" onClick={handleDeleteConversation}>
                        Suhbatni o‘chirish
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="chat-page chat-stage">
              <div className="messages chat-messages">
                {messages.length === 0 && (
                  <div className="chat-messages-empty">
                    <strong>Suhbat bo‘sh</strong>
                    <p>Birinchi xabarni yozing — bu yerda live oqim ochiladi.</p>
                  </div>
                )}
                {messages.map((m) => {
                  const isMine = m.sender_id === user?.id;
                  const isEditing = editingId === m.id;
                  return (
                    <div className={`message-row ${isMine ? "mine" : "theirs"} ${m.deleted ? "is-deleted" : ""}`} key={m.id}>
                      {!m.deleted && (
                        <div className="message-actions">
                          {activeKind === "channel" && (
                            <button type="button" onClick={() => setReplyTo(m)}>
                              Javob
                            </button>
                          )}
                          {activeKind === "channel" && (
                            <button type="button" onClick={() => setForwardMsg(m)}>
                              Forward
                            </button>
                          )}
                          {isMine && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(m.id);
                                setEditDraft(m.content || "");
                              }}
                            >
                              Tahrir
                            </button>
                          )}
                          {isMine && (
                            <button type="button" onClick={() => handleDelete(m.id)}>
                              O‘chirish
                            </button>
                          )}
                        </div>
                      )}
                      <div className="message-bubble">
                        {m.forwarded_from && <span className="forwarded-label">Forward: {m.forwarded_from}</span>}
                        {!isMine && <span className="sender">{m.sender_name || "Foydalanuvchi"}</span>}
                        {m.reply_to_id && (
                          <div className="reply-quote">
                            <strong>{m.reply_sender_name}</strong>: {m.reply_preview}
                          </div>
                        )}
                        {isEditing ? (
                          <div className="chat-edit-row">
                            <input value={editDraft} onChange={(e) => setEditDraft(e.target.value)} />
                            <button type="button" className="chat-mini-btn" onClick={() => handleSaveEdit(m.id)}>
                              Saqlash
                            </button>
                            <button type="button" className="secondary chat-mini-btn" onClick={() => setEditingId(null)}>
                              Bekor
                            </button>
                          </div>
                        ) : (
                          <div className="chat-bubble-body">
                            {m.content ? <p className="chat-bubble-text">{m.content}</p> : null}
                            {m.file_url && isImage(m.file_name) && (
                              <button
                                type="button"
                                className="chat-image-attach"
                                onClick={() => setLightboxUrl(`${API_BASE}${m.file_url}`)}
                              >
                                <img src={`${API_BASE}${m.file_url}`} alt={m.file_name || "Rasm"} />
                              </button>
                            )}
                            {m.file_url && !isImage(m.file_name) && (
                              <a className="chat-file-attach" href={`${API_BASE}${m.file_url}`} target="_blank" rel="noreferrer">
                                <span className="chat-file-attach-icon" aria-hidden>
                                  {fileKindLabel(m.file_name)}
                                </span>
                                <span className="chat-file-attach-copy">
                                  <strong title={m.file_name}>{m.file_name}</strong>
                                  <small>Yuklab olish</small>
                                </span>
                              </a>
                            )}
                            <div className="chat-bubble-meta">
                              {m.edited && !m.deleted && <span>tahrirlangan</span>}
                              {m.created_at && <span>{formatChatTime(m.created_at)}</span>}
                            </div>
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
                  <span>
                    <strong>{replyTo.sender_name}</strong>ga javob: {replyTo.content.slice(0, 60)}
                  </span>
                  <button type="button" className="close-btn" onClick={() => setReplyTo(null)}>
                    ✕
                  </button>
                </div>
              )}
              {file && activeKind === "direct" && (
                <div className="chat-file-chip">
                  <span>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="chat-composer-wrap">
                {mentionCandidates.length > 0 && (
                  <div className="chat-mention-menu">
                    {mentionCandidates.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pickMention(c);
                        }}
                      >
                        <strong>#{c.key}</strong>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                <form className="chat-composer" onSubmit={sendMessage}>
                  {activeKind === "direct" && (
                    <>
                      <button type="button" className="secondary chat-attach-btn" onClick={() => fileInputRef.current?.click()} title="Fayl">
                        +
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: "none" }}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </>
                  )}
                  <input
                    ref={inputRef}
                    value={draft}
                    onChange={handleDraftChange}
                    placeholder={
                      activeKind === "channel"
                        ? "Xabar yozing…  (#lavozim yoki #Ism)"
                        : "Xabar yozing…"
                    }
                  />
                  <button type="submit" className="chat-send-btn">
                    Yuborish
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="chat-live-dock" aria-label="Live chatlar">
          <div className="chat-live-scroll">
            {liveChats.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`chat-live-chip ${item.active ? "active" : ""} ${item.kind} ${item.unread && !item.active ? "unread" : ""}`}
                onClick={() => (item.kind === "channel" ? selectChannel(item.id) : selectConversation(item.id))}
                title={item.preview || item.label}
              >
                <span className="chat-live-dot" aria-hidden />
                <span className="chat-live-label">{item.label}</span>
                {item.unread && !item.active && <i className="chat-unread-dot" />}
              </button>
            ))}
            {!liveChats.length && <span className="chat-live-empty">Hali ochiq chat yo‘q</span>}
          </div>
          <button type="button" className="chat-live-add" onClick={() => setShowLauncher(true)} title="Chatga kirish yoki yangi yaratish">
            +
          </button>
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

      {showLauncher && (
        <ChatLauncherModal
          onClose={() => setShowLauncher(false)}
          channels={channels}
          conversations={conversations}
          canCreateChannel={!!companyId}
          onJoinChannel={selectChannel}
          onJoinConversation={selectConversation}
          onCreateChannel={() => setShowNewChannel(true)}
          onCreateConversation={() => setShowNewConversation(true)}
        />
      )}
      {showNewChannel && <NewChannelModal onClose={() => setShowNewChannel(false)} onConfirm={handleCreateChannel} />}
      {showNewConversation && <NewConversationModal onClose={() => setShowNewConversation(false)} onStart={handleStartConversation} />}
      {showRename && activeChannel && (
        <RenameChannelModal
          currentName={activeChannel.name}
          onClose={() => setShowRename(false)}
          onConfirm={handleRenameChannel}
        />
      )}

      {showAddMembers && activeChannel && (
        <MemberPickerModal
          title={`#${activeChannel.name}ga a'zo qo'shish`}
          confirmLabel="Qo'shish"
          companyId={companyId}
          excludeIds={[user?.id, ...channelMembers.map((m) => m.user_id)]}
          onClose={() => setShowAddMembers(false)}
          onConfirm={async (ids) => {
            const res = await api.addChannelMembers(companyId, activeChannel.id, ids);
            refreshChannels();
            loadChannelMembers();
            return res;
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
