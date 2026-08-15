/**
 * PNA Shell — Provenance Nexus Avatar workspace
 * Traditional chat architecture with:
 *  - Fixed/adjustable chat column (or floating pop-out)
 *  - Music dock bound into the PNA stage
 *  - Vine/ember chat atmosphere (music-reactive, no blur)
 *  - One-click avatars that unlock in place and switch capability
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Zap, Eye, Layers, Archive, Sparkles, Search, Music, FileText,
  Image, Shield, Upload, BookOpen, Settings, LogOut,
  ChevronRight, Send, Loader2, ExternalLink, Save, Film, BookMarked,
  Play, Pause, SkipBack, SkipForward, PanelRightOpen, PanelRightClose,
  Maximize2, Minimize2, GripVertical, Lock,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { usePlayer } from "@/contexts/PlayerContext";
import NexusAvatarViewer from "@/components/NexusAvatarViewer";
import { NexusContextPanel } from "@/components/NexusContextPanel";
import { PNAVisualProposalCard, type PNAVisualProposal } from "@/components/PNAVisualProposalCard";
import { SKIN_IMAGES } from "@/components/FloatingAvatar";
import { PNA_PRODUCT } from "@/lib/loopProduct";
import { consumePnaDiaryReload } from "@/lib/pnaDiary";
import {
  contextRoute,
  createContextSuggestion,
  type NexusContextRef,
  type NexusContextSuggestion,
} from "@/lib/nexusContext";
import { PnaChatAtmosphere, PnaStreamSeal } from "@/components/pna/PnaChatAtmosphere";
import { useHarmonicSignature } from "@/hooks/useHarmonicSignature";
import {
  bindNowPlayingContext,
  persistPnaChatTheme,
  PNA_AVATARS,
  PNA_CHAT_THEMES,
  PNA_LOGO_URL,
  pnaAvatarById,
  type PnaChatThemeId,
  readPnaChatTheme,
} from "@/lib/pnaChatAtmosphere";

// ─── Stewardship modes ────────────────────────────────────────────────────────

type PNAMode = "guide" | "conductor" | "witness" | "custodian" | "archivist" | "vision" | "research";

const PNA_MODES = [
  { id: "guide" as PNAMode, label: "Guide", desc: "Creative direction and intent", icon: Zap, persona: "guide" as const },
  { id: "conductor" as PNAMode, label: "Compose", desc: "Structure, arrangement, flow", icon: Music, persona: "conductor" as const },
  { id: "witness" as PNAMode, label: "Witness", desc: "Emotional truth and testimony", icon: Eye, persona: "witness" as const },
  { id: "custodian" as PNAMode, label: "Registry", desc: "Provenance, registration, lineage", icon: Layers, persona: "custodian" as const },
  { id: "archivist" as PNAMode, label: "Archive", desc: "Patterns across your corpus", icon: Archive, persona: "archivist" as const },
  { id: "vision" as PNAMode, label: "Vision", desc: "Image and visual generation", icon: Sparkles, persona: "guide" as const },
  { id: "research" as PNAMode, label: "Research", desc: "Search and cross-reference", icon: Search, persona: "archivist" as const },
];

/** Single accent — site theme gold. Mode rainbow accents castrate typography under illuminated skins. */
const ACCENT = "var(--ln-gold)";
const INK = "var(--ln-parchment)";
const INK_MUTED = "var(--ln-smoke)";
const INK_BODY = "var(--ln-bone)";
const SURFACE = "var(--ln-coal)";
const PANEL = "var(--ln-panel)";
const PANEL_BORDER = "var(--ln-panel-border)";
const VOID = "var(--ln-void)";
const STAGE_BG = "var(--background)";

const QUICK_ACTIONS = [
  { label: "Register Work", icon: Shield, href: "/manifest", desc: "Create a new WID" },
  { label: "My Archive", icon: Archive, href: "/archive", desc: "Your registered works" },
  { label: "Manage", icon: Settings, href: "/manage", desc: "Loop management hub" },
  { label: "Guides", icon: BookOpen, href: "/guides", desc: "Creator guides" },
  { label: "Notes & Diaries", icon: BookMarked, href: "/keeper", desc: "Keeper NOTES + PNA diaries" },
  { label: "Avatar Registry", icon: Image, href: "/avatar-registry", desc: "Steward AVT skins" },
  { label: "Batch Upload", icon: Upload, href: "/batch-upload", desc: "Register multiple works" },
];

const LS_CHAT_WIDTH = "ln-pna-chat-width";
const LS_LAYOUT = "ln-pna-layout";
const LS_DRAWER = "ln-pna-drawer-open";
const LS_OPEN_NOTES = "ln-keeper-notes-open";

interface Message {
  id: string;
  role: "user" | "pna";
  content: string;
  mode: PNAMode;
  timestamp: Date;
  visualProposal?: PNAVisualProposal;
}

type LayoutMode = "workspace" | "popout";

function readNumber(key: string, fallback: number, min: number, max: number) {
  try {
    const n = Number(localStorage.getItem(key));
    if (Number.isFinite(n)) return Math.min(max, Math.max(min, n));
  } catch { /* ignore */ }
  return fallback;
}

