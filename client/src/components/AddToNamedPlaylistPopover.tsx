/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — AddToNamedPlaylistPopover
   Dropdown popover that lets users add a song to any of their named
   playlists OR Manifested Collections, or create a new one on the spot.
═══════════════════════════════════════════════════════════════════ */
import { useState, useRef, useEffect } from "react";
import { ListPlus, Check, Plus, Loader2, ListMusic, ChevronRight, Library } from "lucide-react";
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

type TabId = "playlists" | "collections";

export default function AddToNamedPlaylistPopover({
  songId,
  songTitle,
  variant = "compact",
  className = "",
}: Props) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("playlists");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Playlists ──────────────────────────────────────────────────────
  const { data: playlists = [], isLoading: loadingPlaylists } = trpc.playlists.mine.useQuery(
    undefined,
    { enabled: isAuthenticated && open && tab === "playlists", staleTime: 10_000 }
  );
  const { data: containsData = {} as Record<number, boolean> } = trpc.playlists.songInPlaylists.useQuery(
    { songId },
    { enabled: isAuthenticated && open && tab === "playlists" && playlists.length > 0, staleTime: 10_000 }
  );
  const addTrack = trpc.playlists.addTrack.useMutation({
    onSuccess: (_data, vars) => {
      utils.playlists.songInPlaylists.invalidate({ songId });
      utils.playlists.getById.invalidate({ id: vars.playlistId });
      const pl = (playlists as any[]).find((p) => p.id === vars.playlistId);
      toast.success(`Added to "${pl?.name ?? "playlist"}"`);
    },
    onError: (err) => toast.error(err.message),
  });
  const createPlaylist = trpc.playlists.create.useMutation({
    onSuccess: async (data) => {
      await utils.playlists.mine.invalidate();
      addTrack.mutate({ playlistId: data.id!, songId });
      toast.success(`Created "${newName}" and added track`);
      setNewName("");
      setCreating(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Manifested Collections ─────────────────────────────────────────
  const { data: collections = [], isLoading: loadingCollections } = trpc.collections.listMine.useQuery(
    undefined,
    { enabled: isAuthenticated && open && tab === "collections", staleTime: 10_000 }
  );
  const addToCollection = trpc.collections.addTrack.useMutation({
    onSuccess: (_data, vars) => {
      utils.collections.listMine.invalidate();
      const col = (collections as any[]).find((c) => c.id === vars.collectionId);
      toast.success(`Added to "${col?.name ?? "collection"}"`);
    },
    onError: (err) => toast.error(err.message),
  });
  const createCollection = trpc.collections.create.useMutation({
    onSuccess: async (data) => {
      await utils.collections.listMine.invalidate();
      addToCollection.mutate({ collectionId: data.id!, songId });
      toast.success(`Created "${newName}" and added track`);
      setNewName("");
      setCreating(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Helpers ────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (creating) setTimeout(() => inputRef.current?.focus(), 50);
  }, [creating]);

  // Reset creating state when switching tabs
  useEffect(() => {
    setCreating(false);
    setNewName("");
  }, [tab]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      window.location.href = getLoginUrl("/playlists");
      return;
    }
    setOpen(v => !v);
  };

  const handleAddToPlaylist = (e: React.MouseEvent, playlistId: number) => {
    e.stopPropagation();
    if (containsData[playlistId]) return;
    addTrack.mutate({ playlistId, songId });
  };

  const handleAddToCollection = (e: React.MouseEvent, collectionId: number) => {
    e.stopPropagation();
    addToCollection.mutate({ collectionId, songId });
  };

  const handleCreate = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!newName.trim()) return;
    if (tab === "playlists") {
      createPlaylist.mutate({ name: newName.trim(), isPublic: false, isCollaborative: false });
    } else {
      createCollection.mutate({ name: newName.trim(), isPublic: false });
    }
  };

  const buttonBase = variant === "full"
    ? `flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-body transition-all
       bg-white/[0.06] text-white/70 border border-white/[0.12] hover:bg-white/[0.10] hover:text-white ${className}`
    : `w-8 h-8 rounded-lg flex items-center justify-center transition-all
       bg-white/[0.06] text-white/50 border border-white/[0.08] hover:bg-white/[0.10] hover:text-white ${className}`;

  const isLoading = tab === "playlists" ? loadingPlaylists : loadingCollections;
  const items = tab === "playlists" ? (playlists as any[]) : (collections as any[]);
  const isPendingAdd = tab === "playlists" ? addTrack.isPending : addToCollection.isPending;
  const isPendingCreate = tab === "playlists" ? createPlaylist.isPending : createCollection.isPending;

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger button */}
      <button
        onClick={handleToggle}
        title="Add to playlist or collection"
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

          {/* Tab switcher */}
          <div className="flex border-b border-white/[0.06]">
            <button
              onClick={() => setTab("playlists")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] transition-colors
                ${tab === "playlists" ? "text-[#C49A28] border-b-2 border-[#C49A28]" : "text-white/40 hover:text-white/60"}`}
            >
              <ListMusic size={12} /> Playlists
            </button>
            <button
              onClick={() => setTab("collections")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] transition-colors
                ${tab === "collections" ? "text-[#C49A28] border-b-2 border-[#C49A28]" : "text-white/40 hover:text-white/60"}`}
            >
              <Library size={12} /> Collections
            </button>
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-[#C49A28]/50" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-3 py-3 text-center">
                {tab === "playlists"
                  ? <ListMusic size={20} className="mx-auto mb-1.5 text-white/20" />
                  : <Library size={20} className="mx-auto mb-1.5 text-white/20" />}
                <p className="text-[11px] text-white/40">
                  {tab === "playlists" ? "No playlists yet" : "No collections yet"}
                </p>
              </div>
            ) : (
              items.map((item: any) => {
                const inList = tab === "playlists" ? !!containsData[item.id] : false;
                const isPendingThis = isPendingAdd &&
                  (tab === "playlists"
                    ? addTrack.variables?.playlistId === item.id
                    : addToCollection.variables?.collectionId === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={e => tab === "playlists" ? handleAddToPlaylist(e, item.id) : handleAddToCollection(e, item.id)}
                    disabled={inList || isPendingThis}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                      ${inList
                        ? "opacity-60 cursor-default"
                        : "hover:bg-white/[0.05] cursor-pointer"
                      }`}
                  >
                    {/* Mini cover */}
                    <div className="w-7 h-7 rounded-md flex-shrink-0 overflow-hidden bg-[#111111] flex items-center justify-center border border-white/[0.06]">
                      {item.coverArtUrl
                        ? <img src={item.coverArtUrl} alt="" className="w-full h-full object-cover" />
                        : tab === "playlists"
                          ? <ListMusic size={11} className="text-[#C49A28]/50" />
                          : <Library size={11} className="text-[#C49A28]/50" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[12px] text-white/80 truncate">{item.name}</span>
                      {tab === "collections" && item.wid && (
                        <span className="block text-[9px] text-[#C49A28]/50 font-mono truncate">{item.wid}</span>
                      )}
                    </div>
                    {isPendingThis
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

          {/* Create new */}
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
                placeholder={tab === "playlists" ? "Playlist name..." : "Collection name..."}
                className="flex-1 bg-[#111111] border border-white/[0.10] rounded-lg px-2.5 py-1.5
                  text-[12px] text-white placeholder:text-white/30 outline-none
                  focus:border-[#C49A28]/50 transition-colors"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || isPendingCreate}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-heading bg-[#C49A28] text-black
                  disabled:opacity-50 transition-opacity hover:opacity-90"
              >
                {isPendingCreate ? <Loader2 size={11} className="animate-spin" /> : "Create"}
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
              <span className="text-[12px] text-white/50">
                {tab === "playlists" ? "New playlist" : "New collection"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
