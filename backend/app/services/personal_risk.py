from typing import List


def calculate_personal_risk(
    age: int,
    smoking: bool,
    health_conditions: List[str],
    physical_activity: str,
):
    score = 0

    # Age factor
    if age >= 65:
        score += 25
    elif age >= 50:
        score += 15
    elif age >= 35:
        score += 8

    # Smoking factor
    if smoking:
        score += 15

    # Health conditions
    condition_weights = {
        "heart_disease": 20,
        "asthma": 15,
        "diabetes": 15,
        "kidney_disease": 20,
    }

    for condition in health_conditions:
        score += condition_weights.get(condition.lower(), 5)

    # Physical activity / heat exposure factor
    activity_weights = {
        "low": 5,
        "moderate": 10,
        "high": 15,
    }

    score += activity_weights.get(physical_activity.lower(), 10)

    # Limit score
    score = min(score, 100)

    # Risk level
    if score >= 70:
        risk_level = "EXTREME"
    elif score >= 50:
        risk_level = "HIGH"
    elif score >= 30:
        risk_level = "MODERATE"
    else:
        risk_level = "LOW"

    # Alert
    alerts = {
        "LOW": "Low personal heat-health risk. Continue normal precautions.",
        "MODERATE": "Moderate risk. Stay hydrated and avoid prolonged heat exposure.",
        "HIGH": "High risk. Limit outdoor exposure and take frequent cooling breaks.",
        "EXTREME": "Extreme risk. Avoid prolonged heat exposure and seek a cool environment.",
    }

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "alert": alerts[risk_level],
    }