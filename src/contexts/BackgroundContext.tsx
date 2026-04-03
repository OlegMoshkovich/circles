import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors, lightColors, greenColors, glassColors } from "../theme/colors";

export type BgOption = "light" | "green" | "solid";
const BG_STORAGE_KEY = "profile_bg_v1";

type SetBgOption = React.Dispatch<React.SetStateAction<BgOption>>;

type BackgroundContextType = {
  bgOption: BgOption;
  setBgOption: SetBgOption;
  colors: Colors;
};

const BackgroundContext = createContext<BackgroundContextType>({
  bgOption: "light",
  setBgOption: () => {},
  colors: lightColors,
});

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [bgOption, setBgOptionState] = useState<BgOption>("green");

  useEffect(() => {
    AsyncStorage.getItem(BG_STORAGE_KEY).then((val) => {
      if (val === "light" || val === "green" || val === "solid") setBgOptionState(val);
    });
  }, []);

  const setBgOption: SetBgOption = React.useCallback((opt) => {
    setBgOptionState((prev) => {
      const next = typeof opt === "function" ? opt(prev) : opt;
      void AsyncStorage.setItem(BG_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const colors = bgOption === "light" ? lightColors : bgOption === "green" ? glassColors : greenColors;

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
