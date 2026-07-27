import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { getPendingInvite } from "../hooks/usePendingInvite";
import AuthOrbitShell from "../components/AuthOrbitShell";
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
    <AuthOrbitShell
      kicker="Orbit Gate"
      title="Galaktikangizga qayting"
      subtitle="Ziyo kutmoqda — virtual ofis, jamoa va AI bitta stansiyada."
      footer={
        <p className="auth-footer">
          Hisobingiz yo'qmi? <Link to="/register">Ro'yxatdan o'ting</Link>
        </p>
      }
    >
      <h2>Kirish</h2>
      <p className="subtitle">Email yoki Google orqali davom eting.</p>
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
        <p className="auth-forgot">
          <Link to="/forgot-password">Parolni unutdingizmi?</Link>
        </p>
        {error && <p className="error">{error}</p>}
        {needsVerify && (
          <p className="auth-verify-row">
            {resendSent ? (
              <span className="settings-success">✓ Tasdiqlash havolasi qayta yuborildi!</span>
            ) : (
              <button type="button" className="secondary auth-resend" onClick={handleResend}>
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
    </AuthOrbitShell>
  );
}
