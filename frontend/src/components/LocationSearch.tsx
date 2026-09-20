import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Navigation, Loader2, X, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { LocationItem } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface LocationSearchProps {
  currentLocationName?: string;
  onSelectLocation: (loc: LocationItem) => void;
  onUseMyLocation: () => void;
  isLocating?: boolean;
}

// Client-side quick-directory for instantaneous (<1ms) typing suggestions
const CLIENT_POPULAR_HUBS: LocationItem[] = [
  { name: 'Panvel, Maharashtra, India', latitude: 18.9894, longitude: 73.1175 },
  { name: 'Navi Mumbai, Maharashtra, India', latitude: 19.0330, longitude: 73.0297 },
  { name: 'Vashi, Navi Mumbai, Maharashtra, India', latitude: 19.0771, longitude: 72.9986 },
  { name: 'Kharghar, Navi Mumbai, Maharashtra, India', latitude: 19.0434, longitude: 73.0689 },
  { name: 'Nerul, Navi Mumbai, Maharashtra, India', latitude: 19.0330, longitude: 73.0180 },
  { name: 'CBD Belapur, Navi Mumbai, Maharashtra, India', latitude: 19.0178, longitude: 73.0400 },
  { name: 'Thane, Maharashtra, India', latitude: 19.2183, longitude: 72.9781 },
  { name: 'Kalyan, Maharashtra, India', latitude: 19.2403, longitude: 73.1305 },
  { name: 'Dombivli, Maharashtra, India', latitude: 19.2184, longitude: 73.0867 },
  { name: 'Mumbai, Maharashtra, India', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Andheri, Mumbai, Maharashtra, India', latitude: 19.1197, longitude: 72.8468 },
  { name: 'Bandra, Mumbai, Maharashtra, India', latitude: 19.0596, longitude: 72.8295 },
  { name: 'Bandra Kurla Complex (BKC), Mumbai, Maharashtra', latitude: 19.0662, longitude: 72.8687 },
  { name: 'Borivali, Mumbai, Maharashtra, India', latitude: 19.2307, longitude: 72.8567 },
  { name: 'Dadar, Mumbai, Maharashtra, India', latitude: 19.0178, longitude: 72.8478 },
  { name: 'Pune, Maharashtra, India', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Pimpri-Chinchwad, Maharashtra, India', latitude: 18.6298, longitude: 73.7997 },
  { name: 'Nagpur, Maharashtra, India', latitude: 21.1458, longitude: 79.0882 },
  { name: 'Nashik, Maharashtra, India', latitude: 19.9975, longitude: 73.7898 },
  { name: 'Delhi, National Capital Territory of Delhi, India', latitude: 28.6139, longitude: 77.2090 },
  { name: 'Noida, Gautam Buddha Nagar, Uttar Pradesh, India', latitude: 28.5355, longitude: 77.3910 },
  { name: 'Gurugram (Gurgaon), Haryana, India', latitude: 28.4595, longitude: 77.0266 },
  { name: 'Bengaluru, Karnataka, India', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Whitefield, Bengaluru, Karnataka, India', latitude: 12.9698, longitude: 77.7500 },
  { name: 'Hyderabad, Telangana, India', latitude: 17.3850, longitude: 78.4867 },
  { name: 'Chennai, Tamil Nadu, India', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Ahmedabad, Gujarat, India', latitude: 23.0225, longitude: 72.5714 },
  { name: 'Kolkata, West Bengal, India', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Jaipur, Rajasthan, India', latitude: 26.9124, longitude: 75.7873 },
  { name: 'Lucknow, Uttar Pradesh, India', latitude: 26.8467, longitude: 80.9462 },
  { name: 'Surat, Gujarat, India', latitude: 21.1702, longitude: 72.8311 },
  { name: 'Chandigarh, India', latitude: 30.7333, longitude: 76.7794 },
];

function getClientMatches(queryText: string): LocationItem[] {
  const norm = queryText.trim().toLowerCase();
  if (norm.length < 2) return [];
  const tokens = norm.split(/[\s,-]+/).filter(Boolean);
  return CLIENT_POPULAR_HUBS.filter((hub) => {
    const hubName = hub.name.toLowerCase();
    return tokens.every((tok) => hubName.includes(tok));
  }).slice(0, 6);
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  currentLocationName,
  onSelectLocation,
  onUseMyLocation,
  isLocating = false,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

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

  const executeSearch = async (trimmedQuery: string) => {
    if (trimmedQuery.length < 2) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const currentRequestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsLoading(true);
    setHasSearched(true);
    setSearchFailed(false);

    // Provide immediate client-side instant matches so dropdown pops in 0ms
    const localMatches = getClientMatches(trimmedQuery);
    if (localMatches.length > 0) {
      setSuggestions(localMatches);
      setIsOpen(true);
    }

    try {
      const res = await api.searchLocations(trimmedQuery, controller.signal);
      if (currentRequestId === requestIdRef.current) {
        const remoteLocs = res.locations || [];
        if (remoteLocs.length > 0) {
          // Merge unique locations
          const seen = new Set<string>();
          const merged: LocationItem[] = [];
          for (const loc of [...remoteLocs, ...localMatches]) {
            const key = `${loc.latitude.toFixed(2)},${loc.longitude.toFixed(2)}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(loc);
            }
          }
          setSuggestions(merged.slice(0, 8));
        } else if (localMatches.length > 0) {
          setSuggestions(localMatches);
        } else {
          setSuggestions([]);
        }
        setIsOpen(true);
        setSelectedIndex(-1);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      if (currentRequestId === requestIdRef.current) {
        console.warn('Location search fallback active:', err);
        setIsLoading(false);
        if (localMatches.length > 0) {
          setSuggestions(localMatches);
          setIsOpen(true);
        } else {
          setSearchFailed(true);
        }
      }
    }
  };

  // Debounced search query with 200ms latency and client-side instant match
  useEffect(() => {
    const trimmed = query.trim();

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      setIsLoading(false);
      setHasSearched(false);
      setSearchFailed(false);
      return;
    }

    // Instant zero-millisecond preview while typing
    const instantMatches = getClientMatches(trimmed);
    if (instantMatches.length > 0) {
      setSuggestions(instantMatches);
      setIsOpen(true);
    }

    timerRef.current = setTimeout(() => {
      executeSearch(trimmed);
    }, 200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
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
    setSearchFailed(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!isOpen) {
        if (query.trim().length >= 2) setIsOpen(true);
        return;
      }
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      if (!isOpen) return;
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      } else if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      } else if (query.trim().length >= 2) {
        executeSearch(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full z-10" ref={dropdownRef}>
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
            placeholder={t('locationSearch.placeholder')}
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
                setSearchFailed(false);
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
          title={t('locationSearch.useMyLocation')}
        >
          {isLocating ? (
            <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
          ) : (
            <Navigation className="w-4 h-4 text-orange-400" />
          )}
          <span>{isLocating ? t('locationSearch.locating') : t('locationSearch.useMyLocation')}</span>
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
              <div className="px-4 py-5 text-center ts-text-muted text-xs flex flex-col items-center space-y-2">
                <AlertCircle className="w-5 h-5 text-orange-400" />
                <span className="font-semibold ts-text-primary">
                  {searchFailed ? 'Location service briefly unavailable' : t('locationSearch.noLocations', { query })}
                </span>
                <span className="text-[11px] ts-text-subtle">
                  {searchFailed ? 'Tap a major monitored hub or retry' : t('locationSearch.tryMajorCity')}
                </span>

                {/* Helpful Quick-Select Hub Chips */}
                <div className="pt-2 flex items-center justify-center flex-wrap gap-1.5 max-w-md">
                  {[
                    { name: 'Panvel', lat: 18.9894, lon: 73.1175 },
                    { name: 'Navi Mumbai', lat: 19.0330, lon: 73.0297 },
                    { name: 'Thane', lat: 19.2183, lon: 72.9781 },
                    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
                    { name: 'Pune', lat: 18.5204, lon: 73.8567 },
                  ].map((quick) => (
                    <button
                      key={quick.name}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect({
                          name: `${quick.name}, Maharashtra, India`,
                          latitude: quick.lat,
                          longitude: quick.lon,
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg border ts-border text-[11px] font-semibold text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/40 transition-colors"
                    >
                      📍 {quick.name}
                    </button>
                  ))}
                  {searchFailed && (
                    <button
                      type="button"
                      onClick={() => executeSearch(query.trim())}
                      className="px-2.5 py-1 rounded-lg bg-orange-500 text-white text-[11px] font-bold flex items-center gap-1 hover:bg-orange-600 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Current Active Location Badge */}
      {currentLocationName && (
        <div className="mt-2.5 flex items-center space-x-2 text-xs ts-text-muted">
          <MapPin className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
          <span>{t('locationSearch.activeZone')}</span>
          <span className="font-semibold ts-text-primary truncate">{currentLocationName}</span>
        </div>
      )}
    </div>
  );
};
