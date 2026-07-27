import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "../api/client";
import { pickActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";
import Wh3DBarChart from "../components/Wh3DBarChart";

const TYPE_LABELS = { technology: "Texnologiya", clothing: "Kiyim-kechak", food: "Oziq-ovqat" };
const UNIT_LABELS = { dona: "dona", kg: "kg", litr: "litr" };

const ORDER_STATUS_LABELS = {
  ordered: "Buyurtma qilindi",
  loading: "Yuklash",
  loaded: "Yuklandi",
  on_road: "Yo'lda",
  courier_accepted: "Yetkazuvchi qabul qildi",
  awaiting_receipt: "Qabul qilish",
  completed: "Yakunlandi",
  cancelled: "Bekor qilindi",
};

const ORDER_STEPS = ["ordered", "loading", "loaded", "on_road", "courier_accepted", "awaiting_receipt", "completed"];

const PERIODS = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "1 hafta" },
  { key: "month", label: "1 oy" },
  { key: "3m", label: "3 oy" },
  { key: "6m", label: "6 oy" },
  { key: "year", label: "1 yil" },
];

const DASHBOARD_VIEWS = [
  { key: "current", label: "Mahsulotlar" },
  { key: "budget", label: "Byudjet" },
  { key: "sold", label: "Aylanma" },
];

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

function stockTone(p, isLow) {
  if (p.quantity <= 0) return "out";
  if (isLow) return "low";
  return "ok";
}

function WarehouseHeading({ companyName, subtitle }) {
  return (
    <div className="galaxy-page-heading">
      <p className="galaxy-page-kicker">Warehouse Hub</p>
      <h1>Ombor{companyName ? ` — ${companyName}` : ""}</h1>
      <p>{subtitle || "Mahsulotlar, zaxira va bozor — bitta stansiyada."}</p>
    </div>
  );
}

