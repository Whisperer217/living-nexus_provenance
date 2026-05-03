import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useKeeperAttrs } from "@/contexts/KeeperAttrsContext";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Edit3, Send, FileText, Loader2,
  Maximize2, Minimize2, Music, BookOpen, ChevronRight,
  Zap, BarChart2, Layers, Archive, Eye,
} from "lucide-react";
// Player context available for future Send-to-Player integration
// import { usePlayer } from "@/contexts/PlayerContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentMode = "Guide" | "Conductor" | "Witness" | "Custodian" | "Archivist";

interface ComposedWork {
  style?: string;
  tempo?: string;
  key?: string;
  sections: Array<{
    label: string;
    tone?: string;
    delivery?: string;
    lyrics: string;
  }>;
  rawOutput: string;
}

interface ArcPoint {
  section: string;
  level: number; // 0–10
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODES: AgentMode[] = ["Guide", "Conductor", "Witness", "Custodian", "Archivist"];

const MODE_COLORS: Record<AgentMode, string> = {
  Guide:     "#C9A84C",
  Conductor: "#7B9EA6",
  Witness:   "#D4956A",
  Custodian: "#7BA67B",
  Archivist: "#9B7B55",
};

const MODE_ICONS: Record<AgentMode, React.FC<{ className?: string }>> = {
  Guide:     ({ className }) => <Zap className={className} />,
  Conductor: ({ className }) => <BarChart2 className={className} />,
  Witness:   ({ className }) => <Eye className={className} />,
  Custodian: ({ className }) => <Layers className={className} />,
  Archivist: ({ className }) => <Archive className={className} />,
};

const MODE_DESC: Record<AgentMode, string> = {
  Guide:     "Direction · Inspiration · Voice",
  Conductor: "Structure · Arrangement · Flow",
  Witness:   "Testimony · Emotional Truth · Depth",
  Custodian: "Provenance · Archive · Legacy",
  Archivist: "Semantics · Pattern · Corpus",
};

const ARC_LEVELS: Record<string, number> = {
  "INTRO": 1,
  "VERSE 1": 3,
  "VERSE": 3,
  "PRE-CHORUS": 5,
  "BUILD": 5,
  "CHORUS": 9,
  "VERSE 2": 6,
  "BREAKDOWN": 8,
  "BRIDGE": 4,
  "FINAL CHORUS": 10,
  "OUTRO": 2,
};

const BAR_CHARS = ["▂", "▃", "▄", "▅", "▆", "▇", "█"];

function levelToBar(level: number): string {
  const idx = Math.min(BAR_CHARS.length - 1, Math.max(0, Math.round((level / 10) * (BAR_CHARS.length - 1))));
  return BAR_CHARS[idx];
}

// ─── Parser: raw LLM output → ComposedWork ────────────────────────────────────

function parseComposedWork(raw: string): ComposedWork {
  const work: ComposedWork = { sections: [], rawOutput: raw };

  // Extract [STYLE], [TEMPO], [KEY] header blocks
  const styleMatch = raw.match(/\[STYLE\]\s*\n([\s\S]*?)(?=\n\[|\n---|\n$)/i);
  const tempoMatch = raw.match(/\[TEMPO\]\s*\n([^\n]+)/i);
  const keyMatch   = raw.match(/\[KEY\]\s*\n([^\n]+)/i);

  if (styleMatch) work.style = styleMatch[1].trim();
  if (tempoMatch) work.tempo = tempoMatch[1].trim();
  if (keyMatch)   work.key   = keyMatch[1].trim();

  // Extract all [SECTION – subtitle] blocks
  const sectionRegex = /\[([A-Z][A-Z0-9 /–\-–—]+(?:\s*[–\-–—]\s*[^\]]+)?)\]([\s\S]*?)(?=\n\[(?!STYLE|TEMPO|KEY|STRUCTURE)|\n---\s*END|\s*$)/gi;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(raw)) !== null) {
    const rawLabel = match[1].trim();
    // Skip header blocks
    if (/^(STYLE|TEMPO|KEY|STRUCTURE)$/i.test(rawLabel)) continue;

    const body = match[2].trim();
    const lines = body.split("\n").map(l => l.trim()).filter(Boolean);

    // Extract tone / delivery annotations
    let tone = "";
    let delivery = "";
    const lyricsLines: string[] = [];

    for (const line of lines) {
      const toneLine    = line.match(/^tone:\s*(.+)/i);
      const delivLine   = line.match(/^delivery:\s*(.+)/i);
      const instrLine   = line.match(/^↳\s*instrumentation:/i);
      const analysisLine = line.match(/^↳\s*analysis:/i);

      if (toneLine)    { tone = toneLine[1].trim(); }
      else if (delivLine) { delivery = delivLine[1].trim(); }
      else if (instrLine || analysisLine) { /* skip */ }
      else { lyricsLines.push(line); }
    }

    work.sections.push({
      label: rawLabel,
      tone,
      delivery,
      lyrics: lyricsLines.join("\n"),
    });
  }

