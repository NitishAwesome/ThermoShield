"""
backend/thermal_stress/demo_runner.py

Interactive & Presentation Demo Runner for SIH 2026 Evaluation.
Problem Statement: SIH26083 — Extreme Heatwave Early Warning and Human Thermal Stress Index
Module: Human Thermal Stress (Nitish)

Run standalone via:
  python -m backend.thermal_stress.demo_runner
"""

import sys
import json
import argparse
from typing import Dict, Any, List
from backend.thermal_stress import analyze_thermal_stress, ThermalStressResult

# Ensure safe encoding for Windows PowerShell / CMD
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


DEMO_SCENARIOS = [
    {
        "title": "Scenario 1: Pleasant Day (Normal Baseline)",
        "location": "Bengaluru Urban",
        "temp": 26.0,
        "humidity": 45.0,
        "wind": 3.5,
        "solar": 350.0,
    },
    {
        "title": "Scenario 2: Dry Summer Afternoon (Moderate Thermal Stress)",
        "location": "Jaipur City Center",
        "temp": 34.0,
        "humidity": 35.0,
        "wind": 2.2,
        "solar": 550.0,
    },
    {
        "title": "Scenario 3: Coastal Humid Heat (High Thermal Stress)",
        "location": "Mumbai Coastal Ward",
        "temp": 36.0,
        "humidity": 60.0,
        "wind": 2.0,
        "solar": 600.0,
    },
    {
        "title": "Scenario 4: Severe Heatwave Emergency (Extreme Red Alert)",
        "location": "Delhi NCR / Vidarbha Region",
        "temp": 45.0,
        "humidity": 58.0,
        "wind": 0.9,
        "solar": 950.0,
    },
]


def print_scenario_card(scenario: Dict[str, Any], result: ThermalStressResult) -> None:
    """Formats and prints a presentation-friendly terminal card for jury demonstration."""
    idx = result.indices
    risk = result.risk_assessment
    summary = result.input_summary

    alert_badges = {
        "GREEN": "[GREEN ALERT - NORMAL]",
        "YELLOW": "[YELLOW ALERT - CAUTION]",
        "ORANGE": "[ORANGE ALERT - SEVERE]",
        "RED": "[RED ALERT - EXTREME CRISIS]",
    }

    print("\n" + "=" * 68)
    print("  THERMOSHIELD -- HUMAN THERMAL STRESS ENGINE (SIH 2026)")
    print("=" * 68)
    print(f"  Scenario : {scenario.get('title', 'Custom Evaluation')}")
    print(f"  Location : {scenario.get('location', 'Live Sensor Stream')}")
    print("-" * 68)
    print("  METEOROLOGICAL INPUTS:")
    print(f"   * Ambient Temperature : {summary['temperature_c']} C")
    print(f"   * Relative Humidity   : {summary['relative_humidity_pct']} %")
    print(f"   * Wind Speed (10m/2m) : {summary['wind_speed_mps']} m/s")
    solar_str = f"{summary['solar_radiation_wm2']} W/m2" if summary['solar_radiation_wm2'] else "None (Shaded/Indoor)"
    print(f"   * Solar Radiation     : {solar_str}")
    print("-" * 68)
    print("  COMPUTED BIOMETEOROLOGICAL INDICES:")
    print(f"   * WBGT (Wet-Bulb Globe Temp) : {idx.wbgt_c:.1f} C  [Primary Gold Standard]")
    print(f"   * NOAA Heat Index (HI)       : {idx.heat_index_c:.1f} C")
    print(f"   * Australian Apparent Temp   : {idx.apparent_temperature_c:.1f} C")
    print(f"   * Stull Natural Wet-Bulb (Tw): {idx.wet_bulb_temp_c:.1f} C")
    print("-" * 68)
    print("  RISK ASSESSMENT & CLASSIFICATION:")
    print(f"   * Status              : {alert_badges.get(risk.alert_category, risk.level)}")
    print(f"   * Risk Level          : {risk.level}")
    print(f"   * Risk Score          : {risk.score:.2f} / 1.00")
    print(f"   * Primary Signal      : {risk.primary_index}")
    print(f"   * Diagnostic Reason   : {risk.reason}")
    print("-" * 68)
    print("  ACTIONABLE CIVIC & HEALTH ADVISORIES:")
    for advisory in result.advisories[:4]:
        print(f"   - {advisory}")
    print("=" * 68)


def run_all_scenarios() -> None:
    """Executes the complete preset suite of 4 biometeorological scenarios."""
    print("\n" + "=" * 68)
    print("  RUNNING THERMOSHIELD THERMAL STRESS PROTOTYPE DEMONSTRATION")
    print("  Author: Nitish (Thermal Stress Module Lead)")
    print("=" * 68)

    for scenario in DEMO_SCENARIOS:
        result = analyze_thermal_stress(
            temperature=scenario["temp"],
            relative_humidity=scenario["humidity"],
            wind_speed=scenario["wind"],
            solar_radiation=scenario["solar"],
        )
        print_scenario_card(scenario, result)

    print("\n[OK] All 4 demonstration scenarios processed successfully!\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ThermoShield Human Thermal Stress Engine Demo (SIH 2026 - Nitish)"
    )
    parser.add_argument("--temp", type=float, help="Ambient temperature in C")
    parser.add_argument("--humidity", type=float, help="Relative humidity in % (0-100)")
    parser.add_argument("--wind", type=float, default=1.0, help="Wind speed in m/s (default: 1.0)")
    parser.add_argument("--solar", type=float, default=None, help="Solar radiation in W/m2 (optional)")
    parser.add_argument("--json", action="store_true", help="Output raw JSON response for API preview")

    args = parser.parse_args()

    # Custom single evaluation mode
    if args.temp is not None and args.humidity is not None:
        result = analyze_thermal_stress(
            temperature=args.temp,
            relative_humidity=args.humidity,
            wind_speed=args.wind,
            solar_radiation=args.solar,
        )

        if args.json:
            print(json.dumps(result.to_dict(), indent=2))
        else:
            custom_scenario = {
                "title": "Custom User Input Evaluation",
                "location": "Custom Coordinates",
                "temp": args.temp,
                "humidity": args.humidity,
                "wind": args.wind,
                "solar": args.solar,
            }
            print_scenario_card(custom_scenario, result)
    else:
        # Default: Run full scenario demonstration suite
        run_all_scenarios()


if __name__ == "__main__":
    main()
