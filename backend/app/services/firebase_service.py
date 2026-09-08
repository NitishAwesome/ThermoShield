import os
import firebase_admin
from firebase_admin import firestore


def get_firestore_client():
    """
    Initialize Firebase once and return a Firestore client.
    """

    if not firebase_admin._apps:
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

        if not credentials_path:
            raise RuntimeError(
                "GOOGLE_APPLICATION_CREDENTIALS is not configured."
            )

        firebase_admin.initialize_app()

    return firestore.client()


def get_live_risk(location_id: str):
    """
    Read a live risk document from Firestore.
    """

    db = get_firestore_client()

    document = (
        db.collection("live_risks")
        .document(location_id)
        .get()
    )

    if not document.exists:
        return None

    return document.to_dict()


def update_live_risk(
    location_id: str,
    location: str,
    risk_score: float,
    risk_level: str,
    thermal_risk_level: str,
    status: str = "ACTIVE",
):
    """
    Create or update a live risk document.
    """

    db = get_firestore_client()

    data = {
        "location": location,
        "risk_score": float(risk_score),
        "risk_level": risk_level,
        "thermal_risk_level": thermal_risk_level,
        "status": status,
    }

    (
        db.collection("live_risks")
        .document(location_id)
        .set(data, merge=True)
    )

    return data