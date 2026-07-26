import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";

const TYPE_LABELS = { technology: "Texnologiya", clothing: "Kiyim-kechak", food: "Oziq-ovqat" };

function emptyForm(type) {
  return {
    name: "",
    price: "",
    quantity: "",
    unit: "dona",
    image_url: "",
    low_stock_threshold: "",
    size: type === "clothing" ? "" : undefined,
    color: type === "clothing" ? "" : undefined,
    expiry_date: type === "food" ? "" : undefined,
    sku: type === "technology" ? "" : undefined,
    notes: "",
  };
}

const UNIT_LABELS = { dona: "dona", kg: "kg", litr: "litr" };

function resizeToDataUrl(file, maxWidth = 800) {
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

function money(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(n)) + " so'm";
}

function ProductModal({ company, product, products, onClose, onSaved }) {
  const isEdit = !!product;
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          name: product.name,
          price: String(product.price),
          quantity: String(product.quantity),
          unit: product.unit || "dona",
          image_url: product.image_url || "",
          low_stock_threshold: product.low_stock_threshold ?? "",
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
  const [imageUploading, setImageUploading] = useState(false);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function pickPrototype(existing) {
    setForm((prev) => ({
      ...prev,
      name: existing.name,
      unit: existing.unit === "kg" ? "kg" : existing.unit,
      image_url: existing.image_url || prev.image_url,
      low_stock_threshold: existing.low_stock_threshold ?? prev.low_stock_threshold,
      size: existing.size ?? prev.size,
      color: existing.color ?? prev.color,
      sku: existing.sku ?? prev.sku,
    }));
  }

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const dataUrl = await resizeToDataUrl(file);
      setField("image_url", dataUrl);
    } catch {
      setError("Rasmni yuklashda xatolik");
    } finally {
      setImageUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // "Tonna" is just a convenience input — always stored converted to kg.
      let quantity = Number(form.quantity) || 0;
      let unit = form.unit;
      if (unit === "tonna") {
        quantity *= 1000;
        unit = "kg";
      }

      const payload = {
        name: form.name,
        price: Number(form.price) || 0,
        unit,
        image_url: form.image_url || null,
        low_stock_threshold: form.low_stock_threshold !== "" ? Number(form.low_stock_threshold) : null,
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
        await api.createWarehouseProduct(company.id, { ...payload, quantity });
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

        {!isEdit && products?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11.5, color: "var(--text-dim)", margin: "0 0 6px" }}>
              Mavjud mahsulotdan tanlang (soni avtomatik qo'shiladi) — yoki pastga yangisini yozing:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 90, overflowY: "auto" }}>
              {products.map((p) => (
                <span
                  key={p.id}
                  onClick={() => pickPrototype(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: form.name === p.name ? "var(--blue)" : "var(--panel-2)",
                    color: form.name === p.name ? "#fff" : "var(--text)",
                    borderRadius: 999,
                    padding: "4px 10px 4px 4px",
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt="" style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--border)", display: "inline-block" }} />
                  )}
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <input type="text" placeholder="Mahsulot nomi" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
        {!isEdit && (
          <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "-6px 0 10px" }}>
            Agar shu nomdagi mahsulot allaqachon bo'lsa, yangi qator ochilmaydi — kiritgan soningiz mavjudiga qo'shiladi.
          </p>
        )}
        <input type="number" placeholder="Narxi (so'm)" value={form.price} onChange={(e) => setField("price", e.target.value)} min="0" step="0.01" required />
        {!isEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" placeholder="Boshlang'ich soni" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} min="0" step="0.001" required style={{ flex: 2 }} />
            <select value={form.unit} onChange={(e) => setField("unit", e.target.value)} style={{ flex: 1, background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "10px" }}>
              <option value="dona">dona</option>
              <option value="kg">kg</option>
              <option value="tonna">tonna</option>
              <option value="litr">litr</option>
            </select>
          </div>
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

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>Rasm (ixtiyoriy)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {form.image_url && (
              <img src={form.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
            )}
            <input type="file" accept="image/*" onChange={handleImageFile} disabled={imageUploading} />
          </div>
        </div>

        <input
          type="number"
          placeholder={`Kam qolgan chegarasi (ixtiyoriy, ${UNIT_LABELS[form.unit === "tonna" ? "kg" : form.unit] || form.unit})`}
          value={form.low_stock_threshold}
          onChange={(e) => setField("low_stock_threshold", e.target.value)}
          min="0"
          step="0.001"
        />
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
      await api.adjustWarehouseStock(company.id, product.id, amount, note || null);
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
          <h3 style={{ fontSize: 16, margin: 0 }}>{product.name} — zaxira qo'shish</h3>
          <button className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginBottom: 18 }}>
          <input type="number" placeholder={`Qo'shiladigan miqdor (${UNIT_LABELS[product.unit] || product.unit})`} value={change} onChange={(e) => setChange(e.target.value)} min="0.001" step="0.001" required />
          <input type="text" placeholder="Izoh (ixtiyoriy)" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>{saving ? "Saqlanmoqda..." : "➕ Qo'shish"}</button>
        </form>

        <p style={{ fontSize: 12.5, fontWeight: 700, margin: "0 0 8px" }}>Tarix</p>
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {history.length === 0 && <p style={{ fontSize: 12, color: "var(--text-dim)" }}>Hali harakat yo'q</p>}
          {history.map((h) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 12 }}>
              <span style={{ color: h.change > 0 ? "var(--green)" : "#f87171" }}>
                {h.change > 0 ? "+" : ""}{h.change} {UNIT_LABELS[product.unit] || product.unit} {h.note ? `— ${h.note}` : ""}
              </span>
              <span style={{ color: "var(--text-dim)" }}>{h.user_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PERIODS = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "1 hafta" },
  { key: "month", label: "1 oy" },
  { key: "3m", label: "3 oy" },
  { key: "6m", label: "6 oy" },
  { key: "year", label: "1 yil" },
];

const DASHBOARD_VIEWS = [
  { key: "current", label: "📦 Mahsulotlar bo'yicha" },
  { key: "budget", label: "💰 Umumiy byudjet" },
  { key: "sold", label: "📈 Sotilgan tovarlar aylanmasi" },
];

function WarehouseDashboard({ company }) {
  const [period, setPeriod] = useState("month");
  const [chartType, setChartType] = useState("line");
  const [view, setView] = useState("current");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getWarehouseDashboard(company.id, period)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [company.id, period]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p style={{ color: "var(--text-dim)" }}>Yuklanmoqda...</p>;

  const unitEntries = Object.entries(data.total_by_unit || {});
  const totalEvents = (data.trend || []).reduce((sum, t) => sum + t.events, 0);
  const maxReceived = Math.max(1, ...data.by_product.map((p) => p.received));
  const maxBudget = Math.max(1, ...(data.by_product_budget || []).map((p) => p.value));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {DASHBOARD_VIEWS.map((v) => (
          <button key={v.key} className={view === v.key ? "" : "secondary"} style={{ width: "auto", padding: "8px 14px", fontSize: 12.5 }} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      {view === "current" && (
      <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ flex: "1 1 160px" }}>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Jami mahsulot turi</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{data.product_count}</div>
        </div>
        <div className="card" style={{ flex: "1 1 220px" }}>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 4 }}>Umumiy zaxira (birlik bo'yicha)</div>
          {unitEntries.length === 0 ? (
            <div style={{ fontSize: 22, fontWeight: 700 }}>0</div>
          ) : (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {unitEntries.map(([unit, qty]) => (
                <div key={unit}><span style={{ fontSize: 18, fontWeight: 700 }}>{qty}</span> <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{UNIT_LABELS[unit] || unit}</span></div>
              ))}
            </div>
          )}
        </div>
        <div className="card" style={{ flex: "1 1 160px" }}>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Kirim harakatlari (davr)</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--green)" }}>{totalEvents}</div>
        </div>
        <div className="card" style={{ flex: "1 1 160px" }}>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Sotilgan (davr)</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f87171" }}>{data.total_sold}</div>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 2 }}>Distributiv savdo ulanganda avtomatik hisoblanadi</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <strong style={{ fontSize: 14 }}>📈 Kirim harakatlari (davr bo'yicha)</strong>
          <div style={{ display: "flex", gap: 6 }}>
            {["line", "bar"].map((t) => (
              <button key={t} className="secondary" style={{ width: "auto", padding: "5px 10px", fontSize: 11, opacity: chartType === t ? 1 : 0.5 }} onClick={() => setChartType(t)}>
                {t === "line" ? "📉 Chiziq" : "📊 Ustun"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {PERIODS.map((p) => (
            <button key={p.key} className={period === p.key ? "" : "secondary"} style={{ width: "auto", padding: "5px 12px", fontSize: 11.5 }} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "0 0 12px" }}>
          Turli mahsulotlar turli birlikda (dona/kg/litr) o'lchangani uchun, bu grafik ularni bitta noto'g'ri songa qo'shmaydi — shunchaki qancha marta zaxira qo'shilganini ko'rsatadi. Har bir mahsulotning aniq miqdori pastdagi ro'yxatda.
        </p>

        <ResponsiveContainer width="100%" height={220}>
          {chartType === "line" ? (
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={11} />
              <YAxis stroke="var(--text-dim)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey="events" name="Kirim soni" stroke="var(--cyan, #22d3ee)" strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={11} />
              <YAxis stroke="var(--text-dim)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)" }} />
              <Bar dataKey="events" name="Kirim soni" fill="var(--cyan, #22d3ee)" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="card">
        <strong style={{ fontSize: 14, display: "block", marginBottom: 14 }}>📦 Mahsulotlar bo'yicha qabul qilingan (davr)</strong>
        {data.by_product.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Bu davrda hech qanday kirim bo'lmagan.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.by_product.map((p) => (
              <div key={p.name + p.unit}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span>{p.name}</span>
                  <span style={{ color: "var(--green)" }}>+{p.received} {UNIT_LABELS[p.unit] || p.unit}</span>
                </div>
                <div style={{ height: 6, background: "var(--panel-2)", borderRadius: 999 }}>
                  <div style={{ height: "100%", width: `${(p.received / maxReceived) * 100}%`, background: "var(--green)", borderRadius: 999 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}

      {view === "budget" && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Umumiy byudjet qiymati (hozirgi zaxira)</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--cyan, #22d3ee)" }}>{money(data.total_budget_value)}</div>
            <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
              Har bir mahsulot narxi × soni bo'yicha hisoblangan — shu sababli turli birlikdagi (dona/kg/litr) mahsulotlarni bemalol bitta qiymatda solishtirish mumkin.
            </p>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <strong style={{ fontSize: 14 }}>📈 Qabul qilingan zaxira qiymati (davr bo'yicha)</strong>
              <div style={{ display: "flex", gap: 6 }}>
                {["line", "bar"].map((t) => (
                  <button key={t} className="secondary" style={{ width: "auto", padding: "5px 10px", fontSize: 11, opacity: chartType === t ? 1 : 0.5 }} onClick={() => setChartType(t)}>
                    {t === "line" ? "📉 Chiziq" : "📊 Ustun"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {PERIODS.map((p) => (
                <button key={p.key} className={period === p.key ? "" : "secondary"} style={{ width: "auto", padding: "5px 12px", fontSize: 11.5 }} onClick={() => setPeriod(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              {chartType === "line" ? (
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)" }} formatter={(v) => money(v)} />
                  <Line type="monotone" dataKey="received_value" name="Qabul qilingan qiymat" stroke="var(--cyan, #22d3ee)" strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)" }} formatter={(v) => money(v)} />
                  <Bar dataKey="received_value" name="Qabul qilingan qiymat" fill="var(--cyan, #22d3ee)" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="card">
            <strong style={{ fontSize: 14, display: "block", marginBottom: 14 }}>💰 Mahsulotlar bo'yicha byudjet</strong>
            {(!data.by_product_budget || data.by_product_budget.length === 0) ? (
              <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>Hali mahsulot qo'shilmagan.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.by_product_budget.map((p) => (
                  <div key={p.name + p.unit}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                      <span>{p.name} <span style={{ color: "var(--text-dim)" }}>({p.quantity} {UNIT_LABELS[p.unit] || p.unit})</span></span>
                      <span style={{ color: "var(--cyan, #22d3ee)" }}>{money(p.value)}</span>
                    </div>
                    <div style={{ height: 6, background: "var(--panel-2)", borderRadius: 999 }}>
                      <div style={{ height: "100%", width: `${(p.value / maxBudget) * 100}%`, background: "var(--cyan, #22d3ee)", borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {view === "sold" && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Sotilgan tovarlar aylanmasi (umumiy narxi)</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#f87171" }}>{money(data.total_sold_value || 0)}</div>
            <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 10 }}>
              Hozircha savdo ma'lumotlari yo'q. Distributiv firma moduli ulanganda, sotilgan har bir mahsulot bu yerda avtomatik hisoblanadi va aylanma real vaqtda ko'rinadi.
            </p>
          </div>

          <div className="card">
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <strong style={{ fontSize: 14 }}>📈 Sotuv aylanmasi (davr bo'yicha)</strong>
              <div style={{ display: "flex", gap: 6 }}>
                {["line", "bar"].map((t) => (
                  <button key={t} className="secondary" style={{ width: "auto", padding: "5px 10px", fontSize: 11, opacity: chartType === t ? 1 : 0.5 }} onClick={() => setChartType(t)}>
                    {t === "line" ? "📉 Chiziq" : "📊 Ustun"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {PERIODS.map((p) => (
                <button key={p.key} className={period === p.key ? "" : "secondary"} style={{ width: "auto", padding: "5px 12px", fontSize: 11.5 }} onClick={() => setPeriod(p.key)}>
                  {p.label}
                </button>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              {chartType === "line" ? (
                <LineChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)" }} formatter={(v) => money(v)} />
                  <Line type="monotone" dataKey="sold_value" name="Sotuv qiymati" stroke="#f87171" strokeWidth={2} />
                </LineChart>
              ) : (
                <BarChart data={data.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={11} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} />
                  <Tooltip contentStyle={{ background: "var(--panel)", border: "1px solid var(--border)" }} formatter={(v) => money(v)} />
                  <Bar dataKey="sold_value" name="Sotuv qiymati" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function OrderModal({ product, onClose, onOrdered }) {
  const [quantity, setQuantity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const q = Number(quantity);
    if (!q || q <= 0) {
      setError("Musbat son kiriting");
      return;
    }
    if (q > product.quantity) {
      setError("Sotuvchida yetarli zaxira yo'q");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await product.onOrder(q);
      onOrdered();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }} onClick={onClose}>
      <form className="card" style={{ maxWidth: 380, width: "100%" }} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>{product.name}</h3>
          <button type="button" className="secondary" style={{ width: "auto", padding: "6px 12px" }} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 12px" }}>
          {product.company_name} — mavjud: {product.quantity} {UNIT_LABELS[product.unit] || product.unit}, narxi: {money(product.price)}/{UNIT_LABELS[product.unit] || product.unit}
        </p>
        <input type="number" placeholder={`Buyurtma miqdori (${UNIT_LABELS[product.unit] || product.unit})`} value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.001" step="0.001" max={product.quantity} required />
        {quantity && !isNaN(Number(quantity)) && (
          <p style={{ fontSize: 12.5, color: "var(--cyan, #22d3ee)", margin: "0 0 12px" }}>Jami: {money(Number(quantity) * product.price)}</p>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={saving}>{saving ? "Buyurtma berilmoqda..." : "🛒 Buyurtma berish"}</button>
      </form>
    </div>
  );
}

function MarketplaceTab({ company, onOrdered }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderProduct, setOrderProduct] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    refresh();
  }, [company.id]);

  function refresh() {
    setLoading(true);
    api
      .getWarehouseMarketplace(company.id)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  const visible = products.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div>
      <p style={{ fontSize: 12.5, color: "var(--text-dim)", marginBottom: 14 }}>
        Bu yerda ishlab chiqaruvchi kompaniyalarning ombordagi mahsulotlari ko'rinadi — buyurtma bersangiz, avtomatik ravishda o'z omboringizga qo'shiladi.
      </p>
      <input type="text" placeholder="🔍 Nomi bo'yicha qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 280, marginBottom: 16 }} />

      {error && <p className="error">{error}</p>}
      {loading && <p style={{ color: "var(--text-dim)" }}>Yuklanmoqda...</p>}
      {!loading && visible.length === 0 && <div className="empty-card"><p>Hozircha bozorda mahsulot yo'q.</p></div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {visible.map((p) => (
          <div key={p.id} className="card">
            {p.image_url && <img src={p.image_url} alt={p.name} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8, marginBottom: 10 }} />}
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 4 }}>🏭 {p.company_name}</div>
            <strong style={{ fontSize: 14 }}>{p.name}</strong>
            <div style={{ fontSize: 13, color: "var(--text-dim)", margin: "4px 0" }}>{money(p.price)} / {UNIT_LABELS[p.unit] || p.unit}</div>
            <div style={{ fontSize: 12, color: "var(--green)", marginBottom: 10 }}>Mavjud: {p.quantity} {UNIT_LABELS[p.unit] || p.unit}</div>
            <button
              style={{ width: "100%", padding: "8px", fontSize: 12.5 }}
              onClick={() =>
                setOrderProduct({
                  ...p,
                  onOrder: (q) => api.placeWarehouseOrder(company.id, p.company_id, p.id, q),
                })
              }
            >
              🛒 Buyurtma berish
            </button>
          </div>
        ))}
      </div>

      {orderProduct && (
        <OrderModal
          product={orderProduct}
          onClose={() => setOrderProduct(null)}
          onOrdered={() => {
            refresh();
            onOrdered?.();
          }}
        />
      )}
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
  const [tab, setTab] = useState("dashboard"); // "dashboard" | "products"
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // "all" | "low" | "out"
  const [sortBy, setSortBy] = useState("recent"); // "recent" | "name" | "quantity"

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

  async function handleQuickAdd(product) {
    try {
      await api.adjustWarehouseStock(company.id, product.id, 1, "Tezkor qo'shish");
      refreshProducts();
    } catch (err) {
      setError(err.message);
    }
  }

  function isLowStock(p) {
    return p.low_stock_threshold != null && p.quantity > 0 && p.quantity <= p.low_stock_threshold;
  }

  function handleExportCsv() {
    const header = ["Nomi", "Narxi", "Soni", "Birlik", "O'lcham", "Rang", "Muddat", "SKU", "Izoh"];
    const rows = visibleProducts.map((p) => [
      p.name, p.price, p.quantity, p.unit, p.size || "", p.color || "", p.expiry_date || "", p.sku || "", p.notes || "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ombor-${company.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const visibleProducts = products
    .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((p) => {
      if (stockFilter === "low") return isLowStock(p);
      if (stockFilter === "out") return p.quantity <= 0;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "quantity") return b.quantity - a.quantity;
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const lowStockCount = products.filter(isLowStock).length;
  const outOfStockCount = products.filter((p) => p.quantity <= 0).length;

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
        <p>
          {company.company_type === "distributor"
            ? "Distributiv firma — boshqa kompaniyalar omboridan buyurtma qiladi"
            : `Ishlab chiqarish turi: ${TYPE_LABELS[company.warehouse_type] || company.warehouse_type}`}
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button className={tab === "dashboard" ? "" : "secondary"} style={{ width: "auto", padding: "9px 16px" }} onClick={() => setTab("dashboard")}>
          📊 Dashboard
        </button>
        <button className={tab === "products" ? "" : "secondary"} style={{ width: "auto", padding: "9px 16px" }} onClick={() => setTab("products")}>
          📦 Ombor mahsulotlari
        </button>
        {company.company_type === "distributor" && (
          <button className={tab === "marketplace" ? "" : "secondary"} style={{ width: "auto", padding: "9px 16px" }} onClick={() => setTab("marketplace")}>
            🛒 Bozor
          </button>
        )}
        <button className="secondary" style={{ width: "auto", padding: "9px 16px", marginLeft: "auto" }} onClick={() => navigate("/dashboard")}>
          ← Korxonaga qaytish
        </button>
      </div>

      {tab === "dashboard" && <WarehouseDashboard company={company} />}

      {tab === "marketplace" && <MarketplaceTab company={company} onOrdered={refreshProducts} />}

      {tab === "products" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
            {company.company_type !== "distributor" && (
              <button style={{ width: "auto", padding: "10px 18px" }} onClick={() => setShowAdd(true)}>
                + Yangi mahsulot
              </button>
            )}
            <input
              type="text"
              placeholder="🔍 Nomi bo'yicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220, margin: 0 }}
            />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: "var(--panel-2)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: 13 }}>
              <option value="recent">Yangi qo'shilgan</option>
              <option value="name">Nomi (A-Z)</option>
              <option value="quantity">Soni (ko'pdan kamga)</option>
            </select>
            <button className="secondary" style={{ width: "auto", padding: "9px 16px", marginLeft: "auto" }} onClick={handleExportCsv}>
              ⬇️ Excel/CSV eksport
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <button className={stockFilter === "all" ? "" : "secondary"} style={{ width: "auto", padding: "6px 14px", fontSize: 12.5 }} onClick={() => setStockFilter("all")}>
              Barchasi ({products.length})
            </button>
            <button className={stockFilter === "low" ? "" : "secondary"} style={{ width: "auto", padding: "6px 14px", fontSize: 12.5, color: stockFilter === "low" ? undefined : "var(--orange, #f59e0b)" }} onClick={() => setStockFilter("low")}>
              ⚠️ Kam qolgan ({lowStockCount})
            </button>
            <button className={stockFilter === "out" ? "" : "secondary"} style={{ width: "auto", padding: "6px 14px", fontSize: 12.5, color: stockFilter === "out" ? undefined : "#f87171" }} onClick={() => setStockFilter("out")}>
              ❌ Tugagan ({outOfStockCount})
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          {loading && <p style={{ color: "var(--text-dim)" }}>Yuklanmoqda...</p>}

          {!loading && products.length === 0 && (
            <div className="empty-card"><p>Hali mahsulot qo'shilmagan.</p></div>
          )}
          {!loading && products.length > 0 && visibleProducts.length === 0 && (
            <div className="empty-card"><p>Qidiruv/filtr shartlariga mos mahsulot topilmadi.</p></div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {visibleProducts.map((p) => (
              <div key={p.id} className="card" style={isLowStock(p) ? { borderColor: "rgba(245,158,11,0.5)" } : p.quantity <= 0 ? { borderColor: "rgba(248,113,113,0.5)" } : undefined}>
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, marginBottom: 10 }} />
                )}
                {p.source_company_name && (
                  <div style={{ fontSize: 10.5, color: "var(--blue, #3b82f6)", marginBottom: 6 }}>🚚 {p.source_company_name} dan</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <strong style={{ fontSize: 14.5 }}>{p.name}</strong>
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: p.quantity <= 0 ? "rgba(248,113,113,0.15)" : isLowStock(p) ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)",
                      color: p.quantity <= 0 ? "#f87171" : isLowStock(p) ? "#f59e0b" : "var(--green)",
                    }}
                  >
                    {p.quantity <= 0 ? "❌" : isLowStock(p) ? "⚠️" : ""} {p.quantity} {UNIT_LABELS[p.unit] || p.unit}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>{money(p.price)}</div>
                {p.size && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>O'lcham: {p.size}{p.color ? `, Rang: ${p.color}` : ""}</div>}
                {p.expiry_date && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>Muddat: {p.expiry_date}</div>}
                {p.sku && <div style={{ fontSize: 12, color: "var(--text-dim)" }}>SKU: {p.sku}</div>}
                {p.notes && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{p.notes}</div>}

                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <button style={{ flex: 1, padding: "7px", fontSize: 12 }} onClick={() => setStockProduct(p)}>➕ Zaxira qo'shish</button>
                  {p.unit === "dona" && (
                    <button className="secondary" style={{ width: "auto", padding: "7px 10px", fontSize: 12 }} onClick={() => handleQuickAdd(p)} title="Tez +1 qo'shish">+1</button>
                  )}
                  <button className="secondary" style={{ width: "auto", padding: "7px 10px", fontSize: 12 }} onClick={() => setEditProduct(p)}>✏️</button>
                  <button className="secondary" style={{ width: "auto", padding: "7px 10px", fontSize: 12, color: "#f87171" }} onClick={() => handleDelete(p)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showAdd && <ProductModal company={company} products={products} onClose={() => setShowAdd(false)} onSaved={refreshProducts} />}
      {editProduct && <ProductModal company={company} product={editProduct} products={products} onClose={() => setEditProduct(null)} onSaved={refreshProducts} />}
      {stockProduct && <StockModal company={company} product={stockProduct} onClose={() => setStockProduct(null)} onSaved={refreshProducts} />}
    </AppShell>
  );
}
