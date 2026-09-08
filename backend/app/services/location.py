import httpx
import logging
from typing import Dict, List, Any
from app.config import NOMINATIM_URL

logger = logging.getLogger(__name__)

# In-memory search cache to accelerate autocomplete and eliminate redundant network calls
_LOCATION_CACHE: Dict[str, List[Dict[str, Any]]] = {}

# Instant offline Indian cities directory as a 100% reliable fallback
POPULAR_INDIAN_CITIES: List[Dict[str, Any]] = [
    {"name": "Mumbai, Maharashtra, India", "latitude": 19.0760, "longitude": 72.8777},
    {"name": "Delhi, National Capital Territory of Delhi, India", "latitude": 28.6139, "longitude": 77.2090},
    {"name": "Jaipur, Rajasthan, India", "latitude": 26.9124, "longitude": 75.7873},
    {"name": "Bengaluru, Karnataka, India", "latitude": 12.9716, "longitude": 77.5946},
    {"name": "Ahmedabad, Gujarat, India", "latitude": 23.0225, "longitude": 72.5714},
    {"name": "Hyderabad, Telangana, India", "latitude": 17.3850, "longitude": 78.4867},
    {"name": "Chennai, Tamil Nadu, India", "latitude": 13.0827, "longitude": 80.2707},
    {"name": "Kolkata, West Bengal, India", "latitude": 22.5726, "longitude": 88.3639},
    {"name": "Pune, Maharashtra, India", "latitude": 18.5204, "longitude": 73.8567},
    {"name": "Lucknow, Uttar Pradesh, India", "latitude": 26.8467, "longitude": 80.9462},
    {"name": "Nagpur, Maharashtra, India", "latitude": 21.1458, "longitude": 79.0882},
    {"name": "Patna, Bihar, India", "latitude": 25.5941, "longitude": 85.1376},
    {"name": "Surat, Gujarat, India", "latitude": 21.1702, "longitude": 72.8311},
    {"name": "Navi Mumbai, Maharashtra, India", "latitude": 19.0330, "longitude": 73.0297},
    {"name": "Bhopal, Madhya Pradesh, India", "latitude": 23.2599, "longitude": 77.4126},
    {"name": "Indore, Madhya Pradesh, India", "latitude": 22.7196, "longitude": 75.8577},
    {"name": "Kanpur, Uttar Pradesh, India", "latitude": 26.4499, "longitude": 80.3319},
    {"name": "Thane, Maharashtra, India", "latitude": 19.2183, "longitude": 72.9781},
    {"name": "Chandigarh, India", "latitude": 30.7333, "longitude": 76.7794},
]


async def search_location(query: str) -> List[Dict[str, Any]]:
    normalized_q = query.strip().lower()
    if not normalized_q or len(normalized_q) < 2:
        return []

    # Return cached results if available
    if normalized_q in _LOCATION_CACHE:
        return _LOCATION_CACHE[normalized_q]

    locations: List[Dict[str, Any]] = []

    # 1. Primary: Open-Meteo Geocoding API (Fast, extremely reliable from cloud IPs, no 403 blocks)
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
                timeout=5.0,
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
        logger.warning(f"Open-Meteo geocoding failed for '{query}': {e}")

    # 2. Secondary: OpenStreetMap Nominatim
    if not locations:
        try:
            params = {
                "q": query.strip(),
                "format": "json",
                "limit": 8,
                "countrycodes": "in",
            }
            headers = {
                "User-Agent": "ThermoShield-HeatHealth-App/2.0 (admin@thermoshield.org)"
            }
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    NOMINATIM_URL,
                    params=params,
                    headers=headers,
                    timeout=5.0,
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
            logger.warning(f"Nominatim lookup failed for '{query}': {e}")

    # 3. Tertiary Fallback: Match against built-in popular Indian cities directory
    if not locations:
        matched = [
            city for city in POPULAR_INDIAN_CITIES
            if normalized_q in city["name"].lower()
        ]
        if matched:
            locations = matched

    # Cache successful results
    if locations:
        _LOCATION_CACHE[normalized_q] = locations

    return locations