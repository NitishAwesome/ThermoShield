import React, { useState, useRef, useEffect } from 'react';
import { Languages, ChevronDown, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageCode } from '../i18n/types';

interface LanguageSelectorProps {
  variant?: 'navbar' | 'compact' | 'drawer' | 'dropdown';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { currentLanguage, languages, setLanguage, currentLanguageOption } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  // Drawer list variant for mobile menu modal
  if (variant === 'drawer') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between text-xs font-semibold ts-text-muted mb-1 px-1">
          <span className="flex items-center space-x-1.5">
            <Languages className="w-3.5 h-3.5 text-orange-400" />
            <span>Select Language / भाषा</span>
          </span>
          <span className="text-[11px] font-bold text-orange-400">
            {currentLanguageOption.label}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {languages.map((lang) => {
            const isSelected = lang.code === currentLanguage;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all text-left ${
                  isSelected
                    ? 'bg-orange-500 text-white font-bold shadow-sm'
                    : 'ts-card-subtle border ts-border ts-text-primary hover:bg-slate-500/10'
                }`}
                aria-label={`Select ${lang.englishLabel}`}
              >
                <div className="truncate">
                  <div className="leading-tight font-medium">{lang.label}</div>
                  <div
                    className={`text-[9.5px] truncate leading-tight mt-0.5 ${
                      isSelected ? 'text-white/80' : 'ts-text-subtle'
                    }`}
                  >
                    {lang.englishLabel}
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Standard navbar dropdown variant
  return (
    <div className={`relative flex-shrink-0 ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 p-2 rounded-lg ts-card-subtle border ts-border ts-text-muted hover:ts-text-primary transition-all focus:outline-none focus:ring-1 focus:ring-orange-500"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Current language: ${currentLanguageOption.label} (${currentLanguageOption.englishLabel}). Click to switch.`}
        title={`Language: ${currentLanguageOption.label} (${currentLanguageOption.englishLabel})`}
      >
        <Languages className="w-4 h-4 text-orange-400 flex-shrink-0" />
        <span className="text-xs font-semibold hidden md:inline truncate max-w-[70px]">
          {currentLanguageOption.label}
        </span>
        <span className="text-xs font-bold uppercase md:hidden text-orange-400">
          {currentLanguageOption.code}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform hidden min-[360px]:inline ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Available languages"
          className="absolute right-0 mt-2 w-52 sm:w-56 ts-card-elevated border ts-border rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto"
        >
          <div className="px-3 py-1 text-[10px] uppercase font-bold ts-text-subtle tracking-wider border-b ts-border mb-1 flex items-center justify-between">
            <span>Select Language</span>
            <span className="text-orange-400">9 Available</span>
          </div>

          <div className="py-0.5 space-y-0.5">
            {languages.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors min-h-[40px] ${
                    isSelected
                      ? 'bg-orange-500/15 text-orange-400 font-bold'
                      : 'ts-text-muted hover:ts-text-primary hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="text-xs font-mono uppercase text-[10px] w-5 px-1 py-0.5 rounded bg-slate-500/10 ts-text-subtle text-center flex-shrink-0">
                      {lang.code}
                    </span>
                    <div className="truncate">
                      <div className="font-semibold text-xs leading-snug ts-text-primary">
                        {lang.label}
                      </div>
                      <div className="text-[10px] ts-text-subtle leading-tight">
                        {lang.englishLabel}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-orange-400 flex-shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
