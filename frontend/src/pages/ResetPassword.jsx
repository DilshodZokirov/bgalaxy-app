import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import Logo from "../components/Logo";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Parollar mos kelmadi");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
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
        {done ? (
          <>
            <h1>✓ Tayyor!</h1>
            <p className="subtitle">Parolingiz almashtirildi — Kirish sahifasiga yo'naltirilmoqdasiz...</p>
          </>
        ) : (
          <>
            <h1>Yangi parol o'rnatish</h1>
            <p className="subtitle">Hisobingiz uchun yangi parol kiriting.</p>
            <form onSubmit={handleSubmit}>
              <label>Yangi parol</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label>Parolni takrorlang</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {error && <p className="error">{error}</p>}
              <button type="submit" disabled={loading}>
                {loading ? "Saqlanmoqda..." : "Parolni o'rnatish"}
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
