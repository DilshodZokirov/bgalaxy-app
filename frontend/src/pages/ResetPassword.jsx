import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import AuthOrbitShell from "../components/AuthOrbitShell";

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

  if (done) {
    return (
      <AuthOrbitShell
        kicker="Gate open"
        title="Tayyor!"
        subtitle="Parolingiz almashtirildi — Kirish sahifasiga yo'naltirilmoqdasiz..."
      >
        <h2>Parol yangilandi</h2>
        <p className="subtitle">Endi yangi parol bilan galaktikaga kira olasiz.</p>
      </AuthOrbitShell>
    );
  }

  return (
    <AuthOrbitShell
      kicker="New key"
      title="Yangi parol o'rnatish"
      subtitle="Hisobingiz uchun yangi kalit yarating — Ziyo kutmoqda."
      footer={
        <p className="auth-footer">
          <Link to="/login">← Kirishga qaytish</Link>
        </p>
      }
    >
      <h2>Yangi parol</h2>
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
    </AuthOrbitShell>
  );
}
