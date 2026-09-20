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
from thermal_stress.models import WeatherInput, ThermalIndices


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

    utci = calculate_utci(
        temperature_c=weather.temperature,
        relative_humidity_pct=weather.relative_humidity,
        wind_speed_mps=weather.wind_speed,
        solar_radiation_wm2=weather.solar_radiation,
    )
    utci_cat = get_utci_stress_category(utci)

    return ThermalIndices(
        wbgt_c=wbgt,
        heat_index_c=hi,
        apparent_temperature_c=at,
        wet_bulb_temp_c=tw,
        heat_index_status=hi_status,
        utci_c=utci,
        utci_category=utci_cat,
    )


# ---------------------------------------------------------------------------
# Universal Thermal Climate Index (UTCI)
# Bröde P, Fiala D, Błażejczyk K et al. (2012)
# "Deriving the operational procedure for the Universal Thermal Climate Index (UTCI)"
# Int J Biometeorol 56(3):481-494. doi:10.1007/s00484-011-0454-1
#
# This is the published polynomial regression approximation (version a 0.002, 2009).
# Input ranges:  Ta -50..50 °C,  va 0.5..17 m/s,  D_Tmrt -30..70 K
# Output:        UTCI equivalent temperature in °C
# ---------------------------------------------------------------------------

def calculate_mean_radiant_temperature(
    temperature_c: float,
    solar_radiation_wm2: Optional[float] = None,
    wind_speed_mps: float = 1.0,
) -> float:
    """
    Estimates Mean Radiant Temperature (MRT, Tr) from ambient temperature and
    solar irradiance using a simplified globe-thermometer approximation.

    Reference:
      ISO 7726:1998 — Ergonomics of the thermal environment
    """
    if solar_radiation_wm2 is None or solar_radiation_wm2 <= 0.0:
        return temperature_c
    effective_wind = max(wind_speed_mps, 0.5)
    # Approximation of black-globe temperature elevation from solar load
    tg = temperature_c + (solar_radiation_wm2 / 100.0) / math.sqrt(effective_wind)
    # Simplified MRT from globe temperature (globe diam. 0.15 m, emissivity 0.95)
    mrt = (
        (tg + 273.0) ** 4
        + 1.1e8 * (effective_wind ** 0.6) / (0.95 * 0.15 ** 0.4)
        * (tg - temperature_c)
    ) ** 0.25 - 273.0
    return max(temperature_c, mrt)


