import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { api } from "../api/client";

// Vite breaks Leaflet's default icon URLs — pin them explicitly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const UZ_CENTER = [41.3111, 69.2797];
const UZ_ZOOM = 6;
const SUGGEST_DEBOUNCE_MS = 350;

const REGION_COORDS = {
  "Toshkent shahri": [41.3111, 69.2797],
  "Toshkent viloyati": [41.2213, 69.8597],
  "Andijon viloyati": [40.7821, 72.3442],
  "Buxoro viloyati": [39.7681, 64.4556],
  "Farg'ona viloyati": [40.3864, 71.7864],
  "Jizzax viloyati": [40.1158, 67.8422],
  "Xorazm viloyati": [41.55, 60.6333],
  "Namangan viloyati": [41.0, 71.6726],
  "Navoiy viloyati": [40.1039, 65.3689],
  "Qashqadaryo viloyati": [38.8606, 65.7891],
  "Samarqand viloyati": [39.6542, 66.9597],
  "Sirdaryo viloyati": [40.5, 68.75],
  "Surxondaryo viloyati": [37.9409, 67.5709],
  "Qoraqalpog'iston Respublikasi": [43.7683, 59.0214],
};

const metroIcon = L.divIcon({
  className: "os-geo-metro-icon",
  html: '<span class="os-geo-metro-dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

async function reverseLabel(lat, lng) {
  try {
    const place = await api.geoReverse(lat, lng);
    return place?.label || null;
  } catch {
    return null;
  }
}

async function searchPlaces(query, regionHint) {
  const q = query.trim();
  if (q.length < 2) return [];
  const data = await api.geoSearch(q, regionHint || null);
  return (data || []).map((item) => ({
    lat: Number(item.lat),
    lng: Number(item.lng),
    label: item.label,
    title: item.title || item.label?.split(",")[0] || item.label,
    subtitle: item.subtitle || null,
    kind: item.kind || "place",
  }));
}

/**
 * Interactive map picker — live suggestions + multi-marker plot (e.g. all metros).
 */
export default function CompanyLocationMap({ value, onChange, regionHint }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const suggestLayerRef = useRef(null);
  const suggestSeq = useRef(0);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pickRef = useRef(null);

  async function placePin(lat, lng, labelHint) {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", async () => {
        const p = markerRef.current.getLatLng();
        const label = await reverseLabel(p.lat, p.lng);
        onChangeRef.current?.({
          latitude: Number(p.lat.toFixed(7)),
          longitude: Number(p.lng.toFixed(7)),
          geo_label: label,
        });
      });
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
    const label = labelHint || (await reverseLabel(lat, lng));
    onChangeRef.current?.({
      latitude: Number(lat.toFixed(7)),
      longitude: Number(lng.toFixed(7)),
      geo_label: label,
    });
  }

  function pickResult(r) {
    placePin(r.lat, r.lng, r.label);
    setQuery(r.title || r.label.split(",")[0] || "");
    setSearchError(null);
  }
  pickRef.current = pickResult;

  function plotSuggestMarkers(hits) {
    const map = mapRef.current;
    if (!map) return;
    if (suggestLayerRef.current) {
      suggestLayerRef.current.clearLayers();
    } else {
      suggestLayerRef.current = L.layerGroup().addTo(map);
    }
    if (!hits?.length) return;

    const latLngs = [];
    hits.forEach((r) => {
      const isMetro = r.kind === "metro";
      const m = L.marker([r.lat, r.lng], {
        icon: isMetro ? metroIcon : new L.Icon.Default(),
        opacity: isMetro ? 1 : 0.85,
        title: r.title,
      });
      m.bindTooltip(r.title, { direction: "top", offset: [0, -8] });
      m.on("click", () => pickRef.current?.(r));
      suggestLayerRef.current.addLayer(m);
      latLngs.push([r.lat, r.lng]);
    });

    if (latLngs.length > 1) {
      map.fitBounds(latLngs, { padding: [28, 28], maxZoom: 13 });
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], 14);
    }
  }

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return undefined;
    const map = L.map(mapEl.current, {
      center: value?.latitude && value?.longitude ? [value.latitude, value.longitude] : UZ_CENTER,
      zoom: value?.latitude ? 15 : UZ_ZOOM,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e) => {
      placePin(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    suggestLayerRef.current = L.layerGroup().addTo(map);

    if (value?.latitude != null && value?.longitude != null) {
      markerRef.current = L.marker([value.latitude, value.longitude], { draggable: true }).addTo(map);
      markerRef.current.on("dragend", async () => {
        const p = markerRef.current.getLatLng();
        const label = await reverseLabel(p.lat, p.lng);
        onChangeRef.current?.({
          latitude: Number(p.lat.toFixed(7)),
          longitude: Number(p.lng.toFixed(7)),
          geo_label: label,
        });
      });
    }

    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      suggestLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!regionHint || !mapRef.current || value?.latitude != null) return;
    const coords = REGION_COORDS[regionHint];
    if (coords) mapRef.current.flyTo(coords, 11, { duration: 0.6 });
  }, [regionHint, value?.latitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [value?.latitude, regionHint]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      if (q.length === 0) {
        setResults([]);
        setSearchError(null);
        plotSuggestMarkers([]);
      }
      return undefined;
    }
    const seq = ++suggestSeq.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const hits = await searchPlaces(q, regionHint);
        if (seq !== suggestSeq.current) return;
        setResults(hits);
        plotSuggestMarkers(hits);
        if (!hits.length) {
          setSearchError("O‘xshash joy topilmadi — boshqacha yozing yoki kartadan pin qo‘ying");
        }
      } catch (err) {
        if (seq !== suggestSeq.current) return;
        setSearchError(err?.message || "Qidiruv vaqtincha ishlamayapti — kartadan pin qo‘ying");
      } finally {
        if (seq === suggestSeq.current) setSearching(false);
      }
    }, SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, regionHint]);

  async function runSearch() {
    const q = query.trim();
    if (q.length < 2) return;
    const seq = ++suggestSeq.current;
    setSearchError(null);
    setSearching(true);
    try {
      const hits = await searchPlaces(q, regionHint);
      if (seq !== suggestSeq.current) return;
      setResults(hits);
      plotSuggestMarkers(hits);
      if (!hits.length) {
        setSearchError(
          regionHint
            ? "Natija topilmadi — viloyatni tekshiring yoki kartadan pin qo‘ying"
            : "Avval yuqoridan viloyat/shaharni tanlang — qidiruv faqat shu hududdan chiqadi"
        );
      }
    } catch (err) {
      if (seq !== suggestSeq.current) return;
      setSearchError(err?.message || "Qidiruv vaqtincha ishlamayapti — kartadan pin qo‘ying");
    } finally {
      if (seq === suggestSeq.current) setSearching(false);
    }
  }

  const metroCount = results.filter((r) => r.kind === "metro").length;

  return (
    <div className="os-geo">
      <div className="os-geo-search">
        <input
          type="search"
          placeholder={
            regionHint
              ? `Yozing: metro, Rayxon kuchasi…`
              : "Avval viloyatni tanlang, keyin qidiruv"
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) pickResult(results[0]);
              else if (!searching && query.trim().length >= 2) runSearch();
            }
            if (e.key === "Escape") setResults([]);
          }}
          aria-label="Joylashuv qidirish"
          aria-autocomplete="list"
          autoComplete="off"
        />
        <button
          type="button"
          className="os-btn-ghost"
          disabled={searching || query.trim().length < 2}
          onClick={runSearch}
        >
          {searching ? "..." : "Qidirish"}
        </button>
      </div>
      {metroCount > 0 && (
        <p className="os-geo-hint os-geo-hint-ok">
          Xaritada {metroCount} ta metro bekati belgilangan — birini tanlang.
        </p>
      )}
      {results.length > 0 && (
        <ul className="os-geo-results" role="listbox">
          {results.map((r) => (
            <li key={`${r.lat}-${r.lng}-${r.label}`}>
              <button type="button" role="option" onClick={() => pickResult(r)}>
                <span
                  className={`os-geo-kind ${
                    r.kind === "metro" ? "is-metro" : r.kind === "street" ? "is-street" : ""
                  }`}
                >
                  {r.kind === "metro" ? "Metro" : r.kind === "street" ? "Ko‘cha" : "Joy"}
                </span>
                <span className="os-geo-result-text">
                  <strong>{r.title}</strong>
                  {r.subtitle && <em>{r.subtitle}</em>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searchError && <p className="os-geo-hint os-geo-hint-warn">{searchError}</p>}
      <div ref={mapEl} className="os-geo-map" role="application" aria-label="Kompaniya joylashuvi xaritasi" />
      <p className="os-geo-hint">
        «metro» deb yozsangiz — tanlangan viloyatdagi bekatalar xaritada chiqadi. Yoki pinni bosing/suring.
      </p>
      {value?.latitude != null && value?.longitude != null && (
        <div className="os-geo-coords">
          <span>
            {Number(value.latitude).toFixed(5)}, {Number(value.longitude).toFixed(5)}
          </span>
          {value.geo_label && <em>{value.geo_label}</em>}
        </div>
      )}
    </div>
  );
}
