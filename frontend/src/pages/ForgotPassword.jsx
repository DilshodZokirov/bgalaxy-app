import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import AuthOrbitShell from "../components/AuthOrbitShell";
import { AuthField } from "../components/AuthFields";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthOrbitShell
        title="Emailingizni tekshiring"
        subtitle="Agar manzil ro'yxatdan o'tgan bo'lsa, tiklash havolasi yo'lda."
        art="portal"
        footer={
          <p className="auth-gate-switch">
            <Link to="/login">← Kirishga qaytish</Link>
          </p>
        }
      >
        <p className="auth-gate-success">
          Agar <strong>{email}</strong> ro&apos;yxatdan o&apos;tgan bo&apos;lsa, parolni tiklash havolasi
          yuborildi.
        </p>
        <Link to="/login" className="auth-gate-cta-link">
          <span className="auth-gate-cta">Kirish sahifasiga o&apos;tish</span>
        </Link>
      </AuthOrbitShell>
    );
  }

  return (
    <AuthOrbitShell
      title="Parolni tiklash"
      subtitle="Emailingizni kiriting — galaktikaga qaytish havolasini yuboramiz."
      art="portal"
      footer={
        <p className="auth-gate-switch">
          <Link to="/login">← Kirishga qaytish</Link>
        </p>
      }
    >
      <form className="auth-gate-form" onSubmit={handleSubmit}>
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
        {error && <p className="error auth-gate-error">{error}</p>}
        <button type="submit" className="auth-gate-cta" disabled={loading}>
          {loading ? "Yuborilmoqda..." : "Havola yuborish"}
        </button>
      </form>
    </AuthOrbitShell>
  );
}
