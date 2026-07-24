import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";

const TYPE_LABELS = { technology: "Texnologiya", clothing: "Kiyim-kechak", food: "Oziq-ovqat" };

function emptyForm(type) {
  return {
    name: "",
    price: "",
    quantity: "",
    size: type === "clothing" ? "" : undefined,
    color: type === "clothing" ? "" : undefined,
    expiry_date: type === "food" ? "" : undefined,
    sku: type === "technology" ? "" : undefined,
    notes: "",
  };
}

function money(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
}

function ProductModal({ company, product, onClose, onSaved }) {
  const isEdit = !!product;
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          name: product.name,
          price: String(product.price),
          quantity: String(product.quantity),
          size: product.size ?? "",
          color: product.color ?? "",
          expiry_date: product.expiry_date ?? "",
          sku: product.sku ?? "",
          notes: product.notes ?? "",
        }
      : emptyForm(company.warehouse_type)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        price: Number(form.price) || 0,
        notes: form.notes || null,
      };
      if (company.warehouse_type === "clothing") {
        payload.size = form.size || null;
        payload.color = form.color || null;
      }
      if (company.warehouse_type === "food") {
        payload.expiry_date = form.expiry_date || null;
      }
      if (company.warehouse_type === "technology") {
        payload.sku = form.sku || null;
      }

      if (isEdit) {
        await api.updateWarehouseProduct(company.id, product.id, payload);
      } else {
        await api.createWarehouseProduct(company.id, { ...payload, quantity: Number(form.quantity) || 0 });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
      onClick={onClose}
    >
      <form className="card" style={{ maxWidth: 420, width: "100%" }} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>{isEdit ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</h3>
          <button type="button" className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        <input type="text" placeholder="Mahsulot nomi" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
        <input type="number" placeholder="Narxi (so'm)" value={form.price} onChange={(e) => setField("price", e.target.value)} min="0" step="0.01" required />
        {!isEdit && (
          <input type="number" placeholder="Boshlang'ich soni" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} min="0" required />
        )}

        {company.warehouse_type === "clothing" && (
          <>
            <input type="text" placeholder="O'lcham (masalan M, L, 42)" value={form.size} onChange={(e) => setField("size", e.target.value)} />
            <input type="text" placeholder="Rang" value={form.color} onChange={(e) => setField("color", e.target.value)} />
          </>
        )}
        {company.warehouse_type === "food" && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Yaroqlilik muddati</label>
            <input type="date" value={form.expiry_date} onChange={(e) => setField("expiry_date", e.target.value)} />
          </div>
        )}
        {company.warehouse_type === "technology" && (
          <input type="text" placeholder="SKU / model raqami" value={form.sku} onChange={(e) => setField("sku", e.target.value)} />
        )}

        <textarea placeholder="Izoh (ixtiyoriy)" value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} style={{ width: "100%", resize: "vertical" }} />

        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>{saving ? "Saqlanmoqda..." : isEdit ? "Saqlash" : "Qo'shish"}</button>
      </form>
    </div>
  );
}

