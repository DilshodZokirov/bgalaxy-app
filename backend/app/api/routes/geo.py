"""Geocoding proxy — Nominatim via backend (avoids nested-form / CSP / browser blocks)."""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import requests

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/geo", tags=["geo"])

_NOMINATIM = "https://nominatim.openstreetmap.org"
_HEADERS = {
    "User-Agent": "BG-BusinessGalaxy/1.0 (company-location; contact@bgalaxy.local)",
    "Accept": "application/json",
    "Accept-Language": "uz,ru,en",
}


class GeoPlace(BaseModel):
    lat: float
    lng: float
    label: str


def _get_json(url: str, params: dict) -> list | dict:
    try:
        res = requests.get(url, params=params, headers=_HEADERS, timeout=12)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Geokodlash xizmati ishlamayapti: {exc}") from exc
    if res.status_code == 429:
        raise HTTPException(status_code=429, detail="Juda ko‘p so‘rov — biroz kuting")
    if not res.ok:
        raise HTTPException(status_code=502, detail="Geokodlash xizmati javob bermadi")
    return res.json()


@router.get("/search", response_model=list[GeoPlace])
async def geo_search(
    q: str = Query(..., min_length=2, max_length=200),
    _user: User = Depends(get_current_user),
):
    data = await asyncio.to_thread(
        _get_json,
        f"{_NOMINATIM}/search",
        {
            "format": "jsonv2",
            "limit": 8,
            "countrycodes": "uz",
            "q": q.strip(),
            "addressdetails": 0,
        },
    )
    if not isinstance(data, list):
        return []
    return [
        GeoPlace(
            lat=float(item["lat"]),
            lng=float(item["lon"]),
            label=item.get("display_name") or q,
        )
        for item in data
        if item.get("lat") is not None and item.get("lon") is not None
    ]


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
