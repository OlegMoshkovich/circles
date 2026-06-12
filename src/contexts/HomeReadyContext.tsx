import React from "react";

/**
 * Tracks whether the home tab (Circles) has finished its first data load.
 * The App keeps the branded splash overlay up until this flips true, so a
 * cold start goes straight from the native splash to a populated home screen
 * instead of flashing the themed background with a lone spinner in between.
 */
type HomeReadyContextType = {
  homeReady: boolean;
  markHomeReady: () => void;
};

const HomeReadyContext = React.createContext<HomeReadyContextType>({
  homeReady: false,
  markHomeReady: () => {},
});

export function HomeReadyProvider({ children }: { children: React.ReactNode }) {
  const [homeReady, setHomeReady] = React.useState(false);
  const markHomeReady = React.useCallback(() => setHomeReady(true), []);
  const value = React.useMemo(() => ({ homeReady, markHomeReady }), [homeReady, markHomeReady]);
  return <HomeReadyContext.Provider value={value}>{children}</HomeReadyContext.Provider>;
}

export function useHomeReady() {
  return React.useContext(HomeReadyContext);
}
