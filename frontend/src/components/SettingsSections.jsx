import { useState } from "react";
import { api } from "../api/client";
import { BACKGROUND_PRESETS } from "../data/backgrounds";
import { UI_THEMES } from "../data/uiThemes";

const AVATAR_SIZE = 256;

const AVATAR_STYLE_GROUPS = [
  { label: "Zamonaviy", style: "personas", seeds: ["Malika", "Sardor", "Diyora", "Aziz"] },
  { label: "Chizilgan", style: "micah", seeds: ["Lola", "Jahongir", "Zarina", "Bekzod"] },
  { label: "Fantaziya", style: "adventurer", seeds: ["Nigora", "Otabek", "Madina", "Sherzod"] },
  { label: "Robot", style: "bottts-neutral", seeds: ["Nova", "Orion", "Lyra", "Comet"] },
].map((group) => ({
  ...group,
  avatars: group.seeds.map((seed) => `https://api.dicebear.com/9.x/${group.style}/svg?seed=${seed}`),
}));

function cropToSquareDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function resizeToDataUrl(file, maxWidth = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ---------- 1. Ma'lumotlar tahriri (info + password + avatar) ----------
export function ProfileInfoSection({ user, onSaved }) {
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError] = useState(null);
  const [infoSuccess, setInfoSuccess] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);

  async function handleSaveInfo(e) {
    e.preventDefault();
    setInfoError(null);
    setInfoSuccess(false);
    setInfoSaving(true);
    try {
      await api.updateProfile({ full_name: fullName });
      setInfoSuccess(true);
      await onSaved();
    } catch (err) {
      setInfoError(err.message);
    } finally {
      setInfoSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (newPassword !== confirmPassword) {
      setPwError("Yangi parollar mos kelmadi");
      return;
    }
    setPwSaving(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setPwSuccess(true);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  }

  async function handleAvatarFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarLoading(true);
    try {
      const dataUrl = await cropToSquareDataUrl(file);
      await api.updateProfile({ avatar_url: dataUrl });
      await onSaved();
    } catch (err) {
      setAvatarError(err.message || "Rasmni qayta ishlashda xatolik");
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleAvatarPreset(url) {
    setAvatarError(null);
    setAvatarLoading(true);
    try {
      await api.updateProfile({ avatar_url: url });
      await onSaved();
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setAvatarLoading(false);
    }
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 6px" }}>Ism va familiya</p>
      <form onSubmit={handleSaveInfo} style={{ marginBottom: 22 }}>
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        {infoError && <p className="error">{infoError}</p>}
        {infoSuccess && <p style={{ color: "var(--green)", fontSize: 12.5, margin: "0 0 12px" }}>✓ Saqlandi</p>}
        <button type="submit" className="secondary" disabled={infoSaving}>
          {infoSaving ? "Saqlanmoqda..." : "Ismni saqlash"}
        </button>
      </form>

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 6px" }}>Parolni tahrirlash</p>
      <form onSubmit={handleChangePassword} style={{ marginBottom: 22 }}>
        <input type="password" placeholder="Eski parol" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
        <input type="password" placeholder="Yangi parol" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        <input type="password" placeholder="Yangi parolni takrorlang" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        {pwError && <p className="error">{pwError}</p>}
        {pwSuccess && <p style={{ color: "var(--green)", fontSize: 12.5, margin: "0 0 12px" }}>✓ Parol almashtirildi</p>}
        <button type="submit" className="secondary" disabled={pwSaving}>
          {pwSaving ? "Saqlanmoqda..." : "Parolni almashtirish"}
        </button>
      </form>

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 10px" }}>Avatar</p>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="Avatar" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div className="avatar-circle" style={{ width: 56, height: 56, fontSize: 18 }}>
            {(user?.full_name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleAvatarFile} disabled={avatarLoading} />
      </div>
      {avatarLoading && <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Saqlanmoqda...</p>}
      {avatarError && <p className="error">{avatarError}</p>}

      <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "14px 0 10px" }}>Yoki tayyor avatarlardan birini tanlang:</p>
      {AVATAR_STYLE_GROUPS.map((group) => (
        <div key={group.style} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 6 }}>{group.label}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
            {group.avatars.map((url) => (
              <img
                key={url}
                src={url}
                alt="Avatar variant"
                onClick={() => handleAvatarPreset(url)}
                style={{
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: 10,
                  cursor: "pointer",
                  background: "var(--panel-2)",
                  border: user?.avatar_url === url ? "2px solid var(--blue)" : "1px solid var(--border)",
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- 2. PIN o'zgartirish ----------
export function PinSection({ user, onSaved }) {
  const [pinPassword, setPinPassword] = useState("");
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  async function handleSetPin(e) {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(false);
    if (newPin !== confirmPin) {
      setPinError("PIN kodlar mos kelmadi");
      return;
    }
    setPinSaving(true);
    try {
      await api.setPin(pinPassword, newPin);
      setPinSuccess(true);
      setPinPassword("");
      setNewPin("");
      setConfirmPin("");
      await onSaved();
    } catch (err) {
      setPinError(err.message);
    } finally {
      setPinSaving(false);
    }
  }

  async function handleChangePin(e) {
    e.preventDefault();
    setPinError(null);
    setPinSuccess(false);
    if (newPin !== confirmPin) {
      setPinError("PIN kodlar mos kelmadi");
      return;
    }
    setPinSaving(true);
    try {
      await api.changePin(pinPassword, oldPin, newPin);
      setPinSuccess(true);
      setPinPassword("");
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      setPinError(err.message);
    } finally {
      setPinSaving(false);
    }
  }

  if (user?.has_pin) {
    return (
      <form onSubmit={handleChangePin}>
        <input type="password" placeholder="Gmail (kirish) parolingiz" value={pinPassword} onChange={(e) => setPinPassword(e.target.value)} required />
        <input type="password" inputMode="numeric" placeholder="Joriy PIN" value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
        <input type="password" inputMode="numeric" placeholder="Yangi PIN (4-6 raqam)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
        <input type="password" inputMode="numeric" placeholder="Yangi PINni takrorlang" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
        {pinError && <p className="error">{pinError}</p>}
        {pinSuccess && <p style={{ color: "var(--green)", fontSize: 12.5, margin: "0 0 12px" }}>✓ PIN almashtirildi</p>}
        <button type="submit" className="secondary" disabled={pinSaving}>
          {pinSaving ? "Saqlanmoqda..." : "PINni almashtirish"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSetPin}>
      <p style={{ fontSize: 12, color: "var(--text-dim)", margin: "0 0 8px" }}>
        PIN hali o'rnatilmagan — Gmail (kirish) parolingizni tasdiqlab, yangi PIN o'rnating. (Agar hisobingizda parol bo'lmasa — masalan Google orqali kirgan bo'lsangiz — avval "Parolni unutdingizmi?" orqali parol o'rnating.)
      </p>
      <input type="password" placeholder="Gmail (kirish) parolingiz" value={pinPassword} onChange={(e) => setPinPassword(e.target.value)} required />
      <input type="password" inputMode="numeric" placeholder="Yangi PIN (4-6 raqam)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
      <input type="password" inputMode="numeric" placeholder="Yangi PINni takrorlang" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
      {pinError && <p className="error">{pinError}</p>}
      {pinSuccess && <p style={{ color: "var(--green)", fontSize: 12.5, margin: "0 0 12px" }}>✓ PIN o'rnatildi</p>}
      <button type="submit" className="secondary" disabled={pinSaving}>
        {pinSaving ? "Saqlanmoqda..." : "PIN o'rnatish"}
      </button>
    </form>
  );
}

// ---------- 3. Avtomatik qulflash ----------
export function AutoLockSection({ user, onSaved }) {
  const [autoLock, setAutoLock] = useState(user?.auto_lock_minutes ?? 0);
  const [error, setError] = useState(null);

  if (!user?.has_pin) {
    return <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Avtomatik qulflashdan foydalanish uchun avval PIN o'rnating.</p>;
  }

  async function handleChange(minutes) {
    setAutoLock(minutes);
    try {
      await api.updateLockSettings(minutes);
      await onSaved();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 8px" }}>
        Hech qanday amal qilinmasa, shu vaqtdan so'ng ekran avtomatik qulflanadi.
      </p>
      <select
        value={autoLock}
        onChange={(e) => handleChange(Number(e.target.value))}
        style={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "10px", width: "100%" }}
      >
        <option value={0}>O'chirilgan</option>
        <option value={1}>1 daqiqa</option>
        <option value={5}>5 daqiqa</option>
        <option value={10}>10 daqiqa</option>
        <option value={15}>15 daqiqa</option>
        <option value={30}>30 daqiqa</option>
        <option value={60}>1 soat</option>
      </select>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

// ---------- 4. Dashboard tahriri → UI tahriri ----------
export function DashboardUiSection({ user, onSaved }) {
  const [theme, setTheme] = useState(user?.theme || "dark");
  const [uiTheme, setUiTheme] = useState(user?.ui_theme || "default");
  const [darkBg, setDarkBg] = useState(user?.dark_background || "");
  const [lightBg, setLightBg] = useState(user?.light_background || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const activeBg = theme === "light" ? lightBg : darkBg;
  const setActiveBg = theme === "light" ? setLightBg : setDarkBg;

  async function persist(updates) {
    setSaving(true);
    setError(null);
    try {
      await api.updateProfile(updates);
      await onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleThemeChange(next) {
    setTheme(next);
    await persist({ theme: next });
  }

  async function handleUiThemeChange(id) {
    setUiTheme(id);
    await persist({ ui_theme: id });
  }

  async function handlePickPreset(value) {
    setActiveBg(value);
    await persist(theme === "light" ? { light_background: value } : { dark_background: value });
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeToDataUrl(file);
      setActiveBg(dataUrl);
      await persist(theme === "light" ? { light_background: dataUrl } : { dark_background: dataUrl });
    } catch (err) {
      setError(err.message || "Rasmni yuklashda xatolik");
    }
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 10px" }}>Rejim</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button className={theme === "dark" ? "" : "secondary"} style={{ width: "auto", padding: "8px 16px" }} onClick={() => handleThemeChange("dark")}>
          🌙 Qorong'u
        </button>
        <button className={theme === "light" ? "" : "secondary"} style={{ width: "auto", padding: "8px 16px" }} onClick={() => handleThemeChange("light")}>
          ☀️ Yorug'
        </button>
      </div>

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 10px" }}>Mavzu (asosiy ranglar):</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8, marginBottom: 20 }}>
        {UI_THEMES.map((t) => (
          <div
            key={t.id}
            onClick={() => handleUiThemeChange(t.id)}
            style={{
              cursor: "pointer",
              borderRadius: 10,
              padding: 8,
              border: uiTheme === t.id ? "2px solid var(--text)" : "2px solid transparent",
              background: "var(--panel-2)",
              textAlign: "center",
            }}
          >
            <div style={{ height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${t.blue}, ${t.purple})`, marginBottom: 6 }} />
            <span style={{ fontSize: 11 }}>{t.label}</span>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 13, color: "var(--text-dim)", margin: "0 0 10px" }}>
        {theme === "light" ? "Yorug'" : "Qorong'u"} rejim uchun orqa fon:
      </p>
      <input type="file" accept="image/*" onChange={handleFileUpload} disabled={saving} style={{ marginBottom: 14 }} />
      <div className="bg-gallery">
        {BACKGROUND_PRESETS.map((p) => (
          <div
            key={p.id}
            className={`bg-swatch ${activeBg === p.value ? "selected" : ""}`}
            style={{ background: p.value }}
            title={p.label}
            onClick={() => handlePickPreset(p.value)}
          />
        ))}
      </div>
      {activeBg && (
        <button
          className="secondary"
          style={{ marginTop: 14 }}
          onClick={() => { setActiveBg(""); persist(theme === "light" ? { light_background: "" } : { dark_background: "" }); }}
        >
          Fonni tozalash
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
