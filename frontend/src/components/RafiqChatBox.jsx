import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getActiveCompanyId, setActiveCompanyId } from "../hooks/useCompany";
import RafiqAvatar from "./RafiqAvatar";

const SUGGESTIONS = [
  "Yangi kompaniya yarat",
  "Uchrashuv boshla",
  "Jamoamga salom deb xabar yubor",
  "BG (Business Galaxy)'da nima qila olaman?",
];

// Text-only per his request: no mic input, no voice replies here at all —
// the floating Ziyo widget (RafiqFloatingButton) is where the wake-word
// voice mode lives now, kept fully separate from this page.
export default function RafiqChatBox({ compact = false, onClose }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    api
      .getRafiqMessages()
      .then(setMessages)
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text) {
    const content = (text ?? draft).trim();
    if (!content || loading) return;
    setError(null);
    setDraft("");
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", content }]);
    setLoading(true);
    try {
      const activeCompanyId = getActiveCompanyId();
      const reply = await api.sendRafiqMessage(content, activeCompanyId);
      setMessages((prev) => [...prev, reply]);
      if (reply.client_action?.type === "navigate") {
        if (reply.client_action.set_active_company_id) {
          setActiveCompanyId(reply.client_action.set_active_company_id);
        }
        setTimeout(() => navigate(reply.client_action.path), 900);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  return (
    <div className="rafiq-page">
      {!compact && (
        <div className="rafiq-page-header">
          <RafiqAvatar size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>AI Ziyo</div>
            <div className="status">
              <span className="dot" />
              Onlayn
            </div>
          </div>
        </div>
      )}

      {compact && (
        <div className="rafiq-popup-header">
          <RafiqAvatar size={28} />
          <strong style={{ fontSize: 13.5 }}>AI Ziyo</strong>
          {onClose && (
            <button className="close-btn" onClick={onClose} title="Yopish" style={{ marginLeft: "auto" }}>
              ✕
            </button>
          )}
        </div>
      )}

      <div className="rafiq-log">
        {messages.length === 0 && <div className="rafiq-msg assistant">Salom! Men Ziyo 👋 Sizga qanday yordam bera olaman?</div>}
        {messages.map((m) => (
          <div className={`rafiq-msg ${m.role}`} key={m.id}>
            {m.content}
          </div>
        ))}
        {loading && <div className="rafiq-msg assistant">Yozmoqda...</div>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="error" style={{ margin: "8px 10px" }}>{error}</p>}

      {!compact && messages.length === 0 && (
        <div className="rafiq-suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="rafiq-suggestion" onClick={() => sendMessage(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Savolingizni yozing..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {compact ? "→" : "Yuborish"}
        </button>
      </form>
    </div>
  );
}
