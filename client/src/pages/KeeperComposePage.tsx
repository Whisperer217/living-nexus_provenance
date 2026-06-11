import { useState, useRef, useCallback, useEffect } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useKeeperAttrs } from "@/contexts/KeeperAttrsContext";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Edit3, Send, FileText, Loader2,
  Maximize2, Minimize2, Music, BookOpen, ChevronRight,
  Zap, BarChart2, Layers, Archive, Eye, Film, ChevronDown,
  Sparkles, Download, ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentMode = "Guide" | "Conductor" | "Witness" | "Custodian" | "Archivist" | "Image";

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

const MODES: AgentMode[] = ["Guide", "Conductor", "Witness", "Custodian", "Archivist", "Image"];

const MODE_COLORS: Record<AgentMode, string> = {
  Guide:     "#C9A84C",
  Conductor: "#7B9EA6",
  Witness:   "#D4956A",
  Custodian: "#7BA67B",
  Archivist: "#9B7B55",
  Image:     "#8B5CF6",
};

const MODE_ICONS: Record<AgentMode, React.FC<{ className?: string }>> = {
  Guide:     ({ className }) => <Zap className={className} />,
  Conductor: ({ className }) => <BarChart2 className={className} />,
  Witness:   ({ className }) => <Eye className={className} />,
  Custodian: ({ className }) => <Layers className={className} />,
  Archivist: ({ className }) => <Archive className={className} />,
  Image:     ({ className }) => <Sparkles className={className} />,
};

const MODE_DESC: Record<AgentMode, string> = {
  Guide:     "Direction · Inspiration · Voice",
  Conductor: "Structure · Arrangement · Flow",
  Witness:   "Testimony · Emotional Truth · Depth",
  Custodian: "Provenance · Archive · Legacy",
  Archivist: "Semantics · Pattern · Corpus",
  Image:     "Vision · Generate · Manifest",
};

// ─── Image generation types ───────────────────────────────────────────────────

interface GeneratedImage {
  url: string;
  prompt: string;
  enrichedPrompt: string;
  generatedAt: string;
  guideId: number | null;
  widId?: string;
  referenceImageUrl?: string | null;
  isRemix?: boolean;
}

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

  const styleMatch = raw.match(/\[STYLE\]\s*\n([\s\S]*?)(?=\n\[|\n---|\n$)/i);
  const tempoMatch = raw.match(/\[TEMPO\]\s*\n([^\n]+)/i);
  const keyMatch   = raw.match(/\[KEY\]\s*\n([^\n]+)/i);

  if (styleMatch) work.style = styleMatch[1].trim();
  if (tempoMatch) work.tempo = tempoMatch[1].trim();
  if (keyMatch)   work.key   = keyMatch[1].trim();

  const sectionRegex = /\[([A-Z][A-Z0-9 /–\-–—]+(?:\s*[–\-–—]\s*[^\]]+)?)\]([\s\S]*?)(?=\n\[(?!STYLE|TEMPO|KEY|STRUCTURE)|\n---\s*END|\s*$)/gi;
  let match: RegExpExecArray | null;

  while ((match = sectionRegex.exec(raw)) !== null) {
    const rawLabel = match[1].trim();
    if (/^(STYLE|TEMPO|KEY|STRUCTURE)$/i.test(rawLabel)) continue;

    const body = match[2].trim();
    const lines = body.split("\n").map(l => l.trim()).filter(Boolean);

    let tone = "";
    let delivery = "";
    const lyricsLines: string[] = [];

    for (const line of lines) {
      const toneLine  = line.match(/^tone:\s*(.+)/i);
      const delivLine = line.match(/^delivery:\s*(.+)/i);
      const instrLine = line.match(/^↳\s*instrumentation:/i);
      if (toneLine)  { tone = toneLine[1].trim(); continue; }
      if (delivLine) { delivery = delivLine[1].trim(); continue; }
      if (instrLine) continue;
      lyricsLines.push(line);
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

function deriveArc(sections: ComposedWork["sections"]): ArcPoint[] {
  return sections.map(s => {
    const upperLabel = s.label.toUpperCase().replace(/\s*[–\-–—].*$/, "").trim();
    const level = ARC_LEVELS[upperLabel] ?? 5;
    return { section: s.label, level };
  });
}

// ─── Live arc preview from prompt text ────────────────────────────────────────

function derivePreviewArc(text: string): ArcPoint[] {
  if (!text.trim()) return [];
  const words = text.trim().split(/\s+/).length;
  // Generate a simple 4-point preview arc based on word count
  const intensity = Math.min(10, Math.max(2, Math.round(words / 5)));
  return [
    { section: "Intro", level: Math.max(1, intensity - 3) },
    { section: "Build", level: intensity },
    { section: "Peak", level: Math.min(10, intensity + 2) },
    { section: "Outro", level: Math.max(1, intensity - 4) },
  ];
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

// ─── Thinking dots animation ──────────────────────────────────────────────────

function ThinkingDots({ color }: { color: string }) {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDots(d => (d % 3) + 1), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{
              background: i < dots ? color : "var(--ln-panel-border)",
              transform: i < dots ? "scale(1.2)" : "scale(1)",
            }}
          />
        ))}
      </div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-smoke)" }}>
        Keeper is thinking...
      </div>
    </div>
  );
}

// ─── Arc panel (shared between desktop right rail and mobile collapsible) ─────

