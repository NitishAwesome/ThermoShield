import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, Loader2, X } from 'lucide-react';
import { api } from '../services/api';
import { LocationItem } from '../types';

interface LocationSearchProps {
  currentLocationName?: string;
  onSelectLocation: (loc: LocationItem) => void;
  onUseMyLocation: () => void;
  isLocating?: boolean;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  currentLocationName,
  onSelectLocation,
  onUseMyLocation,
  isLocating = false,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.searchLocations(query.trim());
        setSuggestions(res.locations || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Location search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (loc: LocationItem) => {
    onSelectLocation(loc);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all shadow-inner"
            placeholder="Search city, ward, or coordinates (e.g. Mumbai, Delhi, Jaipur)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
            </div>
          )}
          {!isLoading && query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Use My Location Button */}
        <button
          onClick={onUseMyLocation}
          disabled={isLocating}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-all shadow-sm disabled:opacity-50"
          title="Detect Current GPS Location"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <Navigation className="w-4 h-4 text-cyan-400" />
          )}
          <span>{isLocating ? 'Locating...' : 'Use My Location'}</span>
        </button>
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-2 w-full bg-slate-800/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-700/50">
          {suggestions.map((loc, idx) => (
            <button
              key={`${loc.latitude}-${loc.longitude}-${idx}`}
              onClick={() => handleSelect(loc)}
              className="w-full px-4 py-3 text-left hover:bg-slate-700/60 flex items-start space-x-3 transition-colors group"
            >
              <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white">
                  {loc.name}
                </p>
                <p className="text-xs text-slate-400 font-mono">
                  {loc.latitude.toFixed(4)}° N, {loc.longitude.toFixed(4)}° E
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Current Active Location Badge */}
      {currentLocationName && (
        <div className="mt-2 flex items-center space-x-2 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-cyan-400" />
          <span>Active Location:</span>
          <span className="font-semibold text-slate-200 truncate">{currentLocationName}</span>
        </div>
      )}
    </div>
  );
};
