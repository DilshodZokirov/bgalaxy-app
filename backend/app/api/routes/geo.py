"""Geocoding proxy — Google-like street suggest via Photon + Nominatim (no paid Maps key)."""

from __future__ import annotations

import asyncio
import re

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import requests

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/geo", tags=["geo"])

_NOMINATIM = "https://nominatim.openstreetmap.org"
_PHOTON = "https://photon.komoot.io/api/"
_HEADERS = {
    "User-Agent": "BG-BusinessGalaxy/1.0 (company-location; contact@bgalaxy.local)",
    "Accept": "application/json",
    "Accept-Language": "uz,ru,en",
}

# Uzbekistan rough bounding box (minLon, minLat, maxLon, maxLat)
_UZ_BBOX = (55.9, 37.0, 73.2, 45.6)

# Tighter bbox per selected region (minLon, minLat, maxLon, maxLat).
# Kept non-overlapping where possible so Namangan/Farg‘ona never leak into Toshkent.
_REGION_BBOX: dict[str, tuple[float, float, float, float]] = {
    "Toshkent shahri": (69.12, 41.20, 69.38, 41.39),
    "Toshkent viloyati": (68.55, 40.70, 70.15, 41.75),
    "Andijon viloyati": (71.55, 40.35, 72.95, 41.05),
    "Buxoro viloyati": (63.20, 39.20, 65.20, 40.80),
    "Farg'ona viloyati": (70.85, 40.10, 72.05, 40.65),
    "Jizzax viloyati": (66.80, 39.50, 68.70, 41.10),
    "Xorazm viloyati": (60.00, 41.00, 62.00, 42.20),
    "Namangan viloyati": (70.85, 40.75, 72.15, 41.30),
    "Navoiy viloyati": (62.50, 39.50, 66.50, 43.00),
    "Qashqadaryo viloyati": (65.20, 38.20, 67.80, 39.60),
    "Samarqand viloyati": (65.50, 39.20, 67.80, 40.40),
    "Sirdaryo viloyati": (67.85, 40.20, 69.15, 41.00),
    "Surxondaryo viloyati": (66.50, 37.10, 68.50, 38.80),
    "Qoraqalpog'iston Respublikasi": (56.00, 41.20, 62.50, 45.60),
}

# Text aliases that confirm a hit belongs to the selected region
_REGION_ALIASES: dict[str, tuple[str, ...]] = {
    "Toshkent shahri": ("toshkent shahri", "tashkent", "toshkent city", "город ташкент"),
    "Toshkent viloyati": (
        "toshkent viloyati",
        "tashkent region",
        "tashkent province",
        "qibray",
        "кибрай",
        "yangiyo'l",
        "yangiyul",
        "angren",
        "chirchiq",
        "chirchik",
        "bekobod",
        "bekabad",
        "nurafshon",
        "ohangaron",
        "parkent",
        "boka",
        "bo'ka",
        "piskent",
        "zangiota",
        "yuqorichirchiq",
        "ortachirchiq",
        "chinoz",
        "quyichirchiq",
    ),
    "Andijon viloyati": ("andijon", "andijan"),
    "Buxoro viloyati": ("buxoro", "bukhara", "бухар"),
    "Farg'ona viloyati": ("farg'ona", "fargona", "fergana", "фаргон", "ферган"),
    "Jizzax viloyati": ("jizzax", "jizakh", "джизак"),
    "Xorazm viloyati": ("xorazm", "khorezm", "urganch", "хорезм"),
    "Namangan viloyati": ("namangan", "наманган"),
    "Navoiy viloyati": ("navoiy", "navoi", "навои"),
    "Qashqadaryo viloyati": ("qashqadaryo", "kashkadarya", "qarshi", "кашкадар"),
    "Samarqand viloyati": ("samarqand", "samarkand", "самарканд"),
    "Sirdaryo viloyati": ("sirdaryo", "syrdarya", "guliston", "yangiyer", "сырдар"),
    "Surxondaryo viloyati": ("surxondaryo", "surkhandarya", "termiz", "сурхандар"),
    "Qoraqalpog'iston Respublikasi": ("qoraqalpog", "karakalpak", "nukus", "каракалпак"),
}

