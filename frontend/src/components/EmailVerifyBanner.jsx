import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";

export default function EmailVerifyBanner() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  if (!user || user.email_verified) return null;

  async function handleResend() {
    setSending(true);
    setError(null);
    try {
      await api.resendVerification(user.email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        background: "rgba(245, 158, 11, 0.12)",
        border: "1px solid rgba(245, 158, 11, 0.35)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 16px",
        margin: "0 0 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        fontSize: 13,
      }}
    >
      <span>
        ⚠️ Email manzilingiz ({user.email}) hali tasdiqlanmagan.
        {sent && <span style={{ color: "var(--green)", marginLeft: 6 }}>✓ Qayta yuborildi!</span>}
        {error && <span style={{ color: "#f87171", marginLeft: 6 }}>{error}</span>}
      </span>
      <button
        className="secondary"
        style={{ width: "auto", padding: "6px 14px", fontSize: 12.5 }}
        onClick={handleResend}
        disabled={sending || sent}
      >
        {sending ? "Yuborilmoqda..." : sent ? "Yuborildi" : "Qayta yuborish"}
      </button>
    </div>
  );
}
