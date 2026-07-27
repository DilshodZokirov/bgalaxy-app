import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import AuthOrbitShell from "../components/AuthOrbitShell";

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
        kicker="Signal sent"
        title="Emailingizni tekshiring"
        subtitle="Agar manzil ro'yxatdan o'tgan bo'lsa, tiklash havolasi yo'lda."
        footer={
          <p className="auth-footer">
            <Link to="/login">← Kirishga qaytish</Link>
          </p>
        }
      >
        <h2>Xabar yuborildi</h2>
        <p className="subtitle">
          Agar <strong>{email}</strong> ro'yxatdan o'tgan bo'lsa, parolni tiklash havolasi yuborildi.
        </p>
        <Link to="/login">
          <button type="button">Kirish sahifasiga o'tish</button>
        </Link>
      </AuthOrbitShell>
    );
  }

  return (
    <AuthOrbitShell
      kicker="Recovery orbit"
      title="Parolni tiklash"
      subtitle="Emailingizni kiriting — galaktikaga qaytish havolasini yuboramiz."
      footer={
        <p className="auth-footer">
          <Link to="/login">← Kirishga qaytish</Link>
        </p>
      }
    >
      <h2>Parolni tiklash</h2>
      <p className="subtitle">Email manzilingizni kiriting — tiklash havolasini yuboramiz.</p>
      <form onSubmit={handleSubmit}>
        <label>Email</label>
        <input
          type="email"
          placeholder="sizning@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Yuborilmoqda..." : "Havola yuborish"}
        </button>
      </form>
    </AuthOrbitShell>
  );
}