# If selected region is X, reject hits whose label clearly names another region
_FOREIGN_MARKERS: tuple[str, ...] = (
    "namangan",
    "наманган",
    "farg'ona",
    "fargona",
    "fergana",
    "фаргон",
    "ферган",
    "andijon",
    "andijan",
    "buxoro",
    "bukhara",
    "jizzax",
    "xorazm",
    "khorezm",
    "navoiy",
    "navoi",
    "qashqadaryo",
    "kashkadarya",
    "samarqand",
    "samarkand",
    "sirdaryo",
    "syrdarya",
    "yangiyer",
    "guliston",
    "surxondaryo",
    "surkhandarya",
    "qoraqalpog",
    "karakalpak",
    "nukus",
)

_APOSTROPHE_CHARS = ("ʼ", "ʻ", "‘", "’", "`", "´", "ʹ", "ʽ", "՚")
_STREET_SUFFIX_RE = re.compile(
    r"(?i)\s*(ko['ʻʼ]?chasi|ko['ʻʼ]?cha|kuchasi|kucha|kocha|street|улица|кўчаси|кўча)\s*$"
)


class GeoPlace(BaseModel):
    lat: float
    lng: float
    label: str
    title: str | None = None
    subtitle: str | None = None
    kind: str = "place"  # street | place | metro | shop | pharmacy | bank | cafe | fuel | mall


class GeoCategory(BaseModel):
    key: str
    label: str
    hint: str


# Quick-pick categories (Google Maps–like layers)
_GEO_CATEGORIES: tuple[GeoCategory, ...] = (
    GeoCategory(key="metro", label="Metro", hint="Metro bekatlari"),
    GeoCategory(key="shop", label="Do‘kon", hint="Korzinka, supermarket…"),
    GeoCategory(key="pharmacy", label="Apteka", hint="Dorixonalar"),
    GeoCategory(key="bank", label="Bank", hint="Bank filiallari"),
    GeoCategory(key="cafe", label="Kafe", hint="Kafe va restoran"),
    GeoCategory(key="fuel", label="Yoqilg‘i", hint="Yoqilg‘i quyish"),
    GeoCategory(key="mall", label="TC", hint="Savdo markazlari"),
)

# category → (kind, nominatim queries, photon query)
_CATEGORY_QUERIES: dict[str, tuple[str, tuple[str, ...], str]] = {
    "metro": ("metro", ("metro station", "метро бекати"), "metro"),
    "shop": ("shop", ("Korzinka", "supermarket", "супермаркет", "Makro"), "supermarket"),
    "pharmacy": ("pharmacy", ("apteka", "pharmacy", "аптека"), "pharmacy"),
    "bank": ("bank", ("bank", "банк"), "bank"),
    "cafe": ("cafe", ("cafe", "restaurant", "кафе", "restoran"), "cafe"),
    "fuel": ("fuel", ("fuel", "АЗС", "yoqilg'i", "gas station"), "fuel"),
    "mall": ("mall", ("shopping mall", "savdo markazi", "ТЦ"), "mall"),
}

# Brand / keyword → force POI cluster search (all branches on map)
_SMART_BRANDS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    # (match regex, kind, search queries)
    (r"(?i)\bkorzinka\b", "shop", ("Korzinka",)),
    (r"(?i)\bmakro\b", "shop", ("Makro",)),
    (r"(?i)\bhavas\b", "shop", ("Havas",)),
    (r"(?i)\bbaraka\s*market\b", "shop", ("Baraka market",)),
    (r"(?i)\bcosmetics?\s*plaza\b|\bcplaza\b", "shop", ("Cosmetics Plaza",)),
    (r"(?i)\buzum\s*market\b", "shop", ("Uzum Market",)),
    (r"(?i)\bmagnum\b", "shop", ("Magnum",)),
    (r"(?i)\bclick\b", "bank", ("Click",)),
    (r"(?i)\btbc\b", "bank", ("TBC Bank", "TBC")),
    (r"(?i)\bkapital\s*bank\b", "bank", ("Kapitalbank", "Kapital bank")),
    (r"(?i)\bipoteka\b", "bank", ("Ipoteka bank",)),
    (r"(?i)\barzon\s*apteka\b", "pharmacy", ("Arzon Apteka",)),
    (r"(?i)\b999\b|\bapteka\s*999\b", "pharmacy", ("Apteka 999",)),
)

