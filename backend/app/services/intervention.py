def generate_interventions(
    risk_score: float,
    temperature: float,
    humidity: float,
    hour: int,
    vulnerable_population: float = 0
):
    recommendations = []

    # Heat severity
    if risk_score >= 75:
        recommendations.append("Issue critical heat-health alert")
        recommendations.append("Activate cooling centres")

    elif risk_score >= 50:
        recommendations.append("Issue high heat-health warning")
        recommendations.append("Increase hydration facilities")

    elif risk_score >= 25:
        recommendations.append("Increase hydration and rest breaks")

    else:
        recommendations.append("Maintain normal heat-safety precautions")

    # Temperature
    if temperature >= 40:
        recommendations.append(
            "Avoid non-essential outdoor activities"
        )

    elif temperature >= 35:
        recommendations.append(
            "Limit prolonged outdoor exposure"
        )

    # Humidity
    if humidity >= 70:
        recommendations.append(
            "Increase hydration due to reduced evaporative cooling"
        )

    # Peak hours
    if 11 <= hour <= 16:
        recommendations.append(
            "Avoid outdoor exposure between 11 AM and 4 PM"
        )

    # Vulnerable population
    if vulnerable_population >= 0.30:
        recommendations.append(
            "Prioritize elderly and vulnerable populations"
        )

    return {
        "risk_score": risk_score,
        "priority": (
            "CRITICAL" if risk_score >= 75
            else "HIGH" if risk_score >= 50
            else "MODERATE" if risk_score >= 25
            else "LOW"
        ),
        "recommendations": recommendations
    }