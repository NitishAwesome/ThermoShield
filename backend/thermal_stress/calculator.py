"""
backend/thermal_stress/calculator.py

Core biometeorological mathematical calculations for Human Thermal Stress.
Implements standardized formulations for:
  1. Estimated Wet-Bulb Globe Temperature (WBGT) — Primary index (meteorological approximation)
  2. NOAA Heat Index (HI) — Secondary index (Rothfusz polynomial with domain validation)
  3. Apparent Temperature (AT) — Supporting index (Australian BOM / Steadman)
"""

import math
from typing import Optional, Tuple
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
    Calculates estimated natural wet-bulb temperature (Tw) in °C using Stull's empirical equation (2011).
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
    Calculates Estimated Wet-Bulb Globe Temperature (WBGT) in °C from meteorological data.
    
    Scientific Basis & Important Assumptions:
      - True physical WBGT requires direct measurements from specialized instruments:
        a natural wet-bulb thermometer, a 150mm black globe thermometer, and a dry-bulb thermometer.
      - This prototype estimates these physical components from standard ambient weather data:
        1. Natural wet-bulb (Tw) is estimated via Stull's empirical formulation (2011).
        2. Black globe temperature (Tg) under direct sunlight is approximated using incident
           solar irradiance (W/m²) and convective wind cooling (m/s).
        3. Indoor / Shade: WBGT = 0.7 * Tw + 0.3 * Ta
        4. Outdoor / Sun:   WBGT = 0.7 * Tw + 0.2 * Tg + 0.1 * Ta
      - Purpose: Suitable for high-level prototype screening and early warning,
        not a replacement for a physical calibrated WBGT instrument.
    """
    tw = calculate_stull_wet_bulb(temperature_c, relative_humidity_pct)
    ta = temperature_c

    # Indoor / Shaded Condition (no direct solar radiation load)
    if solar_radiation_wm2 is None or solar_radiation_wm2 <= 0.0:
        wbgt = 0.7 * tw + 0.3 * ta
        return wbgt

    # Outdoor / Direct Solar Radiation Condition
    # Wind speed minimum clamped to 0.5 m/s to prevent division by zero or unrealistic air stagnation
    effective_wind = max(wind_speed_mps, 0.5)
    # Radiative heat absorption model estimating black globe temperature from solar load & wind
    tg = ta + (solar_radiation_wm2 / 100.0) * (1.0 / math.sqrt(effective_wind))

    wbgt = 0.7 * tw + 0.2 * tg + 0.1 * ta
    return wbgt


def calculate_heat_index(temperature_c: float, relative_humidity_pct: float) -> Optional[float]:
    """
    Calculates NOAA/NWS Heat Index in °C with scientific domain validation.
    
    Scientific Basis & Domain Validity:
      - Uses the standard National Weather Service Rothfusz polynomial regression equation
        derived from Steadman's human biometeorological model.
      - Domain Constraints:
        1. Heat Index is only defined for warm/hot conditions (Ta >= 20°C / 68°F).
           If Ta < 20°C, heat stress is inactive and None is returned.
        2. The Rothfusz regression polynomial is only valid up to roughly HI ~ 55°C (~131°F)
           and Ta <= 50°C. When extrapolated to extreme heat and humidity co-occurrences
           (e.g., 45°C + 58% RH), the polynomial mathematically diverges to unphysical
           values (such as ~83°C).
        3. When conditions fall outside this validated domain, this function safely returns
           None instead of an unphysical mathematical artifact.
    """
    # 1. Low temperature cutoff (Heat Index not applicable in cool weather)
    if temperature_c < 20.0 or temperature_c > 50.0:
        return None

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

    # 2. Upper validity cutoff: If polynomial extrapolation produces unphysical runaway (> 55°C)
    if hi_c > 55.0:
        return None

    return hi_c


def get_heat_index_status(temperature_c: float, relative_humidity_pct: float) -> str:
    """
    Returns an operational status string for the NOAA Heat Index calculation:
      - "VALID": Within standard NOAA operational envelope
      - "NOT_APPLICABLE_COOL": Air temperature < 20°C (cool conditions)
      - "OUTSIDE_VALIDATED_RANGE": Extreme temperature/humidity exceeding Rothfusz polynomial validity
    """
    if temperature_c < 20.0:
        return "NOT_APPLICABLE_COOL"
    if temperature_c > 50.0:
        return "OUTSIDE_VALIDATED_RANGE"

    hi = calculate_heat_index(temperature_c, relative_humidity_pct)
    if hi is None:
        return "OUTSIDE_VALIDATED_RANGE"
    return "VALID"


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
    hi_status = get_heat_index_status(
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
        heat_index_status=hi_status,
    )
