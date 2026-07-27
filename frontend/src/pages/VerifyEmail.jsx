import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import AuthOrbitShell from "../components/AuthOrbitShell";

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    api
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  if (status === "loading") {
    return (
      <AuthOrbitShell
        kicker="Verifying"
        title="Signal tekshirilmoqda"
        subtitle="Email tasdiqlash bir necha soniya olishi mumkin."
      >
        <h2>Tekshirilmoqda...</h2>
        <p className="subtitle">Iltimos, kuting.</p>
      </AuthOrbitShell>
    );
  }

  if (status === "success") {
    return (
      <AuthOrbitShell
        kicker="Orbit open"
        title="Tasdiqlandi!"
        subtitle="Emailingiz muvaffaqiyatli tasdiqlandi — endi tizimga kira olasiz."
      >
        <h2>Xush kelibsiz</h2>
        <p className="subtitle">Galaktikangiz tayyor. Kirish tugmasini bosing.</p>
        <Link to="/login">
          <button type="button">Kirish</button>
        </Link>
      </AuthOrbitShell>
    );
  }

  return (
    <AuthOrbitShell
      kicker="Signal lost"
      title="Havola yaroqsiz"
      subtitle="Bu tasdiqlash havolasi noto'g'ri yoki eskirgan bo'lishi mumkin."
    >
      <h2>Qayta urinib ko'ring</h2>
      <p className="subtitle">Kirish sahifasidan tasdiqlash xatini qayta so'rashingiz mumkin.</p>
      <Link to="/login">
        <button type="button">Kirish sahifasiga o'tish</button>
      </Link>
    </AuthOrbitShell>
  );
}
