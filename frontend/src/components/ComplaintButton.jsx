import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function ComplaintButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && user?.email && !email) {
      setEmail(user.email);
    }
  }, [open, user, email]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.submitComplaint(message.trim(), window.location.pathname, email.trim());
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setSent(false);
          setError(null);
          if (user?.email) setEmail(user.email);
        }}
        title="Fikr yoki shikoyat bildirish"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 40,
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontSize: 18,
          padding: 0,
        }}
      >
        📢
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 90,
            padding: 20,
          }}
          onClick={() => setOpen(false)}
        >
          <div className="card" style={{ maxWidth: 400, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>📢 Fikr yoki shikoyat</h3>
              <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            {sent ? (
              <p style={{ color: "var(--green)" }}>✓ Rahmat! Xabaringiz yuborildi. Tez orada emailingizga javob yozamiz.</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <label style={{ display: "block", fontSize: 12.5, color: "var(--text-dim)", marginBottom: 6 }}>
                  Email manzilingiz
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="siz@email.com"
                  required
                  style={{
                    width: "100%",
                    background: "var(--panel-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    marginBottom: 12,
                  }}
                />
                <label style={{ display: "block", fontSize: 12.5, color: "var(--text-dim)", marginBottom: 6 }}>
                  Xabar
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nima muammo bor yoki qanday taklifingiz bor?"
                  rows={5}
                  style={{
                    width: "100%",
                    background: "var(--panel-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: "var(--radius-sm)",
                    padding: 10,
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    marginBottom: 12,
                    resize: "vertical",
                  }}
                  required
                />
                <p style={{ fontSize: 11.5, color: "var(--text-dim)", margin: "0 0 12px" }}>
                  Javobni shu email manziliga yozamiz.
                </p>
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={sending || !email.trim() || !message.trim()}>
                  {sending ? "Yuborilmoqda..." : "Yuborish"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
