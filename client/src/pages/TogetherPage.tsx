/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — TogetherPage
   Divine Noir: Listen Together + Jukebox (tip-to-queue)
═══════════════════════════════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback } from "react";
import { usePlayer, DEMO_ROOMS } from "@/contexts/PlayerContext";
import {
  Plus, Send, Copy, LogOut, Music2, DollarSign,
  SkipForward, ListMusic, Search, X, Fingerprint, Play
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
  const [selectedSong, setSelectedSong] = useState<{
    id: number; title: string; coverArtUrl?: string | null;
    witnessId?: string | null; creatorName?: string | null;
  } | null>(null);
  const [tipAmount, setTipAmount] = useState("1");
  const [confirming, setConfirming] = useState(false);

  const { data: songs } = trpc.songs.discover.useQuery({ limit: 50 });
  const tipToQueue = trpc.jukebox.tipToQueue.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to checkout… your song will be queued after payment 🎵");
        window.open(data.url, "_blank");
        onClose();
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = (songs ?? []).filter((s: any) =>
    !search || s.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleTip = () => {
    if (!selectedSong) return;
    const cents = Math.round(parseFloat(tipAmount) * 100);
    if (isNaN(cents) || cents < 100) { toast.error("Minimum tip is $1.00"); return; }
    tipToQueue.mutate({
      roomCode,
      songId: selectedSong.id,
      amountCents: cents,
      origin: window.location.origin,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden border border-white/[0.1]"
        style={{ background: "oklch(0.10 0.055 280)", maxHeight: "85vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ListMusic size={16} className="text-[#E8C547]" />
            <span className="font-heading text-[14px] text-white/90 tracking-wide">Queue a Song</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X size={16} />
          </button>
        </div>

        {!selectedSong ? (
          <>
            {/* Search */}
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08]">
                <Search size={13} className="text-white/30" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tracks…"
                  className="flex-1 bg-transparent text-[13px] font-body text-white/80 outline-none placeholder:text-white/20"
                />
              </div>
            </div>
            {/* Song list */}
            <div className="overflow-y-auto" style={{ maxHeight: "50vh" }}>
              {filtered.length === 0 && (
                <div className="text-center py-8 text-white/30 text-[13px] font-body">No tracks found</div>
              )}
              {filtered.map((song: any) => (
                <button
                  key={song.id}
                  onClick={() => setSelectedSong(song)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.05] transition-colors text-left border-b border-white/[0.04]"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: "oklch(0.15 0.04 280)" }}>
                    {song.coverArtUrl
                      ? <img src={song.coverArtUrl} alt="" className="w-full h-full object-cover" />
                      : <Music2 size={16} className="text-white/30" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-body text-white/85 truncate">{song.title}</div>
                    <div className="text-[11px] text-white/35 font-body truncate">{song.creatorName || "Unknown"}</div>
                  </div>
                  {song.witnessId && (
                    <div className="text-[9px] px-1.5 py-0.5 rounded font-heading tracking-widest text-[#E8C547]/70 border border-[#E8C547]/20 flex-shrink-0">
                      WID
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Tip confirmation */
          <div className="p-5">
            <div className="flex items-center gap-4 mb-5 p-4 rounded-xl border border-white/[0.08]"
              style={{ background: "oklch(0.13 0.04 280)" }}>
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: "oklch(0.18 0.04 280)" }}>
                {selectedSong.coverArtUrl
                  ? <img src={selectedSong.coverArtUrl} alt="" className="w-full h-full object-cover" />
                  : <Music2 size={20} className="text-white/30" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-heading text-white/90 tracking-wide truncate">{selectedSong.title}</div>
                <div className="text-[12px] text-white/45 font-body">{selectedSong.creatorName || "Unknown Creator"}</div>
                {selectedSong.witnessId && (
                  <div className="flex items-center gap-1 mt-1">
                    <Fingerprint size={10} className="text-[#E8C547]/60" />
                    <span className="text-[10px] text-[#E8C547]/60 font-heading tracking-widest">WID</span>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedSong(null)} className="text-white/30 hover:text-white/60 transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-heading tracking-[0.1em] uppercase text-white/35 mb-2 block">
                Tip Amount (min $1.00)
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04]">
                <DollarSign size={14} className="text-[#E8C547]/70" />
                <input
                  type="number"
                  min="1"
                  step="0.50"
                  value={tipAmount}
                  onChange={e => setTipAmount(e.target.value)}
                  className="flex-1 bg-transparent text-[14px] font-body text-white/85 outline-none"
                />
              </div>
              <p className="text-[11px] text-white/25 font-body mt-1.5">
                Tip goes directly to the creator. Song plays for everyone in the room.
              </p>
            </div>

            {!user ? (
              <a href={getLoginUrl("/together")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[13px] font-medium text-black transition-all"
                style={{ background: "linear-gradient(135deg, #E8C547, #C9A84C)" }}>
                Sign in to Tip &amp; Queue
              </a>
            ) : (
              <button
                onClick={handleTip}
                disabled={tipToQueue.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[13px] font-medium text-black transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #E8C547, #C9A84C)" }}>
                {tipToQueue.isPending ? "Opening checkout…" : `Tip $${tipAmount} & Queue`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Now Playing Panel ────────────────────────────────────────────────────────
function NowPlayingPanel({
  item,
  isHost,
  onSkip,
  onEnded,
}: {
  item: any;
  isHost: boolean;
  onSkip: () => void;
  onEnded: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && item?.songFileUrl) {
      audioRef.current.src = item.songFileUrl;
      audioRef.current.play().catch(() => {});
    }
  }, [item?.id]);

  if (!item) return null;

  return (
    <div className="rounded-2xl p-5 mb-4 border border-[#E8C547]/20 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, oklch(0.12 0.06 280), oklch(0.10 0.04 270))" }}>
      {/* Glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, #E8C547 0%, transparent 70%)" }} />

      <div className="text-[10px] font-heading tracking-[0.15em] uppercase text-[#E8C547]/60 mb-3 flex items-center gap-1.5">
        <Play size={9} className="text-[#E8C547]/60" />
        Now Playing
      </div>

      <div className="flex gap-4 items-start">
        {/* Cover art */}
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/[0.08]"
          style={{ background: "oklch(0.15 0.04 280)" }}>
          {item.songCoverArtUrl
            ? <img src={item.songCoverArtUrl} alt="" className="w-full h-full object-cover" />
            : <Music2 size={24} className="text-white/25" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-heading text-[16px] text-white/95 tracking-wide truncate mb-0.5">{item.songTitle}</div>
          <div className="text-[12px] text-white/50 font-body mb-2">{item.creatorName || item.creatorArtistHandle}</div>

          {/* WID badge */}
          {item.songWitnessId && (
            <div className="flex items-center gap-1.5 mb-2">
              <Fingerprint size={11} className="text-[#E8C547]/70" />
              <span className="text-[10px] font-heading tracking-widest text-[#E8C547]/70">WID</span>
              <span className="text-[10px] font-mono text-white/30 truncate max-w-[120px]">{item.songWitnessId.slice(0, 16)}…</span>
            </div>
          )}

          {/* Tipper */}
          <div className="text-[11px] text-white/35 font-body">
            Queued by <span className="text-[#A78BFA]/80">{item.tipperName}</span>
            {" · "}
            <span className="text-[#E8C547]/60">${(item.tipAmountCents / 100).toFixed(2)} tip</span>
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

      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={onEnded} className="hidden" />
    </div>
  );
}

// ── Queue Panel ──────────────────────────────────────────────────────────────
function QueuePanel({ items }: { items: any[] }) {
  if (items.length === 0) return (
    <div className="rounded-xl p-4 border border-white/[0.06] text-center"
      style={{ background: "oklch(0.10 0.04 280)" }}>
      <ListMusic size={20} className="mx-auto mb-2 text-white/20" />
      <p className="text-[12px] text-white/25 font-body">Queue is empty — tip a song to add it!</p>
    </div>
  );

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.06]"
      style={{ background: "oklch(0.10 0.04 280)" }}>
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <span className="text-[10px] font-heading tracking-[0.12em] uppercase text-white/30">Up Next ({items.length})</span>
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {items.map((item, idx) => (
          <div key={item.id}
            className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-0">
            <span className="text-[11px] text-white/20 font-body w-4 text-center flex-shrink-0">{idx + 1}</span>
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
              style={{ background: "oklch(0.15 0.04 280)" }}>
              {item.songCoverArtUrl
                ? <img src={item.songCoverArtUrl} alt="" className="w-full h-full object-cover" />
                : <Music2 size={12} className="text-white/25" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-body text-white/75 truncate">{item.songTitle}</div>
              <div className="text-[10px] text-white/30 font-body truncate">
                by {item.tipperName} · <span className="text-[#E8C547]/50">${(item.tipAmountCents / 100).toFixed(2)}</span>
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
  const { state, setRoom } = usePlayer();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [showBrowser, setShowBrowser] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

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
      if (songId && user) {
        confirmQueue.mutate({ roomCode, songId, amountCents: 100 });
        // Clean URL
        window.history.replaceState({}, "", `/together?room=${roomCode}`);
      }
    }
  }, [state.room, user]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  // When a new item is queued, add a chat message
  const prevQueueLen = useRef(0);
  useEffect(() => {
    if (!queueData) return;
    const pending = queueData.filter((i: any) => !i.playedAt && !i.skippedAt);
    if (pending.length > prevQueueLen.current) {
      const newest = pending[pending.length - 1];
      if (newest) {
        addMsg(
          "🎵 Jukebox",
          `${newest.tipperName} tipped $${(newest.tipAmountCents / 100).toFixed(2)} to ${newest.creatorName || "the creator"} — "${newest.songTitle}" is up next 🎵`,
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
    toast.success(`🎧 Room created! Share code: ${code}`);
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
    toast.success(`✅ Joined room ${c}`);
    setTimeout(() => addMsg("Nova", "anyone know this track? 🔥"), 1200);
    setTimeout(() => addMsg("Kai", "yesss absolute banger 🙌"), 3000);
  };

  const leaveRoom = () => {
    setRoom(null);
    setMessages([]);
    setIsHost(false);
    prevQueueLen.current = 0;
    toast("Left the room");
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
              background: "linear-gradient(135deg, oklch(0.10 0.055 280), oklch(0.11 0.05 270))",
              borderColor: "oklch(0.55 0.22 295 / 30%)",
            }}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                onClick={createRoom}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-[13px] font-medium
                  text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.3)]"
                style={{ background: "linear-gradient(135deg, #E8C547, #C9A84C)" }}
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
                    text-white/80 outline-none w-44 tracking-widest placeholder:tracking-normal placeholder:text-white/20"
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
                style={{ background: "oklch(0.10 0.055 280)" }}>
                {/* Room header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="pulse-dot" />
                    <span className="font-heading text-[15px] text-white/90 tracking-wide">{state.room.name}</span>
                    <span className="text-[11px] font-bold tracking-widest text-[#A78BFA] px-2 py-0.5 rounded
                      bg-[#A78BFA]/10 border border-[#A78BFA]/30">
                      {state.room.code}
                    </span>
                    {isHost && (
                      <span className="text-[10px] font-heading tracking-widest text-[#E8C547]/70 px-2 py-0.5 rounded
                        bg-[#E8C547]/10 border border-[#E8C547]/20">HOST</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body
                        text-white/50 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-all border border-white/[0.08]">
                      <Copy size={11} /> Copy
                    </button>
                    <button onClick={leaveRoom}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-body
                        text-red-400/70 hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-all border border-red-500/10">
                      <LogOut size={11} /> Leave
                    </button>
                  </div>
                </div>

                {/* Listeners */}
                <div className="text-[10px] font-heading tracking-[0.12em] uppercase text-white/25 mb-2">Listeners</div>
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
                    <div className="text-[12px] text-white/20 text-center font-body py-4">
                      The sanctuary awaits… say something 🎵
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div key={i} className="flex gap-2 text-[13px]">
                      <span className={`font-medium flex-shrink-0 ${msg.isOwn ? "text-[#E8C547]" : msg.isJukebox ? "text-[#E8C547]/70" : "text-[#A78BFA]"}`}>
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
                      focus:border-[#A78BFA]/40 transition-colors placeholder:text-white/20"
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
                  onEnded={handleEnded}
                />
              )}

              {/* Queue */}
              <div className="mb-3">
                <QueuePanel items={upNext} />
              </div>

              {/* Tip to queue button */}
              <button
                onClick={() => setShowBrowser(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-body text-[13px] font-medium
                  text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(232,197,71,0.25)]"
                style={{ background: "linear-gradient(135deg, #E8C547, #C9A84C)" }}
              >
                <DollarSign size={14} />
                Tip a Song into the Queue
              </button>
              <p className="text-[11px] text-white/25 font-body text-center mt-2">
                $1 minimum · tip goes to the creator
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
                  style={{ background: "oklch(0.10 0.055 280)" }}
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
                    <div className="text-[11px] text-white/35 font-body">
                      {room.listeners} listening · {room.track}
                    </div>
                    <div className="mt-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/30 font-body tracking-widest">
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
    </div>
  );
}
