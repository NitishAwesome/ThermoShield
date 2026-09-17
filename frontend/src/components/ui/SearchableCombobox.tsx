import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';

export interface ComboboxOption {
  id: string;
  label: string;
  secondaryLabel?: string;
  badge?: string;
}

export interface SearchableComboboxProps {
  id?: string;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
}

/**
 * SearchableCombobox
 * Accessible, keyboard-navigable searchable select component.
 * Allows instant filtering by typing search queries.
 */
export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  id,
  label,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search...',
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  helpText,
  error,
  emptyMessage = 'No matching options found',
  className = '',
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.id === value);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(term) ||
      (opt.secondaryLabel && opt.secondaryLabel.toLowerCase().includes(term)) ||
      opt.id.toLowerCase().includes(term)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(-1);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
      default:
        break;
    }
  };

  const selectOption = (option: ComboboxOption) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-[11px] font-bold ts-text-subtle uppercase tracking-wider mb-1"
        >
          {label} {required && <span className="text-amber-500">*</span>}
        </label>
      )}

      {/* Combobox Trigger Button */}
      <button
        id={inputId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        className={`w-full min-h-[38px] px-3 py-2 text-left rounded-xl border text-xs font-medium flex items-center justify-between gap-2 transition-all cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-900/30 border-slate-800'
            : isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-slate-900/90'
            : error
            ? 'border-red-500/60 bg-slate-900/60'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
        }`}
      >
        <span className="truncate flex-1">
          {selectedOption ? (
            <span className="flex items-center gap-1.5 truncate">
              <span className="ts-text-primary font-semibold truncate">{selectedOption.label}</span>
              {selectedOption.secondaryLabel && (
                <span className="text-[10px] ts-text-muted truncate hidden sm:inline">
                  • {selectedOption.secondaryLabel}
                </span>
              )}
            </span>
          ) : (
            <span className="ts-text-subtle">{placeholder}</span>
          )}
        </span>

        <span className="flex items-center gap-1 shrink-0 text-slate-400">
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-amber-400' : ''
            }`}
          />
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-xl animate-fadeIn"
        >
          {/* Search Box Header */}
          <div className="p-2 border-b border-slate-800/80 bg-slate-950/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full text-xs font-medium pl-8 pr-7 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/80"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1 space-y-0.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs ts-text-muted italic">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.id === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                      isHighlighted || isSelected
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'ts-text-primary hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="truncate flex-1">
                      <div className="font-semibold truncate">{opt.label}</div>
                      {opt.secondaryLabel && (
                        <div className="text-[10.5px] ts-text-muted truncate mt-0.5">
                          {opt.secondaryLabel}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {helpText && !error && (
        <p className="text-[10px] ts-text-subtle mt-1">{helpText}</p>
      )}
      {error && (
        <p className="text-[10px] text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
};
