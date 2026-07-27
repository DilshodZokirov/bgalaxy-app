import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function LockScreen() {
  const { unlockScreen, user } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      await api.verifyPin(pin);
      unlockScreen();
      setPin("");
    } catch (err) {
      setError(err.message);
      setPin("");
    } finally {
      setChecking(false);
    }
  }

  async function handleForgot() {
    setError(null);
    setForgotSending(true);
    try {
      await api.forgotPin();
      setForgotSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setForgotSending(false);
    }
  }

  return (
    <div className="lock-screen">
      <div className="lock-screen-card">
        <div className="lock-screen-icon" aria-hidden>
          🔒
        </div>
        <h2>Ekran qulflangan</h2>
        <p>Davom etish uchun PIN-kodni kiriting</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            className="lock-screen-pin"
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={checking || pin.length < 4}>
            {checking ? "Tekshirilmoqda..." : "Qulfni ochish"}
          </button>
        </form>

        <div className="lock-screen-forgot">
          {forgotSent ? (
            <p className="lock-screen-sent">
              ✓ Tiklash havolasi {user?.email ? `${user.email} ga` : "emailingizga"} yuborildi.
            </p>
          ) : (
            <button type="button" className="secondary" onClick={handleForgot} disabled={forgotSending}>
              {forgotSending ? "Yuborilmoqda..." : "PINni unutdingizmi?"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
