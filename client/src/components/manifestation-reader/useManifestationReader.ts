/**
 * useManifestationReader — Shared state management for the Manifestation Reader.
 * Handles mode switching, page navigation, panel tracking, settings, and
 * cross-medium support.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAdapter, type MediumAdapter } from "./adapters";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ViewingMode = "standard" | "spread" | "guided" | "overview" | "archive";

export type MediumType = "comic" | "book" | "manuscript" | "lore" | "video" | "storyboard" | "childrens" | "guide" | string;

export type TransitionType = "fade" | "zoom" | "pan" | "cut" | "cinematic";

export type PanelType = "panel" | "dialogue" | "narration" | "splash" | "reveal" | "cinematic";

export interface ManifestationPage {
  pageNumber: number;
  imageUrl: string;
  caption?: string;
  narration?: string;
  chapterId?: string;
  chapterTitle?: string;
}

export interface PanelRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PanelType;
  readOrder?: number;
  transitionType?: TransitionType;
  isEmotionalBeat?: boolean;
  commentary?: string;
  caption?: string;
  hold?: boolean;
  recommendedDuration?: number;
}

export interface PagePanelData {
  page: number;
  regions: PanelRegion[];
  panels?: PanelRegion[]; // Legacy support
}

export interface SoundtrackCue {
  page: number;
  region?: string;
  trackId: string;
  startTime: number;
  label?: string;
}

export interface Chapter {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  coverUrl?: string;
}

export interface ProvenanceData {
  wid?: string;
  witnessId?: string;
  createdAt?: string;
  creator?: string;
  consentType?: string;
  contributors?: { name: string; role: string }[];
  transformations?: { type: string; date: string; from?: string; description?: string }[];
  derivatives?: { title: string; id: string; type: string }[];
  parentWid?: string;
  relatedWorks?: { title: string; medium: string; relationship: string }[];
}

export interface ReaderSettings {
  autoHideChrome: boolean;
  chromeTimeout: number;
  transitionsEnabled: boolean;
  soundtrackEnabled: boolean;
  commentaryEnabled: boolean;
  progressBarVisible: boolean;
  backgroundIntensity: number; // 0-100, how dark the immersive bg is
}

export interface ManifestationReaderConfig {
  pages: ManifestationPage[];
  title: string;
  medium: MediumType;
  panelData?: PagePanelData[];
  soundtrackCues?: SoundtrackCue[];
  chapters?: Chapter[];
  provenance?: ProvenanceData;
  hasWitnessAccess?: boolean;
  previewPageCount?: number;
  onClose?: () => void;
  startPage?: number;
}

// ── State ─────────────────────────────────────────────────────────────────────

export interface ManifestationReaderState {
  // Core navigation
  mode: ViewingMode;
  pageIdx: number;
  panelIdx: number;
  totalPages: number;

  // UI state
  showControls: boolean;
  isFullscreen: boolean;
  leftNavOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelTab: "provenance" | "commentary" | "metadata" | "chapters";
  showCommentary: boolean;
  zoom: number;
  transDir: "forward" | "back" | null;

  // Computed
  currentPanels: PanelRegion[];
  currentPanel: PanelRegion | null;
  currentChapter: Chapter | null;
  isPageGated: (idx: number) => boolean;
  canGoNext: boolean;
  canGoPrev: boolean;
  pageLabel: string;
  spreadRight: number | null;
  shouldLoadPage: (idx: number) => boolean;

  // Adapter (medium-specific configuration)
  adapter: MediumAdapter;

  // Settings
  settings: ReaderSettings;

  // Actions
  setMode: (mode: ViewingMode) => void;
  goNext: () => void;
  goPrev: () => void;
  goToPage: (idx: number) => void;
  setPanelIdx: (idx: number) => void;
  setZoom: (zoom: number | ((z: number) => number)) => void;
  toggleFullscreen: () => void;
  toggleLeftNav: () => void;
  toggleRightPanel: (tab?: "provenance" | "commentary" | "metadata" | "chapters") => void;
  setShowCommentary: (show: boolean) => void;
  resetControlsTimer: () => void;
  updateSettings: (partial: Partial<ReaderSettings>) => void;
  close: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function getRegionsForPage(panelData: PagePanelData[], pageNum: number): PanelRegion[] {
  const pd = panelData.find(p => p.page === pageNum);
  if (!pd) return [];
  const raw = pd.regions ?? pd.panels ?? [];
  return [...raw].sort((a, b) => {
    if (a.readOrder !== undefined && b.readOrder !== undefined) return a.readOrder - b.readOrder;
    return 0;
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: ReaderSettings = {
  autoHideChrome: true,
  chromeTimeout: 3500,
  transitionsEnabled: true,
  soundtrackEnabled: true,
  commentaryEnabled: true,
  progressBarVisible: true,
  backgroundIntensity: 95,
};

export function useManifestationReader(config: ManifestationReaderConfig): ManifestationReaderState {
  const {
    pages,
    title,
    medium,
    panelData = [],
    soundtrackCues = [],
    chapters = [],
    provenance,
    hasWitnessAccess = true,
    previewPageCount = 5,
    onClose,
    startPage = 0,
  } = config;

  const totalPages = pages.length;

  // ── Adapter Resolution (medium-agnostic) ──────────────────────────────────
  const adapter = useMemo(() => getAdapter(medium), [medium]);

  // ── Core state ────────────────────────────────────────────────────────────
  const [mode, setModeRaw] = useState<ViewingMode>(() => {
    // Adapter determines default mode; override for guided if panel data exists
    const hasPanels = panelData.length > 0;
    if (hasPanels && hasWitnessAccess && adapter.hasPanelData) {
      return adapter.supportedModes.includes("guided") ? "guided" : adapter.defaultMode;
    }
    return adapter.defaultMode;
  });

  const [pageIdx, setPageIdx] = useState(clamp(startPage, 0, totalPages - 1));
  const [panelIdx, setPanelIdxRaw] = useState(0);
  const [zoom, setZoomRaw] = useState(1.0);
  const [transDir, setTransDir] = useState<"forward" | "back" | null>(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [leftNavOpen, setLeftNavOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"provenance" | "commentary" | "metadata" | "chapters">("provenance");
  const [showCommentary, setShowCommentary] = useState(false);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Computed ──────────────────────────────────────────────────────────────
  const freePageLimit = hasWitnessAccess ? totalPages : Math.min(previewPageCount, totalPages);
  const isPageGated = useCallback((idx: number) => !hasWitnessAccess && idx >= freePageLimit, [hasWitnessAccess, freePageLimit]);
  const shouldLoadPage = useCallback((idx: number) => Math.abs(idx - pageIdx) <= 3, [pageIdx]);

  const currentPanels = useMemo(
    () => getRegionsForPage(panelData, pageIdx + 1),
    [panelData, pageIdx]
  );
  const currentPanel = currentPanels[panelIdx] ?? null;

  const currentChapter = useMemo(() => {
    if (chapters.length === 0) return null;
    return chapters.find(ch => pageIdx + 1 >= ch.startPage && pageIdx + 1 <= ch.endPage) ?? null;
  }, [chapters, pageIdx]);

  const spreadRight = mode === "spread" && pageIdx < totalPages - 1 ? pageIdx + 1 : null;

  const pageLabel = mode === "spread" && spreadRight !== null
    ? `${pageIdx + 1}–${spreadRight + 1} / ${totalPages}`
    : `${pageIdx + 1} / ${totalPages}`;

  const canGoNext = !isPageGated(pageIdx + 1) && (
    pageIdx < totalPages - 1 || (mode === "guided" && panelIdx < currentPanels.length - 1)
  );
  const canGoPrev = pageIdx > 0 || (mode === "guided" && panelIdx > 0);

  // ── Controls auto-hide ────────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    if (settings.autoHideChrome) {
      controlsTimer.current = setTimeout(() => setShowControls(false), settings.chromeTimeout);
    }
  }, [settings.autoHideChrome, settings.chromeTimeout]);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimer.current) clearTimeout(controlsTimer.current); };
  }, [resetControlsTimer]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToPage = useCallback((idx: number) => {
    const next = clamp(idx, 0, totalPages - 1);
    if (next === pageIdx) return;
    if (isPageGated(next)) return;
    const dir = next > pageIdx ? "forward" : "back";
    if (settings.transitionsEnabled) {
      setTransDir(dir);
      setTimeout(() => {
        setPageIdx(next);
        setPanelIdxRaw(0);
        setTransDir(null);
        setShowCommentary(false);
      }, 220);
    } else {
      setPageIdx(next);
      setPanelIdxRaw(0);
      setShowCommentary(false);
    }
    resetControlsTimer();
  }, [pageIdx, totalPages, isPageGated, resetControlsTimer, settings.transitionsEnabled]);

  const goNext = useCallback(() => {
    if (mode === "guided" && currentPanels.length > 0) {
      if (panelIdx < currentPanels.length - 1) {
        setPanelIdxRaw(p => p + 1);
        setShowCommentary(false);
        resetControlsTimer();
        return;
      }
    }
    if (mode === "spread") {
      const nextPage = pageIdx === 0 ? 1 : pageIdx + 2;
      goToPage(Math.min(nextPage, totalPages - 1));
    } else {
      goToPage(pageIdx + 1);
    }
  }, [mode, currentPanels, panelIdx, pageIdx, totalPages, goToPage, resetControlsTimer]);

  const goPrev = useCallback(() => {
    if (mode === "guided" && panelIdx > 0) {
      setPanelIdxRaw(p => p - 1);
      setShowCommentary(false);
      resetControlsTimer();
      return;
    }
    if (mode === "spread") {
      const prevPage = pageIdx <= 1 ? 0 : pageIdx - 2;
      goToPage(prevPage);
    } else {
      goToPage(pageIdx - 1);
    }
  }, [mode, panelIdx, pageIdx, goToPage, resetControlsTimer]);

  // ── Mode switching ────────────────────────────────────────────────────────
  const setMode = useCallback((newMode: ViewingMode) => {
    setModeRaw(newMode);
    setPanelIdxRaw(0);
    if (newMode === "overview") {
      setLeftNavOpen(false);
      setRightPanelOpen(false);
    }
  }, []);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Panels ────────────────────────────────────────────────────────────────
  const toggleLeftNav = useCallback(() => setLeftNavOpen(v => !v), []);
  const toggleRightPanel = useCallback((tab?: "provenance" | "commentary" | "metadata" | "chapters") => {
    if (tab && rightPanelOpen && rightPanelTab === tab) {
      setRightPanelOpen(false);
    } else {
      if (tab) setRightPanelTab(tab);
      setRightPanelOpen(true);
    }
  }, [rightPanelOpen, rightPanelTab]);

  // ── Settings ──────────────────────────────────────────────────────────────
  const updateSettings = useCallback((partial: Partial<ReaderSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  // ── Close ─────────────────────────────────────────────────────────────────
  const close = useCallback(() => {
    if (isFullscreen) document.exitFullscreen?.();
    onClose?.();
  }, [isFullscreen, onClose]);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const setZoom = useCallback((val: number | ((z: number) => number)) => {
    setZoomRaw(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return clamp(next, 0.5, 3.0);
    });
  }, []);

  return {
    mode,
    pageIdx,
    panelIdx,
    totalPages,
    showControls,
    isFullscreen,
    leftNavOpen,
    rightPanelOpen,
    rightPanelTab,
    showCommentary,
    zoom,
    transDir,
    currentPanels,
    currentPanel,
    currentChapter,
    isPageGated,
    canGoNext,
    canGoPrev,
    pageLabel,
    spreadRight,
    shouldLoadPage,
    adapter,
    settings,
    setMode,
    goNext,
    goPrev,
    goToPage,
    setPanelIdx: setPanelIdxRaw,
    setZoom,
    toggleFullscreen,
    toggleLeftNav,
    toggleRightPanel,
    setShowCommentary,
    resetControlsTimer,
    updateSettings,
    close,
  };
}