function ChartBlock({ title, period, setPeriod, chartType, setChartType, children, hint }) {
  return (
    <section className="wh-panel">
      <div className="wh-panel-head">
        <h3>{title}</h3>
        <div className="wh-seg">
          {[
            ["line", "Chiziq"],
            ["bar", "Ustun"],
            ["3d", "3D"],
          ].map(([t, label]) => (
            <button key={t} type="button" className={chartType === t ? "active" : ""} onClick={() => setChartType(t)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="wh-period-row">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" className={period === p.key ? "active" : ""} onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
      </div>
      {hint && <p className="wh-hint">{hint}</p>}
      {children}
    </section>
  );
}

function ProductModal({ company, product, products, warehouseType, warehouseId, onClose, onSaved }) {
  const isEdit = !!product;
  const type = warehouseType || product?.warehouse_type || company.warehouse_type;
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
      : emptyForm(type)
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
      setField("image_url", await resizeToDataUrl(file));
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
      if (type === "clothing") {
        payload.size = form.size || null;
        payload.color = form.color || null;
      }
      if (type === "food") {
        payload.expiry_date = form.expiry_date || null;
      }
      if (type === "technology") {
        payload.sku = form.sku || null;
      }

      if (isEdit) {
        await api.updateWarehouseProduct(company.id, product.id, payload);
      } else {
        await api.createWarehouseProduct(company.id, {
          ...payload,
          quantity,
          ...(warehouseId ? { warehouse_id: warehouseId } : {}),
        });
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
    <div className="wh-modal-backdrop" onClick={onClose}>
      <form className="card wh-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="wh-modal-head">
          <h3>{isEdit ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</h3>
          <button type="button" className="secondary wh-soft-btn" onClick={onClose}>Yopish</button>
        </div>

        {!isEdit && products?.length > 0 && (
          <div className="wh-proto">
            <p>Mavjud mahsulotdan tanlang — yoki pastga yangisini yozing:</p>
            <div className="wh-proto-list">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`wh-proto-chip ${form.name === p.name ? "active" : ""}`}
                  onClick={() => pickPrototype(p)}
                >
                  {p.image_url ? <img src={p.image_url} alt="" /> : <span className="wh-proto-dot" />}
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <label>Nomi</label>
        <input type="text" placeholder="Mahsulot nomi" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
        {!isEdit && (
          <p className="wh-hint">Agar shu nomdagi mahsulot bo‘lsa, soni mavjudiga qo‘shiladi.</p>
        )}
        <label>Narxi</label>
        <input type="number" placeholder="Narxi (so'm)" value={form.price} onChange={(e) => setField("price", e.target.value)} min="0" step="0.01" required />
        {!isEdit && (
          <div className="wh-form-row">
            <div>
              <label>Boshlang‘ich soni</label>
              <input type="number" value={form.quantity} onChange={(e) => setField("quantity", e.target.value)} min="0" step="0.001" required />
            </div>
            <div>
              <label>Birlik</label>
              <select value={form.unit} onChange={(e) => setField("unit", e.target.value)}>
                <option value="dona">dona</option>
                <option value="kg">kg</option>
                <option value="tonna">tonna</option>
                <option value="litr">litr</option>
              </select>
            </div>
          </div>
        )}

        {type === "clothing" && (
          <div className="wh-form-row">
            <div>
              <label>O‘lcham</label>
              <input type="text" placeholder="M, L, 42" value={form.size} onChange={(e) => setField("size", e.target.value)} />
            </div>
            <div>
              <label>Rang</label>
              <input type="text" placeholder="Rang" value={form.color} onChange={(e) => setField("color", e.target.value)} />
            </div>
          </div>
        )}
        {type === "food" && (
          <>
            <label>Yaroqlilik muddati</label>
            <input type="date" value={form.expiry_date} onChange={(e) => setField("expiry_date", e.target.value)} />
          </>
        )}
        {type === "technology" && (
          <>
            <label>SKU / model</label>
            <input type="text" placeholder="SKU / model raqami" value={form.sku} onChange={(e) => setField("sku", e.target.value)} />
          </>
        )}

        <label>Rasm (ixtiyoriy)</label>
        <div className="wh-image-row">
          {form.image_url && <img src={form.image_url} alt="" />}
          <input type="file" accept="image/*" onChange={handleImageFile} disabled={imageUploading} />
        </div>

        <label>Kam qolgan chegarasi</label>
        <input
          type="number"
          placeholder={`Ixtiyoriy (${UNIT_LABELS[form.unit === "tonna" ? "kg" : form.unit] || form.unit})`}
          value={form.low_stock_threshold}
          onChange={(e) => setField("low_stock_threshold", e.target.value)}
          min="0"
          step="0.001"
        />
        <label>Izoh</label>
        <textarea placeholder="Izoh (ixtiyoriy)" value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} />

        {error && <p className="error">{error}</p>}
        <button type="submit" className="wh-cta" disabled={saving}>
          {saving ? "Saqlanmoqda..." : isEdit ? "Saqlash" : "Qo'shish"}
        </button>
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
    <div className="wh-modal-backdrop" onClick={onClose}>
      <div className="card wh-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wh-modal-head">
          <h3>{product.name} — zaxira</h3>
          <button type="button" className="secondary wh-soft-btn" onClick={onClose}>Yopish</button>
        </div>
        <form onSubmit={handleSubmit} className="wh-stock-form">
          <label>Qo‘shiladigan miqdor ({UNIT_LABELS[product.unit] || product.unit})</label>
          <input type="number" value={change} onChange={(e) => setChange(e.target.value)} min="0.001" step="0.001" required />
          <label>Izoh</label>
          <input type="text" placeholder="Ixtiyoriy" value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="wh-cta" disabled={saving}>{saving ? "Saqlanmoqda..." : "Qo'shish"}</button>
        </form>
        <h4 className="wh-history-title">Tarix</h4>
        <div className="wh-history">
          {history.length === 0 && <p className="wh-empty-inline">Hali harakat yo‘q</p>}
          {history.map((h) => (
            <div key={h.id} className="wh-history-row">
              <span className={h.change > 0 ? "up" : "down"}>
                {h.change > 0 ? "+" : ""}{h.change} {UNIT_LABELS[product.unit] || product.unit}
                {h.note ? ` — ${h.note}` : ""}
              </span>
              <span>{h.user_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WarehouseDashboard({ company, warehouseId, multi }) {
  const [period, setPeriod] = useState("month");
  const [chartType, setChartType] = useState("3d");
  const [view, setView] = useState("current");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getWarehouseDashboard(company.id, period, warehouseId)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [company.id, period, warehouseId]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="wh-empty-inline">Yuklanmoqda...</p>;

  const unitEntries = Object.entries(data.total_by_unit || {});
  const totalEvents = (data.trend || []).reduce((sum, t) => sum + t.events, 0);
  const maxReceived = Math.max(1, ...data.by_product.map((p) => p.received));
  const maxBudget = Math.max(1, ...(data.by_product_budget || []).map((p) => p.value));
  const tooltipStyle = { background: "#0f172a", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 10, color: "#f8fafc" };
  const budgetLabel = multi && !warehouseId ? "Umumiy byudjet qiymati (barcha omborlar)" : "Umumiy byudjet qiymati";

  return (
    <div className="wh-dashboard">
      <div className="wh-view-tabs">
        {DASHBOARD_VIEWS.map((v) => (
          <button key={v.key} type="button" className={view === v.key ? "active" : ""} onClick={() => setView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      {view === "current" && (
        <>
          <div className="wh-stats">
            <article className="wh-stat">
              <span>Jami mahsulot turi</span>
              <strong>{data.product_count}</strong>
            </article>
            <article className="wh-stat">
              <span>Umumiy zaxira</span>
              {unitEntries.length === 0 ? (
                <strong>0</strong>
              ) : (
                <div className="wh-stat-units">
                  {unitEntries.map(([unit, qty]) => (
                    <strong key={unit}>{qty} <small>{UNIT_LABELS[unit] || unit}</small></strong>
                  ))}
                </div>
              )}
            </article>
            <article className="wh-stat good">
              <span>Kirim harakatlari</span>
              <strong>{totalEvents}</strong>
            </article>
            <article className="wh-stat warn">
              <span>Sotilgan (davr)</span>
              <strong>{data.total_sold}</strong>
            </article>
          </div>

          <ChartBlock
            title="Kirim harakatlari"
            period={period}
            setPeriod={setPeriod}
            chartType={chartType}
            setChartType={setChartType}
            hint="Turli birlikdagi mahsulotlar bitta songa qo‘shilmaydi — faqat kirim soni ko‘rsatiladi."
          >
            {chartType === "3d" ? (
              <Wh3DBarChart data={data.trend} dataKey="events" color="#38bdf8" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                {chartType === "line" ? (
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="events" name="Kirim soni" stroke="#38bdf8" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <BarChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="events" name="Kirim soni" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </ChartBlock>

          <section className="wh-panel">
            <div className="wh-panel-head"><h3>Mahsulotlar bo‘yicha qabul</h3></div>
            {data.by_product.length === 0 ? (
              <p className="wh-empty-inline">Bu davrda kirim bo‘lmagan.</p>
            ) : (
              <div className="wh-bars">
                {data.by_product.map((p) => (
                  <div key={p.name + p.unit} className="wh-bar-row">
                    <div className="wh-bar-meta">
                      <span>{p.name}</span>
                      <span className="up">+{p.received} {UNIT_LABELS[p.unit] || p.unit}</span>
                    </div>
                    <div className="wh-bar-track">
                      <div style={{ width: `${(p.received / maxReceived) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {view === "budget" && (
        <>
          <article className="wh-hero-metric">
            <span>{budgetLabel}</span>
            <strong>{money(data.total_budget_value)}</strong>
            <p>Narx × soni — turli birliklarni bitta qiymatda solishtirish mumkin.</p>
          </article>
          <ChartBlock title="Qabul qilingan zaxira qiymati" period={period} setPeriod={setPeriod} chartType={chartType} setChartType={setChartType}>
            {chartType === "3d" ? (
              <Wh3DBarChart data={data.trend} dataKey="received_value" color="#2dd4bf" valueFormatter={money} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                {chartType === "line" ? (
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                    <Line type="monotone" dataKey="received_value" name="Qiymat" stroke="#2dd4bf" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <BarChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                    <Bar dataKey="received_value" name="Qiymat" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </ChartBlock>
          <section className="wh-panel">
            <div className="wh-panel-head"><h3>Mahsulotlar bo‘yicha byudjet</h3></div>
            {(!data.by_product_budget || data.by_product_budget.length === 0) ? (
              <p className="wh-empty-inline">Hali mahsulot yo‘q.</p>
            ) : (
              <div className="wh-bars">
                {data.by_product_budget.map((p) => (
                  <div key={p.name + p.unit} className="wh-bar-row">
                    <div className="wh-bar-meta">
                      <span>{p.name} <em>({p.quantity} {UNIT_LABELS[p.unit] || p.unit})</em></span>
                      <span className="cyan">{money(p.value)}</span>
                    </div>
                    <div className="wh-bar-track cyan">
                      <div style={{ width: `${(p.value / maxBudget) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {view === "sold" && (
        <>
          <article className="wh-hero-metric warn">
            <span>Sotilgan tovarlar aylanmasi</span>
            <strong>{money(data.total_sold_value || 0)}</strong>
            <p>Distributiv savdo ulanganda aylanma real vaqtda yangilanadi.</p>
          </article>
          <ChartBlock title="Sotuv aylanmasi" period={period} setPeriod={setPeriod} chartType={chartType} setChartType={setChartType}>
            {chartType === "3d" ? (
              <Wh3DBarChart data={data.trend} dataKey="sold_value" color="#fb7185" valueFormatter={money} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                {chartType === "line" ? (
                  <LineChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                    <Line type="monotone" dataKey="sold_value" name="Sotuv" stroke="#fb7185" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <BarChart data={data.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => money(v)} />
                    <Bar dataKey="sold_value" name="Sotuv" fill="#fb7185" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </ChartBlock>
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
    <div className="wh-modal-backdrop" onClick={onClose}>
      <form className="card wh-modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="wh-modal-head">
          <h3>{product.name}</h3>
          <button type="button" className="secondary wh-soft-btn" onClick={onClose}>Yopish</button>
        </div>
        <p className="wh-hint">
          {product.company_name} — mavjud (banddan tashqari): {product.quantity}{" "}
          {UNIT_LABELS[product.unit] || product.unit}, narxi: {money(product.price)}
        </p>
        <label>Buyurtma miqdori</label>
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.001" step="0.001" max={product.quantity} required />
        {quantity && !Number.isNaN(Number(quantity)) && (
          <p className="wh-total">Jami: {money(Number(quantity) * product.price)}</p>
        )}
        {error && <p className="error">{error}</p>}
        <button type="submit" className="wh-cta" disabled={saving}>
          {saving ? "Buyurtma berilmoqda..." : "Buyurtma berish"}
        </button>
      </form>
    </div>
  );
}

function OrderPipelineCard({ order, actions, highlight }) {
  const stepIdx = ORDER_STEPS.indexOf(order.status);
  return (
    <article className={`wh-order-card ${highlight ? "is-highlight" : ""}`}>
      <div className="wh-order-top">
        <div>
          <h4>{order.product_name}</h4>
          <p className="wh-hint">
            {order.quantity} {UNIT_LABELS[order.unit] || order.unit} · {money(order.total_price)}
          </p>
          <p className="wh-hint">
            {order.buyer_company_name && <>Xaridor: <strong>{order.buyer_company_name}</strong> · </>}
            {order.seller_company_name && <>Sotuvchi: <strong>{order.seller_company_name}</strong></>}
          </p>
          {order.courier_name && <p className="wh-hint">Yetkazuvchi: {order.courier_name}</p>}
          {order.status_note && <p className="wh-hint">{order.status_note}</p>}
        </div>
        <span className={`wh-order-status status-${order.status}`}>
          {ORDER_STATUS_LABELS[order.status] || order.status}
        </span>
      </div>
      {order.status !== "cancelled" && (
        <div className="wh-order-steps" aria-hidden>
          {ORDER_STEPS.map((s, i) => (
            <span key={s} className={stepIdx >= i ? "done" : ""} title={ORDER_STATUS_LABELS[s]} />
          ))}
        </div>
      )}
      {actions?.length > 0 && (
        <div className="wh-order-actions">
          {actions.map((a) => (
            <button
              key={a.action}
              type="button"
              className={a.danger ? "secondary wh-soft-btn danger" : "wh-cta slim"}
              disabled={a.busy}
              onClick={() => a.onClick()}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function OrdersPipelineTab({ company, perms, focusOrderId, defaultScope }) {
  const isDistributor = company.company_type === "distributor";
  const canManage = !!(perms?.is_owner || perms?.permissions?.manage_warehouse);
  const canLoad = !!(perms?.is_owner || perms?.permissions?.warehouse_loader || canManage);
  const canCourier = !!(perms?.is_owner || perms?.permissions?.warehouse_courier || canManage);

  const scopes = [];
  if (isDistributor) {
    scopes.push({ key: "purchases", label: "Mening buyurtmalarim" });
    scopes.push({ key: "receipt", label: "Qabul qilish" });
  } else {
    scopes.push({ key: "sales", label: "Ombor kuzatuv" });
    if (canLoad) scopes.push({ key: "loader", label: "Yuklash" });
    if (canCourier) scopes.push({ key: "courier", label: "Yetkazish" });
  }

  const initial =
    defaultScope && scopes.some((s) => s.key === defaultScope)
      ? defaultScope
      : scopes[0]?.key || "sales";

  const [scope, setScope] = useState(initial);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (defaultScope && scopes.some((s) => s.key === defaultScope)) {
      setScope(defaultScope);
    }
  }, [defaultScope, company.id]);

  useEffect(() => {
    refresh();
  }, [company.id, scope]);

  function refresh() {
    setLoading(true);
    setError(null);
    api
      .getWarehouseOrders(company.id, scope)
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function runAction(orderId, action) {
    setBusyId(orderId);
    setError(null);
    try {
      await api.transitionWarehouseOrder(company.id, orderId, action);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function actionsFor(order) {
    const busy = busyId === order.id;
    const list = [];
    if (!isDistributor && scope === "sales" && canManage && order.status === "ordered") {
      list.push({ action: "start_loading", label: "Yuklashni boshlash", busy, onClick: () => runAction(order.id, "start_loading") });
    }
    if (!isDistributor && (scope === "loader" || scope === "sales") && canLoad && order.status === "loading") {
      list.push({ action: "confirm_loaded", label: "Yuklandi", busy, onClick: () => runAction(order.id, "confirm_loaded") });
    }
    if (!isDistributor && scope === "sales" && canManage && order.status === "loaded") {
      list.push({ action: "dispatch", label: "Yo'lga chiqarish", busy, onClick: () => runAction(order.id, "dispatch") });
    }
    if (!isDistributor && scope === "courier" && canCourier && order.status === "on_road") {
      list.push({ action: "accept_courier", label: "Arizani qabul qilish", busy, onClick: () => runAction(order.id, "accept_courier") });
    }
    if (!isDistributor && scope === "courier" && canCourier && order.status === "courier_accepted") {
      list.push({ action: "confirm_arrival", label: "Yetib keldim", busy, onClick: () => runAction(order.id, "confirm_arrival") });
    }
    if (isDistributor && (scope === "receipt" || scope === "purchases") && canManage && order.status === "awaiting_receipt") {
      list.push({ action: "confirm_receipt", label: "Qabul qilishni tasdiqlash", busy, onClick: () => runAction(order.id, "confirm_receipt") });
    }
    if (canManage && (order.status === "ordered" || order.status === "loading")) {
      list.push({
        action: "cancel",
        label: "Bekor qilish",
        danger: true,
        busy,
        onClick: () => {
          if (window.confirm("Buyurtmani bekor qilasizmi? Band zaxira qaytariladi.")) {
            runAction(order.id, "cancel");
          }
        },
      });
    }
    return list;
  }

  return (
    <div className="wh-orders">
      <p className="wh-section-lead">
        {isDistributor
          ? "Buyurtma holati, yo‘l kuzatuvi va yetkazilgan yukni tekshirib qabul qiling — tasdiqlangandan keyin omborga avtomatik qo‘shiladi."
          : "Barcha buyurtmalar: qaysi distributiv, yuk miqdori, narx va bosqichlar. Yuklash → yo‘lga chiqarish → yetkazish."}
      </p>
      <div className="wh-view-tabs" role="tablist">
        {scopes.map((s) => (
          <button
            key={s.key}
            type="button"
            className={scope === s.key ? "active" : ""}
            onClick={() => setScope(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {loading && <p className="wh-empty-inline">Yuklanmoqda...</p>}
      {!loading && orders.length === 0 && (
        <div className="wh-empty"><p>Bu bo‘limda buyurtma yo‘q.</p></div>
      )}
      <div className="wh-orders-list">
        {orders.map((o) => (
          <OrderPipelineCard
            key={o.id}
            order={o}
            highlight={focusOrderId && focusOrderId === o.id}
            actions={actionsFor(o)}
          />
        ))}
      </div>
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
    <div className="wh-market">
      <p className="wh-section-lead">
        Ishlab chiqaruvchi omboridan buyurtma bering. Mavjud miqdor — boshqa firmalar band qilgan zaxiradan tashqari qoldiq.
        Buyurtma berilgach yuklash → yo‘l → qabul qilish bosqichlari boshlanadi; omborga faqat qabuldan keyin tushadi.
      </p>
      <input className="wh-search" type="text" placeholder="Nomi bo‘yicha qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {error && <p className="error">{error}</p>}
      {loading && <p className="wh-empty-inline">Yuklanmoqda...</p>}
      {!loading && visible.length === 0 && <div className="wh-empty"><p>Hozircha bozorda mahsulot yo‘q.</p></div>}
      <div className="wh-grid">
        {visible.map((p) => (
          <article key={p.id} className="wh-card">
            {p.image_url ? (
              <img className="wh-card-img" src={p.image_url} alt={p.name} />
            ) : (
              <div className="wh-card-img placeholder" />
            )}
            <div className="wh-card-body">
              <span className="wh-source">{p.company_name}</span>
              <h4>{p.name}</h4>
              <p>{money(p.price)} / {UNIT_LABELS[p.unit] || p.unit}</p>
              <p className="ok">Mavjud: {p.quantity} {UNIT_LABELS[p.unit] || p.unit}</p>
              {p.reserved_quantity > 0 && (
                <p className="wh-hint">Boshqa buyurtmalar band: {p.reserved_quantity}</p>
              )}
              <button
                type="button"
                className="wh-cta"
                onClick={() =>
                  setOrderProduct({
                    ...p,
                    onOrder: (q) => api.placeWarehouseOrder(company.id, p.company_id, p.id, q),
                  })
                }
              >
                Buyurtma berish
              </button>
            </div>
          </article>
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
  const [searchParams] = useSearchParams();
  const [company, setCompany] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null); // null = all (multi only)
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);
  const [reorderProduct, setReorderProduct] = useState(null);
  const [reorderBusy, setReorderBusy] = useState(null);
  const [tab, setTab] = useState(() => searchParams.get("tab") || "dashboard");
  const [perms, setPerms] = useState(null);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const focusOrderId = searchParams.get("order");
  const ordersDefaultScope =
    searchParams.get("tab") === "receipt"
      ? "receipt"
      : searchParams.get("scope") || null;

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "receipt") setTab("orders");
    else if (t) setTab(t);
  }, [searchParams]);

  useEffect(() => {
    api
      .getMyCompanies()
      .then((list) => {
        const active = pickActiveCompany(list);
        setCompany(active);
        const rows = active?.warehouses || [];
        setWarehouses(rows);
        if (rows.length === 1) setSelectedWarehouseId(rows[0].id);
        else setSelectedWarehouseId(null);
        if (active?.id) {
          api.getMyPermissions(active.id).then(setPerms).catch(() => setPerms(null));
        }
      })
      .catch(() => {});
  }, []);

  const multi = warehouses.length > 1;
  const activeWarehouse =
    selectedWarehouseId
      ? warehouses.find((w) => w.id === selectedWarehouseId)
      : warehouses.length === 1
        ? warehouses[0]
        : null;
  const activeWarehouseType =
    activeWarehouse?.warehouse_type || editProduct?.warehouse_type || company?.warehouse_type || null;
  const productWarehouseId = selectedWarehouseId || (warehouses.length === 1 ? warehouses[0]?.id : null);

  useEffect(() => {
    if (!company) return;
    refreshProducts();
  }, [company, selectedWarehouseId]);

  function refreshProducts() {
    if (!company) return;
    setLoading(true);
    // When multi and "all" selected, fetch without warehouse_id (aggregate list).
    const scopeId = multi ? selectedWarehouseId : productWarehouseId;
    api
      .getWarehouseProducts(company.id, scopeId)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  async function handleDelete(product) {
    if (!window.confirm(`"${product.name}" mahsulotini o'chirmoqchimisiz?`)) return;
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

  async function handleReorder(product) {
    setError(null);
    setReorderBusy(product.id);
    try {
      const market = await api.getWarehouseMarketplace(company.id);
      const nameKey = (product.name || "").trim().toLowerCase();
      const match = market.find(
        (m) =>
          String(m.company_id) === String(product.source_company_id) &&
          (m.name || "").trim().toLowerCase() === nameKey &&
          m.unit === product.unit
      ) || market.find(
        (m) =>
          (m.name || "").trim().toLowerCase() === nameKey &&
          m.unit === product.unit &&
          (m.company_name || "").trim().toLowerCase() === (product.source_company_name || "").trim().toLowerCase()
      );
      if (!match) {
        setError(
          `"${product.name}" bozorda topilmadi yoki zaxira tugagan. Bozor bo‘limidan boshqa mahsulot buyurtma qiling.`
        );
        setTab("marketplace");
        return;
      }
      setReorderProduct({
        ...match,
        onOrder: (q) =>
          api.placeWarehouseOrder(company.id, match.company_id, match.id, q, product.warehouse_id || null),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setReorderBusy(null);
    }
  }

  function isLowStock(p) {
    return p.low_stock_threshold != null && p.quantity > 0 && p.quantity <= p.low_stock_threshold;
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

  const lowStockCount = products.filter(isLowStock).length;
  const outOfStockCount = products.filter((p) => p.quantity <= 0).length;

  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "products", label: "Mahsulotlar" },
    { key: "orders", label: "Buyurtmalar" },
  ];
  if (company?.company_type === "distributor") {
    tabs.push({ key: "marketplace", label: "Bozor" });
  }

  if (!company) {
    return (
      <AppShell>
        <div className="wh-page">
          <WarehouseHeading />
          <div className="wh-empty">
            <p>Avval kompaniya yarating.</p>
            <button type="button" className="wh-cta" onClick={() => navigate("/companies")}>Kompaniya yaratish</button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!company.has_warehouse && warehouses.length === 0) {
    return (
      <AppShell>
        <div className="wh-page">
          <WarehouseHeading companyName={company.name} />
          <div className="wh-empty">
            <p>Bu kompaniyada ombor hali yoqilmagan.</p>
            <p className="wh-hint">Profil → Sozlamalar → Ombor bo‘limidan 1–3 ta ombor qo‘shing.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const subtitle =
    company.company_type === "distributor"
      ? "Distributiv firma — zaxira faqat Bozor buyurtmasi orqali to‘ldiriladi"
      : multi
        ? selectedWarehouseId
          ? `Ombor: ${TYPE_LABELS[activeWarehouseType] || activeWarehouseType}`
          : `Umumiy ko‘rinish — ${warehouses.length} ta ombor`
        : `Ishlab chiqarish turi: ${TYPE_LABELS[activeWarehouseType] || activeWarehouseType || "—"}`;

  return (
    <AppShell>
      <div className="wh-page">
        <WarehouseHeading companyName={company.name} subtitle={subtitle} />

        <div className="wh-toolbar">
          <div className="wh-tabs" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? "active" : ""}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {multi && (
              <select
                className="wh-warehouse-select"
                value={selectedWarehouseId || ""}
                onChange={(e) => setSelectedWarehouseId(e.target.value || null)}
                aria-label="Ombor tanlash"
              >
                <option value="">Umumiy (barcha omborlar)</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name || TYPE_LABELS[w.warehouse_type] || w.warehouse_type}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="secondary wh-soft-btn" onClick={() => navigate("/dashboard")}>
              Korxonaga qaytish
            </button>
          </div>
        </div>

        {tab === "dashboard" && (
          <WarehouseDashboard
            company={company}
            warehouseId={multi ? selectedWarehouseId : productWarehouseId}
            multi={multi}
          />
        )}
        {tab === "marketplace" && <MarketplaceTab company={company} onOrdered={refreshProducts} />}
        {tab === "orders" && (
          <OrdersPipelineTab
            company={company}
            perms={perms}
            focusOrderId={focusOrderId}
            defaultScope={ordersDefaultScope}
          />
        )}

        {tab === "products" && (
          <section className="wh-products">
            <div className="wh-tools">
              {company.company_type !== "distributor" && (
                <button
                  type="button"
                  className="wh-cta"
                  onClick={() => {
                    if (multi && !selectedWarehouseId) {
                      setError("Mahsulot qo‘shish uchun avval bitta omborni tanlang");
                      return;
                    }
                    setShowAdd(true);
                  }}
                >
                  Yangi mahsulot
                </button>
              )}
              <input
                className="wh-search"
                type="text"
                placeholder="Nomi bo‘yicha qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="recent">Yangi qo‘shilgan</option>
                <option value="name">Nomi (A-Z)</option>
                <option value="quantity">Soni (ko‘pdan kamga)</option>
              </select>
              <button type="button" className="secondary wh-soft-btn" onClick={handleExportCsv}>
                CSV eksport
              </button>
            </div>

            <div className="wh-filters">
              <button type="button" className={stockFilter === "all" ? "active" : ""} onClick={() => setStockFilter("all")}>
                Barchasi ({products.length})
              </button>
              <button type="button" className={stockFilter === "low" ? "active low" : "low"} onClick={() => setStockFilter("low")}>
                Kam qolgan ({lowStockCount})
              </button>
              <button type="button" className={stockFilter === "out" ? "active out" : "out"} onClick={() => setStockFilter("out")}>
                Tugagan ({outOfStockCount})
              </button>
            </div>

            {error && <p className="error">{error}</p>}
            {loading && <p className="wh-empty-inline">Yuklanmoqda...</p>}
            {!loading && products.length === 0 && (
              <div className="wh-empty">
                <p>
                  {company.company_type === "distributor"
                    ? "Hali mahsulot yo‘q — Bozor bo‘limidan buyurtma bering."
                    : "Hali mahsulot qo‘shilmagan."}
                </p>
                {company.company_type === "distributor" && (
                  <button type="button" className="wh-cta" onClick={() => setTab("marketplace")}>
                    Bozorga o‘tish
                  </button>
                )}
              </div>
            )}
            {!loading && products.length > 0 && visibleProducts.length === 0 && (
              <div className="wh-empty"><p>Qidiruv/filtrga mos mahsulot topilmadi.</p></div>
            )}

            <div className="wh-grid">
              {visibleProducts.map((p) => {
                const tone = stockTone(p, isLowStock(p));
                const isDistributor = company.company_type === "distributor";
                return (
                  <article key={p.id} className={`wh-card tone-${tone}`}>
                    {p.image_url ? (
                      <img className="wh-card-img" src={p.image_url} alt={p.name} />
                    ) : (
                      <div className="wh-card-img placeholder" />
                    )}
                    <div className="wh-card-body">
                      {p.source_company_name && <span className="wh-source">{p.source_company_name} dan</span>}
                      <div className="wh-card-top">
                        <h4>{p.name}</h4>
                        <span className={`wh-qty ${tone}`}>
                          {p.available_quantity != null ? p.available_quantity : p.quantity}{" "}
                          {UNIT_LABELS[p.unit] || p.unit}
                        </span>
                      </div>
                      <p className="wh-price">{money(p.price)}</p>
                      {p.reserved_quantity > 0 && (
                        <p className="wh-meta">Band (buyurtma): {p.reserved_quantity} · Ombor: {p.quantity}</p>
                      )}
                      {p.size && <p className="wh-meta">O‘lcham: {p.size}{p.color ? `, Rang: ${p.color}` : ""}</p>}
                      {p.expiry_date && <p className="wh-meta">Muddat: {p.expiry_date}</p>}
                      {p.sku && <p className="wh-meta">SKU: {p.sku}</p>}
                      {p.notes && <p className="wh-meta">{p.notes}</p>}
                      <div className="wh-card-actions">
                        {isDistributor ? (
                          <button
                            type="button"
                            className="wh-cta slim"
                            disabled={reorderBusy === p.id}
                            onClick={() => handleReorder(p)}
                          >
                            {reorderBusy === p.id ? "Qidirilmoqda..." : "Qayta buyurtma"}
                          </button>
                        ) : (
                          <>
                            <button type="button" className="wh-cta slim" onClick={() => setStockProduct(p)}>Zaxira</button>
                            {p.unit === "dona" && (
                              <button type="button" className="secondary wh-soft-btn" onClick={() => handleQuickAdd(p)}>+1</button>
                            )}
                            <button type="button" className="secondary wh-soft-btn" onClick={() => setEditProduct(p)}>Tahrir</button>
                            <button type="button" className="secondary wh-soft-btn danger" onClick={() => handleDelete(p)}>O‘chirish</button>
                          </>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {showAdd && (
        <ProductModal
          company={company}
          products={products}
          warehouseType={activeWarehouseType}
          warehouseId={productWarehouseId}
          onClose={() => setShowAdd(false)}
          onSaved={refreshProducts}
        />
      )}
      {editProduct && company.company_type !== "distributor" && (
        <ProductModal
          company={company}
          product={editProduct}
          products={products}
          warehouseType={editProduct.warehouse_type || activeWarehouseType}
          warehouseId={editProduct.warehouse_id || productWarehouseId}
          onClose={() => setEditProduct(null)}
          onSaved={refreshProducts}
        />
      )}
      {stockProduct && company.company_type !== "distributor" && (
        <StockModal company={company} product={stockProduct} onClose={() => setStockProduct(null)} onSaved={refreshProducts} />
      )}
      {reorderProduct && (
        <OrderModal
          product={reorderProduct}
          onClose={() => setReorderProduct(null)}
          onOrdered={() => {
            setReorderProduct(null);
            refreshProducts();
            setTab("orders");
          }}
        />
      )}
    </AppShell>
  );
}
