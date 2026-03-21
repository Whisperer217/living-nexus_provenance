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
  ChevronRight, Headphones, Twitter, Instagram, Youtube,
} from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";

// ─── Context Menu ─────────────────────────────────────────────────────────────
interface ContextMenuProps {
  song: any;
  isOwner: boolean;
  onClose: () => void;
  onDelete?: (id: number) => void;
  position: { x: number; y: number };
}
function SongContextMenu({ song, isOwner, onClose, onDelete, position }: ContextMenuProps) {
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/song/${song.id}`);
    toast.success("Link copied!");
    onClose();
  };
  const downloadMutation = trpc.songs.download.useMutation({
    onSuccess: (data) => { if (data.url) window.open(data.url, "_blank"); onClose(); },
    onError: (e) => { toast.error(e.message); onClose(); },
  });

  return (
    <div
      className="fixed z-50 min-w-[200px] rounded-xl overflow-hidden shadow-2xl py-1"
      style={{ top: position.y, left: position.x, background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)" }}
    >
      <Link href={`/song/${song.id}`} onClick={onClose}>
        <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "oklch(0.85 0.02 280)" }}>
          <ExternalLink className="w-4 h-4 opacity-60" /> Song Page
        </button>
      </Link>
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
  );
}

// ─── Featured Song Card ────────────────────────────────────────────────────────
function FeaturedCard({ song, onPlay, isPlaying }: { song: any; onPlay: () => void; isPlaying: boolean }) {
  return (
    <Link href={`/song/${song.id}`}>
      <div
        className="relative rounded-xl overflow-hidden cursor-pointer group"
        style={{ aspectRatio: "1/1", background: "oklch(0.14 0.015 280)" }}
      >
        {song.coverArtUrl ? (
          <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, oklch(0.14 0.02 280), oklch(0.18 0.04 300))" }}>
            <Music className="w-10 h-10 opacity-20" style={{ color: "oklch(0.84 0.155 85)" }} />
          </div>
        )}
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
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "oklch(0.11 0.025 270)" }}>
          {song.coverArtUrl
            ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" />
            : <Music className="w-4 h-4 opacity-30" style={{ color: "oklch(0.84 0.155 85)" }} />}
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

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const creatorId = parseInt(id || "0");
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState("5");
  const { addAndPlay, playQueueAt, openNowPlayingPanel, state: playerState } = usePlayer();
  const playingId = playerState.isPlaying && playerState.tracks[0]?.id ? parseInt(playerState.tracks[0].id) : null;

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

  const handlePlay = (song: any) => {
    if (!song.fileUrl) { toast.error("No audio file available"); return; }
    // Build queue from all this creator's public songs so playback continues
    const creatorSongs = (data?.songs || []).filter((s: any) => !!s.fileUrl);
    if (creatorSongs.length > 1) {
      const queue = creatorSongs.map((s: any) => ({
        id: String(s.id),
        title: s.title,
        artist: data?.creator?.artistHandle || data?.creator?.name || "Unknown",
        genre: s.genre || "",
        audioUrl: s.fileUrl!,
        artUrl: s.coverArtUrl || undefined,
        witnessId: s.witnessId || undefined,
        aiDisclosure: (data?.creator as any)?.aiDisclosure || undefined,
      }));
      const startIdx = queue.findIndex(t => t.id === String(song.id));
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
      });
    }
    playMutation.mutate({ songId: song.id });
    // Open the Now Playing side panel immediately on mobile
    openNowPlayingPanel();
  };

  const handleTip = () => {
    const cents = Math.round(parseFloat(tipAmount) * 100);
    if (!cents || cents < 100) { toast.error("Minimum tip is $1.00"); return; }
    const firstSong = songs[0];
    if (!firstSong) { toast.error("No songs to tip on this profile"); return; }
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
      {/* ── Banner ── */}
      <div className="relative w-full" style={{ height: "240px" }}>
        {creator.bannerUrl ? (
          <img src={creator.bannerUrl} alt="banner" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
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
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[oklch(0.08_0.01_280)] to-transparent" />
      </div>

      {/* ── Profile header ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div
          className="relative -mt-16 flex flex-col sm:flex-row sm:items-end gap-4 pb-6 border-b"
          style={{ borderColor: "oklch(0.15 0.015 280)" }}
        >
          {/* Avatar */}
          <div
            className="w-28 h-28 rounded-2xl flex-shrink-0 flex items-center justify-center text-3xl font-bold overflow-hidden"
            style={{
              background: "linear-gradient(135deg, oklch(0.2 0.04 280), oklch(0.25 0.06 300))",
              outline: "4px solid oklch(0.09 0.04 265)",
            }}
          >
            {creator.profilePhotoUrl
              ? <img src={creator.profilePhotoUrl} alt={creator.name ?? ""} className="w-full h-full object-cover" />
              : <span style={{ color: "oklch(0.84 0.155 85)" }}>{(creator.artistHandle || creator.name || "?").charAt(0).toUpperCase()}</span>}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
              {creator.artistHandle || creator.name}
            </h1>
            {creator.bio && (
              <p className="text-sm mt-1 line-clamp-2 max-w-xl" style={{ color: "oklch(0.6 0.04 280)" }}>{creator.bio}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {creator.website && (
                <a href={creator.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                  <Globe className="w-3 h-3" />{creator.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {creator.twitterHandle && (
                <a href={`https://twitter.com/${creator.twitterHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                  <Twitter className="w-3 h-3" />@{creator.twitterHandle}
                </a>
              )}
              {creator.instagramHandle && (
                <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                  <Instagram className="w-3 h-3" />@{creator.instagramHandle}
                </a>
              )}
              {creator.youtubeHandle && (
                <a href={`https://youtube.com/@${creator.youtubeHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#E2E8F0" }}>
                  <Youtube className="w-3 h-3" />@{creator.youtubeHandle}
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {creator.licenseStatus === "licensed" && (
                <Badge style={{ background: "oklch(0.75 0.18 85 / 0.15)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.75 0.18 85 / 0.3)", fontSize: "10px" }}>
                  LICENSED CREATOR
                </Badge>
              )}
              {tipsEnabled && (
                <Badge style={{ background: "oklch(0.65 0.18 145 / 0.15)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.65 0.18 145 / 0.3)", fontSize: "10px" }}>
                  TIPS ENABLED
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwner ? (
              <>
                <Link href="/dashboard">
                  <Button size="sm" variant="outline" style={{ borderColor: "oklch(0.3 0.02 280)", color: "oklch(0.7 0.04 280)" }}>
                    Edit Profile
                  </Button>
                </Link>
                {!creator.stripeAccountId && (
                  <Button
                    size="sm"
                    onClick={() => connectMutation.mutate({ returnUrl: window.location.href })}
                    disabled={connectMutation.isPending}
                    style={{ background: "oklch(0.65 0.18 145 / 0.2)", color: "oklch(0.65 0.18 145)", border: "1px solid oklch(0.65 0.18 145 / 0.4)" }}
                  >
                    <DollarSign className="w-3.5 h-3.5 mr-1" /> Enable Tips
                  </Button>
                )}
              </>
            ) : tipsEnabled && songs.length > 0 ? (
              <Button size="sm" onClick={() => setTipOpen(true)} style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)" }}>
                <DollarSign className="w-3.5 h-3.5 mr-1" /> Tip Artist
              </Button>
            ) : null}
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Profile link copied!"); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors"
              style={{ border: "1px solid oklch(0.2 0.015 280)" }}
            >
              <Share2 className="w-4 h-4" style={{ color: "oklch(0.6 0.04 280)" }} />
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-4 gap-4 py-5 border-b" style={{ borderColor: "oklch(0.15 0.015 280)" }}>
          {[
            { label: "Songs", value: songs.length, icon: Music },
            { label: "Total Plays", value: totalPlays.toLocaleString(), icon: Headphones },
            { label: "Tips Received", value: totalTips, icon: Heart },
            { label: "WID Protected", value: songs.filter((s: any) => s.witnessId).length, icon: Shield },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 opacity-50" style={{ color: "oklch(0.84 0.155 85)" }} />
                <span className="text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>{label}</span>
              </div>
              <p className="text-xl font-bold" style={{ fontFamily: "'Orbitron', monospace", color: "oklch(0.9 0.02 85)" }}>{value}</p>
            </div>
          ))}
        </div>

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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {featuredSongs.map((song: any) => (
                <FeaturedCard key={song.id} song={song} onPlay={() => handlePlay(song)} isPlaying={playingId === song.id} />
              ))}
            </div>
          </section>
        )}

        {/* ── Albums (grouped by albumName) ── */}
        {(() => {
          const albumMap = new Map<string, any[]>();
          songs.forEach((song: any) => {
            if (song.albumName) {
              if (!albumMap.has(song.albumName)) albumMap.set(song.albumName, []);
              albumMap.get(song.albumName)!.push(song);
            }
          });
          const albumEntries = Array.from(albumMap.entries());
          if (!albumEntries.length) return null;
          return (
            <section className="py-4">
              <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>Albums</h2>
              <div className="space-y-5">
                {albumEntries.map(([albumName, albumSongs]) => (
                  <div key={albumName} className="rounded-xl overflow-hidden" style={{ background: "oklch(0.10 0.04 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                    <div className="flex items-center gap-4 p-4" style={{ borderBottom: "1px solid oklch(0.16 0.01 280)" }}>
                      {albumSongs[0]?.coverArtUrl ? (
                        <img src={albumSongs[0].coverArtUrl} alt={albumName} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
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
                ))}
              </div>
            </section>
          );
        })()}

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
              Tip {creator.artistHandle || creator.name}
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
              {tipMutation.isPending ? "Processing..." : `Send $${tipAmount || "0"} Tip`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
