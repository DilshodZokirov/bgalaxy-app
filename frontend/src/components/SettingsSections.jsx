import { useEffect, useState } from "react";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
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
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

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

  async function handleForgotPin() {
    setPinError(null);
    setForgotSending(true);
    try {
      await api.forgotPin();
      setForgotSent(true);
    } catch (err) {
      setPinError(err.message);
    } finally {
      setForgotSending(false);
    }
  }

  if (user?.has_pin) {
    return (
      <div className="settings-pin">
        <form onSubmit={handleChangePin}>
          <p className="settings-hint">PINni bilasangiz — parol + joriy PIN bilan almashtiring.</p>
          <input type="password" placeholder="Kirish parolingiz" value={pinPassword} onChange={(e) => setPinPassword(e.target.value)} required />
          <input type="password" inputMode="numeric" placeholder="Joriy PIN" value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
          <input type="password" inputMode="numeric" placeholder="Yangi PIN (4-6 raqam)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
          <input type="password" inputMode="numeric" placeholder="Yangi PINni takrorlang" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
          {pinError && <p className="error">{pinError}</p>}
          {pinSuccess && <p className="settings-success">✓ PIN almashtirildi</p>}
          <button type="submit" className="secondary" disabled={pinSaving}>
            {pinSaving ? "Saqlanmoqda..." : "PINni almashtirish"}
          </button>
        </form>

        <div className="settings-pin-forgot">
          <p className="settings-hint">PINni unutdingizmi? Emailingizga yangi kod o‘rnatish havolasi yuboriladi.</p>
          {forgotSent ? (
            <p className="settings-success">✓ Havola {user.email} ga yuborildi — pochtangizni tekshiring.</p>
          ) : (
            <button type="button" className="secondary" onClick={handleForgotPin} disabled={forgotSending}>
              {forgotSending ? "Yuborilmoqda..." : "PINni unutdingizmi?"}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSetPin} className="settings-pin">
      <p className="settings-hint">
        PIN hali o‘rnatilmagan — kirish parolingizni tasdiqlab, yangi PIN qo‘ying. Google orqali kirgan bo‘lsangiz,
        avval “Parolni unutdingizmi?” orqali parol o‘rnating.
      </p>
      <input type="password" placeholder="Kirish parolingiz" value={pinPassword} onChange={(e) => setPinPassword(e.target.value)} required />
      <input type="password" inputMode="numeric" placeholder="Yangi PIN (4-6 raqam)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
      <input type="password" inputMode="numeric" placeholder="Yangi PINni takrorlang" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))} maxLength={6} required />
      {pinError && <p className="error">{pinError}</p>}
      {pinSuccess && <p className="settings-success">✓ PIN o‘rnatildi</p>}
      <button type="submit" className="secondary" disabled={pinSaving}>
        {pinSaving ? "Saqlanmoqda..." : "PIN o‘rnatish"}
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

