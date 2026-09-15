import React, { createContext, useContext, useState } from 'react';
import { LocationItem } from '../types';

export interface LocationContextType {
  coords: { lat: number; lon: number };
  locationName: string;
  isLocating: boolean;
  setLocation: (loc: LocationItem) => void;
  setCoordsAndName: (coords: { lat: number; lon: number }, name: string) => void;
  detectMyLocation: () => void;
  
  // Location Change Monitoring & Confirmation
  hasLocationChangedPrompt: boolean;
  pendingDetectedLocation: { name: string; lat: number; lon: number } | null;
  confirmLocationUpdate: () => void;
  dismissLocationPrompt: (hours?: number) => void;
  checkLocationMismatch: () => void;
  simulateLocationChange: (cityName: string, lat: number, lon: number) => void;
}

const DEFAULT_COORDS = { lat: 19.076, lon: 72.8777 };
const DEFAULT_NAME = 'Mumbai, Maharashtra';
const STORAGE_KEY = 'thermoshield_active_location';
const PROMPT_DISMISSED_KEY = 'thermoshield_location_prompt_dismissed_until';

// Haversine distance in kilometers
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [coords, setCoords] = useState<{ lat: number; lon: number }>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          return { lat: parsed.lat, lon: parsed.lon };
        }
      }
    } catch (e) {
      console.warn('Failed to read location from sessionStorage', e);
    }
    return DEFAULT_COORDS;
  });

  const [locationName, setLocationName] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) return parsed.name;
      }
    } catch (e) {
      console.warn('Failed to read location name from sessionStorage', e);
    }
    return DEFAULT_NAME;
  });

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [hasLocationChangedPrompt, setHasLocationChangedPrompt] = useState<boolean>(false);
  const [pendingDetectedLocation, setPendingDetectedLocation] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(null);

  const persistLocation = (newCoords: { lat: number; lon: number }, name: string) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...newCoords, name }));
    } catch (e) {
      console.warn('Failed to persist location to sessionStorage', e);
    }
  };

  const setLocation = (loc: LocationItem) => {
    const newCoords = { lat: loc.latitude, lon: loc.longitude };
    setCoords(newCoords);
    setLocationName(loc.name);
    persistLocation(newCoords, loc.name);
    setHasLocationChangedPrompt(false);
    setPendingDetectedLocation(null);
  };

  const setCoordsAndName = (newCoords: { lat: number; lon: number }, name: string) => {
    setCoords(newCoords);
    setLocationName(name);
    persistLocation(newCoords, name);
    setHasLocationChangedPrompt(false);
    setPendingDetectedLocation(null);
  };

  const isPromptCooldownActive = (): boolean => {
    try {
      const dismissedUntilStr = localStorage.getItem(PROMPT_DISMISSED_KEY);
      if (dismissedUntilStr) {
        const dismissedUntil = parseInt(dismissedUntilStr, 10);
        if (Date.now() < dismissedUntil) {
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to read location prompt cooldown', e);
    }
    return false;
  };

  const dismissLocationPrompt = (hours: number = 24) => {
    setHasLocationChangedPrompt(false);
    setPendingDetectedLocation(null);
    try {
      const cooldownUntil = Date.now() + hours * 60 * 60 * 1000;
      localStorage.setItem(PROMPT_DISMISSED_KEY, cooldownUntil.toString());
    } catch (e) {
      console.warn('Failed to write location prompt cooldown', e);
    }
  };

  const confirmLocationUpdate = () => {
    if (pendingDetectedLocation) {
      const newCoords = {
        lat: pendingDetectedLocation.lat,
        lon: pendingDetectedLocation.lon,
      };
      setCoords(newCoords);
      setLocationName(pendingDetectedLocation.name);
      persistLocation(newCoords, pendingDetectedLocation.name);
    }
    setHasLocationChangedPrompt(false);
    setPendingDetectedLocation(null);
  };

  // Checks if the browser's current coordinates differ significantly (>25 km) from the active monitoring location
  const checkLocationMismatch = () => {
    if (isPromptCooldownActive()) {
      return;
    }
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLon = pos.coords.longitude;
        const distanceKm = calculateDistanceKm(coords.lat, coords.lon, currentLat, currentLon);

        // If distance exceeds 25 km, offer lightweight confirmation
        if (distanceKm >= 25) {
          const detectedName = `Current Area (${currentLat.toFixed(2)}°N, ${currentLon.toFixed(2)}°E)`;
          setPendingDetectedLocation({
            lat: currentLat,
            lon: currentLon,
            name: detectedName,
          });
          setHasLocationChangedPrompt(true);
        }
      },
      () => {
        // Silently fail if location permission is not granted; do not annoy user
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  // Helper to simulate location transition for demonstration/testing purposes
  const simulateLocationChange = (cityName: string, lat: number, lon: number) => {
    setPendingDetectedLocation({
      name: cityName,
      lat,
      lon,
    });
    setHasLocationChangedPrompt(true);
  };

  const detectMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const name = `Current GPS (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`;
        setCoordsAndName({ lat, lon }, name);
      },
      (err) => {
        setIsLocating(false);
        alert(`Location permission denied or unavailable: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <LocationContext.Provider
      value={{
        coords,
        locationName,
        isLocating,
        setLocation,
        setCoordsAndName,
        detectMyLocation,
        hasLocationChangedPrompt,
        pendingDetectedLocation,
        confirmLocationUpdate,
        dismissLocationPrompt,
        checkLocationMismatch,
        simulateLocationChange,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
