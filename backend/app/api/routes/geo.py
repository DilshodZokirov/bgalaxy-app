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
    "Toshkent shahri": (69.10, 41.20, 69.40, 41.40),
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
    kind: str = "place"  # street | place


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


def _search_sync(q: str, region: str | None) -> list[GeoPlace]:
    """Google/Yandex-like: return several related streets for a partial name."""
    variants = _query_variants(q, region)
    if not variants:
        return []

    stem = _stem(q)

    # 1) Photon highway suggest on stem — best “related streets” list
    photon_streets = _photon_search(stem, region=region, highway_only=True, limit=15)
    if stem.lower() != q.strip().lower():
        photon_streets = _merge_places(
            photon_streets,
            _photon_search(q, region=region, highway_only=True, limit=10),
            limit=20,
        )

    # Also try alternate spellings on stem (Rayxon ↔ Rayhon)
    alt_stems = []
    for v in variants:
        s = _stem(v)
        if s.lower() not in {stem.lower(), *(a.lower() for a in alt_stems)}:
            alt_stems.append(s)
    for alt in alt_stems[:2]:
        photon_streets = _merge_places(
            photon_streets,
            _photon_search(alt, region=region, highway_only=True, limit=10),
            limit=24,
        )

    # 2) Photon general (POIs / places) for fuller coverage
    photon_places = _photon_search(stem, region=region, highway_only=False, limit=8)

    # 3) Nominatim — bounded to region viewbox when selected
    nom_hits: list[GeoPlace] = []
    for variant in variants[:4]:
        nom_hits = _merge_places(
            nom_hits, _nominatim_search(variant, limit=8, region=region), limit=16
        )
        if len(nom_hits) >= 8:
            break

    # Prefer streets first in merge order, then hard-filter by selected viloyat, then rank
    merged = _merge_places(photon_streets, nom_hits, photon_places, limit=24)
    merged = _filter_by_region(merged, region)
    ranked = _rank(merged, q, region)
    return ranked[:12]


@router.get("/search", response_model=list[GeoPlace])
async def geo_search(
    q: str = Query(..., min_length=2, max_length=200),
    region: str | None = Query(None, max_length=100),
    _user: User = Depends(get_current_user),
):
    region_clean = (region or "").strip() or None
    return await asyncio.to_thread(_search_sync, q.strip(), region_clean)


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
