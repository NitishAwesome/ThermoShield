import httpx
from backend.app.config import NOMINATIM_URL


async def search_location(query: str):

    params = {
        "q": query,
        "format": "json",
        "limit": 5,
    }

    headers = {
        "User-Agent": "SIH26083-HeatHealthApp/1.0"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            NOMINATIM_URL,
            params=params,
            headers=headers,
            timeout=10,
        )

    response.raise_for_status()

    results = response.json()

    locations = []

    for item in results:
        locations.append({
            "name": item.get("display_name"),
            "latitude": float(item.get("lat")),
            "longitude": float(item.get("lon"))
        })

    return locations