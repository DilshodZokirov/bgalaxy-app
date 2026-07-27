import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import AuthOrbitShell from "../components/AuthOrbitShell";

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

  if (done) {
    return (
      <AuthOrbitShell
        kicker="Unlocked"
        title="Tayyor!"
        subtitle="PIN-kodingiz yangilandi — stansiyaga qaytishingiz mumkin."
      >
        <h2>PIN yangilandi</h2>
        <p className="subtitle">Ekran qulfi endi yangi kod bilan ochiladi.</p>
      </AuthOrbitShell>
    );
  }

  return (
    <AuthOrbitShell
      kicker="Secure dock"
      title="Yangi PIN o'rnatish"
      subtitle="Email orqali kelgan havola orqali yangi PIN kiriting."
      footer={
        <p className="auth-footer">
          <Link to="/dashboard">← Ilovaga qaytish</Link>
        </p>
      }
    >
      <h2>Yangi PIN</h2>
      <p className="subtitle">4–6 ta raqamdan iborat yangi PIN yarating.</p>
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
    </AuthOrbitShell>
  );
}
