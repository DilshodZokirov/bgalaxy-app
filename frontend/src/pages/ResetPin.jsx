import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/Logo";

export default function ResetPin() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { unlockScreen, refreshUser, user } = useAuth();
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (pin !== confirm) {
      setError("PIN kodlar mos kelmadi");
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError("PIN 4–6 ta raqamdan iborat bo'lsin");
      return;
    }
    setLoading(true);
    try {
      await api.resetPin(token, pin);
      setDone(true);
      if (user) {
        await refreshUser();
        unlockScreen();
        setTimeout(() => navigate("/dashboard"), 1200);
      } else {
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Logo withTagline />
        {done ? (
          <>
            <h1>✓ Tayyor!</h1>
            <p className="subtitle">PIN-kodingiz yangilandi.</p>
          </>
        ) : (
          <>
            <h1>Yangi PIN o'rnatish</h1>
            <p className="subtitle">Email orqali kelgan havola orqali yangi PIN kiriting.</p>
            <form onSubmit={handleSubmit}>
              <label>Yangi PIN (4–6 raqam)</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                required
                style={{ letterSpacing: 6, textAlign: "center", fontSize: 20 }}
              />
              <label>PINni takrorlang</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                required
                style={{ letterSpacing: 6, textAlign: "center", fontSize: 20 }}
              />
              {error && <p className="error">{error}</p>}
              <button type="submit" disabled={loading || pin.length < 4}>
                {loading ? "Saqlanmoqda..." : "PIN o'rnatish"}
              </button>
            </form>
            <p className="auth-footer">
              <Link to="/dashboard">← Ilovaga qaytish</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
