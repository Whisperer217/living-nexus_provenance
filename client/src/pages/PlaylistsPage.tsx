/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlaylistsPage
   Collaborative playlists: create, manage, invite co-editors, play.
   Phase 190: inline song search/add, fixed artist names, improved UX.
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Plus, ListMusic, Users, Lock, Globe, Trash2, Play,
  UserPlus, Check, X, Music, ChevronRight, Loader2,
  Search, PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePlayer } from "@/contexts/PlayerContext";

/* ── Create Playlist Dialog ─────────────────────────────────────── */
function CreatePlaylistDialog({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const utils = trpc.useUtils();

  const create = trpc.playlists.create.useMutation({
    onSuccess: (data) => {
      utils.playlists.mine.invalidate();
      toast.success("Playlist created");
      setName(""); setDescription("");
      onCreated(data.id!);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#000000] border border-white/[0.08] text-white max-w-md overflow-y-auto" style={{ maxHeight: "min(90dvh, 90vh)", paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}>
        <DialogHeader>
          <DialogTitle className="font-heading text-[#C49A28]">New Playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-white/60 text-xs mb-1 block">Playlist Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name your playlist..."
              className="bg-[#0A0A0A] border-white/[0.08] text-white placeholder:text-white/50"
              onKeyDown={e => e.key === "Enter" && name.trim() && create.mutate({ name, description, isPublic, isCollaborative })}
            />
          </div>
          <div>
            <Label className="text-white/60 text-xs mb-1 block">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this playlist about?"
              rows={2}
              className="bg-[#0A0A0A] border-white/[0.08] text-white placeholder:text-white/50 resize-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-white/40" />
              <Label className="text-white/70 text-sm">Public</Label>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-white/40" />
              <Label className="text-white/70 text-sm">Collaborative</Label>
            </div>
            <Switch checked={isCollaborative} onCheckedChange={setIsCollaborative} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white/50">Cancel</Button>
          <Button
            onClick={() => create.mutate({ name, description, isPublic, isCollaborative })}
            disabled={!name.trim() || create.isPending}
            className="bg-[#C49A28] hover:bg-[#B8860B] text-black font-heading"
          >
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Inline Song Search & Add ───────────────────────────────────── */
function InlineSongSearch({ playlistId, existingSongIds }: { playlistId: number; existingSongIds: Set<number> }) {
  const utils = trpc.useUtils();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results, isFetching } = trpc.search.global.useQuery(
    { q: query },
    { enabled: query.trim().length >= 2, staleTime: 5_000 }
  );

  const addTrack = trpc.playlists.addTrack.useMutation({
    onSuccess: (_d, vars) => {
      utils.playlists.getById.invalidate({ id: playlistId });
      const song = results?.songs.find(s => s.id === vars.songId);
      toast.success(`Added "${song?.title ?? "track"}" to playlist`);
    },
    onError: (err) => toast.error(err.message),
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const songs = results?.songs ?? [];

  return (
    <div ref={containerRef} className="relative mb-5">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0A0A0A] border border-white/[0.08] focus-within:border-[#C49A28]/40 transition-colors">
        <Search size={13} className="text-white/40 flex-shrink-0" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search songs to add..."
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 outline-none"
        />
        {isFetching && <Loader2 size={12} className="animate-spin text-white/30 flex-shrink-0" />}
        {query && (
          <button onClick={() => { setQuery(""); setOpen(false); }} className="text-white/30 hover:text-white/60 transition-colors">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && query.trim().length >= 2 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-white/[0.08] bg-[#000000] shadow-[0_16px_40px_rgba(0,0,0,0.85)] overflow-hidden">
          {songs.length === 0 && !isFetching ? (
            <div className="px-4 py-3 text-sm text-white/40 text-center">No results for "{query}"</div>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {songs.map(song => {
                const alreadyIn = existingSongIds.has(song.id);
                const isPending = addTrack.isPending && addTrack.variables?.songId === song.id;
                return (
                  <button
                    key={song.id}
                    onClick={() => {
                      if (alreadyIn) return;
                      addTrack.mutate({ playlistId, songId: song.id });
                      setQuery("");
                      setOpen(false);
                    }}
                    disabled={alreadyIn || isPending}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                      ${alreadyIn ? "opacity-50 cursor-default" : "hover:bg-white/[0.05] cursor-pointer"}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex-shrink-0 overflow-hidden bg-[#111111] flex items-center justify-center">
                      {song.coverArtUrl
                        ? <img src={song.coverArtUrl} alt="" className="w-full h-full object-cover" />
                        : <Music size={12} className="text-white/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-white truncate">{song.title}</p>
                      <p className="text-[11px] text-white/45 truncate">
                        {song.creatorHandle || song.creatorName || "Unknown"}
                        {song.genre && <span className="text-white/30"> · {song.genre}</span>}
                      </p>
                    </div>
                    {isPending
                      ? <Loader2 size={13} className="animate-spin text-[#C49A28]/60 flex-shrink-0" />
                      : alreadyIn
                        ? <Check size={13} className="text-[#C49A28] flex-shrink-0" />
                        : <PlusCircle size={13} className="text-white/40 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Playlist Card ──────────────────────────────────────────────── */
function PlaylistCard({
  playlist, isOwner, onOpen, onDelete,
}: {
  playlist: any; isOwner: boolean;
  onOpen: () => void; onDelete: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer
        bg-[#000000] border border-white/[0.06]
        hover:border-[#C49A28]/30 hover:bg-[#0A0A0A] transition-all"
    >
      {/* Cover / icon */}
      <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden
        bg-[#0A0A0A] flex items-center justify-center border border-white/[0.06]">
        {playlist.coverArtUrl
          ? <img src={playlist.coverArtUrl} alt="" className="w-full h-full object-cover" />
          : <ListMusic size={20} className="text-[#C49A28]/60" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-heading text-white truncate">{playlist.name}</span>
          {playlist.isCollaborative && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-heading
              bg-[#A78BFA]/10 border border-[#A78BFA]/20 text-[#A78BFA]">COLLAB</span>
          )}
          {playlist.isPublic
            ? <Globe size={10} className="flex-shrink-0 text-white/50" />
            : <Lock size={10} className="flex-shrink-0 text-white/50" />}
        </div>
        {playlist.description && (
          <p className="text-[11px] text-white/40 truncate">{playlist.description}</p>
        )}
        {typeof playlist.trackCount === "number" && (
          <p className="text-[10px] text-white/30 mt-0.5">{playlist.trackCount} track{playlist.trackCount !== 1 ? "s" : ""}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isOwner && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/50 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
        <ChevronRight size={14} className="text-white/50" />
      </div>
    </div>
  );
}

/* ── Playlist Detail View ───────────────────────────────────────── */
function PlaylistDetail({
  playlistId, onBack,
}: { playlistId: number; onBack: () => void }) {
  const { user } = useAuth();
  const { playQueueAt, openNowPlayingPanel } = usePlayer();
  const utils = trpc.useUtils();
  const [inviteHandle, setInviteHandle] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const { data, isLoading } = trpc.playlists.getById.useQuery({ id: playlistId });
  const { data: allCreators = [] } = trpc.profile.allCreators.useQuery();

  const removeTrack = trpc.playlists.removeTrack.useMutation({
    onSuccess: () => { utils.playlists.getById.invalidate({ id: playlistId }); toast.success("Track removed"); },
    onError: (err) => toast.error(err.message),
  });

  const invite = trpc.playlists.invite.useMutation({
    onSuccess: () => { toast.success("Invite sent"); setInviteHandle(""); setShowInvite(false); },
    onError: (err) => toast.error(err.message),
  });

  const removeCollab = trpc.playlists.removeCollaborator.useMutation({
    onSuccess: () => { utils.playlists.getById.invalidate({ id: playlistId }); toast.success("Removed"); },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-[#C49A28]/50" />
    </div>
  );
  if (!data) return null;

  const { playlist, tracks, collaborators } = data;
  const isOwner = user?.id === playlist.ownerId;
  const isMember = isOwner || collaborators.some((c: any) => c.user.id === user?.id && c.acceptedAt);
  const existingSongIds = new Set<number>(tracks.map((t: any) => t.song.id));

  const buildPlayerTracks = () =>
    tracks
      .filter((t: any) => !!t.song.fileUrl)
      .map((t: any) => ({
        id: String(t.song.id),
        title: t.song.title,
        artist: t.creator?.artistHandle || t.creator?.name || "Unknown",
        genre: t.song.genre || "",
        audioUrl: t.song.fileUrl,
        artUrl: t.song.coverArtUrl,
        witnessId: t.song.witnessId,
        visualReady: t.song.visualReady ?? false,
        autoVideoUrl: t.song.autoVideoUrl ?? undefined,
        creatorRole: t.creator?.role ?? undefined,
      }));

  const playAll = () => {
    const playerTracks = buildPlayerTracks();
    if (!playerTracks.length) { toast.info("No playable tracks in this playlist"); return; }
    playQueueAt(playerTracks, 0, "PLAYLIST");
    openNowPlayingPanel();
  };

  const handleInvite = () => {
    const match = allCreators.find((c: any) =>
      (c.artistHandle || "").toLowerCase() === inviteHandle.toLowerCase() ||
      (c.name || "").toLowerCase() === inviteHandle.toLowerCase()
    );
    if (!match) { toast.error("Creator not found — try their handle or name"); return; }
    invite.mutate({ playlistId, userId: match.id });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-20 h-20 rounded-xl flex-shrink-0 overflow-hidden
          bg-[#0A0A0A] flex items-center justify-center border border-white/[0.06]">
          {playlist.coverArtUrl
            ? <img src={playlist.coverArtUrl} alt="" className="w-full h-full object-cover" />
            : <ListMusic size={28} className="text-[#C49A28]/50" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-heading text-white mb-1">{playlist.name}</h2>
          {playlist.description && <p className="text-sm text-white/50 mb-2">{playlist.description}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/50">{tracks.length} track{tracks.length !== 1 ? "s" : ""}</span>
            {playlist.isCollaborative && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-heading
                bg-[#A78BFA]/10 border border-[#A78BFA]/20 text-[#A78BFA]">COLLABORATIVE</span>
            )}
            {playlist.isPublic
              ? <span className="flex items-center gap-1 text-[10px] text-white/50"><Globe size={9} /> Public</span>
              : <span className="flex items-center gap-1 text-[10px] text-white/50"><Lock size={9} /> Private</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-5">
        <Button
          onClick={playAll}
          disabled={!tracks.length}
          size="sm"
          className="bg-[#C49A28] hover:bg-[#B8860B] text-black font-heading text-xs"
        >
          <Play size={12} className="mr-1" fill="currentColor" /> Play All
        </Button>
        {isOwner && playlist.isCollaborative && (
          <Button
            onClick={() => setShowInvite(v => !v)}
            size="sm"
            variant="outline"
            className="border-[#A78BFA]/30 text-[#A78BFA] hover:bg-[#A78BFA]/10 text-xs bg-transparent"
          >
            <UserPlus size={12} className="mr-1" /> Invite
          </Button>
        )}
      </div>

      {/* Invite input */}
      {showInvite && (
        <div className="flex gap-2 mb-4">
          <Input
            value={inviteHandle}
            onChange={e => setInviteHandle(e.target.value)}
            placeholder="Artist handle or name..."
            className="bg-[#0A0A0A] border-white/[0.08] text-white placeholder:text-white/50 text-sm"
            onKeyDown={e => e.key === "Enter" && handleInvite()}
          />
          <Button
            onClick={handleInvite}
            disabled={!inviteHandle.trim() || invite.isPending}
            size="sm"
            className="bg-[#A78BFA] hover:bg-[#9370DB] text-white"
          >
            {invite.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          </Button>
        </div>
      )}

      {/* Collaborators */}
      {collaborators.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-white/50 font-heading tracking-wider mb-2">COLLABORATORS</p>
          <div className="flex flex-wrap gap-2">
            {collaborators.map((c: any) => (
              <div key={c.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full
                bg-[#0A0A0A] border border-white/[0.06]">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-[#111111]">
                  {c.user.profilePhotoUrl
                    ? <img src={c.user.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="w-full h-full flex items-center justify-center text-[8px] text-white/50">
                        {(c.user.artistHandle || c.user.name || "?")[0].toUpperCase()}
                      </span>}
                </div>
                <span className="text-[11px] text-white/70">{c.user.artistHandle || c.user.name}</span>
                {!c.acceptedAt && <span className="text-[9px] text-yellow-400/60">pending</span>}
                {isOwner && (
                  <button
                    onClick={() => removeCollab.mutate({ playlistId, userId: c.user.id })}
                    className="text-white/45 hover:text-red-400 transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inline song search/add (members only) */}
      {isMember && (
        <InlineSongSearch playlistId={playlistId} existingSongIds={existingSongIds} />
      )}

      {/* Track list */}
      {tracks.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          <Music size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tracks yet</p>
          {isMember && <p className="text-xs mt-1 text-white/35">Search above to add songs</p>}
        </div>
      ) : (
        <div className="space-y-1">
          {tracks.map((t: any, i: number) => {
            const artistName = t.creator?.artistHandle || t.creator?.name || "Unknown";
            return (
              <div
                key={t.id}
                className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#0A0A0A] transition-colors"
              >
                <span className="text-[11px] text-white/45 w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-[#111111]">
                  {t.song.coverArtUrl
                    ? <img src={t.song.coverArtUrl} alt="" className="w-full h-full object-cover" />
                    : <Music size={14} className="m-auto text-white/45 mt-2.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{t.song.title}</p>
                  <p className="text-[11px] text-white/40 truncate">
                    {artistName}
                    {t.addedBy && (
                      <span className="text-white/25"> · added by {t.addedBy.artistHandle || t.addedBy.name}</span>
                    )}
                  </p>
                </div>
                {/* Play this track */}
                <button
                  onClick={() => {
                    const playerTracks = buildPlayerTracks();
                    const startIdx = playerTracks.findIndex((tr: any) => tr.id === String(t.song.id));
                    playQueueAt(playerTracks, startIdx >= 0 ? startIdx : 0, "PLAYLIST");
                    openNowPlayingPanel();
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                    bg-[#C49A28]/10 hover:bg-[#C49A28]/20 text-[#C49A28] transition-all"
                >
                  <Play size={12} fill="currentColor" />
                </button>
                {/* Remove track */}
                {isMember && (
                  <button
                    onClick={() => removeTrack.mutate({ playlistTrackId: t.id, playlistId })}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                      hover:bg-red-500/10 text-white/45 hover:text-red-400 transition-all"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main PlaylistsPage ─────────────────────────────────────────── */
export default function PlaylistsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [showCreate, setShowCreate] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState<number | null>(null);

  const { data: playlists = [], isLoading } = trpc.playlists.mine.useQuery(undefined, {
    enabled: !!user,
  });

  const deletePlaylist = trpc.playlists.delete.useMutation({
    onSuccess: () => { utils.playlists.mine.invalidate(); toast.success("Playlist deleted"); },
    onError: (err) => toast.error(err.message),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-center">
          <ListMusic size={40} className="mx-auto mb-4 text-[#C49A28]/40" />
          <p className="text-white/50 mb-4">Sign in to access your playlists</p>
          <Button onClick={() => navigate("/")} className="bg-[#C49A28] hover:bg-[#B8860B] text-black font-heading">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] pb-32">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        {activePlaylistId ? (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setActivePlaylistId(null)}
              className="text-white/40 hover:text-white transition-colors text-sm font-body flex items-center gap-1"
            >
              ← Playlists
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading text-white mb-1">Playlists</h1>
              <p className="text-sm text-white/40">Your collections & collaborative sets</p>
            </div>
            <Button
              onClick={() => setShowCreate(true)}
              size="sm"
              className="bg-[#C49A28] hover:bg-[#B8860B] text-black font-heading"
            >
              <Plus size={14} className="mr-1" /> New
            </Button>
          </div>
        )}

        {/* Content */}
        {activePlaylistId ? (
          <PlaylistDetail playlistId={activePlaylistId} onBack={() => setActivePlaylistId(null)} />
        ) : isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#C49A28]/50" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-16">
            <ListMusic size={40} className="mx-auto mb-4 text-[#C49A28]/20" />
            <p className="text-white/40 mb-2">No playlists yet</p>
            <p className="text-sm text-white/35 mb-6">Create one and start adding songs from anywhere on the platform</p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-[#C49A28] hover:bg-[#B8860B] text-black font-heading"
            >
              <Plus size={14} className="mr-1" /> Create Your First Playlist
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {playlists.map((p: any) => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                isOwner={p.ownerId === user.id}
                onOpen={() => setActivePlaylistId(p.id)}
                onDelete={() => deletePlaylist.mutate({ id: p.id })}
              />
            ))}
          </div>
        )}
      </div>

      <CreatePlaylistDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => setActivePlaylistId(id)}
      />
    </div>
  );
}
