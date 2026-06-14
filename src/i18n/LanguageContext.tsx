import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { translations, Translations } from "./translations";

export type Language = "en" | "de" | "fr" | "it";

const LANGUAGE_STORAGE_KEY = "app_language_v1";
const SUPPORTED: Language[] = ["en", "de", "fr", "it"];

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: translations.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Restore the saved language on launch so a switch sticks across restarts.
  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((val) => {
      if (val && SUPPORTED.includes(val as Language)) {
        setLanguageState(val as Language);
      }
    });
  }, []);

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);
    void AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }, []);

  const value = useMemo(
    () => ({ language, setLanguage, t: translations[language] }),
    [language, setLanguage]
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
