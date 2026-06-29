import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { Language, TranslationKey } from './translations';
import { t } from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'sp-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    return stored === 'ru' || stored === 'en' ? stored : 'en';
  });

  useEffect(() => {
    if (user && !user.isAnonymous && user.language && (user.language === 'en' || user.language === 'ru')) {
      setLanguageState(user.language);
      localStorage.setItem(STORAGE_KEY, user.language);
    }
  }, [user]);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem(STORAGE_KEY, lang);
    setLanguageState(lang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const translate = useCallback((key: TranslationKey) => t(key, language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
