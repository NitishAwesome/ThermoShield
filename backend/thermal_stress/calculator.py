"""
backend/thermal_stress/calculator.py

Core biometeorological mathematical calculations for Human Thermal Stress.
Implements standardized formulations for:
  1. Wet-Bulb Globe Temperature (WBGT) — Primary index (ISO 7243 / Stull 2011 approximation)
  2. NOAA Heat Index (HI) — Secondary index (Rothfusz polynomial)
  3. Apparent Temperature (AT) — Supporting index (Australian BOM / Steadman)
"""

import math
from typing import Optional
from backend.thermal_stress.models import WeatherInput, ThermalIndices


def calculate_vapor_pressure(temperature_c: float, relative_humidity_pct: float) -> float:
    """
    Computes actual water vapor pressure (e) in hectopascals (hPa)
    using the Magnus-Tetens approximation.
    
    Formula:
      e = (RH / 100) * 6.105 * exp((17.27 * T) / (237.7 + T))
    """
    rh_fraction = relative_humidity_pct / 100.0
    saturation_vapor_pressure = 6.105 * math.exp(
        (17.27 * temperature_c) / (237.7 + temperature_c)
    )
    return rh_fraction * saturation_vapor_pressure


def calculate_stull_wet_bulb(temperature_c: float, relative_humidity_pct: float) -> float:
    """
    Calculates natural wet-bulb temperature (Tw) in °C using Stull's empirical equation (2011).
    Valid for relative humidity 5%–99% and temperatures -20°C to 50°C (accuracy within ~0.3°C).
    
    Reference:
      Stull, R. (2011). Wet-Bulb Temperature from Relative Humidity and Air Temperature.
      Journal of Applied Meteorology and Climatology, 50(11), 2267-2269.
    """
    t = temperature_c
    rh = relative_humidity_pct

    tw = (
        t * math.atan(0.151977 * math.sqrt(rh + 8.313659))
        + math.atan(t + rh)
        - math.atan(rh - 1.676331)
        + 0.00391838 * (rh ** 1.5) * math.atan(0.023101 * rh)
        - 4.686035
    )
    return tw


def calculate_wbgt(
    temperature_c: float,
    relative_humidity_pct: float,
    wind_speed_mps: float = 1.0,
    solar_radiation_wm2: Optional[float] = None,
) -> float:
    """
    Calculates Wet-Bulb Globe Temperature (WBGT) in °C.
    
    Assumptions & Scientific Basis:
      - Indoor / Shade (solar_radiation <= 0 or None):
          WBGT = 0.7 * Tw + 0.3 * Ta  (ISO 7243 standard)
      - Outdoor / Direct Sun (solar_radiation > 0):
          Approximates Black Globe Temperature (Tg) using direct/diffuse solar irradiance
          and convective wind cooling:
            Tg = Ta + (Solar / 100.0) * (1.0 / sqrt(max(v, 0.5)))
          Then applies the standard 3-parameter outdoor WBGT formula:
            WBGT = 0.7 * Tw + 0.2 * Tg + 0.1 * Ta
    """
    tw = calculate_stull_wet_bulb(temperature_c, relative_humidity_pct)
    ta = temperature_c

    # Indoor / Shaded Condition
    if solar_radiation_wm2 is None or solar_radiation_wm2 <= 0.0:
        wbgt = 0.7 * tw + 0.3 * ta
        return wbgt

    # Outdoor / Solar Radiation Condition
    # Wind speed minimum clamp to avoid division by zero or unrealistic calm stagnation
    effective_wind = max(wind_speed_mps, 0.5)
    # Radiative heat absorption model for black globe temperature
    tg = ta + (solar_radiation_wm2 / 100.0) * (1.0 / math.sqrt(effective_wind))

    wbgt = 0.7 * tw + 0.2 * tg + 0.1 * ta
    return wbgt