// ---------- 4. UI + theme presets ----------
export function DashboardUiSection({ user, onSaved }) {
  const [theme, setTheme] = useState(user?.theme || "dark");
  const [uiTheme, setUiTheme] = useState(user?.ui_theme || "default");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [systemOk, setSystemOk] = useState(false);

  async function persist(updates) {
    setSaving(true);
    setError(null);
    setSystemOk(false);
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

  async function handleUiThemeChange(preset) {
    setUiTheme(preset.id);
    await persist({
      ui_theme: preset.id,
      dark_background: preset.dark_background || "",
      light_background: preset.light_background || "",
    });
  }

  async function handleSystemUi() {
    setTheme("dark");
    setUiTheme("default");
    setSaving(true);
    setError(null);
    try {
      await api.updateProfile({
        theme: "dark",
        ui_theme: "default",
        dark_background: "",
        light_background: "",
      });
      await onSaved();
      setSystemOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="settings-ui">
      <div className="settings-ui-toolbar">
        <button type="button" className="meetings-cta settings-system-btn" onClick={handleSystemUi} disabled={saving}>
          System UI
        </button>
        <p className="settings-hint">Standart ko‘rinishga qaytaradi — ranglar va fonlar tozalanadi.</p>
      </div>
      {systemOk && <p className="settings-success">✓ System UI tiklandi</p>}

      <p className="settings-label">Rejim (tema)</p>
      <div className="settings-theme-toggle">
        <button type="button" className={theme === "dark" ? "active" : ""} onClick={() => handleThemeChange("dark")}>
          Qorong‘u
        </button>
        <button type="button" className={theme === "light" ? "active" : ""} onClick={() => handleThemeChange("light")}>
          Yorug‘
        </button>
      </div>

      <p className="settings-label">Bomba UI ({UI_THEMES.length})</p>
      <p className="settings-hint">Tanlangan UI dastur ranglarini va fonini o‘zgartiradi.</p>
      <div className="settings-ui-grid">
        {UI_THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`settings-ui-card ${uiTheme === t.id ? "active" : ""}`}
            onClick={() => handleUiThemeChange(t)}
            disabled={saving}
          >
            <span
              className="settings-ui-swatch"
              style={{
                background:
                  t.dark_background ||
                  `linear-gradient(135deg, ${t.blue}, ${t.purple})`,
              }}
            />
            <span className="settings-ui-meta">
              <strong>{t.label}</strong>
              <em>{t.tagline}</em>
            </span>
            <span className="settings-ui-dots" aria-hidden>
              <i style={{ background: t.blue }} />
              <i style={{ background: t.cyan }} />
              <i style={{ background: t.orange }} />
            </span>
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

// ---------- 5. Ombor (korxonada 3 tagacha, har turdan bittadan) ----------
const WAREHOUSE_TYPE_META = {
  technology: {
    label: "Texnologiya",
    blurb: "Gadget, qurilma, SKU",
    accent: "#38bdf8",
    glow: "rgba(56,189,248,0.35)",
    icon: "◈",
  },
  clothing: {
    label: "Kiyim-kechak",
    blurb: "O‘lcham, rang, kolleksiya",
    accent: "#2dd4bf",
    glow: "rgba(45,212,191,0.35)",
    icon: "◇",
  },
  food: {
    label: "Oziq-ovqat",
    blurb: "Muddat, zaxira, oqim",
    accent: "#fbbf24",
    glow: "rgba(251,191,36,0.3)",
    icon: "✦",
  },
};

export function WarehouseSection() {
  const [company, setCompany] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [addType, setAddType] = useState("technology");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const list = await api.getMyCompanies();
      const active = pickActiveCompany(list);
      setCompany(active);
      if (active) {
        let rows = active.warehouses?.length ? active.warehouses : [];
        if (!rows.length) {
          rows = await api.getWarehouses(active.id).catch(() => []);
        }
        if (!rows.length && active.has_warehouse && active.warehouse_type) {
          try {
            rows = [await api.createWarehouse(active.id, active.warehouse_type)];
          } catch {
            rows = await api.getWarehouses(active.id).catch(() => []);
          }
        }
        setWarehouses(rows || []);
        const used = new Set((rows || []).map((w) => w.warehouse_type));
        const next = Object.keys(WAREHOUSE_TYPE_META).find((k) => !used.has(k));
        setAddType(next || "technology");
      } else {
        setWarehouses([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload().catch(() => setLoading(false));
  }, []);

  const usedTypes = new Set(warehouses.map((w) => w.warehouse_type));
  const availableTypes = Object.keys(WAREHOUSE_TYPE_META).filter((key) => !usedTypes.has(key));
  const canAdd = warehouses.length < 3 && availableTypes.length > 0;
  const slots = [0, 1, 2].map((i) => warehouses[i] || null);

  async function handleAdd(typeKey = addType) {
    if (!company || !canAdd) return;
    const type = availableTypes.includes(typeKey) ? typeKey : availableTypes[0];
    if (!type) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.createWarehouse(company.id, type);
      setSaved(true);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(warehouse) {
    if (!company) return;
    const label = WAREHOUSE_TYPE_META[warehouse.warehouse_type]?.label || warehouse.warehouse_type;
    if (!window.confirm(`"${label}" omborini o'chirasizmi? Ichidagi mahsulotlar ham o'chadi.`)) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.deleteWarehouse(company.id, warehouse.id);
      setSaved(true);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="wh-set-hint">Ombor orbitasi yuklanmoqda...</p>;
  }

  if (!company) {
    return <p className="wh-set-hint">Avval kompaniya tanlang.</p>;
  }

  return (
    <div className="wh-set">
      <div className="wh-set-hero">
        <div className="wh-set-hero-copy">
          <p className="wh-set-kicker">Warehouse Orbit</p>
          <h4>{company.name}</h4>
          <p>
            Bitta korxonada 3 tagacha ishlab chiqarish ombori — har turdan faqat bittadan.
            Kiyim, texnologiya va oziq-ovqat birgalikda ishlashi mumkin.
          </p>
        </div>
        <div className="wh-set-meter" aria-label={`Omborlar ${warehouses.length} dan 3`}>
          <strong>{warehouses.length}</strong>
          <span>/ 3</span>
          <em>slot</em>
        </div>
      </div>

      <div className="wh-set-slots">
        {slots.map((w, i) => {
          if (!w) {
            return (
              <div key={`empty-${i}`} className="wh-set-slot is-empty">
                <span className="wh-set-slot-ring" aria-hidden />
                <strong>Bo‘sh orbit</strong>
                <em>Slot {i + 1}</em>
              </div>
            );
          }
          const meta = WAREHOUSE_TYPE_META[w.warehouse_type] || {
            label: w.warehouse_type,
            blurb: "Ombor",
            accent: "#67e8f9",
            glow: "rgba(103,232,249,0.3)",
            icon: "○",
          };
          return (
            <article
              key={w.id}
              className="wh-set-slot is-live"
              style={{ "--wh-accent": meta.accent, "--wh-glow": meta.glow }}
            >
              <span className="wh-set-slot-ring" aria-hidden />
              <div className="wh-set-slot-icon" aria-hidden>{meta.icon}</div>
              <strong>{w.name || meta.label}</strong>
              <em>{meta.blurb}</em>
              <button
                type="button"
                className="wh-set-remove"
                disabled={saving}
                onClick={() => handleRemove(w)}
              >
                O‘chirish
              </button>
            </article>
          );
        })}
      </div>

      {canAdd ? (
        <div className="wh-set-add">
          <div className="wh-set-add-head">
            <p className="wh-set-label">Yangi ombor turi</p>
            <span>{warehouses.length}/3 band</span>
          </div>
          <div className="wh-set-type-grid">
            {availableTypes.map((key) => {
              const meta = WAREHOUSE_TYPE_META[key];
              return (
                <button
                  key={key}
                  type="button"
                  className={`wh-set-type ${addType === key ? "active" : ""}`}
                  style={{ "--wh-accent": meta.accent, "--wh-glow": meta.glow }}
                  onClick={() => setAddType(key)}
                >
                  <span className="wh-set-type-icon" aria-hidden>{meta.icon}</span>
                  <strong>{meta.label}</strong>
                  <em>{meta.blurb}</em>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="wh-set-cta"
            disabled={saving || !addType}
            onClick={() => handleAdd(addType)}
          >
            {saving ? "Ulanmoqda..." : `${WAREHOUSE_TYPE_META[addType]?.label || "Ombor"} qo‘shish`}
          </button>
        </div>
      ) : (
        <p className="wh-set-hint">
          {warehouses.length >= 3
            ? "Uchala orbit to‘ldi — maksimal quvvat."
            : "Barcha turlar allaqachon ochilgan."}
        </p>
      )}

      {error && <p className="error">{error}</p>}
      {saved && <p className="settings-success">✓ Ombor orbitasi yangilandi</p>}
    </div>
  );
}
