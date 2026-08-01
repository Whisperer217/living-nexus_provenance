/*
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║  WorkEditorContext — Living Nexus                                        ║
  ║                                                                          ║
  ║  FREEZE FIX v7 (final — lazy + transition):                              ║
  ║                                                                          ║
  ║  v5 fixed the re-render cascade (context split).                         ║
  ║  v6 fixed the OverlayRouteGuard leak.                                    ║
  ║  v7 fixes the remaining freeze on heavy pages (SongDetailPage):          ║
  ║                                                                          ║
  ║  Problem: The 1408-line CreativeDrawer was statically imported and       ║
  ║  mounted synchronously when editingSong changed. On SongDetailPage       ║
  ║  (2058 lines + waveform rAF + SacredCanvas SVG), this synchronous        ║
  ║  mount overwhelms the main thread → "Page Unresponsive".                 ║
  ║                                                                          ║
  ║  Fix:                                                                     ║
  ║  1. React.lazy() — code-splits the drawer into a separate chunk.         ║
  ║     It's only downloaded when first opened (not on page load).           ║
  ║  2. startTransition() — wraps the setEditingSong call so React can       ║
  ║     yield to the browser between frames during the drawer mount.         ║
  ║  3. Suspense fallback — shows a lightweight loading indicator while      ║
  ║     the drawer chunk loads (first open only, ~50ms subsequent).          ║
  ╚══════════════════════════════════════════════════════════════════════════╝
*/

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  startTransition,
  Suspense,
  lazy,
  type ReactNode,
} from "react";
import { overlayOpen, overlayClose } from "@/lib/overlayController";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trpc } from "@/lib/trpc";

/* ─── Lazy-loaded CreativeDrawer (code-split) ──────────────────────────── */
const LazyCreativeDrawer = lazy(() =>
  import("@/components/CreativeDrawer").then((mod) => ({
    default: mod.CreativeDrawer,
  }))
);

// Re-export the type so consumers can still import it from this module
export type { CreativeDrawerSong } from "@/components/CreativeDrawer";
import type { CreativeDrawerSong } from "@/components/CreativeDrawer";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface WorkEditorActions {
  /** Open the editor for a given work. */
  openEditor: (song: CreativeDrawerSong) => void;
  /** Programmatically close the editor. */
  closeEditor: () => void;
}

interface WorkEditorState {
  /** Whether the editor is currently open. */
  isOpen: boolean;
}

// Legacy combined interface for backwards compatibility
interface WorkEditorContextValue extends WorkEditorActions, WorkEditorState {}

/* ─── Contexts ──────────────────────────────────────────────────────────── */

// Actions context — value is stable (useCallback refs), consumers never re-render
const WorkEditorActionsContext = createContext<WorkEditorActions | null>(null);

// State context — only consumed by components that NEED to react to open/close
const WorkEditorStateContext = createContext<WorkEditorState>({ isOpen: false });

/* ─── Drawer Loading Fallback ────────────────────────────────────────────── */
function DrawerLoadingFallback() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 99990 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
        <span className="text-amber-200/80 text-sm font-medium tracking-wide">
          Opening editor…
        </span>
      </div>
    </div>
  );
}

/* ─── Provider ───────────────────────────────────────────────────────────── */

export function WorkEditorProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();
  const [editingSong, setEditingSong] = useState<CreativeDrawerSong | null>(null);

  // ── Overlay lock managed at provider level ──
  useEffect(() => {
    if (!editingSong) return;
    overlayOpen("edit-track", "light");
    return () => { overlayClose("edit-track"); };
  }, [editingSong]);

  // ── Global Escape safety valve (capture phase) ──
  useEffect(() => {
    if (!editingSong) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingSong(null);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [editingSong]);

  // ── Stable action callbacks — never change reference ──
  // startTransition wraps the state update so React can yield to the browser
  // during the lazy drawer mount — prevents "Page Unresponsive" on heavy pages
  const openEditor = useCallback((song: CreativeDrawerSong) => {
    startTransition(() => {
      setEditingSong(song);
    });
  }, []);

  const closeEditor = useCallback(() => {
    setEditingSong(null);
  }, []);

  const handleSaved = useCallback(() => {
    setEditingSong((current) => {
      if (current?.id) {
        // Schedule invalidation after state update
        setTimeout(() => {
          utils.songs.getById.invalidate({ id: current.id });
          utils.songs.mySongs.invalidate();
        }, 0);
      }
      return null;
    });
  }, [utils]);

  // ── Memoized context values — stable references ──
  const actionsValue = useMemo<WorkEditorActions>(
    () => ({ openEditor, closeEditor }),
    [openEditor, closeEditor]
  );

  const isOpen = !!editingSong;
  const stateValue = useMemo<WorkEditorState>(
    () => ({ isOpen }),
    [isOpen]
  );

  return (
    <WorkEditorActionsContext.Provider value={actionsValue}>
      <WorkEditorStateContext.Provider value={stateValue}>
        {children}
        {/* Single editor instance — rendered at app root, always overlay-safe */}
        {editingSong && (
          <ErrorBoundary
            inline
            onError={() => {
              setEditingSong(null);
            }}
          >
            <Suspense fallback={<DrawerLoadingFallback />}>
              <LazyCreativeDrawer
                song={editingSong}
                onClose={closeEditor}
                onSaved={handleSaved}
              />
            </Suspense>
          </ErrorBoundary>
        )}
      </WorkEditorStateContext.Provider>
    </WorkEditorActionsContext.Provider>
  );
}

/* ─── Hooks ──────────────────────────────────────────────────────────────── */

/**
 * Get editor actions only (openEditor, closeEditor).
 * Components using this hook will NOT re-render when the drawer opens/closes.
 * Use this in pages that only need to trigger the editor (CreatorProfilePage,
 * SongDetailPage, ArchivePage, etc.).
 */
export function useWorkEditorActions(): WorkEditorActions {
  const ctx = useContext(WorkEditorActionsContext);
  if (!ctx) {
    throw new Error("useWorkEditorActions must be used within WorkEditorProvider");
  }
  return ctx;
}

/**
 * Get editor open/close state.
 * Only use this if you need to react to the drawer being open/closed.
 */
export function useWorkEditorState(): WorkEditorState {
  return useContext(WorkEditorStateContext);
}

/**
 * Combined hook — backwards compatible.
 * Subscribes to BOTH actions and state — will re-render on open/close.
 * Prefer useWorkEditorActions() in pages to avoid unnecessary re-renders.
 */
export function useWorkEditor(): WorkEditorContextValue {
  const actions = useWorkEditorActions();
  const state = useWorkEditorState();
  return useMemo(() => ({ ...actions, ...state }), [actions, state]);
}
