import os
import logging

logger = logging.getLogger(__name__)

try:
    import firebase_admin
    from firebase_admin import firestore


    
    FIREBASE_AVAILABLE = True
except ImportError:
    firebase_admin = None
    firestore = None
    FIREBASE_AVAILABLE = False


def get_firestore_client():
    """
    Initialize Firebase once and return a Firestore client if available.
    """
    if not FIREBASE_AVAILABLE:
        return None

    if not firebase_admin._apps:
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

        if not credentials_path:
            return None

        try:
            firebase_admin.initialize_app()
        except Exception as e:
            logger.warning("Firebase initialization skipped: %s", e)
            return None

    try:
        return firestore.client()
    except Exception as e:
        logger.warning("Failed to obtain Firestore client: %s", e)
        return None


def get_live_risk(location_id: str):
    """
    Read a live risk document from Firestore.
    """
    db = get_firestore_client()
    if not db:
        return None

    try:
        document = (
            db.collection("live_risks")
            .document(location_id)
            .get()
        )

        if not document.exists:
            return None

        return document.to_dict()
    except Exception as e:
        logger.warning("Failed to fetch live risk from Firestore: %s", e)
        return None


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
    if not db:
        return None

    data = {
        "location": location,
        "risk_score": float(risk_score),
        "risk_level": risk_level,
        "thermal_risk_level": thermal_risk_level,
        "status": status,
    }

    try:
        (
            db.collection("live_risks")
            .document(location_id)
            .set(data, merge=True)
        )
    except Exception as e:
        logger.warning("Failed to write live risk to Firestore: %s", e)

    return data