_CATEGORY_WORD_MAP: tuple[tuple[str, str], ...] = (
    (r"(?i)\b(supermarket|do['ʻ’]?kon|магазин|супермаркет)\b", "shop"),
    (r"(?i)\b(apteka|pharmacy|dorixona|аптека)\b", "pharmacy"),
    (r"(?i)\b(bank|банк)\b", "bank"),
    (r"(?i)\b(cafe|kafe|restoran|restaurant|кафе)\b", "cafe"),
    (r"(?i)\b(azs|fuel|yoqilg|бензин|gas\s*station)\b", "fuel"),
    (r"(?i)\b(mall|tc\b|savdo\s*markaz|торговый)\b", "mall"),
)

# Reliable Toshkent metro stations (OSM-aligned) — plain "metro" query alone is too weak
_TASHKENT_METRO: tuple[tuple[str, float, float], ...] = (
    ("Chilonzor", 41.2753, 69.2035),
    ("Olmazor", 41.2788, 69.2125),
    ("Novza", 41.2845, 69.2218),
    ("Milliy bogʻ", 41.2912, 69.2315),
    ("Mirzo Ulugʻbek", 41.2980, 69.2410),
    ("Chorsu", 41.3255, 69.2355),
    ("Gafur Gʻulom", 41.3188, 69.2488),
    ("Alisher Navoiy", 41.3165, 69.2595),
    ("Paxtakor", 41.3180, 69.2615),
    ("Ozodlik maydoni", 41.3142, 69.2655),
    ("Mustaqillik maydoni", 41.3149, 69.2711),
    ("Amir Temur xiyoboni", 41.3115, 69.2797),
    ("Hamid Olimjon", 41.3182, 69.2957),
    ("Pushkin", 41.3219, 69.3111),
    ("Buyuk Ipak Yoʻli", 41.3261, 69.3286),
    ("Yunus Rajabiy", 41.3139, 69.2835),
    ("Ming oʻrik", 41.3075, 69.2820),
    ("Oybek", 41.2995, 69.2755),
    ("Kosmonavtlar", 41.2925, 69.2735),
    ("Yunusbod", 41.3455, 69.2855),
    ("Shahriston", 41.3535, 69.2885),
    ("Bodomzor", 41.3375, 69.2865),
    ("Minor", 41.3295, 69.2825),
    ("Abdulla Qodiriy", 41.3225, 69.2785),
    ("Bunyodkor", 41.3055, 69.2485),
    ("Doʻstlik", 41.2955, 69.2285),
    ("Mashinasozlar", 41.2885, 69.2185),
    ("Texnopark", 41.2685, 69.3125),
    ("Yashnobod", 41.2755, 69.3255),
    ("Tuzel", 41.2825, 69.3385),
    ("Olmos", 41.2895, 69.3515),
    ("Rohat", 41.2965, 69.3645),
)

# Slightly wider city box for metro POIs (still excludes Namangan/Farg‘ona)
_METRO_REGION_BBOX: dict[str, tuple[float, float, float, float]] = {
    "Toshkent shahri": (69.10, 41.21, 69.40, 41.40),
    "Toshkent viloyati": (68.55, 40.70, 70.15, 41.75),
}


def _get_json(url: str, params: dict | None = None) -> list | dict:
    try:
        res = requests.get(url, params=params, headers=_HEADERS, timeout=12)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Geokodlash xizmati ishlamayapti: {exc}") from exc
    if res.status_code == 429:
        raise HTTPException(status_code=429, detail="Juda ko‘p so‘rov — biroz kuting")
    if not res.ok:
        raise HTTPException(status_code=502, detail="Geokodlash xizmati javob bermadi")
    return res.json()


def _unify_apostrophes(text: str) -> str:
    out = text
    for ch in _APOSTROPHE_CHARS:
        out = out.replace(ch, "'")
    return out


def _stem(raw: str) -> str:
    """Rayxon kuchasi → Rayxon (for related-street suggest)."""
    base = _unify_apostrophes(raw.strip())
    stem = _STREET_SUFFIX_RE.sub("", base).strip(" ,.-")
    return stem or base


