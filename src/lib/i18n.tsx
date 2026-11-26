import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AppLang, TemplateCategory } from '../types/database';

interface I18nContextValue {
  lang: AppLang;
  dir: 'rtl' | 'ltr';
  setLang: (lang: AppLang) => void;
  toggleLang: () => void;
  isAr: boolean;
  categoryLabel: (cat: TemplateCategory) => string;
  formatEventDate: (iso: string) => string;
}

const CATEGORY_LABELS: Record<TemplateCategory, { ar: string; en: string }> = {
  royal: { ar: 'زفاف ملكي', en: 'Royal' },
  classic: { ar: 'كلاسيكي', en: 'Classic' },
  modern: { ar: 'عصري مودرن', en: 'Modern' },
  islamic: { ar: 'إسلامي مزخرف', en: 'Islamic' },
  minimal: { ar: 'بسيط Minimal', en: 'Minimal' },
  cinematic: { ar: 'سينمائي متحرك', en: 'Cinematic' },
  gold_luxury: { ar: 'فاخر ذهبي', en: 'Gold Luxury' },
};

const I18nContext = createContext<I18nContextValue | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<AppLang>(() => {
    const saved = localStorage.getItem('marasim_lang');
    return saved === 'en' ? 'en' : 'ar';
  });

  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem('marasim_lang', lang);
  }, [lang, dir]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir,
      isAr: lang === 'ar',
      setLang: (next) => setLangState(next),
      toggleLang: () => setLangState((prev) => (prev === 'ar' ? 'en' : 'ar')),
      categoryLabel: (cat) => CATEGORY_LABELS[cat]?.[lang] ?? cat,
      formatEventDate: (iso: string) => {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return iso;
        return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }).format(d);
      },
    }),
    [lang, dir],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