def calculate_heat_index(temperature_c: float, relative_humidity_pct: float) -> float:
    """
    Calculates NOAA/NWS Heat Index in °C.
    
    Scientific Basis:
      Uses the standard National Weather Service Rothfusz polynomial regression equation
      derived from Steadman's human biometeorological model.
      
    Assumptions & Valid Range:
      - Heat Index is scientifically designed for warm/hot conditions (T >= 20°C / 68°F).
      - If T < 20°C, heat stress is inactive and ambient temperature is returned.
      - Includes low-humidity and high-humidity boundary adjustments recommended by NOAA.
    """
    # If air temperature is cool, heat index does not apply
    if temperature_c < 20.0:
        return temperature_c

    # Convert Celsius to Fahrenheit for NOAA polynomial
    tf = (temperature_c * 1.8) + 32.0
    rh = relative_humidity_pct

    # Step 1: Steadman simplified equation
    hi_f = 0.5 * (tf + 61.0 + ((tf - 68.0) * 1.2) + (rh * 0.094))

    # If average of HI and T is >= 80°F, apply full Rothfusz polynomial
    if (hi_f + tf) / 2.0 >= 80.0:
        hi_f = (
            -42.379
            + (2.04901523 * tf)
            + (10.14333127 * rh)
            - (0.22475541 * tf * rh)
            - (0.00683783 * (tf ** 2))
            - (0.05481717 * (rh ** 2))
            + (0.00122874 * (tf ** 2) * rh)
            + (0.00085282 * tf * (rh ** 2))
            - (0.00000199 * (tf ** 2) * (rh ** 2))
        )

        # Adjustment 1: Low relative humidity (< 13%) in warm air (80-112°F)
        if rh < 13.0 and 80.0 <= tf <= 112.0:
            adjustment = ((13.0 - rh) / 4.0) * math.sqrt((17.0 - abs(tf - 95.0)) / 17.0)
            hi_f -= adjustment

        # Adjustment 2: High relative humidity (> 85%) in moderately warm air (80-87°F)
        elif rh > 85.0 and 80.0 <= tf <= 87.0:
            adjustment = ((rh - 85.0) / 10.0) * ((87.0 - tf) / 5.0)
            hi_f += adjustment

    # Convert back to Celsius
    hi_c = (hi_f - 32.0) / 1.8
    return hi_c


def calculate_apparent_temperature(
    temperature_c: float,
    relative_humidity_pct: float,
    wind_speed_mps: float = 1.0
) -> float:
    """
    Calculates Australian Bureau of Meteorology Apparent Temperature (AT) in °C.
    
    Formula:
      AT = Ta + 0.33 * e - 0.70 * v - 4.00
    where:
      Ta = Dry-bulb air temperature (°C)
      e  = Water vapor pressure (hPa)
      v  = Wind speed at 10m / 2m (m/s)
    """
    e = calculate_vapor_pressure(temperature_c, relative_humidity_pct)
    at = temperature_c + (0.33 * e) - (0.70 * wind_speed_mps) - 4.00
    return at


def compute_all_indices(weather: WeatherInput) -> ThermalIndices:
    """
    High-level dispatcher computing all biometeorological indices from validated weather input.
    """
    wbgt = calculate_wbgt(
        temperature_c=weather.temperature,
        relative_humidity_pct=weather.relative_humidity,
        wind_speed_mps=weather.wind_speed,
        solar_radiation_wm2=weather.solar_radiation,
    )
    hi = calculate_heat_index(
        temperature_c=weather.temperature,
        relative_humidity_pct=weather.relative_humidity,
    )
    at = calculate_apparent_temperature(
        temperature_c=weather.temperature,
        relative_humidity_pct=weather.relative_humidity,
        wind_speed_mps=weather.wind_speed,
    )
    tw = calculate_stull_wet_bulb(
        temperature_c=weather.temperature,
        relative_humidity_pct=weather.relative_humidity,
    )

    return ThermalIndices(
        wbgt_c=wbgt,
        heat_index_c=hi,
        apparent_temperature_c=at,
        wet_bulb_temp_c=tw,
    )
