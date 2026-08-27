import httpx
from app.config import NOMINATIM_URL


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
            timeout=10
        )

    response.raise_for_status()

    data = response.json()

    return [
        {
            "name": item["display_name"],
            "latitude": float(item["lat"]),
            "longitude": float(item["lon"])
        }
        for item in data
    ]