import { LanguageCode, LanguageOption, TranslationDictionary } from './types';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { mr } from './locales/mr';
import { gu } from './locales/gu';
import { ta } from './locales/ta';
import { te } from './locales/te';
import { kn } from './locales/kn';
import { ml } from './locales/ml';
import { bn } from './locales/bn';

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', englishLabel: 'English' },
  { code: 'hi', label: 'हिन्दी', englishLabel: 'Hindi' },
  { code: 'mr', label: 'मराठी', englishLabel: 'Marathi' },
  { code: 'gu', label: 'ગુજરાતી', englishLabel: 'Gujarati' },
  { code: 'ta', label: 'தமிழ்', englishLabel: 'Tamil' },
  { code: 'te', label: 'తెలుగు', englishLabel: 'Telugu' },
  { code: 'kn', label: 'ಕನ್ನಡ', englishLabel: 'Kannada' },
  { code: 'ml', label: 'മലയാളം', englishLabel: 'Malayalam' },
  { code: 'bn', label: 'বাংলা', englishLabel: 'Bengali' },
];

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en,
  hi,
  mr,
  gu,
  ta,
  te,
  kn,
  ml,
  bn,
};
