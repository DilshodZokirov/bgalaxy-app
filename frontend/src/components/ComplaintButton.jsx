import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

const MAX_IMAGES = 5;

export default function ComplaintButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const previews = useMemo(
    () =>
      files.map((file, index) => ({
        key: `${file.name}-${file.size}-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [files]
  );

  useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  useEffect(() => {
    if (open && user?.email && !email) {
      setEmail(user.email);
    }
  }, [open, user, email]);

  function resetForm() {
    setMessage("");
    setFiles([]);
    setError(null);
  }

  function handleFilesChange(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;

    const images = picked.filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name));
    if (images.length !== picked.length) {
      setError("Faqat rasm fayllari biriktiriladi (JPG, PNG, WEBP, GIF)");
    } else {
      setError(null);
    }

    setFiles((prev) => {
      const next = [...prev];
      for (const file of images) {
        if (next.length >= MAX_IMAGES) break;
        const dup = next.some((f) => f.name === file.name && f.size === file.size);
        if (!dup) next.push(file);
      }
      return next.slice(0, MAX_IMAGES);
    });
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.submitComplaint(message.trim(), window.location.pathname, email.trim(), files);
      setSent(true);
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setSent(false);
          setError(null);
          if (user?.email) setEmail(user.email);
        }}
        title="Fikr yoki shikoyat bildirish"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 40,
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          fontSize: 18,
          padding: 0,
        }}
      >
        📢
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 90,
            padding: 20,
          }}
          onClick={() => setOpen(false)}
        >
          <div className="card" style={{ maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>📢 Fikr yoki shikoyat</h3>
              <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
            {sent ? (
              <p style={{ color: "var(--green)" }}>✓ Rahmat! Xabaringiz yuborildi. Tez orada emailingizga javob yozamiz.</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <label style={{ display: "block", fontSize: 12.5, color: "var(--text-dim)", marginBottom: 6 }}>
                  Email manzilingiz
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="siz@email.com"
                  required
                  style={{
                    width: "100%",
                    background: "var(--panel-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    marginBottom: 12,
                  }}
                />
                <label style={{ display: "block", fontSize: 12.5, color: "var(--text-dim)", marginBottom: 6 }}>
                  Xabar
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nima muammo bor yoki qanday taklifingiz bor?"
                  rows={5}
                  style={{
                    width: "100%",
                    background: "var(--panel-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: "var(--radius-sm)",
                    padding: 10,
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    marginBottom: 12,
                    resize: "vertical",
                  }}
                  required
                />

                <label style={{ display: "block", fontSize: 12.5, color: "var(--text-dim)", marginBottom: 6 }}>
                  Rasmlar (ixtiyoriy, max {MAX_IMAGES})
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    padding: "12px 10px",
                    marginBottom: 10,
                    borderRadius: "var(--radius-sm)",
                    border: "1px dashed var(--border)",
                    background: "var(--panel-2)",
                    color: "var(--text-dim)",
                    fontSize: 13,
                    cursor: files.length >= MAX_IMAGES ? "not-allowed" : "pointer",
                    opacity: files.length >= MAX_IMAGES ? 0.6 : 1,
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={files.length >= MAX_IMAGES}
                    onChange={handleFilesChange}
                    style={{ display: "none" }}
                  />
                  🖼 Rasm biriktirish
                </label>

                {previews.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    {previews.map((p, index) => (
                      <div
                        key={p.key}
                        style={{
                          position: "relative",
                          width: 72,
                          height: 72,
                          borderRadius: 10,
                          overflow: "hidden",
                          border: "1px solid var(--border)",
                          background: "#0f172a",
                        }}
                      >
                        <img
                          src={p.url}
                          alt={p.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          style={{
                            position: "absolute",
                            top: 2,
                            right: 2,
                            width: 22,
                            height: 22,
                            padding: 0,
                            borderRadius: "50%",
                            fontSize: 12,
                            lineHeight: "20px",
                            background: "rgba(15,23,42,0.8)",
                            border: "1px solid rgba(148,163,184,0.35)",
                            color: "#fff",
                          }}
                          aria-label="Rasmni olib tashlash"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: 11.5, color: "var(--text-dim)", margin: "0 0 12px" }}>
                  Javobni shu email manziliga yozamiz. Muammo skrinshotini ham yuborishingiz mumkin.
                </p>
                {error && <p className="error">{error}</p>}
                <button type="submit" disabled={sending || !email.trim() || !message.trim()}>
                  {sending ? "Yuborilmoqda..." : "Yuborish"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
