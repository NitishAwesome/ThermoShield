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
from thermal_stress import analyze_thermal_stress, ThermalStressResult

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
        "title": "Scenario 4: Severe Heatwave Emergency (Extreme Thermal Stress)",
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
    hydration = result.hydration
    activity = result.activity_guidance
    vulnerable = result.vulnerable_population

    alert_badges = {
        "GREEN": "[GREEN - LOW RISK]",
        "YELLOW": "[YELLOW - MODERATE RISK]",
        "ORANGE": "[ORANGE - HIGH RISK]",
        "RED": "[RED - EXTREME RISK]",
    }

    if idx.heat_index_c is not None:
        hi_display = f"{idx.heat_index_c:.1f} C"
    elif idx.heat_index_status == "NOT_APPLICABLE_COOL":
        hi_display = "N/A (<20 C Cool Weather)"
    else:
        hi_display = "N/A (outside validated range)"

    print("\n" + "=" * 72)
    print("  THERMOSHIELD -- HUMAN THERMAL STRESS ENGINE (SIH 2026)")
    print("=" * 72)
    print(f"  Scenario : {scenario.get('title', 'Custom Evaluation')}")
    print(f"  Location : {scenario.get('location', 'Live Sensor Stream')}")
    print("-" * 72)
    print("  METEOROLOGICAL INPUTS:")
    print(f"   * Ambient Temperature : {summary['temperature_c']} C")
    print(f"   * Relative Humidity   : {summary['relative_humidity_pct']} %")
    print(f"   * Wind Speed (10m/2m) : {summary['wind_speed_mps']} m/s")
    solar_str = f"{summary['solar_radiation_wm2']} W/m2" if summary['solar_radiation_wm2'] else "None (Shaded/Indoor)"
    print(f"   * Solar Radiation     : {solar_str}")
    print("-" * 72)
    print("  1. THERMAL INDICES:")
    print(f"   * Estimated WBGT (weather)   : {idx.wbgt_c:.1f} C  [PRIMARY THERMAL-STRESS INDEX]")
    print(f"   * NOAA Heat Index (HI)       : {hi_display}")
    print(f"   * Australian Apparent Temp   : {idx.apparent_temperature_c:.1f} C")
    print(f"   * Stull Natural Wet-Bulb (Tw): {idx.wet_bulb_temp_c:.1f} C")
    print("-" * 72)
    print("  2. RISK CLASSIFICATION:")
    print(f"   * Severity Badge             : {alert_badges.get(risk.alert_category, risk.level)}")
    print(f"   * Risk Level                 : {risk.level}")
    print(f"   * Thermal Stress Risk Score  : {risk.score:.2f} / 1.00 (Normalized Severity Index)")
    print(f"   * Primary Signal             : {risk.primary_index}")
    print(f"   * Diagnostic Reason          : {risk.reason}")
    print("-" * 72)
    print("  3. WHY? (EXPLAINABILITY):")
    print("   * Risk Basis:")
    for rb in risk.risk_basis:
        print(f"     > {rb}")
    if risk.environmental_factors:
        print("   * Environmental Factors:")
        for ef in risk.environmental_factors:
            print(f"     - {ef}")
    print("-" * 72)
    print("  4. WHAT SHOULD PEOPLE DO? (ACTIONABLE GUIDANCE):")
    if hydration:
        print(f"   * Hydration [Priority: {hydration.priority}] (Basis: {hydration.basis}):")
        if hydration.approximate_amount_ml:
            print(f"     - Interval & Amount : ~{hydration.approximate_amount_ml} mL ({hydration.recommended_interval})")
        else:
            print(f"     - Recommended Pacing: {hydration.recommended_interval}")
        print(f"     - Electrolytes      : {'Recommended for prolonged sweating' if hydration.electrolytes_recommended else 'Standard water sufficient'}")
        print(f"     - Detailed Guidance : {hydration.guidance}")
    if activity:
        print("   * Activity & Work Guidance:")
        print(f"     - Outdoor Activity  : {activity.outdoor_activity}")
        print(f"     - Heavy Labor Pacing: {activity.heavy_physical_work}")
        print(f"     - Rest & Cooling    : {activity.rest_guidance}")
        print(f"     - Peak Heat Hours   : {activity.peak_heat_hours}")
    if vulnerable:
        print(f"   * Vulnerable Populations [Priority: {'HIGH' if vulnerable.priority else 'Routine'}]:")
        print(f"     - Target Groups     : {', '.join(vulnerable.groups)}")
        print(f"     - Safety Directive  : {vulnerable.guidance}")
    print("=" * 72)


def run_all_scenarios() -> None:
    """Executes the complete preset suite of 4 biometeorological scenarios."""
    print("\n" + "=" * 72)
    print("  RUNNING THERMOSHIELD THERMAL STRESS PROTOTYPE DEMONSTRATION")
    print("  Author: Nitish (Thermal Stress Module Lead)")
    print("=" * 72)

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
