import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Logo from "../components/Logo";

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

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Logo withTagline />
        {sent ? (
          <>
            <h1>📩 Emailingizni tekshiring</h1>
            <p className="subtitle">
              Agar <strong>{email}</strong> ro'yxatdan o'tgan bo'lsa, parolni tiklash havolasi yuborildi.
            </p>
            <Link to="/login"><button style={{ marginTop: 12 }}>Kirish sahifasiga o'tish</button></Link>
          </>
        ) : (
          <>
            <h1>Parolni tiklash</h1>
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
            <p className="auth-footer">
              <Link to="/login">← Kirishga qaytish</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
