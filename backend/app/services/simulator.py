def simulate_intervention(
    risk_score: float,
    cooling_center: bool = False,
    outdoor_work_restriction: bool = False,
    hydration_stations: bool = False
):
    reduction = 0

    if cooling_center:
        reduction += 10

    if outdoor_work_restriction:
        reduction += 15

    if hydration_stations:
        reduction += 8

    projected_risk = max(0, risk_score - reduction)

    if projected_risk >= 75:
        level = "CRITICAL"
    elif projected_risk >= 50:
        level = "HIGH"
    elif projected_risk >= 25:
        level = "MODERATE"
    else:
        level = "LOW"

    return {
        "current_risk": risk_score,
        "projected_risk": round(projected_risk, 2),
        "risk_reduction": round(
            risk_score - projected_risk, 2
        ),
        "projected_level": level
    }