/**
 * KeeperAvatarWidget
 *
 * Self-contained wrapper around FloatingAvatar that:
 *  - Reads the user's active skin from trpc.keeper.getProfile
 *  - Manages agent mode, message history, and cinematic mode state
 *  - Calls trpc.keeper.chat for LLM responses
 *  - Hides on /keeper and auth pages
 */
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import FloatingAvatar, { SKIN_IMAGES } from "./FloatingAvatar";

type AgentMode = "Guide" | "Conductor" | "Critic" | "Custodian";

interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode: AgentMode;
}

const HIDDEN_PATHS = ["/keeper", "/verify", "/download", "/login"];

export default function KeeperAvatarWidget() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mode, setMode] = useState<AgentMode>("Guide");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [cinematic, setCinematic] = useState(false);
  const nowPlayingRef = useRef<{ title: string; artist: string } | null>(null);

  const profileQuery = trpc.keeper.getProfile.useQuery(undefined, {
    enabled: !!user,
    staleTime: 30_000,
  });
  const chatMutation = trpc.keeper.chat.useMutation();

  // Keyboard shortcut for cinematic mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F11") { e.preventDefault(); setCinematic(c => !c); }
      if (e.key === "Escape" && cinematic) setCinematic(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cinematic]);

  // Listen for now-playing events dispatched by FloatingAvatar
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
      };
      setMessages(prev => [...prev, msg]);
    };
    window.addEventListener("ln:nowplaying", handler);
    return () => window.removeEventListener("ln:nowplaying", handler);
  }, [mode]);

  // Don't render on hidden paths or when not logged in
  if (!user) return null;
  if (HIDDEN_PATHS.some(p => location.startsWith(p))) return null;

  const profile = profileQuery.data;
  const activeSkinId = profile?.activeSkinId ?? "hooded-scholar";
  const customImageUrl = profile?.customImageUrl ?? null;

  const handleAskAgent = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: AgentMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      mode,
    };
    setMessages(prev => [...prev, userMsg]);
    try {
      const res = await chatMutation.mutateAsync({ mode, message: text });
      const assistantMsg: AgentMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: typeof res.reply === 'string' ? res.reply : String(res.reply),
        mode,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "The Keeper is momentarily unreachable. Try again.",
        mode,
      }]);
    }
  };

  return (
    <FloatingAvatar
      activeSkinId={activeSkinId}
      customImageUrl={customImageUrl}
      agentMode={mode}
      agentMessages={messages}
      onAskAgent={handleAskAgent}
      onModeChange={(m) => setMode(m as AgentMode)}
      cinematicMode={cinematic}
      onCinematicToggle={() => setCinematic(c => !c)}
      userName={user.name || user.artistHandle || 'Creator'}
      isThinking={chatMutation.isPending}
    />
  );
}
