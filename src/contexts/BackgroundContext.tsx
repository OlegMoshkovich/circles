import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Colors,
  createGlassColors,
  GLASS_BACKGROUND_OPTIONS,
  GlassBackgroundColor,
  lightColors,
  onboardingColors,
} from "../theme/colors";

export type BgOption = "light" | "onboarding" | "glass";
const BG_STORAGE_KEY = "profile_bg_v1";
const GLASS_BG_STORAGE_KEY = "profile_glass_bg_v1";

type SetBgOption = React.Dispatch<React.SetStateAction<BgOption>>;
type SetGlassBackground = React.Dispatch<React.SetStateAction<GlassBackgroundColor>>;

type BackgroundContextType = {
  bgOption: BgOption;
  setBgOption: SetBgOption;
  glassBackground: GlassBackgroundColor;
  setGlassBackground: SetGlassBackground;
  colors: Colors;
};

const BackgroundContext = createContext<BackgroundContextType>({
  bgOption: "onboarding",
  setBgOption: () => {},
  glassBackground: GLASS_BACKGROUND_OPTIONS[0],
  setGlassBackground: () => {},
  colors: onboardingColors,
});

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [bgOption, setBgOptionState] = useState<BgOption>("onboarding");
  const [glassBackground, setGlassBackgroundState] = useState<GlassBackgroundColor>(GLASS_BACKGROUND_OPTIONS[0]);

  useEffect(() => {
    AsyncStorage.getItem(BG_STORAGE_KEY).then((val) => {
      if (val === "green" || val === "solid") {
        // Legacy value migration: removed solid/green mode -> glass.
        setBgOptionState("glass");
        void AsyncStorage.setItem(BG_STORAGE_KEY, "glass");
        return;
      }
      if (val === "light" || val === "onboarding" || val === "glass") {
        setBgOptionState(val);
      }
    });
    AsyncStorage.getItem(GLASS_BG_STORAGE_KEY).then((val) => {
      if (val === "#213127") {
        // Removed option: migrate to the new default.
        setGlassBackgroundState(GLASS_BACKGROUND_OPTIONS[0]);
        void AsyncStorage.setItem(GLASS_BG_STORAGE_KEY, GLASS_BACKGROUND_OPTIONS[0]);
        return;
      }
      if (val && /^#[0-9A-Fa-f]{3,8}$/.test(val)) {
        setGlassBackgroundState(val);
      } else if (val && GLASS_BACKGROUND_OPTIONS.includes(val as any)) {
        setGlassBackgroundState(val);
      }
    });
  }, []);

  const setBgOption: SetBgOption = React.useCallback((opt) => {
    setBgOptionState((prev) => {
      const next = typeof opt === "function" ? opt(prev) : opt;
      void AsyncStorage.setItem(BG_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const setGlassBackground: SetGlassBackground = React.useCallback((color) => {
    setGlassBackgroundState((prev) => {
      const next = typeof color === "function" ? color(prev) : color;
      void AsyncStorage.setItem(GLASS_BG_STORAGE_KEY, next);
      return next;
    });
  }, []);

  // Memoized so consumers (every themed card/screen) only re-render when the
  // theme actually changes, and so `colors` keeps a stable identity for
  // downstream useMemo(makeStyles) caches.
  const value = React.useMemo(() => {
    const colors =
      bgOption === "light"
        ? lightColors
        : bgOption === "onboarding"
          ? onboardingColors
          : createGlassColors(glassBackground);
    return { bgOption, setBgOption, glassBackground, setGlassBackground, colors };
  }, [bgOption, glassBackground, setBgOption, setGlassBackground]);

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  return useContext(BackgroundContext);
}

export function useColors(): Colors {
  return useContext(BackgroundContext).colors;
}
