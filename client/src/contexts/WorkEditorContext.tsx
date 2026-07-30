/*
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║  WorkEditorContext — Living Nexus                                        ║
  ║                                                                          ║
  ║  FREEZE FIX v5 (root cause — main thread hang):                          ║
  ║  The context value was a new object on every render. When isOpen          ║
  ║  changed (null→song), ALL consumers re-rendered — including the           ║
  ║  2995-line CreatorProfilePage with 48 unmemoized array operations.        ║
  ║  Combined with the 1408-line CreativeDrawer mounting simultaneously,     ║
  ║  this blocked the main thread for 5+ seconds → "Page Unresponsive".      ║
  ║                                                                          ║
  ║  Fix: Split into two contexts — one stable (openEditor/closeEditor)      ║
  ║  and one reactive (isOpen). Pages that only need openEditor never         ║
  ║  re-render when the drawer opens/closes. The combined useWorkEditor()    ║
  ║  hook is kept for backwards compat but pages should migrate to           ║
  ║  useWorkEditorActions() to avoid the re-render.                          ║
  ╚══════════════════════════════════════════════════════════════════════════╝
*/

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { overlayOpen, overlayClose } from "@/lib/overlayController";
import { CreativeDrawer, type CreativeDrawerSong } from "@/components/CreativeDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trpc } from "@/lib/trpc";

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
  const openEditor = useCallback((song: CreativeDrawerSong) => {
    setEditingSong(song);
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
            <CreativeDrawer
              song={editingSong}
              onClose={closeEditor}
              onSaved={handleSaved}
            />
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