function StockModal({ company, product, onClose, onSaved }) {
  const [change, setChange] = useState("");
  const [note, setNote] = useState("");
  const [direction, setDirection] = useState("in"); // in = kirim, out = chiqim
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.getWarehouseStockHistory(company.id, product.id).then(setHistory).catch(() => {});
  }, [company.id, product.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    const amount = Number(change);
    if (!amount || amount <= 0) {
      setError("Musbat son kiriting");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.adjustWarehouseStock(company.id, product.id, direction === "in" ? amount : -amount, note || null);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
      onClick={onClose}
    >
      <div className="card" style={{ maxWidth: 440, width: "100%" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>{product.name} — zaxira</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button type="button" className={direction === "in" ? "" : "secondary"} style={{ flex: 1 }} onClick={() => setDirection("in")}>⬇️ Kirim</button>
            <button type="button" className={direction === "out" ? "" : "secondary"} style={{ flex: 1 }} onClick={() => setDirection("out")}>⬆️ Chiqim</button>
          </div>
          <input type="number" placeholder="Miqdori" value={change} onChange={(e) => setChange(e.target.value)} min="1" required />
          <input type="text" placeholder="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>{saving ? "Saqlanmoqda..." : "Tasdiqlash"}</button>
        </form>

        <p style={{ fontSize: 12.5, fontWeight: 700, margin: "0 0 8px" }}>Tarix</p>
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {history.length === 0 && <p style={{ fontSize: 12, color: "var(--text-dim)" }}>Hali harakat yo'q</p>}
          {history.map((h) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
              <span style={{ color: h.change > 0 ? "var(--green)" : "#f87171" }}>
                {h.change > 0 ? "+" : ""}{h.change} {h.note ? `— ${h.note}` : ""}
              </span>
              <span style={{ color: "var(--text-dim)" }}>{h.user_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Warehouse() {
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => setCompany(pickActiveCompany(list)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!company) return;
    refreshProducts();
  }, [company]);

  function refreshProducts() {
    if (!company) return;
    setLoading(true);
    api
      .getWarehouseProducts(company.id)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleDelete(product) {
    if (!confirm(`"${product.name}" mahsulotini o'chirmoqchimisiz?`)) return;
    try {
      await api.deleteWarehouseProduct(company.id, product.id);
      refreshProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!company) {
    return (
      <AppShell>
        <div className="page-header"><h1>Ombor</h1></div>
        <div className="empty-card">
          <p>Avval kompaniya yarating.</p>
          <button onClick={() => navigate("/companies")}>+ Kompaniya yaratish</button>
        </div>
      </AppShell>
    );
  }

  if (!company.has_warehouse) {
    return (
      <AppShell>
        <div className="page-header"><h1>Ombor</h1></div>
        <div className="empty-card">
          <p>Bu kompaniyada ombor bo'limi hali yoqilmagan.</p>
          <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Profil → Sozlamalar → Kompaniya → Ombor bo'limidan yoqishingiz mumkin.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page-header">
        <h1>Ombor — {company.name}</h1>
        <p>Ishlab chiqarish turi: {TYPE_LABELS[company.warehouse_type] || company.warehouse_type}</p>
      </div>

      <button style={{ width: "auto", padding: "10px 18px", marginBottom: 18 }} onClick={() => setShowAdd(true)}>
        + Yangi mahsulot
      </button>

      {error && <p className="error">{error}</p>}
      {loading && <p style={{ color: "var(--text-dim)" }}>Yuklanmoqda...</p>}

      {!loading && products.length === 0 && (
        <div className="empty-card"><p>Hali mahsulot qo'shilmagan.</p></div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {products.map((p) => (
          <div key={p.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <strong style={{ fontSize: 14.5 }}>{p.name}</strong>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: p.quantity > 0 ? "rgba(16,185,129,0.15)" : "rgba(248,113,113,0.15)",
                  color: p.quantity > 0 ? "var(--green)" : "#f87171",
                }}
              >
                {p.quantity} dona
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>{money(p.price)}</div>
            {p.size && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>O'lcham: {p.size}{p.color ? `, Rang: ${p.color}` : ""}</div>}
            {p.expiry_date && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Muddat: {p.expiry_date}</div>}
            {p.sku && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>SKU: {p.sku}</div>}
            {p.notes && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{p.notes}</div>}

            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button style={{ flex: 1, padding: "7px", fontSize: 12 }} onClick={() => setStockProduct(p)}>📦 Kirim/Chiqim</button>
              <button className="secondary" style={{ width: "auto", padding: "7px 10px", fontSize: 12 }} onClick={() => setEditProduct(p)}>✏️</button>
              <button className="secondary" style={{ width: "auto", padding: "7px 10px", fontSize: 12, color: "#f87171" }} onClick={() => handleDelete(p)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && <ProductModal company={company} onClose={() => setShowAdd(false)} onSaved={refreshProducts} />}
      {editProduct && <ProductModal company={company} product={editProduct} onClose={() => setEditProduct(null)} onSaved={refreshProducts} />}
      {stockProduct && <StockModal company={company} product={stockProduct} onClose={() => setStockProduct(null)} onSaved={refreshProducts} />}
    </AppShell>
  );
}
