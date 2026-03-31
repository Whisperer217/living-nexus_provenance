/**
 * AddToMyListModal
 *
 * Allows the user to add a track to one of their existing playlists,
 * or create a new playlist and add the track to it in one step.
 *
 * This is the ONLY entry point for persisting a track to a user collection.
 * It is completely separate from the session-based queue (playNext / addAndPlay).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, ListMusic, Check, Loader2, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface AddToMyListModalProps {
  songId: number;
  songTitle: string;
  onClose: () => void;
}

export function AddToMyListModal({ songId, songTitle, onClose }: AddToMyListModalProps) {
  const { user } = useAuth();
  const [newListName, setNewListName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addedToId, setAddedToId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch user's playlists
  const { data: playlists, isLoading: loadingPlaylists } = trpc.playlists.mine.useQuery(undefined, {
    enabled: !!user,
  });

  // Add track to existing playlist
  const addTrackMutation = trpc.playlists.addTrack.useMutation({
    onSuccess: (_data, vars) => {
      setAddedToId(vars.playlistId);
      toast.success(`Added "${songTitle}" to list`);
      utils.playlists.mine.invalidate();
      setTimeout(onClose, 800);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add to list");
    },
  });

  // Create new playlist then add track
  const createMutation = trpc.playlists.create.useMutation({
    onSuccess: (data) => {
      if (data.id == null) {
        toast.error("Failed to create list");
        return;
      }
      addTrackMutation.mutate({ playlistId: data.id, songId });
      utils.playlists.mine.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create list");
    },
  });

  const handleAddToExisting = (playlistId: number) => {
    if (addTrackMutation.isPending) return;
    addTrackMutation.mutate({ playlistId, songId });
  };

  const handleCreateAndAdd = () => {
    const name = newListName.trim();
    if (!name) {
      toast.error("Please enter a list name");
      return;
    }
    createMutation.mutate({ name, isPublic: false });
  };

  if (!user) {
    return (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={onClose}
      >
        <div
          className="relative rounded-2xl p-6 max-w-sm w-full mx-4 text-center"
          style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm mb-4" style={{ color: "oklch(0.7 0.02 280)" }}>
            Sign in to save tracks to your lists.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-block px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "oklch(0.75 0.15 85)", color: "oklch(0.1 0.02 280)" }}
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const isBusy = addTrackMutation.isPending || createMutation.isPending;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl overflow-hidden max-w-sm w-full mx-4"
        style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid oklch(0.2 0.015 280)" }}
        >
          <div>
            <h3
              className="text-sm font-semibold tracking-wide"
              style={{ fontFamily: "Cinzel, serif", color: "oklch(0.75 0.15 85)" }}
            >
              Add to My List
            </h3>
            <p className="text-xs mt-0.5 truncate max-w-[220px]" style={{ color: "oklch(0.55 0.02 280)" }}>
              {songTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06]"
            style={{ color: "oklch(0.55 0.02 280)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Playlist list */}
        <div className="max-h-64 overflow-y-auto">
          {loadingPlaylists ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "oklch(0.55 0.02 280)" }} />
            </div>
          ) : playlists && playlists.length > 0 ? (
            playlists.map((pl) => {
              const isAdded = addedToId === pl.id;
              const isAdding = addTrackMutation.isPending && addTrackMutation.variables?.playlistId === pl.id;
              return (
                <button
                  key={pl.id}
                  onClick={() => handleAddToExisting(pl.id)}
                  disabled={isBusy || isAdded}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors text-left hover:bg-white/[0.05] disabled:opacity-60"
                  style={{ color: "oklch(0.85 0.02 280)" }}
                >
                  {isAdded ? (
                    <Check className="w-4 h-4 shrink-0" style={{ color: "oklch(0.75 0.15 85)" }} />
                  ) : isAdding ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: "oklch(0.75 0.15 85)" }} />
                  ) : (
                    <ListMusic className="w-4 h-4 shrink-0 opacity-50" />
                  )}
                  <span className="truncate">{pl.name}</span>
                  <span className="ml-auto text-xs shrink-0" style={{ color: "oklch(0.45 0.015 280)" }}>
                    {pl.trackCount ?? 0} tracks
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-xs text-center py-6" style={{ color: "oklch(0.45 0.015 280)" }}>
              No lists yet. Create one below.
            </p>
          )}
        </div>

        {/* Create new list */}
        <div style={{ borderTop: "1px solid oklch(0.2 0.015 280)" }}>
          {showCreateForm ? (
            <div className="px-5 py-4 flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="List name…"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateAndAdd();
                  if (e.key === "Escape") setShowCreateForm(false);
                }}
                maxLength={128}
                className="flex-1 bg-transparent text-sm rounded-lg px-3 py-2 outline-none focus:ring-1"
                style={{
                  color: "oklch(0.85 0.02 280)",
                  border: "1px solid oklch(0.3 0.02 280)",
                  // @ts-ignore
                  "--tw-ring-color": "oklch(0.75 0.15 85)",
                }}
              />
              <button
                onClick={handleCreateAndAdd}
                disabled={isBusy || !newListName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: "oklch(0.75 0.15 85)", color: "oklch(0.1 0.02 280)" }}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Create"
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-white/[0.05]"
              style={{ color: "oklch(0.75 0.15 85)" }}
            >
              <Plus className="w-4 h-4" />
              New list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