function readString(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PNAShellPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const {
    state: playerState,
    togglePlay,
    nextTrack,
    prevTrack,
    openNowPlayingPanel,
  } = usePlayer();

  const [activeMode, setActiveMode] = useState<PNAMode>("guide");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readString(LS_DRAWER, "0") === "1");
  const [cinematic, setCinematic] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() =>
    readString(LS_LAYOUT, "workspace") === "popout" ? "popout" : "workspace",
  );
  const [chatWidth, setChatWidth] = useState(() => readNumber(LS_CHAT_WIDTH, 520, 360, 900));
  const [popoutPos, setPopoutPos] = useState({ x: 72, y: 64 });
  const [popoutSize, setPopoutSize] = useState({ w: 440, h: 640 });
  const [contextRef, setContextRef] = useState<NexusContextRef | null>(null);
  const [contextSuggestion, setContextSuggestion] = useState<NexusContextSuggestion | null>(null);
  const [chatTheme, setChatTheme] = useState<PnaChatThemeId>(() => readPnaChatTheme());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resizingRef = useRef<{ startX: number; startW: number } | null>(null);
  const popoutDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const popoutResizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const chatMutation = trpc.keeper.chat.useMutation();
  const saveNoteMutation = trpc.keeper.saveNote.useMutation({
    onSuccess: () => toast.success("Saved to notes."),
  });
  const saveArchive = trpc.keeper.saveChatArchive.useMutation({
    onSuccess: (res) => toast.success(`Diary saved · ${res.title} — browse in Keeper NOTES`),
    onError: (e) => toast.error(e.message),
  });
  const sealArchive = trpc.keeper.sealChatArchive.useMutation({
    onSuccess: (res) => toast.success(res.alreadySealed ? `Already sealed · ${res.diaryWid}` : `Sealed · ${res.diaryWid}`),
    onError: (e) => toast.error(e.message),
  });
  const profileQuery = trpc.keeper.getProfile.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const generateArtwork = trpc.keeper.generateArtwork.useMutation();
  const saveQuiverAsset = trpc.quiver.save.useMutation();
  const setActiveSkin = trpc.keeper.setActiveSkin.useMutation({
    onSuccess: () => {
      utils.keeper.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Could not activate skin."),
  });
  const unlockSkin = trpc.keeper.unlockSkin.useMutation({
    onSuccess: () => {
      utils.keeper.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Could not unlock avatar."),
  });

  const currentMode = PNA_MODES.find(m => m.id === activeMode) ?? PNA_MODES[0];
  const playing = playerState.currentIdx >= 0 ? playerState.tracks[playerState.currentIdx] : null;
  const nowPlaying = playing
    ? { title: playing.title, artist: playing.artist, artUrl: playing.artUrl, id: playing.id, wid: playing.witnessId }
    : null;
  const activeSkinId = profileQuery.data?.activeSkinId ?? "hooded-scholar";
  const customImageUrl = profileQuery.data?.customImageUrl ?? null;
  const ownedSkins = new Set(profileQuery.data?.ownedSkins ?? ["hooded-scholar"]);
  const activeSkinImg =
    activeSkinId === "custom" && customImageUrl
      ? customImageUrl
      : SKIN_IMAGES[activeSkinId] ?? SKIN_IMAGES["hooded-scholar"];
  const activeAvatar = pnaAvatarById(activeSkinId);
  const { hue, saturation } = useHarmonicSignature(nowPlaying?.wid ?? null, null);
  const avatarBusy = setActiveSkin.isPending || unlockSkin.isPending;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const payload = consumePnaDiaryReload();
    if (!payload?.messages?.length) return;
    const modeIds = new Set(PNA_MODES.map(m => m.id));
    const restored: Message[] = payload.messages.map((m, i) => {
      const role: "user" | "pna" = m.role === "user" ? "user" : "pna";
      const mode = (
        m.mode && modeIds.has(m.mode as PNAMode)
          ? m.mode
          : payload.personaId && modeIds.has(payload.personaId as PNAMode)
            ? payload.personaId
            : "guide"
      ) as PNAMode;
      return {
        id: m.id || `diary-${i}`,
        role,
        content: m.content,
        mode,
        timestamp: new Date(),
      };
    });
    setMessages(restored);
    if (payload.personaId && modeIds.has(payload.personaId as PNAMode)) {
      setActiveMode(payload.personaId as PNAMode);
    }
    toast.success(
      payload.diaryWid
        ? `Diary reopened · ${payload.diaryWid}`
        : `Diary reopened · ${payload.title}`,
      { duration: 4500 },
    );
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F11") { e.preventDefault(); setCinematic(v => !v); }
      if (e.key === "Escape" && contextRef) { setContextRef(null); return; }
      if (e.key === "Escape" && cinematic) setCinematic(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cinematic, contextRef]);

  useEffect(() => {
    try { localStorage.setItem(LS_CHAT_WIDTH, String(chatWidth)); } catch { /* ignore */ }
  }, [chatWidth]);


  useEffect(() => {
    try { localStorage.setItem(LS_LAYOUT, layoutMode); } catch { /* ignore */ }
  }, [layoutMode]);

  useEffect(() => {
    try { localStorage.setItem(LS_DRAWER, sidebarCollapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  // ADR-023 Phase 1: context remains session-only and click-to-open. A track
  // becoming contextual never changes playback or queue state on its own.
  useEffect(() => {
    if (!nowPlaying?.id) return;
    const ref: NexusContextRef = { version: 1, kind: "now-playing" };
    setContextSuggestion(current => current?.ref.kind === "now-playing"
      ? current
      : createContextSuggestion(ref, nowPlaying.title, "deterministic"));
  }, [nowPlaying?.id, nowPlaying?.title]);

  const openContext = useCallback((ref: NexusContextRef) => {
    setContextRef(ref);
  }, []);

  const openNowPlayingContext = useCallback(() => {
    if (!nowPlaying) {
      toast.message("Play a work from Loop before opening its context.");
      return;
    }
    openContext({ version: 1, kind: "now-playing" });
  }, [nowPlaying, openContext]);

  const closeContext = useCallback(() => setContextRef(null), []);

  const handleContextOpen = useCallback(() => {
    if (!contextRef) return;
    const route = contextRoute(contextRef);
    if (route) navigate(route);
  }, [contextRef, navigate]);

  const handleContextVerify = useCallback(() => {
    if (!contextRef) return;
    const wid = contextRef.kind === "now-playing"
      ? nowPlaying?.wid
      : contextRef.kind === "work"
        ? contextRef.wid
        : contextRef.kind === "provenance"
          ? contextRef.wid
          : null;
    if (wid) navigate(`/verify/${encodeURIComponent(wid)}`);
  }, [contextRef, navigate, nowPlaying?.wid]);

  const handleContextPlay = useCallback(() => {
    // Reachable only through a direct user click in the Context Canvas.
    togglePlay();
  }, [togglePlay]);

  // Chat column resize (workspace docked)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (resizingRef.current) {
        const delta = resizingRef.current.startX - e.clientX;
        setChatWidth(Math.min(900, Math.max(360, resizingRef.current.startW + delta)));
      }
      if (popoutDragRef.current) {
        const d = popoutDragRef.current;
        setPopoutPos({
          x: Math.max(8, d.origX + (e.clientX - d.startX)),
          y: Math.max(8, d.origY + (e.clientY - d.startY)),
        });
      }
      if (popoutResizeRef.current) {
        const d = popoutResizeRef.current;
        setPopoutSize({
          w: Math.min(900, Math.max(320, d.origW + (e.clientX - d.startX))),
          h: Math.min(900, Math.max(420, d.origH + (e.clientY - d.startY))),
        });
      }
    };
    const onUp = () => {
      resizingRef.current = null;
      popoutDragRef.current = null;
      popoutResizeRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleSaveDiary = async () => {
    if (messages.length === 0) {
      toast.info("Start a conversation before saving a diary.");
      return;
    }
    const saved = await saveArchive.mutateAsync({
      personaId: activeMode,
      title: nowPlaying ? `Diary · ${nowPlaying.title}` : undefined,
      songId: nowPlaying?.id ? Number(nowPlaying.id) || undefined : undefined,
      songWid: nowPlaying?.wid || undefined,
      songTitle: nowPlaying?.title || undefined,
      messages: messages.map(m => ({
        id: m.id,
        role: m.role === "pna" ? "pna" as const : "user" as const,
        content: m.content,
        mode: m.mode,
      })),
    });
    if (saved?.id) await sealArchive.mutateAsync({ id: saved.id });
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || !user) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text, mode: activeMode, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      if (activeMode === "vision") {
        const visual = await generateArtwork.mutateAsync({ prompt: text });
        setMessages(prev => [...prev, {
          id: `p-visual-${Date.now()}`,
          role: "pna",
          content: "A private cover-art proposal is ready. Review it below; it will not enter Quiver until you choose to save it.",
          mode: "vision",
          timestamp: new Date(),
          visualProposal: { url: visual.url, prompt: text },
        }]);
        return;
      }
      const result = await chatMutation.mutateAsync({
        message: bindNowPlayingContext(text, nowPlaying),
        persona: currentMode.persona,
        history: messages.slice(-8).map(m => ({
          role: m.role === "user" ? "user" as const : "assistant" as const,
          content: m.content,
        })),
      });
      const replyText = typeof result.reply === "string" ? result.reply : (result.reply as any)?.[0]?.text ?? "";
      setMessages(prev => [...prev, {
        id: `p-${Date.now()}`,
        role: "pna",
        content: replyText,
        mode: activeMode,
        timestamp: new Date(),
      }]);
    } catch (e: any) {
      toast.error(e.message ?? "PNA unavailable");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activeMode, currentMode, messages, chatMutation, generateArtwork, user, nowPlaying]);

  const handleSaveVisualProposal = useCallback(async (messageId: string) => {
    const message = messages.find(candidate => candidate.id === messageId);
    const proposal = message?.visualProposal;
    if (!proposal || proposal.savedQuiverId || saveQuiverAsset.isPending) return;

    try {
      const saved = await saveQuiverAsset.mutateAsync({
        url: proposal.url,
        prompt: proposal.prompt,
        title: "PNA visual proposal",
      });
      setMessages(previous => previous.map(candidate => candidate.id === messageId && candidate.visualProposal
        ? { ...candidate, visualProposal: { ...candidate.visualProposal, savedQuiverId: saved.id } }
        : candidate));
      await utils.quiver.list.invalidate();
      toast.success("Saved privately to Quiver.");
    } catch (error: any) {
      toast.error(error.message ?? "Could not save this visual to Quiver.");
    }
  }, [messages, saveQuiverAsset, utils]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleActivateSkin = async (skinId: string) => {
    if (avatarBusy) return;
    try {
      const catalog = pnaAvatarById(skinId);
      const owned = ownedSkins.has(skinId) || skinId === "hooded-scholar" || skinId === "custom";
      if (!owned && catalog) {
        await unlockSkin.mutateAsync({ skinId: catalog.id });
      }
      await setActiveSkin.mutateAsync({ skinId });
      if (catalog) setActiveMode(catalog.mode);
      toast.success(
        catalog
          ? `${catalog.name} · ${catalog.capability}`
          : "Avatar activated.",
      );
    } catch (e: any) {
      toast.error(e.message ?? "Could not activate avatar.");
    }
  };

  const handleChatTheme = (id: PnaChatThemeId) => {
    setChatTheme(id);
    persistPnaChatTheme(id);
  };

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050403" }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9A84C", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "#050403" }}>
        <div className="text-center">
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1.5rem", color: "#C9A84C", letterSpacing: "0.08em" }}>
            {PNA_PRODUCT.fullName}
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
            pna.livingnexus.org · Creator Workspace
          </div>
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: 320, lineHeight: 1.7 }}>
          Your persistent intelligence layer. Sign in to activate your workspace.
        </div>
        <a
          href={getLoginUrl("/pna")}
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all hover:opacity-80"
          style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.4)", color: "#C9A84C", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.08em", textDecoration: "none" }}
        >
          SIGN IN TO WORKSPACE
        </a>
        <a href="https://livingnexus.org" style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>
          ← Back to Living Nexus
        </a>
      </div>
    );
  }

  const musicDock = (
    <div
      className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
      style={{
        background: "color-mix(in srgb, var(--ln-panel, #0A0806) 88%, transparent)",
        borderTop: "1px solid color-mix(in srgb, var(--ln-gold, #C49A28) 22%, transparent)",
      }}
    >
      <button
        type="button"
        onClick={() => openNowPlayingPanel()}
        className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-md"
        style={{ background: "#111", border: "1px solid rgba(196,154,40,0.28)" }}
        title="Open now playing"
      >
        {nowPlaying?.artUrl ? (
          <img src={nowPlaying.artUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music size={16} style={{ color: "rgba(196,154,40,0.55)" }} />
          </div>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div style={{ fontSize: "0.4rem", color: "rgba(196,154,40,0.6)", letterSpacing: "0.12em", fontFamily: "'Space Mono', monospace" }}>
          {playerState.isPlaying ? "NOW PLAYING · BOUND TO THREAD" : nowPlaying ? "PAUSED · BOUND TO THREAD" : "MUSIC · PLAY A TRACK TO BIND"}
        </div>
        <div className="truncate" style={{ fontFamily: "'Cinzel', serif", fontSize: "0.78rem", color: INK }}>
          {nowPlaying?.title ?? "No track loaded"}
        </div>
        <div className="truncate" style={{ fontSize: "0.5rem", color: INK_MUTED, fontFamily: "'Space Mono', monospace" }}>
          {nowPlaying
            ? `${nowPlaying.artist ?? "Unknown"}${nowPlaying.wid ? ` · ${nowPlaying.wid}` : ""} · ${formatTime(playerState.currentTime)} / ${formatTime(playerState.duration)}`
            : "Use Explore or Archive, then return — playback stays in this dock"}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button type="button" onClick={() => prevTrack()} className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80" style={{ color: INK_MUTED }} aria-label="Previous">
          <SkipBack size={14} />
        </button>
        <button
          type="button"
          onClick={() => togglePlay()}
          disabled={!nowPlaying}
          className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30"
          style={{ background: ACCENT, color: VOID }}
          aria-label={playerState.isPlaying ? "Pause" : "Play"}
        >
          {playerState.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
        <button type="button" onClick={() => nextTrack()} className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80" style={{ color: INK_MUTED }} aria-label="Next">
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  );

  const chatHeader = (
    <div
      className="flex items-center justify-between px-4 py-2.5 flex-shrink-0 gap-2"
      style={{ borderBottom: `1px solid ${PANEL_BORDER}`, background: "rgba(0,0,0,0.12)" }}
      onMouseDown={layoutMode === "popout" ? (e) => {
        // drag only from header chrome, not buttons
        if ((e.target as HTMLElement).closest("button,a")) return;
        popoutDragRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          origX: popoutPos.x,
          origY: popoutPos.y,
        };
      } : undefined}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={activeSkinImg}
          alt=""
          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          style={{ border: "1.5px solid color-mix(in srgb, var(--ln-gold) 40%, transparent)" }}
        />
        <div className="min-w-0">
          <div className="truncate" style={{ fontFamily: "'Cinzel', serif", fontSize: "0.72rem", color: ACCENT }}>
            {PNA_PRODUCT.name} · {currentMode.label}
          </div>
          <div style={{ fontSize: "0.4rem", color: INK_MUTED, fontFamily: "'Space Mono', monospace", letterSpacing: "0.06em" }}>
            {layoutMode === "popout" ? "POP-OUT CHAT · DRAG HEADER" : "DOCKED CHAT · RESIZE FROM LEFT EDGE"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={openNowPlayingContext}
          aria-expanded={Boolean(contextRef)}
          className="px-2 py-1 rounded flex items-center gap-1"
          style={{ fontSize: "0.4rem", color: contextRef ? ACCENT : INK_MUTED, border: `1px solid ${contextRef ? "color-mix(in srgb, var(--ln-gold) 45%, transparent)" : PANEL_BORDER}`, fontFamily: "'Space Mono', monospace" }}
          title="Open current music context"
        >
          <PanelRightOpen size={10} /> CONTEXT
        </button>
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.setItem(LS_OPEN_NOTES, "1"); } catch { /* ignore */ }
            navigate("/keeper");
          }}
          className="px-2 py-1 rounded flex items-center gap-1"
          style={{ fontSize: "0.4rem", color: INK_MUTED, border: `1px solid ${PANEL_BORDER}`, fontFamily: "'Space Mono', monospace" }}
          title="Keeper NOTES & diaries"
        >
          <BookOpen size={10} /> NOTES
        </button>
        <button
          type="button"
          onClick={() => setCinematic(v => !v)}
          className="px-2 py-1 rounded flex items-center gap-1"
          style={{
            fontSize: "0.4rem",
            color: cinematic ? ACCENT : INK_MUTED,
            border: `1px solid ${cinematic ? "color-mix(in srgb, var(--ln-gold) 45%, transparent)" : PANEL_BORDER}`,
            fontFamily: "'Space Mono', monospace",
          }}
          title="Cinematic listen + chat (F11)"
        >
          <Film size={9} /> {cinematic ? "LIVE" : "CINE"}
        </button>
        <button
          type="button"
          onClick={() => setLayoutMode(m => m === "workspace" ? "popout" : "workspace")}
          className="px-2 py-1 rounded flex items-center gap-1"
          style={{ fontSize: "0.4rem", color: INK_MUTED, border: `1px solid ${PANEL_BORDER}`, fontFamily: "'Space Mono', monospace" }}
          title={layoutMode === "workspace" ? "Pop out chat panel" : "Dock chat into workspace"}
        >
          {layoutMode === "workspace" ? <><PanelRightOpen size={10} /> POP OUT</> : <><PanelRightClose size={10} /> DOCK</>}
        </button>
        {messages.length > 0 && (
          <>
            <button
              type="button"
              onClick={handleSaveDiary}
              disabled={saveArchive.isPending || sealArchive.isPending}
              className="px-2 py-1 rounded flex items-center gap-1"
              style={{ fontSize: "0.4rem", color: ACCENT, border: `1px solid color-mix(in srgb, var(--ln-gold) 30%, transparent)`, fontFamily: "'Space Mono', monospace" }}
            >
              <BookMarked size={9} /> DIARY
            </button>
            <button
              type="button"
              onClick={() => setMessages([])}
              className="px-2 py-1 rounded"
              style={{ fontSize: "0.4rem", color: INK_MUTED, border: `1px solid ${PANEL_BORDER}`, fontFamily: "'Space Mono', monospace" }}
            >
              CLEAR
            </button>
          </>
        )}
      </div>
    </div>
  );

  const modeTabs = (
    <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${PANEL_BORDER}`, background: "color-mix(in srgb, var(--ln-panel) 80%, transparent)" }}>
      <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
        {PNA_MODES.map(mode => {
          const active = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => setActiveMode(mode.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0"
              style={{
                background: active ? "color-mix(in srgb, var(--ln-gold) 18%, transparent)" : "transparent",
                border: active ? `1px solid color-mix(in srgb, var(--ln-gold) 45%, transparent)` : `1px solid transparent`,
                color: active ? ACCENT : INK_MUTED,
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.45rem",
                letterSpacing: "0.06em",
              }}
              title={mode.desc}
            >
              <mode.icon size={10} />
              {mode.label.toUpperCase()}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 pb-2">
        <p style={{ fontSize: "0.42rem", color: INK_MUTED, fontFamily: "'Space Mono', monospace", lineHeight: 1.5 }}>
          {currentMode.desc}
          {activeAvatar ? ` · ${activeAvatar.name}: ${activeAvatar.capability}` : ""}
        </p>
        {nowPlaying?.title ? (
          <span className="shrink-0" style={{ fontSize: "0.38rem", color: ACCENT, letterSpacing: "0.08em", fontFamily: "'Space Mono', monospace" }}>
            FIELD · {nowPlaying.title}
          </span>
        ) : null}
      </div>
    </div>
  );

  const messagesPane = (
    <div className="flex-1 overflow-y-auto px-4 py-4" style={{ overscrollBehavior: "contain" }}>
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-5 max-w-md mx-auto">
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              width: 132,
              height: 168,
              border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)",
              boxShadow: "0 0 36px color-mix(in srgb, var(--ln-gold) 12%, transparent)",
              background: "#080604",
            }}
          >
            <img src={activeSkinImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 opacity-40">
              <NexusAvatarViewer seed={user.id} width={132} height={168} accentColor="#C49A28" />
            </div>
          </div>
          <div className="text-center">
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1rem", color: ACCENT, marginBottom: 6 }}>
              {PNA_PRODUCT.fullName}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.9rem", color: INK_MUTED, lineHeight: 1.7 }}>
              Chat stays free. Pick an avatar to switch its capability. The field breathes with whatever is playing.
            </div>
          </div>
          <div className="w-full grid grid-cols-2 gap-2">
              {[
                { label: "Analyze my lyrics", icon: FileText },
                { label: "Build arrangement", icon: Music },
                { label: "Write testimony", icon: BookOpen },
                { label: "Generate cover art", icon: Image, mode: "vision" as PNAMode },
                { label: "Register a work", icon: Shield },
              ].map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => { if (s.mode) setActiveMode(s.mode); setInput(s.mode ? "" : s.label); inputRef.current?.focus(); }}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-left transition-all hover:opacity-80"
                style={{ background: SURFACE, border: `1px solid ${PANEL_BORDER}` }}
              >
                <s.icon size={12} style={{ color: ACCENT, flexShrink: 0 }} />
                <span style={{ fontSize: "0.55rem", color: INK_MUTED, fontFamily: "'Space Mono', monospace" }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {messages.map(msg => {
            const modeConfig = PNA_MODES.find(m => m.id === msg.mode) ?? PNA_MODES[0];
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3.5`}>
                {!isUser && (
                  <img
                    src={activeSkinImg}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mr-2 mt-0.5"
                    style={{ border: `1px solid color-mix(in srgb, var(--ln-gold) 40%, transparent)` }}
                  />
                )}
                <div className={`max-w-[78%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-2 mb-1 px-0.5">
                    <span style={{ fontSize: "0.4rem", color: ACCENT, letterSpacing: "0.08em", fontFamily: "'Space Mono', monospace" }}>
                      {isUser ? "YOU" : `PNA · ${modeConfig.label.toUpperCase()}`}
                    </span>
                    <span style={{ fontSize: "0.38rem", color: INK_MUTED, fontFamily: "'Space Mono', monospace" }}>
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    className="rounded-2xl px-3.5 py-2.5"
                    style={{
                      background: isUser ? "color-mix(in srgb, var(--ln-gold) 14%, transparent)" : SURFACE,
                      border: `1px solid ${isUser ? "color-mix(in srgb, var(--ln-gold) 32%, transparent)" : PANEL_BORDER}`,
                      borderBottomRightRadius: isUser ? 6 : 16,
                      borderBottomLeftRadius: isUser ? 16 : 6,
                    }}
                  >
                    <p
                      className="whitespace-pre-wrap"
                      style={{
                        fontFamily: isUser ? "'DM Sans', sans-serif" : "'Cormorant Garamond', serif",
                        fontSize: isUser ? "0.82rem" : "0.95rem",
                        color: INK,
                        lineHeight: 1.65,
                      }}
                    >
                      {msg.content}
                    </p>
                  </div>
                  {msg.visualProposal && (
                    <PNAVisualProposalCard
                      proposal={msg.visualProposal}
                      isSaving={saveQuiverAsset.isPending}
                      onSave={() => handleSaveVisualProposal(msg.id)}
                    />
                  )}
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => saveNoteMutation.mutate({ content: msg.content, personaId: msg.mode })}
                      className="flex items-center gap-1 mt-1 transition-opacity hover:opacity-70"
                      style={{ fontSize: "0.38rem", color: INK_MUTED, letterSpacing: "0.06em", fontFamily: "'Space Mono', monospace" }}
                    >
                      <Save size={9} /> SAVE TO NOTES
                    </button>
                  )}
                </div>
                {isUser && (
                  user.profilePhotoUrl ? (
                    <img
                      src={user.profilePhotoUrl}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 ml-2 mt-0.5"
                      style={{ border: "1px solid rgba(196,154,40,0.35)" }}
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-2 mt-0.5"
                      style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.3)", color: "#C9A84C", fontSize: "0.65rem" }}
                    >
                      {(user.name ?? "?")[0].toUpperCase()}
                    </div>
                  )
                )}
              </div>
            );
          })}
          {isLoading && (
            <div className="flex items-center gap-2.5 mb-3">
              <img src={activeSkinImg} alt="" className="w-8 h-8 rounded-full object-cover" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)" }} />
              <PnaStreamSeal streaming logoUrl={PNA_LOGO_URL} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );

  const composer = (
    <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: `1px solid ${PANEL_BORDER}` }}>
      <div
        className="flex items-end gap-2.5 rounded-2xl px-3.5 py-2.5"
        style={{ background: SURFACE, border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)" }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={activeMode === "vision" ? "Describe private cover art…" : `Message ${currentMode.label}…`}
          rows={1}
          className="flex-1 bg-transparent outline-none resize-none"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.9rem",
            color: INK,
            lineHeight: 1.5,
            maxHeight: "140px",
            overflowY: "auto",
          }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: ACCENT, color: VOID }}
        >
          {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5 px-0.5 gap-2">
        <span style={{ fontSize: "0.38rem", color: INK_MUTED, fontFamily: "'Space Mono', monospace" }}>
          Enter to send · Shift+Enter newline
        </span>
        <div className="flex items-center gap-1">
          {PNA_CHAT_THEMES.map((theme) => {
            const active = chatTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleChatTheme(theme.id)}
                className="px-1.5 py-0.5 rounded"
                style={{
                  fontSize: "0.38rem",
                  letterSpacing: "0.08em",
                  fontFamily: "'Space Mono', monospace",
                  color: active ? ACCENT : INK_MUTED,
                  border: `1px solid ${active ? "color-mix(in srgb, var(--ln-gold) 45%, transparent)" : PANEL_BORDER}`,
                  background: active ? "color-mix(in srgb, var(--ln-gold) 12%, transparent)" : "transparent",
                }}
                title={theme.desc}
              >
                {theme.label.toUpperCase()}{theme.paid ? " · PAID" : ""}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const chatColumn = (
    <PnaChatAtmosphere
      theme={chatTheme}
      playing={playerState.isPlaying}
      hue={hue}
      saturation={saturation}
    >
      <div className="flex flex-col min-h-0 h-full overflow-hidden" style={{ background: "transparent" }}>
        {chatHeader}
        {modeTabs}
        {(cinematic || nowPlaying) && (
          <div
            className="flex items-center gap-3 px-4 py-2 flex-shrink-0"
            style={{
              background: cinematic
                ? "linear-gradient(90deg, color-mix(in srgb, var(--ln-gold) 12%, transparent), transparent)"
                : "transparent",
              borderBottom: `1px solid ${PANEL_BORDER}`,
            }}
          >
            <Music size={12} style={{ color: ACCENT }} />
            <div className="min-w-0 flex-1 truncate" style={{ fontSize: "0.55rem", color: INK, fontFamily: "'Space Mono', monospace" }}>
              {nowPlaying ? `${playerState.isPlaying ? "▶" : "❚❚"} ${nowPlaying.title}` : "Cinematic ready — start playback"}
            </div>
          </div>
        )}
        {messagesPane}
        {musicDock}
        {composer}
      </div>
    </PnaChatAtmosphere>
  );

  const leftDrawer = (
    <div
      className="flex flex-col flex-shrink-0 transition-all duration-300 h-full"
      style={{
        width: sidebarCollapsed ? 64 : 248,
        background: "rgba(8,6,4,0.98)",
        borderRight: "1px solid rgba(196,154,40,0.12)",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}
      >
        {!sidebarCollapsed && (
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.7rem", color: "#C9A84C", letterSpacing: "0.06em" }}>{PNA_PRODUCT.name}</div>
            <div style={{ fontSize: "0.38rem", color: "rgba(255,255,255,0.25)", marginTop: 1 }}>Full Workspace</div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setSidebarCollapsed(v => !v)}
          className="w-7 h-7 rounded flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ color: "rgba(196,154,40,0.5)", marginLeft: sidebarCollapsed ? "auto" : 0 }}
        >
          <ChevronRight size={14} style={{ transform: sidebarCollapsed ? "none" : "rotate(180deg)", transition: "transform 0.2s" }} />
        </button>
      </div>

      {/* Active avatar portrait */}
      {!sidebarCollapsed && (
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <div
            className="relative overflow-hidden rounded-xl"
            style={{ height: 168, border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)", background: VOID }}
          >
            <img src={activeSkinImg} alt="Active avatar" className="w-full h-full object-cover" />
            <div
              className="absolute bottom-0 inset-x-0 px-2 py-1.5"
              style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.85))" }}
            >
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.65rem", color: "#C9A84C" }}>
                {activeAvatar?.name
                  ?? (activeSkinId === "custom" ? "Custom Portrait" : "Avatar")}
              </div>
              <div style={{ fontSize: "0.4rem", color: "rgba(255,255,255,0.45)", fontFamily: "'Space Mono', monospace" }}>
                ACTIVE · {currentMode.label.toUpperCase()}
              </div>
              {activeAvatar && (
                <div style={{ fontSize: "0.38rem", color: "rgba(201,168,76,0.75)", fontFamily: "'Space Mono', monospace", marginTop: 2 }}>
                  {activeAvatar.capability}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avatar skin gallery */}
      <div className="px-2 pb-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}>
        {!sidebarCollapsed && (
          <div style={{ fontSize: "0.38rem", color: "rgba(196,154,40,0.45)", letterSpacing: "0.1em", padding: "6px 8px 4px", fontFamily: "'Space Mono', monospace" }}>
            AVATARS
          </div>
        )}
        <div className={sidebarCollapsed ? "flex flex-col items-center gap-1.5" : "flex flex-col gap-1.5 px-1"}>
          {PNA_AVATARS.map(skin => {
            const img = SKIN_IMAGES[skin.id];
            const owned = ownedSkins.has(skin.id) || !skin.locked;
            const active = activeSkinId === skin.id;
            const status = active ? "ACTIVE" : owned ? "USE" : "UNLOCK";
            return (
              <button
                key={skin.id}
                type="button"
                onClick={() => handleActivateSkin(skin.id)}
                disabled={avatarBusy}
                title={`${skin.name} · ${skin.capability}`}
                className={`relative overflow-hidden rounded-lg transition-all hover:opacity-90 ${sidebarCollapsed ? "" : "flex items-center gap-2 text-left p-1"}`}
                style={{
                  aspectRatio: sidebarCollapsed ? "1" : undefined,
                  width: sidebarCollapsed ? 40 : "100%",
                  border: active ? `2px solid ${ACCENT}` : `1px solid ${PANEL_BORDER}`,
                  opacity: owned || active ? 1 : 0.72,
                }}
              >
                <img
                  src={img}
                  alt={skin.name}
                  className="object-cover flex-shrink-0"
                  style={{
                    width: sidebarCollapsed ? "100%" : 36,
                    height: sidebarCollapsed ? "100%" : 48,
                    borderRadius: 6,
                  }}
                />
                {!sidebarCollapsed && (
                  <div className="min-w-0 flex-1 py-0.5 pr-1">
                    <div style={{ fontSize: "0.48rem", color: active ? ACCENT : INK, fontFamily: "'Space Mono', monospace" }}>
                      {skin.name}
                    </div>
                    <div style={{ fontSize: "0.38rem", color: INK_MUTED, fontFamily: "'Space Mono', monospace" }}>
                      {skin.capability}
                    </div>
                    <div
                      className="inline-flex items-center gap-1"
                      style={{
                        fontSize: "0.36rem",
                        letterSpacing: "0.08em",
                        color: active ? ACCENT : owned ? INK_BODY : "rgba(201,168,76,0.85)",
                        fontFamily: "'Space Mono', monospace",
                        marginTop: 2,
                      }}
                    >
                      {!owned && <Lock size={8} />}
                      {status}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
          {customImageUrl && (
            <button
              type="button"
              onClick={() => handleActivateSkin("custom")}
              title="Custom portrait"
              className="relative overflow-hidden rounded-lg"
              style={{
                aspectRatio: sidebarCollapsed ? "1" : "3/4",
                width: sidebarCollapsed ? 40 : "100%",
                border: activeSkinId === "custom" ? "2px solid #C9A84C" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <img src={customImageUrl} alt="Custom" className="w-full h-full object-cover" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {!sidebarCollapsed && (
          <div style={{ fontSize: "0.38rem", color: "rgba(196,154,40,0.4)", letterSpacing: "0.1em", padding: "4px 12px 6px", fontFamily: "'Space Mono', monospace" }}>
            STEWARDSHIP
          </div>
        )}
        {PNA_MODES.map(mode => (
          <button
            key={mode.id}
            type="button"
            onClick={() => setActiveMode(mode.id)}
            className="w-full flex items-center gap-2.5 transition-all hover:opacity-80"
            style={{
              padding: sidebarCollapsed ? "8px 0" : "7px 12px",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              background: activeMode === mode.id ? "color-mix(in srgb, var(--ln-gold) 12%, transparent)" : "transparent",
              borderLeft: activeMode === mode.id ? `2px solid ${ACCENT}` : "2px solid transparent",
            }}
            title={sidebarCollapsed ? mode.label : undefined}
          >
            <mode.icon size={13} style={{ color: activeMode === mode.id ? ACCENT : INK_MUTED, flexShrink: 0 }} />
            {!sidebarCollapsed && (
              <div className="min-w-0 text-left">
                <div style={{ fontSize: "0.5rem", color: activeMode === mode.id ? ACCENT : INK_BODY, letterSpacing: "0.04em", fontFamily: "'Space Mono', monospace" }}>
                  {mode.label}
                </div>
                <div style={{ fontSize: "0.36rem", color: INK_MUTED, fontFamily: "'Space Mono', monospace" }}>
                  {PNA_AVATARS.find(avatar => avatar.mode === mode.id)?.capability ?? mode.desc}
                </div>
              </div>
            )}
          </button>
        ))}

        {!sidebarCollapsed && (
          <>
            <div style={{ fontSize: "0.38rem", color: "rgba(196,154,40,0.4)", letterSpacing: "0.1em", padding: "12px 12px 6px", fontFamily: "'Space Mono', monospace" }}>
              WORKSPACE
            </div>
            {QUICK_ACTIONS.map(a => (
              <button
                key={a.href}
                type="button"
                onClick={() => navigate(a.href)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-all hover:opacity-80 text-left"
                title={a.desc}
              >
                <a.icon size={12} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.5)", fontFamily: "'Space Mono', monospace" }}>{a.label}</span>
              </button>
            ))}
          </>
        )}
      </div>

      <div style={{ borderTop: "1px solid rgba(196,154,40,0.08)", padding: "8px 0" }}>
        {!sidebarCollapsed ? (
          <>
            <button type="button" onClick={() => navigate("/keeper")} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:opacity-80">
              <Settings size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
              <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>Avatar & Keeper</span>
            </button>
            <button type="button" onClick={() => navigate("/")} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:opacity-80">
              <ExternalLink size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
              <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.4)", fontFamily: "'Space Mono', monospace" }}>Loop Registry</span>
            </button>
            <button type="button" onClick={() => logout().finally(() => navigate("/"))} className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:opacity-80">
              <LogOut size={12} style={{ color: "rgba(255,255,255,0.25)" }} />
              <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)", fontFamily: "'Space Mono', monospace" }}>Sign Out</span>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={() => navigate("/keeper")} className="w-7 h-7 flex items-center justify-center hover:opacity-70" title="Keeper">
              <Settings size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
            </button>
            <button type="button" onClick={() => logout()} className="w-7 h-7 flex items-center justify-center hover:opacity-70" title="Sign Out">
              <LogOut size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── Main workspace ─────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-[100dvh] overflow-hidden relative"
      style={{ background: STAGE_BG, fontFamily: "'Space Mono', monospace" }}
    >
      {leftDrawer}

      {layoutMode === "workspace" ? (
        <>
          {/* Stage / witness canvas */}
          <div className="flex-1 min-w-0 relative hidden md:flex flex-col items-center justify-center px-6">
            <div
              className="relative overflow-hidden rounded-2xl w-[min(320px,28vw)] h-[min(420px,55vh)]"
              style={{
                border: `1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)`,
                boxShadow: cinematic ? "0 0 80px color-mix(in srgb, var(--ln-gold) 18%, transparent)" : "0 20px 60px rgba(0,0,0,0.35)",
                background: VOID,
              }}
            >
              {/* Track art is the stage subject when music is bound; scholar is companion badge */}
              {nowPlaying?.artUrl ? (
                <img src={nowPlaying.artUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <img src={activeSkinImg} alt="" className="w-full h-full object-cover" />
              )}
              {nowPlaying?.artUrl && (
                <div
                  className="absolute bottom-3 left-3 w-14 h-18 overflow-hidden rounded-lg"
                  style={{
                    width: 56,
                    height: 72,
                    border: `1.5px solid color-mix(in srgb, var(--ln-gold) 50%, transparent)`,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                  }}
                >
                  <img src={activeSkinImg} alt="Active avatar" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="mt-5 text-center max-w-sm">
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1.05rem", color: ACCENT }}>
                {nowPlaying?.title ?? "Witness stage"}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem", color: INK_MUTED, marginTop: 6, lineHeight: 1.6 }}>
                {nowPlaying
                  ? `${nowPlaying.artist ?? ""} · track art on stage · avatar stays as companion`
                  : "Play music from Loop — cover art takes the stage; your avatar stays beside it"}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLayoutMode("popout")}
                className="px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{ border: `1px solid ${PANEL_BORDER}`, color: INK_MUTED, fontSize: "0.45rem", letterSpacing: "0.08em" }}
              >
                <Maximize2 size={11} /> POP-OUT CHAT
              </button>
              <button
                type="button"
                onClick={() => navigate("/explore")}
                className="px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)", color: ACCENT, fontSize: "0.45rem", letterSpacing: "0.08em" }}
              >
                <Music size={11} /> FIND MUSIC
              </button>
            </div>
          </div>

          {/* Resize handle + docked chat */}
          <div className="flex h-full flex-shrink-0" style={{ width: chatWidth, maxWidth: "100%" }}>
            <button
              type="button"
              aria-label="Resize chat"
              className="w-2 h-full flex items-center justify-center cursor-col-resize flex-shrink-0"
              style={{ background: "rgba(196,154,40,0.06)", borderLeft: "1px solid rgba(196,154,40,0.14)" }}
              onMouseDown={(e) => {
                resizingRef.current = { startX: e.clientX, startW: chatWidth };
              }}
            >
              <GripVertical size={12} style={{ color: "rgba(196,154,40,0.45)" }} />
            </button>
            <div className="flex-1 min-w-0 h-full" style={{ borderLeft: "1px solid rgba(196,154,40,0.12)" }}>
              {chatColumn}
            </div>
          </div>
          {contextRef && (
            <div className="hidden 2xl:flex h-full w-[300px] flex-shrink-0">
              <NexusContextPanel
                context={contextRef}
                suggestion={contextSuggestion}
                nowPlaying={nowPlaying ? { ...nowPlaying, isPlaying: playerState.isPlaying } : null}
                onClose={closeContext}
                onOpen={handleContextOpen}
                onVerify={handleContextVerify}
                onPlay={handleContextPlay}
              />
            </div>
          )}
        </>
      ) : (
        <>
          {/* Pop-out stage fills remaining space */}
          <div className="flex-1 min-w-0 relative flex flex-col items-center justify-center px-4">
            <div
              className="relative overflow-hidden rounded-2xl w-[min(360px,40vw)] h-[min(460px,58vh)]"
              style={{
                border: "1px solid color-mix(in srgb, var(--ln-gold) 20%, transparent)",
                boxShadow: "0 0 80px color-mix(in srgb, var(--ln-gold) 12%, transparent)",
                background: VOID,
              }}
            >
              {nowPlaying?.artUrl ? (
                <img src={nowPlaying.artUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <img src={activeSkinImg} alt="" className="w-full h-full object-cover" />
              )}
              {nowPlaying?.artUrl && (
                <div
                  className="absolute bottom-3 left-3 overflow-hidden rounded-lg"
                  style={{
                    width: 56,
                    height: 72,
                    border: "1.5px solid color-mix(in srgb, var(--ln-gold) 50%, transparent)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                  }}
                >
                  <img src={activeSkinImg} alt="Active avatar" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1rem", color: ACCENT }}>
                {nowPlaying?.title ?? "Pop-out chat active"}
              </div>
              <div style={{ fontSize: "0.55rem", color: INK_MUTED, marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
                Drag the chat · resize from corner · dock anytime
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLayoutMode("workspace")}
              className="mt-4 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              style={{ border: `1px solid ${PANEL_BORDER}`, color: INK_MUTED, fontSize: "0.45rem" }}
            >
              <Minimize2 size={11} /> DOCK CHAT
            </button>
          </div>

          {/* Floating chat panel */}
          <div
            className="fixed z-[420] flex flex-col overflow-hidden rounded-2xl shadow-2xl"
            style={{
              left: popoutPos.x,
              top: popoutPos.y,
              width: popoutSize.w,
              height: popoutSize.h,
              border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            }}
          >
            {chatColumn}
            <button
              type="button"
              aria-label="Resize pop-out"
              className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize"
              style={{ color: "rgba(196,154,40,0.55)" }}
              onMouseDown={(e) => {
                e.preventDefault();
                popoutResizeRef.current = {
                  startX: e.clientX,
                  startY: e.clientY,
                  origW: popoutSize.w,
                  origH: popoutSize.h,
                };
              }}
            >
              <GripVertical size={14} />
            </button>
          </div>
        </>
      )}
      {contextRef && (
        <div
          className="fixed inset-0 z-50 2xl:hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeContext();
          }}
          style={{ background: "color-mix(in srgb, var(--ln-void) 54%, transparent)" }}
        >
          <div
            className="absolute inset-x-3 top-16 bottom-4"
            role="dialog"
            aria-modal="true"
            aria-label="Nexus Context Canvas"
          >
            <NexusContextPanel
              context={contextRef}
              suggestion={contextSuggestion}
              nowPlaying={nowPlaying ? { ...nowPlaying, isPlaying: playerState.isPlaying } : null}
              onClose={closeContext}
              onOpen={handleContextOpen}
              onVerify={handleContextVerify}
              onPlay={handleContextPlay}
            />
          </div>
        </div>
      )}
    </div>
  );
}
