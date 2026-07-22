import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import Logo from "../components/Logo";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    api
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Logo withTagline />
        {status === "loading" && <p className="subtitle">Tekshirilmoqda...</p>}
        {status === "success" && (
          <>
            <h1>✓ Tasdiqlandi!</h1>
            <p className="subtitle">Emailingiz muvaffaqiyatli tasdiqlandi — endi tizimga kira olasiz.</p>
            <Link to="/login"><button style={{ marginTop: 12 }}>Kirish</button></Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1>Havola yaroqsiz</h1>
            <p className="subtitle">Bu tasdiqlash havolasi noto'g'ri yoki eskirgan bo'lishi mumkin.</p>
            <Link to="/login"><button style={{ marginTop: 12 }}>Kirish sahifasiga o'tish</button></Link>
          </>
        )}
      </div>
    </div>
  );
}
