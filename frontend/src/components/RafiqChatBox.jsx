import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { getActiveCompanyId, setActiveCompanyId } from "../hooks/useCompany";
import RafiqAvatar from "./RafiqAvatar";

const SUGGESTIONS = [
  { label: "Uchrashuv yaratish", prompt: "Yangi uchrashuv yarat", icon: "meet" },
  { label: "Vazifalarimni ko'rsat", prompt: "Mening vazifalarimni ko'rsat", icon: "tasks" },
  { label: "Mijoz tahlili qilish", prompt: "Mijoz tahlili qilishga yordam ber", icon: "chart" },
  { label: "Tarjima qilish", prompt: "Matnni tarjima qilishga yordam ber", icon: "translate" },
  { label: "Eslatma qo'yish", prompt: "Eslatma qo'yishga yordam ber", icon: "bell" },
];

function ChipIcon({ type }) {
  if (type === "meet") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 16.5v-9Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M16 10.2 20 8v8l-4-2.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "tasks") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M8 6h12M8 12h12M8 18h12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="m4 6 1.2 1.2L7.2 5M4 12l1.2 1.2L7.2 11M4 18l1.2 1.2L7.2 17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "chart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "translate") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 5h9M8.5 5v2a7 7 0 0 0 7 7M11 8.5h7.5M14.5 8.5c0 4 2 7 5.5 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="m5 19 3.5-8 3.5 8M6.4 16h4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 4a5 5 0 0 0-5 5v3.2c0 .4-.1.8-.4 1.1L5.4 15A1.2 1.2 0 0 0 6.3 17h11.4a1.2 1.2 0 0 0 .9-2l-1.2-1.7c-.3-.3-.4-.7-.4-1.1V9a5 5 0 0 0-5-5Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

// Text-only here: wake-word voice mode lives on RafiqFloatingButton.
export default function RafiqChatBox({ compact = false, onClose }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

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
      inputRef.current?.focus();
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  const showHero = !compact && messages.length === 0 && !loading;

  if (compact) {
    return (
      <div className="rafiq-page rafiq-page-compact">
        <div className="rafiq-popup-header">
          <RafiqAvatar size={28} variant="photo" />
          <strong>AI Ziyo</strong>
          {onClose && (
            <button className="close-btn" onClick={onClose} title="Yopish" type="button">
              ✕
            </button>
          )}
        </div>
        <div className="rafiq-log">
          {messages.length === 0 && (
            <div className="rafiq-msg assistant">Salom! Men Ziyo. Sizga qanday yordam bera olaman?</div>
          )}
          {messages.map((m) => (
            <div className={`rafiq-msg ${m.role}`} key={m.id}>
              {m.content}
            </div>
          ))}
          {loading && <div className="rafiq-msg assistant">Yozmoqda...</div>}
          <div ref={bottomRef} />
        </div>
        {error && <p className="error">{error}</p>}
        <form className="ziyo-composer" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Savolingizni yozing..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !draft.trim()} aria-label="Yuborish">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M4 12 20 4l-5.5 16-3.2-6.3L4 12Z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`ziyo-page ${showHero ? "is-hero" : "is-chat"}`}>
      <div className="ziyo-brand-row">
        <p className="ziyo-brand">AI Ziyo</p>
        {!showHero && (
          <div className="ziyo-online">
            <span className="dot" />
            Onlayn
          </div>
        )}
      </div>

      {showHero ? (
        <section className="ziyo-hero" aria-label="Ziyo salomlashuvi">
          <div className="ziyo-hero-visual">
            <span className="ziyo-wave" aria-hidden />
            <span className="ziyo-wave delay" aria-hidden />
            <img className="ziyo-hero-img" src="/ziyo-hero.jpg" alt="Ziyo" draggable={false} />
          </div>
          <h1>Salom! Men Ziyo.</h1>
          <p>Sizga qanday yordam bera olaman?</p>
          <div className="ziyo-chips">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                type="button"
                className="ziyo-chip"
                onClick={() => sendMessage(s.prompt)}
              >
                <span className="ziyo-chip-icon">
                  <ChipIcon type={s.icon} />
                </span>
                {s.label}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="ziyo-chat">
          <div className="rafiq-log ziyo-log">
            {messages.map((m) => (
              <div className={`rafiq-msg ${m.role}`} key={m.id}>
                {m.content}
              </div>
            ))}
            {loading && <div className="rafiq-msg assistant">Yozmoqda...</div>}
            <div ref={bottomRef} />
          </div>
          {messages.length > 0 && (
            <div className="ziyo-chips ziyo-chips-inline">
              {SUGGESTIONS.slice(0, 3).map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="ziyo-chip"
                  onClick={() => sendMessage(s.prompt)}
                  disabled={loading}
                >
                  <span className="ziyo-chip-icon">
                    <ChipIcon type={s.icon} />
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="error ziyo-error">{error}</p>}

      <form className="ziyo-composer" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Savolingizni yozing..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !draft.trim()} aria-label="Yuborish">
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d="M4 12 20 4l-5.5 16-3.2-6.3L4 12Z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  );
}
