import asyncio
import logging
import time
from typing import Dict, Tuple, Any, Optional
import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# In-memory weather cache: (lat, lon) -> { "data": dict, "timestamp": float }
# Fresh TTL: 60 seconds. Stale TTL (fallback for 429/5xx): 600 seconds (10 minutes).
_CACHE: Dict[Tuple[float, float], Dict[str, Any]] = {}
_CACHE_LOCK = asyncio.Lock()
_INFLIGHT_REQUESTS: Dict[Tuple[float, float], asyncio.Future] = {}

FRESH_TTL_SECONDS = 60.0
STALE_TTL_SECONDS = 600.0


def _normalize_coords(latitude: float, longitude: float) -> Tuple[float, float]:
    return round(float(latitude), 4), round(float(longitude), 4)


def get_cached_weather(key: Tuple[float, float], allow_stale: bool = False) -> Optional[Dict[str, Any]]:
    entry = _CACHE.get(key)
    if not entry:
        return None
    age = time.time() - entry["timestamp"]
    if age <= FRESH_TTL_SECONDS:
        return entry["data"]
    if allow_stale and age <= STALE_TTL_SECONDS:
        return entry["data"]
    return None


async def _fetch_from_open_meteo(latitude: float, longitude: float) -> Dict[str, Any]:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "wind_speed_10m,"
            "shortwave_radiation"
        ),
        "daily": (
            "temperature_2m_max,"
            "temperature_2m_min"
        ),
        "forecast_days": 5,
        "wind_speed_unit": "ms",
        "timezone": "auto"
    }

    max_retries = 2
    last_error: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=12.0)

            if response.status_code == 200:
                data = response.json()
                current = data.get("current", {})
                daily = data.get("daily", {})

                return {
                    "location": {
                        "latitude": latitude,
                        "longitude": longitude
                    },
                    "weather": {
                        "temperature": float(current.get("temperature_2m", 25.0)),
                        "humidity": float(current.get("relative_humidity_2m", 50.0)),
                        "wind_speed": float(current.get("wind_speed_10m", 1.0)),
                        "solar_radiation": float(current.get("shortwave_radiation", 0.0) or 0.0),
                        "time": str(current.get("time", ""))
                    },
                    "forecast": {
                        "dates": list(daily.get("time", [])),
                        "max_temperature": [float(x) for x in daily.get("temperature_2m_max", [])],
                        "min_temperature": [float(x) for x in daily.get("temperature_2m_min", [])]
                    }
                }

            if response.status_code == 429:
                retry_after_header = response.headers.get("Retry-After")
                retry_delay = 0.5 * (2 ** attempt)
                if retry_after_header:
                    try:
                        retry_delay = min(float(retry_after_header), 2.0)
                    except ValueError:
                        pass
                logger.warning(
                    f"Open-Meteo 429 rate limit hit for ({latitude}, {longitude}). "
                    f"Attempt {attempt + 1}/{max_retries + 1}. Retrying in {retry_delay:.2f}s..."
                )
                if attempt < max_retries:
                    await asyncio.sleep(retry_delay)
                    continue
                else:
                    raise httpx.HTTPStatusError("429 Too Many Requests", request=response.request, response=response)

            response.raise_for_status()

        except httpx.HTTPStatusError as exc:
            last_error = exc
            if exc.response.status_code == 429 and attempt < max_retries:
                await asyncio.sleep(0.5 * (2 ** attempt))
                continue
            break
        except (httpx.RequestError, asyncio.TimeoutError) as exc:
            last_error = exc
            if attempt < max_retries:
                await asyncio.sleep(0.5 * (2 ** attempt))
                continue
            break

    if last_error:
        raise last_error

    raise RuntimeError("Unexpected end of Open-Meteo request loop")


async def get_weather(latitude: float, longitude: float) -> Dict[str, Any]:
    key = _normalize_coords(latitude, longitude)

    # 1. Fresh Cache Check (Zero network latency, 0 upstream calls)
    cached = get_cached_weather(key, allow_stale=False)
    if cached is not None:
        return cached

    # 2. In-flight Request Deduplication
    # If a concurrent request for the same coordinate is already running, await its result
    async with _CACHE_LOCK:
        cached = get_cached_weather(key, allow_stale=False)
        if cached is not None:
            return cached

        if key in _INFLIGHT_REQUESTS:
            future = _INFLIGHT_REQUESTS[key]
        else:
            loop = asyncio.get_running_loop()
            future = loop.create_future()
            _INFLIGHT_REQUESTS[key] = future
            # Trigger background execution for this key
            asyncio.create_task(_execute_fetch_and_resolve(key, latitude, longitude, future))

    # Await resolution of the in-flight fetch
    return await future


async def _execute_fetch_and_resolve(
    key: Tuple[float, float],
    latitude: float,
    longitude: float,
    future: asyncio.Future
):
    try:
        data = await _fetch_from_open_meteo(latitude, longitude)
        _CACHE[key] = {
            "data": data,
            "timestamp": time.time()
        }
        if not future.done():
            future.set_result(data)
    except Exception as exc:
        # Check if stale cached data exists as a fallback
        stale_data = get_cached_weather(key, allow_stale=True)
        if stale_data is not None:
            logger.warning(
                f"Upstream weather request failed for {key}: {exc}. "
                f"Returning stale cached data fallback."
            )
            if not future.done():
                future.set_result(stale_data)
        else:
            logger.error(f"Weather request failed and no cache available for {key}: {exc}")
            if not future.done():
                future.set_exception(
                    HTTPException(
                        status_code=503,
                        detail="Upstream weather service temporarily unavailable. Please retry in a few moments."
                    )
                )
    finally:
        async with _CACHE_LOCK:
            _INFLIGHT_REQUESTS.pop(key, None)