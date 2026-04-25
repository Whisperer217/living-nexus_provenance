/**
 * AddToMyListModal
 *
 * Allows the user to add a track to one of their existing playlists,
 * or create a new playlist and add the track to it in one step.
 *
 * Uses ContextualModal — spawns anchored to the triggering element.
 * Preserves UI lineage: origin → intent → render position.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, ListMusic, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ContextualModal } from "@/components/ContextualModal";

interface AddToMyListModalProps {
  open: boolean;
  songId: number;
  songTitle: string;
  onClose: () => void;
  /** DOMRect of the button that triggered this modal */
  originRect?: DOMRect | null;
}

export function AddToMyListModal({
  open,
  songId,
  songTitle,
  onClose,
  originRect,
}: AddToMyListModalProps) {
  const { user } = useAuth();
  const [newListName, setNewListName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [addedToId, setAddedToId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: playlists, isLoading: loadingPlaylists } = trpc.playlists.mine.useQuery(undefined, {
    enabled: !!user && open,
  });

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

  const createMutation = trpc.playlists.create.useMutation({
    onSuccess: (data) => {
      if (data.id == null) { toast.error("Failed to create list"); return; }
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
    if (!name) { toast.error("Please enter a list name"); return; }
    createMutation.mutate({ name, isPublic: false });
  };

  const isBusy = addTrackMutation.isPending || createMutation.isPending;

  // Not-logged-in state — use overlay (centered) since there's no track origin
  if (!user) {
    return (
      <ContextualModal
        open={open}
        onClose={onClose}
        intent="sign-in-prompt"
        renderMode="overlay"
        width={340}
        maxHeight={200}
        showClose
      >
        <div className="px-5 py-5 text-center">
          <p className="text-sm mb-4 text-white/60">
            Sign in to save tracks to your lists.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-block px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
          >
            Sign In
          </a>
        </div>
      </ContextualModal>
    );
  }

  return (
    <ContextualModal
      open={open}
      onClose={onClose}
      originRect={originRect}
      intent="add_to_playlist"
      renderMode="contextual"
      width={300}
      maxHeight={420}
    >
      {/* Header */}
      <div className="flex flex-col px-4 pt-3 pb-2 border-b border-white/[0.08]">
        <span
          className="text-[11px] font-semibold tracking-widest uppercase"
          style={{ fontFamily: "Cinzel, serif", color: "var(--ln-gold)" }}
        >
          Add to My List
        </span>
        <span className="text-[11px] truncate mt-0.5 text-white/40">{songTitle}</span>
      </div>

      {/* Playlist list */}
      <div className="max-h-52 overflow-y-auto">
        {loadingPlaylists ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-white/40" />
          </div>
        ) : playlists && playlists.length > 0 ? (
          playlists.map((pl) => {
            const isAdded = addedToId === pl.id;
            const isAdding =
              addTrackMutation.isPending &&
              addTrackMutation.variables?.playlistId === pl.id;
            return (
              <button
                key={pl.id}
                onClick={() => handleAddToExisting(pl.id)}
                disabled={isBusy || isAdded}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors text-left hover:bg-white/[0.06] disabled:opacity-60"
                style={{ color: "var(--ln-parchment)" }}
              >
                {isAdded ? (
                  <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--ln-gold)" }} />
                ) : isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ color: "var(--ln-gold)" }} />
                ) : (
                  <ListMusic className="w-3.5 h-3.5 shrink-0 opacity-40" />
                )}
                <span className="truncate">{pl.name}</span>
                <span className="ml-auto text-[11px] shrink-0 text-white/30">
                  {pl.trackCount ?? 0}
                </span>
              </button>
            );
          })
        ) : (
          <p className="text-[12px] text-center py-5 text-white/30">
            No lists yet — create one below.
          </p>
        )}
      </div>

      {/* Create new list */}
      <div className="border-t border-white/[0.08]">
        {showCreateForm ? (
          <div className="px-4 py-3 flex gap-2">
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
              className="flex-1 bg-transparent text-[13px] rounded-lg px-3 py-1.5 outline-none focus:ring-1 text-white/90"
              style={{
                border: "1px solid rgba(196,154,40,0.2)",
                // @ts-ignore
                "--tw-ring-color": "var(--ln-gold)",
              }}
            />
            <button
              onClick={handleCreateAndAdd}
              disabled={isBusy || !newListName.trim()}
              className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors disabled:opacity-50"
              style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Create"
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] transition-colors hover:bg-white/[0.05]"
            style={{ color: "var(--ln-gold)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            New list
          </button>
        )}
      </div>
    </ContextualModal>
  );
}
