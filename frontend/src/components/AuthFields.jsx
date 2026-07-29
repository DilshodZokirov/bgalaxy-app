import { useState } from "react";

/** Icon + input qatori (login/register mockup). */
export function AuthField({
  icon = "user",
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  autoComplete,
  name,
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && show ? "text" : type;

  return (
    <label className="auth-field">
      <span className={`auth-field-icon ic-${icon}`} aria-hidden />
      <input
        type={inputType}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
      />
      {isPassword && (
        <button
          type="button"
          className="auth-field-eye"
          aria-label={show ? "Parolni yashirish" : "Parolni ko‘rsatish"}
          onClick={() => setShow((v) => !v)}
        >
          {show ? "🙈" : "👁"}
        </button>
      )}
    </label>
  );
}

export function AuthCheck({ checked, onChange, children }) {
  return (
    <label className="auth-check">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{children}</span>
    </label>
  );
}
