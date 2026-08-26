def calculate_heat_index(temp_c: float, humidity: float) -> float:
    """
    Calculate Heat Index using temperature in Celsius
    and relative humidity in percentage.
    """

    temp_f = (temp_c * 9 / 5) + 32

    # Simple approximation for lower temperatures
    if temp_f < 80:
        return temp_c

    hi_f = (
        -42.379
        + 2.04901523 * temp_f
        + 10.14333127 * humidity
        - 0.22475541 * temp_f * humidity
        - 0.00683783 * temp_f**2
        - 0.05481717 * humidity**2
        + 0.00122874 * temp_f**2 * humidity
        + 0.00085282 * temp_f * humidity**2
        - 0.00000199 * temp_f**2 * humidity**2
    )

    return round((hi_f - 32) * 5 / 9, 2)


def classify_heat_stress(heat_index: float) -> str:

    if heat_index < 27:
        return "LOW"

    if heat_index < 32:
        return "MODERATE"

    if heat_index < 41:
        return "HIGH"

    return "CRITICAL"