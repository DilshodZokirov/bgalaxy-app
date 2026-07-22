import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Logo from "../components/Logo";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { useAuth } from "../hooks/useAuth";
import { getPendingInvite } from "../hooks/usePendingInvite";
import { useNavigate } from "react-router-dom";

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
    // Google accounts are auto-verified, so this is the one path that can
    // sign the person straight in.
    login(res);
    const pendingInvite = getPendingInvite();
    navigate(pendingInvite ? `/invite/${pendingInvite}` : "/dashboard");
  }

  if (registered) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <Logo withTagline />
          <h1>📩 Emailingizni tekshiring</h1>
          <p className="subtitle">
            <strong>{email}</strong> manziliga tasdiqlash havolasi yubordik — havolani bosgach, tizimga kira olasiz.
          </p>
          <Link to="/login"><button style={{ marginTop: 12 }}>Kirish sahifasiga o'tish</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Logo withTagline />
        <h1>Ro'yxatdan o'tish</h1>
        <p className="subtitle">O'z virtual galaktikangizni yarating.</p>
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
        <p className="auth-footer">
          Hisobingiz bormi? <Link to="/login">Kiring</Link>
        </p>
      </div>
    </div>
  );
}
