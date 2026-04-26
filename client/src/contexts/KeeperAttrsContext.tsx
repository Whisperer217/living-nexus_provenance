/**
 * KeeperAttrsContext
 *
 * Shares the active Keeper archetype attribute state between KeeperPage
 * (where sliders live) and KeeperAvatarWidget (which passes attrs to the LLM).
 * The context is provided at the app root so both components can read/write it.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type AgentMode = "Guide" | "Conductor" | "Witness" | "Custodian" | "Archivist";
export type AttrKey = "voiceDepth" | "lyricalDensity" | "structuralLogic" | "emotionalRange" | "provenanceDepth" | "corpusSize";
export type AttrState = Record<AttrKey, number>;

export const ARCHETYPE_BASES: Record<AgentMode, AttrState> = {
  Guide:      { voiceDepth: 72, lyricalDensity: 65, structuralLogic: 40, emotionalRange: 85, provenanceDepth: 30, corpusSize: 500 },
  Conductor:  { voiceDepth: 45, lyricalDensity: 80, structuralLogic: 95, emotionalRange: 55, provenanceDepth: 40, corpusSize: 800 },
  Witness:    { voiceDepth: 95, lyricalDensity: 85, structuralLogic: 35, emotionalRange: 100, provenanceDepth: 60, corpusSize: 600 },
  Custodian:  { voiceDepth: 60, lyricalDensity: 40, structuralLogic: 70, emotionalRange: 50, provenanceDepth: 100, corpusSize: 400 },
  Archivist:  { voiceDepth: 55, lyricalDensity: 90, structuralLogic: 85, emotionalRange: 65, provenanceDepth: 95, corpusSize: 1000 },
};

interface KeeperAttrsContextValue {
  activeMode: AgentMode;
  setActiveMode: (m: AgentMode) => void;
  archetypeAttrs: Record<AgentMode, AttrState>;
  setArchetypeAttrs: React.Dispatch<React.SetStateAction<Record<AgentMode, AttrState>>>;
  attrs: AttrState;
  handleAttrChange: (key: AttrKey, value: number) => void;
  handleModeChange: (m: AgentMode) => void;
}

const KeeperAttrsContext = createContext<KeeperAttrsContextValue | null>(null);

export function KeeperAttrsProvider({ children }: { children: ReactNode }) {
  const [activeMode, setActiveMode] = useState<AgentMode>("Guide");
  const [archetypeAttrs, setArchetypeAttrs] = useState<Record<AgentMode, AttrState>>(
    () => ({ ...ARCHETYPE_BASES })
  );

  const attrs = archetypeAttrs[activeMode];

  const handleModeChange = useCallback((m: AgentMode) => {
    setActiveMode(m);
  }, []);

  const handleAttrChange = useCallback((key: AttrKey, value: number) => {
    setArchetypeAttrs(prev => ({
      ...prev,
      [activeMode]: { ...prev[activeMode], [key]: value },
    }));
  }, [activeMode]);

  return (
    <KeeperAttrsContext.Provider value={{
      activeMode,
      setActiveMode,
      archetypeAttrs,
      setArchetypeAttrs,
      attrs,
      handleAttrChange,
      handleModeChange,
    }}>
      {children}
    </KeeperAttrsContext.Provider>
  );
}

export function useKeeperAttrs() {
  const ctx = useContext(KeeperAttrsContext);
  if (!ctx) throw new Error("useKeeperAttrs must be used within KeeperAttrsProvider");
  return ctx;
}
