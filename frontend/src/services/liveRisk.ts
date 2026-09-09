import { doc, onSnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "../firebase/config";

export interface LiveRisk {
  location: string;
  risk_score: number;
  risk_level: string;
  thermal_risk_level: string;
  status: string;
}

export function subscribeToLiveRisk(
  locationId: string,
  onUpdate: (risk: LiveRisk | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const riskRef = doc(db, "live_risks", locationId);

  return onSnapshot(
    riskRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }

      onUpdate(snapshot.data() as LiveRisk);
    },
    (error) => {
      onError?.(error);
    },
  );
}