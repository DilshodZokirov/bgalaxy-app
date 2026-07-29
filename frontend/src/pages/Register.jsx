import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { getPendingInvite } from "../hooks/usePendingInvite";
import AuthOrbitShell from "../components/AuthOrbitShell";
import { AuthField, AuthCheck } from "../components/AuthFields";
import AuthSocialRow from "../components/AuthSocialRow";

export default function Register() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [wantNews, setWantNews] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!agreeTerms) {
      setError("Foydalanish shartlari bilan rozilik kerak");
      return;
    }
    if (password !== password2) {
      setError("Parollar mos kelmadi");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo‘lsin");
      return;
    }
    setLoading(true);
    try {
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      await api.register({ full_name, email, password });
      // phone / wantNews — UI uchun; backend hali alohida maydon kutmaydi
      void phone;
      void wantNews;
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
        title="Emailingizni tekshiring"
        subtitle="Galaktikaga kirish uchun tasdiqlash havolasini bosing."
        art="dome"
        footer={
          <p className="auth-gate-switch">
            <Link to="/login">← Kirish sahifasiga o&apos;tish</Link>
          </p>
        }
      >
        <p className="auth-gate-success">
          <strong>{email}</strong> manziliga tasdiqlash havolasi yuborildi.
        </p>
        <Link to="/login" className="auth-gate-cta-link">
          <span className="auth-gate-cta">Kirish sahifasiga o&apos;tish</span>
        </Link>
      </AuthOrbitShell>
    );
  }

  return (
    <AuthOrbitShell
      title="Ro'yxatdan o'tish"
      subtitle="Yangi hisob yarating va koinotga qo'shiling"
      art="dome"
      footer={
        <p className="auth-gate-switch">
          Hisobingiz bormi? <Link to="/login">Kirish</Link>
        </p>
      }
    >
      <form className="auth-gate-form" onSubmit={handleSubmit}>
        <div className="auth-gate-row">
          <AuthField
            icon="user"
            name="firstName"
            placeholder="Ism"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
            required
          />
          <AuthField
            icon="user"
            name="lastName"
            placeholder="Familiya"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
            required
          />
        </div>

        <AuthField
          icon="mail"
          type="email"
          name="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <AuthField
          icon="phone"
          type="tel"
          name="phone"
          placeholder="Telefon raqami (ixtiyoriy)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
        />
        <AuthField
          icon="lock"
          type="password"
          name="password"
          placeholder="Parol"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <AuthField
          icon="lock"
          type="password"
          name="password2"
          placeholder="Parolni tasdiqlang"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          autoComplete="new-password"
          required
        />

        <div className="auth-gate-checks">
          <AuthCheck checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}>
            Men{" "}
            <a href="/terms" target="_blank" rel="noreferrer">
              foydalanish shartlari
            </a>{" "}
            va{" "}
            <a href="/privacy" target="_blank" rel="noreferrer">
              maxfiylik siyosati
            </a>{" "}
            bilan tanishdim va roziman
          </AuthCheck>
          <AuthCheck checked={wantNews} onChange={(e) => setWantNews(e.target.checked)}>
            Yangiliklar va takliflarni olishni xohlayman
          </AuthCheck>
        </div>

        {error && <p className="error auth-gate-error">{error}</p>}

        <button type="submit" className="auth-gate-cta" disabled={loading}>
          {loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish"}
        </button>
      </form>

      <AuthSocialRow onSuccess={handleGoogleSuccess} onError={setError} />
    </AuthOrbitShell>
  );
}
