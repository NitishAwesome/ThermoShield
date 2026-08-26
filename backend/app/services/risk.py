def predict_risk(
    temperature: float,
    humidity: float,
    wind_speed: float,
    heat_index: float
):
    # Temporary integration placeholder.
    # Replace this with the actual ML model.

    score = min(
        100,
        max(
            0,
            (temperature - 20) * 2
            + humidity * 0.3
            + heat_index * 0.5
            - wind_speed * 0.2
        )
    )

    score = round(score, 2)

    if score >= 75:
        level = "CRITICAL"
    elif score >= 50:
        level = "HIGH"
    elif score >= 25:
        level = "MODERATE"
    else:
        level = "LOW"

    return score, level