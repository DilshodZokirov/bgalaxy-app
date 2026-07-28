import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useActiveCompany } from "../hooks/useCompany";
import AppShell from "../components/AppShell";

const UNIT_LABELS = { dona: "dona", kg: "kg", litr: "litr" };
const TYPE_LABELS = { kompaniya: "Ishlab chiqaruvchi", distributor: "Distributiv", market: "Market" };

function money(n) {
  return `${Number(n || 0).toLocaleString("uz-UZ")} so‘m`;
}

function CartDrawer({ seller, items, onChangeQty, onRemove, onClose, onCheckout, busy, error }) {
  const total = items.reduce((s, i) => s + Number(i.quantity) * Number(i.price), 0);
  return (
    <div className="mp-cart-backdrop" onClick={onClose}>
      <aside className="mp-cart" onClick={(e) => e.stopPropagation()}>
        <div className="mp-cart-head">
          <div>
            <p className="mp-kicker">Savatcha</p>
            <h3>{seller?.company_name || "Sotuvchi"}</h3>
          </div>
          <button type="button" className="secondary wh-soft-btn" onClick={onClose}>
            Yopish
          </button>
        </div>
        {items.length === 0 ? (
          <p className="mp-empty-inline">Savatcha bo‘sh</p>
        ) : (
          <ul className="mp-cart-list">
            {items.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <p>{money(item.price)} / {UNIT_LABELS[item.unit] || item.unit}</p>
                </div>
                <div className="mp-cart-qty">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    max={item.max}
                    value={item.quantity}
                    onChange={(e) => onChangeQty(item.id, e.target.value)}
                  />
                  <button type="button" className="secondary wh-soft-btn danger" onClick={() => onRemove(item.id)}>
                    ×
                  </button>
                </div>
                <p className="mp-line-total">{money(Number(item.quantity) * Number(item.price))}</p>
              </li>
            ))}
          </ul>
        )}
        <div className="mp-cart-foot">
          <p>
            Jami: <strong>{money(total)}</strong>
          </p>
          {error && <p className="error">{error}</p>}
          <button type="button" className="wh-cta" disabled={busy || items.length === 0} onClick={onCheckout}>
            {busy ? "Buyurtma berilmoqda..." : "Buyurtma berish"}
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { company, loading: companyLoading } = useActiveCompany();
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [cartSellerId, setCartSellerId] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

  const canUse =
    company?.has_warehouse &&
    (company.company_type === "distributor" || company.company_type === "market");

  useEffect(() => {
    if (!company?.id || !canUse) return;
    setLoading(true);
    setError(null);
    api
      .getMarketplaceSellers(company.id)
      .then(setSellers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [company?.id, canUse]);

  useEffect(() => {
    if (!company?.id || !seller) return;
    setProductsLoading(true);
    api
      .getMarketplaceSellerProducts(company.id, seller.company_id)
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setProductsLoading(false));
  }, [company?.id, seller?.company_id]);

  const visibleSellers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sellers.filter((s) => {
      if (filter === "top" && !(s.avg_rating >= 4.5)) return false;
      if (q && !s.company_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sellers, search, filter]);

  const cartSeller = sellers.find((s) => s.company_id === cartSellerId) || seller;
  const cartCount = cart.reduce((n, i) => n + 1, 0);

  function addToCart(product) {
    if (cartSellerId && cartSellerId !== product.company_id) {
      const ok = window.confirm(
        "Savatchada boshqa sotuvchi mahsulotlari bor. Yangi savatcha ochilsinmi?"
      );
      if (!ok) return;
      setCart([]);
    }
    setCartSellerId(product.company_id);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, quantity: Math.min(Number(i.max), Number(i.quantity) + 1) }
            : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          max: product.quantity,
          quantity: 1,
          company_id: product.company_id,
        },
      ];
    });
    setShowCart(true);
  }

  async function checkout() {
    if (!company?.id || !cartSellerId || cart.length === 0) return;
    setCheckoutBusy(true);
    setCheckoutError(null);
    try {
      const items = cart.map((i) => ({
        product_id: i.id,
        quantity: Number(i.quantity),
      }));
      for (const item of items) {
        if (!item.quantity || item.quantity <= 0) {
          throw new Error("Har bir mahsulot uchun miqdor kiriting");
        }
      }
      await api.placeWarehouseCartOrder(company.id, cartSellerId, items);
      setCart([]);
      setCartSellerId(null);
      setShowCart(false);
      navigate("/warehouse?tab=orders&scope=purchases");
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setCheckoutBusy(false);
    }
  }

  if (companyLoading) {
    return (
      <AppShell>
        <div className="mp-page">
          <p className="mp-empty-inline">Yuklanmoqda...</p>
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <div className="mp-page">
          <div className="mp-empty">
            <p>Avval kompaniya yarating.</p>
            <button type="button" className="wh-cta" onClick={() => navigate("/companies")}>
              Kompaniya yaratish
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!canUse) {
    return (
      <AppShell>
        <div className="mp-page">
          <div className="mp-empty">
            <p>Marketplace faqat Distributiv firma va Market uchun (ombor yoqilgan bo‘lishi kerak).</p>
            <button type="button" className="secondary wh-soft-btn" onClick={() => navigate("/warehouse")}>
              Omborga qaytish
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mp-page">
        <header className="mp-hero">
          <p className="mp-kicker">05 MARKETPLACE</p>
          <h1>{seller ? seller.company_name : "Marketplace"}</h1>
          <p>
            {company.company_type === "market"
              ? "Distributiv firmalar — tanlang, savatchaga qo‘shing, buyurtma bering."
              : "Ishlab chiqaruvchi kompaniyalar — tanlang, savatchaga qo‘shing, buyurtma bering."}
          </p>
        </header>

        <div className="mp-toolbar">
          <input
            className="mp-search"
            type="search"
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="mp-filters" role="tablist">
            <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>
              Barchasi
            </button>
            <button type="button" className={filter === "top" ? "active" : ""} onClick={() => setFilter("top")}>
              Top reyting
            </button>
          </div>
          <button
            type="button"
            className="wh-cta slim mp-cart-btn"
            onClick={() => setShowCart(true)}
            disabled={cart.length === 0}
          >
            Savatcha{cartCount ? ` (${cartCount})` : ""}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        {!seller && (
          <>
            {loading && <p className="mp-empty-inline">Yuklanmoqda...</p>}
            {!loading && visibleSellers.length === 0 && (
              <div className="mp-empty">
                <p>Hozircha Marketplace’da sotuvchi yo‘q.</p>
              </div>
            )}
            <div className="mp-grid">
              {visibleSellers.map((s) => (
                <article key={s.company_id} className="mp-card">
                  <div className="mp-card-icon">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt="" />
                    ) : (
                      <span>{(s.company_name || "?").slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="mp-card-body">
                    <h3>{s.company_name}</h3>
                    <p>
                      {TYPE_LABELS[s.company_type] || s.company_type}
                      {s.location_region ? ` · ${s.location_region}` : ""}
                    </p>
                    <p className="mp-rating">
                      <span className="mp-star">★</span>{" "}
                      {s.avg_rating != null ? s.avg_rating.toFixed(1) : "—"}
                      {s.rating_count ? ` (${s.rating_count})` : ""}
                      <span className="mp-muted"> · {s.product_count} mahsulot</span>
                    </p>
                  </div>
                  <button type="button" className="mp-install" onClick={() => setSeller(s)}>
                    Kirish
                  </button>
                </article>
              ))}
            </div>
          </>
        )}

        {seller && (
          <section className="mp-seller-shop">
            <button type="button" className="secondary wh-soft-btn" onClick={() => setSeller(null)}>
              ← Sotuvchilar ro‘yxati
            </button>
            <div className="mp-seller-banner">
              <div>
                <h2>{seller.company_name}</h2>
                <p className="mp-rating">
                  <span className="mp-star">★</span>{" "}
                  {seller.avg_rating != null ? seller.avg_rating.toFixed(1) : "Baholar yo‘q"}
                  {seller.rating_count ? ` · ${seller.rating_count} ta baho` : ""}
                </p>
              </div>
            </div>
            {productsLoading && <p className="mp-empty-inline">Mahsulotlar yuklanmoqda...</p>}
            {!productsLoading && products.length === 0 && (
              <div className="mp-empty">
                <p>Bu sotuvchida Marketplacega chiqarilgan mahsulot yo‘q.</p>
              </div>
            )}
            <div className="mp-product-grid">
              {products.map((p) => (
                <article key={p.id} className="mp-product-card">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <div className="mp-product-ph" />
                  )}
                  <div>
                    <h4>{p.name}</h4>
                    <p>{money(p.price)} / {UNIT_LABELS[p.unit] || p.unit}</p>
                    <p className="ok">Mavjud: {p.quantity}</p>
                    <button type="button" className="wh-cta slim" onClick={() => addToCart(p)}>
                      Savatchaga
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {showCart && (
        <CartDrawer
          seller={cartSeller}
          items={cart}
          busy={checkoutBusy}
          error={checkoutError}
          onClose={() => setShowCart(false)}
          onRemove={(id) => setCart((prev) => prev.filter((i) => i.id !== id))}
          onChangeQty={(id, value) =>
            setCart((prev) =>
              prev.map((i) =>
                i.id === id
                  ? { ...i, quantity: Math.min(Number(i.max), Math.max(0, Number(value) || 0)) }
                  : i
              )
            )
          }
          onCheckout={checkout}
        />
      )}
    </AppShell>
  );
}
