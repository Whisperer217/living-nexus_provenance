/**
 * LightsModeContext
 *
 * Fetches the platform owner's `lightsMode` setting on app load and applies
 * the `.lights-on` CSS class to <html> when the mode is "on".
 *
 * The owner is the first registered user (lowest id). All visitors see the
 * same mode — it is a global ambient setting, not per-visitor.
 *
 * The context also exposes `setMode` so the owner's ProfilePage can
 * optimistically toggle the mode without a full page reload.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

type LightsMode = "dim" | "on";

interface LightsModeContextValue {
  mode: LightsMode;
  setMode: (mode: LightsMode) => void;
}

const LightsModeContext = createContext<LightsModeContextValue>({
  mode: "dim",
  setMode: () => {},
});

export function LightsModeProvider({ children }: { children: ReactNode }) {
  const { data } = trpc.profile.getLightsMode.useQuery(undefined, {
    staleTime: 60_000,       // re-fetch at most once per minute
    refetchOnWindowFocus: false,
  });

  const [mode, setModeState] = useState<LightsMode>("dim");

  // Sync state from server response
  useEffect(() => {
    if (data?.lightsMode) {
      setModeState(data.lightsMode as LightsMode);
    }
  }, [data?.lightsMode]);

  // Apply / remove the .lights-on class on <html> whenever mode changes
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "on") {
      root.classList.add("lights-on");
    } else {
      root.classList.remove("lights-on");
    }
  }, [mode]);

  const setMode = (m: LightsMode) => {
    setModeState(m);
  };

  return (
    <LightsModeContext.Provider value={{ mode, setMode }}>
      {children}
    </LightsModeContext.Provider>
  );
}

export function useLightsMode() {
  return useContext(LightsModeContext);
}