function ArcPanel({ arc, previewArc, modeColor, hasContent }: {
  arc: ArcPoint[];
  previewArc: ArcPoint[];
  modeColor: string;
  hasContent: boolean;
}) {
  const displayArc = arc.length > 0 ? arc : (hasContent ? previewArc : []);
  const isPreview = arc.length === 0 && hasContent;

  if (!hasContent && arc.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-sm)", color: "var(--ln-smoke)", textAlign: "center", opacity: 0.5, lineHeight: 1.8 }}>
          Arc will build<br />as you write...
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-1.5">
      {isPreview && (
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: "var(--ln-smoke)", opacity: 0.5, textAlign: "center", marginBottom: 8 }}>
          PREVIEW — LIVE AS YOU TYPE
        </div>
      )}

      {/* Visual bar chart */}
      <div className="flex items-end gap-1.5 h-16">
        {displayArc.map((pt, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all duration-500"
            style={{
              height: `${(pt.level / 10) * 100}%`,
              background: isPreview
                ? `linear-gradient(to top, ${modeColor}22, ${modeColor}66)`
                : `linear-gradient(to top, ${modeColor}44, ${modeColor})`,
              minWidth: 4,
              opacity: isPreview ? 0.7 : 1,
            }}
            title={`${pt.section}: ${pt.level}/10`}
          />
        ))}
      </div>

      {/* ASCII arc */}
      {!isPreview && (
        <div
          className="rounded p-3 mt-2"
          style={{ background: "var(--ln-obsidian)", border: "1px solid var(--ln-panel-border)",           fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-sm)", lineHeight: 1.8 }}
        >
          {displayArc.map((pt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span style={{ color: "var(--ln-smoke)", width: "6rem", flexShrink: 0, fontSize: "var(--compose-xs)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pt.section.split(" – ")[0].slice(0, 10)}
              </span>
              <span style={{ color: modeColor }}>{levelToBar(pt.level)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Arc anchor term */}
      {!isPreview && (
        <div
          className="mt-3 py-2 px-3 rounded text-center"
          style={{ background: `${modeColor}0A`, border: `1px solid ${modeColor}30` }}
        >
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: "var(--ln-smoke)", letterSpacing: "0.1em" }}>ANCHOR TERM</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-md)", color: modeColor, marginTop: 2 }}>Arc</div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: "var(--ln-smoke)", opacity: 0.6, marginTop: 2 }}>
            arcus — bow, curve<br />tension → release
          </div>
        </div>
      )}

      {/* Section list */}
      {!isPreview && (
        <>
          <div
            className="text-xs uppercase tracking-widest mt-3 mb-1"
            style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)" }}
          >
            Sections
          </div>
          <div className="space-y-1">
            {displayArc.map((pt, i) => (
              <div key={i} className="flex items-center justify-between">
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: "var(--ln-smoke)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "8rem" }}>
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
        </>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KeeperComposePage() {
  const { loading: authLoading, user: authUser } = useAuth({ redirectOnUnauthenticated: true });
  const isAuthenticated = !!authUser;
  const [, navigate] = useLocation();
  const { activeMode, attrs, handleModeChange } = useKeeperAttrs();

  // Composition state
  const [prompt, setPrompt] = useState("");
  const [composedWork, setComposedWork] = useState<ComposedWork | null>(null);
  const [editableOutput, setEditableOutput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [history, setHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [arcOpen, setArcOpen] = useState(false); // mobile arc collapsible

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef   = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const chatMutation = trpc.keeper.chat.useMutation();
  const saveNoteMutation = trpc.keeper.saveNote.useMutation({
    onSuccess: () => toast.success("Composition saved to Keeper Notes."),
    onError: () => toast.error("Failed to save note."),
  });
  const autoSaveMutation = trpc.keeper.saveNote.useMutation(); // silent auto-save
  const recentDraftsQuery = trpc.keeper.listNotes.useQuery(
    { tag: "composition", limit: 5 },
    { enabled: isAuthenticated }
  );
  const [draftsOpen, setDraftsOpen] = useState(false);

  // ── Image generation state ──────────────────────────────────────────────────────
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState<number | undefined>(undefined);
  // Multi-reference image support (up to 4)
  const [referenceImages, setReferenceImages] = useState<Array<{ url: string; preview: string }>>([]);
  const [uploadingRefIndex, setUploadingRefIndex] = useState<number | null>(null);
  // Legacy single-ref compat (kept for remixImage which still uses single URL)
  const referenceImageUrl = referenceImages[0]?.url;
  const referenceImagePreview = referenceImages[0]?.preview;
  const isUploadingRef = uploadingRefIndex !== null;
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const [pendingRefSlot, setPendingRefSlot] = useState<number>(0);
  const generateImageMutation = trpc.guides.generateImage.useMutation();
  const remixImageMutation = trpc.guides.remixImage.useMutation();
  const uploadReferenceImageMutation = trpc.guides.uploadReferenceImage.useMutation();
  const myGuidesQuery = trpc.guides.listMine.useQuery(undefined, { enabled: isAuthenticated && activeMode === 'Image' });
  const quiverSaveMutation = trpc.quiver.save.useMutation();
  const quiverDeleteMutation = trpc.quiver.delete.useMutation();
  const quiverUtils = trpc.useUtils();
  // Quiver panel state
  const [quiverOpen, setQuiverOpen] = useState(false);
  const [quiverSearch, setQuiverSearch] = useState('');
  const [quiverPage, setQuiverPage] = useState(0);
  // Always fetch Quiver when in Image mode (persistent right column on desktop)
  const quiverQuery = trpc.quiver.list.useQuery(
    { search: quiverSearch || undefined, page: quiverPage, limit: 20 },
    { enabled: isAuthenticated && activeMode === 'Image' }
  );

  const arc = composedWork ? deriveArc(composedWork.sections) : [];
  const previewArc = derivePreviewArc(prompt);
  const modeColor = MODE_COLORS[activeMode as AgentMode] ?? "#C9A84C";

  // Detect mobile
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // ── Player auto-collapse on input focus ─────────────────────────────────────
  const handleInputFocus = () => {
    window.dispatchEvent(new CustomEvent("ln:player-collapse"));
  };
  const handleInputBlur = () => {
    window.dispatchEvent(new CustomEvent("ln:player-expand"));
  };

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    const msg = prompt.trim();
    if (!msg || isGenerating) return;

    setIsGenerating(true);
    setIsEditing(false);

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

      setHistory(prev => [
        ...prev,
        { role: "user" as const, content: msg },
        { role: "assistant" as const, content: replyText },
      ]);

      setPrompt("");
      // Auto-save to Keeper Notes silently
      const autoTitle = parsed.sections[0]?.lyrics?.split("\n")[0]?.slice(0, 60) ?? "Untitled Composition";
      const autoContent = buildSunoCopy(parsed);
      autoSaveMutation.mutate({
        personaId: activeMode.toLowerCase(),
        title: autoTitle,
        content: autoContent,
        tag: "composition",
      });
      // Invalidate recent drafts so panel updates
      utils.keeper.listNotes.invalidate({ tag: "composition", limit: 5 });
      // Auto-enter cinematic on desktop; open arc on mobile
      if (isMobile) {
        setArcOpen(true);
      } else {
        setCinematic(true);
      }
    } catch {
      toast.error("The Keeper is momentarily silent. Try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, isGenerating, activeMode, attrs, history, chatMutation, isMobile]);

  // ── Keyboard shortcut ─────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  // ── Swipe down to close cinematic ─────────────────────────────────────────

  const touchStartY = useRef<number>(0);
  const handleCinematicTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleCinematicTouchEnd = (e: React.TouchEvent) => {
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 80) setCinematic(false); // swipe down > 80px closes
  };

  // ── ESC to close cinematic ────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setCinematic(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Action buttons ─────────────────────────────────────────────────────────

  const handleCopy = () => {
    const text = isEditing ? editableOutput : (composedWork ? buildSunoCopy(composedWork) : "");
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard — paste into Suno."));
  };

  const handleEdit = () => {
    if (!composedWork) return;
    if (!isEditing) setEditableOutput(buildSunoCopy(composedWork));
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

  // ── Image generation handler ─────────────────────────────────────────────────

  const handleUploadReferenceImage = (file: File, slotIndex: number = 0) => {
    if (!file) return;
    setUploadingRefIndex(slotIndex);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      try {
        const result = await uploadReferenceImageMutation.mutateAsync({
          base64,
          mimeType: file.type || 'image/jpeg',
        });
        setReferenceImages(prev => {
          const updated = [...prev];
          updated[slotIndex] = { url: result.url, preview: dataUrl };
          return updated;
        });
        toast.success(`Reference ${slotIndex + 1} uploaded — merge anchor set.`);
      } catch {
        toast.error('Failed to upload reference image.');
      } finally {
        setUploadingRefIndex(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReferenceImage = (slotIndex: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== slotIndex));
  };

  const handleGenerateImage = async () => {
    const msg = imagePrompt.trim();
    if (!msg || isGeneratingImage) return;
    setIsGeneratingImage(true);
    try {
      const result = await generateImageMutation.mutateAsync({
        prompt: msg,
        guideId: selectedGuideId,
        referenceImageUrls: referenceImages.map(r => r.url),
      });
      const newImg: GeneratedImage = {
        url: result.url ?? '',
        prompt: result.prompt,
        enrichedPrompt: result.enrichedPrompt,
        generatedAt: result.generatedAt,
        guideId: result.guideId,
        widId: result.widId,
        referenceImageUrl: result.referenceImageUrl,
        isRemix: false,
      };
      setImageHistory(prev => [newImg, ...prev]);
      setImagePrompt('');
      // Auto-save to Quiver vault
      if (result.url) {
        quiverSaveMutation.mutate({
          url: result.url,
          prompt: result.prompt,
          enrichedPrompt: result.enrichedPrompt,
          widId: result.widId,
          guideId: result.guideId ?? undefined,
          referenceImageUrl: result.referenceImageUrl ?? undefined,
          isRemix: false,
        }, {
          onSuccess: () => quiverUtils.quiver.list.invalidate(),
        });
      }
    } catch {
      toast.error('Image generation failed. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleRemixImage = async (sourceImg: GeneratedImage) => {
    if (!sourceImg.url || isGeneratingImage) return;
    setIsGeneratingImage(true);
    setImagePrompt(sourceImg.prompt);
    try {
      const result = await remixImageMutation.mutateAsync({
        sourceImageUrl: sourceImg.url,
        prompt: sourceImg.prompt,
        guideId: selectedGuideId ?? sourceImg.guideId ?? undefined,
      });
      const remixImg: GeneratedImage = {
        url: result.url ?? '',
        prompt: result.prompt,
        enrichedPrompt: result.enrichedPrompt,
        generatedAt: result.generatedAt,
        guideId: result.guideId,
        widId: result.widId,
        referenceImageUrl: result.referenceImageUrl,
        isRemix: true,
      };
      setImageHistory(prev => [remixImg, ...prev]);
      // Auto-save remix to Quiver vault
      if (result.url) {
        quiverSaveMutation.mutate({
          url: result.url,
          prompt: result.prompt,
          enrichedPrompt: result.enrichedPrompt,
          widId: result.widId,
          guideId: result.guideId ?? undefined,
          referenceImageUrl: result.referenceImageUrl ?? undefined,
          isRemix: true,
        }, {
          onSuccess: () => quiverUtils.quiver.list.invalidate(),
        });
      }
    } catch {
      toast.error('Remix failed. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleImageKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerateImage();
    }
  };

  // Download with WID provenance metadata embedded via server-side sharp PNG processing.
  // `index` is the quiver image DB id when downloading from Quiver, or a session index otherwise.
  const handleDownloadImage = async (url: string, index: number | string) => {
    // If index is a numeric DB id, use the metadata endpoint; otherwise fall back to plain download
    const isDbId = typeof index === 'number' && index > 0;
    try {
      if (isDbId) {
        // Use the WID-metadata endpoint for provenance-tagged PNG
        const response = await fetch(`/api/quiver/${index}/download`, { credentials: 'include' });
        if (response.ok) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = objectUrl;
          // Use Content-Disposition filename from server if available
          const disposition = response.headers.get('Content-Disposition') ?? '';
          const match = disposition.match(/filename="([^"]+)"/);
          a.download = match ? match[1] : `keeper-vision-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(objectUrl);
          return;
        }
      }
      // Fallback: plain fetch from CDN URL
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `keeper-vision-${ts}.png`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Last resort: open in new tab
      window.open(url, '_blank');
    }
  };

  const handleRegisterImage = (img: GeneratedImage) => {
    navigate(`/upload?prefill=${encodeURIComponent(img.prompt.slice(0, 200))}`);
  };

  // ── Cinematic scroll reset ─────────────────────────────────────────────────

  useEffect(() => {
    if (cinematic && outputRef.current) outputRef.current.scrollTop = 0;
  }, [cinematic, composedWork]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-obsidian)" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  // ── Cinematic mode overlay ─────────────────────────────────────────────────

  if (cinematic) {
    return (
      <div
        className="fixed inset-0 z-[500] flex flex-col overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at center, #0d0a1a 0%, #050508 100%)",
          animation: "ln-cinematic-enter 0.6s ease forwards",
        }}
        onTouchStart={handleCinematicTouchStart}
        onTouchEnd={handleCinematicTouchEnd}
      >
        {/* Cinematic top bar */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-smoke)", letterSpacing: "0.15em" }}>
            COMPOSITION SURFACE · CINEMATIC MODE
          </div>
          <button
            onClick={() => setCinematic(false)}
            className="flex items-center gap-2 px-3 py-1.5 rounded transition-all hover:opacity-80"
            style={{ border: "1px solid var(--ln-panel-border)", color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
          >
            <Minimize2 className="w-3 h-3" />
            EXIT
          </button>
        </div>

        {/* Swipe hint on mobile */}
        {isMobile && (
          <div className="flex justify-center pb-2 flex-shrink-0">
            <ChevronDown className="w-4 h-4 animate-bounce" style={{ color: "var(--ln-smoke)", opacity: 0.4 }} />
          </div>
        )}

        {/* Cinematic arc visualization */}
        {arc.length > 0 && (
          <div className="flex items-end justify-center gap-3 px-6 py-3 flex-shrink-0">
            {arc.map((pt, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="transition-all duration-500"
                  style={{
                    height: `${pt.level * 6}px`,
                    width: 3,
                    background: `linear-gradient(to top, ${modeColor}88, ${modeColor})`,
                    borderRadius: 2,
                  }}
                />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.4rem", color: "var(--ln-smoke)", writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                  {pt.section.split(" – ")[0].slice(0, 8)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Cinematic content — empty state with input if no composition */}
        {!composedWork ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 gap-6">
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "var(--ln-smoke)", textAlign: "center", opacity: 0.6, lineHeight: 1.8 }}>
              SPEAK TO YOUR KEEPER<br />
              <span style={{ opacity: 0.5 }}>Generate a composition to enter cinematic mode.</span>
            </div>
            <button
              onClick={() => setCinematic(false)}
              className="px-4 py-2 rounded transition-all hover:opacity-80"
              style={{ border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
            >
              RETURN TO COMPOSE
            </button>
          </div>
        ) : (
          /* Cinematic lyrics scroll */
          <div ref={outputRef} className="flex-1 overflow-y-auto px-6 md:px-24 lg:px-48 py-8 space-y-10">
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
                  style={{ color: "var(--ln-parchment)", fontFamily: "'Georgia', serif", fontSize: "1.1rem", lineHeight: 1.9 }}
                >
                  {s.lyrics || <span style={{ opacity: 0.3 }}>(instrumental)</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cinematic action bar */}
        {composedWork && (
          <div className="flex items-center justify-center gap-3 px-6 py-4 flex-shrink-0 flex-wrap" style={{ borderTop: "1px solid var(--ln-panel-border)" }}>
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
        )}
      </div>
    );
  }

  // ── Shared input bar ───────────────────────────────────────────────────────

  const RecentDraftsStrip = isAuthenticated && (recentDraftsQuery.data?.length ?? 0) > 0 ? (
    <div className="flex-shrink-0" style={{ borderTop: "1px solid var(--ln-panel-border)", background: "var(--ln-panel)" }}>
      <button
        onClick={() => setDraftsOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-1.5 hover:opacity-80 transition-opacity"
        style={{ color: modeColor }}
      >
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.1em" }}>RECENT DRAFTS ({recentDraftsQuery.data?.length ?? 0})</span>
        <ChevronDown className="w-3 h-3" style={{ transform: draftsOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>
      {draftsOpen && (
        <div className="px-4 pb-2 space-y-1">
          {recentDraftsQuery.data?.map((draft: any) => (
            <button
              key={draft.id}
              onClick={() => {
                const parsed = parseComposedWork(draft.content);
                setComposedWork(parsed);
                setEditableOutput(buildSunoCopy(parsed));
                setDraftsOpen(false);
                if (!isMobile) setCinematic(true);
              }}
              className="w-full text-left px-3 py-2 rounded transition-all hover:opacity-80"
              style={{ background: `${modeColor}0A`, border: `1px solid ${modeColor}22` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate" style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "var(--ln-parchment)" }}>{draft.title}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: modeColor, opacity: 0.6, flexShrink: 0 }}>
                  {new Date(draft.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  const InputBar = (
    <div
      className="flex items-end gap-2 px-4 py-3 flex-shrink-0"
      style={{ borderTop: "1px solid var(--ln-panel-border)", background: "var(--ln-panel)" }}
    >
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={`Tell your ${activeMode} what to create...`}
        rows={isMobile ? 3 : 2}
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
      {/* Cinematic icon trigger */}
      <button
        onClick={() => setCinematic(true)}
        title="Cinematic mode"
        className="flex items-center justify-center w-8 h-8 rounded transition-all hover:opacity-80 flex-shrink-0"
        style={{
          background: `${modeColor}18`,
          border: `1px solid ${modeColor}44`,
          color: modeColor,
        }}
      >
        <Film className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="flex items-center gap-1.5 px-4 py-2 rounded transition-all hover:opacity-80 disabled:opacity-40 flex-shrink-0"
        style={{
          background: `${modeColor}22`,
          border: `1px solid ${modeColor}66`,
          color: modeColor,
          fontFamily: "'Space Mono', monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.08em",
        }}
      >
        {isGenerating
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <Send className="w-3.5 h-3.5" />}
        {!isMobile && "COMPOSE"}
      </button>
    </div>
  );

  // ── MOBILE: Stacked layout ─────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "var(--ln-obsidian)" }}
      >
        {/* Mobile top bar */}
        <header
          className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--ln-panel-border)", background: "var(--ln-panel)" }}
        >
          <button
            onClick={() => navigate("/keeper")}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            style={{ color: "var(--ln-smoke)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <ChevronRight className="w-3 h-3" style={{ color: "var(--ln-panel-border)" }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: modeColor }}>
            COMPOSE
          </span>
          <div className="flex-1" />
          {/* Mode selector pill */}
          <div className="flex gap-1">
            {MODES.map(m => {
              const Icon = MODE_ICONS[m];
              const active = activeMode === m;
              return (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className="w-7 h-7 rounded flex items-center justify-center transition-all"
                  style={{
                    background: active ? `${MODE_COLORS[m]}22` : "transparent",
                    border: `1px solid ${active ? MODE_COLORS[m] : "transparent"}`,
                    color: active ? MODE_COLORS[m] : "var(--ln-smoke)",
                  }}
                  title={m}
                >
                  <Icon className="w-3 h-3" />
                </button>
              );
            })}
          </div>
        </header>

        {/* Mode description strip */}
        <div
          className="px-4 py-2 flex-shrink-0"
          style={{ background: `${modeColor}08`, borderBottom: `1px solid ${modeColor}22` }}
        >
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: modeColor, opacity: 0.8 }}>
            {activeMode.toUpperCase()} · {MODE_DESC[activeMode as AgentMode]}
          </span>
        </div>

        {/* Output area */}
        <div ref={outputRef} className="flex-1 overflow-y-auto p-4">

          {/* ── IMAGE MODE ── */}
          {activeMode === 'Image' && (
            <div className="flex flex-col gap-4">
              {/* Quiver toggle */}
              <button
                onClick={() => setQuiverOpen(v => !v)}
                className="flex items-center justify-between w-full px-3 py-2 rounded transition-all hover:opacity-80"
                style={{ background: quiverOpen ? `${modeColor}22` : `${modeColor}0a`, border: `1px solid ${modeColor}${quiverOpen ? '66' : '33'}`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', letterSpacing: '0.08em' }}
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-3 h-3" />
                  QUIVER — YOUR IMAGE VAULT {quiverQuery.data ? `(${quiverQuery.data.length}+)` : ''}
                </span>
                <span style={{ fontSize: '0.6rem' }}>{quiverOpen ? '▲' : '▼'}</span>
              </button>

              {/* Quiver panel */}
              {quiverOpen && (
                <div className="rounded p-3 space-y-3" style={{ background: 'var(--ln-panel)', border: `1px solid ${modeColor}30` }}>
                  <input
                    type="text"
                    placeholder="Search your quiver..."
                    value={quiverSearch}
                    onChange={e => { setQuiverSearch(e.target.value); setQuiverPage(0); }}
                    className="w-full rounded px-3 py-1.5 focus:outline-none"
                    style={{ background: 'var(--ln-obsidian)', border: `1px solid ${modeColor}33`, color: 'var(--ln-parchment)', fontFamily: "'Space Mono', monospace", fontSize: '0.6rem' }}
                  />
                  {quiverQuery.isLoading && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: modeColor, opacity: 0.6 }}>LOADING VAULT...</div>}
                  {quiverQuery.data && quiverQuery.data.length === 0 && (
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: 'var(--ln-smoke)', opacity: 0.6, textAlign: 'center', padding: '12px 0' }}>Your quiver is empty. Generate an image to begin.</div>
                  )}
                  {quiverQuery.data && quiverQuery.data.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {quiverQuery.data.map((qi: any) => (
                        <div key={qi.id} className="rounded overflow-hidden relative group" style={{ border: `1px solid ${modeColor}22` }}>
                          <img src={qi.url} alt={qi.prompt} className="w-full block" style={{ height: '100px', objectFit: 'cover' }} />
                          {qi.isRemix && <div className="absolute top-1 left-1 px-1 rounded" style={{ background: `${modeColor}cc`, color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '0.4rem' }}>REMIX</div>}
                          {qi.widId && <div className="absolute top-1 right-1 px-1 rounded" style={{ background: 'rgba(0,0,0,0.7)', color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.4rem' }}>WID</div>}
                          <div className="p-1.5" style={{ background: 'var(--ln-obsidian)' }}>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.45rem', color: 'var(--ln-smoke)', lineHeight: 1.4 }} className="line-clamp-2">{qi.title || qi.prompt}</div>
                            <div className="flex gap-1 mt-1">
                              <button onClick={() => handleDownloadImage(qi.url, qi.id)} className="flex-1 py-0.5 rounded text-center" style={{ background: `${modeColor}18`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.4rem', border: `1px solid ${modeColor}33` }}>DL</button>
                              <button onClick={() => handleRemixImage({ url: qi.url, prompt: qi.prompt, enrichedPrompt: qi.enrichedPrompt, generatedAt: new Date(qi.createdAt).toISOString(), guideId: qi.guideId, widId: qi.widId, isRemix: qi.isRemix })} disabled={isGeneratingImage} className="flex-1 py-0.5 rounded text-center" style={{ background: `${modeColor}18`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.4rem', border: `1px solid ${modeColor}33` }}>REMIX</button>
                              <button onClick={() => { quiverDeleteMutation.mutate({ id: qi.id }, { onSuccess: () => quiverUtils.quiver.list.invalidate() }); }} className="flex-1 py-0.5 rounded text-center" style={{ background: '#dc262618', color: '#dc2626', fontFamily: "'Space Mono', monospace", fontSize: '0.4rem', border: '1px solid #dc262633' }}>DEL</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Pagination */}
                  {quiverQuery.data && quiverQuery.data.length === 20 && (
                    <div className="flex gap-2 justify-center">
                      {quiverPage > 0 && <button onClick={() => setQuiverPage(p => p - 1)} style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: modeColor }}>← PREV</button>}
                      <button onClick={() => setQuiverPage(p => p + 1)} style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: modeColor }}>NEXT →</button>
                    </div>
                  )}
                </div>
              )}

              {/* Guide selector */}
              {myGuidesQuery.data && myGuidesQuery.data.length > 0 && (
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: modeColor, letterSpacing: "0.08em", marginBottom: 4 }}>GUIDE CONTEXT (OPTIONAL)</div>
                  <select
                    value={selectedGuideId ?? ""}
                    onChange={e => setSelectedGuideId(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full rounded px-3 py-2 focus:outline-none"
                    style={{
                      background: "var(--ln-obsidian)",
                      border: `1px solid ${modeColor}33`,
                      color: "var(--ln-parchment)",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "var(--compose-sm)",
                    }}
                  >
                    <option value="">No guide — freeform generation</option>
                    {myGuidesQuery.data.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.canonicalName ?? `Guide #${g.id}`}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Multi-reference image upload (mobile) */}
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: modeColor, letterSpacing: "0.08em", marginBottom: 4 }}>REFERENCE IMAGES — UP TO 4 (OPTIONAL)</div>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const ref = referenceImages[i];
                    const isUploading = uploadingRefIndex === i;
                    return (
                      <div key={i} className="relative">
                        {ref ? (
                          <div className="relative">
                            <img src={ref.preview} alt={`Ref ${i + 1}`} className="rounded object-cover" style={{ width: "var(--compose-ref-tile-mobile)", height: "var(--compose-ref-tile-mobile)", border: `1px solid ${modeColor}44` }} />
                            <button onClick={() => handleRemoveReferenceImage(i)} className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs" style={{ background: 'var(--ln-obsidian)', border: `1px solid ${modeColor}44`, color: modeColor }}>×</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setPendingRefSlot(i); referenceInputRef.current?.click(); }}
                            disabled={isUploading}
                            className="rounded flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-40"
                            style={{ width: "var(--compose-ref-tile-mobile)", height: "var(--compose-ref-tile-mobile)", background: `${modeColor}10`, border: `1px dashed ${modeColor}44`, color: modeColor }}
                          >
                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <input ref={referenceInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadReferenceImage(f, pendingRefSlot); e.target.value = ''; }} />
                {referenceImages.length > 0 && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: modeColor, opacity: 0.7, marginTop: 4 }}>{referenceImages.length} REFERENCE{referenceImages.length > 1 ? 'S' : ''} ACTIVE — model will merge all anchors</div>}
              </div>

              {/* Prompt input */}
              <div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: modeColor, letterSpacing: "0.08em", marginBottom: 4 }}>VISION PROMPT</div>
                <textarea
                  value={imagePrompt}
                  onChange={e => setImagePrompt(e.target.value)}
                  onKeyDown={handleImageKeyDown}
                  placeholder="Describe the image you want to manifest..."
                  rows={3}
                  className="w-full resize-none rounded px-3 py-2 focus:outline-none"
                  style={{
                    background: "var(--ln-obsidian)",
                    border: `1px solid ${modeColor}33`,
                    color: "var(--ln-parchment)",
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "var(--compose-md)",
                    lineHeight: 1.6,
                  }}
                  disabled={isGeneratingImage}
                />
              </div>
              <button
                onClick={handleGenerateImage}
                disabled={isGeneratingImage || !imagePrompt.trim()}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded transition-all hover:opacity-80 disabled:opacity-40"
                style={{
                  background: `${modeColor}22`,
                  border: `1px solid ${modeColor}66`,
                  color: modeColor,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "var(--compose-sm)",
                  letterSpacing: "0.08em",
                }}
              >
                {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isGeneratingImage ? "GENERATING..." : "GENERATE IMAGE"}
              </button>

              {/* Session image history */}
              {imageHistory.length > 0 && (
                <div className="space-y-4">
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: modeColor, letterSpacing: "0.08em" }}>SESSION VISIONS ({imageHistory.length})</div>
                  {imageHistory.map((img, i) => (
                    <div key={i} className="rounded overflow-hidden" style={{ border: `1px solid ${modeColor}30` }}>
                      <div className="relative">
                        <img src={img.url} alt={img.prompt} className="w-full block" style={{ maxHeight: '300px', objectFit: 'cover' }} />
                        {img.isRemix && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs" style={{ background: `${modeColor}cc`, color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '0.45rem', letterSpacing: '0.08em' }}>REMIX</div>
                        )}
                      </div>
                      <div className="p-3" style={{ background: 'var(--ln-panel)' }}>
                        {/* WID badge */}
                        {img.widId && (
                          <div className="mb-2 flex items-center gap-1.5">
                            <div className="px-2 py-0.5 rounded" style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, fontFamily: "'Space Mono', monospace", fontSize: '0.45rem', color: modeColor, letterSpacing: '0.06em' }}>
                              {img.widId}
                            </div>
                          </div>
                        )}
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.55rem', color: 'var(--ln-smoke)', lineHeight: 1.5, marginBottom: 8 }}>
                          {img.prompt}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={() => handleDownloadImage(img.url, i)} className="flex items-center gap-1 px-2.5 py-1.5 rounded transition-all hover:opacity-80" style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.55rem' }}>
                            <Download className="w-3 h-3" /> DOWNLOAD
                          </button>
                          <button onClick={() => handleRemixImage(img)} disabled={isGeneratingImage} className="flex items-center gap-1 px-2.5 py-1.5 rounded transition-all hover:opacity-80 disabled:opacity-40" style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.55rem' }}>
                            <Sparkles className="w-3 h-3" /> REMIX
                          </button>
                          <button onClick={() => handleRegisterImage(img)} className="flex items-center gap-1 px-2.5 py-1.5 rounded transition-all hover:opacity-80" style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.55rem' }}>
                            <FileText className="w-3 h-3" /> REGISTER
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {imageHistory.length === 0 && !isGeneratingImage && (
                <div className="flex flex-col items-center justify-center py-12 gap-4 opacity-40">
                  <ImageIcon className="w-10 h-10" style={{ color: modeColor }} />
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "var(--ln-smoke)", textAlign: "center", lineHeight: 1.8 }}>
                    VISION CHAMBER<br />
                    <span style={{ opacity: 0.6 }}>Describe your creative vision<br />and manifest it as an image.</span>
                  </div>
                </div>
              )}

              {isGeneratingImage && <ThinkingDots color={modeColor} />}
            </div>
          )}

          {/* ── COMPOSITION MODES ── */}
          {activeMode !== "Image" && (
            <>
          {!composedWork && !isGenerating && (
            <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40 py-12">
              <Music className="w-10 h-10" style={{ color: modeColor }} />
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "var(--ln-smoke)", textAlign: "center", lineHeight: 1.8 }}>
                SPEAK TO YOUR KEEPER<br />
                <span style={{ opacity: 0.6 }}>Describe your song concept,<br />emotional arc, or paste lyrics.</span>
              </div>
            </div>
          )}

          {isGenerating && <ThinkingDots color={modeColor} />}

          {composedWork && !isGenerating && (
            <div className="space-y-1">
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
                    minHeight: "300px",
                  }}
                />
              ) : (
                composedWork.sections.map((s, i) => (
                  <div
                    key={i}
                    className="rounded p-3 mb-2"
                    style={{ background: "var(--ln-panel)", border: "1px solid var(--ln-panel-border)" }}
                  >
                    <div
                      className="text-xs uppercase tracking-widest mb-1.5"
                      style={{ color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
                    >
                      [{s.label}]
                    </div>
                    {(s.tone || s.delivery) && (
                      <div
                        className="mb-1.5 italic"
                        style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.5rem" }}
                      >
                        {s.tone && <span>tone: {s.tone}</span>}
                        {s.tone && s.delivery && <span>  ·  </span>}
                        {s.delivery && <span>delivery: {s.delivery}</span>}
                      </div>
                    )}
                    <div
                      className="whitespace-pre-line leading-relaxed"
                      style={{ color: "var(--ln-parchment)", fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", lineHeight: 1.9 }}
                    >
                      {s.lyrics || <span style={{ opacity: 0.3 }}>(instrumental)</span>}
                    </div>
                  </div>
                ))
              )}

              {/* Mobile action buttons */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-all hover:opacity-80"
                  style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}>
                  <Copy className="w-3 h-3" /> COPY
                </button>
                <button onClick={handleEdit} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-all hover:opacity-80"
                  style={{ background: isEditing ? `${modeColor}30` : `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}>
                  <Edit3 className="w-3 h-3" /> {isEditing ? "DONE" : "EDIT"}
                </button>
                <button onClick={handleRegister} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-all hover:opacity-80"
                  style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}>
                  <FileText className="w-3 h-3" /> REGISTER
                </button>
                <button onClick={handleSaveNote} disabled={saveNoteMutation.isPending} className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-all hover:opacity-80"
                  style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}>
                  <BookOpen className="w-3 h-3" /> SAVE
                </button>
              </div>
            </div>
          )}

          </>
          )}

          {/* Mobile collapsible arc - only show in composition modes */}
          {activeMode !== "Image" && (composedWork || prompt.trim()) && (
            <div className="mt-4 rounded overflow-hidden" style={{ border: `1px solid ${modeColor}30` }}>
              <button
                onClick={() => setArcOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-2.5 transition-all"
                style={{ background: `${modeColor}0A`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
              >
                <span>EMOTIONAL ARC {arc.length === 0 && prompt.trim() ? "· PREVIEW" : ""}</span>
                <ChevronDown
                  className="w-3.5 h-3.5 transition-transform"
                  style={{ transform: arcOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {arcOpen && (
                <div style={{ background: "var(--ln-panel)" }}>
                  <ArcPanel arc={arc} previewArc={previewArc} modeColor={modeColor} hasContent={!!prompt.trim() || !!composedWork} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile input bar */}
        {RecentDraftsStrip}
        {InputBar}
      </div>
    );
  }

  // ── DESKTOP: Three-panel layout───────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "var(--ln-obsidian)",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.03) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(123,158,166,0.03) 0%, transparent 60%)",
      }}
    >
      {/* Top bar */}
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
        <button
          onClick={() => setCinematic(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-80"
          style={{
            background: "transparent",
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

      {/* Three-panel body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Mode selector */}
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
              const isConductor = m === "Conductor";
              return (
                <div key={m} className="relative group">
                  <button
                    onClick={() => handleModeChange(m)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-left transition-all"
                    style={{
                      background: active ? `${MODE_COLORS[m]}18` : "transparent",
                      border: `1px solid ${active ? MODE_COLORS[m] : isConductor ? `${MODE_COLORS[m]}44` : "transparent"}`,
                      color: active ? MODE_COLORS[m] : "var(--ln-smoke)",
                    }}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.08em" }}>
                          {m.toUpperCase()}
                        </span>
                        {isConductor && (
                          <span
                            className="px-1 rounded"
                            style={{
                              background: `${MODE_COLORS[m]}33`,
                              color: MODE_COLORS[m],
                              fontFamily: "'Space Mono', monospace",
                              fontSize: "0.4rem",
                              letterSpacing: "0.06em",
                            }}
                          >STRUCTURE</span>
                        )}
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", opacity: 0.6, marginTop: 1 }}>
                        {MODE_DESC[m].split(" · ")[0]}
                      </div>
                    </div>
                  </button>
                  {/* Conductor tooltip on hover */}
                  {isConductor && (
                    <div
                      className="absolute left-full top-0 ml-2 z-50 w-48 rounded p-2.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{
                        background: "#0e0b07",
                        border: `1px solid ${MODE_COLORS[m]}44`,
                        boxShadow: `0 4px 16px rgba(0,0,0,0.6)`,
                      }}
                    >
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: MODE_COLORS[m], letterSpacing: "0.08em", marginBottom: 4 }}>CONDUCTOR MODE</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "var(--ln-smoke)", lineHeight: 1.6 }}>
                        Arranges your song into labeled sections with structure, arc, and delivery notes. Best for full compositions.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active mode descriptor */}
          <div className="mt-auto px-4 pb-4">
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

        {/* CENTER: Lyrics editor */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Output area */}
          <div ref={outputRef} className="flex-1 overflow-y-auto p-5">

            {/* ── IMAGE MODE ── */}
            {activeMode === 'Image' && (
              <div className="flex flex-col gap-5 max-w-2xl mx-auto">

                {/* Guide selector */}
                {myGuidesQuery.data && myGuidesQuery.data.length > 0 && (
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: modeColor, letterSpacing: "0.08em", marginBottom: 6 }}>GUIDE CONTEXT (OPTIONAL)</div>
                    <select
                      value={selectedGuideId ?? ""}
                      onChange={e => setSelectedGuideId(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full rounded px-3 py-2 focus:outline-none"
                      style={{
                        background: "var(--ln-obsidian)",
                        border: `1px solid ${modeColor}33`,
                        color: "var(--ln-parchment)",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "var(--compose-sm)",
                      }}
                    >
                      <option value="">No guide — freeform generation</option>
                      {myGuidesQuery.data.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.canonicalName ?? `Guide #${g.id}`}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Multi-reference image upload (desktop) */}
                <div className="rounded p-4" style={{ background: 'var(--ln-panel)', border: `1px solid ${modeColor}30` }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 'var(--compose-xs)', color: modeColor, letterSpacing: '0.08em', marginBottom: 8 }}>REFERENCE IMAGES — MERGE ANCHORS (UP TO 4)</div>
                  <div className="flex flex-wrap gap-3 mb-2">
                    {Array.from({ length: 4 }).map((_, i) => {
                      const ref = referenceImages[i];
                      const isUploading = uploadingRefIndex === i;
                      return (
                        <div key={i} className="relative">
                          {ref ? (
                            <div className="relative">
                              <img src={ref.preview} alt={`Ref ${i + 1}`} className="rounded object-cover" style={{ width: "var(--compose-ref-tile)", height: "var(--compose-ref-tile)", border: `1px solid ${modeColor}66` }} />
                              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 'var(--compose-xs)', color: modeColor, textAlign: 'center', marginTop: 2 }}>REF {i + 1}</div>
                              <button onClick={() => handleRemoveReferenceImage(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: 'var(--ln-obsidian)', border: `1px solid ${modeColor}44`, color: modeColor }}>×</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setPendingRefSlot(i); referenceInputRef.current?.click(); }}
                              disabled={isUploading}
                              className="rounded flex flex-col items-center justify-center gap-1 transition-all hover:opacity-80 disabled:opacity-40"
                              style={{ width: "var(--compose-ref-tile)", height: "var(--compose-ref-tile)", background: `${modeColor}10`, border: `1px dashed ${modeColor}44`, color: modeColor }}
                            >
                              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 'var(--compose-xs)' }}>REF {i + 1}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <input ref={referenceInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadReferenceImage(f, pendingRefSlot); e.target.value = ''; }} />
                  {referenceImages.length > 0 && (
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 'var(--compose-xs)', color: modeColor, opacity: 0.7 }}>
                      {referenceImages.length} ANCHOR{referenceImages.length > 1 ? 'S' : ''} ACTIVE — the model will blend all reference images with your prompt
                    </div>
                  )}
                </div>

                {/* Prompt + generate */}
                <div className="rounded p-4" style={{ background: "var(--ln-panel)", border: `1px solid ${modeColor}30` }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "var(--compose-xs)", color: modeColor, letterSpacing: "0.08em", marginBottom: 8 }}>VISION PROMPT</div>
                  <textarea
                    value={imagePrompt}
                    onChange={e => setImagePrompt(e.target.value)}
                    onKeyDown={handleImageKeyDown}
                    placeholder="Describe the image you want to manifest... (Ctrl+Enter to generate)"
                    rows={4}
                    className="w-full resize-none rounded px-3 py-2.5 focus:outline-none mb-3"
                    style={{
                      background: "var(--ln-obsidian)",
                      border: `1px solid ${modeColor}33`,
                      color: "var(--ln-parchment)",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "var(--compose-md)",
                      lineHeight: 1.7,
                    }}
                    disabled={isGeneratingImage}
                  />
                  <button
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage || !imagePrompt.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded transition-all hover:opacity-80 disabled:opacity-40"
                    style={{
                      background: `${modeColor}22`,
                      border: `1px solid ${modeColor}66`,
                      color: modeColor,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "var(--compose-sm)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {isGeneratingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isGeneratingImage ? "GENERATING..." : "GENERATE IMAGE"}
                  </button>
                </div>

                {/* Session image history */}
                {isGeneratingImage && <ThinkingDots color={modeColor} />}

                {imageHistory.length > 0 && (
                  <div className="space-y-5">
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 'var(--compose-xs)', color: modeColor, letterSpacing: '0.08em' }}>SESSION VISIONS — {imageHistory.length} IMAGE{imageHistory.length !== 1 ? 'S' : ''}</div>
                    {imageHistory.map((img, i) => (
                      <div key={i} className="rounded overflow-hidden" style={{ border: `1px solid ${modeColor}30` }}>
                        <div className="relative">
                          <img src={img.url} alt={img.prompt} className="w-full block" style={{ maxHeight: '480px', objectFit: 'contain', background: '#0a0a0a' }} />
                          {img.isRemix && (
                            <div className="absolute top-3 left-3 px-2 py-0.5 rounded" style={{ background: `${modeColor}dd`, color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', letterSpacing: '0.08em' }}>REMIX</div>
                          )}
                        </div>
                        <div className="p-4" style={{ background: 'var(--ln-panel)' }}>
                          {/* WID badge */}
                          {img.widId && (
                            <div className="mb-3 flex items-center gap-2">
                              <div className="px-2.5 py-1 rounded" style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}55`, fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: modeColor, letterSpacing: '0.06em' }}>
                                {img.widId}
                              </div>
                              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.45rem', color: 'var(--ln-smoke)', opacity: 0.6 }}>AUTO-REGISTERED</div>
                            </div>
                          )}
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: 'var(--ln-parchment)', lineHeight: 1.6, marginBottom: 4 }}>
                            {img.prompt}
                          </div>
                          {img.enrichedPrompt !== img.prompt && (
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: 'var(--ln-smoke)', lineHeight: 1.5, marginBottom: 10, opacity: 0.7 }}>
                              enriched: {img.enrichedPrompt}
                            </div>
                          )}
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.45rem', color: 'var(--ln-smoke)', marginBottom: 10, opacity: 0.5 }}>
                            {new Date(img.generatedAt).toLocaleTimeString()}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => handleDownloadImage(img.url, i)} className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-80" style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.6rem' }}>
                              <Download className="w-3 h-3" /> DOWNLOAD
                            </button>
                            <button onClick={() => handleRemixImage(img)} disabled={isGeneratingImage} className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-80 disabled:opacity-40" style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.6rem' }}>
                              <Sparkles className="w-3 h-3" /> REMIX
                            </button>
                            <button onClick={() => handleRegisterImage(img)} className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all hover:opacity-80" style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.6rem' }}>
                              <FileText className="w-3 h-3" /> REGISTER (WID)
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {imageHistory.length === 0 && !isGeneratingImage && (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 opacity-40">
                    <ImageIcon className="w-12 h-12" style={{ color: modeColor }} />
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "var(--ln-smoke)", textAlign: "center", lineHeight: 1.8 }}>
                      VISION CHAMBER<br />
                      <span style={{ opacity: 0.6 }}>Describe your creative vision above<br />and manifest it as an image.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── COMPOSITION MODES ── */}
            {activeMode !== "Image" && (
              <>
            {!composedWork && !isGenerating && (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
                <Music className="w-10 h-10" style={{ color: modeColor }} />
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "var(--ln-smoke)", textAlign: "center", lineHeight: 1.8 }}>
                  SPEAK TO YOUR KEEPER<br />
                  <span style={{ opacity: 0.6 }}>Describe your song concept, emotional arc,<br />or paste existing lyrics to structure.</span>
                </div>
              </div>
            )}

            {isGenerating && <ThinkingDots color={modeColor} />}

            {composedWork && !isGenerating && (
              <div className="space-y-1">
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
                      <div
                        className="text-xs uppercase tracking-widest mb-2"
                        style={{ color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}
                      >
                        [{s.label}]
                      </div>
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
            </>
            )}
          </div>

          {/* Action buttons - only in composition modes */}
          {activeMode !== "Image" && composedWork && !isGenerating && (
            <div
              className="flex items-center gap-2 px-5 py-3 flex-shrink-0 flex-wrap"
              style={{ borderTop: "1px solid var(--ln-panel-border)", background: "var(--ln-panel)" }}
            >
              <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>
                <Copy className="w-3 h-3" /> COPY
              </button>
              <button onClick={handleEdit} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{ background: isEditing ? `${modeColor}30` : `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>
                <Edit3 className="w-3 h-3" /> {isEditing ? "DONE EDITING" : "EDIT"}
              </button>
              <button onClick={handleSendToPlayer} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>
                <Music className="w-3 h-3" /> SEND TO PLAYER
              </button>
              <button onClick={handleRegister} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>
                <FileText className="w-3 h-3" /> REGISTER (WID)
              </button>
              <button onClick={handleSaveNote} disabled={saveNoteMutation.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
                style={{ background: `${modeColor}18`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>
                <BookOpen className="w-3 h-3" /> SAVE NOTE
              </button>
            </div>
          )}

          {/* Desktop input bar - only in composition modes */}
          {activeMode !== "Image" && RecentDraftsStrip}
          {activeMode !== "Image" && InputBar}
        </div>

        {/* RIGHT: Emotional Arc (composition modes) or Quiver (Image mode) */}
        {activeMode !== "Image" && (
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
            <ArcPanel arc={arc} previewArc={previewArc} modeColor={modeColor} hasContent={!!prompt.trim() || !!composedWork} />
          </div>
        )}

        {/* RIGHT: Quiver — persistent vault column in Image mode */}
        {activeMode === "Image" && (
          <div
            className="w-72 flex-shrink-0 flex flex-col border-l overflow-hidden"
            style={{ borderColor: `${modeColor}30`, background: "var(--ln-panel)" }}
          >
            {/* Quiver header */}
            <div
              className="px-3 pt-3 pb-2 flex-shrink-0 flex items-center justify-between"
              style={{ borderBottom: `1px solid ${modeColor}22` }}
            >
              <div className="flex items-center gap-2">
                <ImageIcon className="w-3 h-3" style={{ color: modeColor }} />
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: modeColor, letterSpacing: "0.08em" }}>QUIVER</span>
                {quiverQuery.data && (
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: modeColor, opacity: 0.6 }}>
                    {quiverQuery.data.length}{quiverQuery.data.length === 20 ? '+' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2 flex-shrink-0" style={{ borderBottom: `1px solid ${modeColor}18` }}>
              <input
                type="text"
                placeholder="Search prompt or WID..."
                value={quiverSearch}
                onChange={e => { setQuiverSearch(e.target.value); setQuiverPage(0); }}
                className="w-full rounded px-2.5 py-1.5 focus:outline-none"
                style={{ background: 'var(--ln-obsidian)', border: `1px solid ${modeColor}33`, color: 'var(--ln-parchment)', fontFamily: "'Space Mono', monospace", fontSize: '0.55rem' }}
              />
            </div>

            {/* Scrollable image list with day grouping */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {quiverQuery.isLoading && (
                <div className="flex items-center justify-center py-8" style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: modeColor, opacity: 0.6 }}>LOADING VAULT...</div>
              )}
              {quiverQuery.data && quiverQuery.data.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 opacity-40">
                  <ImageIcon className="w-8 h-8" style={{ color: modeColor }} />
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: 'var(--ln-smoke)', textAlign: 'center', lineHeight: 1.7 }}>
                    QUIVER EMPTY<br />
                    <span style={{ opacity: 0.6 }}>Generate an image to begin.</span>
                  </div>
                </div>
              )}
              {quiverQuery.data && quiverQuery.data.length > 0 && (() => {
                // Group images by day using date-fns
                type QuiverItem = typeof quiverQuery.data[0];
                const groups: { label: string; items: QuiverItem[] }[] = [];
                let currentLabel = '';
                for (const qi of quiverQuery.data) {
                  const d = new Date(qi.createdAt);
                  const label = isToday(d) ? 'TODAY' : isYesterday(d) ? 'YESTERDAY' : format(d, 'MMM d').toUpperCase();
                  if (label !== currentLabel) {
                    groups.push({ label, items: [] });
                    currentLabel = label;
                  }
                  groups[groups.length - 1].items.push(qi);
                }
                return (
                  <div className="space-y-3">
                    {groups.map(group => (
                      <div key={group.label}>
                        {/* Day header */}
                        <div
                          className="px-1 py-1 mb-1.5"
                          style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.45rem', color: modeColor, letterSpacing: '0.12em', opacity: 0.7, borderBottom: `1px solid ${modeColor}18` }}
                        >
                          {group.label}
                        </div>
                        {/* 2-column grid for this day */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {group.items.map((qi: any) => (
                            <div key={qi.id} className="rounded overflow-hidden relative group/qi" style={{ border: `1px solid ${modeColor}20` }}>
                              <img src={qi.url} alt={qi.prompt} className="w-full block" style={{ height: '80px', objectFit: 'cover' }} />
                              {qi.isRemix && <div className="absolute top-1 left-1 px-1 rounded" style={{ background: `${modeColor}dd`, color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '0.38rem' }}>RMX</div>}
                              {qi.widId && <div className="absolute top-1 right-1 px-1 rounded" style={{ background: 'rgba(0,0,0,0.8)', color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.38rem' }}>WID</div>}
                              <div className="p-1.5" style={{ background: 'var(--ln-obsidian)' }}>
                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.42rem', color: 'var(--ln-smoke)', lineHeight: 1.4 }} className="line-clamp-2">{qi.title || qi.prompt}</div>
                                <div className="flex gap-0.5 mt-1.5">
                                  <button
                                    onClick={() => handleDownloadImage(qi.url, qi.id)}
                                    title="Download with WID provenance"
                                    className="flex-1 py-0.5 rounded text-center transition-all hover:opacity-80"
                                    style={{ background: `${modeColor}18`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.38rem', border: `1px solid ${modeColor}30` }}
                                  >DL</button>
                                  <button
                                    onClick={() => handleRemixImage({ url: qi.url, prompt: qi.prompt, enrichedPrompt: qi.enrichedPrompt, generatedAt: new Date(qi.createdAt).toISOString(), guideId: qi.guideId, widId: qi.widId, isRemix: qi.isRemix })}
                                    disabled={isGeneratingImage}
                                    title="Remix this image"
                                    className="flex-1 py-0.5 rounded text-center transition-all hover:opacity-80 disabled:opacity-40"
                                    style={{ background: `${modeColor}18`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: '0.38rem', border: `1px solid ${modeColor}30` }}
                                  >RMX</button>
                                  <button
                                    onClick={() => { quiverDeleteMutation.mutate({ id: qi.id }, { onSuccess: () => quiverUtils.quiver.list.invalidate() }); }}
                                    title="Remove from quiver"
                                    className="flex-1 py-0.5 rounded text-center transition-all hover:opacity-80"
                                    style={{ background: '#dc262618', color: '#dc2626', fontFamily: "'Space Mono', monospace", fontSize: '0.38rem', border: '1px solid #dc262630' }}
                                  >DEL</button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Pagination */}
              {quiverQuery.data && quiverQuery.data.length === 20 && (
                <div className="flex gap-3 justify-center pt-3 pb-1">
                  {quiverPage > 0 && (
                    <button onClick={() => setQuiverPage(p => p - 1)} style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: modeColor }}>← PREV</button>
                  )}
                  <button onClick={() => setQuiverPage(p => p + 1)} style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.5rem', color: modeColor }}>NEXT →</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
