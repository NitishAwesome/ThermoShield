"""Generate labelled synthetic CSV for exercising the SIH health import UI.

This is not medical evidence. Always select synthetic_demo when importing it.
Usage: python scripts/generate_demo_health_csv.py --output data/synthetic_demo_ward.csv
"""
import argparse
import csv
import math
from datetime import date, timedelta
from pathlib import Path
import numpy as np


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    rng = np.random.default_rng(26083)
    rows = []
    for i in range(180):
        temperature = 32 + 7 * math.sin(i * 0.35) + rng.uniform(0, 3)
        rows.append({"date": (date.today() - timedelta(days=180-i)).isoformat(), "population": 100000,
            "elderly_fraction": 0.12, "outdoor_worker_fraction": 0.28,
            "temperature_c": round(temperature, 1), "min_temperature_c": round(temperature - 8, 1),
            "humidity_pct": 60, "wind_speed_ms": 2, "solar_radiation_wm2": 700,
            "deaths": int(rng.poisson(3 + max(0, temperature - 33))),
            "admissions": int(rng.poisson(8 + max(0, temperature - 30) * 3))})
    # Refuse to overwrite an existing dataset.
    with args.output.open("x", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader(); writer.writerows(rows)
    print(f"SYNTHETIC DEMO ONLY: {args.output.resolve()}; select synthetic_demo in the import form.")


if __name__ == "__main__":
    main()
