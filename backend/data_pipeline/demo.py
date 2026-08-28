from __future__ import annotations

import json

from .pipeline import get_weather_payload, load_sample_weather_records


if __name__ == "__main__":
    print("All sample records:\n")
    print(json.dumps(load_sample_weather_records(), indent=2, ensure_ascii=False))
    print("\nSelected record (Chennai, Tamil Nadu / Ward-50):\n")
    payload = get_weather_payload("Chennai, Tamil Nadu", "Ward-50")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