def _query_variants(raw: str, region: str | None) -> list[str]:
    base = _unify_apostrophes(raw.strip())
    if not base:
        return []

    variants: list[str] = []

    def add(s: str) -> None:
        s = re.sub(r"\s+", " ", s).strip()
        if s and s not in variants:
            variants.append(s)

    add(base)
    stem = _stem(base)
    if stem.lower() != base.lower():
        add(stem)
        add(f"{stem} ko'chasi")
        add(f"{stem} street")

    add(re.sub(r"(?i)\bkuchasi\b", "ko'chasi", base))
    add(re.sub(r"(?i)\bkuchasi\b", "koʻchasi", base))
    add(re.sub(r"(?i)\bkocha\b", "ko'cha", base))
    add(re.sub(r"(?i)\bkucha\b", "ko'cha", base))
    add(re.sub(r"(?i)\brayxon\b", "Rayhon", base))
    add(re.sub(r"(?i)\brayhon\b", "Rayxon", base))
    if stem:
        add(re.sub(r"(?i)\brayxon\b", "Rayhon", stem))
        add(re.sub(r"(?i)\brayhon\b", "Rayxon", stem))

    seeded = list(variants)
    if region:
        for v in seeded[:5]:
            add(f"{v}, {region}")
    else:
        for v in seeded[:3]:
            add(f"{v}, O'zbekiston")

    return variants[:12]


def _bbox_for(region: str | None) -> tuple[float, float, float, float]:
    if region and region in _REGION_BBOX:
        return _REGION_BBOX[region]
    return _UZ_BBOX


def _in_bbox(lat: float, lng: float, bbox: tuple[float, float, float, float]) -> bool:
    min_lon, min_lat, max_lon, max_lat = bbox
    return min_lat <= lat <= max_lat and min_lon <= lng <= max_lon


def _norm_text(s: str) -> str:
    return _unify_apostrophes(s or "").lower()


def _belongs_to_region(place: GeoPlace, region: str) -> bool:
    """Strict: coordinates must sit inside the selected region bbox; drop other-viloyat labels."""
    bbox = _REGION_BBOX.get(region)
    if not bbox or not _in_bbox(place.lat, place.lng, bbox):
        return False

    hay = _norm_text(f"{place.label} {place.subtitle or ''} {place.title or ''}")
    aliases = _REGION_ALIASES.get(region, ())
    region_norm = _norm_text(region)

    # Tokens this region is allowed to mention
    allowed_tokens = set(aliases)
    if region.startswith("Toshkent"):
        allowed_tokens.update(("toshkent", "tashkent"))

    for marker in _FOREIGN_MARKERS:
        if marker not in hay:
            continue
        if marker in region_norm:
            continue
        if marker in allowed_tokens or any(marker in a for a in aliases):
            continue
        # Label explicitly names another viloyat/city → reject
        return False

    return True


def _filter_by_region(places: list[GeoPlace], region: str | None) -> list[GeoPlace]:
    if not region:
        return places
    return [p for p in places if _belongs_to_region(p, region)]


def _nominatim_search(q: str, limit: int = 10, region: str | None = None) -> list[GeoPlace]:
    params: dict = {
        "format": "jsonv2",
        "limit": limit,
        "countrycodes": "uz",
        "q": q,
        "addressdetails": 0,
        "dedupe": 1,
    }
    if region and region in _REGION_BBOX:
        min_lon, min_lat, max_lon, max_lat = _REGION_BBOX[region]
        # Nominatim viewbox is lon_left,lat_top,lon_right,lat_bottom
        params["viewbox"] = f"{min_lon},{max_lat},{max_lon},{min_lat}"
        params["bounded"] = 1
    data = _get_json(f"{_NOMINATIM}/search", params)
    if not isinstance(data, list):
        return []
    out: list[GeoPlace] = []
    for item in data:
        if item.get("lat") is None or item.get("lon") is None:
            continue
        lat, lng = float(item["lat"]), float(item["lon"])
        if region and region in _REGION_BBOX and not _in_bbox(lat, lng, _REGION_BBOX[region]):
            continue
        category = (item.get("category") or "").lower()
        itype = (item.get("type") or "").lower()
        kind = "street" if category == "highway" or "street" in itype or "road" in itype else "place"
        label = item.get("display_name") or q
        title = item.get("name") or label.split(",")[0].strip()
        parts = [p.strip() for p in label.split(",")[1:] if p.strip()]
        subtitle = ", ".join(parts[:3]) if parts else None
        out.append(
            GeoPlace(
                lat=lat,
                lng=lng,
                label=label,
                title=title,
                subtitle=subtitle,
                kind=kind,
            )
        )
    return out


