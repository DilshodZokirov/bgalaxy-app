import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api/client";

/**
 * Mockupdagi social qator: Google ishlaydi;
 * Telegram / Apple — tez orada (vizual uchun).
 */
export default function AuthSocialRow({ onSuccess, onError }) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  function soon(name) {
    onError?.(`${name} orqali kirish tez orada qo‘shiladi`);
  }

  return (
    <div className="auth-social">
      <div className="auth-social-divider">
        <span>YOKI</span>
      </div>

      <div className="auth-social-row">
        {clientId ? (
          <div className="auth-social-google">
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
              shape="pill"
              text="continue_with"
              width="320"
            />
          </div>
        ) : (
          <button type="button" className="auth-social-btn" onClick={() => soon("Google")}>
            <span className="auth-social-logo g">G</span>
            Google
          </button>
        )}

        <button type="button" className="auth-social-btn" onClick={() => soon("Telegram")}>
          <span className="auth-social-logo t">✈</span>
          Telegram
        </button>
        <button type="button" className="auth-social-btn" onClick={() => soon("Apple")}>
          <span className="auth-social-logo a"></span>
          Apple
        </button>
      </div>
    </div>
  );
}
