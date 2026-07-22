import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { setActiveCompanyId } from "../hooks/useCompany";
import { setPendingInvite, clearPendingInvite } from "../hooks/usePendingInvite";
import Logo from "../components/Logo";

export default function InviteAccept() {
  const { token } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const hasAcceptedRef = useRef(false);

  useEffect(() => {
    setPendingInvite(token);
    api
      .previewInvite(token)
      .then(setInvite)
      .catch((err) => setError(err.message));
  }, [token]);

  const emailMismatch = user && invite && user.email.toLowerCase() !== invite.email.toLowerCase();

  useEffect(() => {
    // Already logged in as the right person — join automatically, no extra click.
    if (user && invite && !invite.accepted && !emailMismatch && !hasAcceptedRef.current) {
      hasAcceptedRef.current = true;
      handleAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invite]);

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const res = await api.acceptInvite(token);
      clearPendingInvite();
      setActiveCompanyId(res.company_id);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Logo withTagline />
        <h1>Taklifnoma</h1>

        {error && <p className="error">{error}</p>}

        {invite && !error && (
          <>
            <p className="subtitle">
              Siz <strong style={{ color: "var(--text)" }}>{invite.company_name}</strong>{" "}
              kompaniyasiga taklif qilindingiz ({invite.email}).
            </p>

            {invite.accepted ? (
              <p className="subtitle">Bu taklif allaqachon ishlatilgan.</p>
            ) : emailMismatch ? (
              <>
                <p className="subtitle">
                  Bu taklif <strong style={{ color: "var(--text)" }}>{invite.email}</strong> uchun
                  yuborilgan, lekin siz hozir <strong style={{ color: "var(--text)" }}>{user.email}</strong>{" "}
                  sifatida kirgansiz.
                </p>
                <button
                  onClick={() => {
                    logout();
                    navigate(0);
                  }}
                >
                  Chiqish va boshqa hisob bilan kirish
                </button>
              </>
            ) : user ? (
              <p className="subtitle">{accepting ? "Qo'shilinmoqda..." : "Boshqaruv paneliga o'tilmoqda..."}</p>
            ) : (
              <>
                <p className="subtitle">
                  Qo'shilish uchun avval hisob yarating yoki kiring.
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <Link to="/register" style={{ flex: 1 }}>
                    <button style={{ width: "100%" }}>Ro'yxatdan o'tish</button>
                  </Link>
                  <Link to="/login" style={{ flex: 1 }}>
                    <button className="secondary" style={{ width: "100%" }}>
                      Kirish
                    </button>
                  </Link>
                </div>
                <p className="auth-footer">
                  Ro'yxatdan o'tgach/kirgach avtomatik ravishda kompaniyaga qo'shilasiz.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
