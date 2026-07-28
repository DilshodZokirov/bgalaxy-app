"""Geocoding proxy — Nominatim (+ Photon fallback) for Uzbek street search."""

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

_APOSTROPHE_CHARS = ("ʼ", "ʻ", "‘", "’", "`", "´", "ʹ", "ʽ", "՚")


class GeoPlace(BaseModel):
    lat: float
    lng: float
    label: str


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


def _query_variants(raw: str, region: str | None) -> list[str]:
    """Build Nominatim-friendly variants for common Uzbek street typing."""
    base = _unify_apostrophes(raw.strip())
    if not base:
        return []

    variants: list[str] = []

    def add(s: str) -> None:
        s = re.sub(r"\s+", " ", s).strip()
        if s and s not in variants:
            variants.append(s)

    add(base)

    # kuchasi / kocha without apostrophe → ko'chasi / ko'cha (OSM uses apostrophe forms)
    add(re.sub(r"(?i)\bkuchasi\b", "ko'chasi", base))
    add(re.sub(r"(?i)\bkuchasi\b", "koʻchasi", base))
    add(re.sub(r"(?i)\bkocha\b", "ko'cha", base))
    add(re.sub(r"(?i)\bkochasiga\b", "ko'chasiga", base))
    add(re.sub(r"(?i)\bkucha\b", "ko'cha", base))

    # Common Latin spelling swaps for street names
    add(re.sub(r"(?i)\brayxon\b", "Rayhon", base))
    add(re.sub(r"(?i)\brayhon\b", "Rayxon", base))

    # Drop trailing "ko'chasi" and search name + street in region (helps fuzzy)
    stem = re.sub(r"(?i)\s*(ko['ʻʼ]?chasi|kuchasi|street|улица)\s*$", "", base).strip()
    if stem and stem.lower() != base.lower():
        add(f"{stem} ko'chasi")
        add(f"{stem} street")

    # Bias with selected region / country
    seeded = list(variants)
    if region:
        for v in seeded[:4]:
            add(f"{v}, {region}")
            add(f"{v}, {region}, O'zbekiston")
    else:
        for v in seeded[:3]:
            add(f"{v}, O'zbekiston")

    return variants[:10]


def _nominatim_search(q: str) -> list[GeoPlace]:
    data = _get_json(
        f"{_NOMINATIM}/search",
        {
            "format": "jsonv2",
            "limit": 8,
            "countrycodes": "uz",
            "q": q,
            "addressdetails": 0,
            "dedupe": 1,
        },
    )
    if not isinstance(data, list):
        return []
    out: list[GeoPlace] = []
    for item in data:
        if item.get("lat") is None or item.get("lon") is None:
            continue
        out.append(
            GeoPlace(
                lat=float(item["lat"]),
                lng=float(item["lon"]),
                label=item.get("display_name") or q,
            )
        )
    return out


def _photon_search(q: str) -> list[GeoPlace]:
    """Secondary index — often finds streets when Nominatim spelling is off."""
    min_lon, min_lat, max_lon, max_lat = _UZ_BBOX
    try:
        data = _get_json(
            _PHOTON,
            {
                "q": q,
                "limit": 8,
                "lang": "en",
                "bbox": f"{min_lon},{min_lat},{max_lon},{max_lat}",
            },
        )
    except HTTPException:
        return []
    features = data.get("features") if isinstance(data, dict) else None
    if not features:
        return []
    out: list[GeoPlace] = []
    for feat in features:
        props = feat.get("properties") or {}
        # Keep Uzbekistan (and missing countrycode inside bbox)
        cc = (props.get("countrycode") or "").upper()
        if cc and cc != "UZ":
            continue
        coords = (feat.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        lng, lat = float(coords[0]), float(coords[1])
        parts = [
            props.get("name"),
            props.get("street"),
            props.get("district"),
            props.get("city"),
            props.get("state"),
            props.get("country"),
        ]
        label = ", ".join(p for p in parts if p)
        if not label:
            continue
        out.append(GeoPlace(lat=lat, lng=lng, label=label))
    return out


def _merge_places(*groups: list[GeoPlace], limit: int = 10) -> list[GeoPlace]:
    seen: set[tuple[float, float, str]] = set()
    merged: list[GeoPlace] = []
    for group in groups:
        for place in group:
            key = (round(place.lat, 5), round(place.lng, 5), place.label[:80])
            if key in seen:
                continue
            seen.add(key)
            merged.append(place)
            if len(merged) >= limit:
                return merged
    return merged


def _search_sync(q: str, region: str | None) -> list[GeoPlace]:
    variants = _query_variants(q, region)
    if not variants:
        return []

    # Primary: first few Nominatim variants (rate-limit friendly)
    nom_hits: list[GeoPlace] = []
    for variant in variants[:5]:
        nom_hits = _merge_places(nom_hits, _nominatim_search(variant), limit=12)
        if len(nom_hits) >= 6:
            break

    # Photon on original + normalized street form
    photon_q = variants[0]
    for v in variants:
        if "ko'chasi" in v.lower() or "koʻchasi" in v.lower():
            photon_q = v
            break
    if region:
        photon_q = f"{photon_q} {region}"
    photon_hits = _photon_search(photon_q)

    return _merge_places(nom_hits, photon_hits, limit=10)


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
    return GeoPlace(lat=lat, lng=lng, label=data["display_name"])
