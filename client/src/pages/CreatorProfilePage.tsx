/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — CreatorProfilePage (v2)
   Suno-inspired: full-bleed banner, avatar overlay, stats row,
   featured songs grid (8-up), full song list with context menu,
   tip jar, social links. Divine Noir aesthetic.
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Music, Play, Pause, Shield, Globe, DollarSign, ExternalLink,
  Copy, Heart, Share2, MoreHorizontal, Download, Trash2,
  ChevronRight, Headphones, Twitter, Instagram, Youtube, Eye, EyeOff,
  Library, Move, Upload, Loader2,
} from "lucide-react";
import { ImagePositioner } from "@/components/ImagePositioner";
import SupporterBadge from "@/components/SupporterBadge";
import { usePlayer } from "@/contexts/PlayerContext";
import { AddToMyListModal } from "@/components/AddToMyListModal";
import { MediaAsset } from "@/components/MediaAsset";

// ─── Context Menu ─────────────────────────────────────────────────────────────
interface ContextMenuProps {
  song: any;
  isOwner: boolean;
  onClose: () => void;
  onDelete?: (id: number) => void;
  position: { x: number; y: number };
}
function SongContextMenu({ song, isOwner, onClose, onDelete, position }: ContextMenuProps) {
  const { playNext } = usePlayer();
  const [showAddToList, setShowAddToList] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/song/${song.id}`);
    toast.success("Link copied!");
    onClose();
  };
  function triggerTaggedDownload(id: number) {
    const a = document.createElement("a");
    a.href = `/api/download/${id}`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  const downloadMutation = trpc.songs.download.useMutation({
    onSuccess: (_data: { url: string }, vars: { songId: number }) => { triggerTaggedDownload(vars.songId); onClose(); },
    onError: (e) => { toast.error(e.message); onClose(); },
  });

  const handlePlayNext = () => {
    playNext({
      id: String(song.id),
      title: song.title,
      artist: song.creatorName || song.artistHandle || "",
      genre: song.genre || "",
      artUrl: song.coverArtUrl || undefined,
      audioUrl: song.audioUrl || undefined,
      witnessId: song.witnessId || undefined,
      coverPositionX: song.coverPositionX ?? 50,
      coverPositionY: song.coverPositionY ?? 50,
      creatorHandle: song.creatorHandle || undefined,
    });
    toast.success(`"${song.title}" plays next`);
    onClose();
  };

  return (
    <>
      <div
        className="fixed z-50 min-w-[200px] rounded-xl overflow-hidden shadow-2xl py-1"
        style={{ top: position.y, left: position.x, background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)" }}
      >
        <Link href={`/song/${song.id}`} onClick={onClose}>
          <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "oklch(0.85 0.02 280)" }}>
            <ExternalLink className="w-4 h-4 opacity-60" /> Song Page
          </button>
        </Link>

        {/* ── Queue / Collection actions ── */}
        <div className="my-1 border-t" style={{ borderColor: "oklch(0.2 0.015 280)" }} />
        {song.audioUrl && (
          <button
            onClick={handlePlayNext}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
            style={{ color: "oklch(0.85 0.02 280)" }}
          >
            <Play className="w-4 h-4 opacity-60" /> Play Next
          </button>
        )}
        <button
          onClick={() => setShowAddToList(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
          style={{ color: "oklch(0.85 0.02 280)" }}
        >
          <Library className="w-4 h-4 opacity-60" /> Add to My List
        </button>

        <div className="my-1 border-t" style={{ borderColor: "oklch(0.2 0.015 280)" }} />
        <button onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "oklch(0.85 0.02 280)" }}>
          <Copy className="w-4 h-4 opacity-60" /> Copy Link
        </button>
        <button
          onClick={() => { downloadMutation.mutate({ songId: song.id }); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
          style={{ color: "oklch(0.85 0.02 280)" }}
        >
          <Download className="w-4 h-4 opacity-60" /> Download
        </button>
        {song.witnessId && (
          <Link href={`/song/${song.id}`} onClick={onClose}>
            <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "oklch(0.65 0.2 300)" }}>
              <Shield className="w-4 h-4" /> View Witness ID
            </button>
          </Link>
        )}
        {isOwner && (
          <>
            <div className="my-1 border-t" style={{ borderColor: "oklch(0.2 0.015 280)" }} />
            <button
              onClick={() => { onDelete?.(song.id); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-500/10 transition-colors text-left"
              style={{ color: "oklch(0.65 0.18 25)" }}
            >
              <Trash2 className="w-4 h-4" /> Delete Song
            </button>
          </>
        )}
      </div>
      {showAddToList && (
        <AddToMyListModal
          songId={song.id}
          songTitle={song.title}
          onClose={() => { setShowAddToList(false); onClose(); }}
        />
      )}
    </>
  );
}

// ─── Featured Song Card ────────────────────────────────────────────────────────
function FeaturedCard({ song, onPlay, isPlaying }: { song: any; onPlay: () => void; isPlaying: boolean }) {
  return (
    <Link href={`/song/${song.id}`}>
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer group"
        style={{ height: "180px", background: "oklch(0.14 0.015 280)" }}
      >
        <MediaAsset
          src={song.coverArtUrl}
          alt={song.title}
          mode="card"
          aspectRatio={(song.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "1:1"}
          focalX={song.coverPositionX ?? 50}
          focalY={song.coverPositionY ?? 50}
          className="absolute inset-0 w-full h-full"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
          <button
            onClick={(e) => { e.preventDefault(); onPlay(); }}
            className="w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
            style={{ background: "oklch(0.84 0.155 85)" }}
          >
            {isPlaying
              ? <Pause className="w-5 h-5" style={{ color: "oklch(0.08 0.015 280)" }} />
              : <Play className="w-5 h-5 ml-0.5" style={{ color: "oklch(0.08 0.015 280)" }} />}
          </button>
        </div>
        {song.durationSeconds && (
          <div className="absolute bottom-2 left-2 text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(0,0,0,0.7)", color: "oklch(0.85 0.02 280)" }}>
            {Math.floor(song.durationSeconds / 60)}:{String(Math.round(song.durationSeconds % 60)).padStart(2, "0")}
          </div>
        )}
        {song.witnessId && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "oklch(0.65 0.2 300 / 0.9)" }}>
            <Shield className="w-3 h-3 text-white" />
          </div>
        )}
        {song.aiConsent === "prohibited" && (
          <div className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "oklch(0.65 0.18 25 / 0.85)", color: "white" }}>
            AI OFF
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-xs font-semibold truncate" style={{ color: "oklch(0.95 0.01 280)", fontFamily: "'Cinzel', serif" }}>{song.title}</p>
          {song.genre && <p className="text-[10px] truncate" style={{ color: "oklch(0.6 0.04 280)" }}>{song.genre}</p>}
        </div>
      </div>
    </Link>
  );
}

// ─── Song Row ─────────────────────────────────────────────────────────────────
function SongRow({ song, index, isPlaying, onPlay, isOwner, onDelete }: {
  song: any; index: number; isPlaying: boolean; onPlay: () => void;
  isOwner: boolean; onDelete?: (id: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({
        x: Math.min(rect.left, window.innerWidth - 220),
        y: Math.min(rect.bottom + 4, window.innerHeight - 300),
      });
    }
    setMenuOpen(true);
  };

  return (
    <>
      <div
        className="group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all hover:bg-white/[0.04]"
        onClick={onPlay}
      >
        <div className="w-7 flex-shrink-0 flex items-center justify-center">
          {isPlaying ? (
            <div className="flex gap-0.5 items-end h-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-0.5 rounded-full animate-pulse" style={{ height: `${8 + i * 3}px`, background: "oklch(0.84 0.155 85)", animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          ) : (
            <>
              <span className="text-xs group-hover:hidden" style={{ color: "#E2E8F0" }}>{index + 1}</span>
              <Play className="w-3.5 h-3.5 hidden group-hover:block" style={{ color: "oklch(0.84 0.155 85)" }} />
            </>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative">
          <MediaAsset
            src={song.coverArtUrl}
            alt={song.title}
            mode="card"
            aspectRatio={(song.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "1:1"}
            focalX={song.coverPositionX ?? 50}
            focalY={song.coverPositionY ?? 50}
            className="absolute inset-0 w-full h-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: isPlaying ? "oklch(0.84 0.155 85)" : "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>{song.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {song.genre && <span className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>{song.genre}</span>}
            {song.witnessId && (
              <Badge className="text-[9px] px-1 py-0" style={{ background: "oklch(0.65 0.2 300 / 0.2)", color: "oklch(0.65 0.2 300)", border: "1px solid oklch(0.65 0.2 300 / 0.3)" }}>
                <Shield className="w-2.5 h-2.5 mr-0.5" /> WID
              </Badge>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: "#E2E8F0" }}>
          <span className="flex items-center gap-1"><Headphones className="w-3 h-3" /> {song.playCount || 0}</span>
          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {song.tipCount || 0}</span>
        </div>
        {song.durationSeconds && (
          <span className="hidden sm:block text-xs font-mono" style={{ color: "#E2E8F0" }}>
            {Math.floor(song.durationSeconds / 60)}:{String(Math.round(song.durationSeconds % 60)).padStart(2, "0")}
          </span>
        )}
        <button
          ref={btnRef}
          onClick={openMenu}
          className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
        >
          <MoreHorizontal className="w-4 h-4" style={{ color: "oklch(0.6 0.04 280)" }} />
        </button>
      </div>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <SongContextMenu
            song={song}
            isOwner={isOwner}
            onClose={() => setMenuOpen(false)}
            onDelete={onDelete}
            position={menuPos}
          />
        </>
      )}
    </>
  );
}

// ─── Banner Upload CTA (owner empty state) ───────────────────────────────────
function BannerUploadCTA({ onFocalDetected }: { onFocalDetected?: (focal: { x: number; y: number }) => void }) {
  const utils = trpc.useUtils();
  const [uploading, setUploading] = useState(false);
  const uploadBanner = trpc.profile.uploadBanner.useMutation({
    onSuccess: (data) => {
      utils.profile.getCreator.invalidate();
      toast.success("Banner uploaded");
      // Pass AI focal point back to parent so positioner auto-centers
      if (data?.focalX !== undefined && data?.focalY !== undefined && onFocalDetected) {
        onFocalDetected({ x: data.focalX, y: data.focalY });
      }
    },
    onError: (e: any) => toast.error(e.message || "Upload failed"),
  });
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(f);
      });
      await uploadBanner.mutateAsync({ base64, mimeType: f.type });
    } finally {
      setUploading(false);
    }
  };
  return (
    <label
      className="w-full h-full flex flex-col items-center justify-center gap-3 cursor-pointer group/cta"
      style={{ background: "linear-gradient(135deg, oklch(0.10 0.03 270), oklch(0.12 0.04 280))" }}
    >
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(201,168,76,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover/cta:scale-110"
        style={{ background: "rgba(201,168,76,0.1)", border: "1.5px solid rgba(201,168,76,0.4)" }}
      >
        {uploading
          ? <Loader2 size={22} className="animate-spin" style={{ color: "#c9a84c" }} />
          : <Upload size={22} style={{ color: "#c9a84c" }} />}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color: "#c9a84c", fontFamily: "'Cinzel', serif" }}>
          {uploading ? "Uploading…" : "Upload Banner"}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Define your profile presence</p>
      </div>
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
    </label>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const creatorId = parseInt(id || "0");
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState("5");
  const [showBannerPositioner, setShowBannerPositioner] = useState(false);
  const [bannerPos, setBannerPos] = useState({ x: 50, y: 50 });
  // AI focal point — set when a new banner is uploaded via the BannerUploadCTA
  const [aiFocalPos, setAiFocalPos] = useState<{ x: number; y: number } | null>(null);
  const { addAndPlay, playQueueAt, openNowPlayingPanel, state: playerState, currentTrackId } = usePlayer();
  // Use currentTrackId (derived from currentIdx) — NOT tracks[0] which always points to the
  // first track in the queue regardless of which track is actively playing.
  const playingId = playerState.isPlaying && currentTrackId ? parseInt(currentTrackId) : null;

  const { data, isLoading, refetch } = trpc.profile.getCreator.useQuery(
    { creatorId },
    { enabled: !!creatorId, refetchOnWindowFocus: false }
  );

  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (d) => {
      if (d.url) { window.open(d.url, "_blank"); toast.info("Redirecting to checkout..."); }
      setTipOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });
  const connectMutation = trpc.tips.connectOnboarding.useMutation({
    onSuccess: (d: { url: string }) => { window.open(d.url, "_blank"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const deleteMutation = trpc.songs.delete.useMutation({
    onSuccess: () => { toast.success("Song deleted"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const playMutation = trpc.songs.play.useMutation();

  // ── Witness Network — MUST be before any early returns (Rules of Hooks) ──────
  const utils = trpc.useUtils();
  const creatorIdForWitness = data?.creator?.id ?? 0;
  const witnessStatusQuery = trpc.witness.status.useQuery(
    { creatorId: creatorIdForWitness },
    { enabled: !!user && !!data && user.id !== data?.creator?.id }
  );
  // Banner reposition (must be before early returns — Rules of Hooks)
  const bannerPosInitRef = useRef(false);
  const updateBannerPosition = trpc.profile.update.useMutation({
    onSuccess: () => { toast.success("Banner position saved"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const witnessToggle = trpc.witness.toggle.useMutation({
    onSuccess: (result) => {
      utils.witness.status.invalidate({ creatorId: creatorIdForWitness });
      utils.witness.count.invalidate({ creatorId: creatorIdForWitness });
      toast.success(result.witnessing
        ? `You are now witnessing ${data?.creator?.artistHandle || data?.creator?.name}`
        : "Witness removed from your network"
      );
    },
  });
  const isWitnessingCreator = witnessStatusQuery.data?.witnessing ?? false;
  const witnessCount = witnessStatusQuery.data?.count ?? 0;
  const { data: creatorCollections } = trpc.songs.getCollectionsByCreator.useQuery(
    { creatorId },
    { enabled: !!creatorId }
  );

  const handlePlay = (song: any) => {
    if (!song.fileUrl) { toast.error("No audio file available"); return; }
    // Build queue from all this creator's public songs so playback continues
    const creatorSongs = (data?.songs || []).filter((s: any) => !!s.fileUrl);
    if (creatorSongs.length > 1) {
      const queue = creatorSongs.map((s: { id: number; title: string; fileUrl: string; coverArtUrl?: string; genre?: string; witnessId?: string; coverPositionX?: number; coverPositionY?: number }) => ({
        id: String(s.id),
        title: s.title,
        artist: data?.creator?.artistHandle || data?.creator?.name || "Unknown",
        genre: s.genre || "",
        audioUrl: s.fileUrl!,
        artUrl: s.coverArtUrl || undefined,
        witnessId: s.witnessId || undefined,
        aiDisclosure: (data?.creator as any)?.aiDisclosure || undefined,
        creatorId: (data?.creator as any)?.id ?? undefined,
        coverPositionX: s.coverPositionX ?? 50,
        coverPositionY: s.coverPositionY ?? 50,
      }));
      const startIdx = queue.findIndex((t: any) => t.id === String(song.id));
      playQueueAt(queue, startIdx >= 0 ? startIdx : 0, "CREATOR_PAGE");
    } else {
      addAndPlay({
        id: String(song.id),
        title: song.title,
        artist: data?.creator?.artistHandle || data?.creator?.name || "Unknown",
        genre: song.genre || "",
        artUrl: song.coverArtUrl || undefined,
        audioUrl: song.fileUrl || undefined,
        aiDisclosure: (data?.creator as any)?.aiDisclosure || undefined,
        creatorId: (data?.creator as any)?.id ?? undefined,
        coverPositionX: song.coverPositionX ?? 50,
        coverPositionY: song.coverPositionY ?? 50,
      });
    }
    playMutation.mutate({ songId: song.id });
    // Open the Now Playing side panel immediately on mobile
    openNowPlayingPanel();
  };

  const handleTip = () => {
    const cents = Math.round(parseFloat(tipAmount) * 100);
    if (!cents || cents < 100) { toast.error("Minimum gift is $1.00"); return; }
    const firstSong = songs[0];
    if (!firstSong) { toast.error("No songs to gift on this profile"); return; }
    tipMutation.mutate({ songId: (firstSong as any).id, amountCents: cents, origin: window.location.origin });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.09 0.04 265)" }}>
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-full mx-auto animate-pulse" style={{ background: "oklch(0.75 0.18 85 / 0.3)" }} />
        <p className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>Loading profile...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.09 0.04 265)" }}>
      <div className="text-center">
        <p style={{ color: "oklch(0.6 0.04 280)" }}>Creator not found.</p>
        <Link href="/">
          <Button className="mt-4" style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>Go Home</Button>
        </Link>
      </div>
    </div>
  );

  const { creator, songs } = data;
  const isOwner = user?.id === creator.id;
  // Sync bannerPos from loaded creator data (only once on load)
  if (!bannerPosInitRef.current && (creator.bannerPositionX != null || creator.bannerPositionY != null)) {
    bannerPosInitRef.current = true;
    setBannerPos({ x: creator.bannerPositionX ?? 50, y: creator.bannerPositionY ?? 50 });
  }
  const saveBannerPosition = (pos: { x: number; y: number; zoom?: number }) => {
    setBannerPos({ x: pos.x, y: pos.y });
    setShowBannerPositioner(false);
    updateBannerPosition.mutate({ bannerPositionX: pos.x, bannerPositionY: pos.y });
  };

  const featuredSongs = songs.slice(0, 8);
  const totalPlays = songs.reduce((acc: number, s: any) => acc + (s.playCount || 0), 0);
  const totalTips = songs.reduce((acc: number, s: any) => acc + (s.tipCount || 0), 0);
  const tipsEnabled = creator.stripeAccountStatus === "enabled";

  const profileTitle = `${creator.artistHandle || creator.name || "Artist"} — Living Nexus`;
  const profileDesc = creator.bio
    ? creator.bio.slice(0, 160)
    : `${songs.length} track${songs.length !== 1 ? "s" : ""} on Living Nexus`;
  const profileImage = creator.profilePhotoUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";
  const profileUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.09 0.04 265)" }}>
      <Helmet>
        <title>{profileTitle}</title>
        <meta name="description" content={profileDesc} />
        <meta property="og:title" content={profileTitle} />
        <meta property="og:description" content={profileDesc} />
        <meta property="og:image" content={profileImage} />
        <meta property="og:url" content={profileUrl} />
        <meta property="og:type" content="profile" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={profileTitle} />
        <meta name="twitter:description" content={profileDesc} />
        <meta name="twitter:image" content={profileImage} />
      </Helmet>
      {/* ═══════════════════════════════════════════════════════════════
           BANNER + AVATAR HERO SECTION
           Structure:
             • Outer wrapper: position:relative, holds banner + avatar
             • Banner: absolute fill (z-0), responsive height via padding-bottom trick
             • Bottom fade: absolute overlay (z-10)
             • Gold corner accents + reposition button: z-10
             • Avatar: absolute, bottom-0, translated down 50% (z-20)
             • Profile content: separate div below, pt accounts for avatar overhang
         ═══════════════════════════════════════════════════════════════ */}

      {/* ── Hero: banner (bg) + avatar (absolute overlay) ── */}
      <div
        className="relative w-full group"
        style={{
          /* Responsive banner height: 180px mobile → 260px desktop */
          height: "clamp(180px, 30vw, 260px)",
          borderTop: "2px solid rgba(201,168,76,0.6)",
          borderBottom: "2px solid #c9a84c",
          boxShadow: "0 1px 0 0 #c9a84c, 0 -1px 0 0 #c9a84c, inset 0 0 0 1px rgba(201,168,76,0.35)",
        }}
      >
        {/* ── z-0: Banner image / empty state ── */}
        {creator.bannerUrl ? (
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${creator.bannerUrl})`,
              backgroundSize: (creator as any).bannerZoom && (creator as any).bannerZoom > 100
                ? `${(creator as any).bannerZoom}%`
                : "cover",
              backgroundPosition: `${bannerPos.x}% ${bannerPos.y}%`,
              backgroundRepeat: "no-repeat",
            }}
          />
        ) : isOwner ? (
          <div className="absolute inset-0 z-0">
            <BannerUploadCTA onFocalDetected={(focal) => { setAiFocalPos(focal); setShowBannerPositioner(true); }} />
          </div>
        ) : (
          <div
            className="absolute inset-0 z-0"
            style={{ background: "linear-gradient(135deg, oklch(0.12 0.04 280) 0%, oklch(0.1 0.03 300) 40%, oklch(0.08 0.02 85) 100%)" }}
          >
            <div
              className="w-full h-full opacity-10"
              style={{
                backgroundImage: "linear-gradient(oklch(0.75 0.18 85 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(0.75 0.18 85 / 0.3) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        )}

        {/* ── z-10: Bottom fade gradient ── */}
        <div className="absolute inset-x-0 bottom-0 h-24 z-10 bg-gradient-to-t from-[oklch(0.08_0.01_280)] to-transparent pointer-events-none" />

        {/* ── z-10: Gold corner accents ── */}
        <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none z-10" style={{ borderTop: "3px solid #c9a84c", borderLeft: "3px solid #c9a84c" }} />
        <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none z-10" style={{ borderTop: "3px solid #c9a84c", borderRight: "3px solid #c9a84c" }} />
        <div className="absolute bottom-0 left-0 w-12 h-12 pointer-events-none z-10" style={{ borderBottom: "3px solid #c9a84c", borderLeft: "3px solid #c9a84c" }} />
        <div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none z-10" style={{ borderBottom: "3px solid #c9a84c", borderRight: "3px solid #c9a84c" }} />

        {/* ── z-10: Reposition button (owner only, hover) ── */}
        {isOwner && creator.bannerUrl && (
          <button
            onClick={() => setShowBannerPositioner(true)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-white text-[11px] font-body
              opacity-0 group-hover:opacity-100 transition-opacity z-10"
            style={{
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(201,168,76,0.4)",
              color: "#c9a84c",
            }}
          >
            <Move size={12} />
            Reposition
          </button>
        )}

        {/* ── z-20: Avatar — absolute, overlapping banner bottom by 50% ── */}
        <div
          className="absolute left-4 sm:left-6 bottom-0 translate-y-1/2 z-20"
          style={{
            width: "clamp(80px, 12vw, 128px)",
            height: "clamp(80px, 12vw, 128px)",
          }}
        >
          <div
            className="w-full h-full rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(135deg, oklch(0.2 0.04 280), oklch(0.25 0.06 300))",
              /* Ring: dark bg outline so avatar pops off the banner */
              outline: "4px solid oklch(0.09 0.04 265)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.25)",
            }}
          >
            {creator.profilePhotoUrl
              ? <img src={creator.profilePhotoUrl} alt={creator.name ?? ""} className="w-full h-full object-cover"
                  style={{ objectPosition: (creator as any).avatarObjectPosition ?? "50% 50%" }} />
              : <div className="w-full h-full flex items-center justify-center text-4xl font-bold" style={{ color: "oklch(0.84 0.155 85)" }}>
                  {(creator.artistHandle || creator.name || "?").charAt(0).toUpperCase()}
                </div>}
          </div>
        </div>
      </div>

      {/* ── Banner inline repositioner ── */}
      {showBannerPositioner && creator.bannerUrl && (
        <ImagePositioner
          imageUrl={creator.bannerUrl}
          initialX={aiFocalPos?.x ?? bannerPos.x}
          initialY={aiFocalPos?.y ?? bannerPos.y}
          initialZoom={110}
          aiFocal={!!aiFocalPos}
          previewHeight="16rem"
          roundedTop={false}
          label="Reposition Banner"
          onSave={(pos: { x: number; y: number; zoom: number }) => { setAiFocalPos(null); saveBannerPosition(pos); }}
          onCancel={() => setShowBannerPositioner(false)}
        />
      )}

      {/* ── Profile header (below banner) ── */}
      <div
        className="w-full"
        style={{
          background: "oklch(0.09 0.04 265)",
          borderBottom: "1px solid oklch(0.15 0.015 280)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/*
            pt accounts for avatar overhang (50% of avatar height).
            Avatar height is clamp(80px,12vw,128px) → max overhang = 64px.
            We use pt-20 (80px) to give a comfortable 16px breathing room.
          */}
          <div className="flex items-start gap-4 sm:gap-6 pt-20 pb-7">
            {/* Spacer column — same width as avatar so text starts to the right */}
            <div
              className="flex-shrink-0"
              style={{ width: "clamp(80px, 12vw, 128px)" }}
              aria-hidden="true"
            />

            {/* ── Identity block — left-anchored ── */}
            <div className="flex-1 min-w-0 pt-1">
              {/* Name row */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-3xl sm:text-4xl font-bold leading-tight"
                  style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}
                >
                  {creator.artistHandle || creator.name}
                </h1>
                {creator.licenseStatus === "licensed" && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded tracking-widest font-mono"
                    style={{ background: "oklch(0.75 0.18 85 / 0.12)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.75 0.18 85 / 0.25)" }}
                  >
                    LICENSED
                  </span>
                )}
              </div>

              {/* Bio — single line, muted */}
              {creator.bio && (
                <p
                  className="text-sm mt-2 line-clamp-2"
                  style={{ color: "oklch(0.55 0.03 280)" }}
                >
                  {creator.bio}
                </p>
              )}

              {/* Social links — icon-only, minimal */}
              {(creator.website || creator.twitterHandle || creator.instagramHandle || creator.youtubeHandle) && (
                <div className="flex items-center gap-3 mt-3">
                  {creator.website && (
                    <a href={creator.website} target="_blank" rel="noreferrer"
                      className="opacity-40 hover:opacity-80 transition-opacity"
                      style={{ color: "oklch(0.75 0.03 280)" }}
                      title={creator.website}
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {creator.twitterHandle && (
                    <a href={`https://twitter.com/${creator.twitterHandle}`} target="_blank" rel="noreferrer"
                      className="opacity-40 hover:opacity-80 transition-opacity"
                      style={{ color: "oklch(0.75 0.03 280)" }}
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {creator.instagramHandle && (
                    <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noreferrer"
                      className="opacity-40 hover:opacity-80 transition-opacity"
                      style={{ color: "oklch(0.75 0.03 280)" }}
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {creator.youtubeHandle && (
                    <a href={`https://youtube.com/@${creator.youtubeHandle}`} target="_blank" rel="noreferrer"
                      className="opacity-40 hover:opacity-80 transition-opacity"
                      style={{ color: "oklch(0.75 0.03 280)" }}
                    >
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* ── Right column: signals + actions ── */}
            <div className="flex-shrink-0 flex flex-col items-end gap-3 pt-1">

              {/* Signals — minimal, right-aligned */}
              <div className="flex items-center gap-3">
                {creator.supporterTier && (
                  <SupporterBadge tier={creator.supporterTier as "covenant" | "patron" | "supporter"} linkToFounders />
                )}
                <span className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>
                  <span style={{ color: "oklch(0.75 0.03 280)", fontVariantNumeric: "tabular-nums" }}>{songs.length}</span>
                  {" "}tracks
                </span>
                {witnessCount > 0 && (
                  <span className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>
                    <span style={{ color: "oklch(0.75 0.03 280)", fontVariantNumeric: "tabular-nums" }}>{witnessCount}</span>
                    {" "}witnesses
                  </span>
                )}
              </div>

              {/* Actions — icon row */}
              <div className="flex items-center gap-1.5">
                {isOwner ? (
                  <>
                    <Link href="/dashboard">
                      <button
                        className="px-4 py-2 rounded-lg text-xs transition-colors"
                        style={{ border: "1px solid oklch(0.22 0.015 280)", color: "oklch(0.6 0.03 280)", background: "transparent" }}
                      >
                        Edit Profile
                      </button>
                    </Link>
                    {!creator.stripeAccountId && (
                      <button
                        onClick={() => connectMutation.mutate({ returnUrl: window.location.href })}
                        disabled={connectMutation.isPending}
                        className="px-4 py-2 rounded-lg text-xs transition-colors"
                        style={{ border: "1px solid oklch(0.65 0.18 145 / 0.3)", color: "oklch(0.65 0.18 145)", background: "oklch(0.65 0.18 145 / 0.08)" }}
                      >
                        <DollarSign className="w-3 h-3 inline mr-1" />Enable Gifts
                      </button>
                    )}
                  </>
                ) : tipsEnabled && songs.length > 0 ? (
                  <button
                    onClick={() => setTipOpen(true)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "oklch(0.08 0.015 280)" }}
                  >
                    <DollarSign className="w-3 h-3 inline mr-1" />Send a Gift
                  </button>
                ) : null}
                {user && !isOwner && (
                  <button
                    onClick={() => witnessToggle.mutate({ creatorId: creator.id })}
                    disabled={witnessToggle.isPending}
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                    style={isWitnessingCreator
                      ? { background: "oklch(0.75 0.18 85 / 0.12)", border: "1px solid oklch(0.75 0.18 85 / 0.3)", color: "oklch(0.84 0.155 85)" }
                      : { border: "1px solid oklch(0.2 0.015 280)", color: "oklch(0.5 0.03 280)", background: "transparent" }
                    }
                    title={isWitnessingCreator ? "Remove witness" : "Witness this creator"}
                  >
                    {isWitnessingCreator ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Profile link copied!"); }}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ border: "1px solid oklch(0.2 0.015 280)", color: "oklch(0.5 0.03 280)", background: "transparent" }}
                  title="Copy profile link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* ── Featured Songs Grid ── */}
        {featuredSongs.length > 0 && (
          <section className="py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
                Featured Songs
              </h2>
              {songs.length > 8 && (
                <button className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity" style={{ color: "oklch(0.65 0.2 300)" }}>
                  See All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {featuredSongs.map((song: any) => (
                <FeaturedCard key={song.id} song={song} onPlay={() => handlePlay(song)} isPlaying={playingId === song.id} />
              ))}
            </div>
          </section>
        )}

        {/* ── Albums (grouped by albumName) ── */}
        {(() => {
          // Build albumMap keyed by albumName, sorted by trackOrder within each album
          const albumMap = new Map<string, any[]>();
          songs.forEach((song: any) => {
            if (song.albumName) {
              if (!albumMap.has(song.albumName)) albumMap.set(song.albumName, []);
              albumMap.get(song.albumName)!.push(song);
            }
          });
          // Sort each album's tracks by trackOrder (preserves batch upload sequence)
          albumMap.forEach((albumSongs) => {
            albumSongs.sort((a: any, b: any) => (a.trackOrder ?? 0) - (b.trackOrder ?? 0));
          });
          // Build a map from albumName → collection record so we use the collection's own coverArtUrl
          const collectionByAlbum = new Map<string, any>();
          if (creatorCollections) {
            (creatorCollections as any[]).forEach((col: any) => {
              if (col.name) collectionByAlbum.set(col.name, col);
            });
          }
          const albumEntries = Array.from(albumMap.entries());
          if (!albumEntries.length) return null;
          return (
            <section className="py-4">
              <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Albums</h2>
              <div className="space-y-5">
                {albumEntries.map(([albumName, albumSongs]) => {
                  // Prefer the collection's own cover art; fall back to first track's cover
                  const collection = collectionByAlbum.get(albumName);
                  const albumCoverUrl = collection?.coverArtUrl || albumSongs[0]?.coverArtUrl;
                  const albumCoverX = collection?.coverPositionX ?? albumSongs[0]?.coverPositionX ?? 50;
                  const albumCoverY = collection?.coverPositionY ?? albumSongs[0]?.coverPositionY ?? 50;
                  return (
                  <div key={albumName} className="rounded-xl overflow-hidden" style={{ background: "oklch(0.10 0.04 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    <div className="flex items-center gap-4 p-4" style={{ borderBottom: "1px solid oklch(0.16 0.01 280)" }}>
                      {albumCoverUrl ? (
                        <img src={albumCoverUrl} alt={albumName} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" style={{ objectPosition: `${albumCoverX}% ${albumCoverY}%` }} />
                      ) : (
                        <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.75 0.18 85 / 0.15)" }}>
                          <Music className="w-6 h-6" style={{ color: "oklch(0.84 0.155 85)" }} />
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-sm" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>{albumName}</p>
                        <p className="text-xs mt-0.5" style={{ color: "oklch(0.5 0.03 280)" }}>{albumSongs.length} track{albumSongs.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="space-y-0.5 p-2">
                      {albumSongs.map((song: any, idx: number) => (
                        <SongRow
                          key={song.id}
                          song={song}
                          index={idx}
                          isPlaying={playingId === song.id}
                          onPlay={() => handlePlay(song)}
                          isOwner={isOwner}
                          onDelete={(id) => deleteMutation.mutate({ songId: id })}
                        />
                      ))}
                    </div>
                  </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ── Registered Collections ── */}
        {creatorCollections && creatorCollections.length > 0 && (
          <section className="py-4">
            <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.84 0.155 85)" }}>
              <Library className="inline w-4 h-4 mr-2 mb-0.5" />
              Registered Collections
            </h2>
            <div className="space-y-3">
              {(creatorCollections as any[]).map((col: any) => (
                <a
                  key={col.id}
                  href={`/verify/${col.collectionWid}`}
                  className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/5"
                  style={{ border: "1px solid oklch(0.84 0.155 85 / 0.2)", background: "oklch(0.10 0.04 280)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "oklch(0.84 0.155 85 / 0.12)" }}
                  >
                    <Library className="w-5 h-5" style={{ color: "oklch(0.84 0.155 85)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
                      {col.name}
                    </p>
                    <p className="text-xs font-mono truncate mt-0.5" style={{ color: "oklch(0.84 0.155 85)" }}>
                      {col.collectionWid}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: "oklch(0.5 0.04 280)" }}>
                      {col.trackCount ?? "?"} tracks
                    </p>
                    <ExternalLink className="w-3.5 h-3.5 mt-1 ml-auto" style={{ color: "oklch(0.84 0.155 85 / 0.5)" }} />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
        {/* ── Full Song List (all songs in compact row format) ── */}
        {songs.length > 0 && (
          <section className="py-4 pb-32">
            <h2 className="text-base font-bold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
              All Songs
            </h2>
            <div className="space-y-0.5">
              {songs.map((song: any, idx: number) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={idx}
                  isPlaying={playingId === song.id}
                  onPlay={() => handlePlay(song)}
                  isOwner={isOwner}
                  onDelete={(id) => deleteMutation.mutate({ songId: id })}
                />
              ))}
            </div>
          </section>
        )}

        {songs.length === 0 && (
          <div className="text-center py-24">
            <Music className="w-16 h-16 mx-auto mb-4 opacity-10" style={{ color: "oklch(0.84 0.155 85)" }} />
            <p className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>No public songs yet.</p>
            {isOwner && (
              <Link href="/upload">
                <Button className="mt-4" style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>
                  Upload Your First Track
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ── Tip Modal ── */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent style={{ background: "oklch(0.12 0.015 280)", border: "1px solid oklch(0.25 0.02 280)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
              Gift {creator.artistHandle || creator.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "oklch(0.6 0.04 280)" }}>
              90% goes directly to the artist. 10% supports the Living Nexus platform.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {["1", "5", "10", "25"].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTipAmount(amt)}
                  className="py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: tipAmount === amt ? "oklch(0.84 0.155 85)" : "oklch(0.11 0.025 270)",
                    color: tipAmount === amt ? "oklch(0.08 0.015 280)" : "oklch(0.7 0.04 280)",
                    border: "1px solid oklch(0.25 0.02 280)",
                  }}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Custom amount ($)"
              value={tipAmount}
              onChange={e => setTipAmount(e.target.value)}
              min="1"
              step="0.01"
              style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)", color: "oklch(0.9 0.01 280)" }}
            />
            <Button
              className="w-full"
              onClick={handleTip}
              disabled={tipMutation.isPending}
              style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}
            >
              {tipMutation.isPending ? "Processing..." : `Send $${tipAmount || "0"} Gift`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
