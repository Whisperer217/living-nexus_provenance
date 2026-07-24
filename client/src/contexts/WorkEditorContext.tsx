/*
  ╔══════════════════════════════════════════════════════════════════════════╗
  ║  WorkEditorContext — Living Nexus                                        ║
  ║                                                                          ║
  ║  Single app-level authority for the work editor drawer.                  ║
  ║  All edit entry points call openEditor(song) — the context manages       ║
  ║  the single CreativeDrawer instance and the overlay lock.                ║
  ║                                                                          ║
  ║  Architecture rationale:                                                 ║
  ║  Previously each page (SongDetailPage, ArchivePage, DashboardPage,       ║
  ║  CreatorDomainPage, ProfilePage, CreatorProfilePage) had its own         ║
  ║  local editingSong state and its own CreativeDrawer/EditChapel mount.    ║
  ║  Each child component called overlayOpen() inside its own useEffect.     ║
  ║  If the component crashed during mount, overlayClose() never ran,        ║
  ║  leaving an invisible fixed backdrop that blocked all pointer events     ║
  ║  (perceived platform freeze requiring page refresh).                     ║
  ║                                                                          ║
  ║  The fix: one editor, one overlay lock, managed at the app root.         ║
  ║  The parent's cleanup always runs regardless of child render errors.     ║
  ╚══════════════════════════════════════════════════════════════════════════╝
*/

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { overlayOpen, overlayClose } from "@/lib/overlayController";
import { CreativeDrawer, type CreativeDrawerSong } from "@/components/CreativeDrawer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { trpc } from "@/lib/trpc";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface WorkEditorContextValue {
  /** Open the editor for a given work. Pass any song-shaped object — only
   *  the fields defined in CreativeDrawerSong are used. */
  openEditor: (song: CreativeDrawerSong) => void;
  /** Programmatically close the editor (e.g., after a navigation event). */
  closeEditor: () => void;
  /** Whether the editor is currently open. */
  isOpen: boolean;
}

const WorkEditorContext = createContext<WorkEditorContextValue | null>(null);

/* ─── Provider ───────────────────────────────────────────────────────────── */

export function WorkEditorProvider({ children }: { children: ReactNode }) {
  const utils = trpc.useUtils();
  const [editingSong, setEditingSong] = useState<CreativeDrawerSong | null>(null);

  // ── Overlay lock managed HERE at the provider level ──
  // This is the critical fix: the lock is tied to editingSong state in the
  // PARENT provider, not inside the child CreativeDrawer. The provider's
  // cleanup always runs even if CreativeDrawer crashes during mount.
  useEffect(() => {
    if (!editingSong) return;
    overlayOpen("edit-track", "light");
    return () => { overlayClose("edit-track"); };
  }, [editingSong]);

  const openEditor = useCallback((song: CreativeDrawerSong) => {
    setEditingSong(song);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingSong(null);
  }, []);

  const handleSaved = useCallback(() => {
    if (editingSong?.id) {
      utils.songs.getById.invalidate({ id: editingSong.id });
      utils.songs.mySongs.invalidate();
    }
    setEditingSong(null);
  }, [editingSong?.id, utils]);

  return (
    <WorkEditorContext.Provider value={{ openEditor, closeEditor, isOpen: !!editingSong }}>
      {children}
      {/* Single editor instance — rendered at app root, always overlay-safe */}
      {editingSong && (
        <ErrorBoundary
          inline
          onError={() => {
            // If the editor crashes, ensure the overlay lock is released
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
    </WorkEditorContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export function useWorkEditor(): WorkEditorContextValue {
  const ctx = useContext(WorkEditorContext);
  if (!ctx) {
    throw new Error("useWorkEditor must be used within WorkEditorProvider");
  }
  return ctx;
}
