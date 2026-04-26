/**
 * KeeperAvatarWidget
 *
 * Self-contained wrapper around FloatingAvatar that:
 *  - Reads the user's active skin from trpc.keeper.getProfile
 *  - Manages agent mode, message history (persisted to localStorage), and cinematic mode state
 *  - Calls trpc.keeper.chat for LLM responses with full conversation history + optional imageUrls
 *  - Per-message: edit (inline), copy, delete
 *  - Chat controls: Clear All, Copy All, Save to Archive, Chat Refresh
 *  - Archive: save/load/delete threads synced to DB
 *  - Profile gate: Guide-only mode for users without a complete profile
 *  - Hides on /keeper and auth pages
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import FloatingAvatar, { SKIN_IMAGES } from "./FloatingAvatar";
import { toast } from "sonner";

type AgentMode = "Guide" | "Conductor" | "Witness" | "Custodian" | "Archivist";

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: AgentMode;
  timestamp: number;
  /** If true, message is being edited inline */
  editing?: boolean;
}

const HIDDEN_PATHS = ["/keeper", "/verify", "/download", "/login"];
const CHAT_STORAGE_KEY = "ln-keeper-chat-v2";
const MAX_STORED_MESSAGES = 200;

function loadMessages(): AgentMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-MAX_STORED_MESSAGES);
  } catch {
    return [];
  }
}

function saveMessages(msgs: AgentMessage[]) {
  try {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_STORED_MESSAGES)));
  } catch {
    // localStorage quota exceeded — fail silently
  }
}

const PERSONA_ID: Record<AgentMode, string> = {
  Guide: "guide",
  Conductor: "conductor",
  Witness: "witness",
  Custodian: "custodian",
  Archivist: "archivist",
};

