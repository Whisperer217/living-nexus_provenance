/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — CreatorProfilePage (v2)
   Living Nexus: full-bleed banner, avatar overlay, stats row,
   featured songs grid (8-up), full song list with context menu,
   tip jar, social links. Divine Noir aesthetic.
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
// Card width is responsive via CSS variable --card-pan-w
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Music, Play, Pause, Shield, Globe, DollarSign, ExternalLink,
  Copy, Heart, Share2, MoreHorizontal, Download, Trash2,
  ChevronRight, Headphones, Twitter, Instagram, Youtube, Eye, EyeOff,
  Library, Move, Upload, Loader2, Crown, Sparkles, Wand2, ClipboardCopy, ChevronDown, BookOpen, Camera,
  Bell, BellPlus,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ImagePositioner } from "@/components/ImagePositioner";
import SupporterBadge from "@/components/SupporterBadge";
import { CovenantBadge, DeclarationModal } from "@/components/DeclarationModal";
import { usePlayer } from "@/contexts/PlayerContext";
import { AddToMyListModal } from "@/components/AddToMyListModal";
import { MediaAsset } from "@/components/MediaAsset";
import { QRShareModal } from "@/components/QRIdentityCard";
import { FeaturedBookModel } from "@/components/reader/FeaturedBookModel";
import { HorizontalBookReader, type BookPage } from "@/components/reader/HorizontalBookReader";
import { DomainRenderer } from "@/components/domain/DomainRenderer";
import { DomainEditor } from "@/components/domain/DomainEditor";
import { CreatorIdentitySection } from "@/components/CreatorIdentitySection";
import { ManifestationShelf, StandaloneShelf, type ShelfTrack } from "@/components/ManifestationShelf";
import { LayoutGrid } from "lucide-react";

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
  const [addToListRect, setAddToListRect] = useState<DOMRect | null>(null);

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
        visualReady: song.visualReady ?? false,
        autoVideoUrl: song.autoVideoUrl ?? undefined,
      creatorHandle: song.creatorHandle || undefined,
    });
    toast.success(`"${song.title}" plays next`);
    onClose();
  };

  return (
    <>
      <div
        className="fixed z-50 min-w-[200px] rounded-xl overflow-hidden shadow-2xl py-1"
        style={{ top: position.y, left: position.x, background: "var(--ln-coal)", border: "1px solid #C3AB7D" }}
      >
        <Link href={`/song/${song.id}`} onClick={onClose}>
          <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
            <ExternalLink className="w-4 h-4 opacity-60" /> Song Page
          </button>
        </Link>

        {/* ── Queue / Collection actions ── */}
        <div className="my-1 border-t" style={{ borderColor: "rgba(196,154,40,0.12)" }} />
        {song.audioUrl && (
          <button
            onClick={handlePlayNext}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
            style={{ color: "var(--ln-parchment)" }}
          >
            <Play className="w-4 h-4 opacity-60" /> Play Next
          </button>
        )}
        <button
          onClick={e => { setAddToListRect((e.currentTarget as HTMLButtonElement).getBoundingClientRect()); setShowAddToList(true); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
          style={{ color: "var(--ln-parchment)" }}
        >
          <Library className="w-4 h-4 opacity-60" /> Add to My List
        </button>

        <div className="my-1 border-t" style={{ borderColor: "rgba(196,154,40,0.12)" }} />
        <button type="button" onClick={copyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "var(--ln-parchment)" }}>
          <Copy className="w-4 h-4 opacity-60" /> Copy Link
        </button>
        <button
          onClick={() => { downloadMutation.mutate({ songId: song.id }); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left"
          style={{ color: "var(--ln-parchment)" }}
        >
          <Download className="w-4 h-4 opacity-60" /> Download
        </button>
        {song.witnessId && (
          <Link href={`/verify/${song.witnessId}`} onClick={onClose}>
            <button type="button" className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.06] transition-colors text-left" style={{ color: "var(--ln-gold)" }}>
              <Shield className="w-4 h-4" /> View Witness ID
            </button>
          </Link>
        )}
        {isOwner && (
          <>
            <div className="my-1 border-t" style={{ borderColor: "rgba(196,154,40,0.12)" }} />
            <button
              onClick={() => { onDelete?.(song.id); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-500/10 transition-colors text-left"
              style={{ color: "var(--ln-ember)" }}
            >
              <Trash2 className="w-4 h-4" /> Delete Song
            </button>
          </>
        )}
      </div>
      <AddToMyListModal
        open={showAddToList}
        songId={song.id}
        songTitle={song.title}
        onClose={() => { setShowAddToList(false); onClose(); }}
        originRect={addToListRect}
      />
    </>
  );
}

// ─── Featured Song Card ────────────────────────────────────────────────────────
function FeaturedCard({ song, onPlay, isPlaying }: { song: any; onPlay: () => void; isPlaying: boolean }) {
  return (
    <div
      className={`group museum-card parchment-grain cursor-pointer ${
        isPlaying ? "museum-card--active" : ""
      }`}
      style={isPlaying ? undefined : { borderColor: "rgba(196,154,40,0.2)", boxShadow: "0 2px 8px rgba(0,0,0,0.35), 0 0 0 1px rgba(196,154,40,0.15)" }}
    >
      <Link href={`/song/${song.id}`}>
        <div className="prov-card-img-wrap">
          <MediaAsset
            src={song.coverArtUrl}
            alt={song.title}
            mode="card"
            aspectRatio={(song.artAspectRatio as "1:1" | "4:5" | "16:9" | null) ?? "4:5"}
            focalX={song.coverPositionX ?? 50}
            focalY={song.coverPositionY ?? 50}
          />
          <div className="prov-card-gradient" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
            <button
              onClick={(e) => { e.preventDefault(); onPlay(); }}
              className="w-12 h-12 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
              style={{ background: "var(--ln-gold)" }}
            >
              {isPlaying
                ? <Pause className="w-5 h-5" style={{ color: "var(--ln-parchment)" }} />
                : <Play className="w-5 h-5 ml-0.5" style={{ color: "var(--ln-parchment)" }} />}
            </button>
          </div>
          {song.durationSeconds && (
            <div className="absolute bottom-2 left-2 text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(0,0,0,0.7)", color: "var(--ln-parchment)" }}>
              {Math.floor(song.durationSeconds / 60)}:{String(Math.round(song.durationSeconds % 60)).padStart(2, "0")}
            </div>
          )}
          {song.witnessId && (
            <Link href={`/verify/${song.witnessId}`} onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="absolute bottom-2 left-2 flex items-center gap-0.5 type-overline px-1.5 py-0.5 rounded z-10 font-heading tracking-wider wid-glow transition-opacity opacity-90 hover:opacity-100"
              style={{ background: "rgba(0,0,0,0.72)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.5)" }}
            >
              <Shield size={8} /><span>WID</span>
            </Link>
          )}
          {song.aiConsent === "prohibited" && (
            <div className="absolute top-2 left-2 text-[11px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.85)", color: "white" }}>
              AI OFF
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="type-ui font-heading text-white/90 truncate mb-0.5 tracking-wide hover:text-[#C49A28] transition-colors" style={{ fontFamily: "'Cinzel', serif" }}>{song.title}</p>
          {song.genre && <p className="type-caption truncate" style={{ color: "var(--ln-smoke)" }}>{song.genre}</p>}
        </div>
      </Link>
    </div>
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
                <div key={i} className="w-0.5 rounded-full" style={{
                  height: `${8 + i * 3}px`,
                  background: "var(--ln-gold)",
                  animationName: "pulse",
                  animationDuration: "2s",
                  animationTimingFunction: "cubic-bezier(0.4, 0, 0.6, 1)",
                  animationIterationCount: "infinite",
                  animationDelay: `${i * 0.1}s`,
                }} />
              ))}
            </div>
          ) : (
            <>
              <span className="text-xs group-hover:hidden" style={{ color: "#E2E8F0" }}>{index + 1}</span>
              <Play className="w-3.5 h-3.5 hidden group-hover:block" style={{ color: "var(--ln-gold)" }} />
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
          <p className="text-sm font-medium truncate" style={{ color: isPlaying ? "var(--ln-gold)" : "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{song.title}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {song.genre && <span className="text-xs" style={{ color: "var(--ln-smoke)" }}>{song.genre}</span>}
            {song.witnessId && (
              <Link
                href={`/verify/${song.witnessId}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <Badge className="type-overline px-1 py-0 cursor-pointer hover:opacity-80 transition-opacity" style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.2)" }}>
                  <Shield className="w-2.5 h-2.5 mr-0.5" /> WID
                </Badge>
              </Link>
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
          <MoreHorizontal className="w-4 h-4" style={{ color: "var(--ln-smoke)" }} />
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
      style={{ background: "linear-gradient(135deg, #111111, #000000)" }}
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
  const [, navigate] = useLocation();
  const creatorId = parseInt(id || "0");
  const [tipOpen, setTipOpen] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [showDomainEditor, setShowDomainEditor] = useState(false);
  const [tipAmount, setTipAmount] = useState("5");
  const [avatarImgError, setAvatarImgError] = useState(false);
  const [witnessNetworkOpen, setWitnessNetworkOpen] = useState(false);
  const [witnessNetworkTab, setWitnessNetworkTab] = useState<"witnessing" | "witnesses">("witnesses");
  const [showBannerPositioner, setShowBannerPositioner] = useState(false);
  const [bannerPos, setBannerPos] = useState({ x: 50, y: 50 });
  // AI focal point — set when a new banner is uploaded via the BannerUploadCTA
  const [aiFocalPos, setAiFocalPos] = useState<{ x: number; y: number } | null>(null);
  // Prompt Studio (3-tab: identity_regen | style_prompt_studio | archive)
  const [showPromptStudio, setShowPromptStudio] = useState(false);
  const [psTab, setPsTab] = useState<"identity_regen" | "style_prompt_studio" | "import_anchor" | "archive">("identity_regen");
  const [psPlatform, setPsPlatform] = useState<"suno" | "udio" | "general">("suno");
  const [psPromptType, setPsPromptType] = useState<"style_prompt" | "lyric_brief" | "composer_blueprint" | "visual_direction" | "press_bio">("style_prompt");
  const [psResult, setPsResult] = useState<{ expressionId: string | null; expressionPrompt: string | null; expressionStyleTags: string | null; expressionComposerNote: string | null; expressionGeneratedAt: Date | null; toneFrequencyNote?: string | null; dominantKey?: string | null; tempoRange?: string | null; energyProfile?: string | null; lineageVersion?: number; promptMode?: string } | null>(null);
  // Style Prompt Studio — user's own inspiration blocks
  const [psInputBlocks, setPsInputBlocks] = useState<{ label: string; content: string }[]>([
    { label: "Lyrics / Inspiration", content: "" },
  ]);
  const [showLineage, setShowLineage] = useState(false);

  // Auto-open Prompt Studio when navigated via sidebar ?openPromptStudio=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("openPromptStudio") === "1") {
      setShowPromptStudio(true);
      // Clean the query param from the URL without reload
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);
  // Handle Stripe tip success redirect on creator profile
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tip") === "success") {
      setTipSuccess(true);
      toast.success("🙏 Your gift was sent! The creator receives 90% directly.", { duration: 8000 });
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => setTipSuccess(false), 8000);
    }
  }, []);
  const { addAndPlay, playQueueAt, openNowPlayingPanel, state: playerState, currentTrackId } = usePlayer();
  // Use currentTrackId (derived from currentIdx) — NOT tracks[0] which always points to the
  // first track in the queue regardless of which track is actively playing.
  const playingId = playerState.isPlaying && currentTrackId ? parseInt(currentTrackId) : null;

  const { data, isLoading, refetch } = trpc.profile.getCreator.useQuery(
    { creatorId },
    { enabled: !!creatorId, refetchOnWindowFocus: false }
  );

  const tipMutation = trpc.tips.createCreatorTipCheckout.useMutation({
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

  // ── Build stats — admin profile + honored contributors ────────────────────
  // Honored handles receive the 🐛 BUGS KILLED pill as a gift from the platform.
  const HONORED_BUG_KILLERS = ["slimdoggy", "moshai"];
  const isAdminProfile = (data as any)?.creator?.role === "admin";
  const profileHandle = ((data as any)?.creator?.artistHandle ?? "").toLowerCase();
  const isHonoredBugKiller = HONORED_BUG_KILLERS.includes(profileHandle);
  const showBugKillPill = isAdminProfile || isHonoredBugKiller;
  const buildStatsQuery = trpc.platform.getBuildStats.useQuery(undefined, {
    enabled: showBugKillPill,
    staleTime: Infinity,
  });

  // ── Witness Network — MUST be before any early returns (Rules of Hooks) ──────
  const utils = trpc.useUtils();
  const creatorIdForWitness = data?.creator?.id ?? 0;
  const witnessStatusQuery = trpc.witness.status.useQuery(
    { creatorId: creatorIdForWitness },
    { enabled: !!user && !!data && user.id !== data?.creator?.id }
  );
  // Banner reposition (must be before early returns — Rules of Hooks)
  const bannerPosInitRef = useRef(false);
  const changeBannerInputRef = useRef<HTMLInputElement>(null);
  const [changeBannerUploading, setChangeBannerUploading] = useState(false);
  const updateBannerPosition = trpc.profile.update.useMutation({
    onSuccess: () => { toast.success("Banner position saved"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });
  const changeBannerMutation = trpc.profile.uploadBanner.useMutation({
    onSuccess: (data) => {
      utils.profile.getCreator.invalidate();
      toast.success("Banner updated");
      if (data?.focalX !== undefined && data?.focalY !== undefined) {
        setAiFocalPos({ x: data.focalX, y: data.focalY });
        setShowBannerPositioner(true);
      }
    },
    onError: (e: any) => toast.error(e.message || "Upload failed"),
  });
  const handleChangeBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setChangeBannerUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((res, rej) => {
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(f);
      });
      await changeBannerMutation.mutateAsync({ base64, mimeType: f.type });
    } finally {
      setChangeBannerUploading(false);
      if (changeBannerInputRef.current) changeBannerInputRef.current.value = "";
    }
  };
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

  // ── Witness Subscription System ─────────────────────────────────────────────
  const [showSubscribeTierMenu, setShowSubscribeTierMenu] = useState(false);
  const { data: mySubscription, refetch: refetchSubscription } = trpc.witnessSubscription.getSubscription.useQuery(
    { creatorId: creatorIdForWitness },
    { enabled: !!user && !!data && user.id !== data?.creator?.id && creatorIdForWitness > 0, staleTime: 30_000 }
  );
  const { data: subscriberCountData } = trpc.witnessSubscription.getCreatorSubscriberCount.useQuery(
    { creatorId: creatorIdForWitness },
    { enabled: creatorIdForWitness > 0, staleTime: 60_000 }
  );
  const subscriberCount = subscriberCountData?.count ?? 0;
  const subscribeMutation = trpc.witnessSubscription.subscribe.useMutation({
    onSuccess: (result) => {
      refetchSubscription();
      utils.witnessSubscription.getCreatorSubscriberCount.invalidate({ creatorId: creatorIdForWitness });
      const tierLabel = result.tier === "witness" ? "Witness" : result.tier === "reserve" ? "Reserve" : "Steward";
      toast.success(`You are now a ${tierLabel} of ${data?.creator?.artistHandle || data?.creator?.name}`);
      setShowSubscribeTierMenu(false);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const unsubscribeMutation = trpc.witnessSubscription.unsubscribe.useMutation({
    onSuccess: () => {
      refetchSubscription();
      utils.witnessSubscription.getCreatorSubscriberCount.invalidate({ creatorId: creatorIdForWitness });
      toast.success("Unsubscribed from creator feed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Public witness network for this creator (witnessing list + witnesses list)
  const { data: witnessNetwork } = trpc.witness.publicNetwork.useQuery(
    { creatorId },
    { enabled: witnessNetworkOpen && creatorId > 0, staleTime: 30_000 }
  );
  // Fetch existing EID for this creator (public query)
  const { data: existingExpression, refetch: refetchExpression } = trpc.promptStudio.getProfileExpression.useQuery(
    { creatorId },
    { enabled: creatorId > 0, staleTime: 60_000 }
  );
  const { data: lineageHistory = [] } = trpc.promptStudio.getLineageHistory.useQuery(
    { creatorId },
    { enabled: creatorId > 0 && (psTab === "archive" || showLineage), staleTime: 30_000 }
  );
  // Declaration status for this creator (public)
  const { data: creatorDeclaration } = trpc.declaration.creatorStatus.useQuery(
    { userId: creatorId },
    { enabled: creatorId > 0, staleTime: 300_000 }
  );
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  // Inline book reader
  const [readerSong, setReaderSong] = useState<{ id: number; title: string; pagesJson: string } | null>(null);

  const generateExpressionMutation = trpc.promptStudio.generateFromProfile.useMutation({
    onSuccess: (result) => { setPsResult({ ...result, promptMode: "identity_regen" }); refetchExpression(); },
    onError: (e: any) => toast.error(e.message),
  });
  const generateStylePromptMutation = trpc.promptStudio.generateStylePrompt.useMutation({
    onSuccess: (result) => { setPsResult({ ...result, promptMode: "style_prompt" }); refetchExpression(); },
    onError: (e: any) => toast.error(e.message),
  });
  // Import & Anchor state
  const [psAnchorRaw, setPsAnchorRaw] = useState("");
  const [psAnchorSource, setPsAnchorSource] = useState<"Suno" | "Udio" | "Udio v2" | "Stable Audio" | "General">("Suno");
  const [psAnchorTarget, setPsAnchorTarget] = useState<"Suno" | "Udio" | "General">("Suno");
  const [psAnchorResult, setPsAnchorResult] = useState<{ anchoredPrompt: string; styleTags: string; composerNote: string; fusionNote: string; sourcePlatform: string; targetPlatform: string; eid: string; version: number } | null>(null);
  const anchorMutation = trpc.promptStudio.anchorExternalPrompt.useMutation({
    onSuccess: (result) => { setPsAnchorResult(result); },
    onError: (e: any) => toast.error(e.message),
  });
  const [savedDraftId, setSavedDraftId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [showDraftNameInput, setShowDraftNameInput] = useState(false);
  const saveDraftMutation = trpc.promptStudio.saveDraft.useMutation({
    onSuccess: (d) => { setSavedDraftId(d.id); setShowDraftNameInput(false); toast.success("Draft saved!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const shareMutation = trpc.promptStudio.sharePrompt.useMutation({
    onSuccess: (d) => { navigator.clipboard.writeText(d.shareUrl); toast.success("Share link copied!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteDraftMutation = trpc.promptStudio.deleteDraft.useMutation({
    onSuccess: () => { refetchDrafts(); toast.success("Draft deleted."); },
    onError: (e: any) => toast.error(e.message),
  });
  const revokeShareMutation = trpc.promptStudio.revokeShare.useMutation({
    onSuccess: () => { refetchDrafts(); toast.success("Share link revoked. This prompt is now private."); },
    onError: (e: any) => toast.error(e.message),
  });
  const { data: myDrafts = [], refetch: refetchDrafts } = trpc.promptStudio.getDrafts.useQuery(
    undefined,
    { enabled: !!user, staleTime: 30_000 }
  );
  const { data: creatorTestimonies = [] } = trpc.testimony.getByCreator.useQuery(
    { creatorId, limit: 10 },
    { enabled: creatorId > 0, staleTime: 60_000 }
  );
  const { data: creatorCollections } = trpc.songs.getCollectionsByCreator.useQuery(
    { creatorId },
    { enabled: !!creatorId }
  );
  const { data: creatorProjects = [] } = trpc.projects.getByCreator.useQuery(
    { userId: creatorId },
    { enabled: creatorId > 0, staleTime: 60_000 }
  );
  const { data: galleryData } = trpc.imageGallery.forCreator.useQuery(
    { creatorId, limit: 24 },
    { enabled: creatorId > 0, staleTime: 60_000 }
  );
  const galleryImages = galleryData?.items ?? [];

  const handlePlay = (song: any) => {
    // Books and comics are not audio — navigate to their reader page
    if (song.contentType === "manuscript" || song.contentType === "comic") {
      window.location.href = `/book/${song.id}`;
      return;
    }
    if (!song.fileUrl) { toast.error("No audio file available"); return; }
    // Build queue from all this creator's public AUDIO songs so playback continues
    const creatorSongs = (data?.songs || []).filter((s: any) => !!s.fileUrl && s.contentType !== "manuscript" && s.contentType !== "comic");
    if (creatorSongs.length > 1) {
      const queue = creatorSongs.map((s: { id: number; title: string; fileUrl: string; coverArtUrl?: string; genre?: string; witnessId?: string; coverPositionX?: number; coverPositionY?: number; visualReady?: boolean; autoVideoUrl?: string | null; contentType?: string }) => ({
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
          visualReady: s.visualReady ?? false,
          autoVideoUrl: s.autoVideoUrl ?? undefined,
          creatorRole: (data?.creator as any)?.role ?? undefined,
          contentType: (s.contentType ?? "audio") as "audio" | "lyrics" | "manuscript" | "comic",
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
        visualReady: song.visualReady ?? false,
        autoVideoUrl: song.autoVideoUrl ?? undefined,
        creatorRole: (data?.creator as any)?.role ?? undefined,
        contentType: (song.contentType ?? "audio") as "audio" | "lyrics" | "manuscript" | "comic",
      });
    }
    playMutation.mutate({ songId: song.id });
    // Open the Now Playing side panel immediately on mobile
    openNowPlayingPanel();
  };

  // ── Shelf play handler: maps ShelfTrack[] → player queue, calls playQueueAt ──
  const handleShelfPlay = (track: ShelfTrack, albumTracks: ShelfTrack[]) => {
    if (!track.fileUrl) { toast.error("No audio file available"); return; }
    const playableTracks = albumTracks.filter((t) => !!t.fileUrl);
    const artistName = data?.creator?.artistHandle || data?.creator?.name || "Unknown";
    if (playableTracks.length > 1) {
      const queue = playableTracks.map((t) => ({
        id: String(t.id),
        title: t.title,
        artist: artistName,
        genre: t.genre || "",
        audioUrl: t.fileUrl!,
        artUrl: t.coverArtUrl || undefined,
        witnessId: t.witnessId || undefined,
        aiDisclosure: (data?.creator as any)?.aiDisclosure || undefined,
        creatorId: (data?.creator as any)?.id ?? undefined,
        coverPositionX: t.coverPositionX ?? 50,
        coverPositionY: t.coverPositionY ?? 50,
        visualReady: false,
        autoVideoUrl: undefined,
        creatorRole: (data?.creator as any)?.role ?? undefined,
        contentType: ((t.contentType ?? "audio") as "audio" | "lyrics" | "manuscript" | "comic"),
      }));
      const startIdx = queue.findIndex((q) => q.id === String(track.id));
      playQueueAt(queue, startIdx >= 0 ? startIdx : 0, "CREATOR_PAGE");
    } else {
      addAndPlay({
        id: String(track.id),
        title: track.title,
        artist: artistName,
        genre: track.genre || "",
        artUrl: track.coverArtUrl || undefined,
        audioUrl: track.fileUrl || undefined,
        aiDisclosure: (data?.creator as any)?.aiDisclosure || undefined,
        creatorId: (data?.creator as any)?.id ?? undefined,
        coverPositionX: track.coverPositionX ?? 50,
        coverPositionY: track.coverPositionY ?? 50,
        visualReady: false,
        autoVideoUrl: undefined,
        creatorRole: (data?.creator as any)?.role ?? undefined,
        contentType: ((track.contentType ?? "audio") as "audio" | "lyrics" | "manuscript" | "comic"),
      });
    }
    playMutation.mutate({ songId: track.id });
    openNowPlayingPanel();
  };

  // ── Play All handler: queues entire album from track 0 ──────────────────────
  const handleShelfPlayAll = (albumTracks: ShelfTrack[]) => {
    const playableTracks = albumTracks.filter((t) => !!t.fileUrl);
    if (!playableTracks.length) { toast.error("No playable tracks in this album"); return; }
    const artistName = data?.creator?.artistHandle || data?.creator?.name || "Unknown";
    const queue = playableTracks.map((t) => ({
      id: String(t.id),
      title: t.title,
      artist: artistName,
      genre: t.genre || "",
      audioUrl: t.fileUrl!,
      artUrl: t.coverArtUrl || undefined,
      witnessId: t.witnessId || undefined,
      aiDisclosure: (data?.creator as any)?.aiDisclosure || undefined,
      creatorId: (data?.creator as any)?.id ?? undefined,
      coverPositionX: t.coverPositionX ?? 50,
      coverPositionY: t.coverPositionY ?? 50,
      visualReady: false,
      autoVideoUrl: undefined,
      creatorRole: (data?.creator as any)?.role ?? undefined,
      contentType: ((t.contentType ?? "audio") as "audio" | "lyrics" | "manuscript" | "comic"),
    }));
    playQueueAt(queue, 0, "CREATOR_PAGE");
    openNowPlayingPanel();
  };

  const handleTip = () => {
    const cents = Math.round(parseFloat(tipAmount) * 100);
    if (!cents || cents < 100) { toast.error("Minimum gift is $1.00"); return; }
    tipMutation.mutate({ creatorId: creator.id, amountCents: cents, origin: window.location.origin });
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
      <div className="space-y-2 text-center">
        <div className="w-12 h-12 rounded-full mx-auto animate-pulse" style={{ background: "rgba(196,154,40,0.25)" }} />
        <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>Loading profile...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-coal)" }}>
      <div className="text-center">
        <p style={{ color: "var(--ln-smoke)" }}>Creator not found.</p>
        <Link href="/">
          <Button className="mt-4" style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>Go Home</Button>
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
  const witnessedWorksCount = songs.filter((s: any) => !!s.witnessId).length;

  const profileTitle = `${creator.artistHandle || creator.name || "Artist"} — Living Nexus`;
  const profileDesc = creator.bio
    ? creator.bio.slice(0, 160)
    : `${songs.length} track${songs.length !== 1 ? "s" : ""} on Living Nexus`;
  const profileImage = creator.profilePhotoUrl || "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/ln-navbar-icon-180_b914f927.png";
  const profileUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-coal)" }}>
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

      {/* ── Tip success banner ── */}
      {tipSuccess && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
          <div
            className="rounded-2xl p-5 text-center"
            style={{
              background: "rgba(196,154,40,0.06)",
              border: "1px solid rgba(196,154,40,0.3)",
            }}
          >
            <div className="text-2xl mb-2">🙏</div>
            <p className="font-heading text-base mb-1" style={{ color: "var(--ln-gold)" }}>
              Gift received — thank you!
            </p>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              The creator receives 90% of your gift directly. Your support is recorded on Living Nexus.
            </p>
            <button
              type="button"
              onClick={() => setTipSuccess(false)}
              className="mt-3 text-xs opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: "var(--ln-gold)" }}
            >
              Dismiss ✕
            </button>
          </div>
        </div>
      )}
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
              /* Cap zoom at 100% — values ≥ 100 fall back to cover so the image
                 always fills the banner without zooming past its natural size */
              backgroundSize: (creator as any).bannerZoom && (creator as any).bannerZoom < 100
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
            style={{ background: "linear-gradient(135deg, #111111 0%, #000000 40%, #000000 100%)" }}
          >
            <div
              className="w-full h-full opacity-10"
              style={{
                backgroundImage: "linear-gradient(rgba(196,154,40,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(196,154,40,0.25) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>
        )}

        {/* ── z-10: Bottom fade gradient ── */}
        <div className="absolute inset-x-0 bottom-0 h-24 z-10 bg-gradient-to-t from-[#000000] to-transparent pointer-events-none" />

        {/* ── z-10: Gold corner accents ── */}
        <div className="absolute top-0 left-0 w-12 h-12 pointer-events-none z-10" style={{ borderTop: "3px solid #c9a84c", borderLeft: "3px solid #c9a84c" }} />
        <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none z-10" style={{ borderTop: "3px solid #c9a84c", borderRight: "3px solid #c9a84c" }} />
        <div className="absolute bottom-0 left-0 w-12 h-12 pointer-events-none z-10" style={{ borderBottom: "3px solid #c9a84c", borderLeft: "3px solid #c9a84c" }} />
        <div className="absolute bottom-0 right-0 w-12 h-12 pointer-events-none z-10" style={{ borderBottom: "3px solid #c9a84c", borderRight: "3px solid #c9a84c" }} />

        {/* ── z-10: Banner edit controls (owner only, hover) ── */}
        {isOwner && creator.bannerUrl && (
          <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {/* Change Banner — triggers hidden file input */}
            <label
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer text-[11px] font-body"
              style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}
              title="Upload a new banner image"
            >
              {changeBannerUploading
                ? <Loader2 size={12} className="animate-spin" />
                : <Camera size={12} />}
              {changeBannerUploading ? "Uploading…" : "Change Banner"}
              <input
                ref={changeBannerInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleChangeBannerFile}
                disabled={changeBannerUploading}
              />
            </label>
            {/* Reposition */}
            <button
              onClick={() => setShowBannerPositioner(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-body"
              style={{ background: "rgba(0,0,0,0.65)", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}
            >
              <Move size={12} />
              Reposition
            </button>
          </div>
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
              background: "linear-gradient(135deg, #111111, #000000)",
              /* Ring: dark bg outline so avatar pops off the banner */
              outline: "4px solid #000000",
              boxShadow: "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.25)",
            }}
          >
            {creator.profilePhotoUrl && !avatarImgError
              ? <img src={creator.profilePhotoUrl} alt={creator.name ?? ""} className="w-full h-full object-cover"
                  style={{ objectPosition: (creator as any).avatarObjectPosition ?? "50% 50%" }}
                  onError={() => setAvatarImgError(true)} />
              : <div className="w-full h-full flex items-center justify-center text-4xl font-bold" style={{ color: "var(--ln-gold)" }}>
                  {(creator.artistHandle || creator.name || "D").charAt(0).toUpperCase()}
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
          background: "var(--ln-coal)",
          borderBottom: "1px solid rgba(196,154,40,0.08)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/*
            pt accounts for avatar overhang (50% of avatar height).
            Avatar height is clamp(80px,12vw,128px) → max overhang = 64px.
            We use pt-20 (80px) to give a comfortable 16px breathing room.
          */}
          {/* Responsive header: stacks on mobile, side-by-side on sm+ */}
          {/* Mobile: pt-24 gives space for avatar overhang (80px) + breathing room */}
          <div className="pt-24 sm:pt-20 pb-7">
            {/* Desktop: spacer + identity side-by-side; Mobile: full-width stacked */}
            <div className="hidden sm:flex items-start gap-6">
              {/* Desktop spacer column */}
              <div className="flex-shrink-0" style={{ width: "clamp(80px, 12vw, 128px)" }} aria-hidden="true" />
              {/* Desktop identity + right-col */}
              <div className="flex-1 min-w-0 flex flex-row items-start gap-4">

              {/* ── Identity block ── */}
              <div className="flex-1 min-w-0 pt-1">
                {/* Name — wraps gracefully on narrow screens */}
                <h1
                  className="text-2xl sm:text-4xl font-bold leading-tight select-text break-words"
                  style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
                >
                  {creator.name || creator.artistHandle}
                </h1>
                {/* Badges row — always below the name, never inline with it */}
                {((creator as any).role === "founder" || creator.licenseStatus === "licensed") && (
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {(creator as any).role === "founder" && (
                      <span
                        title="Founding Creator"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest"
                        style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }}
                      >
                        <Crown className="w-3 h-3" />
                        FOUNDER
                      </span>
                    )}
                    {creator.licenseStatus === "licensed" && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded tracking-widest font-mono"
                        style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.2)" }}
                      >
                        LICENSED
                      </span>
                    )}
                  </div>
                )}

                {/* @handle sub-header — clickable hyperlink like Twitter, copies profile URL */}
                {creator.artistHandle && (
                  <button
                    className="mt-0.5 text-sm font-mono transition-colors hover:text-[#C49A28] focus:outline-none"
                    style={{ color: "var(--ln-iron)", letterSpacing: "0.01em" }}
                    title="Copy profile link"
                    onClick={() => {
                      const url = `${window.location.origin}/creator/${creator.id}`;
                      navigator.clipboard.writeText(url).then(() =>
                        toast.success("Profile link copied")
                      ).catch(() => toast.error("Could not copy"));
                    }}
                  >
                    @{creator.artistHandle}
                  </button>
                )}

                {/* Bio — two lines max, muted */}
                {creator.bio && (
                  <p
                    className="text-sm mt-2 line-clamp-3 leading-relaxed"
                    style={{ color: "var(--ln-smoke)", border: "none", outline: "none" }}
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
                        style={{ color: "var(--ln-parchment)" }}
                        title={creator.website}
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    {creator.twitterHandle && (
                      <a href={`https://twitter.com/${creator.twitterHandle}`} target="_blank" rel="noreferrer"
                        className="opacity-40 hover:opacity-80 transition-opacity"
                        style={{ color: "var(--ln-parchment)" }}
                      >
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {creator.instagramHandle && (
                      <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noreferrer"
                        className="opacity-40 hover:opacity-80 transition-opacity"
                        style={{ color: "var(--ln-parchment)" }}
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {creator.youtubeHandle && (
                      <a href={`https://youtube.com/@${creator.youtubeHandle}`} target="_blank" rel="noreferrer"
                        className="opacity-40 hover:opacity-80 transition-opacity"
                        style={{ color: "var(--ln-parchment)" }}
                      >
                        <Youtube className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
                {/* EID badge — show on profile header if creator has one */}
                {existingExpression?.expressionId && (
                  <div
                    className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)", maxWidth: "fit-content" }}
                    onClick={() => { setPsResult(null); setShowPromptStudio(true); }}
                    title="View Expression Identity"
                  >
                    <Shield className="w-3 h-3 flex-shrink-0" style={{ color: "#a78bfa" }} />
                    <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(167,139,250,0.6)" }}>EID</span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: "#a78bfa" }}>{existingExpression.expressionId}</span>
                    {existingExpression.toneFrequencyNote && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(245,196,81,0.08)", color: "rgba(245,196,81,0.6)", border: "1px solid rgba(245,196,81,0.15)" }}>
                        {existingExpression.toneFrequencyNote}
                      </span>
                    )}
                  </div>
                )}
                {/* Covenant Badge — inside identity block, below EID */}
                {creatorDeclaration?.hasSigned && (
                  <div className="mt-2">
                    <CovenantBadge signedAt={creatorDeclaration.signedAt} />
                  </div>
                )}
                {/* Owner CTA — sign if not yet signed */}
                {isOwner && !creatorDeclaration?.hasSigned && (
                  <button
                    onClick={() => setShowDeclarationModal(true)}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-600/70 hover:text-amber-400 transition-colors"
                  >
                    <span>Sign the Living Nexus Declaration →</span>
                  </button>
                )}
              </div>{/* end identity block */}

              {/* ── Right column: signals + actions ── */}
              <div className="flex-shrink-0 flex flex-col items-end gap-2.5 pt-1">

                {/* Signals — stats row */}
                <div className="flex items-center gap-2.5 flex-wrap justify-end">
                  {creator.supporterTier && (
                    <SupporterBadge tier={creator.supporterTier as "covenant" | "patron" | "supporter"} linkToFounders />
                  )}
                  {/* WITNESSED testimony pill */}
                  {witnessedWorksCount > 0 && (
                    <span
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono tracking-widest"
                      style={{ background: "rgba(245,196,81,0.1)", color: "#F5C451", border: "1px solid rgba(245,196,81,0.3)" }}
                      title={`${witnessedWorksCount} works registered on the Living Nexus provenance registry`}
                    >
                      <Shield className="w-2.5 h-2.5" />
                      WITNESSED &middot; {witnessedWorksCount}
                    </span>
                  )}
                  <span className="text-sm" style={{ color: "var(--ln-smoke)" }}>
                    <span style={{ color: "var(--ln-parchment)", fontVariantNumeric: "tabular-nums" }}>{songs.length}</span>
                    {" "}tracks
                  </span>
                  {witnessCount > 0 && (
                    <button
                      className="text-sm transition-colors hover:text-[#C49A28] focus:outline-none"
                      style={{ color: "var(--ln-smoke)" }}
                      onClick={() => { setWitnessNetworkTab("witnesses"); setWitnessNetworkOpen(true); }}
                      title="View witnesses"
                    >
                      <span style={{ color: "var(--ln-parchment)", fontVariantNumeric: "tabular-nums" }}>{witnessCount}</span>
                      {" "}witnesses
                    </button>
                  )}
                  {/* Bug-kill tracker — admin + honored contributors */}
                  {showBugKillPill && buildStatsQuery.data && (
                    <span
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono tracking-widest select-none cursor-default"
                      style={{ background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.30)" }}
                      title={`${buildStatsQuery.data.bugsFixed} bugs squashed across ${buildStatsQuery.data.totalCommits} commits`}
                    >
                      <span style={{ fontSize: "10px" }}>🐛</span>
                      BUGS KILLED &middot; {buildStatsQuery.data.bugsFixed}
                    </span>
                  )}
                </div>

                {/* Actions — button row */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {/* Provenance Prompt Generator — visible to ALL visitors */}
                  <button
                    onClick={() => { setPsResult(null); setShowPromptStudio(true); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
                    title="Open Provenance Prompt Generator"
                  >
                    <Sparkles className="w-3 h-3" />
                    Provenance Prompt Generator
                  </button>
                  {isOwner ? (
                    <>
                      <Link href="/profile">
                        <button
                          className="px-4 py-2 rounded-lg text-xs transition-colors"
                          style={{ border: "1px solid rgba(196,154,40,0.15)", color: "var(--ln-smoke)", background: "transparent" }}
                        >
                          Edit Profile
                        </button>
                      </Link>
                      {!creator.stripeAccountId && (
                        <button
                          onClick={() => connectMutation.mutate({ returnUrl: window.location.href })}
                          disabled={connectMutation.isPending}
                          className="px-4 py-2 rounded-lg text-xs transition-colors"
                          style={{ border: "1px solid rgba(74,222,128,0.28)", color: "var(--ln-seal-bright)", background: "rgba(74,222,128,0.08)" }}
                        >
                          <DollarSign className="w-3 h-3 inline mr-1" />Enable Gifts
                        </button>
                      )}
                    </>
                  ) : tipsEnabled ? (
                    <button
                      onClick={() => setTipOpen(true)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "var(--ln-parchment)" }}
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
                        ? { background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.25)", color: "var(--ln-gold)" }
                        : { border: "1px solid rgba(196,154,40,0.12)", color: "var(--ln-smoke)", background: "transparent" }
                      }
                      title={isWitnessingCreator ? "Remove witness" : "Witness this creator"}
                    >
                      {isWitnessingCreator ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                  {/* Witness Subscription button — desktop */}
                  {user && !isOwner && (
                    <div className="relative">
                      {mySubscription ? (
                        <button
                          onClick={() => unsubscribeMutation.mutate({ creatorId: creator.id })}
                          disabled={unsubscribeMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)", color: "#a5b4fc" }}
                          title={`Subscribed as ${mySubscription.tier} — click to unsubscribe`}
                        >
                          <Bell className="w-3 h-3" />
                          {mySubscription.tier === "witness" ? "Witness" : mySubscription.tier === "reserve" ? "Reserve" : "Steward"}
                        </button>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() => setShowSubscribeTierMenu(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--ln-smoke)" }}
                            title="Subscribe to this creator's publication feed"
                          >
                            <BellPlus className="w-3 h-3" />
                            Subscribe
                          </button>
                          {showSubscribeTierMenu && (
                            <div
                              className="absolute right-0 top-full mt-1 z-50 rounded-lg overflow-hidden shadow-xl"
                              style={{ background: "var(--ln-coal)", border: "1px solid rgba(99,102,241,0.25)", minWidth: "160px" }}
                            >
                              {(["witness", "reserve", "steward"] as const).map((tier) => (
                                <button
                                  key={tier}
                                  onClick={() => subscribeMutation.mutate({ creatorId: creator.id, tier })}
                                  disabled={subscribeMutation.isPending}
                                  className="w-full text-left px-4 py-2.5 text-xs transition-colors hover:brightness-110"
                                  style={{ color: "var(--ln-parchment)", borderBottom: tier !== "steward" ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                                >
                                  <span className="font-semibold">{tier === "witness" ? "Witness" : tier === "reserve" ? "Reserve" : "Steward"}</span>
                                  <span className="block text-[10px] mt-0.5" style={{ color: "var(--ln-smoke)" }}>
                                    {tier === "witness" ? "Get notified on publish" : tier === "reserve" ? "Archive new works" : "Local vault sync"}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <QRShareModal
                    entity={{
                      type: "creator",
                      id: creator.id,
                      slug: creator.artistHandle || String(creator.id),
                      name: creator.name || creator.artistHandle || "Creator",
                      subtitle: creator.artistHandle ? `@${creator.artistHandle}` : undefined,
                      description: creator.bio ?? undefined,
                      thumbnailUrl: creator.profilePhotoUrl ?? creator.bannerUrl ?? undefined,
                    }}
                    trigger={
                      <button
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                        style={{ border: "1px solid rgba(196,154,40,0.12)", color: "var(--ln-smoke)", background: "transparent" }}
                        title="Share identity card"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    }
                  />
                </div>
              </div>{/* end right column */}

              </div>{/* end desktop identity + right-col wrapper */}
            </div>{/* end desktop flex row */}

            {/* Mobile-only: full-width stacked layout */}
            <div className="sm:hidden flex flex-col gap-3">
              {/* Name — wraps gracefully on narrow screens */}
              <h1
                className="text-2xl font-bold leading-tight select-text break-words"
                style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
              >
                {creator.name || creator.artistHandle}
              </h1>
              {/* Badges row — always below the name */}
              {((creator as any).role === "founder" || creator.licenseStatus === "licensed") && (
                <div className="flex items-center gap-1.5 -mt-1 flex-wrap">
                  {(creator as any).role === "founder" && (
                    <span
                      title="Founding Creator"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest"
                      style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.3)" }}
                    >
                      <Crown className="w-3 h-3" />
                      FOUNDER
                    </span>
                  )}
                  {creator.licenseStatus === "licensed" && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded tracking-widest font-mono"
                      style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.2)" }}
                    >
                      LICENSED
                    </span>
                  )}
                </div>
              )}

              {/* @handle sub-header — clickable hyperlink like Twitter, copies profile URL */}
              {creator.artistHandle && (
                <button
                  className="-mt-1 text-sm font-mono transition-colors hover:text-[#C49A28] focus:outline-none text-left"
                  style={{ color: "var(--ln-iron)", letterSpacing: "0.01em" }}
                  title="Copy profile link"
                  onClick={() => {
                    const url = `${window.location.origin}/creator/${creator.id}`;
                    navigator.clipboard.writeText(url).then(() =>
                      toast.success("Profile link copied")
                    ).catch(() => toast.error("Could not copy"));
                  }}
                >
                  @{creator.artistHandle}
                </button>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 flex-wrap">
                {creator.supporterTier && (
                  <SupporterBadge tier={creator.supporterTier as "covenant" | "patron" | "supporter"} linkToFounders />
                )}
                {/* WITNESSED testimony pill */}
                {witnessedWorksCount > 0 && (
                  <span
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono tracking-widest"
                    style={{ background: "rgba(245,196,81,0.1)", color: "#F5C451", border: "1px solid rgba(245,196,81,0.3)" }}
                    title={`${witnessedWorksCount} works on the Living Nexus provenance registry`}
                  >
                    <Shield className="w-2.5 h-2.5" />
                    WITNESSED &middot; {witnessedWorksCount}
                  </span>
                )}
                <span className="text-sm" style={{ color: "var(--ln-smoke)" }}>
                  <span style={{ color: "var(--ln-parchment)", fontVariantNumeric: "tabular-nums" }}>{songs.length}</span>{" "}tracks
                </span>
                {totalPlays > 0 && (
                  <span className="text-sm" style={{ color: "var(--ln-smoke)" }}>
                    <span style={{ color: "var(--ln-gold)", fontVariantNumeric: "tabular-nums" }}>{totalPlays.toLocaleString()}</span>{" "}plays
                  </span>
                )}
                {witnessCount > 0 && (
                  <button
                    className="text-sm transition-colors hover:text-[#C49A28] focus:outline-none"
                    style={{ color: "var(--ln-smoke)" }}
                    onClick={() => { setWitnessNetworkTab("witnesses"); setWitnessNetworkOpen(true); }}
                    title="View witnesses"
                  >
                    <span style={{ color: "var(--ln-parchment)", fontVariantNumeric: "tabular-nums" }}>{witnessCount}</span>{" "}witnesses
                  </button>
                )}
                {/* Bug-kill tracker — admin + honored contributors */}
                {showBugKillPill && buildStatsQuery.data && (
                  <span
                    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono tracking-widest select-none cursor-default"
                    style={{ background: "rgba(239,68,68,0.10)", color: "#f87171", border: "1px solid rgba(239,68,68,0.30)" }}
                    title={`${buildStatsQuery.data.bugsFixed} bugs squashed across ${buildStatsQuery.data.totalCommits} commits`}
                  >
                    <span style={{ fontSize: "10px" }}>🐛</span>
                    BUGS KILLED &middot; {buildStatsQuery.data.bugsFixed}
                  </span>
                )}
              </div>
              {/* Bio */}
              {creator.bio && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
                  {creator.bio}
                </p>
              )}

              {/* Social links */}
              {(creator.website || creator.twitterHandle || creator.instagramHandle || creator.youtubeHandle) && (
                <div className="flex items-center gap-3">
                  {creator.website && (
                    <a href={creator.website} target="_blank" rel="noreferrer" className="opacity-40 hover:opacity-80 transition-opacity" style={{ color: "var(--ln-parchment)" }}>
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {creator.twitterHandle && (
                    <a href={`https://twitter.com/${creator.twitterHandle}`} target="_blank" rel="noreferrer" className="opacity-40 hover:opacity-80 transition-opacity" style={{ color: "var(--ln-parchment)" }}>
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {creator.instagramHandle && (
                    <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noreferrer" className="opacity-40 hover:opacity-80 transition-opacity" style={{ color: "var(--ln-parchment)" }}>
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {creator.youtubeHandle && (
                    <a href={`https://youtube.com/@${creator.youtubeHandle}`} target="_blank" rel="noreferrer" className="opacity-40 hover:opacity-80 transition-opacity" style={{ color: "var(--ln-parchment)" }}>
                      <Youtube className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Provenance Prompt Generator — visible to ALL visitors */}
                <button
                  onClick={() => { setPsResult(null); setShowPromptStudio(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa" }}
                  title="Open Provenance Prompt Generator"
                >
                  <Sparkles className="w-3 h-3" />
                  Provenance Prompt Generator
                </button>
                {isOwner ? (
                  <>
                    <Link href="/profile">
                      <button
                        className="px-4 py-2 rounded-lg text-xs transition-colors"
                        style={{ border: "1px solid rgba(196,154,40,0.15)", color: "var(--ln-smoke)", background: "transparent" }}
                      >
                        Edit Profile
                      </button>
                    </Link>
                    {!creator.stripeAccountId && (
                      <button
                        onClick={() => connectMutation.mutate({ returnUrl: window.location.href })}
                        disabled={connectMutation.isPending}
                        className="px-4 py-2 rounded-lg text-xs transition-colors"
                        style={{ border: "1px solid rgba(74,222,128,0.28)", color: "var(--ln-seal-bright)", background: "rgba(74,222,128,0.08)" }}
                      >
                        <DollarSign className="w-3 h-3 inline mr-1" />Enable Gifts
                      </button>
                    )}
                  </>
                ) : tipsEnabled ? (
                  <button
                    onClick={() => setTipOpen(true)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: "linear-gradient(135deg, #c9a84c, #e8c96a)", color: "var(--ln-parchment)" }}
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
                      ? { background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.25)", color: "var(--ln-gold)" }
                      : { border: "1px solid rgba(196,154,40,0.12)", color: "var(--ln-smoke)", background: "transparent" }
                    }
                    title={isWitnessingCreator ? "Remove witness" : "Witness this creator"}
                  >
                    {isWitnessingCreator ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
                {/* Witness Subscription button — mobile */}
                {user && !isOwner && (
                  mySubscription ? (
                    <button
                      onClick={() => unsubscribeMutation.mutate({ creatorId: creator.id })}
                      disabled={unsubscribeMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.35)", color: "#a5b4fc" }}
                      title={`Subscribed as ${mySubscription.tier} — click to unsubscribe`}
                    >
                      <Bell className="w-3 h-3" />
                      {mySubscription.tier === "witness" ? "Witness" : mySubscription.tier === "reserve" ? "Reserve" : "Steward"}
                    </button>
                  ) : (
                    <>
                      {(["witness", "reserve", "steward"] as const).map((tier) => (
                        <button
                          key={tier}
                          onClick={() => subscribeMutation.mutate({ creatorId: creator.id, tier })}
                          disabled={subscribeMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all"
                          style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", color: "var(--ln-smoke)" }}
                        >
                          <BellPlus className="w-3 h-3" />
                          {tier === "witness" ? "Witness" : tier === "reserve" ? "Reserve" : "Steward"}
                        </button>
                      ))}
                    </>
                  )
                )}
                <QRShareModal
                  entity={{
                    type: "creator",
                    id: creator.id,
                    slug: creator.artistHandle || String(creator.id),
                    name: creator.name || creator.artistHandle || "Creator",
                    subtitle: creator.artistHandle ? `@${creator.artistHandle}` : undefined,
                    description: creator.bio ?? undefined,
                    thumbnailUrl: creator.profilePhotoUrl ?? creator.bannerUrl ?? undefined,
                  }}
                  trigger={
                    <button
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                      style={{ border: "1px solid rgba(196,154,40,0.12)", color: "var(--ln-smoke)", background: "transparent" }}
                      title="Share identity card"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  }
                />
              </div>
            </div>{/* end mobile stacked layout */}

          </div>{/* end header wrapper */}
        </div>{/* end max-w-5xl */}
      </div>{/* end profile header bg */}

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* ── Creator Identity Section ── */}
        <div className="pt-6">
          <CreatorIdentitySection creator={creator} isOwner={isOwner} />
        </div>
        {/* ── Domain Editor toggle (owner only) ── */}
        {isOwner && (
          <div className="flex justify-end pt-4 pb-2">
            <button
              onClick={() => setShowDomainEditor((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{
                background: showDomainEditor ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${showDomainEditor ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.1)"}`,
                color: showDomainEditor ? "#D4AF37" : "rgba(255,255,255,0.4)",
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {showDomainEditor ? "Close Domain Editor" : "Edit Domain"}
            </button>
          </div>
        )}
        {/* ── Domain Editor panel (owner only) ── */}
        {isOwner && showDomainEditor && (
          <div className="mb-6">
            <DomainEditor userId={creator.id} onClose={() => setShowDomainEditor(false)} />
          </div>
        )}
        {/* ── Domain Renderer (block-based layout) ── */}
        <DomainRenderer userId={creator.id} isOwner={isOwner} />
        {/* ── Projects Section (top priority) ── */}
        {(creatorProjects as any[]).length > 0 && (
          <section className="py-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Projects
              </h2>
              {isOwner && (
                <Link href="/my-projects">
                  <button type="button" className="text-xs px-3 py-1 rounded-lg transition-colors" style={{ color: "var(--ln-gold)", border: "1px solid #7A5A1E" }}>
                    Manage Projects
                  </button>
                </Link>
              )}
            </div>
            {/* Netflix-style horizontal scroll on mobile, grid on desktop */}
            <div className="museum-pan-row -mx-4 px-4">
              <div className="flex gap-4 pb-2" style={{ minWidth: "max-content" }}>
                {(creatorProjects as any[]).map((project: any) => (
                  <Link key={project.id} href={`/project/${project.slug}`}>
                    <div
                      className="prov-card-img-wrap cursor-pointer group flex-shrink-0"
                      style={{ width: "var(--card-pan-w)" }}
                    >
                      {project.bannerUrl ? (
                        <img src={project.bannerUrl} alt={project.title} className="absolute inset-0 w-full h-full object-cover object-center" />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1025] to-[#000000] flex items-center justify-center">
                          <span className="text-4xl font-bold" style={{ color: "rgba(196,154,40,0.15)" }}>{project.title[0]}</span>
                        </div>
                      )}
                      <div className="prov-card-gradient" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200" />
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--ln-parchment)", fontFamily: "'Cinzel', serif" }}>{project.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>
                            ${((project.raisedAmountCents || 0) / 100).toLocaleString()} raised
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                            style={{
                              background: project.status === "active" ? "rgba(34,197,94,0.8)" : "rgba(44,52,56,0.8)",
                              color: project.status === "active" ? "var(--ln-seal-bright)" : "var(--ln-smoke)",
                            }}
                          >
                            {project.status === "active" ? "Funding" : project.status === "completed" ? "Done" : "Draft"}
                          </span>
                        </div>
                        {project.goalAmountCents && project.raisedAmountCents > 0 && (
                          <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "var(--ln-coal)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.round((project.raisedAmountCents / project.goalAmountCents) * 100))}%`,
                                background: "var(--ln-gold)",
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {project.linkedWitnessId && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(196,154,40,0.8)" }}>
                          <Shield className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
        {isOwner && (creatorProjects as any[]).length === 0 && (
          <section className="py-6">
            <h2 className="text-base font-bold mb-3" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Projects</h2>
            <div className="text-center py-10 rounded-xl" style={{ border: "1px dashed #C3AB7D" }}>
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" style={{ color: "var(--ln-gold)" }} />
              <p className="text-sm mb-3" style={{ color: "var(--ln-smoke)" }}>No projects yet.</p>
              <Link href="/my-projects">
                <Button style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>Start a Project</Button>
              </Link>
            </div>
          </section>
        )}
        {/* ── Featured Songs Grid ── */}
        {/* ── Featured Books (comic / manuscript) ── */}
        {(() => {
          const bookWorks = songs.filter((s: any) => s.contentType === "comic" || s.contentType === "manuscript");
          if (!bookWorks.length) return null;
          return (
            <section className="py-6">
              <h2 className="text-base font-bold mb-5" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Works
              </h2>
              <div className="flex flex-wrap gap-6">
                {bookWorks.map((s: any) => (
                  <FeaturedBookModel
                    key={s.id}
                    song={s}
                    onRead={() => {
                      if (s.pagesJson) {
                        setReaderSong({ id: s.id, title: s.title, pagesJson: s.pagesJson });
                      } else {
                        navigate(`/book/${s.id}`);
                      }
                    }}
                  />
                ))}
              </div>
            </section>
          );
        })()}

        {/* ── Inline Book Reader Portal ── */}
        {readerSong && (() => {
          let pages: BookPage[] = [];
          try { pages = JSON.parse(readerSong.pagesJson) as BookPage[]; } catch { /* ignore */ }
          if (!pages.length) return null;
          return (
            <HorizontalBookReader
              pages={pages}
              title={readerSong.title}
              onClose={() => setReaderSong(null)}
            />
          );
        })()}

        {featuredSongs.length > 0 && (
          <section className="py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Featured Songs
              </h2>
              {songs.length > 8 && (
                <button type="button" className="flex items-center gap-1 text-xs hover:opacity-80 transition-opacity" style={{ color: "var(--ln-gold)" }}>
                  See All <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="museum-grid">
              {featuredSongs.map((song: any) => (
                <FeaturedCard key={song.id} song={song} onPlay={() => handlePlay(song)} isPlaying={playingId === song.id} />
              ))}
            </div>
          </section>
        )}

        {/* ── Album Shelves (ManifestationShelf) ── */}
        {(() => {
          // Build albumMap keyed by albumName, sorted by trackOrder within each album
          const albumMap = new Map<string, any[]>();
          songs.forEach((song: any) => {
            if (song.albumName) {
              if (!albumMap.has(song.albumName)) albumMap.set(song.albumName, []);
              albumMap.get(song.albumName)!.push(song);
            }
          });
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
              <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>Albums</h2>
              <div className="space-y-5">
                {albumEntries.map(([albumName, albumSongs]) => {
                  const collection = collectionByAlbum.get(albumName);
                  const albumCoverUrl = collection?.coverArtUrl || albumSongs[0]?.coverArtUrl;
                  const albumCoverX = collection?.coverPositionX ?? albumSongs[0]?.coverPositionX ?? 50;
                  const albumCoverY = collection?.coverPositionY ?? albumSongs[0]?.coverPositionY ?? 50;
                  // Infer medium from first track's contentType
                  const firstContentType = albumSongs[0]?.contentType ?? "audio";
                  const medium: "music" | "books" | "comics" | "manuscripts" | "artifacts" | "merch" =
                    firstContentType === "lyrics" ? "music"
                    : firstContentType === "manuscript" ? "manuscripts"
                    : firstContentType === "comic" ? "comics"
                    : "music";
                  // Find matching project slug for album download button
                  const matchingProject = (creatorProjects as any[]).find(
                    (p: any) => p.title?.toLowerCase() === albumName.toLowerCase()
                  );
                  const shelfAlbum = {
                    name: albumName,
                    coverArtUrl: albumCoverUrl ?? undefined,
                    coverPositionX: albumCoverX,
                    coverPositionY: albumCoverY,
                    medium,
                    projectSlug: matchingProject?.slug ?? null,
                    tracks: albumSongs.map((s: any) => ({
                      id: s.id,
                      title: s.title,
                      genre: s.genre ?? null,
                      coverArtUrl: s.coverArtUrl ?? null,
                      coverPositionX: s.coverPositionX ?? null,
                      coverPositionY: s.coverPositionY ?? null,
                      artAspectRatio: s.artAspectRatio ?? null,
                      durationSeconds: s.durationSeconds ?? null,
                      witnessId: s.witnessId ?? null,
                      fileUrl: s.fileUrl ?? null,
                      aiConsent: s.aiConsent ?? null,
                      contentType: s.contentType ?? null,
                      trackOrder: s.trackOrder ?? null,
                      playCount: s.playCount ?? null,
                      composerNote: s.composerNote ?? null,
                      downloadPermission: s.downloadPermission ?? null,
                    })),
                  };
                  return (
                    <ManifestationShelf
                      key={albumName}
                      album={shelfAlbum}
                      playingId={playingId}
                      onPlayTrack={(track, albumTracks) => handleShelfPlay(track, albumTracks)}
                      onPlayAll={(albumTracks) => handleShelfPlayAll(albumTracks)}
                      isOwner={isOwner}
                      onDeleteTrack={(id) => deleteMutation.mutate({ songId: id })}
                    />
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* ── Registered Collections (owner-only: visitors see published works already) ── */}
        {isOwner && creatorCollections && creatorCollections.length > 0 && (
          <section className="py-4">
            <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold)" }}>
              <Library className="inline w-4 h-4 mr-2 mb-0.5" />
              Registered Collections
            </h2>
            <div className="space-y-3">
              {(creatorCollections as any[]).map((col: any) => (
                <a
                  key={col.id}
                  href={`/verify/${col.collectionWid}`}
                  className="flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/5"
                  style={{ border: "1px solid rgba(196,154,40,0.15)", background: "var(--ln-coal)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(196,154,40,0.08)" }}
                  >
                    <Library className="w-5 h-5" style={{ color: "var(--ln-gold)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                      {col.name}
                    </p>
                    <p className="text-xs font-mono truncate mt-0.5" style={{ color: "var(--ln-gold)" }}>
                      {col.collectionWid}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs" style={{ color: "var(--ln-iron)" }}>
                      {col.trackCount ?? "?"} tracks
                    </p>
                    <ExternalLink className="w-3.5 h-3.5 mt-1 ml-auto" style={{ color: "rgba(196,154,40,0.4)" }} />
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
        {/* ── Standalone Works (songs without an album) ── */}
        {(() => {
          const standaloneSongs = songs.filter((s: any) => !s.albumName);
          if (!standaloneSongs.length) return null;
          const standaloneTracks = standaloneSongs.map((s: any) => ({
            id: s.id,
            title: s.title,
            genre: s.genre ?? null,
            coverArtUrl: s.coverArtUrl ?? null,
            coverPositionX: s.coverPositionX ?? null,
            coverPositionY: s.coverPositionY ?? null,
            artAspectRatio: s.artAspectRatio ?? null,
            durationSeconds: s.durationSeconds ?? null,
            witnessId: s.witnessId ?? null,
            fileUrl: s.fileUrl ?? null,
            aiConsent: s.aiConsent ?? null,
            contentType: s.contentType ?? null,
            trackOrder: s.trackOrder ?? null,
            playCount: s.playCount ?? null,
            composerNote: s.composerNote ?? null,
            downloadPermission: s.downloadPermission ?? null,
          }));
          return (
            <section className="py-4 pb-32">
              <StandaloneShelf
                tracks={standaloneTracks}
                playingId={playingId}
                onPlayTrack={(track, allTracks) => handleShelfPlay(track, allTracks)}
              />
            </section>
          );
        })()}

        {songs.length === 0 && (
          <div className="text-center py-24">
            <Music className="w-16 h-16 mx-auto mb-4 opacity-10" style={{ color: "var(--ln-gold)" }} />
            <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>No public songs yet.</p>
            {isOwner && (
              <Link href="/upload">
                <Button className="mt-4" style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}>
                  Register Your First Work
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* ── Image Gallery Shelf ── */}
        {galleryImages.length > 0 && (
          <section className="py-6 pb-8">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
              <h2 className="text-base font-bold" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                Image Gallery
              </h2>
              <span className="text-xs ml-1" style={{ color: "var(--ln-smoke)" }}>{galleryImages.length} work{galleryImages.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {galleryImages.map((img: any) => (
                <div
                  key={img.id}
                  className="group relative rounded-xl overflow-hidden cursor-pointer"
                  style={{ aspectRatio: '1/1', border: '1px solid rgba(196,154,40,0.25)', background: 'var(--ln-coal)' }}
                  onClick={() => window.open(img.url, '_blank')}
                >
                  <img
                    src={img.url}
                    alt={img.title ?? 'Gallery image'}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Gold rim overlay — IP protection marker */}
                  <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: 'inset 0 0 0 1.5px rgba(196,154,40,0.55)' }} />
                  {/* Title overlay on hover */}
                  <div className="absolute inset-x-0 bottom-0 px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
                  >
                    {img.title && (
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--ln-parchment)', fontFamily: "'Cinzel', serif" }}>{img.title}</p>
                    )}
                    {img.widId && (
                      <p className="font-mono text-[9px] truncate mt-0.5" style={{ color: 'var(--ln-gold)' }}>{img.widId}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Witness Testimonies ── */}
        {(creatorTestimonies as any[]).length > 0 && (
          <section className="py-6 pb-12">
            <h2 className="text-base font-bold mb-4" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              Testimonies
            </h2>
            <div className="space-y-3">
              {(creatorTestimonies as any[]).map((t: any) => (
                <div key={t.id} className="p-4 rounded-xl" style={{ background: "var(--ln-coal)", border: "1px solid #C49A28" }}>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="font-mono text-[10px] px-2 py-0.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ background: "var(--ln-coal)", color: "var(--ln-gold)", border: "1px solid #7A5A1E" }}
                      onClick={() => { navigator.clipboard.writeText(t.wid); toast.success("WID-TST copied!"); }}
                      title="Click to copy WID"
                    >
                      {t.wid}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--ln-smoke)" }}>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ln-parchment)" }}>{t.content}</p>
                  {t.linkedWorks && (t.linkedWorks as string[]).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(t.linkedWorks as string[]).map((wid: string) => (
                        <span key={wid} className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--ln-coal)", color: "var(--ln-iron)", border: "1px solid rgba(196,154,40,0.10)" }}>{wid}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-1">
                    <Shield className="w-3 h-3" style={{ color: "var(--ln-iron)" }} />
                    <span className="text-[9px]" style={{ color: "var(--ln-iron)" }}>Immutable — sealed at creation</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Tip Modal ── */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              Gift {creator.artistHandle || creator.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>
              90% goes directly to the artist. 10% supports the Living Nexus platform.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {["1", "5", "10", "25"].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTipAmount(amt)}
                  className="py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: tipAmount === amt ? "var(--ln-gold)" : "var(--ln-coal)",
                    color: tipAmount === amt ? "var(--ln-parchment)" : "var(--ln-parchment)",
                    border: "1px solid #C3AB7D",
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
              style={{ background: "var(--ln-coal)", border: "1px solid #C3AB7D", color: "var(--ln-parchment)" }}
            />
            <Button
              className="w-full"
              onClick={handleTip}
              disabled={tipMutation.isPending}
              style={{ background: "var(--ln-gold)", color: "var(--ln-parchment)" }}
            >
              {tipMutation.isPending ? "Processing..." : `Send $${tipAmount || "0"} Gift`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Witness Network Modal ───────────────────────────────── */}
      <Dialog open={witnessNetworkOpen} onOpenChange={setWitnessNetworkOpen}>
        <DialogContent
          className="max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
          style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.2)" }}
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              {creator.artistHandle || creator.name} — Witness Network
            </DialogTitle>
          </DialogHeader>
          {/* Tabs */}
          <div className="flex flex-shrink-0 border-b" style={{ borderColor: "rgba(196,154,40,0.12)" }}>
            {(["witnesses", "witnessing"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setWitnessNetworkTab(tab)}
                className="flex-1 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors"
                style={witnessNetworkTab === tab
                  ? { color: "var(--ln-gold)", borderBottom: "2px solid #C49A28" }
                  : { color: "var(--ln-iron)", borderBottom: "2px solid transparent" }
                }
              >
                {tab === "witnesses"
                  ? `Witnesses (${witnessNetwork?.witnessedBy?.length ?? 0})`
                  : `Witnessing (${witnessNetwork?.witnessing?.length ?? 0})`
                }
              </button>
            ))}
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto py-2">
            {!witnessNetwork ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--ln-gold)", borderTopColor: "transparent" }} />
              </div>
            ) : (
              (() => {
                const list = witnessNetworkTab === "witnesses" ? witnessNetwork.witnessedBy : witnessNetwork.witnessing;
                if (!list || list.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <Eye className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--ln-coal)" }} />
                      <p className="text-sm" style={{ color: "var(--ln-iron)" }}>
                        {witnessNetworkTab === "witnesses" ? "No witnesses yet" : "Not witnessing anyone yet"}
                      </p>
                    </div>
                  );
                }
                return list.map((person: any) => (
                  <button
                    key={person.id}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                    style={{ borderBottom: "1px solid rgba(44,52,56,0.4)" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(196,154,40,0.04)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    onClick={() => { setWitnessNetworkOpen(false); navigate(`/creator/${person.id}`); }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden"
                      style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.17)" }}
                    >
                      {person.profilePhotoUrl
                        ? <img src={person.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xs font-bold" style={{ color: "var(--ln-gold)" }}>{(person.artistHandle || person.name || "?")[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
                        {person.artistHandle || person.name}
                      </div>
                      {person.artistHandle && person.name && person.artistHandle !== person.name && (
                        <div className="text-xs truncate" style={{ color: "var(--ln-iron)" }}>{person.name}</div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ln-iron)" }} />
                  </button>
                ));
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>

       {/* ─── Provenance Prompt Generator Modal ───────────────────── */}
      <Dialog open={showPromptStudio} onOpenChange={(open) => { setShowPromptStudio(open); if (!open) { setPsTab("identity_regen"); setPsResult(null); } }}>
        <DialogContent
          className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          style={{ background: "var(--ln-coal)", border: "1px solid rgba(139,92,246,0.25)" }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ fontFamily: "'Cinzel', serif", color: "#a78bfa" }}>
              <Sparkles className="w-5 h-5" />
              Provenance Prompt Generator
            </DialogTitle>
            <p className="text-xs mt-1" style={{ color: "rgba(156,163,175,0.65)" }}>
              A composer's tool grounded in your creative lineage. Bring your own inspiration — lyrics, ideas, moods — or auto-generate from your profile. Every result is issued an EID and permanently archived.
            </p>
          </DialogHeader>

          {/* ── OWNER GUARD: block non-owners from using the generator ──────────── */}
          {!isOwner && (
            <div className="flex flex-col items-center justify-center gap-4 py-10 px-4 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="rgba(139,92,246,0.6)" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: "rgba(167,139,250,0.9)" }}>Profile-Locked Tool</p>
                <p className="text-xs max-w-xs" style={{ color: "rgba(156,163,175,0.55)" }}>
                  The Provenance Prompt Generator is bound to the creator's own identity and registered works. It can only be used by the profile owner.
                </p>
              </div>
              <p className="text-[10px] mt-2" style={{ color: "rgba(156,163,175,0.35)" }}>
                Sign in as this creator to access their Prompt Studio.
              </p>
            </div>
          )}

          {/* Only render the full studio for the profile owner */}
          {isOwner && (<>

          {/* ── 3-Tab Switcher ─────────────────────────────────────────── */}
          <div className="flex gap-1 mt-4 mb-4">
            {([
              { id: "identity_regen", label: "Identity Regen" },
              { id: "style_prompt_studio", label: "Prompt Studio" },
              { id: "import_anchor", label: "Import & Anchor" },
              { id: "archive", label: `Archive${lineageHistory.length > 0 ? ` (${lineageHistory.length})` : ""}` },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setPsTab(tab.id); setPsResult(null); }}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={psTab === tab.id
                  ? { background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#a78bfa" }
                  : { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(156,163,175,0.5)" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── TAB 1: IDENTITY REGEN ────────────────────────────────────── */}
          {psTab === "identity_regen" && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: "rgba(156,163,175,0.5)" }}>
              Auto-generates your sonic identity from your profile metadata, registered works, and lyric lineage. The result is issued an EID and permanently archived.
            </p>
            {(existingExpression?.expressionId || psResult?.expressionId) && (
              <div className="flex items-center gap-3 rounded-lg px-4 py-3" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "#a78bfa" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono tracking-widest mb-0.5" style={{ color: "rgba(167,139,250,0.6)" }}>EXPRESSION ID</div>
                  <div className="font-mono text-sm font-bold truncate" style={{ color: "#a78bfa" }}>{psResult?.expressionId || existingExpression?.expressionId}</div>
                  {(psResult?.lineageVersion || lineageHistory.length > 0) && (
                    <div className="text-[10px] mt-0.5" style={{ color: "rgba(167,139,250,0.4)" }}>Version {psResult?.lineageVersion ?? lineageHistory.length} of lineage</div>
                  )}
                </div>
                <button type="button" onClick={() => { navigator.clipboard.writeText(psResult?.expressionId || existingExpression?.expressionId || ""); toast.success("EID copied!"); }} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded flex-shrink-0" style={{ color: "rgba(167,139,250,0.6)", background: "rgba(139,92,246,0.1)" }}>
                  <ClipboardCopy className="w-2.5 h-2.5" /> Copy
                </button>
              </div>
            )}
            {isOwner && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: "rgba(156,163,175,0.7)" }}>Target platform:</span>
                {(["suno", "udio", "general"] as const).map((p) => (
                  <button type="button" key={p} onClick={() => setPsPlatform(p)} className="px-3 py-1 rounded-full text-xs font-mono transition-all"
                    style={psPlatform === p ? { background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.5)", color: "#a78bfa" } : { background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(156,163,175,0.5)" }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {isOwner && (
              <button type="button" onClick={() => generateExpressionMutation.mutate({ targetPlatform: psPlatform, promptType: "style_prompt", forceRegenerate: true })} disabled={generateExpressionMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.8), rgba(167,139,250,0.6))", color: "#fff" }}>
                {generateExpressionMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Wand2 className="w-4 h-4" /> Regenerate Expression Identity</>}
              </button>
            )}
            {(() => {
              const display = psResult?.promptMode === "identity_regen" ? psResult : (psResult ? null : existingExpression);
              if (!display?.expressionPrompt) return null;
              return (
                <div className="space-y-3 pt-2" style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
                  <div className="p-3" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(167,139,250,0.6)" }}>EXPRESSION PROMPT</span>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(display.expressionPrompt || ""); toast.success("Copied!"); }} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded" style={{ color: "rgba(167,139,250,0.6)", background: "rgba(139,92,246,0.1)" }}><ClipboardCopy className="w-2.5 h-2.5" /> Copy</button>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(229,231,235,0.9)" }}>{display.expressionPrompt}</p>
                  </div>
                  {display.expressionStyleTags && (
                    <div className="p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(156,163,175,0.5)" }}>STYLE TAGS</span>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(display.expressionStyleTags || ""); toast.success("Copied!"); }} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded" style={{ color: "rgba(156,163,175,0.5)", background: "rgba(255,255,255,0.05)" }}><ClipboardCopy className="w-2.5 h-2.5" /> Copy</button>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(209,213,219,0.7)" }}>{display.expressionStyleTags}</p>
                    </div>
                  )}
                  {display.expressionComposerNote && (
                    <div className="p-3" style={{ background: "rgba(245,196,81,0.04)", border: "1px solid rgba(245,196,81,0.1)" }}>
                      <span className="text-[10px] font-mono tracking-widest block mb-1" style={{ color: "rgba(245,196,81,0.45)" }}>COMPOSER'S NOTE</span>
                      <p className="text-xs leading-relaxed italic" style={{ color: "rgba(229,231,235,0.65)" }}>{display.expressionComposerNote}</p>
                    </div>
                  )}
                  {display.expressionGeneratedAt && <p className="text-[10px] text-center" style={{ color: "rgba(156,163,175,0.35)" }}>Generated {new Date(display.expressionGeneratedAt).toLocaleDateString()}</p>}
                </div>
              );
            })()}
          </div>
          )}

          {/* ── TAB 2: STYLE PROMPT STUDIO ──────────────────────────────────── */}
          {psTab === "style_prompt_studio" && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: "rgba(156,163,175,0.5)" }}>
              Bring your own inspiration — lyrics, style ideas, mood, references, anything. The generator fuses your input with your profile lineage and EID to produce a provenance-grounded prompt.
            </p>
            {isOwner && (
            <div>
              <label className="text-[10px] font-mono tracking-widest block mb-1.5" style={{ color: "rgba(167,139,250,0.55)" }}>GENERATOR MODE</label>
              <select value={psPromptType} onChange={(e) => { setPsPromptType(e.target.value as typeof psPromptType); setPsResult(null); }}
                className="w-full rounded-lg px-3 py-2 text-sm font-semibold appearance-none cursor-pointer"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)", color: "#a78bfa", outline: "none" }}>
                <option value="style_prompt">🎵  Style Prompt — Music Production</option>
                <option value="lyric_brief">✍️  Lyric Writing Brief</option>
                <option value="composer_blueprint">🎛️  Composer's Workflow Blueprint</option>
                <option value="visual_direction">🎨  Visual / Cover Art Direction</option>
                <option value="press_bio">📰  Press Bio Draft</option>
              </select>
            </div>
            )}
            {isOwner && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(167,139,250,0.55)" }}>YOUR INSPIRATION BLOCKS</label>
                <button type="button" onClick={() => setPsInputBlocks(prev => [...prev, { label: "", content: "" }])}
                  className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-all"
                  style={{ color: "rgba(167,139,250,0.7)", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                  + Add Block
                </button>
              </div>
              {psInputBlocks.map((block, idx) => (
                <div key={idx} className="p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <input value={block.label}
                      onChange={(e) => setPsInputBlocks(prev => prev.map((b, i) => i === idx ? { ...b, label: e.target.value } : b))}
                      placeholder="Block label (e.g. Lyrics, Style Idea, Mood)"
                      className="flex-1 bg-transparent text-[11px] font-mono outline-none"
                      style={{ color: "rgba(167,139,250,0.8)", borderBottom: "1px solid rgba(139,92,246,0.2)", paddingBottom: "2px" }} />
                    {psInputBlocks.length > 1 && (
                      <button type="button" onClick={() => setPsInputBlocks(prev => prev.filter((_, i) => i !== idx))} className="text-[10px] opacity-40 hover:opacity-80 transition-opacity" style={{ color: "rgba(251,113,133,0.8)" }}>×</button>
                    )}
                  </div>
                  <textarea value={block.content}
                    onChange={(e) => setPsInputBlocks(prev => prev.map((b, i) => i === idx ? { ...b, content: e.target.value } : b))}
                    placeholder="Paste lyrics, describe a style, write a mood, reference an artist or era..."
                    rows={4} className="w-full bg-transparent text-xs leading-relaxed resize-none outline-none"
                    style={{ color: "rgba(229,231,235,0.8)", caretColor: "#a78bfa" }} />
                </div>
              ))}
            </div>
            )}
            {isOwner && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: "rgba(156,163,175,0.7)" }}>Target platform:</span>
                {(["suno", "udio", "general"] as const).map((p) => (
                  <button type="button" key={p} onClick={() => setPsPlatform(p)} className="px-3 py-1 rounded-full text-xs font-mono transition-all"
                    style={psPlatform === p ? { background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.5)", color: "#a78bfa" } : { background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(156,163,175,0.5)" }}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            )}
            {isOwner && (
              <button
                onClick={() => generateStylePromptMutation.mutate({ targetPlatform: psPlatform, promptType: psPromptType, userInputBlocks: psInputBlocks.filter(b => b.content.trim()) })}
                disabled={generateStylePromptMutation.isPending || psInputBlocks.every(b => !b.content.trim())}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.8), rgba(167,139,250,0.6))", color: "#fff" }}>
                {generateStylePromptMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Wand2 className="w-4 h-4" /> Generate from My Input</>}
              </button>
            )}
            {(() => {
              const display = psResult?.promptMode === "style_prompt" ? psResult : null;
              if (!display?.expressionPrompt) return null;
              return (
                <div className="space-y-3 pt-2" style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
                  {display.expressionId && (
                    <div className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)" }}>
                      <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#a78bfa" }} />
                      <span className="font-mono text-xs font-bold" style={{ color: "#a78bfa" }}>{display.expressionId}</span>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(display.expressionId || ""); toast.success("EID copied!"); }} className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded" style={{ color: "rgba(167,139,250,0.6)", background: "rgba(139,92,246,0.1)" }}><ClipboardCopy className="w-2.5 h-2.5" /> Copy</button>
                    </div>
                  )}
                  <div className="p-3" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(167,139,250,0.6)" }}>GENERATED PROMPT</span>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(display.expressionPrompt || ""); toast.success("Copied!"); }} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded" style={{ color: "rgba(167,139,250,0.6)", background: "rgba(139,92,246,0.1)" }}><ClipboardCopy className="w-2.5 h-2.5" /> Copy</button>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(229,231,235,0.9)" }}>{display.expressionPrompt}</p>
                  </div>
                  {display.expressionStyleTags && (
                    <div className="p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(156,163,175,0.5)" }}>STYLE TAGS</span>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(display.expressionStyleTags || ""); toast.success("Copied!"); }} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded" style={{ color: "rgba(156,163,175,0.5)", background: "rgba(255,255,255,0.05)" }}><ClipboardCopy className="w-2.5 h-2.5" /> Copy</button>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(209,213,219,0.7)" }}>{display.expressionStyleTags}</p>
                    </div>
                  )}
                  {display.expressionComposerNote && (
                    <div className="p-3" style={{ background: "rgba(245,196,81,0.04)", border: "1px solid rgba(245,196,81,0.1)" }}>
                      <span className="text-[10px] font-mono tracking-widest block mb-1" style={{ color: "rgba(245,196,81,0.45)" }}>COMPOSER'S NOTE</span>
                      <p className="text-xs leading-relaxed italic" style={{ color: "rgba(229,231,235,0.65)" }}>{display.expressionComposerNote}</p>
                    </div>
                  )}
                  <button type="button" onClick={() => { const all = [display.expressionPrompt, display.expressionStyleTags, display.expressionComposerNote].filter(Boolean).join('\n\n'); navigator.clipboard.writeText(all); toast.success("Full output copied!"); }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(167,139,250,0.8)" }}>
                    <ClipboardCopy className="w-3.5 h-3.5" /> Copy Full Output
                  </button>
                  {isOwner && (
                    <div className="flex gap-2">
                      {!showDraftNameInput ? (
                        <button type="button" onClick={() => { setShowDraftNameInput(true); setDraftName(""); setSavedDraftId(null); }}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: "rgba(245,196,81,0.08)", border: "1px solid rgba(245,196,81,0.2)", color: "rgba(245,196,81,0.8)" }}>
                          <BookOpen className="w-3.5 h-3.5" /> Save Draft
                        </button>
                      ) : (
                        <div className="flex-1 flex gap-2">
                          <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Draft name…"
                            className="flex-1 rounded-lg px-3 py-1.5 text-xs bg-transparent outline-none"
                            style={{ border: "1px solid rgba(245,196,81,0.3)", color: "rgba(229,231,235,0.9)", caretColor: "#f5c451" }}
                            onKeyDown={(e) => { if (e.key === "Enter" && draftName.trim()) saveDraftMutation.mutate({ name: draftName.trim(), promptMode: "style_prompt", promptType: psPromptType, targetPlatform: psPlatform, expressionId: display.expressionId ?? undefined, prompt: display.expressionPrompt ?? "", styleTags: display.expressionStyleTags ?? undefined, composerNote: display.expressionComposerNote ?? undefined, userInputBlocks: psInputBlocks.filter(b => b.content.trim()) }); }} />
                          <button type="button" onClick={() => { if (draftName.trim()) saveDraftMutation.mutate({ name: draftName.trim(), promptMode: "style_prompt", promptType: psPromptType, targetPlatform: psPlatform, expressionId: display.expressionId ?? undefined, prompt: display.expressionPrompt ?? "", styleTags: display.expressionStyleTags ?? undefined, composerNote: display.expressionComposerNote ?? undefined, userInputBlocks: psInputBlocks.filter(b => b.content.trim()) }); }}
                            disabled={!draftName.trim() || saveDraftMutation.isPending}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                            style={{ background: "rgba(245,196,81,0.15)", color: "rgba(245,196,81,0.9)" }}>
                            {saveDraftMutation.isPending ? "Saving…" : "Save"}
                          </button>
                          <button type="button" onClick={() => setShowDraftNameInput(false)} className="px-2 py-1.5 rounded-lg text-xs opacity-40 hover:opacity-70" style={{ color: "rgba(156,163,175,0.8)" }}>✕</button>
                        </div>
                      )}
                      {savedDraftId && (
                        <button type="button" onClick={() => shareMutation.mutate({ draftId: savedDraftId, origin: window.location.origin })}
                          disabled={shareMutation.isPending}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "rgba(167,139,250,0.8)" }}>
                          <Share2 className="w-3.5 h-3.5" /> {shareMutation.isPending ? "Copying…" : "Share"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          )}

          {/* ── TAB 3: IMPORT & ANCHOR ──────────────────────────────────────── */}
          {psTab === "import_anchor" && (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: "rgba(156,163,175,0.5)" }}>
              Paste a raw style prompt from Suno, Udio, or another AI platform. Living Nexus will fuse it with your EID and creative lineage to produce a provenance-anchored version — permanently registered to you.
            </p>

            {/* Source platform selector */}
            {isOwner && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(167,139,250,0.55)" }}>SOURCE PLATFORM</label>
              <div className="flex gap-1.5 flex-wrap">
                {(["Suno", "Udio", "Udio v2", "Stable Audio", "General"] as const).map((p) => (
                  <button type="button" key={p} onClick={() => setPsAnchorSource(p)}
                    className="px-3 py-1 rounded-full text-xs font-mono transition-all"
                    style={psAnchorSource === p
                      ? { background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.5)", color: "#a78bfa" }
                      : { background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(156,163,175,0.5)" }}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Raw prompt textarea */}
            {isOwner && (
            <div className="space-y-2">
              <label className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(167,139,250,0.55)" }}>PASTE ORIGINAL PROMPT</label>
              <div className="p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <textarea
                  value={psAnchorRaw}
                  onChange={(e) => setPsAnchorRaw(e.target.value)}
                  placeholder={`Paste your ${psAnchorSource} style prompt here…\n\nExample: "dark ambient orchestral, cinematic tension, strings, brass, 120bpm, minor key, emotional, epic"`}
                  rows={6}
                  className="w-full bg-transparent text-xs leading-relaxed resize-none outline-none"
                  style={{ color: "rgba(229,231,235,0.8)", caretColor: "#a78bfa" }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px]" style={{ color: "rgba(156,163,175,0.3)" }}>{psAnchorRaw.length} / 4000 chars</span>
                {psAnchorRaw.length > 0 && (
                  <button type="button" onClick={() => { setPsAnchorRaw(""); setPsAnchorResult(null); }} className="text-[9px] opacity-40 hover:opacity-70 transition-opacity" style={{ color: "rgba(251,113,133,0.8)" }}>Clear</button>
                )}
              </div>
            </div>
            )}

            {/* Target platform selector */}
            {isOwner && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: "rgba(156,163,175,0.7)" }}>Output for:</span>
              {(["Suno", "Udio", "General"] as const).map((p) => (
                <button type="button" key={p} onClick={() => setPsAnchorTarget(p)}
                  className="px-3 py-1 rounded-full text-xs font-mono transition-all"
                  style={psAnchorTarget === p
                    ? { background: "rgba(139,92,246,0.25)", border: "1px solid rgba(139,92,246,0.5)", color: "#a78bfa" }
                    : { background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(156,163,175,0.5)" }}>
                  {p}
                </button>
              ))}
            </div>
            )}

            {/* Anchor button */}
            {isOwner && (
            <button
              onClick={() => anchorMutation.mutate({ rawPrompt: psAnchorRaw.trim(), sourcePlatform: psAnchorSource, targetPlatform: psAnchorTarget })}
              disabled={anchorMutation.isPending || psAnchorRaw.trim().length < 10}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.8), rgba(167,139,250,0.6))", color: "#fff" }}>
              {anchorMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Anchoring to EID…</>
                : <><Shield className="w-4 h-4" /> Anchor to My EID</>}
            </button>
            )}

            {/* Result display */}
            {psAnchorResult && (
            <div className="space-y-3 pt-2" style={{ borderTop: "1px solid rgba(139,92,246,0.15)" }}>
              {/* EID badge */}
              <div className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)" }}>
                <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#a78bfa" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-mono tracking-widest mb-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>ANCHORED TO EID</div>
                  <div className="font-mono text-xs font-bold truncate" style={{ color: "#a78bfa" }}>{psAnchorResult.eid}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(139,92,246,0.1)", color: "rgba(167,139,250,0.5)" }}>v{psAnchorResult.version}</span>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(psAnchorResult!.eid); toast.success("EID copied!"); }} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded" style={{ color: "rgba(167,139,250,0.6)", background: "rgba(139,92,246,0.1)" }}><ClipboardCopy className="w-2.5 h-2.5" /> Copy</button>
                </div>
              </div>

              {/* Source / target info */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ background: "rgba(251,113,133,0.08)", color: "rgba(251,113,133,0.5)" }}>FROM: {psAnchorResult.sourcePlatform}</span>
                <span className="text-[9px]" style={{ color: "rgba(156,163,175,0.3)" }}>→</span>
                <span className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ background: "rgba(52,211,153,0.08)", color: "rgba(52,211,153,0.5)" }}>FOR: {psAnchorResult.targetPlatform}</span>
              </div>

              {/* Anchored prompt */}
              <div className="p-3" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(167,139,250,0.6)" }}>ANCHORED PROMPT</span>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(psAnchorResult!.anchoredPrompt); toast.success("Copied!"); }} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded" style={{ color: "rgba(167,139,250,0.6)", background: "rgba(139,92,246,0.1)" }}><ClipboardCopy className="w-2.5 h-2.5" /> Copy</button>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(229,231,235,0.9)" }}>{psAnchorResult.anchoredPrompt}</p>
              </div>

              {/* Style tags */}
              {psAnchorResult.styleTags && (
              <div className="p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono tracking-widest" style={{ color: "rgba(156,163,175,0.5)" }}>STYLE TAGS</span>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(psAnchorResult!.styleTags); toast.success("Copied!"); }} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded" style={{ color: "rgba(156,163,175,0.5)", background: "rgba(255,255,255,0.05)" }}><ClipboardCopy className="w-2.5 h-2.5" /> Copy</button>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(209,213,219,0.7)" }}>{psAnchorResult.styleTags}</p>
              </div>
              )}

              {/* Composer note */}
              {psAnchorResult.composerNote && (
              <div className="p-3" style={{ background: "rgba(245,196,81,0.04)", border: "1px solid rgba(245,196,81,0.1)" }}>
                <span className="text-[10px] font-mono tracking-widest block mb-1" style={{ color: "rgba(245,196,81,0.45)" }}>COMPOSER'S NOTE</span>
                <p className="text-xs leading-relaxed italic" style={{ color: "rgba(229,231,235,0.65)" }}>{psAnchorResult.composerNote}</p>
              </div>
              )}

              {/* Fusion note */}
              {psAnchorResult.fusionNote && (
              <div className="p-3" style={{ background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.1)" }}>
                <span className="text-[10px] font-mono tracking-widest block mb-1" style={{ color: "rgba(96,165,250,0.45)" }}>FUSION NOTE</span>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(229,231,235,0.55)" }}>{psAnchorResult.fusionNote}</p>
              </div>
              )}

              {/* Copy full output */}
              <button
                onClick={() => { const all = [psAnchorResult!.anchoredPrompt, psAnchorResult!.styleTags, psAnchorResult!.composerNote, psAnchorResult!.fusionNote].filter(Boolean).join('\n\n'); navigator.clipboard.writeText(all); toast.success("Full output copied!"); }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "rgba(167,139,250,0.8)" }}>
                <ClipboardCopy className="w-3.5 h-3.5" /> Copy Full Output
              </button>

              {/* Save draft */}
              {isOwner && (
              <div className="flex gap-2">
                {!showDraftNameInput ? (
                  <button type="button" onClick={() => { setShowDraftNameInput(true); setDraftName(""); setSavedDraftId(null); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: "rgba(245,196,81,0.08)", border: "1px solid rgba(245,196,81,0.2)", color: "rgba(245,196,81,0.8)" }}>
                    <BookOpen className="w-3.5 h-3.5" /> Save Draft
                  </button>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Draft name…"
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs bg-transparent outline-none"
                      style={{ border: "1px solid rgba(245,196,81,0.3)", color: "rgba(229,231,235,0.9)", caretColor: "#f5c451" }}
                      onKeyDown={(e) => { if (e.key === "Enter" && draftName.trim()) saveDraftMutation.mutate({ name: draftName.trim(), promptMode: "import_anchor", promptType: psAnchorSource, targetPlatform: psAnchorTarget, expressionId: psAnchorResult?.eid ?? undefined, prompt: psAnchorResult?.anchoredPrompt ?? "", styleTags: psAnchorResult?.styleTags ?? undefined, composerNote: psAnchorResult?.composerNote ?? undefined }); }} />
                    <button type="button" onClick={() => { if (draftName.trim()) saveDraftMutation.mutate({ name: draftName.trim(), promptMode: "import_anchor", promptType: psAnchorSource, targetPlatform: psAnchorTarget, expressionId: psAnchorResult?.eid ?? undefined, prompt: psAnchorResult?.anchoredPrompt ?? "", styleTags: psAnchorResult?.styleTags ?? undefined, composerNote: psAnchorResult?.composerNote ?? undefined }); }}
                      disabled={!draftName.trim() || saveDraftMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: "rgba(245,196,81,0.15)", color: "rgba(245,196,81,0.9)" }}>
                      {saveDraftMutation.isPending ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={() => setShowDraftNameInput(false)} className="px-2 py-1.5 rounded-lg text-xs opacity-40 hover:opacity-70" style={{ color: "rgba(156,163,175,0.8)" }}>✕</button>
                  </div>
                )}
                {savedDraftId && (
                  <button type="button" onClick={() => shareMutation.mutate({ draftId: savedDraftId, origin: window.location.origin })}
                    disabled={shareMutation.isPending}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", color: "rgba(167,139,250,0.8)" }}>
                    <Share2 className="w-3.5 h-3.5" /> {shareMutation.isPending ? "Copying…" : "Share"}
                  </button>
                )}
              </div>
              )}
            </div>
            )}
          </div>
          )}

          {/* ── TAB 4: ARCHIVE ──────────────────────────────────────────────── */}
          {psTab === "archive" && (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "rgba(156,163,175,0.5)" }}>
              Every Identity Regen and Style Prompt generation is permanently archived here — the full spiritual and creative lineage of this creator's sonic identity.
            </p>
            {/* Saved Drafts sub-section — owner only */}
            {isOwner && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-heading tracking-widest uppercase" style={{ color: "rgba(96,165,250,0.5)" }}>Saved Drafts</p>
                  {myDrafts.length > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(96,165,250,0.1)", color: "rgba(96,165,250,0.6)" }}>{myDrafts.length}</span>}
                </div>
                {myDrafts.length === 0 ? (
                  <div className="text-center py-4 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px]" style={{ color: "rgba(156,163,175,0.3)" }}>No saved drafts yet. Save a Studio result to store it here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myDrafts.map((draft: any) => (
                      <div key={draft.id} className="p-3" style={{ background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.12)" }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[11px] font-medium" style={{ color: "rgba(229,231,235,0.85)" }}>{draft.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(96,165,250,0.1)", color: "rgba(96,165,250,0.6)" }}>{draft.promptType?.replace(/_/g, " ")}</span>
                              {draft.targetPlatform && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(156,163,175,0.5)" }}>{draft.targetPlatform}</span>}
                            </div>
                            {draft.prompt && <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: "rgba(229,231,235,0.55)" }}>{draft.prompt}</p>}
                            <p className="text-[9px] mt-1" style={{ color: "rgba(156,163,175,0.3)" }}>{new Date(draft.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => { navigator.clipboard.writeText(draft.prompt || ""); toast.success("Copied!"); }}
                              className="text-[9px] px-2 py-1 rounded" style={{ background: "rgba(96,165,250,0.1)", color: "rgba(96,165,250,0.7)" }}
                            >Copy</button>
                            {draft.isShared ? (
                              <button
                                onClick={() => { if (confirm("Revoke this share link? Anyone with the link will lose access.")) revokeShareMutation.mutate({ draftId: draft.id }); }}
                                className="text-[9px] px-2 py-1 rounded" style={{ background: "rgba(251,113,133,0.08)", color: "rgba(251,113,133,0.6)", border: "1px solid rgba(251,113,133,0.15)" }}
                              >Revoke</button>
                            ) : (
                              <button
                                onClick={() => shareMutation.mutate({ draftId: draft.id, origin: window.location.origin })}
                                className="text-[9px] px-2 py-1 rounded" style={{ background: "rgba(139,92,246,0.1)", color: "rgba(167,139,250,0.7)" }}
                              >Share</button>
                            )}
                            <button
                              onClick={() => { if (confirm("Delete this draft?")) deleteDraftMutation.mutate({ id: draft.id }); }}
                              className="text-[9px] px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.08)", color: "rgba(239,68,68,0.5)" }}
                            >Del</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lineage History sub-section */}
            <div className="mb-2">
              <p className="text-[9px] font-heading tracking-widest uppercase mb-2" style={{ color: "rgba(139,92,246,0.5)" }}>Generation Lineage</p>
            </div>
            {lineageHistory.length === 0 ? (
              <div className="text-center py-8" style={{ color: "rgba(156,163,175,0.35)" }}>
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No lineage records yet. Generate from either tab to begin the archive.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {lineageHistory.map((entry: any, idx: number) => (
                  <div key={entry.id ?? idx} className="p-3"
                    style={{ background: idx === 0 ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.02)", border: idx === 0 ? "1px solid rgba(139,92,246,0.25)" : "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold" style={{ color: idx === 0 ? "#a78bfa" : "rgba(167,139,250,0.5)" }}>{entry.eid}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(139,92,246,0.1)", color: "rgba(167,139,250,0.5)" }}>v{entry.version}</span>
                        {entry.promptMode === "style_prompt" && <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(96,165,250,0.1)", color: "rgba(96,165,250,0.7)" }}>STUDIO</span>}
                        {entry.promptMode === "identity_regen" && <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(139,92,246,0.1)", color: "rgba(167,139,250,0.6)" }}>IDENTITY</span>}
                        {idx === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(52,211,153,0.1)", color: "rgba(52,211,153,0.7)" }}>CURRENT</span>}
                      </div>
                      <span className="text-[9px] flex-shrink-0" style={{ color: "rgba(156,163,175,0.3)" }}>{new Date(entry.generatedAt).toLocaleDateString()}</span>
                    </div>
                    {entry.prompt && <p className="text-[11px] leading-relaxed mb-1" style={{ color: "rgba(229,231,235,0.7)" }}>{entry.prompt}</p>}
                    {entry.composerNote && <p className="text-[10px] italic" style={{ color: "rgba(229,231,235,0.4)" }}>{entry.composerNote}</p>}
                    {entry.userInputBlocks && <p className="text-[9px] mt-1" style={{ color: "rgba(156,163,175,0.35)" }}>✍️ Creator input included</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entry.dominantKey && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(52,211,153,0.08)", color: "rgba(52,211,153,0.6)" }}>{entry.dominantKey}</span>}
                      {entry.tempoRange && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(96,165,250,0.08)", color: "rgba(96,165,250,0.6)" }}>{entry.tempoRange}</span>}
                      {entry.energyProfile && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(251,113,133,0.08)", color: "rgba(251,113,133,0.6)" }}>{entry.energyProfile}</span>}
                      {entry.songCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(156,163,175,0.5)" }}>{entry.songCount} works at generation</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )} {/* end archive tab */}
          </>) /* end isOwner guard */}
        </DialogContent>
      </Dialog>

      {/* Declaration Modal — for owner to sign */}
      {isOwner && (
        <DeclarationModal
          open={showDeclarationModal}
          onOpenChange={setShowDeclarationModal}
          onSigned={() => {
            // Refetch declaration status after signing
            utils.declaration.creatorStatus.invalidate({ userId: creatorId });
          }}
        />
      )}
    </div>
  );
}
