/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TogetherPage
   Divine Noir: Listen Together + Jukebox (tip-to-queue)
   v2: Jukebox Browser — left/right flip, 30s preview, multi-select,
       Sanctuary Playlists tab (all public playlists)
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback } from "react";
import { usePlayer, DEMO_ROOMS } from "@/contexts/PlayerContext";
import { useParams } from "wouter";
import {
  Plus, Send, Copy, LogOut, Music2, DollarSign,
  SkipForward, ListMusic, Search, X, Fingerprint, Play,
  ChevronLeft, ChevronRight, Check, ShoppingCart, Volume2, VolumeX,
  Pause, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const TOGETHER_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-together-gRoXCXo5eZDSDZx7TS8pVW.webp";
const CHAT_NAMES = ["Nova", "Kai", "Mia", "Alex"];
const CHAT_REPLIES = ["🔥🔥🔥", "facts!!", "lowkey slaps", "this is the one fr", "vibe is immaculate", "divine energy 🙏"];
const COLORS = [
  "linear-gradient(135deg,#60a5fa,#a78bfa)",
  "linear-gradient(135deg,#f472b6,#fb923c)",
  "linear-gradient(135deg,#34d399,#60a5fa)",
  "linear-gradient(135deg,#a78bfa,#f472b6)",
];

interface ChatMsg { user: string; text: string; isOwn?: boolean; isJukebox?: boolean; }

interface SongCard {
  id: number;
  title: string;
  coverArtUrl?: string | null;
  witnessId?: string | null;
  creatorName?: string | null;
  fileUrl?: string | null;
  stripeAccountStatus?: string | null;
}

// ── Jukebox Song Browser Modal ──────────────────────────────────────────────
function SongBrowserModal({
  roomCode,
  isHost,
  onClose,
}: {
  roomCode: string;
  isHost: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"discover" | "sanctuary" | "mylist">("discover");

  // Jukebox flip state
  const [cardIndex, setCardIndex] = useState(0);
  const [flipDir, setFlipDir] = useState<"left" | "right" | null>(null);

  // Multi-select queue
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [queuedCount, setQueuedCount] = useState(0); // tracks how many songs were queued in the last batch

  // Audio preview — routed through the GLOBAL player audioRef.
  // One audio source. Always. No exceptions.
  const { audioRef } = usePlayer();
  const wasPlayingRef = useRef(false);   // track whether global player was playing before preview
  const prevSrcRef = useRef<string>(""); // remember the global player's src to restore it
  const prevTimeRef = useRef(0);         // remember the playback position to restore it
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: songs } = trpc.songs.discover.useQuery({ limit: 100 });
  const { data: playlistItems } = trpc.playlist.get.useQuery(undefined, { enabled: !!user });

  // freeQueueMutation — callbacks handled per-call in handleQueueAll
  const freeQueueMutation = trpc.jukebox.freeQueue.useMutation();

  // Flatten discover songs
  const flatSongs: SongCard[] = (songs ?? []).map((s: any) => ({
    id: s.song?.id ?? s.id,
    title: s.song?.title ?? s.title ?? "",
    coverArtUrl: s.song?.coverArtUrl ?? s.coverArtUrl ?? null,
    witnessId: s.song?.witnessId ?? s.witnessId ?? null,
    creatorName: s.creator?.name ?? s.creator?.artistHandle ?? s.creatorName ?? null,
    fileUrl: s.song?.fileUrl ?? s.fileUrl ?? null,
    stripeAccountStatus: s.creator?.stripeAccountStatus ?? null,
  }));

  // Flatten playlist songs
  const flatPlaylistSongs: SongCard[] = (playlistItems ?? []).map((item: any) => ({
    id: item.song?.id,
    title: item.song?.title ?? "",
    coverArtUrl: item.song?.coverArtUrl ?? null,
    witnessId: item.song?.witnessId ?? null,
    creatorName: item.creator?.artistHandle || item.creator?.name || null,
    fileUrl: item.song?.fileUrl ?? null,
  }));

  // Active list based on tab + search
  const activeSongs: SongCard[] = (() => {
    const base = activeTab === "mylist" ? flatPlaylistSongs : flatSongs;
    if (!search) return base;
    return base.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.creatorName ?? "").toLowerCase().includes(search.toLowerCase()));
  })();

  const currentCard = activeSongs[cardIndex] ?? null;

  // Auto-preview when card changes — routes through the global audioRef.
  // Saves the current src + position, pauses the global player, plays the
  // preview for 30 s, then restores the previous track.
  useEffect(() => {
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    if (!currentCard?.fileUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    // Small delay so rapid flipping doesn’t thrash the audio element
    previewTimeout.current = setTimeout(() => {
      const a = audioRef.current;
      if (!a || !currentCard.fileUrl) return;

      // Snapshot the global player state before hijacking it
      wasPlayingRef.current = !a.paused;
      prevSrcRef.current = a.src;
      prevTimeRef.current = a.currentTime;

      // Pause the global player (if it was playing)
      if (!a.paused) a.pause();

      // Load and play the preview
      a.src = currentCard.fileUrl;
      a.currentTime = 0;
      a.muted = isMuted;
      a.play().catch(() => {});
      setPreviewingId(currentCard.id);

      // Stop preview after 30 s and restore previous track
      previewTimeout.current = setTimeout(() => {
        restoreGlobalPlayer();
      }, 30000);
    }, 350);

    return () => { if (previewTimeout.current) clearTimeout(previewTimeout.current); };
  }, [cardIndex, activeTab, currentCard?.id]);

  // Restore the global player to its pre-preview state
  const restoreGlobalPlayer = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    setPreviewingId(null);
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    if (prevSrcRef.current) {
      a.src = prevSrcRef.current;
      a.currentTime = prevTimeRef.current;
      if (wasPlayingRef.current) a.play().catch(() => {});
    }
  }, [audioRef]);

  // Cleanup on unmount — restore the global player
  useEffect(() => {
    return () => {
      restoreGlobalPlayer();
    };
  }, [restoreGlobalPlayer]);

  const goLeft = useCallback(() => {
    if (activeSongs.length === 0) return;
    setFlipDir("left");
    setTimeout(() => {
      setCardIndex(i => (i - 1 + activeSongs.length) % activeSongs.length);
      setFlipDir(null);
    }, 180);
  }, [activeSongs.length]);

  const goRight = useCallback(() => {
    if (activeSongs.length === 0) return;
    setFlipDir("right");
    setTimeout(() => {
      setCardIndex(i => (i + 1) % activeSongs.length);
      setFlipDir(null);
    }, 180);
  }, [activeSongs.length]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goLeft();
      if (e.key === "ArrowRight") goRight();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goLeft, goRight]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMute = () => {
    setIsMuted(m => {
      // Apply mute state to the global audioRef only while a preview is active
      if (audioRef.current && previewingId !== null) audioRef.current.muted = !m;
      return !m;
    });
  };

  const stopPreview = () => {
    restoreGlobalPlayer();
  };

  // Queue all selected songs in sequence — no checkout step, no payment required.
  // The Jukebox is free and communal. Gifting is a separate voluntary covenant.
  const handleQueueAll = () => {
    if (!user) {
      window.location.href = getLoginUrl("/together");
      return;
    }
    stopPreview();
    const ids = selectedIds.size > 0
      ? Array.from(selectedIds)
      : currentCard ? [currentCard.id] : [];
    if (ids.length === 0) { toast.error("Select at least one song"); return; }

    // Fire mutations sequentially with a 200ms stagger so the server
    // doesn’t receive a burst of identical requests.
    ids.forEach((songId, i) => {
      setTimeout(() => {
        freeQueueMutation.mutate(
          { roomCode, songId },
          {
            onSuccess: (data) => {
              if (i === ids.length - 1) {
                // Last song — show a single summary toast
                const label = ids.length > 1
                  ? `${ids.length} songs added to the queue!`
                  : `✨ “${data.songTitle}” added to the queue!`;
                toast.success(`🎵 ${label}`);
                setQueuedCount(ids.length);
                setSelectedIds(new Set());
                onClose();
              }
            },
            onError: (err) => toast.error(err.message),
          }
        );
      }, i * 200);
    });
  };

  const selectedSongs = activeSongs.filter(s => selectedIds.has(s.id));

  // Reset card index when tab/search changes
  useEffect(() => { setCardIndex(0); }, [activeTab, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)" }}
      onClick={(e) => { if (e.target === e.currentTarget) { stopPreview(); onClose(); } }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden border border-white/[0.1]"
        style={{ background: "oklch(0.115 0.055 278)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2">
            <ListMusic size={16} className="text-[#D4AF37]" />
            <span className="font-heading text-[14px] text-white/90 tracking-wide">Jukebox Browser</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-white/40 hover:text-white/70 transition-colors p-1"
              title={isMuted ? "Unmute preview" : "Mute preview"}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
            <button onClick={() => { stopPreview(); onClose(); }} className="text-white/40 hover:text-white/70 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Jukebox Browser ── */}
        <>
            {/* Tabs */}
            <div className="flex border-b border-white/[0.08] flex-shrink-0">
              <button
                onClick={() => setActiveTab("discover")}
                className={`flex-1 py-2.5 text-[12px] font-heading tracking-wider transition-colors
                  ${activeTab === "discover" ? "text-[#D4AF37] border-b-2 border-[#D4AF37]" : "text-white/40 hover:text-white/60"}`}
              >
                Discover
              </button>
              <button
                onClick={() => setActiveTab("sanctuary")}
                className={`flex-1 py-2.5 text-[12px] font-heading tracking-wider transition-colors flex items-center justify-center gap-1
                  ${activeTab === "sanctuary" ? "text-[#D4AF37] border-b-2 border-[#D4AF37]" : "text-white/40 hover:text-white/60"}`}
              >
                <Globe size={11} />
                Sanctuary
              </button>
              {user && (
                <button
                  onClick={() => setActiveTab("mylist")}
                  className={`flex-1 py-2.5 text-[12px] font-heading tracking-wider transition-colors
                    ${activeTab === "mylist" ? "text-[#D4AF37] border-b-2 border-[#D4AF37]" : "text-white/40 hover:text-white/60"}`}
                >
                  My List {flatPlaylistSongs.length > 0 && `(${flatPlaylistSongs.length})`}
                </button>
              )}
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                <Search size={13} className="text-white/70" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tracks…"
                  className="flex-1 bg-transparent text-[13px] font-body text-white/80 outline-none placeholder:text-white/60"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="text-white/40 hover:text-white/70">
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Jukebox Card Flipper ── */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeSongs.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center py-8">
                    <Music2 size={32} className="mx-auto mb-3 text-white/20" />
                    <div className="text-white/40 text-[13px] font-body">
                      {activeTab === "mylist" ? "Your list is empty" : "No tracks found"}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Card + nav */}
                  <div className="flex items-center gap-2 px-4 py-4 flex-shrink-0">
                    {/* Left arrow */}
                    <button
                      onClick={goLeft}
                      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center z-10 relative
                        bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/60 hover:text-white transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {/* Card */}
                    <div
                      className="flex-1 relative min-w-0"
                      style={{
                        transition: flipDir ? "transform 0.18s ease, opacity 0.18s ease" : "none",
                        transform: flipDir === "left" ? "translateX(-12px) scale(0.97)" :
                          flipDir === "right" ? "translateX(12px) scale(0.97)" : "none",
                        opacity: flipDir ? 0.4 : 1,
                      }}
                    >
                      {currentCard && (
                        <div
                          className="rounded-2xl overflow-hidden border cursor-pointer transition-all"
                          style={{
                            background: "oklch(0.13 0.05 278)",
                            borderColor: selectedIds.has(currentCard.id) ? "#D4AF37" : "oklch(0.22 0.04 270 / 50%)",
                            boxShadow: selectedIds.has(currentCard.id) ? "0 0 0 2px #D4AF37" : "none",
                          }}
                          onClick={() => toggleSelect(currentCard.id)}
                        >
                          {/* Cover art */}
                          <div className="relative w-full overflow-hidden" style={{ height: "220px", background: "oklch(0.10 0.04 270)" }}>
                            {currentCard.coverArtUrl
                              ? <img src={currentCard.coverArtUrl} alt="" className="w-full h-full object-cover" style={{ objectPosition: `${(currentCard as any).coverPositionX ?? 50}% ${(currentCard as any).coverPositionY ?? 50}%` }} />
                              : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music2 size={48} className="text-white/20" />
                                </div>
                              )}
                            {/* Preview indicator */}
                            {previewingId === currentCard.id && (
                              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                                style={{ background: "rgba(0,0,0,0.75)" }}>
                                <div className="flex gap-0.5 items-end h-4">
                                  {[1, 2, 3].map(i => (
                                    <div key={i} className="w-1 rounded-full bg-[#D4AF37]"
                                      style={{ height: `${8 + i * 4}px`, animation: `pulse ${0.6 + i * 0.15}s ease-in-out infinite alternate` }} />
                                  ))}
                                </div>
                                <span className="text-[10px] text-white/70 font-body">Preview</span>
                              </div>
                            )}
                            {/* Selected overlay */}
                            {selectedIds.has(currentCard.id) && (
                              <div className="absolute inset-0 flex items-center justify-center"
                                style={{ background: "rgba(212,175,55,0.18)" }}>
                                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                                  style={{ background: "#D4AF37" }}>
                                  <Check size={22} className="text-black" />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-4">
                            <div className="text-[15px] font-heading text-white/90 tracking-wide truncate mb-0.5">
                              {currentCard.title || "Untitled"}
                            </div>
                            <div className="text-[12px] text-white/50 font-body truncate mb-2">
                              {currentCard.creatorName || "Unknown Artist"}
                            </div>
                            {currentCard.witnessId && (
                              <div className="flex items-center gap-1.5">
                                <Fingerprint size={10} className="text-[#D4AF37]/60" />
                                <span className="text-[10px] font-heading tracking-widest text-[#D4AF37]/60">WID</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right arrow */}
                    <button
                      onClick={goRight}
                      className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center z-10 relative
                        bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-white/60 hover:text-white transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Position indicator */}
                  <div className="flex items-center justify-center gap-2 px-4 pb-2 flex-shrink-0">
                    <span className="text-[11px] text-white/40 font-body">
                      {cardIndex + 1} / {activeSongs.length}
                    </span>
                    {currentCard && (
                      <button
                        onClick={() => toggleSelect(currentCard.id)}
                        className={`text-[11px] font-body px-3 py-1 rounded-full border transition-all
                          ${selectedIds.has(currentCard.id)
                            ? "text-black bg-[#D4AF37] border-[#D4AF37]"
                            : "text-white/50 bg-white/[0.04] border-white/[0.1] hover:border-[#D4AF37]/40"}`}
                      >
                        {selectedIds.has(currentCard.id) ? "✓ Selected" : "+ Add to Queue"}
                      </button>
                    )}
                  </div>

                  {/* Dot scrubber — show up to 7 dots */}
                  <div className="flex items-center justify-center gap-1 pb-3 flex-shrink-0">
                    {activeSongs.slice(Math.max(0, cardIndex - 3), Math.min(activeSongs.length, cardIndex + 4)).map((s, i) => {
                      const realIdx = Math.max(0, cardIndex - 3) + i;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setCardIndex(realIdx)}
                          className="rounded-full transition-all"
                          style={{
                            width: realIdx === cardIndex ? "20px" : "6px",
                            height: "6px",
                            background: realIdx === cardIndex ? "#D4AF37" :
                              selectedIds.has(s.id) ? "oklch(0.80 0.145 82 / 0.5)" : "oklch(0.30 0.04 280)",
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Add to Queue button — queues all selected songs freely, no checkout required */}
                  <div className="px-4 pb-4 flex-shrink-0">
                    <button
                      onClick={handleQueueAll}
                      disabled={freeQueueMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[13px] font-medium text-black transition-all hover:-translate-y-0.5 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #D4AF37, #D4AF37)" }}
                    >
                      <ListMusic size={14} />
                      {freeQueueMutation.isPending
                        ? "Queuing…"
                        : selectedIds.size > 1
                          ? `Add ${selectedIds.size} Songs to Queue`
                          : "Add to Queue"}
                    </button>
                  </div>
                </>
              )}
            </div>
        </>

        {/* Audio preview routes through the global player — no separate <audio> element needed */}
      </div>
    </div>
  );
}

// ── Leave an Offering Modal ─────────────────────────────────────────────────
function OfferingModal({
  roomCode,
  onClose,
}: {
  roomCode: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("5");

  const leaveOffering = trpc.jukebox.leaveOffering.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("🎶 Redirecting to checkout… your offering will be shared among all creators in this room.");
        window.open(data.url, "_blank");
        onClose();
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!user) { window.location.href = getLoginUrl("/together"); return; }
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 100) { toast.error("Minimum offering is $1.00"); return; }
    leaveOffering.mutate({ roomCode, amountCents: cents, origin: window.location.origin });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden border border-white/[0.1] p-6"
        style={{ background: "oklch(0.115 0.055 278)" }}
      >
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🎶</div>
          <h3 className="font-heading text-[16px] text-white/90 tracking-wide mb-1">Leave an Offering</h3>
          <p className="text-[12px] text-white/50 font-body">
            A voluntary gift shared proportionally among all creators whose songs play in this room.
          </p>
        </div>

        {/* Quick amounts */}
        <div className="flex gap-2 mb-3 flex-wrap justify-center">
          {["1", "3", "5", "10", "20"].map(amt => (
            <button
              key={amt}
              onClick={() => setAmount(amt)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-body transition-all border
                ${amount === amt
                  ? "text-black border-[#D4AF37] bg-[#D4AF37]"
                  : "text-white/60 border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08]"}`}
            >
              ${amt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] mb-5">
          <DollarSign size={14} className="text-[#D4AF37]/70" />
          <input
            type="number"
            min="1"
            step="0.50"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="flex-1 bg-transparent text-[14px] font-body text-white/85 outline-none"
          />
        </div>

        {!user ? (
          <a
            href={getLoginUrl("/together")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[13px] font-medium text-black transition-all"
            style={{ background: "linear-gradient(135deg, #D4AF37, #D4AF37)" }}
          >
            Sign in to Leave an Offering
          </a>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={leaveOffering.isPending}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[13px] font-medium text-black transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #D4AF37, #D4AF37)" }}
          >
            {leaveOffering.isPending ? "Opening checkout…" : `Leave $${amount} Offering`}
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full mt-3 py-2 text-[12px] text-white/40 hover:text-white/60 font-body transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

// ── Now Playing Panel ────────────────────────────────────────────────────────
function NowPlayingPanel({
  item,
  isHost,
  onSkip,
}: {
  item: any;
  isHost: boolean;
  onSkip: () => void;
}) {
  // No local audio — the global PlayerContext handles playback.
  // The parent component wires nowPlaying → addAndPlay() and listens
  // to the global audio's 'ended' event to advance the queue.
  if (!item) return null;

  return (
    <div className="rounded-2xl p-5 mb-4 border border-[#D4AF37]/20 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, oklch(0.12 0.06 280), oklch(0.10 0.04 270))" }}>
      {/* Glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, #D4AF37 0%, transparent 70%)" }} />

      <div className="text-[10px] font-heading tracking-[0.15em] uppercase text-[#D4AF37]/60 mb-3 flex items-center gap-1.5">
        <Play size={9} className="text-[#D4AF37]/60" />
        Now Playing
      </div>

      <div className="flex gap-4 items-start">
        {/* Cover art */}
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/[0.08]"
          style={{ background: "oklch(0.15 0.04 280)" }}>
          {item.songCoverArtUrl
            ? <img src={item.songCoverArtUrl} alt="" className="w-full h-full object-cover" />
            : <Music2 size={24} className="text-white/65" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-heading text-[16px] text-white/95 tracking-wide truncate mb-0.5">{item.songTitle}</div>
          <div className="text-[12px] text-white/50 font-body mb-2">{item.creatorName || item.creatorArtistHandle}</div>

          {/* WID badge */}
          {item.songWitnessId && (
            <div className="flex items-center gap-1.5 mb-2">
              <Fingerprint size={11} className="text-[#D4AF37]/70" />
              <span className="text-[10px] font-heading tracking-widest text-[#D4AF37]/70">WID</span>
              <span className="text-[10px] font-mono text-white/70 truncate max-w-[120px]">{item.songWitnessId.slice(0, 16)}…</span>
            </div>
          )}

          {/* Queuer + optional gift label */}
          <div className="text-[11px] text-white/75 font-body">
            Queued by <span className="text-[#A78BFA]/80">{item.tipperName}</span>
            {item.tipAmountCents > 0 && (
              <>
                {" · "}
                <span className="text-[#D4AF37]/60">gifted ${(item.tipAmountCents / 100).toFixed(2)}</span>
              </>
            )}
          </div>
        </div>

        {/* Skip (host only) */}
        {isHost && (
          <button onClick={onSkip}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body
              text-white/40 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all border border-white/[0.06]">
            <SkipForward size={12} /> Skip
          </button>
        )}
      </div>

    </div>
  );
}

// ── Queue Panel ──────────────────────────────────────────────────────────────
function QueuePanel({ items }: { items: any[] }) {
  if (items.length === 0) return (
    <div className="rounded-xl p-4 border border-white/[0.06] text-center"
      style={{ background: "oklch(0.10 0.04 280)" }}>
      <ListMusic size={20} className="mx-auto mb-2 text-white/60" />
      <p className="text-[12px] text-white/65 font-body">Queue is empty — add a song to get started!</p>
    </div>
  );

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.06]"
      style={{ background: "oklch(0.10 0.04 280)" }}>
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <span className="text-[10px] font-heading tracking-[0.12em] uppercase text-white/70">Up Next ({items.length})</span>
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {items.map((item, idx) => (
          <div key={item.id}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0">
            <span className="text-[11px] text-white/60 font-body w-4 text-center flex-shrink-0">{idx + 1}</span>
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: "oklch(0.15 0.04 280)" }}>
              {item.songCoverArtUrl
                ? <img src={item.songCoverArtUrl} alt="" className="w-full h-full object-cover" />
                : <Music2 size={12} className="text-white/65" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-body text-white/75 truncate">{item.songTitle}</div>
              <div className="text-[10px] text-white/70 font-body truncate">
                queued by {item.tipperName}{item.tipAmountCents > 0 && <span className="text-[#D4AF37]/50"> · 🎶 ${(item.tipAmountCents / 100).toFixed(2)} gift</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function TogetherPage() {
  const { state, setRoom, addAndPlay, audioRef: globalAudioRef, setJukeboxQueueCount } = usePlayer();
  const { user } = useAuth();
  const params = useParams<{ roomCode?: string }>();
  const [joinCode, setJoinCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [showBrowser, setShowBrowser] = useState(false);
  const [showOfferingModal, setShowOfferingModal] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const autoJoinedRef = useRef(false);

  // Poll queue every 5 seconds when in a room
  const { data: queueData, refetch: refetchQueue } = trpc.jukebox.getQueue.useQuery(
    { roomCode: state.room?.code ?? "" },
    { enabled: !!state.room, refetchInterval: 5000 }
  );

  const markPlayed = trpc.jukebox.markPlayed.useMutation({ onSuccess: () => refetchQueue() });
  const skipCurrent = trpc.jukebox.skipCurrent.useMutation({ onSuccess: () => refetchQueue() });

  // Handle Stripe success redirect: ?jukebox=success&songId=X
  const confirmQueue = trpc.jukebox.confirmQueue.useMutation({
    onSuccess: () => {
      refetchQueue();
      toast.success("🎵 Your song has been added to the queue!");
    },
  });

  useEffect(() => {
    if (!state.room) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("jukebox") === "success") {
      const songId = parseInt(params.get("songId") || "0");
      const roomCode = params.get("room") || state.room.code;
      const amountCents = parseInt(params.get("amountCents") || "100");
      if (songId && user) {
        confirmQueue.mutate({ roomCode, songId, amountCents });
        // Clean URL
        window.history.replaceState({}, "", `/together?room=${roomCode}`);
      }
    }
  }, [state.room, user]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // Sync queue count to global PlayerContext for sidebar badge
  useEffect(() => {
    if (!queueData) { setJukeboxQueueCount(0); return; }
    const pending = queueData.filter((i: any) => !i.playedAt && !i.skippedAt);
    setJukeboxQueueCount(pending.length);
  }, [queueData, setJukeboxQueueCount]);

  // Clear badge when leaving room
  useEffect(() => {
    if (!state.room) setJukeboxQueueCount(0);
  }, [state.room, setJukeboxQueueCount]);

  // When a new item is queued, add a chat message
  const prevQueueLen = useRef(0);
  useEffect(() => {
    if (!queueData) return;
    const pending = queueData.filter((i: any) => !i.playedAt && !i.skippedAt);
    if (pending.length > prevQueueLen.current) {
      const newest = pending[pending.length - 1];
      if (newest) {
        const giftLabel = newest.tipAmountCents > 0
          ? ` · gifted $${(newest.tipAmountCents / 100).toFixed(2)}`
          : "";
        addMsg(
          "🎵 Jukebox",
          `${newest.tipperName} queued "${newest.songTitle}"${giftLabel} 🎵`,
          true
        );
      }
    }
    prevQueueLen.current = pending.length;
  }, [queueData]);

  const nowPlaying = queueData?.find((i: any) => !i.playedAt && !i.skippedAt) ?? null;
  const upNext = queueData?.filter((i: any) => !i.playedAt && !i.skippedAt).slice(1) ?? [];

  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoom({ code, name: "My Sanctuary", listeners: ["You"] });
    setIsHost(true);
    setMessages([]);
    sessionStorage.setItem("lnx_room_code", code);
    sessionStorage.setItem("lnx_room_host", "1");
    window.history.replaceState({}, "", `/together/${code}`);
    toast.success(`🎧 Room created! Share link copied to clipboard.`);
    navigator.clipboard.writeText(`${window.location.origin}/together/${code}`).catch(() => {});
  };

  const joinRoom = (code?: string) => {
    const c = (code || joinCode).trim().toUpperCase();
    if (c.length < 4) { toast.error("Enter a valid room code"); return; }
    const demo = DEMO_ROOMS.find(r => r.code === c);
    const names = demo ? ["You", "Nova", "Kai", "Mia"].slice(0, demo.listeners) : ["You"];
    setRoom({ code: c, name: demo?.name || "Music Sanctuary", listeners: names });
    setIsHost(false);
    setJoinCode("");
    setMessages([]);
    sessionStorage.setItem("lnx_room_code", c);
    sessionStorage.removeItem("lnx_room_host");
    window.history.replaceState({}, "", `/together/${c}`);
    toast.success(`✅ Joined room ${c}`);
    setTimeout(() => addMsg("Nova", "anyone know this track? 🔥"), 1200);
    setTimeout(() => addMsg("Kai", "yesss absolute banger 🙌"), 3000);
  };

  const leaveRoom = () => {
    setRoom(null);
    setMessages([]);
    setIsHost(false);
    prevQueueLen.current = 0;
    sessionStorage.removeItem("lnx_room_code");
    sessionStorage.removeItem("lnx_room_host");
    toast("Left the room");
    // Clear the room code from URL
    window.history.replaceState({}, "", "/together");
  };

  // Auto-join from URL param OR sessionStorage (persists across page reload)
  useEffect(() => {
    if (autoJoinedRef.current) return;
    const urlCode = params.roomCode;
    const savedCode = sessionStorage.getItem("lnx_room_code");
    const savedHost = sessionStorage.getItem("lnx_room_host") === "1";
    const codeToUse = urlCode || savedCode;
    if (codeToUse && !state.room) {
      autoJoinedRef.current = true;
      const c = codeToUse.trim().toUpperCase();
      const demo = DEMO_ROOMS.find(r => r.code === c);
      const names = demo ? ["You", "Nova", "Kai", "Mia"].slice(0, demo.listeners) : ["You"];
      setRoom({ code: c, name: demo?.name || "Music Sanctuary", listeners: names });
      setIsHost(savedHost || false);
      setMessages([]);
      // Update URL if we restored from sessionStorage without URL param
      if (!urlCode && savedCode) {
        window.history.replaceState({}, "", `/together/${c}`);
      }
      toast.success(`✅ Rejoined room ${c}`);
    }
  }, [params.roomCode]);

  const shareLink = () => {
    if (!state.room) return;
    const url = `${window.location.origin}/together/${state.room.code}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("🔗 Link copied — share it with anyone!");
    }).catch(() => {
      toast.error("Could not copy link");
    });
  };

  const addMsg = (user: string, text: string, isJukebox = false) => {
    setMessages(m => [...m, { user, text, isJukebox }]);
  };

  const sendChat = () => {
    const val = chatInput.trim();
    if (!val) return;
    setMessages(m => [...m, { user: "You", text: val, isOwn: true }]);
    setChatInput("");
    if (Math.random() > 0.4) {
      setTimeout(() => {
        addMsg(
          CHAT_NAMES[Math.floor(Math.random() * 3)],
          CHAT_REPLIES[Math.floor(Math.random() * CHAT_REPLIES.length)]
        );
      }, 800 + Math.random() * 1500);
    }
  };

  const copyCode = () => {
    if (state.room) navigator.clipboard.writeText(state.room.code).catch(() => {});
    toast.success(`📋 Code copied: ${state.room?.code}`);
  };

  const handleSkip = () => {
    if (nowPlaying) skipCurrent.mutate({ itemId: nowPlaying.id });
  };

  const handleEnded = () => {
    if (nowPlaying) markPlayed.mutate({ itemId: nowPlaying.id });
  };

  // ── Wire jukebox nowPlaying into the global player ──────────────────────────
  // When the jukebox queue's nowPlaying changes, tell the global PlayerContext
  // to play that song. This removes the need for a separate audio element in
  // NowPlayingPanel — the jukebox is just a queue controller.
  const prevNowPlayingId = useRef<number | null>(null);
  useEffect(() => {
    if (!nowPlaying || nowPlaying.id === prevNowPlayingId.current) return;
    prevNowPlayingId.current = nowPlaying.id;
    addAndPlay({
      id: String(nowPlaying.songId ?? nowPlaying.id),
      title: nowPlaying.songTitle ?? "Unknown",
      audioUrl: nowPlaying.songFileUrl ?? "",
      artUrl: nowPlaying.songCoverArtUrl ?? undefined,
      artist: nowPlaying.creatorName ?? nowPlaying.creatorArtistHandle ?? "Unknown",
      genre: "",
      witnessId: nowPlaying.songWitnessId ?? undefined,
    });
  }, [nowPlaying?.id]);

  // When the global player's audio ends, advance the jukebox queue
  useEffect(() => {
    if (!state.room) return;
    const audio = globalAudioRef.current;
    if (!audio) return;
    const onGlobalEnded = () => handleEnded();
    audio.addEventListener("ended", onGlobalEnded);
    return () => audio.removeEventListener("ended", onGlobalEnded);
  }, [state.room, nowPlaying?.id]);

  return (
    <div className="animate-fade-up">
      {/* Header image */}
      <div className="relative h-[200px] overflow-hidden">
        <img src={TOGETHER_IMG} alt="Listen Together" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.01_280)] via-[oklch(0.08_0.01_280)/40] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <h1 className="font-heading text-2xl text-white/90 tracking-wider">Listen Together</h1>
          <p className="text-[12px] text-white/40 font-body mt-1">
            Create a sanctuary · tip songs into the Jukebox · vibe in real-time
          </p>
        </div>
      </div>

      <div className="px-4 py-5">
        {/* ── Room creation / join ── */}
        {!state.room && (
          <div className="rounded-2xl p-6 mb-6 border"
            style={{
              background: "linear-gradient(135deg, oklch(0.115 0.055 278), oklch(0.11 0.05 270))",
              borderColor: "oklch(0.55 0.22 295 / 30%)",
            }}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={createRoom}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-[13px] font-medium
                  text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.3)]"
                style={{ background: "linear-gradient(135deg, #D4AF37, #D4AF37)" }}
              >
                <Plus size={14} />
                Create Sanctuary
              </button>

              <div className="flex rounded-xl overflow-hidden border border-white/[0.1]">
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && joinRoom()}
                  placeholder="Enter room code…"
                  maxLength={6}
                  className="bg-[oklch(0.14_0.013_280)] border-none px-4 py-2.5 text-[13px] font-body
                    text-white/80 outline-none w-44 tracking-widest placeholder:tracking-normal placeholder:text-white/60"
                />
                <button
                  onClick={() => joinRoom()}
                  className="px-4 bg-[#A78BFA] text-white text-[13px] font-medium font-body hover:bg-[#7C3AED] transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Active room ── */}
        {state.room && (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Left: Chat + Room info */}
            <div className="flex-1 min-w-0">
              <div className="rounded-2xl p-5 mb-4 border border-white/[0.1]"
                style={{ background: "oklch(0.115 0.055 278)" }}>
                {/* Room header */}
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    {/* Left: room name + live dot */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="pulse-dot flex-shrink-0" />
                      <span className="font-heading text-[15px] text-white/90 tracking-wide truncate">{state.room.name}</span>
                    </div>
                    {/* Right: Share + Copy + Leave */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={shareLink}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body
                          transition-all border"
                        style={{
                          color: "#D4AF37",
                          background: "rgba(212,175,55,0.07)",
                          borderColor: "rgba(212,175,55,0.30)",
                        }}
                        title="Copy shareable room link">
                        <Globe size={11} /> Share Link
                      </button>
                      <button onClick={copyCode}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body
                          text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all border border-white/[0.08]">
                        <Copy size={11} /> Code
                      </button>
                      <button onClick={leaveRoom}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body
                          text-red-400/70 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all border border-red-500/10">
                        <LogOut size={11} /> Leave
                      </button>
                    </div>
                  </div>
                  {/* Room code + host badge on second row */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold tracking-widest text-[#A78BFA] px-2 py-0.5 rounded
                      bg-[#A78BFA]/10 border border-[#A78BFA]/30">
                      {state.room.code}
                    </span>
                    {isHost && (
                      <span className="text-[10px] font-heading tracking-widest text-[#D4AF37]/70 px-2 py-0.5 rounded
                        bg-[#D4AF37]/10 border border-[#D4AF37]/20">HOST</span>
                    )}
                  </div>
                </div>

                {/* Listeners */}
                <div className="text-[10px] font-heading tracking-[0.12em] uppercase text-white/65 mb-2">Listeners</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {state.room.listeners.map((l, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-body text-white/70"
                      style={{ background: "oklch(0.15 0.05 275)" }}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                        style={{ background: COLORS[i % COLORS.length] }}>
                        {l.charAt(0)}
                      </div>
                      {l}
                    </div>
                  ))}
                </div>

                {/* Chat */}
                <div ref={chatRef}
                  className="rounded-xl p-4 max-h-[200px] overflow-y-auto flex flex-col gap-2 mb-3"
                  style={{ background: "oklch(0.11 0.05 270)" }}>
                  {messages.length === 0 && (
                    <div className="text-[12px] text-white/60 text-center font-body py-4">
                      The sanctuary awaits… say something 🎵
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className="flex gap-2 text-[13px]">
                      <span className={`font-medium flex-shrink-0 ${msg.isOwn ? "text-[#D4AF37]" : msg.isJukebox ? "text-[#D4AF37]/70" : "text-[#A78BFA]"}`}>
                        {msg.user}
                      </span>
                      <span className={`font-body ${msg.isJukebox ? "text-white/60 italic" : "text-white/50"}`}>{msg.text}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                    placeholder="Say something…"
                    className="flex-1 bg-[oklch(0.11_0.012_280)] border border-white/[0.08] rounded-lg
                      px-3.5 py-2 text-[13px] font-body text-white/80 outline-none
                      focus:border-[#A78BFA]/40 transition-colors placeholder:text-white/60"
                  />
                  <button onClick={sendChat}
                    className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08]
                      text-white/60 hover:text-white transition-all">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Jukebox panel */}
            <div className="lg:w-80 flex-shrink-0">
              {/* Now Playing */}
              {nowPlaying && (
                <NowPlayingPanel
                  item={nowPlaying}
                  isHost={isHost}
                  onSkip={handleSkip}
                />
              )}

              {/* Leave an Offering — gold border, top of queue */}
              <button
                onClick={() => setShowOfferingModal(true)}
                className="w-full mb-3 flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[13px] font-semibold
                  transition-all hover:-translate-y-0.5"
                style={{
                  background: "oklch(0.13 0.04 278)",
                  border: "1.5px solid #D4AF37",
                  color: "#D4AF37",
                  boxShadow: "0 0 16px rgba(212,175,55,0.18), inset 0 0 24px rgba(212,175,55,0.05)",
                }}
              >
                <span className="text-base">🎶</span>
                Leave an Offering
                <span className="text-[10px] font-body text-[#D4AF37]/50 ml-1">· shared with all creators</span>
              </button>

              {/* Queue */}
              <div className="mb-3">
                <QueuePanel items={upNext} />
              </div>

              {/* Add to Queue button */}
              <button
                onClick={() => setShowBrowser(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[13px] font-medium
                  text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.25)]"
                style={{ background: "linear-gradient(135deg, #D4AF37, #D4AF37)" }}
              >
                <ListMusic size={14} />
                Add a Song to the Queue
              </button>
              <p className="text-[11px] text-white/65 font-body text-center mt-2">
                Free · browse &amp; queue any track
              </p>
            </div>
          </div>
        )}

        {/* ── Active rooms ── */}
        {!state.room && (
          <>
            <div className="font-heading text-[15px] tracking-wider text-white/70 mb-4">Active Sanctuaries</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEMO_ROOMS.map(room => (
                <div
                  key={room.code}
                  onClick={() => joinRoom(room.code)}
                  className="rounded-xl overflow-hidden border border-white/[0.07] cursor-pointer
                    hover:border-[#A78BFA]/30 hover:-translate-y-1 transition-all group"
                  style={{ background: "oklch(0.115 0.055 278)" }}
                >
                  <div className="aspect-video relative flex items-center justify-center text-5xl"
                    style={{ background: "linear-gradient(135deg,#1a0a3e,#0a1a3e)" }}>
                    {room.emoji}
                    <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded
                      bg-[oklch(0.65_0.18_160)/90] text-black font-heading tracking-wider">
                      LIVE
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[13px] font-heading text-white/80 tracking-wide mb-1">{room.name}</div>
                    <div className="text-[11px] text-white/75 font-body">
                      {room.listeners} listening · {room.track}
                    </div>
                    <div className="mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/70 font-body tracking-widest">
                        {room.code}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Song browser modal */}
      {showBrowser && state.room && (
        <SongBrowserModal
          roomCode={state.room.code}
          isHost={isHost}
          onClose={() => setShowBrowser(false)}
        />
      )}

      {/* Offering modal */}
      {showOfferingModal && state.room && (
        <OfferingModal
          roomCode={state.room.code}
          onClose={() => setShowOfferingModal(false)}
        />
      )}
    </div>
  );
}
