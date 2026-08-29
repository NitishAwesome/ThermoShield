import httpx
import logging
from typing import Dict, List, Any
from backend.app.config import NOMINATIM_URL

logger = logging.getLogger(__name__)

# In-memory search cache to prevent rate-limiting and accelerate autocomplete
_LOCATION_CACHE: Dict[str, List[Dict[str, Any]]] = {}


async def search_location(query: str) -> List[Dict[str, Any]]:
    normalized_q = query.strip().lower()
    if not normalized_q:
        return []

    # Return cached results if available
    if normalized_q in _LOCATION_CACHE:
        return _LOCATION_CACHE[normalized_q]

    locations: List[Dict[str, Any]] = []

    # 1. Primary: Query OpenStreetMap Nominatim with India countrycode filter
    try:
        params = {
            "q": query.strip(),
            "format": "json",
            "limit": 8,
            "countrycodes": "in",
        }
        headers = {
            "User-Agent": "ThermoShield-HeatHealth-SIH/2.0 (contact@thermoshield.org)"
        }
        async with httpx.AsyncClient() as client:
            response = await client.get(
                NOMINATIM_URL,
                params=params,
                headers=headers,
                timeout=8,
            )

            if response.status_code == 200:
                results = response.json()
                for item in results:
                    try:
                        locations.append({
                            "name": item.get("display_name"),
                            "latitude": float(item.get("lat")),
                            "longitude": float(item.get("lon"))
                        })
                    except (ValueError, TypeError):
                        continue
    except Exception as e:
        logger.warning(f"Nominatim lookup failed or timed out for '{query}': {e}")

    # 2. Fallback: If Nominatim returned no results or was rate-limited (429), query Open-Meteo Geocoding
    if not locations:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://geocoding-api.open-meteo.com/v1/search",
                    params={
                        "name": query.strip(),
                        "count": 8,
                        "language": "en",
                        "format": "json"
                    },
                    timeout=8,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    # Prioritize Indian locations
                    india_results = [r for r in results if r.get("country_code") == "IN" or r.get("country") == "India"]
                    other_results = [r for r in results if r not in india_results]
                    for item in (india_results + other_results):
                        name_parts = [item.get("name"), item.get("admin1"), item.get("country")]
                        display_name = ", ".join([p for p in name_parts if p])
                        try:
                            locations.append({
                                "name": display_name,
                                "latitude": float(item.get("latitude")),
                                "longitude": float(item.get("longitude"))
                            })
                        except (ValueError, TypeError):
                            continue
        except Exception as e:
            logger.error(f"Geocoding fallback failed for '{query}': {e}")

    # Cache successful results
    if locations:
        _LOCATION_CACHE[normalized_q] = locations

    return locations