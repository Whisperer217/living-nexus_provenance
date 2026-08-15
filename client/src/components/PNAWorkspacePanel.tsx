/**
 * PNA Workspace Panel
 * The Provenance Nexus Avatar — persistent intelligence layer of Living Nexus.
 * Opens as a right-side drawer from the nav bar ◉ Provenance button.
 * One identity. Multiple stewardship modes. Provenance-native output.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { PNAVisualProposalCard, type PNAVisualProposal } from "@/components/PNAVisualProposalCard";
import {
  X, Send, Loader2, ChevronDown, ChevronRight,
  Zap, Eye, Layers, Archive, Sparkles, BookOpen,
  Hash, Shield, Plus, ExternalLink, Save,
  Music, FileText, Image, Video, Search,
} from "lucide-react";

// ─── PNA Stewardship Modes ────────────────────────────────────────────────────

type PNAMode = "guide" | "conductor" | "witness" | "custodian" | "archivist" | "vision" | "research";

interface ModeConfig {
  id: PNAMode;
  label: string;
  displayLabel: string;
  description: string;
  icon: React.FC<{ className?: string; size?: number; style?: React.CSSProperties }>;
  accentColor: string;
  badge: string;
  backendPersona: "guide" | "conductor" | "witness" | "custodian" | "archivist";
}

const PNA_MODES: ModeConfig[] = [
  {
    id: "guide",
    label: "Guide",
    displayLabel: "Guide",
    description: "Creative direction and intent.",
    icon: Zap,
    accentColor: "#C9A84C",
    badge: "Direction",
    backendPersona: "guide",
  },
  {
    id: "conductor",
    label: "Compose",
    displayLabel: "Compose",
    description: "Structure, arrangement, and flow.",
    icon: Music,
    accentColor: "#7B9EA6",
    badge: "Composition",
    backendPersona: "conductor",
  },
  {
    id: "witness",
    label: "Witness",
    displayLabel: "Witness",
    description: "Emotional truth and testimony.",
    icon: Eye,
    accentColor: "#7C3AED",
    badge: "Testimony",
    backendPersona: "witness",
  },
  {
    id: "custodian",
    label: "Registry",
    displayLabel: "Registry",
    description: "Provenance, registration, and lineage.",
    icon: Layers,
    accentColor: "#059669",
    badge: "Sovereignty",
    backendPersona: "custodian",
  },
  {
    id: "archivist",
    label: "Archive",
    displayLabel: "Archive",
    description: "Patterns across your full corpus.",
    icon: Archive,
    accentColor: "#D97706",
    badge: "Archive",
    backendPersona: "archivist",
  },
  {
    id: "vision",
    label: "Vision",
    displayLabel: "Vision",
    description: "Image and visual generation.",
    icon: Sparkles,
    accentColor: "#8B5CF6",
    badge: "Vision",
    backendPersona: "guide",
  },
  {
    id: "research",
    label: "Research",
    displayLabel: "Research",
    description: "Search, cross-reference, and build knowledge.",
    icon: Search,
    accentColor: "#3B82F6",
    badge: "Research",
    backendPersona: "archivist",
  },
];

// ─── Message types ────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "pna";
  content: string;
  mode: PNAMode;
  timestamp: Date;
  provenanceAction?: "register" | "save_session" | "save_note";
  visualProposal?: PNAVisualProposal;
}

// ─── Provenance Output Actions ────────────────────────────────────────────────

function ProvenanceActions({ content, mode, onAction }: {
  content: string;
  mode: PNAMode;
  onAction: (type: "register" | "save_session" | "save_note") => void;
}) {
  const [open, setOpen] = useState(false);

  const actions = [
    { type: "save_note" as const, label: "Save to Notes", icon: Save, desc: "Save this response to your Keeper notes" },
    { type: "save_session" as const, label: "Create Session WID", icon: Hash, desc: "Register as a testimony session" },
    { type: "register" as const, label: "Register as Work", icon: Shield, desc: "Navigate to register this content as a WID" },
  ];

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
        style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(196,154,40,0.5)", letterSpacing: "0.06em" }}
      >
        <Plus className="w-2.5 h-2.5" />
        PROVENANCE ACTIONS
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1.5 flex flex-col gap-1">
          {actions.map(a => (
            <button
              key={a.type}
              onClick={() => { onAction(a.type); setOpen(false); }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-all hover:opacity-80"
              style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)" }}
            >
              <a.icon className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(196,154,40,0.6)" }} />
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.8)" }}>{a.label}</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, onProvenance, onSaveVisual, isSavingVisual }: {
  msg: Message;
  onProvenance: (type: "register" | "save_session" | "save_note", content: string) => void;
  onSaveVisual: (messageId: string) => void;
  isSavingVisual: boolean;
}) {
  const modeConfig = PNA_MODES.find(m => m.id === msg.mode) ?? PNA_MODES[0];
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-0.5"
          style={{ background: `${modeConfig.accentColor}22`, border: `1px solid ${modeConfig.accentColor}55` }}
        >
          <modeConfig.icon size={10} style={{ color: modeConfig.accentColor }} />
        </div>
      )}
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: modeConfig.accentColor, letterSpacing: "0.08em" }}>
              PNA · {modeConfig.displayLabel.toUpperCase()}
            </span>
          </div>
        )}
        <div
          className="rounded-xl px-3 py-2.5"
          style={{
            background: isUser
              ? "rgba(196,154,40,0.12)"
              : "rgba(255,255,255,0.04)",
            border: isUser
              ? "1px solid rgba(196,154,40,0.25)"
              : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p
            className="whitespace-pre-wrap leading-relaxed"
            style={{
              fontFamily: isUser ? "'Space Mono', monospace" : "'Cormorant Garamond', serif",
              fontSize: isUser ? "0.6rem" : "0.75rem",
              color: isUser ? "rgba(196,154,40,0.9)" : "rgba(232,213,163,0.9)",
              lineHeight: 1.7,
            }}
          >
            {msg.content}
          </p>
        </div>
        {msg.visualProposal && (
          <PNAVisualProposalCard
            proposal={msg.visualProposal}
            isSaving={isSavingVisual}
            onSave={() => onSaveVisual(msg.id)}
          />
        )}
        {!isUser && (
          <ProvenanceActions
            content={msg.content}
            mode={msg.mode}
            onAction={(type) => onProvenance(type, msg.content)}
          />
        )}
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "rgba(255,255,255,0.2)", marginTop: 3 }}>
          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface PNAWorkspacePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function PNAWorkspacePanel({ open, onClose }: PNAWorkspacePanelProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeMode, setActiveMode] = useState<PNAMode>("guide");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.keeper.chat.useMutation();
  const generateArtwork = trpc.keeper.generateArtwork.useMutation();
  const saveQuiverAsset = trpc.quiver.save.useMutation();
  const utils = trpc.useUtils();
  const saveNoteMutation = trpc.keeper.saveNote.useMutation({
    onSuccess: () => toast.success("Saved to Keeper notes."),
    onError: () => toast.error("Failed to save note."),
  });

  const currentMode = PNA_MODES.find(m => m.id === activeMode) ?? PNA_MODES[0];

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      mode: activeMode,
      timestamp: new Date(),
    };
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
        message: text,
        persona: currentMode.backendPersona,
        history: messages.slice(-6).map(m => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content })),
      });
      const replyText = typeof result.reply === "string" ? result.reply : (result.reply as any)?.[0]?.text ?? "";
      const pnaMsg: Message = {
        id: `p-${Date.now()}`,
        role: "pna",
        content: replyText,
        mode: activeMode,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, pnaMsg]);
    } catch (e: any) {
      toast.error(e.message ?? "PNA unavailable");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activeMode, currentMode, messages, chatMutation, generateArtwork]);

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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleProvenance = useCallback((type: "register" | "save_session" | "save_note", content: string) => {
    if (type === "save_note") {
      saveNoteMutation.mutate({ content, personaId: activeMode });
    } else if (type === "save_session") {
      toast.info("Session WID registration coming soon — navigate to /sessions to create one manually.");
    } else if (type === "register") {
      onClose();
      navigate("/manifest");
    }
  }, [activeMode, saveNoteMutation, onClose, navigate]);

  const clearConversation = () => {
    setMessages([]);
    toast.success("Conversation cleared.");
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[450]"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-[460] flex flex-col"
        style={{
          width: "min(420px, 100vw)",
          background: "rgba(8,6,4,0.98)",
          borderLeft: "1px solid rgba(196,154,40,0.2)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.6)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}
        >
          <div className="flex items-center gap-2.5">
            {/* PNA identity mark */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: `${currentMode.accentColor}18`,
                border: `1.5px solid ${currentMode.accentColor}55`,
                boxShadow: `0 0 12px ${currentMode.accentColor}22`,
              }}
            >
              <currentMode.icon size={13} style={{ color: currentMode.accentColor }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.75rem", color: "#C9A84C", letterSpacing: "0.06em" }}>
                Provenance Nexus Avatar
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                {currentMode.displayLabel} · {currentMode.badge}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="px-2 py-1 rounded text-xs transition-opacity hover:opacity-70"
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                CLEAR
              </button>
            )}
            <button
              onClick={() => { onClose(); navigate("/pna"); }}
              className="px-2 py-1 rounded text-xs transition-opacity hover:opacity-70 flex items-center gap-1"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(196,154,40,0.6)", border: "1px solid rgba(196,154,40,0.15)" }}
            >
              FULL WORKSPACE
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center transition-opacity hover:opacity-70"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Mode Selector ── */}
        <div
          className="flex-shrink-0 px-4 py-2"
          style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}
        >
          <button
            onClick={() => setShowModeSelector(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all hover:opacity-80"
            style={{
              background: `${currentMode.accentColor}0d`,
              border: `1px solid ${currentMode.accentColor}33`,
            }}
          >
            <div className="flex items-center gap-2">
              <currentMode.icon size={12} style={{ color: currentMode.accentColor }} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: currentMode.accentColor, letterSpacing: "0.06em" }}>
                {currentMode.displayLabel.toUpperCase()}
              </span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.35)" }}>
                {currentMode.description}
              </span>
            </div>
            <ChevronDown
              size={12}
              style={{ color: currentMode.accentColor, transform: showModeSelector ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            />
          </button>

          {showModeSelector && (
            <div
              className="mt-2 rounded-lg overflow-hidden"
              style={{ border: "1px solid rgba(196,154,40,0.15)", background: "rgba(0,0,0,0.6)" }}
            >
              {PNA_MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => { setActiveMode(mode.id); setShowModeSelector(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:opacity-80"
                  style={{
                    background: activeMode === mode.id ? `${mode.accentColor}12` : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <mode.icon size={12} style={{ color: mode.accentColor, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: mode.accentColor, letterSpacing: "0.06em" }}>
                      {mode.displayLabel.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "rgba(255,255,255,0.35)", marginTop: 1 }}>
                      {mode.description}
                    </div>
                  </div>
                  {activeMode === mode.id && (
                    <ChevronRight size={10} style={{ color: mode.accentColor, flexShrink: 0 }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ overscrollBehavior: "contain" }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
              {/* Identity statement */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: `${currentMode.accentColor}12`,
                  border: `1.5px solid ${currentMode.accentColor}44`,
                  boxShadow: `0 0 24px ${currentMode.accentColor}18`,
                }}
              >
                <currentMode.icon size={22} style={{ color: currentMode.accentColor }} />
              </div>
              <div className="text-center max-w-[280px]">
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.85rem", color: "#C9A84C", marginBottom: 6 }}>
                  Provenance Nexus Avatar
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                  One persistent intelligence. Every creative act becomes part of your permanent knowledge graph.
                </div>
              </div>
              {/* Quick skill shortcuts */}
              <div className="w-full grid grid-cols-2 gap-1.5 mt-2">
                {[
                  { label: "Analyze my lyrics", icon: FileText },
                  { label: "Generate artwork", icon: Image },
                  { label: "Register a work", icon: Shield },
                  { label: "Research a topic", icon: Search },
                  { label: "Build arrangement", icon: Music },
                  { label: "Write testimony", icon: BookOpen },
                ].map(s => (
	                  <button
	                    key={s.label}
	                    onClick={() => {
	                      if (s.label === "Generate artwork") setActiveMode("vision");
	                      setInput(s.label === "Generate artwork" ? "" : s.label);
	                    }}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-left transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <s.icon size={11} style={{ color: "rgba(196,154,40,0.5)", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
                  </button>
                ))}
              </div>
              {!user && (
                <div
                  className="w-full rounded-lg px-3 py-2.5 text-center"
                  style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)" }}
                >
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(196,154,40,0.7)" }}>
                    Sign in to activate your PNA workspace
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  onProvenance={handleProvenance}
                  onSaveVisual={handleSaveVisualProposal}
                  isSavingVisual={saveQuiverAsset.isPending}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: `${currentMode.accentColor}18`, border: `1px solid ${currentMode.accentColor}44` }}
                  >
                    <currentMode.icon size={10} style={{ color: currentMode.accentColor }} />
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ background: currentMode.accentColor, opacity: 0.6, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ── Input ── */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{ borderTop: "1px solid rgba(196,154,40,0.1)" }}
        >
          {!user ? (
            <div className="text-center py-2">
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "rgba(255,255,255,0.3)" }}>
                Sign in to activate your PNA
              </span>
            </div>
          ) : (
            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${currentMode.accentColor}33` }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeMode === "vision" ? "Describe private cover art..." : `Ask your ${currentMode.displayLabel}...`}
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.6rem",
                  color: "#E8D5A3",
                  lineHeight: 1.6,
                  maxHeight: "120px",
                  overflowY: "auto",
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
                style={{ background: currentMode.accentColor, color: "#0A0806" }}
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mt-1.5">
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "rgba(255,255,255,0.2)" }}>
              Enter to send · Shift+Enter for new line
            </span>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "rgba(196,154,40,0.3)" }}>
              PNA · Living Nexus
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
