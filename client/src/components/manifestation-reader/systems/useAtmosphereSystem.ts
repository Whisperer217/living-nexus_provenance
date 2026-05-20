/**
 * AtmosphereSystem — Ambient Environment Control
 * ────────────────────────────────────────────────
 * Manages the immersive mood of the manifestation environment.
 * Controls background gradients, ambient lighting, color temperature,
 * and emotional transitions between pages/panels.
 * 
 * Priority: immersion > emotional pacing > readability
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type MoodProfile = {
  id: string;
  name: string;
  /** Background gradient stops (CSS) */
  backgroundGradient: string;
  /** Ambient glow color (rgba) */
  ambientGlow: string;
  /** Vignette intensity 0-1 */
  vignetteIntensity: number;
  /** Color temperature shift (-100 warm to +100 cool) */
  colorTemperature: number;
  /** Ambient particle density 0-1 (dust, embers, etc.) */
  particleDensity: number;
  /** Transition duration in ms when entering this mood */
  transitionDuration: number;
};

export type AtmosphereState = {
  /** Current active mood profile */
  currentMood: MoodProfile;
  /** Background CSS value (gradient + overlays) */
  backgroundCSS: string;
  /** Ambient glow CSS value */
  ambientGlowCSS: string;
  /** Vignette overlay opacity */
  vignetteOpacity: number;
  /** Whether atmosphere is actively transitioning */
  isTransitioning: boolean;
  /** Overall intensity multiplier (0-1, respects user preference) */
  intensity: number;
  /** Set mood by profile or ID */
  setMood: (mood: MoodProfile | string) => void;
  /** Adjust intensity (user preference) */
  setIntensity: (value: number) => void;
  /** Trigger a pulse effect (for emotional beats) */
  pulse: (color?: string, duration?: number) => void;
  /** Reset to default mood */
  reset: () => void;
};

// ── Preset Moods ─────────────────────────────────────────────────────────────

const MOOD_PRESETS: Record<string, MoodProfile> = {
  void: {
    id: "void",
    name: "Void",
    backgroundGradient: "radial-gradient(ellipse at center, #0a0a0a 0%, #000000 100%)",
    ambientGlow: "rgba(5, 5, 5, 0)",
    vignetteIntensity: 0.85,
    colorTemperature: 0,
    particleDensity: 0,
    transitionDuration: 800,
  },
  sacred: {
    id: "sacred",
    name: "Sacred",
    backgroundGradient: "radial-gradient(ellipse at center, #0d0a05 0%, #050302 70%, #000000 100%)",
    ambientGlow: "rgba(196, 154, 40, 0.03)",
    vignetteIntensity: 0.7,
    colorTemperature: -30,
    particleDensity: 0.15,
    transitionDuration: 1200,
  },
  battle: {
    id: "battle",
    name: "Battle",
    backgroundGradient: "radial-gradient(ellipse at center, #0a0505 0%, #050202 70%, #000000 100%)",
    ambientGlow: "rgba(180, 40, 20, 0.04)",
    vignetteIntensity: 0.9,
    colorTemperature: -50,
    particleDensity: 0.3,
    transitionDuration: 600,
  },
  ethereal: {
    id: "ethereal",
    name: "Ethereal",
    backgroundGradient: "radial-gradient(ellipse at center, #050508 0%, #020204 70%, #000000 100%)",
    ambientGlow: "rgba(100, 120, 200, 0.03)",
    vignetteIntensity: 0.6,
    colorTemperature: 40,
    particleDensity: 0.2,
    transitionDuration: 1500,
  },
  revelation: {
    id: "revelation",
    name: "Revelation",
    backgroundGradient: "radial-gradient(ellipse at center, #0d0b05 0%, #080602 50%, #000000 100%)",
    ambientGlow: "rgba(255, 215, 0, 0.05)",
    vignetteIntensity: 0.5,
    colorTemperature: -20,
    particleDensity: 0.4,
    transitionDuration: 2000,
  },
  desolation: {
    id: "desolation",
    name: "Desolation",
    backgroundGradient: "radial-gradient(ellipse at center, #080808 0%, #030303 70%, #000000 100%)",
    ambientGlow: "rgba(80, 80, 80, 0.02)",
    vignetteIntensity: 0.95,
    colorTemperature: 20,
    particleDensity: 0.05,
    transitionDuration: 1000,
  },
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface AtmosphereConfig {
  /** Initial mood profile ID */
  initialMood?: string;
  /** User preference for atmosphere intensity (0-1) */
  preferredIntensity?: number;
  /** Whether atmosphere system is enabled */
  enabled?: boolean;
  /** Medium type (affects default mood selection) */
  mediumType?: string;
}

export function useAtmosphereSystem(config: AtmosphereConfig = {}): AtmosphereState {
  const {
    initialMood = "sacred",
    preferredIntensity = 0.95,
    enabled = true,
    mediumType,
  } = config;

  const [currentMood, setCurrentMood] = useState<MoodProfile>(
    () => MOOD_PRESETS[initialMood] ?? MOOD_PRESETS.sacred
  );
  const [intensity, setIntensity] = useState(preferredIntensity);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pulseColor, setPulseColor] = useState<string | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived CSS ──────────────────────────────────────────────────────────
  const backgroundCSS = useMemo(() => {
    if (!enabled) return "#000000";
    return currentMood.backgroundGradient;
  }, [currentMood, enabled]);

  const ambientGlowCSS = useMemo(() => {
    if (!enabled) return "none";
    const alpha = parseFloat(currentMood.ambientGlow.split(",").pop()?.replace(")", "") ?? "0") * intensity;
    return `0 0 120px 60px ${currentMood.ambientGlow.replace(/[\d.]+\)$/, `${alpha})`)}`;
  }, [currentMood, intensity, enabled]);

  const vignetteOpacity = useMemo(() => {
    if (!enabled) return 0;
    return currentMood.vignetteIntensity * intensity;
  }, [currentMood, intensity, enabled]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const setMood = useCallback((mood: MoodProfile | string) => {
    const profile = typeof mood === "string" ? MOOD_PRESETS[mood] : mood;
    if (!profile) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentMood(profile);
      setTimeout(() => setIsTransitioning(false), profile.transitionDuration);
    }, 150);
  }, []);

  const pulse = useCallback((color?: string, duration?: number) => {
    const c = color ?? "rgba(196, 154, 40, 0.15)";
    const d = duration ?? 800;
    setPulseColor(c);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulseColor(null), d);
  }, []);

  const reset = useCallback(() => {
    setMood(initialMood);
    setIntensity(preferredIntensity);
  }, [initialMood, preferredIntensity, setMood]);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (pulseTimer.current) clearTimeout(pulseTimer.current); };
  }, []);

  return {
    currentMood,
    backgroundCSS,
    ambientGlowCSS,
    vignetteOpacity,
    isTransitioning,
    intensity,
    setMood,
    setIntensity,
    pulse,
    reset,
  };
}
