import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";
import UserSearchInput from "../components/UserSearchInput";

export default function MeetingsHub() {
  const navigate = useNavigate();
  const [showPartnerSearch, setShowPartnerSearch] = useState(false);
  const [partners, setPartners] = useState([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const [company, setCompany] = useState(null);
  const [activeGroupCall, setActiveGroupCall] = useState(null);
  const [activePartnerMeetings, setActivePartnerMeetings] = useState([]);

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => setCompany(pickActiveCompany(list)))
      .catch(() => {});
    refreshActive();
    const interval = setInterval(refreshActive, 15000);
    return () => clearInterval(interval);
  }, []);

  function refreshActive() {
    api.getActivePartnerMeetings().then(setActivePartnerMeetings).catch(() => {});
  }

  useEffect(() => {
    if (!company) return;
    api
      .getActiveGroupCall(company.id)
      .then((res) => setActiveGroupCall(res.active ? res : null))
      .catch(() => {});
  }, [company]);

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

  const hasActive = activeGroupCall || activePartnerMeetings.length > 0;

  return (
    <AppShell>
      <div className="page-header">
        <h1>Uchrashuvlar</h1>
        <p>Qanday turdagi uchrashuv boshlaysiz?</p>
      </div>

      {hasActive && (
        <div style={{ maxWidth: 820, marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 10px", color: "var(--text-dim)" }}>🟢 Faol uchrashuvlar</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeGroupCall && (
              <div
                className="card"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" }}
              >
                <div>
                  <strong style={{ fontSize: 13.5 }}>👥 Guruh uchrashuvi — {company?.name}</strong>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    {activeGroupCall.participants.map((p) => p.name).join(", ")}
                  </div>
                </div>
                <button style={{ width: "auto", padding: "8px 16px" }} onClick={() => navigate("/group-meeting")}>
                  Kirish
                </button>
              </div>
            )}
            {activePartnerMeetings.map((m) => (
              <div
                key={m.room_name}
                className="card"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" }}
              >
                <div>
                  <strong style={{ fontSize: 13.5 }}>🌍 Hamkorlar bilan uchrashuv</strong>
                  <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                    {m.participants.map((p) => p.name).join(", ")}
                  </div>
                </div>
                <button style={{ width: "auto", padding: "8px 16px" }} onClick={() => navigate(`/partner-call/${m.room_name}`)}>
                  Kirish
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
