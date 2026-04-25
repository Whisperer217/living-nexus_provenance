import { useState, useEffect, useRef, useCallback } from "react";
import FloatingAvatar from "@/components/FloatingAvatar";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Anchor,
  GitFork,
  Download,
  ChevronRight,
  ChevronDown,
  Shield,
  Clock,
  Hash,
  Cpu,
  RefreshCw,
  LogOut,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentMode = "Guide" | "Conductor" | "Critic" | "Custodian";
type PPGVariant = "conservative" | "exploratory" | "divergent";

interface AgentMessage {
  id: string;
  role: "agent" | "system";
  content: string;
  mode: AgentMode;
  timestamp: Date;
}

interface PPGResult {
  intent: string;
  prompt_structured: string;
  variants: { conservative: string; exploratory: string; divergent: string };
  lineage_parent: string | null;
}

// ─── Key storage helpers ──────────────────────────────────────────────────────

const PRIVATE_KEY_STORAGE = "ln_private_key_hex";

function getStoredPrivateKey(): string | null {
  return sessionStorage.getItem(PRIVATE_KEY_STORAGE);
}

function storePrivateKey(hex: string) {
  sessionStorage.setItem(PRIVATE_KEY_STORAGE, hex);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreatorSurface() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  // Editor state
  const [editorText, setEditorText] = useState("");
  const [sessionLabel, setSessionLabel] = useState(`Session ${new Date().toLocaleDateString()}`);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Key state
  const [privateKeyHex, setPrivateKeyHex] = useState<string | null>(null);
  const [showKeySetup, setShowKeySetup] = useState(false);

  // Agent state
  const [agentMode, setAgentMode] = useState<AgentMode>("Guide");
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([]);
  const [ppgResult, setPpgResult] = useState<PPGResult | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<PPGVariant | null>(null);
  const [showPPG, setShowPPG] = useState(false);

  // Cinematic mode
  const [cinematicMode, setCinematicMode] = useState(false);

  // Keeper skin (read from keeper profile)
  const keeperQuery = trpc.keeper.getProfile.useQuery(undefined, { enabled: !!user });

  // Provenance state
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);
  const [lastWid, setLastWid] = useState<string | null>(null);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [isCheckpointing, setIsCheckpointing] = useState(false);
  // ─── Autosave idle timer
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track previous line count for structural-change trigger
  const prevLineCount = useRef(0);

  // ─── tRPC hooks ─────────────────────────────────────────────────────────────

  const hasKeypairQuery = trpc.auth.hasKeypair.useQuery(undefined, { enabled: !!user });
  const generateKeypairMutation = trpc.auth.generateKeypair.useMutation();
  const agentQuery = trpc.agents.getOrCreate.useQuery(undefined, { enabled: !!user });
  const agentMessageMutation = trpc.agents.message.useMutation();
  const checkpointMutation = trpc.events.checkpoint.useMutation();
  const anchorMutation = trpc.events.anchor.useMutation();
  const forkMutation = trpc.events.fork.useMutation();
  const ppgMutation = trpc.ppg.generate.useMutation();
  const satchelQuery = trpc.satchel.list.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => navigate("/"),
  });

  // ─── Key setup on mount ──────────────────────────────────────────────────────

  useEffect(() => {
    const stored = getStoredPrivateKey();
    if (stored) {
      setPrivateKeyHex(stored);
      return;
    }
    if (hasKeypairQuery.data !== undefined) {
      if (!hasKeypairQuery.data.hasKey) {
        setShowKeySetup(true);
      } else {
        // Has key in DB but not in session — need to show re-import or generate new
        setShowKeySetup(true);
      }
    }
  }, [hasKeypairQuery.data]);

  // ─── Welcome agent message ────────────────────────────────────────────────

  useEffect(() => {
    if (user && agentMessages.length === 0) {
      addAgentMessage("Welcome to the surface. Your work is witnessed here.", "Guide");
    }
  }, [user]);

  // ─── Now Playing → agent thread notification ────────────────────────────────

  useEffect(() => {
    const handler = (e: Event) => {
      const track = (e as CustomEvent<{ title: string; artist: string }>).detail;
      if (track?.title) {
        addAgentMessage(
          `Now playing: “${track.title}” by ${track.artist}. Want me to pull the lyrical structure for reference?`,
          "Guide"
        );
      }
    };
    window.addEventListener("ln:nowplaying", handler);
    return () => window.removeEventListener("ln:nowplaying", handler);
  }, []);

  // ─── Ephemeral draft to sessionStorage ──────────────────────────────────────

  useEffect(() => {
    const draft = sessionStorage.getItem("ln_draft");
    if (draft) setEditorText(draft);
  }, []);

  const handleEditorChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEditorText(text);
    sessionStorage.setItem("ln_draft", text);

    // Compute pending hash preview (client-side, non-signing)
    if (text.trim()) {
      const canonical = text.replace(/\r\n/g, "\n").trim();
      // Simple preview hash using Web Crypto
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical)).then(buf => {
        const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
        setPendingHash(hex);
      });
    } else {
      setPendingHash(null);
    }

    // Structural-change trigger: new line block added
    const lineCount = text.split("\n").length;
    if (lineCount > prevLineCount.current + 2 && privateKeyHex && text.trim()) {
      triggerCheckpoint(text);
    }
    prevLineCount.current = lineCount;

    // Reset idle timer for checkpoint trigger (7s)
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (text.trim() && privateKeyHex) {
      idleTimer.current = setTimeout(() => {
        triggerCheckpoint(text);
      }, 7000);
    }
  }, [privateKeyHex]);

  // ─── Agent message helper ────────────────────────────────────────────────────

  function addAgentMessage(content: string, mode: AgentMode) {
    setAgentMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: "agent",
      content,
      mode,
      timestamp: new Date(),
    }]);
  }

  // ─── Checkpoint trigger ──────────────────────────────────────────────────────

  const triggerCheckpoint = useCallback(async (text: string) => {
    if (!privateKeyHex || !text.trim() || isCheckpointing) return;
    setIsCheckpointing(true);
    try {
      const result = await checkpointMutation.mutateAsync({
        payloadText: text,
        parentEventId: lastEventId,
        sessionLabel,
        privateKeyHex,
      });
      setLastEventId(result.eventId);
      addAgentMessage("Checkpoint captured.", "Custodian");
      utils.satchel.list.invalidate();
    } catch (err) {
      console.error("Checkpoint failed:", err);
    } finally {
      setIsCheckpointing(false);
    }
  }, [privateKeyHex, lastEventId, sessionLabel, isCheckpointing]);

  // ─── Anchor ──────────────────────────────────────────────────────────────────

  const handleAnchor = async () => {
    if (!privateKeyHex) { toast.error("No private key loaded. Set up your key first."); return; }
    if (!editorText.trim()) { toast.error("Nothing to anchor."); return; }
    setIsAnchoring(true);
    try {
      const result = await anchorMutation.mutateAsync({
        payloadText: editorText,
        parentEventId: lastEventId,
        sessionLabel,
        privateKeyHex,
        originType: "original",
        sourceRefs: [],
        transformationType: null,
      });
      setLastEventId(result.eventId);
      setLastWid(result.wid);
      addAgentMessage(`Anchored. WID: ${result.wid.slice(0, 16)}…`, "Custodian");
      toast.success("Work anchored to ledger.");
      utils.satchel.list.invalidate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Anchor failed";
      toast.error(msg);
    } finally {
      setIsAnchoring(false);
    }
  };

  // ─── Fork ────────────────────────────────────────────────────────────────────

  const handleFork = async (originEventId: string) => {
    if (!privateKeyHex) { toast.error("No private key loaded."); return; }
    if (!editorText.trim()) { toast.error("Write something to fork from."); return; }
    try {
      const result = await forkMutation.mutateAsync({
        originEventId,
        payloadText: editorText,
        sessionLabel: `Fork of ${originEventId.slice(0, 8)}`,
        privateKeyHex,
      });
      setLastEventId(result.eventId);
      addAgentMessage(`Forked from ${originEventId.slice(0, 8)}. New branch created.`, "Conductor");
      toast.success("Fork created.");
      utils.satchel.list.invalidate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fork failed";
      toast.error(msg);
    }
  };

  // ─── PPG ─────────────────────────────────────────────────────────────────────

  const handleGeneratePPG = async () => {
    if (!editorText.trim()) { toast.error("Write something first."); return; }
    setShowPPG(true);
    try {
      const agent = agentQuery.data;
      const result = await ppgMutation.mutateAsync({
        rawText: editorText,
        agentProfile: agent?.styleFingerprint as { tone: string[]; structure_patterns: string[]; common_transforms: string[] } | undefined,
        lineageParent: lastEventId,
      });
      setPpgResult(result);
      addAgentMessage(`PPG ready. Intent: "${result.intent}"`, "Conductor");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "PPG failed";
      toast.error(msg);
    }
  };

  const handleSelectVariant = (variant: PPGVariant) => {
    if (!ppgResult) return;
    setSelectedVariant(variant);
    setEditorText(ppgResult.variants[variant]);
    sessionStorage.setItem("ln_draft", ppgResult.variants[variant]);
    addAgentMessage(`Variant applied: ${variant}.`, "Conductor");
  };

  // ─── Agent mode message ───────────────────────────────────────────────────────

  const handleAgentMessage = async () => {
    try {
      const result = await agentMessageMutation.mutateAsync({
        mode: agentMode,
        context: editorText.slice(0, 500) || "Creator just opened the surface.",
        sessionLabel,
      });
      addAgentMessage(result.message, agentMode);
    } catch (err) {
      console.error("Agent message failed:", err);
    }
  };

  // ─── Key setup ────────────────────────────────────────────────────────────────

  const handleGenerateKey = async () => {
    try {
      const result = await generateKeypairMutation.mutateAsync();
      if (result.alreadyExists) {
        toast.info("You already have a registered public key. Enter your private key below.");
        return;
      }
      if (result.privateKeyHex) {
        storePrivateKey(result.privateKeyHex);
        setPrivateKeyHex(result.privateKeyHex);
        setShowKeySetup(false);
        addAgentMessage("Keypair generated. Your private key is stored in this session only.", "Guide");
        toast.success("Keypair generated. Download your backup now.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Key generation failed";
      toast.error(msg);
    }
  };

  const handleImportKey = (hex: string) => {
    if (hex.length !== 64) { toast.error("Private key must be 64 hex characters."); return; }
    storePrivateKey(hex);
    setPrivateKeyHex(hex);
    setShowKeySetup(false);
    addAgentMessage("Private key loaded for this session.", "Guide");
    toast.success("Key loaded.");
  };

  const handleDownloadBackup = () => {
    if (!privateKeyHex) { toast.error("No private key in session."); return; }
    const blob = new Blob([JSON.stringify({ privateKeyHex, note: "Living Nexus Ed25519 private key — keep this safe." }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ln-private-key-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Private key backup downloaded.");
  };

  // ─── Loading / auth guard ────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-obsidian)" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  // ─── Key setup modal ─────────────────────────────────────────────────────────

  if (showKeySetup && !privateKeyHex) {
    return <KeySetupModal
      onGenerate={handleGenerateKey}
      onImport={handleImportKey}
      isGenerating={generateKeypairMutation.isPending}
    />;
  }

  // ─── Main surface ─────────────────────────────────────────────────────────────

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        background: "var(--ln-obsidian)",
        transition: "all 0.6s ease",
      }}
      onKeyDown={e => { if (e.key === "F11") { e.preventDefault(); setCinematicMode(c => !c); } }}
      tabIndex={-1}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0"
        style={{
          borderColor: "var(--ln-panel-border)",
          background: "var(--ln-panel)",
          opacity: cinematicMode ? 0 : 1,
          pointerEvents: cinematicMode ? "none" : "auto",
          transition: "opacity 0.6s ease",
          height: cinematicMode ? 0 : undefined,
          overflow: "hidden",
          padding: cinematicMode ? 0 : undefined,
        }}
      >
        <div className="flex items-center gap-3">
          <div className="ln-wid-badge">LIVING NEXUS</div>
          <input
            value={sessionLabel}
            onChange={e => setSessionLabel(e.target.value)}
            className="text-sm bg-transparent border-none outline-none"
            style={{ color: "var(--ln-parchment)", fontFamily: "'EB Garamond', serif", minWidth: 180 }}
          />
        </div>
        <div className="flex items-center gap-2">
          {isCheckpointing && (
            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--ln-smoke)" }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Checkpointing…
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownloadBackup}
            title="Download private key backup"
            style={{ color: "var(--ln-smoke)" }}
          >
            <Download className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            style={{ color: "var(--ln-smoke)" }}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">        {/* ── Left: Satchel ──────────────────────────────────────────────────── */}
        <aside
          className="flex-shrink-0 flex flex-col border-r overflow-hidden"
          style={{
            borderColor: "var(--ln-panel-border)",
            background: "var(--ln-panel)",
            width: cinematicMode ? 0 : 256,
            opacity: cinematicMode ? 0 : 1,
            transition: "width 0.5s ease, opacity 0.5s ease",
          }}
        >
          <div className="ln-panel-header">Satchel</div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {satchelQuery.isLoading && (
              <div className="ln-hash text-xs p-2 animate-pulse" style={{ color: "var(--ln-smoke)" }}>Loading…</div>
            )}
            {satchelQuery.data?.length === 0 && (
              <div className="text-xs p-2" style={{ color: "var(--ln-smoke)" }}>
                No events yet. Start writing to create your first checkpoint.
              </div>
            )}
          {/* Group events by sessionLabel */}
          {satchelQuery.data && (() => {
            const groups = new Map<string, typeof satchelQuery.data>();
            for (const ev of satchelQuery.data!) {
              const key = ev.sessionLabel ?? "Unsorted";
              if (!groups.has(key)) groups.set(key, []);
              groups.get(key)!.push(ev);
            }
            return Array.from(groups.entries()).map(([label, evts]) => (
              <div key={label}>
                <div
                  className="text-xs px-2 py-1 mt-2 mb-1 uppercase tracking-wide"
                  style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
                >
                  {label}
                </div>
                {evts.map(event => (
                  <SatchelEntry
                    key={event.eventId}
                    event={event}
                    isActive={event.eventId === lastEventId}
                    onFork={() => handleFork(event.eventId)}
                  />
                ))}
              </div>
            ));
          })()}
          </div>
        </aside>

        {/* ── Center: Editor ────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <textarea
            ref={editorRef}
            value={editorText}
            onChange={handleEditorChange}
            placeholder="Begin writing. Every keystroke is yours."
            className="flex-1 resize-none p-6 text-base leading-relaxed bg-transparent border-none outline-none"
            style={{
              color: "var(--ln-parchment)",
              fontFamily: "'EB Garamond', serif",
              fontSize: "1.05rem",
              caretColor: "var(--ln-gold)",
            }}
            spellCheck={false}
          />

          {/* Anchor bar */}
          <div
            className="flex items-center gap-3 px-4 py-3 border-t flex-shrink-0"
            style={{ borderColor: "var(--ln-panel-border)", background: "var(--ln-panel)" }}
          >
            <Button
              size="sm"
              className="ln-btn-gold"
              onClick={handleAnchor}
              disabled={isAnchoring || !editorText.trim() || !privateKeyHex}
              style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
            >
              {isAnchoring ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Anchor className="w-4 h-4 mr-1" />}
              Anchor
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleGeneratePPG}
              disabled={ppgMutation.isPending || !editorText.trim()}
              style={{ color: "var(--ln-smoke)" }}
            >
              {ppgMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Cpu className="w-4 h-4 mr-1" />}
              PPG
            </Button>
            <div className="flex-1" />
            <div className="text-xs" style={{ color: "var(--ln-smoke)" }}>
              {editorText.split(/\s+/).filter(Boolean).length} words
            </div>
          </div>
        </main>

        {/* ── Right: Agent panel ──────────────────────────────────────────────────── */}
        <aside
          className="flex-shrink-0 flex flex-col border-l overflow-hidden"
          style={{
            borderColor: "var(--ln-panel-border)",
            background: "var(--ln-panel)",
            width: cinematicMode ? 0 : 288,
            opacity: cinematicMode ? 0 : 1,
            transition: "width 0.5s ease, opacity 0.5s ease",
          }}
        >
          {/* Mode selector */}
          <div className="ln-panel-header flex items-center gap-2">
            <span>Agent</span>
            <div className="flex gap-1 ml-auto">
              {(["Guide", "Conductor", "Critic", "Custodian"] as AgentMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setAgentMode(m)}
                  className="text-xs px-1.5 py-0.5 rounded transition-colors"
                  style={{
                    background: agentMode === m ? "var(--ln-gold-glow)" : "transparent",
                    color: agentMode === m ? "var(--ln-gold)" : "var(--ln-smoke)",
                    border: `1px solid ${agentMode === m ? "var(--ln-gold-dim)" : "transparent"}`,
                  }}
                >
                  {m[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {agentMessages.map(msg => (
              <div key={msg.id} className="text-sm leading-relaxed">
                <span className="text-xs mr-2" style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace" }}>
                  [{msg.mode}]
                </span>
                <span style={{ color: "var(--ln-parchment)" }}>{msg.content}</span>
              </div>
            ))}
          </div>

          {/* Ask agent */}
          <div className="p-2 border-t" style={{ borderColor: "var(--ln-panel-border)" }}>
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs"
              onClick={handleAgentMessage}
              disabled={agentMessageMutation.isPending}
              style={{ color: "var(--ln-smoke)" }}
            >
              {agentMessageMutation.isPending
                ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                : <RefreshCw className="w-3 h-3 mr-1" />}
              Ask {agentMode}
            </Button>
          </div>

          {/* PPG panel */}
          {showPPG && ppgResult && (
            <div className="border-t p-3 space-y-2" style={{ borderColor: "var(--ln-panel-border)" }}>
              <div className="ln-panel-header">PPG Variants</div>
              <p className="text-xs italic" style={{ color: "var(--ln-smoke)" }}>{ppgResult.intent}</p>
              {(["conservative", "exploratory", "divergent"] as PPGVariant[]).map(v => (
                <button
                  key={v}
                  onClick={() => handleSelectVariant(v)}
                  className="w-full text-left text-xs p-2 rounded transition-colors"
                  style={{
                    background: selectedVariant === v ? "var(--ln-gold-glow)" : "var(--ln-obsidian)",
                    border: `1px solid ${selectedVariant === v ? "var(--ln-gold-dim)" : "var(--ln-panel-border)"}`,
                    color: "var(--ln-parchment)",
                  }}
                >
                  <span className="ln-wid-badge mr-2" style={{ fontSize: "0.6rem" }}>{v}</span>
                  <span className="line-clamp-2">{ppgResult.variants[v].slice(0, 80)}…</span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* ── Cinematic mode overlay ──────────────────────────────────────────── */}
      {cinematicMode && (
        <div
          className="fixed inset-0 pointer-events-none z-40"
          style={{
            background: "rgba(6,6,6,0.85)",
            transition: "opacity 0.6s ease",
          }}
        />
      )}

      {/* ── Floating Avatar Widget ───────────────────────────────────────────── */}
      <FloatingAvatar
        activeSkinId={keeperQuery.data?.activeSkinId ?? "hooded-scholar"}
        customImageUrl={keeperQuery.data?.customImageUrl}
        agentMode={agentMode}
        agentMessages={agentMessages.map(m => ({ id: m.id, role: m.role, content: m.content, mode: m.mode }))}
        onAskAgent={handleAgentMessage}
        onModeChange={(m) => setAgentMode(m as AgentMode)}
        cinematicMode={cinematicMode}
        onCinematicToggle={() => setCinematicMode(c => !c)}
        userName={user?.name ?? undefined}
      />

      {/* ── Bottom: Provenance preview bar ──────────────────────────────────── */}
      <footer
        className="flex items-center gap-4 px-4 py-2 border-t flex-shrink-0 text-xs"
        style={{
          borderColor: "var(--ln-panel-border)",
          background: "var(--ln-panel)",
          opacity: cinematicMode ? 0.15 : 1,
          transition: "opacity 0.6s ease",
        }}
      >
        <div className="flex items-center gap-1.5" style={{ color: "var(--ln-smoke)" }}>
          <Shield className="w-3 h-3" />
          <span>Creator #{user?.id}</span>
        </div>
        <div className="flex items-center gap-1.5" style={{ color: "var(--ln-smoke)" }}>
          <Clock className="w-3 h-3" />
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
        {pendingHash && (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "var(--ln-gold)" }} />
            <span className="ln-hash truncate" style={{ color: "var(--ln-gold-dim)" }}>
              {pendingHash}
            </span>
          </div>
        )}
        {lastWid && (
          <a
            href={`/wid/${lastWid}`}
            className="ln-wid-badge hover:opacity-80 transition-opacity"
            target="_blank"
            rel="noreferrer"
          >
            WID: {lastWid.slice(0, 12)}…
          </a>
        )}
      </footer>
    </div>
  );
}

// ─── Satchel entry component ──────────────────────────────────────────────────

function SatchelEntry({
  event,
  isActive,
  onFork,
}: {
  event: {
    eventId: string;
    actionType: string;
    sessionLabel: string | null;
    createdAt: Date;
    payloadCanonical: string;
  };
  isActive: boolean;
  onFork: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const typeColor: Record<string, string> = {
    checkpoint: "var(--ln-smoke)",
    anchor: "var(--ln-gold)",
    fork: "#7c9cbf",
    draft: "var(--ln-smoke)",
  };

  return (
    <div
      className="rounded p-2 cursor-pointer transition-colors"
      style={{
        background: isActive ? "var(--ln-gold-glow)" : "transparent",
        border: `1px solid ${isActive ? "var(--ln-gold-dim)" : "transparent"}`,
      }}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center gap-1.5">
        {expanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" style={{ color: "var(--ln-smoke)" }} />
          : <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: "var(--ln-smoke)" }} />}
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: typeColor[event.actionType] ?? "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
        >
          {event.actionType}
        </span>
        <span className="text-xs ml-auto" style={{ color: "var(--ln-smoke)" }}>
          {new Date(event.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {expanded && (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs line-clamp-3" style={{ color: "var(--ln-parchment-dim)" }}>
            {event.payloadCanonical.slice(0, 120)}
          </p>
          <div className="ln-hash text-xs truncate" style={{ color: "var(--ln-smoke)" }}>
            {event.eventId.slice(0, 20)}…
          </div>
          <button
            className="flex items-center gap-1 text-xs mt-1 hover:opacity-80"
            style={{ color: "var(--ln-smoke)" }}
            onClick={e => { e.stopPropagation(); onFork(); }}
          >
            <GitFork className="w-3 h-3" />
            Fork from here
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Key setup modal ──────────────────────────────────────────────────────────

function KeySetupModal({
  onGenerate,
  onImport,
  isGenerating,
}: {
  onGenerate: () => void;
  onImport: (hex: string) => void;
  isGenerating: boolean;
}) {
  const [importHex, setImportHex] = useState("");
  const [showImport, setShowImport] = useState(false);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--ln-obsidian)" }}
    >
      <div className="ln-panel p-8 max-w-md w-full space-y-6">
        <div>
          <div className="ln-wid-badge mb-3">KEY SETUP</div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: "var(--ln-parchment)", fontFamily: "'EB Garamond', serif" }}>
            Establish Your Identity
          </h2>
          <p className="text-sm" style={{ color: "var(--ln-smoke)" }}>
            An Ed25519 keypair is required to sign your creative work. Your private key never leaves this device.
          </p>
        </div>

        <Button
          className="w-full ln-btn-gold"
          onClick={onGenerate}
          disabled={isGenerating}
          style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Generate New Keypair
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: "var(--ln-panel-border)" }} />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2" style={{ background: "var(--ln-panel)", color: "var(--ln-smoke)" }}>or</span>
          </div>
        </div>

        <div>
          <button
            className="text-sm underline"
            style={{ color: "var(--ln-smoke)" }}
            onClick={() => setShowImport(v => !v)}
          >
            Import existing private key
          </button>
          {showImport && (
            <div className="mt-3 space-y-2">
              <input
                type="password"
                value={importHex}
                onChange={e => setImportHex(e.target.value)}
                placeholder="64-character hex private key"
                className="w-full text-xs p-2 rounded bg-transparent border outline-none"
                style={{
                  borderColor: "var(--ln-panel-border)",
                  color: "var(--ln-parchment)",
                  fontFamily: "'Space Mono', monospace",
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="w-full"
                onClick={() => onImport(importHex.trim())}
                style={{ color: "var(--ln-gold)" }}
              >
                Load Key
              </Button>
            </div>
          )}
        </div>

        <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>
          After generating, download your backup immediately. If you lose your private key, your signing identity cannot be recovered.
        </p>
      </div>
    </div>
  );
}
