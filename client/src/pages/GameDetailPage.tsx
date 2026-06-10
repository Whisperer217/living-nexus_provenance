import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Gamepad2, ExternalLink, Download, Shield,
  ChevronLeft, Copy, Share2, History, Maximize2, Minimize2,
} from "lucide-react";
import { QRShareModal, type QRCardEntity } from "@/components/QRIdentityCard";
import { CreatorHandle } from "@/components/CreatorHandle";
import { MediaAsset } from "@/components/MediaAsset";

const ENGINE_LABELS: Record<string, string> = {
  html5: "HTML5",
  twine: "Twine",
  construct: "Construct",
  gdevelop: "GDevelop",
  rpgmaker: "RPG Maker Web",
  unity_webgl: "Unity WebGL",
  other: "Other",
};

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "Unknown";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id ?? "0", 10);
  const [fullscreen, setFullscreen] = useState(false);
  const [idCardOpen, setIdCardOpen] = useState(false);

  const { data: songData, isLoading } = trpc.songs.getById.useQuery(
    { id: songId },
    { enabled: !!songId }
  );

  const { data: versionsData } = trpc.versions.list.useQuery(
    { songId },
    { enabled: !!songId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--ln-gold)] border-t-transparent" />
      </div>
    );
  }

  const song = (songData as any)?.song ?? songData;
  if (!song || song.contentType !== "game") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--ln-coal)" }}>
        <Gamepad2 className="w-16 h-16 text-[var(--ln-gold)] opacity-40" />
        <p className="text-white/60">Game not found.</p>
        <Link href="/explore">
          <Button variant="outline" className="border-[var(--ln-gold)] text-[var(--ln-gold)]">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Explore
          </Button>
        </Link>
      </div>
    );
  }

  const creator = (songData as any)?.creator;
  const engine = song.gameEngine ?? "html5";
  const gameUrl = song.gameUrl ?? song.fileUrl;
  const downloadUrl = song.gameDownloadUrl ?? null;
  const creatorNotes = song.creatorNotes ?? null;
  const widLabel = song.witnessId ?? "WID-GAM-UNREGISTERED";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied!");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-coal)" }}>
      {/* Top nav bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/10"
        style={{ background: "var(--ln-coal)" }}>
        <Link href={creator ? `/creator/${creator.artistHandle ?? creator.id}` : "/explore"}>
          <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ChevronLeft className="w-4 h-4" />
            {creator?.artistHandle ?? "Back"}
          </button>
        </Link>
        <span className="text-[var(--ln-gold)] text-xs font-mono tracking-widest uppercase flex items-center gap-1">
          <Gamepad2 className="w-3.5 h-3.5" /> GAME
        </span>
        <div className="flex items-center gap-2">
          {downloadUrl && (
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="ghost" className="text-white/60 hover:text-white">
                <Download className="w-4 h-4" />
              </Button>
            </a>
          )}
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={() => setIdCardOpen(true)}>
            <Shield className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-white/60 hover:text-white" onClick={handleCopyLink}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Hero: cover + metadata */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover art */}
          <div className="flex-shrink-0">
            <div className="w-48 h-48 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
              {song.coverArtUrl ? (
                <MediaAsset src={song.coverArtUrl} alt={song.title} mode="card" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--ln-obsidian)" }}>
                  <Gamepad2 className="w-16 h-16 text-[var(--ln-gold)] opacity-40" />
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                {song.title}
              </h1>
              {creator && (
                <div className="mt-1">
                  <CreatorHandle
                    userId={creator.id}
                    handle={creator.artistHandle}
                    displayName={creator.name}
                    className="text-[var(--ln-gold)]"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-[var(--ln-gold)]/20 text-[var(--ln-gold)] border-[var(--ln-gold)]/30">
                <Gamepad2 className="w-3 h-3 mr-1" />
                {ENGINE_LABELS[engine] ?? engine}
              </Badge>
              {song.genre && (
                <Badge variant="outline" className="border-white/20 text-white/60">
                  {song.genre}
                </Badge>
              )}
              {song.status === "Published" && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Published</Badge>
              )}
            </div>

            {song.caption && (
              <p className="text-white/70 text-sm leading-relaxed">{song.caption}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 border border-white/10" style={{ background: "var(--ln-obsidian)" }}>
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Registered</div>
                <div className="text-white text-sm">{fmtDate(song.createdAt)}</div>
              </div>
              <div className="rounded-lg p-3 border border-white/10" style={{ background: "var(--ln-obsidian)" }}>
                <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Engine</div>
                <div className="text-white text-sm">{ENGINE_LABELS[engine] ?? engine}</div>
              </div>
            </div>

            {/* WID badge */}
            <button
              onClick={() => setIdCardOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--ln-gold)]/30 text-[var(--ln-gold)] text-xs font-mono hover:bg-[var(--ln-gold)]/10 transition-colors"
            >
              <Shield className="w-3 h-3" />
              {widLabel}
            </button>
          </div>
        </div>

        {/* Game player */}
        {gameUrl ? (
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: "var(--ln-obsidian)" }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
              <span className="text-white/60 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-[var(--ln-gold)]" />
                Play Game
              </span>
              <div className="flex items-center gap-2">
                <a href={gameUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="ghost" className="text-white/40 hover:text-white h-7 px-2">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/40 hover:text-white h-7 px-2"
                  onClick={() => setFullscreen(f => !f)}
                >
                  {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <div className={fullscreen ? "fixed inset-0 z-50 bg-black" : "relative"} style={fullscreen ? {} : { paddingBottom: "56.25%" }}>
              <iframe
                src={gameUrl}
                title={song.title}
                allowFullScreen
                allow="fullscreen; autoplay; gamepad"
                className={fullscreen ? "w-full h-full" : "absolute inset-0 w-full h-full"}
                style={{ border: "none" }}
              />
              {fullscreen && (
                <button
                  onClick={() => setFullscreen(false)}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 p-12 text-center" style={{ background: "var(--ln-obsidian)" }}>
            <Gamepad2 className="w-12 h-12 text-[var(--ln-gold)] opacity-40 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No playable version available yet.</p>
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block">
                <Button className="bg-[var(--ln-gold)] text-black hover:bg-[var(--ln-gold)]/90">
                  <Download className="w-4 h-4 mr-2" /> Download Game
                </Button>
              </a>
            )}
          </div>
        )}

        {/* Creator Notes */}
        {creatorNotes && (
          <div className="rounded-xl p-5 border border-[var(--ln-gold)]/20" style={{ background: "var(--ln-obsidian)" }}>
            <h3 className="text-[var(--ln-gold)] text-xs uppercase tracking-widest mb-3 font-semibold">Creator Notes</h3>
            <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{creatorNotes}</p>
          </div>
        )}

        {/* Version / Witness Chain */}
        {versionsData && (versionsData as any[]).length > 0 && (
          <div className="rounded-xl p-5 border border-white/10" style={{ background: "var(--ln-obsidian)" }}>
            <h3 className="text-white/60 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <History className="w-3.5 h-3.5" /> Witness Chain
            </h3>
            <div className="space-y-3">
              {(versionsData as any[]).map((v: any, i: number) => (
                <div key={v.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1 ${i === 0 ? "bg-[var(--ln-gold)]" : "bg-white/20"}`} />
                    {i < (versionsData as any[]).length - 1 && (
                      <div className="w-px flex-1 bg-white/10 mt-1" style={{ minHeight: 20 }} />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">v{v.versionNumber}</span>
                      {v.witnessId && (
                        <span className="text-[var(--ln-gold)] text-xs font-mono">{v.witnessId}</span>
                      )}
                    </div>
                    {v.changeNotes && (
                      <p className="text-white/50 text-xs mt-0.5">{v.changeNotes}</p>
                    )}
                    <p className="text-white/30 text-xs mt-0.5">{fmtDate(v.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download section */}
        {downloadUrl && (
          <div className="rounded-xl p-5 border border-white/10 flex items-center justify-between" style={{ background: "var(--ln-obsidian)" }}>
            <div>
              <p className="text-white text-sm font-medium">Download Game</p>
              <p className="text-white/40 text-xs mt-0.5">
                {song.gameDownloadSize ? `${(song.gameDownloadSize / 1024 / 1024).toFixed(1)} MB` : "Available for download"}
              </p>
            </div>
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
              <Button className="bg-[var(--ln-gold)] text-black hover:bg-[var(--ln-gold)]/90">
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </a>
          </div>
        )}

        <Separator className="bg-white/10" />

        {/* Action row */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="border-white/20 text-white/60 hover:text-white hover:border-white/40"
            onClick={handleCopyLink}
          >
            <Copy className="w-4 h-4 mr-2" /> Copy Link
          </Button>
          <Button
            variant="outline"
            className="border-[var(--ln-gold)]/40 text-[var(--ln-gold)] hover:bg-[var(--ln-gold)]/10"
            onClick={() => setIdCardOpen(true)}
          >
            <Shield className="w-4 h-4 mr-2" /> ID Card
          </Button>
          {gameUrl && (
            <a href={gameUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="border-white/20 text-white/60 hover:text-white">
                <ExternalLink className="w-4 h-4 mr-2" /> Open in New Tab
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Identity Card Modal */}
      {idCardOpen && (() => {
        const entity: QRCardEntity = {
          type: "song",
          id: song.id,
          slug: `/game/${song.id}`,
          name: song.title,
          subtitle: creator?.artistHandle ? `@${creator.artistHandle}` : creator?.name ?? "",
          description: song.caption ?? undefined,
          thumbnailUrl: song.coverArtUrl ?? undefined,
          playCount: song.playCount ?? 0,
          witnessCount: 0,
        };
        return (
          <QRShareModal
            entity={entity}
            trigger={<span />}
          />
        );
      })()}
    </div>
  );
}
