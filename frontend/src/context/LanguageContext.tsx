import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { LanguageCode, LanguageOption, TranslationDictionary } from '../i18n/types';
import { SUPPORTED_LANGUAGES, translations } from '../i18n/translations';

const STORAGE_KEY = 'thermoshield_language';
const LEGACY_STORAGE_KEY = 'user_preferred_language';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  languages: LanguageOption[];
  currentLanguageOption: LanguageOption;
  setLanguage: (lang: LanguageCode) => void;
  t: (
    key: keyof TranslationDictionary | string,
    paramsOrFallback?: Record<string, string | number> | string,
    maybeFallback?: string
  ) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (saved && translations[saved]) {
        return saved;
      }
      // Check legacy key migration
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const found = SUPPORTED_LANGUAGES.find(
          (l) => l.code === legacy || l.englishLabel.toLowerCase() === legacy.toLowerCase()
        );
        if (found) {
          localStorage.setItem(STORAGE_KEY, found.code);
          return found.code;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'en';
  });

  const setLanguage = useCallback((lang: LanguageCode) => {
    if (translations[lang]) {
      setCurrentLanguageState(lang);
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch {
        // Ignore localStorage error
      }
    }
  }, []);

  // Sync document lang attribute for accessibility and screen readers
  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const t = useCallback(
    (
      key: keyof TranslationDictionary | string,
      paramsOrFallback?: Record<string, string | number> | string,
      maybeFallback?: string
    ): string => {
      let params: Record<string, string | number> | undefined;
      let fallback: string | undefined;

      if (typeof paramsOrFallback === 'string') {
        fallback = paramsOrFallback;
      } else if (paramsOrFallback && typeof paramsOrFallback === 'object') {
        params = paramsOrFallback;
        fallback = maybeFallback;
      } else {
        fallback = maybeFallback;
      }

      const dict = translations[currentLanguage];
      let str =
        (dict && (dict as any)[key]) ||
        (translations.en && (translations.en as any)[key]) ||
        (fallback !== undefined ? fallback : key);

      if (params && typeof str === 'string') {
        Object.entries(params).forEach(([paramKey, val]) => {
          str = str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }

      return str;
    },
    [currentLanguage]
  );

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageOption,
        setLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Convenience alias for standard i18n usage
export const useTranslation = () => {
  const { t, currentLanguage, setLanguage, languages, currentLanguageOption } = useLanguage();
  return { t, currentLanguage, setLanguage, languages, currentLanguageOption };
};
