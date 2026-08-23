import React, { createContext, useContext, useMemo, useState } from "react";

type CirclesMapViewContextValue = {
  mapViewActive: boolean;
  setMapViewActive: (active: boolean) => void;
};

const CirclesMapViewContext = createContext<CirclesMapViewContextValue>({
  mapViewActive: false,
  setMapViewActive: () => {},
});

export function CirclesMapViewProvider({ children }: { children: React.ReactNode }) {
  const [mapViewActive, setMapViewActive] = useState(false);
  const value = useMemo(
    () => ({ mapViewActive, setMapViewActive }),
    [mapViewActive]
  );
  return (
    <CirclesMapViewContext.Provider value={value}>
      {children}
    </CirclesMapViewContext.Provider>
  );
}

export function useCirclesMapView() {
  return useContext(CirclesMapViewContext);
}