export default function KeeperAvatarWidget() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mode, setMode] = useState<AgentMode>("Guide");
  const [messages, setMessages] = useState<AgentMessage[]>(() => loadMessages());
  const [cinematic, setCinematic] = useState(false);
  const nowPlayingRef = useRef<{ title: string; artist: string } | null>(null);

  // ─── tRPC ─────────────────────────────────────────────────────────────────
  const profileQuery = trpc.keeper.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });
  const profileGateQuery = trpc.keeper.profileGateCheck.useQuery(undefined, {
    enabled: !!user,
    staleTime: 60_000,
  });
  const chatMutation = trpc.keeper.chat.useMutation();
  const saveNoteMutation = trpc.keeper.saveNote.useMutation();
  const saveArchiveMutation = trpc.keeper.saveArchive.useMutation();
  const listArchivesQuery = trpc.keeper.listArchives.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });
  const deleteArchiveMutation = trpc.keeper.deleteArchive.useMutation();
  const utils = trpc.useUtils();

  // ─── Persist messages to localStorage ────────────────────────────────────
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F11") { e.preventDefault(); setCinematic(c => !c); }
      if (e.key === "Escape" && cinematic) setCinematic(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cinematic]);

  // ─── Now-playing listener ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { title: string; artist: string };
      if (!detail?.title) return;
      const prev = nowPlayingRef.current;
      if (prev?.title === detail.title) return;
      nowPlayingRef.current = detail;
      const msg: AgentMessage = {
        id: `np-${Date.now()}`,
        role: "assistant",
        content: `🎵 Detected: **${detail.title}**${detail.artist ? ` — ${detail.artist}` : ""}. Want me to pull the lyrical structure or harmonic framework for reference?`,
        mode,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, msg]);
    };
    window.addEventListener("ln:nowplaying", handler);
    return () => window.removeEventListener("ln:nowplaying", handler);
  }, [mode]);

  // ─── Profile gate: if no complete profile, force Guide mode ──────────────
  const profileGatePassed = profileGateQuery.data?.passed ?? true;
  const effectiveMode = profileGatePassed ? mode : "Guide";

  // ─── Chat handlers ────────────────────────────────────────────────────────
  const handleAskAgent = useCallback(async (text: string, imageUrls?: string[]) => {
    if (!text.trim() && (!imageUrls || imageUrls.length === 0)) return;

    // Profile gate: only allow Guide mode if profile incomplete
    if (!profileGatePassed && effectiveMode !== "Guide") {
      toast.error("Complete your profile to unlock full Keeper features.");
      return;
    }

    const userMsg: AgentMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      mode: effectiveMode,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    // Build conversation history (last 20 turns to keep context window manageable)
    const historySlice = messages.slice(-20).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    try {
      const res = await chatMutation.mutateAsync({
        mode: effectiveMode,
        message: text,
        imageUrls: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
      });
      const assistantMsg: AgentMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: typeof res.reply === 'string' ? res.reply : String(res.reply),
        mode: effectiveMode,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "The Keeper is momentarily unreachable. Try again.",
        mode: effectiveMode,
        timestamp: Date.now(),
      }]);
    }
  }, [chatMutation, effectiveMode, profileGatePassed, messages]);

  // ─── Per-message operations ───────────────────────────────────────────────
  const handleEditMessage = useCallback((id: string, newContent: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, content: newContent, editing: false } : m));
  }, []);

  const handleDeleteMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id));
  }, []);

  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).then(() => toast.success("Copied to clipboard"));
  }, []);

  // ─── Thread operations ────────────────────────────────────────────────────
  const handleClearAll = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    toast.success("Chat cleared");
  }, []);

  const handleCopyAll = useCallback(() => {
    const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join("\n\n");
    navigator.clipboard.writeText(text).then(() => toast.success("Full chat copied to clipboard"));
  }, [messages]);

  const handleSaveArchive = useCallback(async () => {
    if (messages.length === 0) { toast.error("No messages to archive"); return; }
    const title = `${effectiveMode} — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    try {
      await saveArchiveMutation.mutateAsync({
        title,
        messages: messages.map(m => ({ id: m.id, role: m.role as "user" | "assistant" | "system", content: m.content, timestamp: m.timestamp })),
      });
      utils.keeper.listArchives.invalidate();
      toast.success(`Archived as "${title}"`);
    } catch {
      toast.error("Failed to save archive");
    }
  }, [messages, effectiveMode, saveArchiveMutation, utils]);

  const handleLoadArchive = useCallback((archiveMessages: { id: string; role: string; content: string; timestamp: number }[]) => {
    const loaded: AgentMessage[] = archiveMessages.map(m => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      mode: effectiveMode,
      timestamp: m.timestamp,
    }));
    setMessages(loaded);
    toast.success("Archive loaded into chat");
  }, [effectiveMode]);

  const handleDeleteArchive = useCallback(async (archiveId: number) => {
    try {
      await deleteArchiveMutation.mutateAsync({ archiveId });
      utils.keeper.listArchives.invalidate();
      toast.success("Archive deleted");
    } catch {
      toast.error("Failed to delete archive");
    }
  }, [deleteArchiveMutation, utils]);

  const handleChatRefresh = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  }, []);

  // ─── Render guard ─────────────────────────────────────────────────────────
  if (!user) return null;
  if (HIDDEN_PATHS.some(p => location.startsWith(p))) return null;

  const profile = profileQuery.data;
  const activeSkinId = profile?.activeSkinId ?? "hooded-scholar";
  const customImageUrl = profile?.customImageUrl ?? null;
  const archives = listArchivesQuery.data ?? [];

  const handleSaveNote = async (content: string, imageUrl?: string) => {
    if (!content.trim()) return;
    await saveNoteMutation.mutateAsync({
      personaId: PERSONA_ID[mode],
      content,
      imageUrl,
    });
  };

  return (
    <FloatingAvatar
      activeSkinId={activeSkinId}
      customImageUrl={customImageUrl}
      agentMode={effectiveMode}
      agentMessages={messages}
      onAskAgent={handleAskAgent}
      onModeChange={(m) => {
        if (!profileGatePassed) {
          toast.error("Complete your profile to unlock Keeper modes.");
          return;
        }
        setMode(m as AgentMode);
      }}
      onSaveNote={handleSaveNote}
      cinematicMode={cinematic}
      onCinematicToggle={() => setCinematic(c => !c)}
      userName={user.name || user.artistHandle || "Creator"}
      isThinking={chatMutation.isPending}
      isSavingNote={saveNoteMutation.isPending}
      onEditMessage={handleEditMessage}
      onDeleteMessage={handleDeleteMessage}
      onCopyMessage={handleCopyMessage}
      onClearAll={handleClearAll}
      onCopyAll={handleCopyAll}
      onSaveArchive={handleSaveArchive}
      onChatRefresh={handleChatRefresh}
      archives={archives}
      onLoadArchive={handleLoadArchive}
      onDeleteArchive={handleDeleteArchive}
      profileGatePassed={profileGatePassed}
      profileGateMissing={profileGateQuery.data?.missing ?? []}
      isSavingArchive={saveArchiveMutation.isPending}
    />
  );
}
