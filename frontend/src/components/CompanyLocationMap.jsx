import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Vite breaks Leaflet's default icon URLs — pin them explicitly.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const UZ_CENTER = [41.3111, 69.2797];
const UZ_ZOOM = 6;

/** Approximate region centers for fly-to when user picks viloyat/shahar */
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

async function reverseLabel(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=uz`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

async function searchPlaces(query) {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=uz&q=${encodeURIComponent(q)}&accept-language=uz`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map((item) => ({
    lat: Number(item.lat),
    lng: Number(item.lon),
    label: item.display_name,
  }));
}

/**
 * Interactive map picker — search + click to pin.
 * value: { latitude, longitude, geo_label } | null
 * onChange(next)
 * regionHint: optional region name to fly the map
 */
export default function CompanyLocationMap({ value, onChange, regionHint }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

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
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
    const label = labelHint || (await reverseLabel(lat, lng));
    onChangeRef.current?.({
      latitude: Number(lat.toFixed(7)),
      longitude: Number(lng.toFixed(7)),
      geo_label: label,
    });
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

    // Leaflet needs a tick after mount in flex layouts
    const t = setTimeout(() => map.invalidateSize(), 80);
    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
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

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError(null);
    setSearching(true);
    try {
      const hits = await searchPlaces(query);
      setResults(hits);
      if (!hits.length) setSearchError("Natija topilmadi — boshqacha yozing yoki kartani bosing");
    } catch {
      setSearchError("Qidiruv vaqtincha ishlamayapti — kartadan pin qo‘ying");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="os-geo">
      <form className="os-geo-search" onSubmit={handleSearch}>
        <input
          type="search"
          placeholder="Manzil yoki joy nomini qidirish..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Joylashuv qidirish"
        />
        <button type="submit" className="os-btn-ghost" disabled={searching || query.trim().length < 2}>
          {searching ? "..." : "Qidirish"}
        </button>
      </form>
      {results.length > 0 && (
        <ul className="os-geo-results">
          {results.map((r) => (
            <li key={`${r.lat}-${r.lng}-${r.label}`}>
              <button
                type="button"
                onClick={() => {
                  placePin(r.lat, r.lng, r.label);
                  setResults([]);
                  setQuery("");
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searchError && <p className="os-geo-hint os-geo-hint-warn">{searchError}</p>}
      <div ref={mapEl} className="os-geo-map" role="application" aria-label="Kompaniya joylashuvi xaritasi" />
      <p className="os-geo-hint">
        Kartani bosing yoki pinni suring — yetkazib berish uchun aniq koordinata saqlanadi.
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
