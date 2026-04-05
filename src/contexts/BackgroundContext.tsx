import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, glassColors, greenColors, lightColors, onboardingColors } from "../theme/colors";

export type BgOption = "light" | "onboarding" | "glass" | "solid";
const BG_STORAGE_KEY = "profile_bg_v1";

type SetBgOption = React.Dispatch<React.SetStateAction<BgOption>>;

type BackgroundContextType = {
  bgOption: BgOption;
  setBgOption: SetBgOption;
  colors: Colors;
};

const BackgroundContext = createContext<BackgroundContextType>({
  bgOption: "onboarding",
  setBgOption: () => {},
  colors: onboardingColors,
});

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [bgOption, setBgOptionState] = useState<BgOption>("onboarding");

  useEffect(() => {
    AsyncStorage.getItem(BG_STORAGE_KEY).then((val) => {
      if (val === "green") {
        setBgOptionState("glass");
        void AsyncStorage.setItem(BG_STORAGE_KEY, "glass");
        return;
      }
      if (val === "light" || val === "onboarding" || val === "glass" || val === "solid") {
        setBgOptionState(val);
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

  const colors =
    bgOption === "light"
      ? lightColors
      : bgOption === "onboarding"
        ? onboardingColors
        : bgOption === "glass"
          ? glassColors
          : greenColors;

  return (
    <BackgroundContext.Provider value={{ bgOption, setBgOption, colors }}>
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
