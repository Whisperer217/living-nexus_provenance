/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — AddToNamedPlaylistPopover
   Dropdown popover that lets users add a song to any of their named
   playlists, or create a new one on the spot.
   Appears as a small ListPlus icon button.
═══════════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { ListPlus, Check, Plus, Loader2, ListMusic, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

interface Props {
  songId: number;
  songTitle?: string;
  /** "compact" = icon-only button (default), "full" = icon + label */
  variant?: "compact" | "full";
  className?: string;
}

export default function AddToNamedPlaylistPopover({
  songId,
  songTitle,
  variant = "compact",
  className = "",
}: Props) {
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // All playlists the user owns or collaborates on
  const { data: playlists = [], isLoading: loadingPlaylists } = trpc.playlists.mine.useQuery(
    undefined,
    { enabled: isAuthenticated && open, staleTime: 10_000 }
  );

  // Which playlists already contain this song
  const { data: containsData = {} as Record<number, boolean> } = trpc.playlists.songInPlaylists.useQuery(
    { songId },
    { enabled: isAuthenticated && open && playlists.length > 0, staleTime: 10_000 }
  );

  const addTrack = trpc.playlists.addTrack.useMutation({
    onSuccess: (_data, vars) => {
      utils.playlists.songInPlaylists.invalidate({ songId });
      utils.playlists.getById.invalidate({ id: vars.playlistId });
      const pl = playlists.find((p: any) => p.id === vars.playlistId);
      toast.success(`Added to "${pl?.name ?? "playlist"}"`);
    },
    onError: (err) => toast.error(err.message),
  });

  const createPlaylist = trpc.playlists.create.useMutation({
    onSuccess: async (data) => {
      await utils.playlists.mine.invalidate();
      // Immediately add the song to the newly created playlist
      addTrack.mutate({ playlistId: data.id!, songId });
      toast.success(`Created "${newName}" and added track`);
      setNewName("");
      setCreating(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
        setNewName("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input when creating mode opens
  useEffect(() => {
    if (creating) setTimeout(() => inputRef.current?.focus(), 50);
  }, [creating]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/playlists");
      return;
    }
    setOpen(v => !v);
  };

  const handleAdd = (e: React.MouseEvent, playlistId: number) => {
    e.stopPropagation();
    if (containsData[playlistId]) return; // already in playlist
    addTrack.mutate({ playlistId, songId });
  };

  const handleCreate = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!newName.trim()) return;
    createPlaylist.mutate({ name: newName.trim(), isPublic: false, isCollaborative: false });
  };

  const buttonBase = variant === "full"
    ? `flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-body transition-all
       bg-white/[0.06] text-white/70 border border-white/[0.12] hover:bg-white/[0.10] hover:text-white ${className}`
    : `w-8 h-8 rounded-lg flex items-center justify-center transition-all
       bg-white/[0.06] text-white/50 border border-white/[0.08] hover:bg-white/[0.10] hover:text-white ${className}`;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger button */}
      <button
        onClick={handleToggle}
        title="Add to playlist"
        className={buttonBase}
      >
        <ListPlus size={variant === "full" ? 13 : 14} />
        {variant === "full" && <span>Add to Playlist</span>}
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute z-[200] right-0 mt-1.5 w-64 rounded-xl border border-white/[0.10]
            bg-[#000000] shadow-[0_16px_48px_rgba(0,0,0,0.90)] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3 pt-3 pb-2 border-b border-white/[0.06]">
            <p className="text-[10px] font-heading tracking-widest text-white/40">
              ADD TO PLAYLIST
            </p>
            {songTitle && (
              <p className="text-[11px] text-white/60 truncate mt-0.5">{songTitle}</p>
            )}
          </div>

          {/* Playlist list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {loadingPlaylists ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-[#C49A28]/50" />
              </div>
            ) : playlists.length === 0 ? (
              <div className="px-3 py-3 text-center">
                <ListMusic size={20} className="mx-auto mb-1.5 text-white/20" />
                <p className="text-[11px] text-white/40">No playlists yet</p>
              </div>
            ) : (
              playlists.map((pl: any) => {
                const inList = !!containsData[pl.id];
                const isPending = addTrack.isPending && addTrack.variables?.playlistId === pl.id;
                return (
                  <button
                    key={pl.id}
                    onClick={e => handleAdd(e, pl.id)}
                    disabled={inList || isPending}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                      ${inList
                        ? "opacity-60 cursor-default"
                        : "hover:bg-white/[0.05] cursor-pointer"
                      }`}
                  >
                    {/* Mini cover */}
                    <div className="w-7 h-7 rounded-md flex-shrink-0 overflow-hidden bg-[#111111] flex items-center justify-center border border-white/[0.06]">
                      {pl.coverArtUrl
                        ? <img src={pl.coverArtUrl} alt="" className="w-full h-full object-cover" />
                        : <ListMusic size={11} className="text-[#C49A28]/50" />}
                    </div>
                    <span className="flex-1 text-[12px] text-white/80 truncate">{pl.name}</span>
                    {isPending
                      ? <Loader2 size={12} className="animate-spin text-[#C49A28]/60 flex-shrink-0" />
                      : inList
                        ? <Check size={12} className="text-[#C49A28] flex-shrink-0" />
                        : <ChevronRight size={12} className="text-white/30 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* Create new playlist */}
          {creating ? (
            <div className="px-3 py-2.5 flex items-center gap-2">
              <input
                ref={inputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleCreate(e);
                  if (e.key === "Escape") { setCreating(false); setNewName(""); }
                }}
                placeholder="Playlist name..."
                className="flex-1 bg-[#111111] border border-white/[0.10] rounded-lg px-2.5 py-1.5
                  text-[12px] text-white placeholder:text-white/30 outline-none
                  focus:border-[#C49A28]/50 transition-colors"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || createPlaylist.isPending}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-heading bg-[#C49A28] text-black
                  disabled:opacity-50 transition-opacity hover:opacity-90"
              >
                {createPlaylist.isPending ? <Loader2 size={11} className="animate-spin" /> : "Create"}
              </button>
            </div>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setCreating(true); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left
                hover:bg-white/[0.04] transition-colors"
            >
              <div className="w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center
                border border-dashed border-white/[0.15]">
                <Plus size={11} className="text-white/40" />
              </div>
              <span className="text-[12px] text-white/50">New playlist</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
