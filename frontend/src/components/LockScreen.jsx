import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function LockScreen() {
  const { unlockScreen } = useAuth();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setChecking(true);
    try {
      await api.verifyPin(pin);
      unlockScreen();
      setPin("");
    } catch (err) {
      setError(err.message);
      setPin("");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 20 }}>🔒</div>
      <h2 style={{ marginBottom: 8, color: "var(--text)" }}>Ekran qulflangan</h2>
      <p style={{ color: "var(--text-dim)", marginBottom: 24, fontSize: 13.5 }}>Davom etish uchun PIN-kodni kiriting</p>
      <form onSubmit={handleSubmit} style={{ width: 260 }}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          placeholder="••••"
          style={{ textAlign: "center", fontSize: 22, letterSpacing: 8 }}
        />
        {error && <p className="error" style={{ textAlign: "center" }}>{error}</p>}
        <button type="submit" disabled={checking || pin.length < 4}>
          {checking ? "Tekshirilmoqda..." : "Qulfni ochish"}
        </button>
      </form>
    </div>
  );
}