def calculate_utci(
    temperature_c: float,
    relative_humidity_pct: float,
    wind_speed_mps: float = 1.0,
    solar_radiation_wm2: Optional[float] = None,
) -> float:
    """
    Calculates the Universal Thermal Climate Index (UTCI) in °C.

    Uses the published Bröde et al. (2012) 6th-order polynomial regression
    approximation (fiala2009 model output; valid for Ta -50..50 °C, va 0.5..17 m/s).

    Args:
        temperature_c:        Air temperature (°C)
        relative_humidity_pct: Relative humidity (%)
        wind_speed_mps:       10-m wind speed (m/s)
        solar_radiation_wm2:  Solar irradiance (W/m²), used to estimate MRT

    Returns:
        UTCI equivalent temperature (°C)
    """
    ta = temperature_c
    # Clamp wind speed to valid polynomial domain
    va = max(0.5, min(17.0, wind_speed_mps))

    # Estimate mean radiant temperature
    tr = calculate_mean_radiant_temperature(ta, solar_radiation_wm2, va)
    d_tmrt = tr - ta  # radiant heat deviation from air temperature

    # Vapour pressure (Pa) from RH and saturation pressure (Magnus formula)
    es = 6.105 * math.exp(17.27 * ta / (237.7 + ta))  # hPa
    pa = (relative_humidity_pct / 100.0) * es / 10.0  # kPa

    # Bröde 2012 polynomial regression coefficients
    utci = (
        ta
        + 0.607562052
        + -0.0227712343 * ta
        + 8.06470461e-4 * ta * ta
        + -1.54271372e-4 * ta * ta * ta
        + -3.24651735e-6 * ta * ta * ta * ta
        + 7.32602852e-8 * ta * ta * ta * ta * ta
        + 1.35959073e-9 * ta * ta * ta * ta * ta * ta
        + -2.25836520 * va
        + 0.0880326035 * ta * va
        + 0.00216844454 * ta * ta * va
        + -1.53347087e-5 * ta * ta * ta * va
        + -5.72983704e-7 * ta * ta * ta * ta * va
        + -2.55090145e-9 * ta * ta * ta * ta * ta * va
        + -0.751269505 * va * va
        + -0.00408350271 * ta * va * va
        + -5.21670675e-5 * ta * ta * va * va
        + 1.94544667e-6 * ta * ta * ta * va * va
        + 1.14099205e-8 * ta * ta * ta * ta * va * va
        + 0.158137256 * va * va * va
        + -6.57263143e-4 * ta * va * va * va
        + 2.22697524e-7 * ta * ta * va * va * va
        + -4.16117031e-8 * ta * ta * ta * va * va * va
        + -0.0127762753 * va * va * va * va
        + 9.66891875e-6 * ta * va * va * va * va
        + 2.52785852e-9 * ta * ta * va * va * va * va
        + 4.56306672e-4 * va * va * va * va * va
        + -1.74202546e-7 * ta * va * va * va * va * va
        + -5.91491269e-6 * va * va * va * va * va * va
        + 0.398374029 * d_tmrt
        + 1.83945314e-4 * ta * d_tmrt
        + -1.73754510e-4 * ta * ta * d_tmrt
        + -7.60781159e-7 * ta * ta * ta * d_tmrt
        + 3.77830287e-8 * ta * ta * ta * ta * d_tmrt
        + 5.43079673e-10 * ta * ta * ta * ta * ta * d_tmrt
        + -0.0200518269 * va * d_tmrt
        + 8.92859837e-4 * ta * va * d_tmrt
        + 3.45433048e-6 * ta * ta * va * d_tmrt
        + -3.77925774e-7 * ta * ta * ta * va * d_tmrt
        + -1.69699377e-9 * ta * ta * ta * ta * va * d_tmrt
        + 1.69992415e-4 * va * va * d_tmrt
        + -4.99204314e-5 * ta * va * va * d_tmrt
        + 2.47417178e-7 * ta * ta * va * va * d_tmrt
        + 1.07596466e-8 * ta * ta * ta * va * va * d_tmrt
        + 8.49242932e-5 * va * va * va * d_tmrt
        + 1.35191328e-6 * ta * va * va * va * d_tmrt
        + -6.21531254e-9 * ta * ta * va * va * va * d_tmrt
        + -4.99410301e-6 * va * va * va * va * d_tmrt
        + -1.89489258e-8 * ta * va * va * va * va * d_tmrt
        + 8.15300114e-8 * va * va * va * va * va * d_tmrt
        + 7.55043090e-4 * d_tmrt * d_tmrt
        + -5.65095215e-5 * ta * d_tmrt * d_tmrt
        + -4.52166564e-7 * ta * ta * d_tmrt * d_tmrt
        + 2.46688878e-8 * ta * ta * ta * d_tmrt * d_tmrt
        + 2.42674348e-10 * ta * ta * ta * ta * d_tmrt * d_tmrt
        + 1.54547250e-4 * va * d_tmrt * d_tmrt
        + 5.24110970e-6 * ta * va * d_tmrt * d_tmrt
        + -8.75874982e-8 * ta * ta * va * d_tmrt * d_tmrt
        + -1.50743064e-9 * ta * ta * ta * va * d_tmrt * d_tmrt
        + -1.56236307e-5 * va * va * d_tmrt * d_tmrt
        + -1.33895614e-7 * ta * va * va * d_tmrt * d_tmrt
        + 2.49709824e-9 * ta * ta * va * va * d_tmrt * d_tmrt
        + 6.51711721e-7 * va * va * va * d_tmrt * d_tmrt
        + 1.94960053e-9 * ta * va * va * va * d_tmrt * d_tmrt
        + -1.00361113e-8 * va * va * va * va * d_tmrt * d_tmrt
        + -1.21206673e-5 * d_tmrt * d_tmrt * d_tmrt
        + -2.18203660e-7 * ta * d_tmrt * d_tmrt * d_tmrt
        + 7.51269482e-9 * ta * ta * d_tmrt * d_tmrt * d_tmrt
        + 9.79063848e-11 * ta * ta * ta * d_tmrt * d_tmrt * d_tmrt
        + 1.25433213e-6 * va * d_tmrt * d_tmrt * d_tmrt
        + -6.41256415e-9 * ta * va * d_tmrt * d_tmrt * d_tmrt
        + 1.83477160e-10 * ta * ta * va * d_tmrt * d_tmrt * d_tmrt
        + 4.44902491e-9 * va * va * d_tmrt * d_tmrt * d_tmrt
        + -1.61776351e-11 * ta * va * va * d_tmrt * d_tmrt * d_tmrt
        + -1.57895386e-9 * va * va * va * d_tmrt * d_tmrt * d_tmrt
        + 3.01831167e-9 * d_tmrt * d_tmrt * d_tmrt * d_tmrt
        + 2.28980908e-11 * ta * d_tmrt * d_tmrt * d_tmrt * d_tmrt
        + -4.27545630e-11 * va * d_tmrt * d_tmrt * d_tmrt * d_tmrt
        + -9.27495490e-12 * d_tmrt * d_tmrt * d_tmrt * d_tmrt * d_tmrt
        + 0.00527326289 * pa
        + -3.61079300e-5 * ta * pa
        + 1.23010531e-4 * ta * ta * pa
        + -2.00556900e-6 * ta * ta * ta * pa
        + -4.89135821e-9 * ta * ta * ta * ta * pa
        + -0.0155797523 * va * pa
        + -4.28216997e-4 * ta * va * pa
        + -3.08476009e-6 * ta * ta * va * pa
        + 1.09587564e-7 * ta * ta * ta * va * pa
        + 2.19800046e-9 * ta * ta * ta * ta * va * pa
        + 8.05695028e-5 * va * va * pa
        + -9.16458527e-6 * ta * va * va * pa
        + -5.48487120e-8 * ta * ta * va * va * pa
        + -4.01105061e-9 * ta * ta * ta * va * va * pa
        + -1.26431552e-5 * va * va * va * pa
        + 3.79765640e-7 * ta * va * va * va * pa
        + 6.62367819e-9 * ta * ta * va * va * va * pa
        + 3.67365899e-8 * va * va * va * va * pa
        + 2.34567029e-10 * ta * va * va * va * va * pa
        + -1.49130601e-8 * va * va * va * va * va * pa
        + -5.35078018e-5 * d_tmrt * pa
        + 1.14692250e-5 * ta * d_tmrt * pa
        + -1.85862048e-7 * ta * ta * d_tmrt * pa
        + -1.40572084e-8 * ta * ta * ta * d_tmrt * pa
        + 2.82573397e-11 * ta * ta * ta * ta * d_tmrt * pa
        + 6.53735543e-7 * va * d_tmrt * pa
        + -3.51675925e-9 * ta * va * d_tmrt * pa
        + -3.08018520e-10 * ta * ta * va * d_tmrt * pa
        + 9.62338948e-11 * ta * ta * ta * va * d_tmrt * pa
        + -1.33550029e-8 * va * va * d_tmrt * pa
        + 1.00764633e-9 * ta * va * va * d_tmrt * pa
        + 4.56280499e-12 * ta * ta * va * va * d_tmrt * pa
        + 7.00369899e-10 * va * va * va * d_tmrt * pa
        + -5.73992413e-12 * ta * va * va * va * d_tmrt * pa
        + -2.97872524e-12 * va * va * va * va * d_tmrt * pa
        + -3.69015720e-10 * d_tmrt * d_tmrt * pa
        + 7.25043166e-11 * ta * d_tmrt * d_tmrt * pa
        + 1.33452438e-12 * ta * ta * d_tmrt * d_tmrt * pa
        + 1.14768972e-11 * va * d_tmrt * d_tmrt * pa
        + -2.52806414e-13 * ta * va * d_tmrt * d_tmrt * pa
        + -5.36199547e-14 * va * va * d_tmrt * d_tmrt * pa
        + 1.47383451e-12 * d_tmrt * d_tmrt * d_tmrt * pa
        + 1.43803585e-14 * ta * d_tmrt * d_tmrt * d_tmrt * pa
        + 2.45206736e-15 * va * d_tmrt * d_tmrt * d_tmrt * pa
        + -1.15993600e-14 * d_tmrt * d_tmrt * d_tmrt * d_tmrt * pa
        + 2.94976619e-4 * pa * pa
        + -4.89280064e-5 * ta * pa * pa
        + 4.40997890e-7 * ta * ta * pa * pa
        + -3.42613381e-9 * ta * ta * ta * pa * pa
        + -3.90567526e-11 * ta * ta * ta * ta * pa * pa
        + 5.35428022e-5 * va * pa * pa
        + 1.44507023e-6 * ta * va * pa * pa
        + -4.68693760e-8 * ta * ta * va * pa * pa
        + -2.46406105e-10 * ta * ta * ta * va * pa * pa
        + 3.53878218e-6 * va * va * pa * pa
        + 3.36132820e-8 * ta * va * va * pa * pa
        + 7.94164831e-10 * ta * ta * va * va * pa * pa
        + 8.69820303e-9 * va * va * va * pa * pa
        + 3.03614700e-11 * ta * va * va * va * pa * pa
        + -9.92633637e-11 * va * va * va * va * pa * pa
        + -1.64703462e-5 * d_tmrt * pa * pa
        + -4.67016765e-8 * ta * d_tmrt * pa * pa
        + -6.76838005e-10 * ta * ta * d_tmrt * pa * pa
        + 4.35292560e-12 * ta * ta * ta * d_tmrt * pa * pa
        + 4.74445764e-8 * va * d_tmrt * pa * pa
        + 3.65568598e-10 * ta * va * d_tmrt * pa * pa
        + 5.46143640e-12 * ta * ta * va * d_tmrt * pa * pa
        + -2.32861484e-11 * va * va * d_tmrt * pa * pa
        + -1.91379055e-11 * ta * va * va * d_tmrt * pa * pa
        + 4.80297803e-12 * va * va * va * d_tmrt * pa * pa
        + 2.22505670e-11 * d_tmrt * d_tmrt * pa * pa
        + -3.43874506e-13 * ta * d_tmrt * d_tmrt * pa * pa
        + -3.38400643e-13 * va * d_tmrt * d_tmrt * pa * pa
        + 3.33490659e-14 * d_tmrt * d_tmrt * d_tmrt * pa * pa
        + 8.28880030e-9 * pa * pa * pa
        + 1.74012345e-7 * ta * pa * pa * pa
        + 3.70423600e-10 * ta * ta * pa * pa * pa
        + 1.52529570e-11 * ta * ta * ta * pa * pa * pa
        + 1.49914983e-9 * va * pa * pa * pa
        + -1.19099622e-11 * ta * va * pa * pa * pa
        + -5.00802755e-14 * ta * ta * va * pa * pa * pa
        + -4.62788572e-11 * va * va * pa * pa * pa
        + 1.00010547e-12 * ta * va * va * pa * pa * pa
        + -7.94622745e-12 * va * va * va * pa * pa * pa
        + -5.97176999e-12 * d_tmrt * pa * pa * pa
        + -7.04193607e-13 * ta * d_tmrt * pa * pa * pa
        + 7.26998773e-15 * ta * ta * d_tmrt * pa * pa * pa
        + 5.25034617e-13 * va * d_tmrt * pa * pa * pa
        + -7.91838390e-16 * ta * va * d_tmrt * pa * pa * pa
        + -6.68481760e-14 * va * va * d_tmrt * pa * pa * pa
        + 1.70735064e-14 * d_tmrt * d_tmrt * pa * pa * pa
        + 3.99320380e-17 * ta * d_tmrt * d_tmrt * pa * pa * pa
        + 1.08285330e-14 * va * d_tmrt * d_tmrt * pa * pa * pa
        + -1.49267696e-15 * d_tmrt * d_tmrt * d_tmrt * pa * pa * pa
        + 3.29544573e-11 * pa * pa * pa * pa
        + -6.62975008e-13 * ta * pa * pa * pa * pa
        + 2.06744087e-15 * ta * ta * pa * pa * pa * pa
        + -2.39784548e-16 * ta * ta * ta * pa * pa * pa * pa
        + -9.76721539e-13 * va * pa * pa * pa * pa
        + -7.35403030e-15 * ta * va * pa * pa * pa * pa
        + -1.12803628e-14 * ta * ta * va * pa * pa * pa * pa
        + 2.06090613e-14 * va * va * pa * pa * pa * pa
        + -5.24472371e-16 * ta * va * va * pa * pa * pa * pa
        + 7.52308048e-16 * va * va * va * pa * pa * pa * pa
        + -1.04452774e-15 * d_tmrt * pa * pa * pa * pa
        + 7.67264553e-17 * ta * d_tmrt * pa * pa * pa * pa
        + -1.18938781e-16 * va * d_tmrt * pa * pa * pa * pa
        + 3.55589436e-17 * d_tmrt * d_tmrt * pa * pa * pa * pa
        + -1.52447039e-17 * pa * pa * pa * pa * pa
    )
    return round(utci, 1)


def get_utci_stress_category(utci_c: float) -> str:
    """
    Returns the ISO 15743 / UTCI 10-level thermal stress category.

    Reference:
      Bröde P et al. (2012) Table 1 — UTCI assessment scale.
    """
    if utci_c < -40:
        return "Extreme cold stress"
    elif utci_c < -27:
        return "Very strong cold stress"
    elif utci_c < -13:
        return "Strong cold stress"
    elif utci_c < 0:
        return "Moderate cold stress"
    elif utci_c < 9:
        return "Slight cold stress"
    elif utci_c < 26:
        return "No thermal stress"
    elif utci_c < 32:
        return "Moderate heat stress"
    elif utci_c < 38:
        return "Strong heat stress"
    elif utci_c < 46:
        return "Very strong heat stress"
    else:
        return "Extreme heat stress"

