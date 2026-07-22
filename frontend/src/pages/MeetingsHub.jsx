import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";

export default function MeetingsHub() {
  const navigate = useNavigate();
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [partners, setPartners] = useState([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  function addPartner(u) {
    setPartners((prev) => (prev.some((p) => p.id === u.id) ? prev : [...prev, u]));
  }

  function removePartner(id) {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleStartPartnerMeeting() {
    if (partners.length === 0) return;
    setStarting(true);
    setError(null);
    try {
      const res = await api.startPartnerMeeting(partners.map((p) => p.id));
      navigate(`/partner-call/${res.room_name}`);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1>Uchrashuvlar</h1>
        <p>Qanday turdagi uchrashuv boshlaysiz?</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, maxWidth: 820 }}>
        <div className="card" onClick={() => navigate("/group-meeting")} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>👥</div>
          <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>Guruh uchrashuvi</h3>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>Kompaniyangizning bir nechta a'zosi bilan bir vaqtda.</p>
        </div>

        <div className="card" onClick={() => setShowPartnerSearch(true)} style={{ cursor: "pointer" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🌍</div>
          <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>Hamkorlar bilan uchrashuv</h3>
          <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
            BG (Business Galaxy)'da ro'yxatdan o'tgan istalgan kishi bilan — kompaniyangizdan tashqarida ham.
          </p>
        </div>
      </div>

      {showPartnerSearch && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
          onClick={() => setShowPartnerSearch(false)}
        >
          <div className="card" style={{ maxWidth: 400, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>Hamkorlar bilan uchrashuv</h3>
              <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={() => setShowPartnerSearch(false)}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 10px" }}>
              Email (Gmail va h.k.) orqali qidiring — bir nechta hamkorni qo'shishingiz mumkin.
            </p>

            {partners.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {partners.map((p) => (
                  <span
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--panel-2)",
                      borderRadius: 999,
                      padding: "5px 6px 5px 12px",
                      fontSize: 12.5,
                    }}
                  >
                    {p.full_name}
                    <button
                      type="button"
                      onClick={() => removePartner(p.id)}
                      style={{
                        width: 18,
                        height: 18,
                        padding: 0,
                        borderRadius: "50%",
                        background: "var(--border)",
                        fontSize: 11,
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            <UserSearchInput selected={null} onSelect={addPartner} onClear={() => {}} />
            {error && <p className="error">{error}</p>}
            <button onClick={handleStartPartnerMeeting} disabled={partners.length === 0 || starting}>
              {starting ? "Boshlanmoqda..." : `🎥 Uchrashuvni boshlash${partners.length > 1 ? ` (${partners.length} kishi)` : ""}`}
            </button>          </div>
        </div>
      )}
    </AppShell>
  );
}