def _photon_search(
    q: str,
    *,
    region: str | None = None,
    highway_only: bool = False,
    limit: int = 15,
) -> list[GeoPlace]:
    min_lon, min_lat, max_lon, max_lat = _bbox_for(region)
    params: dict = {
        "q": q,
        "limit": limit,
        "lang": "en",
        "bbox": f"{min_lon},{min_lat},{max_lon},{max_lat}",
    }
    if highway_only:
        params["osm_tag"] = "highway"
    try:
        data = _get_json(_PHOTON, params)
    except HTTPException:
        return []
    features = data.get("features") if isinstance(data, dict) else None
    if not features:
        return []
    out: list[GeoPlace] = []
    bbox = _REGION_BBOX.get(region) if region else None
    for feat in features:
        props = feat.get("properties") or {}
        cc = (props.get("countrycode") or "").upper()
        if cc and cc != "UZ":
            continue
        coords = (feat.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        lng, lat = float(coords[0]), float(coords[1])
        # Photon bbox is soft — enforce hard region clip
        if bbox and not _in_bbox(lat, lng, bbox):
            continue
        name = props.get("name") or props.get("street")
        if not name:
            continue
        loc_parts = [
            props.get("district"),
            props.get("city"),
            props.get("county"),
            props.get("state"),
        ]
        subtitle = ", ".join(p for p in loc_parts if p)
        osm_key = (props.get("osm_key") or "").lower()
        ptype = (props.get("type") or "").lower()
        kind = "street" if osm_key == "highway" or ptype == "street" or highway_only else "place"
        label = f"{name}, {subtitle}" if subtitle else name
        out.append(
            GeoPlace(
                lat=lat,
                lng=lng,
                label=label,
                title=name,
                subtitle=subtitle or None,
                kind=kind,
            )
        )
    return out


def _merge_places(*groups: list[GeoPlace], limit: int = 12) -> list[GeoPlace]:
    seen: set[tuple[float, float, str]] = set()
    merged: list[GeoPlace] = []
    for group in groups:
        for place in group:
            key = (round(place.lat, 5), round(place.lng, 5), (place.title or place.label)[:60].lower())
            if key in seen:
                continue
            seen.add(key)
            merged.append(place)
            if len(merged) >= limit:
                return merged
    return merged


def _rank(places: list[GeoPlace], q: str, region: str | None) -> list[GeoPlace]:
    stem = _stem(q).lower()
    tokens = [t for t in re.split(r"\W+", stem) if len(t) >= 2]

    def score(p: GeoPlace) -> tuple:
        hay = f"{p.title or ''} {p.label} {p.subtitle or ''}".lower()
        street_boost = 0 if p.kind == "street" else 1
        starts = 0 if (p.title or "").lower().startswith(stem) or stem in (p.title or "").lower() else 1
        token_miss = sum(1 for t in tokens if t not in hay)
        region_miss = 0
        if region:
            region_miss = 0 if region.lower().split()[0] in hay else 1
        return (street_boost, starts, token_miss, region_miss, p.label)

    return sorted(places, key=score)


def _search_sync(q: str, region: str | None, category: str | None = None) -> list[GeoPlace]:
    """Smart suggest: categories, brands (Korzinka…), metro, or streets."""
    cat = (category or "").strip().lower() or None
    if cat == "metro" or (not cat and _is_metro_query(q)):
        return _metro_search(region)

    if cat and cat in _CATEGORY_QUERIES:
        kind, queries, photon_q = _CATEGORY_QUERIES[cat]
        brand = _detect_brand(q)
        if brand:
            return _poi_cluster_search(brand[1], brand[2], region)
        return _poi_cluster_search(kind, queries + (photon_q,), region)

    brand = _detect_brand(q)
    if brand:
        return _poi_cluster_search(brand[1], brand[2], region)

    inferred = _detect_category_word(q)
    if inferred and inferred in _CATEGORY_QUERIES:
        kind, queries, photon_q = _CATEGORY_QUERIES[inferred]
        return _poi_cluster_search(kind, queries + (q, photon_q), region)

    if _is_metro_query(q):
        return _metro_search(region)

    variants = _query_variants(q, region)
    if not variants:
        return []

    stem = _stem(q)
    photon_streets = _photon_search(stem, region=region, highway_only=True, limit=12)
    photon_places = _photon_search(stem, region=region, highway_only=False, limit=15)
    if stem.lower() != q.strip().lower():
        photon_streets = _merge_places(
            photon_streets,
            _photon_search(q, region=region, highway_only=True, limit=8),
            limit=16,
        )
        photon_places = _merge_places(
            photon_places,
            _photon_search(q, region=region, highway_only=False, limit=10),
            limit=20,
        )

    alt_stems: list[str] = []
    for v in variants:
        s = _stem(v)
        if s.lower() not in {stem.lower(), *(a.lower() for a in alt_stems)}:
            alt_stems.append(s)
    for alt in alt_stems[:2]:
        photon_streets = _merge_places(
            photon_streets,
            _photon_search(alt, region=region, highway_only=True, limit=8),
            limit=20,
        )

    nom_hits: list[GeoPlace] = []
    for variant in variants[:4]:
        nom_hits = _merge_places(
            nom_hits, _nominatim_search(variant, limit=12, region=region), limit=20
        )
        if len(nom_hits) >= 10:
            break

    enriched = [_enrich_kind(p) for p in _merge_places(photon_places, nom_hits, photon_streets, limit=30)]
    enriched = _filter_by_region(enriched, region)
    ranked = _rank(enriched, q, region)
    return ranked[:20]


def _detect_brand(q: str) -> tuple[str, str, tuple[str, ...]] | None:
    text = q.strip()
    for pattern, kind, queries in _SMART_BRANDS:
        if re.search(pattern, text):
            return (pattern, kind, queries)
    return None


def _detect_category_word(q: str) -> str | None:
    text = q.strip()
    if len(text) > 28:
        return None
    for pattern, key in _CATEGORY_WORD_MAP:
        if re.search(pattern, text):
            return key
    return None


def _enrich_kind(p: GeoPlace) -> GeoPlace:
    if p.kind not in ("place", "street"):
        return p
    hay = f"{p.title or ''} {p.label}".lower()
    if any(k in hay for k in ("metro", "метро", "subway")):
        kind = "metro"
    elif any(k in hay for k in ("korzinka", "supermarket", "супермаркет", "makro", "havas")):
        kind = "shop"
    elif any(k in hay for k in ("apteka", "pharmacy", "аптека", "dorixona")):
        kind = "pharmacy"
    elif "bank" in hay or "банк" in hay:
        kind = "bank"
    elif any(k in hay for k in ("cafe", "kafe", "restaurant", "кафе", "restoran")):
        kind = "cafe"
    elif any(k in hay for k in ("fuel", "azs", "азс", "yoqilg")):
        kind = "fuel"
    elif any(k in hay for k in ("mall", "savdo markaz", "торгов")):
        kind = "mall"
    else:
        return p
    return GeoPlace(
        lat=p.lat,
        lng=p.lng,
        label=p.label,
        title=p.title,
        subtitle=p.subtitle,
        kind=kind,
    )


def _poi_cluster_search(kind: str, queries: tuple[str, ...], region: str | None) -> list[GeoPlace]:
    """Find many branches of a brand/category and mark them for the map."""
    hits: list[GeoPlace] = []

    def tag(p: GeoPlace) -> GeoPlace:
        return GeoPlace(
            lat=p.lat,
            lng=p.lng,
            label=p.label,
            title=p.title or p.label,
            subtitle=p.subtitle,
            kind=kind,
        )

    for query in queries[:4]:
        for p in _safe_nominatim(query, limit=25, region=region):
            hits.append(tag(p))
        for p in _safe_photon(query, region=region, highway_only=False, limit=20):
            hits.append(tag(p))

    if region:
        if region in _METRO_REGION_BBOX:
            bbox = _METRO_REGION_BBOX[region]
            hits = [p for p in hits if _in_bbox(p.lat, p.lng, bbox)]
        else:
            hits = _filter_by_region(hits, region)

    seen: set[tuple[float, float, str]] = set()
    unique: list[GeoPlace] = []
    for p in hits:
        key = (round(p.lat, 4), round(p.lng, 4), (p.title or "").lower()[:40])
        if key in seen:
            continue
        seen.add(key)
        unique.append(p)
    return unique[:40]


def _is_metro_query(q: str) -> bool:
    text = q.strip()
    if re.search(r"(?i)\b(metro|метро|subway)\b", text) and len(text) <= 48:
        return True
    if re.search(r"(?i)\bbekat(i|lari|lar)?\b", text) and re.search(r"(?i)metro|метро", text):
        return True
    return False


def _safe_nominatim(q: str, limit: int = 10, region: str | None = None) -> list[GeoPlace]:
    try:
        return _nominatim_search(q, limit=limit, region=region)
    except HTTPException:
        return []


def _safe_photon(
    q: str,
    *,
    region: str | None = None,
    highway_only: bool = False,
    limit: int = 15,
) -> list[GeoPlace]:
    try:
        return _photon_search(q, region=region, highway_only=highway_only, limit=limit)
    except HTTPException:
        return []


def _metro_search(region: str | None) -> list[GeoPlace]:
    """Return metro stations in the selected region (plotted as map markers on the client)."""
    hits: list[GeoPlace] = []

    def as_metro(p: GeoPlace) -> GeoPlace:
        return GeoPlace(
            lat=p.lat,
            lng=p.lng,
            label=p.label,
            title=p.title or p.label,
            subtitle=p.subtitle,
            kind="metro",
        )

    # External providers may fail — never block curated fallback
    for query in ("metro station", "метро бекати", "subway station", "metro bekati"):
        for p in _safe_nominatim(query, limit=30, region=region):
            hay = f"{p.title or ''} {p.label}".lower()
            if any(k in hay for k in ("station", "metro", "метро", "subway", "bekati")):
                hits.append(as_metro(p))

    for p in _safe_photon("metro", region=region, highway_only=False, limit=25):
        hay = f"{p.title or ''} {p.label}".lower()
        if any(k in hay for k in ("metro", "station", "bekati", "метро", "railway")):
            hits.append(as_metro(p))

    # Always seed Toshkent metros when searching there (or region not chosen yet)
    if region in (None, "Toshkent shahri", "Toshkent viloyati"):
        bbox = _METRO_REGION_BBOX.get(region or "Toshkent shahri")
        for name, lat, lng in _TASHKENT_METRO:
            if bbox and not _in_bbox(lat, lng, bbox):
                continue
            hits.append(
                GeoPlace(
                    lat=lat,
                    lng=lng,
                    label=f"{name} metro bekati, Toshkent shahri",
                    title=f"{name} metro bekati",
                    subtitle="Toshkent shahri",
                    kind="metro",
                )
            )

    if region:
        if region in _METRO_REGION_BBOX:
            bbox = _METRO_REGION_BBOX[region]
            hits = [p for p in hits if _in_bbox(p.lat, p.lng, bbox)]
        else:
            hits = _filter_by_region(hits, region)

    seen: set[str] = set()
    unique: list[GeoPlace] = []
    for p in hits:
        key = re.sub(r"\s+", " ", (p.title or p.label).lower())
        key = re.sub(r"\s*metro\s*bekati\s*", " ", key).strip()
        if key in seen:
            continue
        seen.add(key)
        unique.append(as_metro(p))
    return unique[:40]


@router.get("/categories", response_model=list[GeoCategory])
async def geo_categories(_user: User = Depends(get_current_user)):
    return list(_GEO_CATEGORIES)


@router.get("/search", response_model=list[GeoPlace])
async def geo_search(
    q: str = Query("", max_length=200),
    region: str | None = Query(None, max_length=100),
    category: str | None = Query(None, max_length=40),
    _user: User = Depends(get_current_user),
):
    region_clean = (region or "").strip() or None
    cat = (category or "").strip().lower() or None
    text = (q or "").strip()
    if not cat and len(text) < 2:
        raise HTTPException(status_code=400, detail="Qidiruv juda qisqa")
    if not text and cat:
        text = cat
    return await asyncio.to_thread(_search_sync, text, region_clean, cat)


@router.get("/reverse", response_model=GeoPlace | None)
async def geo_reverse(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    _user: User = Depends(get_current_user),
):
    data = await asyncio.to_thread(
        _get_json,
        f"{_NOMINATIM}/reverse",
        {
            "format": "jsonv2",
            "lat": lat,
            "lon": lng,
        },
    )
    if not isinstance(data, dict) or not data.get("display_name"):
        return None
    label = data["display_name"]
    title = data.get("name") or label.split(",")[0].strip()
    parts = [p.strip() for p in label.split(",")[1:] if p.strip()]
    return GeoPlace(
        lat=lat,
        lng=lng,
        label=label,
        title=title,
        subtitle=", ".join(parts[:3]) if parts else None,
        kind="place",
    )
