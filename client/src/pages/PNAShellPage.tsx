/**
 * PNA Shell — Provenance Nexus Avatar workspace
 * Traditional chat architecture with:
 *  - Fixed/adjustable chat column (or floating pop-out)
 *  - Music dock bound into the PNA stage
 *  - Chat background skins
 *  - Thread-first private navigation with compact appearance controls
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import {
  Zap, Eye, Layers, Archive, Sparkles, Search, Music, FileText,
  Image, Shield, Upload, BookOpen, Settings, LogOut,
  ChevronRight, Send, Loader2, ExternalLink, Save, Film, BookMarked,
  Play, Pause, SkipBack, SkipForward, PanelRightOpen, PanelRightClose,
  Maximize2, Minimize2, GripVertical, Plus, Menu,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { usePlayer } from "@/contexts/PlayerContext";
import NexusAvatarViewer from "@/components/NexusAvatarViewer";
import { NexusContextPanel } from "@/components/NexusContextPanel";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PNAVisualProposalCard, type PNAVisualProposal } from "@/components/PNAVisualProposalCard";
import { PNAQuiverWorkspace } from "@/components/PNAQuiverWorkspace";
import { PNACommandPalette } from "@/components/pna/PNACommandPalette";
import { PNAWorkspaceRail } from "@/components/pna/PNAWorkspaceRail";
import { PNAThreadRail } from "@/components/pna/PNAThreadRail";
import { PNAComposerBar } from "@/components/pna/PNAComposerBar";
import type { PNAInspectionSurface, PNAMode, PNAThreadSummary, PNAWorkspaceArtifact, PNAWorkspaceSurface } from "@/components/pna/pnaWorkspaceTypes";
import { SKIN_IMAGES } from "@/components/FloatingAvatar";
import { PNA_PRODUCT } from "@/lib/loopProduct";
import { consumePnaDiaryReload } from "@/lib/pnaDiary";
import { AI_OPERATIONS_ENABLED, AI_OPERATIONS_PAUSE_MESSAGE } from "@shared/aiAvailability";
import {
  getVisionPromptErrorMessage,
  getVisionPromptLength,
  getVisionPromptLimitMessage,
  isVisionPromptOverLimit,
  VISION_PROMPT_MAX_LENGTH,
} from "@/lib/visionPrompt";
import {
  contextRoute,
  createContextSuggestion,
  type NexusContextRef,
  type NexusContextSuggestion,
} from "@/lib/nexusContext";

// ─── Stewardship modes ────────────────────────────────────────────────────────

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

const AVATAR_SKINS = [
  { id: "hooded-scholar", name: "Hooded Scholar" },
  { id: "conductor", name: "The Conductor" },
  { id: "witness", name: "The Witness" },
  { id: "archivist", name: "The Archivist" },
  { id: "cipher", name: "The Cipher" },
] as const;

const LS_LAYOUT = "ln-pna-layout";
const LS_DRAWER = "ln-pna-drawer-open";
const LS_OPEN_NOTES = "ln-keeper-notes-open";
const LS_WORKSPACE_SURFACE = "ln-pna-workspace-surface";

interface Message {
  id: string;
  role: "user" | "pna";
  content: string;
  mode: PNAMode;
  timestamp: Date;
  visualProposal?: PNAVisualProposal;
}

type LayoutMode = "workspace" | "popout";

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
  const search = useSearch();
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
  const [popoutPos, setPopoutPos] = useState({ x: 72, y: 64 });
  const [popoutSize, setPopoutSize] = useState({ w: 440, h: 640 });
  const [contextRef, setContextRef] = useState<NexusContextRef | null>(null);
  const [contextSuggestion, setContextSuggestion] = useState<NexusContextSuggestion | null>(null);
  const [workspaceSurface, setWorkspaceSurface] = useState<PNAWorkspaceSurface>(() => {
    const saved = readString(LS_WORKSPACE_SURFACE, "conversation");
    return saved === "context" || saved === "artifacts" ? saved : "conversation";
  });
  const [inspectionSurface, setInspectionSurface] = useState<PNAInspectionSurface>("context");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const query = new URLSearchParams(search);
  const routeThreadId = query.get("thread");
  const showQuiver = query.get("view") === "quiver";
  const [threadId, setThreadId] = useState<string | null>(routeThreadId);
  const [threadHydrated, setThreadHydrated] = useState(false);
  const pnaSettingsHref = threadId
    ? `/settings/stewardship?returnTo=${encodeURIComponent(`/pna?thread=${threadId}`)}`
    : "/settings/stewardship";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
  const createThread = trpc.pnaThread.create.useMutation();
  const appendThreadMessage = trpc.pnaThread.append.useMutation();
  const setThreadVisual = trpc.pnaThread.setVisualProposal.useMutation();
  const pnaProfileSettings = trpc.pnaGovernance.profileSettings.useQuery(undefined, { enabled: Boolean(user), staleTime: 60_000 });
  const pnaGovernance = trpc.pnaGovernance.overview.useQuery({ threadId: threadId ?? "" }, { enabled: Boolean(user && threadId) });
  const prepareContextUse = trpc.pnaGovernance.prepareContextUse.useMutation();
  const attachContext = trpc.pnaGovernance.attachContext.useMutation();
  const detachContext = trpc.pnaGovernance.detachContext.useMutation();
  const createVisualArtifact = trpc.pnaGovernance.createVisualArtifact.useMutation();
  const reviewArtifact = trpc.pnaGovernance.reviewArtifact.useMutation();
  const preserveArtifact = trpc.pnaGovernance.preserveArtifact.useMutation();
  const discardArtifact = trpc.pnaGovernance.discardArtifact.useMutation();
  const threadQuery = trpc.pnaThread.get.useQuery({ id: threadId ?? "" }, { enabled: Boolean(user && threadId) });
  const threadListQuery = trpc.pnaThread.list.useQuery(undefined, { enabled: Boolean(user), staleTime: 60_000 });
  const setActiveSkin = trpc.keeper.setActiveSkin.useMutation({
    onSuccess: () => {
      utils.keeper.getProfile.invalidate();
      toast.success("Avatar skin activated.");
    },
    onError: (e) => toast.error(e.message ?? "Could not activate skin."),
  });

  const currentMode = PNA_MODES.find(m => m.id === activeMode) ?? PNA_MODES[0];
  const activeProfile = pnaProfileSettings.data?.find((profile) => profile.id === activeMode) ?? null;
  const contextEntries = (pnaGovernance.data?.entries ?? []) as Array<{ state: string }>;
  const threadSummaries = (threadListQuery.data ?? []) as PNAThreadSummary[];
  const attachedContextCount = contextEntries.filter((entry) => entry.state === "attached").length;
  const activeThreadSummary = threadSummaries.find((thread) => thread.id === threadId) ?? null;
  const governedArtifacts = (pnaGovernance.data?.artifacts ?? []) as PNAWorkspaceArtifact[];
  const artifactByMessage = useMemo(
    () => new Map(governedArtifacts.filter((artifact) => artifact.originMessageId).map((artifact) => [artifact.originMessageId!, artifact])),
    [governedArtifacts],
  );
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setThreadId(routeThreadId);
    setThreadHydrated(false);
  }, [routeThreadId]);

  useEffect(() => {
    if (!threadQuery.data || threadHydrated) return;
    setMessages(threadQuery.data.messages.map((message: any) => ({
      id: message.id,
      role: message.role === "user" ? "user" as const : "pna" as const,
      content: message.content,
      mode: message.mode as PNAMode,
      timestamp: new Date(message.createdAt),
      visualProposal: message.visualProposalJson as PNAVisualProposal | undefined,
    })));
    setActiveMode(threadQuery.data.thread.activeMode as PNAMode);
    setThreadHydrated(true);
  }, [threadQuery.data, threadHydrated]);

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
    try { localStorage.setItem(LS_LAYOUT, layoutMode); } catch { /* ignore */ }
  }, [layoutMode]);

  useEffect(() => {
    try { localStorage.setItem(LS_DRAWER, sidebarCollapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try { localStorage.setItem(LS_WORKSPACE_SURFACE, workspaceSurface); } catch { /* ignore */ }
  }, [workspaceSurface]);

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

  const openThread = useCallback((id: string) => {
    setWorkspaceSurface("conversation");
    setThreadHydrated(false);
    navigate(`/pna?thread=${encodeURIComponent(id)}`);
  }, [navigate]);

  const startThread = useCallback(async (mode: PNAMode = activeMode) => {
    const created = await createThread.mutateAsync({ activeMode: mode });
    setMessages([]);
    await utils.pnaThread.list.invalidate();
    openThread(created.id);
    return created.id;
  }, [activeMode, createThread, openThread, utils]);

  const ensureThread = useCallback(async (mode: PNAMode) => threadId ?? startThread(mode), [threadId, startThread]);

  const handleSend = useCallback(async () => {
    if (!AI_OPERATIONS_ENABLED) {
      toast.info(AI_OPERATIONS_PAUSE_MESSAGE);
      return;
    }
    const text = input.trim();
    if (!text || isLoading || !user) return;
    if (activeProfile && !activeProfile.isEnabled) {
      toast.error(`${activeProfile.label} is disabled in Stewardship settings.`);
      navigate(pnaSettingsHref);
      return;
    }
    if (activeMode === "vision" && isVisionPromptOverLimit(text)) {
      toast.error(getVisionPromptLimitMessage(text));
      return;
    }

    setInput("");
    setIsLoading(true);

    try {
      const activeThreadId = await ensureThread(activeMode);
      // The gateway produces an immutable receipt only when selected Context
      // exists. It rechecks the profile policy and source ownership server-side.
      const canUseSelectedContext = Boolean(activeProfile?.allowRemoteContext);
      const preparedContext = activeMode === "vision" || !canUseSelectedContext
        ? { receiptId: null, sourceCount: 0 }
        : await prepareContextUse.mutateAsync({ threadId: activeThreadId, profileId: activeMode });
      const persistedUser = await appendThreadMessage.mutateAsync({ threadId: activeThreadId, role: "user", content: text, mode: activeMode });
      setMessages(prev => [...prev, { id: persistedUser.id, role: "user", content: text, mode: activeMode, timestamp: new Date() }]);
      if (activeMode === "vision") {
        const visual = await generateArtwork.mutateAsync({ prompt: text, pnaThreadId: activeThreadId, pnaProfileId: "vision" });
        const content = "A private cover-art proposal is ready. Review it below; it will not enter Quiver until you choose to save it.";
        const persistedPna = await appendThreadMessage.mutateAsync({ threadId: activeThreadId, role: "pna", content, mode: "vision", visualProposal: { url: visual.url, prompt: text } });
        await createVisualArtifact.mutateAsync({
          threadId: activeThreadId,
          originMessageId: persistedPna.id,
          url: visual.url,
          prompt: text,
          title: "Private visual proposal",
        });
        setMessages(prev => [...prev, {
          id: persistedPna.id,
          role: "pna",
          content,
          mode: "vision",
          timestamp: new Date(),
          visualProposal: { url: visual.url, prompt: text },
        }]);
        await utils.pnaThread.list.invalidate();
        await utils.pnaGovernance.overview.invalidate({ threadId: activeThreadId });
        setInspectionSurface("artifacts");
        return;
      }
      const result = await chatMutation.mutateAsync({
        message: text,
        persona: currentMode.persona,
        pnaThreadId: activeThreadId,
        pnaProfileId: activeMode,
        ...(preparedContext.receiptId ? { pnaContextReceiptId: preparedContext.receiptId } : {}),
        history: messages.slice(-8).map(m => ({
          role: m.role === "user" ? "user" as const : "assistant" as const,
          content: m.content,
        })),
      });
      const replyText = typeof result.reply === "string" ? result.reply : (result.reply as any)?.[0]?.text ?? "";
      const persistedPna = await appendThreadMessage.mutateAsync({ threadId: activeThreadId, role: "pna", content: replyText, mode: activeMode });
      setMessages(prev => [...prev, {
        id: persistedPna.id,
        role: "pna",
        content: replyText,
        mode: activeMode,
        timestamp: new Date(),
      }]);
      await utils.pnaThread.list.invalidate();
      await utils.pnaGovernance.overview.invalidate({ threadId: activeThreadId });
    } catch (e: any) {
      toast.error(activeMode === "vision" ? getVisionPromptErrorMessage(e) : (e.message ?? "PNA unavailable"));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activeMode, activeProfile, currentMode, messages, chatMutation, generateArtwork, user, ensureThread, appendThreadMessage, prepareContextUse, createVisualArtifact, utils, navigate]);

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
      if (threadId) await setThreadVisual.mutateAsync({ threadId, messageId, visualProposal: { ...proposal, savedQuiverId: saved.id } });
      await utils.quiver.list.invalidate();
      toast.success("Saved privately to Quiver.");
    } catch (error: any) {
      toast.error(error.message ?? "Could not save this visual to Quiver.");
    }
  }, [messages, saveQuiverAsset, utils, threadId, setThreadVisual]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleActivateSkin = async (skinId: string) => {
    if (skinId !== "hooded-scholar" && !ownedSkins.has(skinId) && skinId !== "custom") {
      toast.info("Unlock this skin in Keeper or Avatar Registry.");
      navigate("/keeper");
      return;
    }
    await setActiveSkin.mutateAsync({ skinId });
  };

  const focusComposer = useCallback(() => {
    setWorkspaceSurface("conversation");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const openWorkspaceSurface = useCallback((surface: PNAWorkspaceSurface) => {
    setWorkspaceSurface(surface);
    if (surface === "context" && !contextRef && nowPlaying) openNowPlayingContext();
  }, [contextRef, nowPlaying, openNowPlayingContext]);

  const openInspectionSurface = useCallback((surface: PNAInspectionSurface) => {
    setInspectionSurface(surface);
    setWorkspaceSurface(surface === "artifacts" ? "artifacts" : "context");
    if (surface === "context" && !contextRef && nowPlaying) openNowPlayingContext();
  }, [contextRef, nowPlaying, openNowPlayingContext]);

  const refreshGovernance = useCallback(async (id: string) => {
    await utils.pnaGovernance.overview.invalidate({ threadId: id });
  }, [utils]);

  const handleAttachNowPlaying = useCallback(async () => {
    if (!nowPlaying?.id) {
      toast.message("Play one of your Works before attaching it to a private Context Envelope.");
      return;
    }
    try {
      const activeThreadId = await ensureThread(activeMode);
      await attachContext.mutateAsync({ threadId: activeThreadId, profileId: activeMode, sourceKind: "work", sourceRef: String(nowPlaying.id) });
      await refreshGovernance(activeThreadId);
      toast.success("Work attached to this private Context Envelope.");
    } catch (error: any) {
      toast.error(error.message ?? "Could not attach this Work to private PNA context.");
    }
  }, [activeMode, attachContext, ensureThread, nowPlaying?.id, refreshGovernance]);

  const handleDetachContext = useCallback(async (entryId: string) => {
    if (!threadId) return;
    try {
      await detachContext.mutateAsync({ threadId, entryId });
      await refreshGovernance(threadId);
      toast.success("Context source detached from future PNA use.");
    } catch (error: any) {
      toast.error(error.message ?? "Could not detach this private source.");
    }
  }, [detachContext, refreshGovernance, threadId]);

  const handleArtifactAction = useCallback(async (id: string, action: "review" | "preserve" | "discard") => {
    try {
      if (action === "review") await reviewArtifact.mutateAsync({ id });
      if (action === "preserve") await preserveArtifact.mutateAsync({ id });
      if (action === "discard") await discardArtifact.mutateAsync({ id });
      if (threadId) await refreshGovernance(threadId);
      toast.success(action === "preserve" ? "Artifact preserved privately in Quiver." : action === "discard" ? "Artifact removed from private review." : "Artifact marked reviewed.");
    } catch (error: any) {
      toast.error(error.message ?? "Artifact review action could not be completed.");
    }
  }, [discardArtifact, preserveArtifact, refreshGovernance, reviewArtifact, threadId]);

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
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.4)", marginTop: 8 }}>
            pna.livingnexus.org · Creator Workspace
          </div>
        </div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.9rem", color: "rgba(255,255,255,0.5)", textAlign: "center", maxWidth: 320, lineHeight: 1.7 }}>
          Your persistent intelligence layer. Sign in to activate your workspace.
        </div>
        <a
          href={getLoginUrl("/pna")}
          className="flex items-center gap-2 px-6 py-3 rounded-lg transition-all hover:opacity-80"
          style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.4)", color: "#C9A84C", fontFamily: "'Space Mono', monospace", fontSize: "var(--text-xs)", letterSpacing: "0.08em", textDecoration: "none" }}
        >
          SIGN IN TO WORKSPACE
        </a>
        <a href="https://livingnexus.org" style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--text-xs)", color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>
          ← Back to Living Nexus
        </a>
      </div>
    );
  }

  if (showQuiver) {
    return (
      <div className="min-h-screen" style={{ background: "var(--ln-void)" }}>
        <PNAQuiverWorkspace onBack={() => navigate(threadId ? `/pna?thread=${encodeURIComponent(threadId)}` : "/pna")} />
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
        <div style={{ fontSize: "var(--text-xs)", color: "rgba(196,154,40,0.6)", letterSpacing: "0.12em", fontFamily: "'Space Mono', monospace" }}>
          {playerState.isPlaying ? "NOW PLAYING · BOUND TO THREAD" : nowPlaying ? "PAUSED · BOUND TO THREAD" : "MUSIC · PLAY A TRACK TO BIND"}
        </div>
        <div className="truncate" style={{ fontFamily: "'Cinzel', serif", fontSize: "var(--text-sm)", color: INK }}>
          {nowPlaying?.title ?? "No track loaded"}
        </div>
        <div className="truncate" style={{ fontSize: "var(--text-xs)", color: INK_MUTED, fontFamily: "'Space Mono', monospace" }}>
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
    <header className="flex min-h-[78px] items-center justify-between gap-4 px-5 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${PANEL_BORDER}`, background: "var(--ln-panel)" }}>
      <div className="min-w-0">
        <p className="font-display text-[var(--text-xs)] tracking-[0.16em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Private working thread</p>
        <h1 className="mt-1 truncate font-editorial text-[var(--text-h3)] leading-none" style={{ color: INK }}>{activeThreadSummary?.title ?? "Begin a private thread"}</h1>
        <p className="mt-1 truncate font-body text-[var(--text-sm)]" style={{ color: INK_MUTED }}>{currentMode.desc} · {attachedContextCount === 0 ? "No context attached" : `${attachedContextCount} selected source${attachedContextCount === 1 ? "" : "s"}`}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button type="button" onClick={() => setLayoutMode("popout")} className="hidden min-h-11 items-center gap-2 rounded-lg px-3 lg:flex focus-visible:outline-none focus-visible:ring-2" style={{ border: `1px solid ${PANEL_BORDER}`, color: INK_MUTED, fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.07em" }} title="Focus this private conversation"><Maximize2 size={14} /> FOCUS</button>
        <button type="button" onClick={() => setCommandPaletteOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-lg px-3 md:flex focus-visible:outline-none focus-visible:ring-2" style={{ border: `1px solid ${PANEL_BORDER}`, color: INK_MUTED, fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.07em" }} aria-label="Open workspace command palette"><Search size={14} /> COMMAND</button>
        <button type="button" onClick={() => startThread()} disabled={createThread.isPending} className="flex min-h-11 items-center gap-2 rounded-lg px-3 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2" style={{ background: ACCENT, color: VOID, fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.07em" }}><Plus size={14} /> <span className="hidden sm:inline">NEW THREAD</span></button>
      </div>
    </header>
  );

  const messagesPane = (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6" style={{ overscrollBehavior: "contain" }}>
      {messages.length === 0 ? (
        <div className="mx-auto flex h-full w-full max-w-2xl flex-col justify-center">
          <div className="max-w-xl">
            <p className="font-display text-[var(--text-xs)] tracking-[0.16em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>A private place to begin</p>
            <h2 className="mt-3 font-editorial text-[var(--text-h2)] leading-tight" style={{ color: INK }}>What needs shape, witness, or careful review?</h2>
            <p className="mt-3 max-w-lg font-body text-[var(--text-base)] leading-relaxed" style={{ color: INK_MUTED }}>Start with an intention, a question, or a chosen Work. PNA can only use a Work after you deliberately attach it to this thread.</p>
          </div>
          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {[
              { label: "Clarify the intent behind this Work", mode: "guide" as PNAMode },
              { label: "Shape an arrangement or next revision", mode: "conductor" as PNAMode },
              { label: "Reflect on the testimony it carries", mode: "witness" as PNAMode },
              { label: "Prepare a private visual direction", mode: "vision" as PNAMode },
            ].map((suggestion) => (
              <button key={suggestion.label} type="button" onClick={() => { setActiveMode(suggestion.mode); setInput(suggestion.label); inputRef.current?.focus(); }} className="rounded-lg px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 hover:bg-[color-mix(in_srgb,var(--ln-gold)_7%,transparent)]" style={{ background: SURFACE, border: `1px solid ${PANEL_BORDER}` }}>
                <p className="font-body text-[var(--text-base)]" style={{ color: INK_BODY }}>{suggestion.label}</p>
                <p className="mt-1 font-body text-[var(--text-xs)]" style={{ color: INK_MUTED }}>{PNA_MODES.find((mode) => mode.id === suggestion.mode)?.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl">
          {messages.map((msg) => {
            const modeConfig = PNA_MODES.find((mode) => mode.id === msg.mode) ?? PNA_MODES[0];
            const isUser = msg.role === "user";
            return (
              <article key={msg.id} className={`mb-7 flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
                {isUser ? (
                  user.profilePhotoUrl ? <img src={user.profilePhotoUrl} alt="" className="mt-1 h-9 w-9 flex-shrink-0 rounded-full object-cover" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 34%, transparent)" }} /> : <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-body text-[var(--text-sm)]" style={{ background: "color-mix(in srgb, var(--ln-gold) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)", color: ACCENT }}>{(user.name ?? "?")[0].toUpperCase()}</div>
                ) : <img src={activeSkinImg} alt="" className="mt-1 h-9 w-9 flex-shrink-0 rounded-full object-cover" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 40%, transparent)" }} />}
                <div className={`min-w-0 max-w-[min(88%,44rem)] ${isUser ? "ml-auto" : ""}`}>
                  <div className={`mb-1.5 flex items-center gap-2 ${isUser ? "justify-end" : ""}`}>
                    <span className="font-display text-[var(--text-xs)] tracking-[0.1em] uppercase" style={{ color: isUser ? "var(--ln-gold)" : "var(--ln-gold-dim)" }}>{isUser ? "You" : `PNA · ${modeConfig.label}`}</span>
                    <span className="font-mono text-[var(--text-xs)]" style={{ color: INK_MUTED }}>{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="rounded-xl px-4 py-3" style={{ background: isUser ? "color-mix(in srgb, var(--ln-gold) 12%, var(--ln-coal))" : SURFACE, border: `1px solid ${isUser ? "color-mix(in srgb, var(--ln-gold) 28%, transparent)" : PANEL_BORDER}` }}>
                    <p className="whitespace-pre-wrap font-body text-[var(--text-base)] leading-relaxed" style={{ color: INK }}>{msg.content}</p>
                  </div>
                  {msg.visualProposal && (artifactByMessage.has(msg.id) ? <button type="button" onClick={() => openInspectionSurface("artifacts")} className="mt-3 flex min-h-11 items-center gap-2 rounded-lg px-3 text-left focus-visible:outline-none focus-visible:ring-2" style={{ background: "color-mix(in srgb, var(--ln-gold) 10%, var(--ln-coal))", border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, var(--ln-panel-border))", color: ACCENT, fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.07em" }}><Archive size={13} /> PRIVATE ARTIFACT READY FOR REVIEW</button> : <PNAVisualProposalCard proposal={msg.visualProposal} isSaving={saveQuiverAsset.isPending} onSave={() => handleSaveVisualProposal(msg.id)} onOpenQuiver={msg.visualProposal.savedQuiverId ? () => navigate(`/pna?view=quiver&thread=${encodeURIComponent(threadId ?? "")}`) : undefined} />)}
                  {!isUser && <button type="button" onClick={() => saveNoteMutation.mutate({ content: msg.content, personaId: msg.mode })} className="mt-2 flex min-h-10 items-center gap-1.5 rounded px-1.5 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2" style={{ color: INK_MUTED, fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.06em" }}><Save size={12} /> SAVE TO NOTES</button>}
                </div>
              </article>
            );
          })}
          {isLoading && <div className="flex items-center gap-3"><img src={activeSkinImg} alt="" className="h-9 w-9 rounded-full object-cover" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)" }} /><div className="flex gap-1 rounded-xl px-4 py-3" style={{ background: SURFACE, border: `1px solid ${PANEL_BORDER}` }}><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: ACCENT }} /><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: ACCENT, animationDelay: "0.15s" }} /><span className="h-2 w-2 animate-pulse rounded-full" style={{ background: ACCENT, animationDelay: "0.3s" }} /></div></div>}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );

  const composer = (
    <PNAComposerBar
      activeMode={activeMode}
      modes={PNA_MODES}
      profile={activeProfile}
      contextCount={attachedContextCount}
      value={input}
      isSending={isLoading}
      isWorkInProgress={!AI_OPERATIONS_ENABLED}
      isVisionPromptInvalid={activeMode === "vision" && isVisionPromptOverLimit(input)}
      visionCounter={activeMode === "vision" ? `${getVisionPromptLength(input).toLocaleString()} / ${VISION_PROMPT_MAX_LENGTH.toLocaleString()}` : undefined}
      inputRef={inputRef}
      onChange={setInput}
      onKeyDown={handleKeyDown}
      onSelectProfile={(mode) => { setActiveMode(mode); focusComposer(); }}
      onAttachContext={() => { void handleAttachNowPlaying(); }}
      onOpenSettings={() => navigate(pnaSettingsHref)}
      onSend={() => { void handleSend(); }}
    />
  );

  const chatColumn = (
    <div
      className="flex flex-col min-h-0 h-full overflow-hidden"
      style={{ background: PANEL }}
    >
      {chatHeader}
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
          <div className="min-w-0 flex-1 truncate" style={{ fontSize: "var(--text-sm)", color: INK, fontFamily: "'Space Mono', monospace" }}>
            {nowPlaying ? `${playerState.isPlaying ? "▶" : "❚❚"} ${nowPlaying.title}` : "Cinematic ready — start playback"}
          </div>
        </div>
      )}
      {messagesPane}
      {musicDock}
      {composer}
    </div>
  );

  const leftDrawer = (mobile = false) => (
    <PNAThreadRail
      mobile={mobile}
      collapsed={!mobile && sidebarCollapsed}
      threads={threadSummaries}
      activeThreadId={threadId}
      activeMode={activeMode}
      modes={PNA_MODES}
      contextCount={attachedContextCount}
      appearanceImageUrl={activeSkinImg}
      onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
      onClose={mobile ? () => setMobileRailOpen(false) : undefined}
      onCreateThread={() => { void startThread(); }}
      onSelectThread={openThread}
      onOpenCommand={() => setCommandPaletteOpen(true)}
      onOpenAppearance={() => navigate("/keeper")}
      onNavigate={(href) => navigate(
        href === "/settings/stewardship"
          ? pnaSettingsHref
          : href === "/pna?view=quiver" && threadId
            ? `${href}&thread=${encodeURIComponent(threadId)}`
            : href,
      )}
    />
  );

  const mobileSurfaceNavigation = (
    <div className="grid grid-cols-3 gap-1 px-3 py-2 xl:hidden" role="tablist" aria-label="PNA workspace surfaces" style={{ borderBottom: `1px solid ${PANEL_BORDER}`, background: "var(--ln-panel)" }}>
      {([
        ["conversation", "Conversation", Sparkles],
        ["context", "Context", Layers],
        ["artifacts", "Artifacts", Image],
      ] as const).map(([surface, label, Icon]) => {
        const selected = workspaceSurface === surface;
        return (
          <button
            key={surface}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => openWorkspaceSurface(surface)}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2"
            style={{
              background: selected ? "color-mix(in srgb, var(--ln-gold) 15%, transparent)" : "transparent",
              border: `1px solid ${selected ? "color-mix(in srgb, var(--ln-gold) 38%, transparent)" : "transparent"}`,
              color: selected ? ACCENT : INK_MUTED,
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xs)",
              letterSpacing: "0.08em",
            }}
          >
            <Icon size={13} aria-hidden="true" />
            {label.toUpperCase()}
          </button>
        );
      })}
    </div>
  );

  const rail = (mobile = false) => (
    <PNAWorkspaceRail
      mobile={mobile}
      surface={inspectionSurface}
      onSurfaceChange={openInspectionSurface}
      threadId={threadId}
      envelope={pnaGovernance.data?.envelope ?? null}
      entries={pnaGovernance.data?.entries ?? []}
      profile={activeProfile}
      context={contextRef}
      suggestion={contextSuggestion}
      nowPlaying={nowPlaying ? { ...nowPlaying, isPlaying: playerState.isPlaying } : null}
      artifacts={governedArtifacts}
      artifactSources={pnaGovernance.data?.artifactSources ?? []}
      actionReceipts={pnaGovernance.data?.actionReceipts ?? []}
      useReceipts={pnaGovernance.data?.useReceipts ?? []}
      useEntries={pnaGovernance.data?.useEntries ?? []}
      pendingArtifactAction={reviewArtifact.isPending ? { id: reviewArtifact.variables?.id ?? "", action: "review" } : preserveArtifact.isPending ? { id: preserveArtifact.variables?.id ?? "", action: "preserve" } : discardArtifact.isPending ? { id: discardArtifact.variables?.id ?? "", action: "discard" } : null}
      isDetachingContext={detachContext.isPending}
      onAttachNowPlaying={handleAttachNowPlaying}
      onDetachContext={handleDetachContext}
      onOpenContextReference={handleContextOpen}
      onVerifyContext={handleContextVerify}
      onPlayContext={handleContextPlay}
      onReviewArtifact={(id) => handleArtifactAction(id, "review")}
      onPreserveArtifact={(id) => handleArtifactAction(id, "preserve")}
      onDiscardArtifact={(id) => handleArtifactAction(id, "discard")}
      onOpenQuiver={() => navigate(threadId ? `/pna?view=quiver&thread=${encodeURIComponent(threadId)}` : "/pna?view=quiver")}
      onOpenStewardshipSettings={() => navigate(pnaSettingsHref)}
    />
  );

  // ── Main workspace ─────────────────────────────────────────────────────────
  return (
    <div
      className="pna-workspace-shell flex h-[100dvh] overflow-hidden relative"
      style={{ background: STAGE_BG }}
    >
      <div className="hidden h-full lg:flex">{leftDrawer()}</div>

      {layoutMode === "workspace" ? (
        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 items-center justify-between gap-3 px-4 xl:hidden" style={{ borderBottom: `1px solid ${PANEL_BORDER}`, background: "var(--ln-panel)" }}>
            <div className="flex min-w-0 items-center gap-2">
              <button type="button" onClick={() => setMobileRailOpen(true)} className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2" style={{ border: `1px solid ${PANEL_BORDER}`, color: ACCENT }} aria-label="Open private navigation"><Menu size={17} /></button>
              <div className="min-w-0"><p className="truncate font-display text-[var(--text-sm)] tracking-[0.13em] uppercase" style={{ color: ACCENT }}>PNA</p><p className="mt-0.5 truncate font-body text-[var(--text-xs)]" style={{ color: INK_MUTED }}>{activeThreadSummary?.title ?? "Private workspace"}</p></div>
            </div>
            <button type="button" onClick={() => setCommandPaletteOpen(true)} className="flex min-h-11 items-center gap-2 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2" style={{ border: `1px solid ${PANEL_BORDER}`, color: INK_MUTED, fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.08em" }}><Search size={14} /> COMMAND</button>
          </header>

          {mobileSurfaceNavigation}

          <div className="flex min-h-0 flex-1">
            <section className={`${workspaceSurface === "conversation" ? "flex" : "hidden"} min-w-0 flex-1 flex-col xl:flex`} aria-label="PNA conversation workspace">
              {chatColumn}
            </section>
            <div className="hidden h-full w-[360px] flex-shrink-0 xl:flex">{rail()}</div>
            <div className={`${workspaceSurface === "conversation" ? "hidden" : "flex"} min-h-0 flex-1 xl:hidden`}>{rail(true)}</div>
          </div>
        </main>
      ) : (
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 relative">
          <div
            className="relative h-[min(460px,58vh)] w-[min(360px,80vw)] overflow-hidden rounded-2xl"
            style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 20%, transparent)", boxShadow: "0 0 80px color-mix(in srgb, var(--ln-gold) 12%, transparent)", background: VOID }}
          >
            {nowPlaying?.artUrl ? <img src={nowPlaying.artUrl} alt="" className="h-full w-full object-cover" /> : <img src={activeSkinImg} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="mt-4 text-center">
            <p className="font-display text-[var(--text-h4)]" style={{ color: ACCENT }}>{nowPlaying?.title ?? "Pop-out chat active"}</p>
            <p className="mt-1 font-body text-[var(--text-sm)]" style={{ color: INK_MUTED }}>Drag the conversation, resize from its corner, or dock when ready.</p>
          </div>
          <button type="button" onClick={() => setLayoutMode("workspace")} className="mt-4 flex min-h-11 items-center gap-2 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2" style={{ border: `1px solid ${PANEL_BORDER}`, color: INK_MUTED, fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.08em" }}>
            <Minimize2 size={13} /> DOCK CONVERSATION
          </button>

          <div
            className="fixed z-[420] flex flex-col overflow-hidden rounded-2xl shadow-2xl"
            style={{ left: popoutPos.x, top: popoutPos.y, width: popoutSize.w, height: popoutSize.h, border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)", boxShadow: "0 24px 80px rgba(0,0,0,0.55)" }}
          >
            {chatColumn}
            <button type="button" aria-label="Resize pop-out conversation" className="absolute bottom-1 right-1 h-5 w-5 cursor-se-resize" style={{ color: "var(--ln-gold-dim)" }} onMouseDown={(event) => { event.preventDefault(); popoutResizeRef.current = { startX: event.clientX, startY: event.clientY, origW: popoutSize.w, origH: popoutSize.h }; }}>
              <GripVertical size={14} />
            </button>
          </div>
        </main>
      )}

      <Sheet open={mobileRailOpen} onOpenChange={setMobileRailOpen}>
        <SheetContent side="left" className="p-0 [&>[data-slot=sheet-close]]:hidden" style={{ width: "min(22rem, 90vw)", maxWidth: "22rem", background: "var(--ln-panel)", borderColor: "var(--ln-panel-border)" }}>
          <SheetHeader className="sr-only"><SheetTitle>Private navigation</SheetTitle><SheetDescription>Private PNA threads, quick reference, and library destinations.</SheetDescription></SheetHeader>
          {leftDrawer(true)}
        </SheetContent>
      </Sheet>

      <PNACommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        modes={PNA_MODES}
        activeMode={activeMode}
        threads={threadSummaries}
        activeThreadId={threadId}
        onCreateThread={() => { void startThread(); }}
        onSelectThread={openThread}
        onSelectMode={(mode) => { setActiveMode(mode); focusComposer(); }}
        onOpenSurface={openWorkspaceSurface}
        onFocusComposer={focusComposer}
        onNavigate={(href) => navigate(href === "/pna?view=quiver" && threadId ? `${href}&thread=${encodeURIComponent(threadId)}` : href)}
      />

      {layoutMode !== "workspace" && contextRef && (
        <div className="fixed inset-0 z-50 xl:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeContext(); }} style={{ background: "color-mix(in srgb, var(--ln-void) 54%, transparent)" }}>
          <div className="absolute inset-x-3 bottom-4 top-16" role="dialog" aria-modal="true" aria-label="Nexus Context Canvas">
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
