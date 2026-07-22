import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { getPendingInvite } from "../hooks/usePendingInvite";
import Logo from "../components/Logo";
import GoogleAuthButton from "../components/GoogleAuthButton";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNeedsVerify(false);
    setResendSent(false);
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      login(res);
      const pendingInvite = getPendingInvite();
      navigate(pendingInvite ? `/invite/${pendingInvite}` : "/dashboard");
    } catch (err) {
      setError(err.message);
      if (err.message?.includes("tasdiqlang")) setNeedsVerify(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await api.resendVerification(email);
      setResendSent(true);
    } catch {
      // ignore
    }
  }

  function handleGoogleSuccess(res) {
    login(res);
    const pendingInvite = getPendingInvite();
    navigate(pendingInvite ? `/invite/${pendingInvite}` : "/dashboard");
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Logo withTagline />
        <h1>Kirish</h1>
        <p className="subtitle">Virtual ofisingizga xush kelibsiz.</p>
        <form onSubmit={handleSubmit}>
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
          <p style={{ textAlign: "right", margin: "-6px 0 14px" }}>
            <Link to="/forgot-password" style={{ fontSize: 12.5 }}>Parolni unutdingizmi?</Link>
          </p>
          {error && <p className="error">{error}</p>}
          {needsVerify && (
            <p style={{ fontSize: 12.5, marginTop: -8, marginBottom: 12 }}>
              {resendSent ? (
                <span style={{ color: "var(--green)" }}>✓ Tasdiqlash havolasi qayta yuborildi!</span>
              ) : (
                <button type="button" className="secondary" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={handleResend}>
                  Tasdiqlash havolasini qayta yuborish
                </button>
              )}
            </p>
          )}
          <button type="submit" disabled={loading}>
            {loading ? "Kirilmoqda..." : "Kirish"}
          </button>
        </form>
        <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={setError} />
        <p className="auth-footer">
          Hisobingiz yo'qmi? <Link to="/register">Ro'yxatdan o'ting</Link>
        </p>
      </div>
    </div>
  );
}
