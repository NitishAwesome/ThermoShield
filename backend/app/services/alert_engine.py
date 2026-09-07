def should_create_alert(risk_level: str) -> bool:
    """
    Decide whether a risk level requires a database alert entry.
    """

    return risk_level.upper().strip() in ["MODERATE", "HIGH", "EXTREME"]


def get_alert_priority(risk_level: str) -> str:
    """
    Determine alert priority from risk level.
    """

    if risk_level == "EXTREME":
        return "URGENT"

    if risk_level == "HIGH":
        return "HIGH"

    if risk_level == "MODERATE":
        return "MEDIUM"

    return "LOW"