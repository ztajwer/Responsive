"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface LoadingContextValue {
  progress: number;
  active: boolean;
  setProgress: (progress: number, active: boolean) => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  progress: 0,
  active: true,
  setProgress: () => {},
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [progress, setProgressState] = useState(0);
  const [active, setActive] = useState(true);

  const setProgress = useCallback((p: number, a: boolean) => {
    setProgressState(p);
    setActive(a);
  }, []);

  return (
    <LoadingContext.Provider value={{ progress, active, setProgress }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoadingState() {
  return useContext(LoadingContext);
}