  return work;
}

// ─── Derive emotional arc from parsed sections ────────────────────────────────

function deriveArc(sections: ComposedWork["sections"]): ArcPoint[] {
  return sections.map(s => {
    const upperLabel = s.label.toUpperCase().replace(/\s*[–\-–—].*$/, "").trim();
    const level = ARC_LEVELS[upperLabel] ?? 5;
    return { section: s.label, level };
  });
}

// ─── Suno-ready copy text ─────────────────────────────────────────────────────

function buildSunoCopy(work: ComposedWork): string {
  const lines: string[] = [];
  if (work.style)  { lines.push("[STYLE]", work.style, ""); }
  if (work.tempo)  { lines.push("[TEMPO]", work.tempo, ""); }
  if (work.key)    { lines.push("[KEY]", work.key, ""); }
  if (lines.length) { lines.push("[STRUCTURE]", ""); }

  for (const s of work.sections) {
    lines.push(`[${s.label}]`);
    if (s.tone)     lines.push(`tone: ${s.tone}`);
    if (s.delivery) lines.push(`delivery: ${s.delivery}`);
    if (s.lyrics)   lines.push(s.lyrics);
    lines.push("");
  }
  return lines.join("\n").trim();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KeeperComposePage() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const { activeMode, attrs, handleModeChange } = useKeeperAttrs();
  // const player = usePlayer(); // available for future Send-to-Player

  // Composition state
  const [prompt, setPrompt] = useState("");
  const [composedWork, setComposedWork] = useState<ComposedWork | null>(null);
  const [editableOutput, setEditableOutput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef   = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.keeper.chat.useMutation();
  const saveNoteMutation = trpc.keeper.saveNote.useMutation({
    onSuccess: () => toast.success("Composition saved to Keeper Notes."),
    onError: () => toast.error("Failed to save note."),
  });

  const arc = composedWork ? deriveArc(composedWork.sections) : [];
  const modeColor = MODE_COLORS[activeMode as AgentMode] ?? "#C9A84C";

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    const msg = prompt.trim();
    if (!msg || isGenerating) return;

    setIsGenerating(true);
    setIsEditing(false);

    // Inject Suno-format instruction into the prompt
    const enhancedMsg = `${msg}

Please respond in Suno-ready format:
- Begin with [STYLE], [TEMPO], [KEY] header blocks
- Then [STRUCTURE] followed by labeled sections: [INTRO], [VERSE 1], [BUILD], [CHORUS], [VERSE 2], [BREAKDOWN], [BRIDGE], [FINAL CHORUS], [OUTRO] as appropriate
- For each section, include: tone: ... and delivery: ... annotations on their own lines, then the lyrics
- Do not collapse sections. Label everything clearly.`;

    try {
      const result = await chatMutation.mutateAsync({
        persona: activeMode.toLowerCase() as "guide" | "conductor" | "witness" | "custodian" | "archivist",
        message: enhancedMsg,
        history,
        attrs,
      });

      const replyText = typeof result.reply === "string" ? result.reply : String(result.reply);
      const parsed = parseComposedWork(replyText);
      setComposedWork(parsed);
      setEditableOutput(buildSunoCopy(parsed));

      // Update conversation history
      setHistory(prev => [
        ...prev,
        { role: "user" as const, content: msg },
        { role: "assistant" as const, content: replyText },
      ]);

      setPrompt("");
    } catch {
      toast.error("The Keeper is momentarily silent. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating, activeMode, attrs, history, chatMutation]);

  // ── Keyboard shortcut: Ctrl/Cmd+Enter to generate ─────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  // ── Action buttons ─────────────────────────────────────────────────────────

  const handleCopy = () => {
    const text = isEditing ? editableOutput : (composedWork ? buildSunoCopy(composedWork) : "");
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard — paste into Suno."));
  };

  const handleEdit = () => {
    if (!composedWork) return;
    if (!isEditing) {
      setEditableOutput(buildSunoCopy(composedWork));
    }
    setIsEditing(e => !e);
  };

  const handleSendToPlayer = () => {
    toast.info("Send to Player: paste the [STYLE] block into Suno, generate audio, then upload it to Living Nexus.", { duration: 6000 });
  };

  const handleRegister = () => {
    const text = isEditing ? editableOutput : (composedWork ? buildSunoCopy(composedWork) : "");
    if (!text) return;
    navigate(`/upload?prefill=${encodeURIComponent(text.slice(0, 500))}`);
  };

  const handleSaveNote = () => {
    const text = isEditing ? editableOutput : (composedWork ? buildSunoCopy(composedWork) : "");
    if (!text) return;
    const title = composedWork?.sections[0]?.lyrics?.split("\n")[0]?.slice(0, 60) ?? "Untitled Composition";
    saveNoteMutation.mutate({
      personaId: activeMode.toLowerCase(),
      title,
      content: text,
      tag: "composition",
    });
  };

  // ── Cinematic scroll effect ────────────────────────────────────────────────
  useEffect(() => {
    if (cinematic && outputRef.current) {
      outputRef.current.scrollTop = 0;
    }
  }, [cinematic, composedWork]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-obsidian)" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  // ── Cinematic mode overlay ─────────────────────────────────────────────────

  if (cinematic && composedWork) {
    return (
      <div
        className="fixed inset-0 z-[500] flex flex-col overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at center, #0d0a1a 0%, #050508 100%)",
          animation: "ln-cinematic-enter 0.6s ease forwards",
        }}
      >
        {/* Cinematic top bar */}
        <div className="flex items-center justify-between px-8 py-4 flex-shrink-0">
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-smoke)", letterSpacing: "0.15em" }}>
            COMPOSITION SURFACE · CINEMATIC MODE
          </div>
          <button
            onClick={() => setCinematic(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded transition-all hover:opacity-80"
            style={{ border: "1px solid var(--ln-panel-border)", color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
          >
            <Minimize2 className="w-3 h-3" />
            EXIT CINEMATIC
          </button>
        </div>

        {/* Cinematic arc visualization */}
        {arc.length > 0 && (
          <div className="flex items-end justify-center gap-4 px-8 py-4 flex-shrink-0">
            {arc.map((pt, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="transition-all duration-500"
                  style={{
                    height: `${pt.level * 8}px`,
                    width: 3,
                    background: `linear-gradient(to top, ${modeColor}88, ${modeColor})`,
                    borderRadius: 2,
                  }}
                />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "var(--ln-smoke)", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                  {pt.section.split(" – ")[0].slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Cinematic lyrics scroll */}
        <div ref={outputRef} className="flex-1 overflow-y-auto px-8 md:px-24 lg:px-48 py-8 space-y-10">
          {composedWork.sections.map((s, i) => (
            <div key={i} className="space-y-3">
              <div
                className="text-xs uppercase tracking-widest"
                style={{ color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", opacity: 0.7 }}
              >
                [{s.label}]
              </div>
              {(s.tone || s.delivery) && (
                <div style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", fontStyle: "italic" }}>
                  {s.tone && <span>tone: {s.tone}</span>}
                  {s.tone && s.delivery && <span> · </span>}
                  {s.delivery && <span>delivery: {s.delivery}</span>}
                </div>
              )}
              <div
                className="whitespace-pre-line leading-relaxed"
                style={{ color: "var(--ln-parchment)", fontFamily: "'Georgia', serif", fontSize: "1.25rem", lineHeight: 1.9 }}
              >
                {s.lyrics || <span style={{ opacity: 0.3 }}>(instrumental)</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Cinematic action bar */}
        <div className="flex items-center justify-center gap-3 px-8 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--ln-panel-border)" }}>
          <button onClick={handleCopy} className="ln-action-btn" style={{ "--btn-color": modeColor } as React.CSSProperties}>
            <Copy className="w-3.5 h-3.5" /> COPY
          </button>
          <button onClick={handleRegister} className="ln-action-btn" style={{ "--btn-color": modeColor } as React.CSSProperties}>
            <FileText className="w-3.5 h-3.5" /> REGISTER (WID)
          </button>
          <button onClick={handleSaveNote} disabled={saveNoteMutation.isPending} className="ln-action-btn" style={{ "--btn-color": modeColor } as React.CSSProperties}>
            <BookOpen className="w-3.5 h-3.5" /> SAVE NOTE
          </button>
        </div>
      </div>
    );
  }

  // ── Normal three-panel layout ──────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "var(--ln-obsidian)",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.03) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(123,158,166,0.03) 0%, transparent 60%)",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header
        className="flex items-center gap-3 px-5 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--ln-panel-border)", background: "var(--ln-panel)" }}
      >
        <button
          onClick={() => navigate("/keeper")}
          className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
          style={{ color: "var(--ln-smoke)" }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem" }}>KEEPER</span>
        </button>
        <ChevronRight className="w-3 h-3" style={{ color: "var(--ln-panel-border)" }} />
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: modeColor }}>
          COMPOSE
        </span>
        <div className="flex-1" />
        {/* Cinematic toggle */}
        <button
          onClick={() => { if (composedWork) setCinematic(true); else toast.info("Generate a composition first."); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-80"
          style={{
            background: cinematic ? `${modeColor}22` : "transparent",
            border: `1px solid ${modeColor}44`,
            color: modeColor,
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.6rem",
            letterSpacing: "0.08em",
          }}
        >
          <Maximize2 className="w-3 h-3" />
          CINEMATIC
        </button>
        <div className="ln-wid-badge">COMPOSITION SURFACE</div>
      </header>

      {/* ── Three-panel body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Mode selector ─────────────────────────────────────────── */}
        <div
          className="w-48 flex-shrink-0 flex flex-col border-r overflow-y-auto"
          style={{ borderColor: "var(--ln-panel-border)", background: "var(--ln-panel)" }}
        >
          <div
            className="px-4 pt-4 pb-2 text-xs uppercase tracking-widest"
            style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
          >
            Mode
          </div>
          <div className="flex flex-col gap-1 px-2 pb-4">
            {MODES.map(m => {
              const Icon = MODE_ICONS[m];
              const active = activeMode === m;
              return (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded text-left transition-all"
                  style={{
                    background: active ? `${MODE_COLORS[m]}18` : "transparent",
                    border: `1px solid ${active ? MODE_COLORS[m] : "transparent"}`,
                    color: active ? MODE_COLORS[m] : "var(--ln-smoke)",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.08em" }}>
                      {m.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", opacity: 0.6, marginTop: 1 }}>
                      {MODE_DESC[m].split(" · ")[0]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Keeper portrait mini */}
          <div className="mt-auto px-4 pb-4">
            <div
              className="text-xs uppercase tracking-widest mb-2"
              style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.5rem" }}
            >
              Active Mode
            </div>
            <div
              className="py-2 px-3 rounded text-center"
              style={{
                background: `${modeColor}12`,
                border: `1px solid ${modeColor}40`,
                color: modeColor,
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.55rem",
                letterSpacing: "0.06em",
              }}
            >
              {MODE_DESC[activeMode as AgentMode]}
            </div>
          </div>
        </div>

        {/* ── CENTER: Lyrics editor ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Output area */}
          <div ref={outputRef} className="flex-1 overflow-y-auto p-5">
            {!composedWork && !isGenerating && (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                <Music className="w-10 h-10" style={{ color: modeColor }} />
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "var(--ln-smoke)", textAlign: "center", lineHeight: 1.8 }}>
                  SPEAK TO YOUR KEEPER<br />
                  <span style={{ opacity: 0.6 }}>Describe your song concept, emotional arc,<br />or paste existing lyrics to structure.</span>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: modeColor }} />
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-smoke)" }}>
                  {activeMode.toUpperCase()} IS COMPOSING...
                </div>
              </div>
            )}

            {composedWork && !isGenerating && (
              <div className="space-y-1">
                {/* Header metadata */}
                {(composedWork.style || composedWork.tempo || composedWork.key) && (
                  <div
                    className="rounded p-3 mb-4 space-y-1"
                    style={{ background: `${modeColor}0A`, border: `1px solid ${modeColor}30` }}
                  >
                    {composedWork.style && (
                      <div>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: modeColor, letterSpacing: "0.1em" }}>STYLE  </span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-parchment)" }}>{composedWork.style}</span>
                      </div>
                    )}
                    {composedWork.tempo && (
                      <div>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: modeColor, letterSpacing: "0.1em" }}>TEMPO  </span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-parchment)" }}>{composedWork.tempo}</span>
                      </div>
                    )}
                    {composedWork.key && (
                      <div>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: modeColor, letterSpacing: "0.1em" }}>KEY    </span>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-parchment)" }}>{composedWork.key}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Sections */}
                {isEditing ? (
                  <textarea
                    value={editableOutput}
                    onChange={e => setEditableOutput(e.target.value)}
                    className="w-full rounded p-4 resize-none focus:outline-none"
                    style={{
                      background: "var(--ln-panel)",
                      border: `1px solid ${modeColor}44`,
                      color: "var(--ln-parchment)",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.7rem",
                      lineHeight: 1.8,
                      minHeight: "400px",
                    }}
                  />
                ) : (
                  composedWork.sections.map((s, i) => (
                    <div
                      key={i}
                      className="rounded p-4 mb-3"
                      style={{ background: "var(--ln-panel)", border: "1px solid var(--ln-panel-border)" }}
                    >
                      {/* Section label */}
                      <div
                        className="text-xs uppercase tracking-widest mb-2"
                        style={{ color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
                      >
                        [{s.label}]
                      </div>
                      {/* Annotations */}
                      {(s.tone || s.delivery) && (
                        <div
                          className="mb-2 italic"
                          style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
                        >
                          {s.tone && <span>tone: {s.tone}</span>}
                          {s.tone && s.delivery && <span>  ·  </span>}
                          {s.delivery && <span>delivery: {s.delivery}</span>}
                        </div>
                      )}
                      {/* Lyrics */}
                      <div
                        className="whitespace-pre-line leading-relaxed"
                        style={{ color: "var(--ln-parchment)", fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", lineHeight: 1.9 }}
                      >
                        {s.lyrics || <span style={{ opacity: 0.3 }}>(instrumental)</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {composedWork && !isGenerating && (
            <div
              className="flex items-center gap-2 px-5 py-3 flex-shrink-0 flex-wrap"
              style={{ borderTop: "1px solid var(--ln-panel-border)", background: "var(--ln-panel)" }}
            >
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
              >
                <Copy className="w-3 h-3" /> COPY
              </button>
              <button
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{
                  background: isEditing ? `${modeColor}30` : `${modeColor}18`,
                  border: `1px solid ${modeColor}44`,
                  color: modeColor,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.6rem",
                }}
              >
                <Edit3 className="w-3 h-3" /> {isEditing ? "DONE EDITING" : "EDIT"}
              </button>
              <button
                onClick={handleSendToPlayer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
              >
                <Music className="w-3 h-3" /> SEND TO PLAYER
              </button>
              <button
                onClick={handleRegister}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
              >
                <FileText className="w-3 h-3" /> REGISTER (WID)
              </button>
              <button
                onClick={handleSaveNote}
                disabled={saveNoteMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
              >
                <BookOpen className="w-3 h-3" /> SAVE NOTE
              </button>
            </div>
          )}

          {/* Input bar */}
          <div
            className="flex items-end gap-3 px-5 py-4 flex-shrink-0"
            style={{ borderTop: "1px solid var(--ln-panel-border)", background: "var(--ln-panel)" }}
          >
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Speak to your ${activeMode}... (Ctrl+Enter to generate)`}
              rows={2}
              className="flex-1 resize-none rounded px-3 py-2 focus:outline-none transition-all"
              style={{
                background: "var(--ln-obsidian)",
                border: `1px solid ${modeColor}33`,
                color: "var(--ln-parchment)",
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.7rem",
                lineHeight: 1.6,
              }}
              disabled={isGenerating}
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded transition-all hover:opacity-80 disabled:opacity-40"
              style={{
                background: `${modeColor}22`,
                border: `1px solid ${modeColor}66`,
                color: modeColor,
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.6rem",
                letterSpacing: "0.08em",
                flexShrink: 0,
              }}
            >
              {isGenerating
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              COMPOSE
            </button>
          </div>
        </div>

        {/* ── RIGHT: Emotional Arc ──────────────────────────────────────────── */}
        <div
          className="w-52 flex-shrink-0 flex flex-col border-l overflow-y-auto"
          style={{ borderColor: "var(--ln-panel-border)", background: "var(--ln-panel)" }}
        >
          <div
            className="px-4 pt-4 pb-2 text-xs uppercase tracking-widest"
            style={{ color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
          >
            Emotional Arc
          </div>

          {arc.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-4">
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "var(--ln-smoke)", textAlign: "center", opacity: 0.5, lineHeight: 1.8 }}>
                ARC WILL APPEAR<br />AFTER COMPOSITION
              </div>
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-1.5">
              {/* ASCII arc */}
              <div
                className="rounded p-3 mb-3"
                style={{ background: "var(--ln-obsidian)", border: "1px solid var(--ln-panel-border)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", lineHeight: 1.8 }}
              >
                {arc.map((pt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span style={{ color: "var(--ln-smoke)", width: "6rem", flexShrink: 0, fontSize: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {pt.section.split(" – ")[0].slice(0, 10)}
                    </span>
                    <span style={{ color: modeColor }}>{levelToBar(pt.level)}</span>
                  </div>
                ))}
              </div>

              {/* Visual bar chart */}
              <div
                className="text-xs uppercase tracking-widest mb-2"
                style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.5rem" }}
              >
                Tension Curve
              </div>
              <div className="flex items-end gap-1.5 h-20">
                {arc.map((pt, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all duration-500"
                    style={{
                      height: `${(pt.level / 10) * 100}%`,
                      background: `linear-gradient(to top, ${modeColor}44, ${modeColor})`,
                      minWidth: 4,
                    }}
                    title={`${pt.section}: ${pt.level}/10`}
                  />
                ))}
              </div>

              {/* Arc anchor term */}
              <div
                className="mt-4 py-2 px-3 rounded text-center"
                style={{ background: `${modeColor}0A`, border: `1px solid ${modeColor}30` }}
              >
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "var(--ln-smoke)", letterSpacing: "0.1em" }}>ANCHOR TERM</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", color: modeColor, marginTop: 2 }}>Arc</div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: "var(--ln-smoke)", opacity: 0.6, marginTop: 2 }}>
                  arcus — bow, curve<br />tension → release
                </div>
              </div>

              {/* Section list */}
              <div
                className="text-xs uppercase tracking-widest mt-4 mb-2"
                style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.5rem" }}
              >
                Sections
              </div>
              <div className="space-y-1">
                {arc.map((pt, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "var(--ln-smoke)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "8rem" }}>
                      {pt.section.split(" – ")[0]}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <div
                          key={j}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: j < Math.round(pt.level / 2) ? modeColor : "var(--ln-panel-border)" }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
