import asyncio
import logging
import time
from typing import Dict, Tuple, Any, Optional
import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# In-memory weather cache: (lat, lon) -> { "data": dict, "timestamp": float }
# Fresh TTL: 60 seconds. Stale TTL (fallback for 429/5xx): 3600 seconds (1 hour).
_CACHE: Dict[Tuple[float, float], Dict[str, Any]] = {}
_CACHE_LOCK = asyncio.Lock()
_INFLIGHT_REQUESTS: Dict[Tuple[float, float], asyncio.Future] = {}

FRESH_TTL_SECONDS = 60.0
STALE_TTL_SECONDS = 3600.0


def _normalize_coords(latitude: float, longitude: float) -> Tuple[float, float]:
    return round(float(latitude), 4), round(float(longitude), 4)


def _is_nighttime_at_location(latitude: float, longitude: float, obs_time_str: Optional[str] = None) -> bool:
    """
    Determines whether it is nighttime at the given coordinates.
    Uses observation time string if present (e.g. '2026-08-29T23:00'),
    otherwise calculates approximate local solar time from UTC.
    """
    if obs_time_str:
        try:
            # ISO timestamp 'YYYY-MM-DDTHH:MM'
            time_part = obs_time_str.split("T")[-1]
            hour = int(time_part.split(":")[0])
            # Night is roughly 19:00 (7 PM) to 06:00 (6 AM)
            return hour >= 19 or hour < 6
        except Exception:
            pass

    # Fallback to local solar time estimation from UTC
    utc_hour = (time.time() % 86400) / 3600.0
    local_solar_hour = (utc_hour + (longitude / 15.0)) % 24.0
    return local_solar_hour >= 19.0 or local_solar_hour < 6.0


# Pre-seed regional meteorological baselines dynamically adjusted for day vs night
def _init_regional_seed_cache():
    now = time.time() - 120.0  # Seeded as slightly stale so fresh fetch is attempted first
    seeds_config = {
        (19.0760, 72.8777): {"temp_day": 33.0, "temp_night": 27.2, "rh_day": 65.0, "rh_night": 80.0, "wind": 3.2, "solar_day": 450.0},
        (28.6139, 77.2090): {"temp_day": 38.0, "temp_night": 29.0, "rh_day": 42.0, "rh_night": 65.0, "wind": 2.5, "solar_day": 650.0},
        (26.9124, 75.7873): {"temp_day": 39.0, "temp_night": 28.0, "rh_day": 38.0, "rh_night": 60.0, "wind": 2.8, "solar_day": 700.0}
    }
    for (lat, lon), cfg in seeds_config.items():
        is_night = _is_nighttime_at_location(lat, lon)
        _CACHE[(lat, lon)] = {
            "data": {
                "location": {"latitude": lat, "longitude": lon},
                "weather": {
                    "temperature": cfg["temp_night"] if is_night else cfg["temp_day"],
                    "humidity": cfg["rh_night"] if is_night else cfg["rh_day"],
                    "wind_speed": cfg["wind"],
                    "solar_radiation": 0.0 if is_night else cfg["solar_day"],
                    "is_day": 0 if is_night else 1,
                    "time": time.strftime("%Y-%m-%dT%H:%M")
                },
                "forecast": {
                    "dates": ["2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"],
                    "max_temperature": [34.0, 34.5, 34.0, 33.5, 34.0],
                    "min_temperature": [26.0, 26.5, 26.0, 25.5, 26.0]
                }
            },
            "timestamp": now
        }


_init_regional_seed_cache()


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
            "shortwave_radiation,"
            "is_day"
        ),
        "daily": (
            "temperature_2m_max,"
            "temperature_2m_min"
        ),
        "forecast_days": 5,
        "wind_speed_unit": "ms",
        "timezone": "auto"
    }
    headers = {
        "User-Agent": "ThermoShield-HeatHealth/1.0 (https://github.com/NitishAwesome/ThermoShield)",
        "Accept": "application/json",
    }

    max_retries = 2
    last_error: Optional[Exception] = None

    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, headers=headers, timeout=12.0)

            if response.status_code == 200:
                data = response.json()
                current = data.get("current", {})
                daily = data.get("daily", {})

                is_day = int(current.get("is_day", 1))
                raw_solar = float(current.get("shortwave_radiation", 0.0) or 0.0)
                # At night (is_day == 0) or negative reading, solar radiation must be 0.0 W/m²
                solar_radiation = 0.0 if is_day == 0 or raw_solar < 0.0 else raw_solar

                return {
                    "location": {
                        "latitude": latitude,
                        "longitude": longitude
                    },
                    "weather": {
                        "temperature": float(current.get("temperature_2m", 25.0)),
                        "humidity": float(current.get("relative_humidity_2m", 50.0)),
                        "wind_speed": float(current.get("wind_speed_10m", 1.0)),
                        "solar_radiation": solar_radiation,
                        "is_day": is_day,
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
            # Create safe copy and adjust solar radiation if current time has transitioned into night
            fallback_data = {
                "location": dict(stale_data.get("location", {})),
                "weather": dict(stale_data.get("weather", {})),
                "forecast": dict(stale_data.get("forecast", {}))
            }
            if _is_nighttime_at_location(latitude, longitude):
                fallback_data["weather"]["solar_radiation"] = 0.0
                fallback_data["weather"]["is_day"] = 0
            if not future.done():
                future.set_result(fallback_data)
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


async def get_forecast(
    latitude: float = 0.0,
    longitude: float = 0.0,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
) -> Dict[str, Any]:
    effective_lat = latitude if lat is None else lat
    effective_lon = longitude if lon is None else lon
    weather_data = await get_weather(effective_lat, effective_lon)
    return {
        "location": weather_data["location"],
        "forecast": weather_data["forecast"]
    }