/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — PlaylistsPage
   Collaborative playlists: create, manage, invite co-editors, play.
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Plus, ListMusic, Users, Lock, Globe, Trash2, Play,
  UserPlus, Check, X, Music, ChevronRight, Loader2,
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
      <DialogContent className="bg-[oklch(0.12_0.02_280)] border border-white/[0.08] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-[#D4AF37]">New Playlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="text-white/60 text-xs mb-1 block">Playlist Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Name your playlist..."
              className="bg-[oklch(0.14_0.013_280)] border-white/[0.08] text-white placeholder:text-white/30"
            />
          </div>
          <div>
            <Label className="text-white/60 text-xs mb-1 block">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's this playlist about?"
              rows={2}
              className="bg-[oklch(0.14_0.013_280)] border-white/[0.08] text-white placeholder:text-white/30 resize-none"
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
            className="bg-[#D4AF37] hover:bg-[var(--lnx-gold-muted)] text-black font-heading"
          >
            {create.isPending ? <Loader2 size={14} className="animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
        bg-[oklch(0.12_0.02_280)] border border-white/[0.06]
        hover:border-[#D4AF37]/30 hover:bg-[oklch(0.14_0.02_280)] transition-all"
    >
      {/* Cover / icon */}
      <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden
        bg-[oklch(0.16_0.03_280)] flex items-center justify-center border border-white/[0.06]">
        {playlist.coverArtUrl
          ? <img src={playlist.coverArtUrl} alt="" className="w-full h-full object-cover" />
          : <ListMusic size={20} className="text-[#D4AF37]/60" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-heading text-white truncate">{playlist.name}</span>
          {playlist.isCollaborative && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-heading
              bg-[#A78BFA]/10 border border-[#A78BFA]/20 text-[#A78BFA]">COLLAB</span>
          )}
          {playlist.isPublic
            ? <Globe size={10} className="flex-shrink-0 text-white/30" />
            : <Lock size={10} className="flex-shrink-0 text-white/30" />}
        </div>
        {playlist.description && (
          <p className="text-[11px] text-white/40 truncate">{playlist.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isOwner && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-lnx-red transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
        <ChevronRight size={14} className="text-white/30" />
      </div>
    </div>
  );
}

/* ── Playlist Detail View ───────────────────────────────────────── */
function PlaylistDetail({
  playlistId, onBack,
}: { playlistId: number; onBack: () => void }) {
  const { user } = useAuth();
  const { addAndPlay, playQueueAt, openNowPlayingPanel } = usePlayer();
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
      <Loader2 size={24} className="animate-spin text-[#D4AF37]/50" />
    </div>
  );
  if (!data) return null;

  const { playlist, tracks, collaborators } = data;
  const isOwner = user?.id === playlist.ownerId;
  const isMember = isOwner || collaborators.some((c: any) => c.user.id === user?.id && c.acceptedAt);

  const playAll = () => {
    if (!tracks.length) return;
    const queue = tracks.map((t: any) => ({
      id: t.song.id, title: t.song.title, artist: t.song.userId,
      artUrl: t.song.coverArtUrl, audioUrl: t.song.fileUrl, witnessId: t.song.witnessId,
      visualReady: t.song.visualReady ?? false,
      autoVideoUrl: t.song.autoVideoUrl ?? undefined,
      creatorRole: t.creator?.role ?? undefined,
    }));
    const playerTracks = tracks.map((t: any) => ({
      id: String(t.song.id), title: t.song.title, artist: t.creator?.artistHandle || t.creator?.name || String(t.song.userId),
      genre: t.song.genre || "", audioUrl: t.song.fileUrl, artUrl: t.song.coverArtUrl, witnessId: t.song.witnessId,
      visualReady: t.song.visualReady ?? false,
      autoVideoUrl: t.song.autoVideoUrl ?? undefined,
      creatorRole: t.creator?.role ?? undefined,
    }));
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
          bg-[oklch(0.16_0.03_280)] flex items-center justify-center border border-white/[0.06]">
          {playlist.coverArtUrl
            ? <img src={playlist.coverArtUrl} alt="" className="w-full h-full object-cover" />
            : <ListMusic size={28} className="text-[#D4AF37]/50" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-heading text-white mb-1">{playlist.name}</h2>
          {playlist.description && <p className="text-sm text-white/50 mb-2">{playlist.description}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/30">{tracks.length} track{tracks.length !== 1 ? "s" : ""}</span>
            {playlist.isCollaborative && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-heading
                bg-[#A78BFA]/10 border border-[#A78BFA]/20 text-[#A78BFA]">COLLABORATIVE</span>
            )}
            {playlist.isPublic
              ? <span className="flex items-center gap-1 text-[10px] text-white/30"><Globe size={9} /> Public</span>
              : <span className="flex items-center gap-1 text-[10px] text-white/30"><Lock size={9} /> Private</span>}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mb-5">
        <Button
          onClick={playAll}
          disabled={!tracks.length}
          size="sm"
          className="bg-[#D4AF37] hover:bg-[var(--lnx-gold-muted)] text-black font-heading text-xs"
        >
          <Play size={12} className="mr-1" /> Play All
        </Button>
        {isOwner && playlist.isCollaborative && (
          <Button
            onClick={() => setShowInvite(v => !v)}
            size="sm"
            variant="outline"
            className="border-[#A78BFA]/30 text-[#A78BFA] hover:bg-[#A78BFA]/10 text-xs"
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
            className="bg-[oklch(0.14_0.013_280)] border-white/[0.08] text-white placeholder:text-white/30 text-sm"
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
          <p className="text-[10px] text-white/30 font-heading tracking-wider mb-2">COLLABORATORS</p>
          <div className="flex flex-wrap gap-2">
            {collaborators.map((c: any) => (
              <div key={c.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full
                bg-[oklch(0.14_0.02_280)] border border-white/[0.06]">
                <div className="w-5 h-5 rounded-full overflow-hidden bg-[oklch(0.18_0.03_280)]">
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
                    className="text-white/20 hover:text-lnx-red transition-colors"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Track list */}
      {tracks.length === 0 ? (
        <div className="text-center py-12 text-white/30">
          <Music size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No tracks yet</p>
          {isMember && <p className="text-xs mt-1">Add tracks from any song page</p>}
        </div>
      ) : (
        <div className="space-y-1">
          {tracks.map((t: any, i: number) => (
            <div
              key={t.id}
              className="group flex items-center gap-3 p-2.5 rounded-xl
                hover:bg-[oklch(0.14_0.02_280)] transition-colors"
            >
              <span className="text-[11px] text-white/20 w-5 text-right flex-shrink-0">{i + 1}</span>
              <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-[oklch(0.16_0.03_280)]">
                {t.song.coverArtUrl
                  ? <img src={t.song.coverArtUrl} alt="" className="w-full h-full object-cover" />
                  : <Music size={14} className="m-auto text-white/20 mt-2.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{t.song.title}</p>
                <p className="text-[11px] text-white/40 truncate">
                  Added by {t.addedBy.artistHandle || t.addedBy.name}
                </p>
              </div>
              <button
                onClick={() => { addAndPlay({ id: String(t.song.id), title: t.song.title, artist: t.creator?.artistHandle || t.creator?.name || String(t.song.userId), genre: t.song.genre || "", audioUrl: t.song.fileUrl, artUrl: t.song.coverArtUrl, witnessId: t.song.witnessId }); openNowPlayingPanel(); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                  bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] transition-all"
              >
                <Play size={12} />
              </button>
              {isMember && (
                <button
                  onClick={() => removeTrack.mutate({ playlistTrackId: t.id, playlistId })}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                    hover:bg-red-500/10 text-white/20 hover:text-lnx-red transition-all"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
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
      <div className="min-h-screen bg-[oklch(0.09_0.04_265)] flex items-center justify-center">
        <div className="text-center">
          <ListMusic size={40} className="mx-auto mb-4 text-[#D4AF37]/40" />
          <p className="text-white/50 mb-4">Sign in to access your playlists</p>
          <Button onClick={() => navigate("/")} className="bg-[#D4AF37] text-black font-heading">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[oklch(0.09_0.04_265)] pb-32">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        {activePlaylistId ? (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setActivePlaylistId(null)}
              className="text-white/40 hover:text-white transition-colors text-sm font-body"
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
              className="bg-[#D4AF37] hover:bg-[var(--lnx-gold-muted)] text-black font-heading"
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
            <Loader2 size={24} className="animate-spin text-[#D4AF37]/50" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-16">
            <ListMusic size={40} className="mx-auto mb-4 text-[#D4AF37]/20" />
            <p className="text-white/40 mb-2">No playlists yet</p>
            <p className="text-sm text-white/25 mb-6">Create one and invite collaborators to build it together</p>
            <Button
              onClick={() => setShowCreate(true)}
              className="bg-[#D4AF37] hover:bg-[var(--lnx-gold-muted)] text-black font-heading"
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
