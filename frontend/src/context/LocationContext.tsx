import React, { createContext, useContext, useState } from 'react';
import { LocationItem } from '../types';

export interface LocationContextType {
  coords: { lat: number; lon: number };
  locationName: string;
  isLocating: boolean;
  setLocation: (loc: LocationItem) => void;
  setCoordsAndName: (coords: { lat: number; lon: number }, name: string) => void;
  detectMyLocation: () => void;
}

const DEFAULT_COORDS = { lat: 19.076, lon: 72.8777 };
const DEFAULT_NAME = 'Mumbai, Maharashtra';
const STORAGE_KEY = 'thermoshield_active_location';

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
  };

  const setCoordsAndName = (newCoords: { lat: number; lon: number }, name: string) => {
    setCoords(newCoords);
    setLocationName(name);
    persistLocation(newCoords, name);
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
