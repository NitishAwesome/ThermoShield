import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, Loader2, X, AlertCircle } from 'lucide-react';
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
  const [hasSearched, setHasSearched] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);
  const lastExecutedQueryRef = useRef<string>('');

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

  // Debounced search query with strict AbortController and sequence versioning
  useEffect(() => {
    const trimmed = query.trim();

    // Cancel any previous in-flight HTTP request immediately on new keystroke
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      setIsLoading(false);
      setHasSearched(false);
      lastExecutedQueryRef.current = '';
      return;
    }

    // Increment request sequence ID
    const currentRequestId = ++requestIdRef.current;

    const timer = setTimeout(async () => {
      // Create fresh AbortController for this request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      lastExecutedQueryRef.current = trimmed;
      setIsLoading(true);
      setHasSearched(true);

      try {
        const res = await api.searchLocations(trimmed, controller.signal);

        // Version guard: only commit state if this request is still the newest active one
        if (currentRequestId === requestIdRef.current) {
          const locs = res.locations || [];
          setSuggestions(locs);
          setIsOpen(true);
          setSelectedIndex(-1);
          setIsLoading(false);
        }
      } catch (err: any) {
        // Silently ignore aborted/cancelled requests without altering valid state
        if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
          return;
        }
        if (currentRequestId === requestIdRef.current) {
          console.error('Location search failed:', err);
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSelect = (loc: LocationItem) => {
    onSelectLocation(loc);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    setHasSearched(false);
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
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ts-text-muted">
            <Search className="w-4 h-4 text-orange-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="w-full pl-10 pr-10 py-2.5 ts-input text-sm ts-text-primary placeholder:text-slate-400 focus:outline-none transition-all shadow-inner"
            placeholder="Search city, ward, or district (e.g. Mumbai, Jaipur, Delhi, Bengaluru)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true);
            }}
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
              <Loader2 className="w-4 h-4 text-orange-400 animate-spin" />
            </div>
          )}
          {!isLoading && query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
                setIsOpen(false);
                setHasSearched(false);
              }}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center ts-text-muted hover:ts-text-primary cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Use My Location Button */}
        <button
          type="button"
          onClick={onUseMyLocation}
          disabled={isLocating}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 ts-card-subtle hover:bg-slate-800/80 border ts-border rounded-xl text-sm font-semibold text-orange-400 hover:text-orange-300 transition-all shadow-sm disabled:opacity-50 cursor-pointer flex-shrink-0"
          title="Detect Current GPS Location"
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          ) : (
            <Navigation className="w-4 h-4 text-orange-400" />
          )}
          <span>{isLocating ? 'Locating...' : 'Use My Location'}</span>
        </button>
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 ts-card-elevated border ts-border rounded-xl shadow-2xl max-h-72 overflow-y-auto divide-y ts-border ring-1 ring-black/10">
          {suggestions.length > 0 ? (
            suggestions.map((loc, idx) => {
              const isHighlighted = idx === selectedIndex;
              return (
                <button
                  type="button"
                  key={`${loc.latitude}-${loc.longitude}-${idx}`}
                  onClick={() => handleSelect(loc)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(loc);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-4 py-3 text-left flex items-start space-x-3 transition-colors cursor-pointer group ${
                    isHighlighted ? 'bg-orange-500/15 border-l-2 border-orange-500' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold ts-text-primary truncate group-hover:text-orange-300">
                      {loc.name}
                    </p>
                    <p className="text-xs ts-text-muted font-mono mt-0.5">
                      {loc.latitude.toFixed(4)}° N, {loc.longitude.toFixed(4)}° E
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            !isLoading && hasSearched && (
              <div className="px-4 py-5 text-center ts-text-muted text-xs flex flex-col items-center">
                <AlertCircle className="w-5 h-5 text-slate-400 mb-1" />
                <span>No matching locations found for "{query}".</span>
                <span className="text-[11px] ts-text-subtle mt-0.5">Try searching by major city or district name.</span>
              </div>
            )
          )}
        </div>
      )}

      {/* Current Active Location Badge */}
      {currentLocationName && (
        <div className="mt-2.5 flex items-center space-x-2 text-xs ts-text-muted">
          <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
          <span>Active Monitored Zone:</span>
          <span className="font-semibold ts-text-primary truncate">{currentLocationName}</span>
        </div>
      )}
    </div>
  );
};
