import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const STORAGE_KEY = "ln_right_rail_open";

interface RightRailContextValue {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const RightRailContext = createContext<RightRailContextValue>({
  isOpen: true,
  toggle: () => {},
  open: () => {},
  close: () => {},
});

export function RightRailProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    } catch {}
  }, [isOpen]);

  const toggle = () => setIsOpen(v => !v);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <RightRailContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </RightRailContext.Provider>
  );
}

export function useRightRail() {
  return useContext(RightRailContext);
}
