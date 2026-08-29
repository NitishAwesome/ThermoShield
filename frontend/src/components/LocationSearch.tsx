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
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.searchLocations(query.trim());
        const locs = res.locations || [];
        setSuggestions(locs);
        setIsOpen(locs.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Location search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (loc: LocationItem) => {
    onSelectLocation(loc);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full z-40" ref={dropdownRef}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Input Box */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4 text-cyan-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-10 py-2.5 bg-slate-800/95 border border-slate-700/90 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all shadow-inner"
            placeholder="Search city, ward, or region (e.g. Mumbai, Jaipur, Delhi, Bengaluru)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
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
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setIsOpen(false);
              }}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Use My Location Button */}
        <button
          onClick={onUseMyLocation}
          disabled={isLocating}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 rounded-xl text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-all shadow-sm disabled:opacity-50 cursor-pointer flex-shrink-0"
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

      {/* Autocomplete Suggestions Dropdown: High z-index floating above cards */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-slate-800 ring-1 ring-black">
          {suggestions.map((loc, idx) => {
            const isHighlighted = idx === selectedIndex;
            return (
              <button
                key={`${loc.latitude}-${loc.longitude}-${idx}`}
                onClick={() => handleSelect(loc)}
                onMouseDown={(e) => {
                  // Prevent input blur before click registers
                  e.preventDefault();
                  handleSelect(loc);
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full px-4 py-3 text-left flex items-start space-x-3 transition-colors cursor-pointer group ${
                  isHighlighted ? 'bg-cyan-950 border-l-2 border-cyan-400' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-cyan-200">
                    {loc.name}
                  </p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {loc.latitude.toFixed(4)}° N, {loc.longitude.toFixed(4)}° E
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Current Active Location Badge */}
      {currentLocationName && (
        <div className="mt-2 flex items-center space-x-2 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span>Active Location:</span>
          <span className="font-semibold text-slate-200 truncate">{currentLocationName}</span>
        </div>
      )}
    </div>
  );
};
