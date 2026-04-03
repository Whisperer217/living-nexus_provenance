/* ═══════════════════════════════════════════════════════════════════════════
   LIVING NEXUS — ExternalPlaylistsTab
   Phase 7 + 8: Import read-only playlists from YouTube or Suno.
   Each imported playlist is labeled with its source and stored as a JSON
   snapshot — no sync, no DB rows per track.

   Phase 8 integration: each track row has a "Play in Ambient" button that
   fires the track into the AmbientWidget (separate from the main LN queue).
═══════════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Youtube, Music2, Link2, Trash2, ExternalLink, Plus, Loader2,
  ListMusic, Globe, Radio, ChevronDown, ChevronUp,
} from "lucide-react";
import { useAmbientPlayer, type AmbientTrack } from "@/contexts/AmbientPlayerContext";

// ── Types ──────────────────────────────────────────────────────────────────────
interface ExternalTrack {
  title: string;
  artist: string;
  url: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
}

// ── Source badge ───────────────────────────────────────────────────────────────
function SourceBadge({ type }: { type: string }) {
  if (type === "youtube") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900/40 text-red-300 border border-red-700/40">
        <Youtube className="w-3 h-3" /> YouTube
      </span>
    );
  }
  if (type === "suno") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-900/40 text-purple-300 border border-purple-700/40">
        <Music2 className="w-3 h-3" /> Suno
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/5 text-white/50 border border-white/10">
      <Globe className="w-3 h-3" /> External
    </span>
  );
}

// ── Import form ────────────────────────────────────────────────────────────────
function ImportForm({ onImported }: { onImported: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  const importMutation = trpc.externalPlaylists.import.useMutation({
    onSuccess: (data) => {
      toast.success(`"${data.name}" imported — ${data.tracksJson.length} track${data.tracksJson.length !== 1 ? "s" : ""} saved`);
      setName("");
      setUrl("");
      setOpen(false);
      onImported();
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-fill name from URL paste if name is empty
  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (!name.trim() && val.trim()) {
      try {
        const u = new URL(val);
        if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
          setName("YouTube Import");
        } else if (u.hostname.includes("suno.com")) {
          setName("Suno Import");
        }
      } catch {
        // not a valid URL yet
      }
    }
  };

  if (!open) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="gap-2 border-white/15 hover:border-amber-500/50 hover:text-amber-400"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4" />
        Import Playlist
      </Button>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/3 space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold text-white/80 mb-1">Import from YouTube or Suno</p>
            <p className="text-xs text-white/40">
              Paste any YouTube video, playlist, or Suno track URL. Metadata is fetched automatically.
            </p>
          </div>
          <Input
            placeholder="https://youtube.com/watch?v=... or https://suno.com/..."
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="bg-white/5 border-white/10 text-sm"
            autoFocus
          />
          <Input
            placeholder="Playlist name (auto-filled from URL)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border-white/10 text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!name.trim() || !url.trim() || importMutation.isPending}
          onClick={() => importMutation.mutate({ name: name.trim(), sourceUrl: url.trim() })}
          className="bg-amber-600 hover:bg-amber-500 text-black font-semibold"
        >
          {importMutation.isPending ? (
            <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Importing…</>
          ) : (
            <><Link2 className="w-3 h-3 mr-1" /> Import</>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => { setOpen(false); setName(""); setUrl(""); }}
          className="text-white/50 hover:text-white/80"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Playlist card ──────────────────────────────────────────────────────────────
function PlaylistCard({
  playlist,
  onDelete,
}: {
  playlist: {
    id: number;
    name: string;
    sourceType: string;
    sourceUrl: string;
    tracksJson: unknown;
    createdAt: Date;
  };
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tracks = (playlist.tracksJson as ExternalTrack[]) ?? [];
  const { play: playAmbient, track: currentAmbient } = useAmbientPlayer();

  const deleteMutation = trpc.externalPlaylists.delete.useMutation({
    onSuccess: () => onDelete(playlist.id),
    onError: (err) => toast.error(err.message),
  });

  const handlePlayAmbient = (track: ExternalTrack) => {
    const ambientTrack: AmbientTrack = {
      id: `ext-${playlist.id}-${track.url}`,
      title: track.title,
      artist: track.artist !== "External" && track.artist !== "YouTube" && track.artist !== "Suno"
        ? track.artist
        : undefined,
      sourceUrl: track.url,
      sourceType: playlist.sourceType as AmbientTrack["sourceType"],
      thumbnailUrl: track.thumbnailUrl,
    };
    playAmbient(ambientTrack);
    toast.success(`Playing "${track.title}" in ambient player`);
  };

  const handlePlayPlaylist = () => {
    // Play the first track (or the playlist URL itself for YouTube playlists)
    if (tracks.length > 0) {
      handlePlayAmbient(tracks[0]);
    } else {
      const ambientTrack: AmbientTrack = {
        id: `ext-${playlist.id}`,
        title: playlist.name,
        sourceUrl: playlist.sourceUrl,
        sourceType: playlist.sourceType as AmbientTrack["sourceType"],
        thumbnailUrl: null,
      };
      playAmbient(ambientTrack);
      toast.success(`Playing "${playlist.name}" in ambient player`);
    }
  };

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden"
      style={{ background: "oklch(0.115 0.04 278)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          {tracks[0]?.thumbnailUrl ? (
            <img
              src={tracks[0].thumbnailUrl}
              alt={playlist.name}
              className="w-full h-full rounded-lg object-cover"
            />
          ) : (
            <ListMusic className="w-5 h-5 text-white/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-white/90 truncate">{playlist.name}</span>
            <SourceBadge type={playlist.sourceType} />
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {tracks.length} track{tracks.length !== 1 ? "s" : ""} · Imported {new Date(playlist.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Play in ambient */}
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-amber-400/70 hover:text-amber-400 hover:bg-amber-400/10 gap-1 px-2"
            onClick={handlePlayPlaylist}
            title="Play in ambient player"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ambient</span>
          </Button>
          {/* Open source */}
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-white/40 hover:text-white/80"
            onClick={() => window.open(playlist.sourceUrl, "_blank")}
            title="Open source"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          {/* Delete */}
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-white/40 hover:text-lnx-red"
            onClick={() => deleteMutation.mutate({ id: playlist.id })}
            disabled={deleteMutation.isPending}
            title="Remove"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
          {/* Expand/collapse */}
          <Button
            size="icon"
            variant="ghost"
            className="w-8 h-8 text-white/40 hover:text-white/80"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Collapse" : "Expand tracks"}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Track list */}
      {expanded && tracks.length > 0 && (
        <div className="border-t border-white/8 divide-y divide-white/5">
          {tracks.map((track, i) => {
            const isCurrentAmbient = currentAmbient?.id === `ext-${playlist.id}-${track.url}`;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/3"
                style={isCurrentAmbient ? { background: "oklch(0.84 0.155 85 / 0.08)" } : {}}
              >
                {track.thumbnailUrl ? (
                  <img
                    src={track.thumbnailUrl}
                    alt={track.title}
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0">
                    <Music2 className="w-3.5 h-3.5 text-white/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate"
                    style={{ color: isCurrentAmbient ? "oklch(0.84 0.155 85)" : "oklch(0.85 0.02 280)" }}>
                    {track.title}
                  </p>
                  {track.artist && track.artist !== "External" && track.artist !== "YouTube" && track.artist !== "Suno" && (
                    <p className="text-xs text-white/40 truncate">{track.artist}</p>
                  )}
                </div>
                {track.durationSec && (
                  <span className="text-xs text-white/30 shrink-0">
                    {Math.floor(track.durationSec / 60)}:{String(track.durationSec % 60).padStart(2, "0")}
                  </span>
                )}
                {isCurrentAmbient && (
                  <span className="text-[10px] text-amber-400/80 shrink-0 font-medium">▶ Ambient</span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 text-amber-400/50 hover:text-amber-400 hover:bg-amber-400/10 shrink-0"
                    onClick={() => handlePlayAmbient(track)}
                    title="Play in ambient player"
                  >
                    <Radio className="w-3.5 h-3.5" />
                  </Button>
                  {track.url && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-white/30 hover:text-white/70 shrink-0"
                      onClick={() => window.open(track.url, "_blank")}
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Expanded empty state */}
      {expanded && tracks.length === 0 && (
        <div className="border-t border-white/8 px-4 py-6 text-center">
          <p className="text-xs text-white/30">No tracks in this playlist snapshot.</p>
        </div>
      )}
    </div>
  );
}

// ── Main tab component ─────────────────────────────────────────────────────────
export default function ExternalPlaylistsTab() {
  const utils = trpc.useUtils();
  const { data: playlists, isLoading } = trpc.externalPlaylists.list.useQuery();

  const handleImported = () => utils.externalPlaylists.list.invalidate();
  const handleDelete = () => utils.externalPlaylists.list.invalidate();

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white/90">External Playlists</h3>
          <p className="text-xs text-white/40 mt-0.5">
            Read-only imports from YouTube and Suno. Play in the ambient player while you browse.
          </p>
        </div>
        <ImportForm onImported={handleImported} />
      </div>

      {/* Ambient player hint */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-amber-500/15 bg-amber-500/5">
        <Radio className="w-4 h-4 text-amber-400/70 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-400/70 leading-relaxed">
          <span className="font-semibold text-amber-400">Ambient Player</span> — external content plays in a floating widget, completely separate from your Living Nexus queue. Your LN session continues uninterrupted.
        </p>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/3 animate-pulse" />
          ))}
        </div>
      ) : !playlists || playlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
            <Link2 className="w-7 h-7 text-white/20" />
          </div>
          <p className="text-sm font-medium text-white/50">No external playlists yet</p>
          <p className="text-xs text-white/30 mt-1 max-w-xs">
            Paste a YouTube or Suno URL to save a read-only snapshot and play it in the ambient player.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {playlists.map((pl: typeof playlists[number]) => (
            <PlaylistCard key={pl.id} playlist={pl} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
