/**
 * PNA Shell — pna.livingnexus.org
 * The creator operating system. Fundamentally different from livingnexus.org.
 * No public discovery. No content browsing. Creator workspace only.
 * The PNA is the primary interface. Everything else is a tool.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Zap, Eye, Layers, Archive, Sparkles, Search, Music, FileText,
  Image, Shield, Upload, BookOpen, Settings, LogOut,
  ChevronRight, Send, Loader2, X, ExternalLink, Save,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import NexusAvatarViewer from "@/components/NexusAvatarViewer";
import { PNA_PRODUCT } from "@/lib/loopProduct";

// ─── PNA Stewardship Modes ────────────────────────────────────────────────────

type PNAMode = "guide" | "conductor" | "witness" | "custodian" | "archivist" | "vision" | "research";

const PNA_MODES = [
  { id: "guide" as PNAMode, label: "Guide", desc: "Creative direction and intent", icon: Zap, color: "#C9A84C", persona: "guide" as const },
  { id: "conductor" as PNAMode, label: "Compose", desc: "Structure, arrangement, flow", icon: Music, color: "#7B9EA6", persona: "conductor" as const },
  { id: "witness" as PNAMode, label: "Witness", desc: "Emotional truth and testimony", icon: Eye, color: "#7C3AED", persona: "witness" as const },
  { id: "custodian" as PNAMode, label: "Registry", desc: "Provenance, registration, lineage", icon: Layers, color: "#059669", persona: "custodian" as const },
  { id: "archivist" as PNAMode, label: "Archive", desc: "Patterns across your corpus", icon: Archive, color: "#D97706", persona: "archivist" as const },
  { id: "vision" as PNAMode, label: "Vision", desc: "Image and visual generation", icon: Sparkles, color: "#8B5CF6", persona: "guide" as const },
  { id: "research" as PNAMode, label: "Research", desc: "Search and cross-reference", icon: Search, color: "#3B82F6", persona: "archivist" as const },
];

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Register Work", icon: Shield, href: "/manifest", desc: "Create a new WID" },
  { label: "My Archive", icon: Archive, href: "/archive", desc: "Your registered works" },
  { label: "Manage", icon: Settings, href: "/manage", desc: "Loop management hub" },
  { label: "Avatar Registry", icon: Image, href: "/avatar-registry", desc: "Steward AVT skins" },
  { label: "Keeper", icon: Sparkles, href: "/keeper", desc: "Avatar skins & attributes" },
  { label: "Batch Upload", icon: Upload, href: "/batch-upload", desc: "Register multiple works" },
];

// ─── Message type ─────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "pna";
  content: string;
  mode: PNAMode;
  timestamp: Date;
}

// ─── PNA Shell ────────────────────────────────────────────────────────────────

export default function PNAShellPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [activeMode, setActiveMode] = useState<PNAMode>("guide");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chatMutation = trpc.keeper.chat.useMutation();
  const saveNoteMutation = trpc.keeper.saveNote.useMutation({
    onSuccess: () => toast.success("Saved to notes."),
  });

  const currentMode = PNA_MODES.find(m => m.id === activeMode) ?? PNA_MODES[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || !user) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: text, mode: activeMode, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await chatMutation.mutateAsync({
        message: text,
        persona: currentMode.persona,
        history: messages.slice(-8).map(m => ({ role: m.role === "user" ? "user" as const : "assistant" as const, content: m.content })),
      });
      const replyText = typeof result.reply === "string" ? result.reply : (result.reply as any)?.[0]?.text ?? "";
      setMessages(prev => [...prev, { id: `p-${Date.now()}`, role: "pna", content: replyText, mode: activeMode, timestamp: new Date() }]);
    } catch (e: any) {
      toast.error(e.message ?? "PNA unavailable");
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, activeMode, currentMode, messages, chatMutation, user]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
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

  // ── Main workspace ─────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#050403", fontFamily: "'Space Mono', monospace" }}
    >
      {/* ── Left Sidebar ── */}
      <div
        className="flex flex-col flex-shrink-0 transition-all duration-300"
        style={{
          width: sidebarCollapsed ? 56 : 220,
          background: "rgba(8,6,4,0.98)",
          borderRight: "1px solid rgba(196,154,40,0.12)",
        }}
      >
        {/* Logo + collapse */}
        <div
          className="flex items-center justify-between px-3 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(196,154,40,0.08)" }}
        >
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.7rem", color: "#C9A84C", letterSpacing: "0.06em" }}>{PNA_PRODUCT.name}</div>
              <div style={{ fontSize: "0.38rem", color: "rgba(255,255,255,0.25)", marginTop: 1 }}>Stewarded companion</div>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            className="w-7 h-7 rounded flex items-center justify-center transition-opacity hover:opacity-70"
            style={{ color: "rgba(196,154,40,0.5)", marginLeft: sidebarCollapsed ? "auto" : 0 }}
          >
            <ChevronRight size={14} style={{ transform: sidebarCollapsed ? "none" : "rotate(180deg)", transition: "transform 0.2s" }} />
          </button>
        </div>

        {/* User */}
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: "1px solid rgba(196,154,40,0.06)" }}>
            {user.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} alt={user.name ?? ""} className="w-7 h-7 rounded-full object-cover flex-shrink-0" style={{ border: "1px solid rgba(196,154,40,0.3)" }} />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.3)" }}>
                <span style={{ fontSize: "0.55rem", color: "#C9A84C" }}>{(user.name ?? "?")[0].toUpperCase()}</span>
              </div>
            )}
            <div className="min-w-0">
              <div style={{ fontSize: "0.55rem", color: "#E8D5A3" }} className="truncate">{user.name}</div>
              <div style={{ fontSize: "0.4rem", color: "rgba(255,255,255,0.3)" }} className="truncate">Creator</div>
            </div>
          </div>
        )}

        {/* Stewardship modes */}
        <div className="flex-1 overflow-y-auto py-2">
          {!sidebarCollapsed && (
            <div style={{ fontSize: "0.38rem", color: "rgba(196,154,40,0.4)", letterSpacing: "0.1em", padding: "4px 12px 6px" }}>STEWARDSHIP</div>
          )}
          {PNA_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className="w-full flex items-center gap-2.5 transition-all hover:opacity-80"
              style={{
                padding: sidebarCollapsed ? "8px 0" : "7px 12px",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                background: activeMode === mode.id ? `${mode.color}12` : "transparent",
                borderLeft: activeMode === mode.id ? `2px solid ${mode.color}` : "2px solid transparent",
              }}
              title={sidebarCollapsed ? mode.label : undefined}
            >
              <mode.icon size={13} style={{ color: activeMode === mode.id ? mode.color : "rgba(255,255,255,0.35)", flexShrink: 0 }} />
              {!sidebarCollapsed && (
                <div className="min-w-0 text-left">
                  <div style={{ fontSize: "0.5rem", color: activeMode === mode.id ? mode.color : "rgba(255,255,255,0.6)", letterSpacing: "0.04em" }}>{mode.label}</div>
                </div>
              )}
            </button>
          ))}

          {/* Quick actions */}
          {!sidebarCollapsed && (
            <>
              <div style={{ fontSize: "0.38rem", color: "rgba(196,154,40,0.4)", letterSpacing: "0.1em", padding: "12px 12px 6px" }}>WORKSPACE</div>
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.href}
                  onClick={() => navigate(a.href)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-all hover:opacity-80 text-left"
                  style={{ background: "transparent" }}
                  title={a.desc}
                >
                  <a.icon size={12} style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }} />
                  <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.5)" }}>{a.label}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Bottom actions */}
        <div style={{ borderTop: "1px solid rgba(196,154,40,0.08)", padding: "8px 0" }}>
          {!sidebarCollapsed ? (
            <>
              <button
                onClick={() => navigate("/keeper")}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-all hover:opacity-80"
              >
                <Settings size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.4)" }}>Avatar & Keeper</span>
              </button>
              <button
                onClick={() => navigate("/avatar-registry")}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-all hover:opacity-80"
              >
                <Image size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.4)" }}>Avatar Registry</span>
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-all hover:opacity-80"
              >
                <ExternalLink size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
                <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.4)" }}>Loop Registry</span>
              </button>
              <button
                onClick={() => logout().finally(() => navigate("/"))}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 transition-all hover:opacity-80"
              >
                <LogOut size={12} style={{ color: "rgba(255,255,255,0.25)" }} />
                <span style={{ fontSize: "0.48rem", color: "rgba(255,255,255,0.3)" }}>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <button onClick={() => navigate("/keeper")} className="w-7 h-7 flex items-center justify-center hover:opacity-70" title="Settings">
                <Settings size={12} style={{ color: "rgba(255,255,255,0.3)" }} />
              </button>
              <button onClick={() => logout()} className="w-7 h-7 flex items-center justify-center hover:opacity-70" title="Sign Out">
                <LogOut size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-5 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(196,154,40,0.1)", background: "rgba(8,6,4,0.6)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: `${currentMode.color}18`, border: `1.5px solid ${currentMode.color}55` }}
            >
              <currentMode.icon size={11} style={{ color: currentMode.color }} />
            </div>
            <div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.7rem", color: "#C9A84C" }}>{PNA_PRODUCT.fullName}</span>
              <span style={{ fontSize: "0.45rem", color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>· {currentMode.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="px-2 py-1 rounded transition-opacity hover:opacity-70"
                style={{ fontSize: "0.4rem", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                CLEAR
              </button>
            )}
            <a
              href="/keeper"
              className="flex items-center gap-1 px-2 py-1 rounded transition-opacity hover:opacity-70"
              style={{ fontSize: "0.4rem", color: "rgba(196,154,40,0.6)", border: "1px solid rgba(196,154,40,0.15)", textDecoration: "none" }}
            >
              AVATAR STUDIO <ExternalLink size={9} />
            </a>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ overscrollBehavior: "contain" }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 max-w-lg mx-auto">
              <div
                className="relative overflow-hidden"
                style={{
                  width: 168,
                  height: 220,
                  border: `1px solid ${currentMode.color}44`,
                  boxShadow: `0 0 40px ${currentMode.color}18`,
                  background: "#080604",
                }}
              >
                <NexusAvatarViewer
                  seed={user.id}
                  width={168}
                  height={220}
                  accentColor={currentMode.color}
                />
              </div>
              <div className="text-center">
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "1.1rem", color: "#C9A84C", marginBottom: 8 }}>
                  {PNA_PRODUCT.fullName}
                </div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>
                  Stewarded companion to Loop. One persistent intelligence — skins, modes, and memory — without flooding the music provenance spine.
                </div>
              </div>
              {/* Skill shortcuts */}
              <div className="w-full grid grid-cols-3 gap-2">
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
                    onClick={() => { setInput(s.label); inputRef.current?.focus(); }}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-left transition-all hover:opacity-80"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <s.icon size={11} style={{ color: "rgba(196,154,40,0.5)", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.45rem", color: "rgba(255,255,255,0.5)" }}>{s.label}</span>
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
                  <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
                    {!isUser && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mr-2.5 mt-0.5"
                        style={{ background: `${modeConfig.color}18`, border: `1px solid ${modeConfig.color}44` }}
                      >
                        <modeConfig.icon size={11} style={{ color: modeConfig.color }} />
                      </div>
                    )}
                    <div className={`max-w-[75%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                      {!isUser && (
                        <span style={{ fontSize: "0.4rem", color: modeConfig.color, letterSpacing: "0.08em", marginBottom: 4 }}>
                          PNA · {modeConfig.label.toUpperCase()}
                        </span>
                      )}
                      <div
                        className="rounded-xl px-4 py-3"
                        style={{
                          background: isUser ? "rgba(196,154,40,0.1)" : "rgba(255,255,255,0.04)",
                          border: isUser ? "1px solid rgba(196,154,40,0.2)" : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <p
                          className="whitespace-pre-wrap"
                          style={{
                            fontFamily: isUser ? "'Space Mono', monospace" : "'Cormorant Garamond', serif",
                            fontSize: isUser ? "0.6rem" : "0.85rem",
                            color: isUser ? "rgba(196,154,40,0.9)" : "rgba(232,213,163,0.9)",
                            lineHeight: 1.75,
                          }}
                        >
                          {msg.content}
                        </p>
                      </div>
                      {!isUser && (
                        <button
                          onClick={() => saveNoteMutation.mutate({ content: msg.content, personaId: msg.mode })}
                          className="flex items-center gap-1 mt-1.5 transition-opacity hover:opacity-70"
                          style={{ fontSize: "0.38rem", color: "rgba(196,154,40,0.4)", letterSpacing: "0.06em" }}
                        >
                          <Save size={9} /> SAVE TO NOTES
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: `${currentMode.color}18`, border: `1px solid ${currentMode.color}44` }}>
                    <currentMode.icon size={11} style={{ color: currentMode.color }} />
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: currentMode.color, opacity: 0.5, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-6 py-4" style={{ borderTop: "1px solid rgba(196,154,40,0.1)" }}>
          <div
            className="flex items-end gap-3 rounded-xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${currentMode.color}33` }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask your ${currentMode.label}...`}
              rows={1}
              className="flex-1 bg-transparent outline-none resize-none"
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.65rem",
                color: "#E8D5A3",
                lineHeight: 1.6,
                maxHeight: "160px",
                overflowY: "auto",
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30"
              style={{ background: currentMode.color, color: "#0A0806" }}
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span style={{ fontSize: "0.38rem", color: "rgba(255,255,255,0.2)" }}>Enter to send · Shift+Enter for new line</span>
            <span style={{ fontSize: "0.38rem", color: "rgba(196,154,40,0.3)" }}>Provenance Nexus Avatar · Living Nexus</span>
          </div>
        </div>
      </div>
    </div>
  );
}
