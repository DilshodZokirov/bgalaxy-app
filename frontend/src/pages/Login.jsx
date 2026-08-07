import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { getPendingInvite } from "../hooks/usePendingInvite";
import AuthOrbitShell from "../components/AuthOrbitShell";
import { AuthField } from "../components/AuthFields";
import AuthSocialRow from "../components/AuthSocialRow";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.getPublicAuthConfig()
      .then((cfg) => setEmailEnabled(cfg.email_enabled !== false))
      .catch(() => {});
  }, []);

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
      title="Xush kelibsiz!"
      subtitle="Hisobingizga kiring va koinotingizni boshqaring"
      art="portal"
      footer={
        <p className="auth-gate-switch">
          Hisobingiz yo&apos;qmi? <Link to="/register">Ro&apos;yxatdan o&apos;tish</Link>
        </p>
      }
    >
      {!emailEnabled && (
        <p className="settings-success" style={{ marginBottom: 12 }}>
          Email/SMTP vaqtincha o‘chirilgan. Test uchun <strong>Google orqali kirish</strong>ni
          ishlating (yoki oddiy login — tasdiqlash shart emas).
        </p>
      )}
      <form className="auth-gate-form" onSubmit={handleSubmit}>
        <AuthField
          icon="user"
          type="email"
          name="email"
          placeholder="Email yoki telefon raqami"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <AuthField
          icon="lock"
          type="password"
          name="password"
          placeholder="Parol"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <p className="auth-gate-forgot">
          <Link to="/forgot-password">Parolni unutdingizmi?</Link>
        </p>

        {error && <p className="error auth-gate-error">{error}</p>}
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

        <button type="submit" className="auth-gate-cta" disabled={loading}>
          {loading ? "Kirilmoqda..." : "Kirish"}
        </button>
      </form>

      <AuthSocialRow onSuccess={handleGoogleSuccess} onError={setError} />
    </AuthOrbitShell>
  );
}
