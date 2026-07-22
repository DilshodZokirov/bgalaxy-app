import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api/client";

export default function GoogleAuthButton({ onSuccess, onError }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <div style={{ margin: "14px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>yoki</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>
      <GoogleLogin
        onSuccess={async (credentialResponse) => {
          try {
            const res = await api.loginWithGoogle(credentialResponse.credential);
            onSuccess(res);
          } catch (err) {
            onError?.(err.message);
          }
        }}
        onError={() => onError?.("Google orqali kirishda xatolik")}
        theme="filled_black"
        text="continue_with"
        width="320"
      />
    </div>
  );
}
