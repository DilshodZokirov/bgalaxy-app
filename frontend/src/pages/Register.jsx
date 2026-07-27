import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { getPendingInvite } from "../hooks/usePendingInvite";
import AuthOrbitShell from "../components/AuthOrbitShell";
import GoogleAuthButton from "../components/GoogleAuthButton";

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.register({ full_name: fullName, email, password });
      setRegistered(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSuccess(res) {
    login(res);
    const pendingInvite = getPendingInvite();
    navigate(pendingInvite ? `/invite/${pendingInvite}` : "/dashboard");
  }

  if (registered) {
    return (
      <AuthOrbitShell
        kicker="Signal sent"
        title="Emailingizni tekshiring"
        subtitle="Galaktikaga kirish uchun tasdiqlash havolasini bosing."
        footer={
          <p className="auth-footer">
            <Link to="/login">← Kirish sahifasiga o'tish</Link>
          </p>
        }
      >
        <h2>Xabar yuborildi</h2>
        <p className="subtitle">
          <strong>{email}</strong> manziliga tasdiqlash havolasi yubordik — havolani bosgach, tizimga kira olasiz.
        </p>
        <Link to="/login">
          <button type="button">Kirish sahifasiga o'tish</button>
        </Link>
      </AuthOrbitShell>
    );
  }

  return (
    <AuthOrbitShell
      kicker="First orbit"
      title="O'z galaktikangizni yarating"
      subtitle="Bir necha soniyada ro'yxatdan o'ting — Ziyo sizni kutmoqda."
      footer={
        <p className="auth-footer">
          Hisobingiz bormi? <Link to="/login">Kiring</Link>
        </p>
      }
    >
      <h2>Ro'yxatdan o'tish</h2>
      <p className="subtitle">Kelajakdagi ish muhitingiz shu yerdan boshlanadi.</p>
      <form onSubmit={handleSubmit}>
        <label>To'liq ism</label>
        <input
          type="text"
          placeholder="Dilshod Z."
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <label>Email</label>
        <input
          type="email"
          placeholder="sizning@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label>Parol</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish"}
        </button>
      </form>
      <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={setError} />
    </AuthOrbitShell>
  );
}
