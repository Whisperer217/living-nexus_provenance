import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { X, Minimize2, ChevronUp, Music2, Sword, PenLine, Bold, Italic, Highlighter, ImagePlus, Trash2, Wand2, ClipboardCopy, Loader2, Mic, MicOff, Palette, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Skin image URLs ──────────────────────────────────────────────────────────

export const SKIN_IMAGES: Record<string, string> = {
  "hooded-scholar": "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-hooded-scholar_67e69960.png",
  "conductor":      "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-conductor_4e479e6b.png",
  "witness":        "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-witness_f31f36b2.png",
  "archivist":      "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-archivist_07d235d9.png",
  "cipher":         "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-cipher_c8ee6e38.png",
  "upload-slot":    "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-upload-slot_ab8bd82e.png",
};

// ─── Persona colours & capability labels ─────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
  Guide:     "#C9A84C",
  Conductor: "#7B9EA6",
  Witness:   "#B8956A",
  Custodian: "#7BA67B",
  Archivist: "#8B7355",
  Critic:    "#A67B7B",
};

const PERSONA_CAPABILITY: Record<string, string> = {
  Guide:     "Direction · Inspiration · Voice",
  Conductor: "Structure · Arrangement · Flow",
  Witness:   "Testimony · Emotional Truth · Depth",
  Custodian: "Archive · Provenance · Legacy",
  Archivist: "Semantics · Pattern · Corpus",
  Critic:    "Feedback · Refinement · Clarity",
};

const PERSONA_ID: Record<string, string> = {
  Guide: "guide", Conductor: "conductor", Witness: "witness",
  Custodian: "custodian", Archivist: "archivist", Critic: "guide",
};

// ─── Now Playing hook (Media Session API) ────────────────────────────────────

export interface NowPlaying {
  title: string;
  artist: string;
  artwork?: string;
}

function useNowPlaying(): NowPlaying | null {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);

  useEffect(() => {
    const check = () => {
      const meta = navigator.mediaSession?.metadata;
      if (meta?.title) {
        setNowPlaying({
          title: meta.title,
          artist: meta.artist || "Unknown Artist",
          artwork: meta.artwork?.[0]?.src,
        });
      } else {
        setNowPlaying(null);
      }
    };

    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, []);

  return nowPlaying;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ArchiveEntry {
  id: number;
  title: string;
  messages: { id: string; role: string; content: string; timestamp: number }[];
  createdAt: number;
}
interface FloatingAvatarProps {
  activeSkinId?: string;
  customImageUrl?: string | null;
  agentMode?: string;
  agentMessages?: { id: string; role: string; content: string; mode: string; timestamp?: number }[];
  onAskAgent?: (text: string, imageUrls?: string[]) => void;
  onModeChange?: (mode: string) => void;
  onSaveNote?: (content: string, imageUrl?: string) => void;
  cinematicMode?: boolean;
  onCinematicToggle?: () => void;
  userName?: string;
  isThinking?: boolean;
  isSavingNote?: boolean;
  // Per-message controls
  onEditMessage?: (id: string, newContent: string) => void;
  onDeleteMessage?: (id: string) => void;
  onCopyMessage?: (content: string) => void;
  // Thread controls
  onClearAll?: () => void;
  onCopyAll?: () => void;
  onSaveArchive?: () => void;
  onChatRefresh?: () => void;
  isSavingArchive?: boolean;
  // Archive
  archives?: ArchiveEntry[];
  onLoadArchive?: (messages: { id: string; role: string; content: string; timestamp: number }[]) => void;
  onDeleteArchive?: (id: number) => void;
  // Profile gate
  profileGatePassed?: boolean;
  profileGateMissing?: string[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FloatingAvatar({
  activeSkinId = "hooded-scholar",
  customImageUrl,
  agentMode = "Guide",
  agentMessages = [],
  onAskAgent,
  onModeChange,
  onSaveNote,
  cinematicMode = false,
  onCinematicToggle,
  userName,
  isThinking = false,
  isSavingNote = false,
  onEditMessage,
  onDeleteMessage,
  onCopyMessage,
  onClearAll,
  onCopyAll,
  onSaveArchive,
  onChatRefresh,
  isSavingArchive = false,
  archives = [],
  onLoadArchive,
  onDeleteArchive,
  profileGatePassed = true,
  profileGateMissing = [],
}: FloatingAvatarProps) {
  const [noteSaved, setNoteSaved] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxTab, setSandboxTab] = useState<"write" | "ppg">("write");
  const [sandboxText, setSandboxText] = useState("");
  const [sandboxImages, setSandboxImages] = useState<string[]>([]);
  const [sandboxUploading, setSandboxUploading] = useState(false);
  const sandboxFileRef = useRef<HTMLInputElement>(null);
  const sandboxTextRef = useRef<HTMLTextAreaElement>(null);
  // PPG state
  const [ppgType, setPpgType] = useState<"style_prompt" | "lyric_brief" | "composer_blueprint" | "visual_direction" | "press_bio">("style_prompt");
  const [ppgPlatform, setPpgPlatform] = useState<"suno" | "udio" | "general">("suno");
  const [ppgBlocks, setPpgBlocks] = useState([{ label: "", content: "" }]);
  const [ppgResult, setPpgResult] = useState<{ expressionPrompt?: string; expressionStyleTags?: string; expressionComposerNote?: string; expressionId?: string } | null>(null);
  const generatePpgMutation = trpc.promptStudio.generateStylePrompt.useMutation({
    onSuccess: (data) => setPpgResult(data as typeof ppgResult),
  });
  // ─── Mic / transcription state ───────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcribeVoiceMutation = trpc.keeper.transcribeVoice.useMutation({
    onSuccess: (data) => {
      if (data.text) setSandboxText(prev => prev ? prev + '\n' + data.text : data.text);
      setIsTranscribing(false);
    },
    onError: () => setIsTranscribing(false),
  });
  // ─── Artwork generation state ─────────────────────────────────────────────────
  const [generatedArtUrl, setGeneratedArtUrl] = useState<string | null>(null);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const generateArtworkMutation = trpc.keeper.generateArtwork.useMutation({
    onSuccess: (data) => { setGeneratedArtUrl(data.url); setIsGeneratingArt(false); },
    onError: () => setIsGeneratingArt(false),
  });
  // ─── Image analysis state ─────────────────────────────────────────────────────
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const analyzeImageMutation = trpc.keeper.analyzeImage.useMutation({
    onSuccess: (data) => {
      onAskAgent?.(`[KEEPER VISION] ${data.analysis}`);
      setSandboxOpen(false);
      setIsAnalyzingImage(false);
    },
    onError: () => setIsAnalyzingImage(false),
  });
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem("ln_avatar_pos");
      return saved ? JSON.parse(saved) : { x: 0, y: 0 };
    } catch { return { x: 0, y: 0 }; }
  });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nowPlaying = useNowPlaying();
  const prevNowPlaying = useRef<NowPlaying | null>(null);

  const skinImg = activeSkinId === "custom" && customImageUrl
    ? customImageUrl
    : SKIN_IMAGES[activeSkinId] ?? SKIN_IMAGES["hooded-scholar"];

  const modeColor = MODE_COLORS[agentMode] ?? "#C9A84C";

  // Auto-scroll messages
  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [agentMessages, expanded]);

  // ─── Drag handlers (mouse + touch) ──────────────────────────────────────────

  // Desktop drag — 200ms hold initiates drag, short click still opens panel
  const mouseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseDragStarted = useRef(false);
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // left button only
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const ox = position.x;
    const oy = position.y;
    mouseDragStarted.current = false;
    mouseTimer.current = setTimeout(() => {
      mouseDragStarted.current = true;
      setDragging(true);
      dragStart.current = { mx: startX, my: startY, ox, oy };
    }, 200);
  }, [position]);
  const onMouseUp = useCallback(() => {
    if (mouseTimer.current) { clearTimeout(mouseTimer.current); mouseTimer.current = null; }
    if (!mouseDragStarted.current && !expanded) {
      // Short click — open panel
      setExpanded(true);
    }
    mouseDragStarted.current = false;
    setDragging(false);
  }, [expanded]);

  // Touch drag — long-press (280ms) initiates drag so quick taps still open the panel
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const ox = position.x;
    const oy = position.y;
    touchTimer.current = setTimeout(() => {
      setDragging(true);
      dragStart.current = { mx: t.clientX, my: t.clientY, ox, oy };
    }, 280);
  }, [position]);
  const onTouchEndOrCancel = useCallback(() => {
    if (touchTimer.current) { clearTimeout(touchTimer.current); touchTimer.current = null; }
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const savePos = (newPos: { x: number; y: number }) => {
      setPosition(newPos);
      try { localStorage.setItem("ln_avatar_pos", JSON.stringify(newPos)); } catch {}
    };
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      savePos({ x: Math.max(8, dragStart.current.ox - dx), y: Math.max(0, dragStart.current.oy - dy) });
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragStart.current) return;
      e.preventDefault();
      const t = e.touches[0];
      const dx = t.clientX - dragStart.current.mx;
      const dy = t.clientY - dragStart.current.my;
      savePos({ x: Math.max(8, dragStart.current.ox - dx), y: Math.max(0, dragStart.current.oy - dy) });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    window.addEventListener("touchcancel", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
      window.removeEventListener("touchcancel", onUp);
    };
  }, [dragging]);

  // ─── Sandbox helpers ────────────────────────────────────────────────────────

  const applyFormat = (tag: string) => {
    const ta = sandboxTextRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const sel = sandboxText.slice(start, end);
    if (!sel) return;
    const wrapped = tag === "highlight"
      ? `==${sel}==`
      : tag === "bold"
        ? `**${sel}**`
        : `_${sel}_`;
    setSandboxText(sandboxText.slice(0, start) + wrapped + sandboxText.slice(end));
  };

  const handleSandboxImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    setSandboxUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", "image");
      const res = await fetch("/api/upload-file", { method: "POST", body: form });
      const json = await res.json();
      if (json.url) setSandboxImages(prev => [...prev, json.url]);
    } catch {}
    setSandboxUploading(false);
    if (sandboxFileRef.current) sandboxFileRef.current.value = "";
  };

  const sendSandboxToKeeper = async () => {
    if (!sandboxText.trim() && sandboxImages.length === 0) return;
    // Pass images directly to the chat procedure — the router now handles multimodal natively
    onAskAgent?.(sandboxText.trim(), sandboxImages.length > 0 ? sandboxImages : undefined);
    setSandboxText("");
    setSandboxImages([]);
    setSandboxOpen(false);
  };

  const handleSaveNote = async () => {
    if (!sandboxText.trim()) return;
    const firstImage = sandboxImages[0];
    await onSaveNote?.(sandboxText.trim(), firstImage);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  // ─── Mic recording helpers ───────────────────────────────────────────────────
  // recordedBlobRef holds the last recorded blob so the user can choose to
  // transcribe it or discard it after stopping.
  const recordedBlobRef = useRef<{ blob: Blob; mimeType: string } | null>(null);
  const [hasRecording, setHasRecording] = useState(false);

  const startRecording = async () => {
    if (isRecording) return;
    recordedBlobRef.current = null;
    setHasRecording(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 0 && blob.size <= 16 * 1024 * 1024) {
          recordedBlobRef.current = { blob, mimeType };
          setHasRecording(true);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied', err);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    // hasRecording will be set true by recorder.onstop
  };

  const transcribeRecording = () => {
    const rec = recordedBlobRef.current;
    if (!rec) return;
    setIsTranscribing(true);
    setHasRecording(false);
    recordedBlobRef.current = null;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      transcribeVoiceMutation.mutate({ audioBase64: base64, mimeType: rec.mimeType as 'audio/webm' | 'audio/mp4' });
    };
    reader.readAsDataURL(rec.blob);
  };

  const discardRecording = () => {
    recordedBlobRef.current = null;
    setHasRecording(false);
  };

  // ─── Now Playing → agent thread notification ─────────────────────────────────
  useEffect(() => {
    if (!nowPlaying) { prevNowPlaying.current = null; return; }
    const prev = prevNowPlaying.current;
    if (!prev || prev.title !== nowPlaying.title) {
      // Inject a system message into the agent thread via a custom event
      window.dispatchEvent(new CustomEvent("ln:nowplaying", { detail: nowPlaying }));
      prevNowPlaying.current = nowPlaying;
    }
  }, [nowPlaying]);

  // Desktop PlayerBar: 68px at zIndex 9001. Orb bottom = 68+24 = 92px.
  // Mobile: nav (56px) + mini player (64px) = 120px stack at zIndex 9001. Orb bottom = 120+24 = 144px.
  // Use CSS clamp via a responsive style: on md+ use 92px, on <md use 144px.
  // We achieve this with a CSS custom property set via a style tag.
  const orbBottom = `max(92px, calc(${24 + position.y}px + env(safe-area-inset-bottom, 0px)))`;
  const orbRight = `${24 + position.x}px`;
  const ORB_Z = 9050;

  // ─── Cinematic orb (collapsed, small) ───────────────────────────────────────

  if (cinematicMode && !expanded) {
    return (
      <div
        className="fixed"
        style={{
          bottom: orbBottom,
          right: orbRight,
          zIndex: ORB_Z,
          transition: "opacity 0.6s ease",
        }}
      >
        {/* Exit cinematic button */}
        {onCinematicToggle && (
          <button
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "var(--ln-panel)", border: "1px solid var(--ln-panel-border)", zIndex: 10 }}
            onClick={onCinematicToggle}
            title="Exit Cinematic Mode"
          >
            <X style={{ width: 8, height: 8, color: "var(--ln-smoke)" }} />
          </button>
        )}
        <div
          className="cursor-pointer"
          onClick={() => setExpanded(true)}
          title="Open Keeper"
        >
        {/* Tiny ember orb */}
        <div
          className="relative w-10 h-10 rounded-full overflow-hidden"
          style={{
            boxShadow: `0 0 12px 3px ${modeColor}55`,
            border: `1px solid ${modeColor}44`,
          }}
        >
          <img src={skinImg} alt="Keeper" className="w-full h-full object-cover object-top" style={{ filter: "brightness(0.5)" }} />
          {/* Glowing eye effect */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "radial-gradient(circle at 50% 40%, transparent 30%, rgba(0,0,0,0.7) 100%)" }}
          />
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              width: 6, height: 6,
              top: "38%", left: "50%", transform: "translateX(-50%)",
              background: modeColor,
              boxShadow: `0 0 6px 2px ${modeColor}`,
            }}
          />
        </div>
        </div>
      </div>
    );
  }

  // ─── Normal orb (collapsed) ──────────────────────────────────────────────────

  if (!expanded) {
    return (
      <div
        className="fixed"
        style={{
          bottom: orbBottom,
          right: orbRight,
          zIndex: ORB_Z,
          userSelect: "none",
        }}
      >
        {/* Drag handle ring — hold-to-drag on both mouse and touch (200ms threshold) */}
        <div
          className="absolute inset-0 rounded-full cursor-grab"
          style={{ zIndex: 3 }}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onTouchStart={(e) => {
            // Record touch start position to distinguish tap vs drag
            const t = e.touches[0];
            const startX = t.clientX;
            const startY = t.clientY;
            const ox = position.x;
            const oy = position.y;

            touchTimer.current = setTimeout(() => {
              setDragging(true);
              dragStart.current = { mx: startX, my: startY, ox, oy };
            }, 200);
            // Store start position for tap detection
            (e.currentTarget as HTMLDivElement).dataset.touchStartX = String(startX);
            (e.currentTarget as HTMLDivElement).dataset.touchStartY = String(startY);
          }}
          onTouchEnd={(e) => {
            if (touchTimer.current) { clearTimeout(touchTimer.current); touchTimer.current = null; }
            if (!dragging) {
              // It was a tap — open the panel
              setExpanded(true);
            }
            setDragging(false);
          }}
          onTouchCancel={onTouchEndOrCancel}
        />

        {/* Orb */}
        <div
          className="relative w-16 h-16 rounded-full overflow-hidden cursor-pointer"
          style={{
            boxShadow: `0 0 0 2px ${modeColor}, 0 0 20px 4px ${modeColor}44, 0 4px 24px rgba(0,0,0,0.6)`,
            border: `2px solid ${modeColor}`,
            zIndex: 2,
          }}
          onClick={() => setExpanded(true)}
          title="Open Keeper"
        >
          <img src={skinImg} alt="Keeper" className="w-full h-full object-cover object-top" />
          {/* Mode ring pulse */}
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{ boxShadow: `inset 0 0 12px 2px ${modeColor}33` }}
          />
        </div>

        {/* Mode label */}
        <div
          className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.55rem",
            color: modeColor,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {agentMode}
        </div>

        {/* Keeper button */}
        <button
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: "var(--ln-panel)", border: `1px solid var(--ln-panel-border)`, zIndex: 3 }}
          onClick={(e) => { e.stopPropagation(); navigate("/keeper"); }}
          title="Open Keeper Screen"
        >
          <Sword style={{ width: 10, height: 10, color: "var(--ln-gold)" }} />
        </button>

        {/* Cinematic toggle */}
        {onCinematicToggle && (
          <button
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "var(--ln-panel)", border: `1px solid var(--ln-panel-border)`, zIndex: 3 }}
            onClick={(e) => { e.stopPropagation(); onCinematicToggle(); }}
            title="Toggle Cinematic Mode"
          >
            <ChevronUp style={{ width: 10, height: 10, color: "var(--ln-smoke)" }} />
          </button>
        )}
      </div>
    );
  }

  // ─── Expanded panel ──────────────────────────────────────────────────────────

  // On mobile (<640px) use near-full-screen overlay; on desktop use 320x480 anchored panel
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  return (
    <div
      className="fixed flex flex-col overflow-hidden"
      style={{
        // Mobile: full-screen overlay from bottom, ignoring drag position
        ...(isMobile ? {
          bottom: 0,
          left: 0,
          right: 0,
          top: "auto",
          height: "80vh",
          borderRadius: "16px 16px 0 0",
          zIndex: ORB_Z,
        } : {
          bottom: orbBottom,
          right: orbRight,
          width: 320,
          height: 480,
          borderRadius: 8,
          zIndex: ORB_Z,
        }),
        background: "var(--ln-panel)",
        border: `1px solid ${modeColor}66`,
        boxShadow: `0 0 0 1px ${modeColor}22, 0 8px 40px rgba(0,0,0,0.7)`,
        userSelect: "none",
      }}
    >
      {/* Header — drag zone (mouse + touch) */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0 cursor-grab"
        style={{
          background: `linear-gradient(135deg, var(--ln-obsidian) 0%, ${modeColor}11 100%)`,
          borderBottom: `1px solid ${modeColor}33`,
        }}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEndOrCancel}
        onTouchCancel={onTouchEndOrCancel}
      >
        {/* Portrait thumbnail */}
        <div
          className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: `1.5px solid ${modeColor}`, boxShadow: `0 0 8px ${modeColor}55` }}
        >
          <img src={skinImg} alt="Keeper" className="w-full h-full object-cover object-top" />
        </div>

        <div className="flex-1 min-w-0">
          <div
            className="text-xs font-semibold uppercase tracking-wider truncate"
            style={{ color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}
          >
            Personal Nexus Avatar
          </div>
          {userName && (
            <div className="text-xs truncate" style={{ color: "var(--ln-smoke)", fontSize: "0.65rem" }}>
              {userName}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Sandbox toggle */}
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
            style={{ color: sandboxOpen ? modeColor : "var(--ln-smoke)", background: sandboxOpen ? `${modeColor}22` : "transparent" }}
            onClick={() => setSandboxOpen(v => !v)}
            title={sandboxOpen ? "Close Sandbox" : "Open Creative Sandbox"}
          >
            <PenLine style={{ width: 12, height: 12 }} />
          </button>
          {onCinematicToggle && (
            <button
              className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
              style={{ color: "var(--ln-smoke)" }}
              onClick={onCinematicToggle}
              title="Cinematic Mode"
            >
              <ChevronUp style={{ width: 12, height: 12 }} />
            </button>
          )}
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
            style={{ color: "var(--ln-smoke)" }}
            onClick={() => navigate("/keeper")}
            title="Keeper Screen"
          >
            <Sword style={{ width: 12, height: 12 }} />
          </button>
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
            style={{ color: "var(--ln-smoke)" }}
            onClick={() => setExpanded(false)}
          >
            <Minimize2 style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      {/* Now Playing strip */}
      {nowPlaying && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0"
          style={{
            background: "var(--ln-obsidian)",
            borderBottom: `1px solid var(--ln-panel-border)`,
          }}
        >
          <Music2 style={{ width: 10, height: 10, color: modeColor, flexShrink: 0 }} />
          {nowPlaying.artwork && (
            <img src={nowPlaying.artwork} alt="" className="w-5 h-5 rounded object-cover flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div
              className="truncate"
              style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: modeColor }}
            >
              {nowPlaying.title}
            </div>
            <div className="truncate" style={{ fontSize: "0.55rem", color: "var(--ln-smoke)" }}>
              {nowPlaying.artist}
            </div>
          </div>
        </div>
      )}

      {/* ── SANDBOX VIEW ─────────────────────────────────────────────────────── */}
      {sandboxOpen ? (
        <>
          {/* Sandbox tab bar */}
          <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid var(--ln-panel-border)` }}>
            {(["write", "ppg"] as const).map(t => (
              <button key={t} onClick={() => setSandboxTab(t)}
                className="flex-1 py-1.5 text-center transition-colors"
                style={{
                  fontFamily: "'Space Mono', monospace", fontSize: "0.55rem",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: sandboxTab === t ? modeColor : "var(--ln-smoke)",
                  borderBottom: sandboxTab === t ? `2px solid ${modeColor}` : "2px solid transparent",
                  background: "transparent",
                }}>
                {t === "write" ? "✍ Write" : "⬡ PPG"}
              </button>
            ))}
          </div>

          {/* Sandbox body */}
          <div className="flex-1 overflow-y-auto flex flex-col" style={{ minHeight: 0 }}>

            {/* ── WRITE TAB ── */}
            {sandboxTab === "write" && (
              <div className="flex flex-col flex-1 p-3 gap-2">
                {/* Formatting toolbar */}
                <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
                  {[{ icon: Bold, tag: "bold", title: "Bold" }, { icon: Italic, tag: "italic", title: "Italic" }, { icon: Highlighter, tag: "highlight", title: "Highlight" }].map(({ icon: Icon, tag, title }) => (
                    <button key={tag} onClick={() => applyFormat(tag)} title={title}
                      className="w-6 h-6 flex items-center justify-center rounded hover:opacity-80 transition-opacity"
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid var(--ln-panel-border)`, color: "var(--ln-smoke)" }}>
                      <Icon style={{ width: 10, height: 10 }} />
                    </button>
                  ))}
                  {/* Mic button — click to START recording */}
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing || hasRecording}
                    title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing…" : "Record voice"}
                    className="w-6 h-6 flex items-center justify-center rounded hover:opacity-80 transition-all"
                    style={{
                      background: isRecording ? "rgba(251,113,133,0.25)" : isTranscribing ? "rgba(196,154,40,0.2)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isRecording ? "rgba(251,113,133,0.6)" : isTranscribing ? "rgba(196,154,40,0.4)" : "var(--ln-panel-border)"}`,
                      color: isRecording ? "rgba(251,113,133,0.9)" : isTranscribing ? "var(--ln-gold)" : "var(--ln-smoke)",
                      boxShadow: isRecording ? "0 0 8px rgba(251,113,133,0.4)" : "none",
                    }}>
                    {isTranscribing
                      ? <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" />
                      : isRecording
                        ? <MicOff style={{ width: 10, height: 10 }} />
                        : <Mic style={{ width: 10, height: 10 }} />}
                  </button>
                  <div className="flex-1" />
                  {/* Image attach */}
                  <input ref={sandboxFileRef} type="file" accept="image/*" className="hidden" onChange={handleSandboxImageUpload} />
                  <button onClick={() => sandboxFileRef.current?.click()} disabled={sandboxUploading} title="Attach Image"
                    className="w-6 h-6 flex items-center justify-center rounded hover:opacity-80 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.05)", border: `1px solid var(--ln-panel-border)`, color: "var(--ln-smoke)" }}>
                    {sandboxUploading ? <Loader2 style={{ width: 10, height: 10 }} className="animate-spin" /> : <ImagePlus style={{ width: 10, height: 10 }} />}
                  </button>
                  {sandboxText || sandboxImages.length > 0 ? (
                    <button onClick={() => { setSandboxText(""); setSandboxImages([]); }} title="Clear"
                      className="w-6 h-6 flex items-center justify-center rounded hover:opacity-80 transition-opacity"
                      style={{ background: "rgba(255,255,255,0.05)", border: `1px solid var(--ln-panel-border)`, color: "rgba(251,113,133,0.7)" }}>
                      <Trash2 style={{ width: 10, height: 10 }} />
                    </button>
                  ) : null}
                </div>
                {/* Recording action bar */}
                {isRecording && (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded"
                    style={{ background: "rgba(251,113,133,0.1)", border: "1px solid rgba(251,113,133,0.3)" }}>
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
                    <span className="text-[10px] font-mono flex-1" style={{ color: "rgba(251,113,133,0.9)" }}>Recording…</span>
                    <button onClick={stopRecording}
                      className="px-2 py-0.5 rounded text-[9px] font-mono font-semibold transition-all hover:opacity-80"
                      style={{ background: "rgba(251,113,133,0.25)", border: "1px solid rgba(251,113,133,0.5)", color: "rgba(251,113,133,0.95)" }}>
                      ■ STOP
                    </button>
                  </div>
                )}
                {hasRecording && !isRecording && (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded"
                    style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.3)" }}>
                    <span className="text-[10px] font-mono flex-1" style={{ color: "var(--ln-gold)" }}>✓ Recording ready</span>
                    <button onClick={transcribeRecording}
                      className="px-2 py-0.5 rounded text-[9px] font-mono font-semibold transition-all hover:opacity-80"
                      style={{ background: "rgba(196,154,40,0.2)", border: "1px solid rgba(196,154,40,0.5)", color: "var(--ln-gold)" }}>
                      TRANSCRIBE
                    </button>
                    <button onClick={discardRecording}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono transition-all hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--ln-panel-border)", color: "rgba(251,113,133,0.7)" }}>
                      ×
                    </button>
                  </div>
                )}
                {isTranscribing && (
                  <div className="flex items-center gap-2 px-2 py-1 rounded text-[10px] font-mono"
                    style={{ background: "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
                    <Loader2 className="w-3 h-3 animate-spin" /> Transcribing your voice…
                  </div>
                )}

                {/* Text area */}
                <textarea
                  ref={sandboxTextRef}
                  value={sandboxText}
                  onChange={e => setSandboxText(e.target.value)}
                  placeholder="Write lyrics, notes, ideas, or anything your Keeper can help with…"
                  className="flex-1 resize-none outline-none w-full"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid var(--ln-panel-border)`,
                    borderRadius: 6,
                    padding: "8px 10px",
                    fontSize: "0.75rem",
                    lineHeight: 1.6,
                    color: "var(--ln-parchment)",
                    fontFamily: "'EB Garamond', serif",
                    minHeight: 120,
                  }}
                />

                {/* Attached images */}
                {sandboxImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {sandboxImages.map((url, i) => (
                      <div key={i} className="relative flex-shrink-0 group"
                        style={{ width: 48, height: 48 }}>
                        <div className="w-full h-full rounded overflow-hidden"
                          style={{ border: `1px solid var(--ln-panel-border)` }}>
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                        {/* Analyze with Keeper button */}
                        <button
                          onClick={() => {
                            setIsAnalyzingImage(true);
                            analyzeImageMutation.mutate({ imageUrl: url, context: sandboxText || undefined });
                          }}
                          disabled={isAnalyzingImage}
                          title="Keeper: Analyze this image"
                          className="absolute bottom-0 left-0 right-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(0,0,0,0.75)", height: 18, borderRadius: "0 0 4px 4px", color: "var(--ln-gold)", fontSize: 8 }}>
                          {isAnalyzingImage ? <Loader2 style={{ width: 8, height: 8 }} className="animate-spin" /> : <><Eye style={{ width: 8, height: 8 }} /> <span className="ml-0.5">Analyze</span></>}
                        </button>
                        <button onClick={() => setSandboxImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center"
                          style={{ background: "rgba(0,0,0,0.7)", color: "rgba(251,113,133,0.9)", fontSize: 9, borderRadius: "0 4px 0 4px" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons row */}
                <div className="flex gap-2">
                  {/* Save Note */}
                  {onSaveNote && (
                    <button onClick={handleSaveNote}
                      disabled={!sandboxText.trim() || isSavingNote}
                      className="flex-shrink-0 py-2 px-3 rounded text-xs font-semibold transition-all disabled:opacity-40"
                      style={{
                        background: noteSaved ? "rgba(123,166,123,0.25)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${noteSaved ? "rgba(123,166,123,0.6)" : "var(--ln-panel-border)"}`,
                        color: noteSaved ? "#7BA67B" : "var(--ln-smoke)",
                        fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}>
                      {noteSaved ? "✓ SAVED" : isSavingNote ? "⋯" : "⇩ SAVE NOTE"}
                    </button>
                  )}
                  {/* Send to Keeper */}
                  <button onClick={sendSandboxToKeeper}
                    disabled={!sandboxText.trim() && sandboxImages.length === 0}
                    className="flex-1 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                    style={{
                      background: `${modeColor}22`, border: `1px solid ${modeColor}44`,
                      color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.08em",
                    }}>
                    SEND TO KEEPER →
                  </button>
                </div>
              </div>
            )}

            {/* ── PPG TAB ── */}
            {sandboxTab === "ppg" && (
              <div className="flex flex-col p-3 gap-3 overflow-y-auto">
                {/* Prompt type */}
                <div>
                  <div className="text-[10px] font-mono tracking-widest mb-1" style={{ color: "var(--ln-gold)" }}>PROMPT TYPE</div>
                  <select value={ppgType} onChange={e => { setPpgType(e.target.value as typeof ppgType); setPpgResult(null); }}
                    className="w-full rounded px-2 py-1.5 text-xs appearance-none cursor-pointer outline-none"
                    style={{ background: `${modeColor}11`, border: `1px solid ${modeColor}33`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>
                    <option value="style_prompt">🎵 Style Prompt</option>
                    <option value="lyric_brief">✍️ Lyric Brief</option>
                    <option value="composer_blueprint">🎛️ Composer Blueprint</option>
                    <option value="visual_direction">🎨 Visual Direction</option>
                    <option value="press_bio">📰 Press Bio</option>
                  </select>
                </div>

                {/* Platform */}
                <div className="flex gap-1.5">
                  {(["suno", "udio", "general"] as const).map(p => (
                    <button key={p} onClick={() => setPpgPlatform(p)}
                      className="flex-1 py-1 rounded text-center text-xs font-mono transition-all"
                      style={ppgPlatform === p
                        ? { background: `${modeColor}22`, border: `1px solid ${modeColor}55`, color: modeColor, fontSize: "0.55rem" }
                        : { background: "transparent", border: `1px solid var(--ln-panel-border)`, color: "var(--ln-smoke)", fontSize: "0.55rem" }}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Inspiration blocks */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ln-gold)" }}>INSPIRATION</div>
                    <button onClick={() => setPpgBlocks(prev => [...prev, { label: "", content: "" }])}
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ color: modeColor, background: `${modeColor}11`, border: `1px solid ${modeColor}22` }}>+ Add</button>
                  </div>
                  {ppgBlocks.map((block, idx) => (
                    <div key={idx} className="mb-2 p-2 rounded" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid var(--ln-panel-border)` }}>
                      <div className="flex items-center gap-1 mb-1">
                        <input value={block.label}
                          onChange={e => setPpgBlocks(prev => prev.map((b, i) => i === idx ? { ...b, label: e.target.value } : b))}
                          placeholder="Label (e.g. Lyrics, Mood)"
                          className="flex-1 bg-transparent outline-none text-[10px] font-mono"
                          style={{ color: modeColor, borderBottom: `1px solid ${modeColor}22`, paddingBottom: 1 }} />
                        {ppgBlocks.length > 1 && (
                          <button onClick={() => setPpgBlocks(prev => prev.filter((_, i) => i !== idx))}
                            style={{ color: "rgba(251,113,133,0.7)", fontSize: 10, lineHeight: 1 }}>×</button>
                        )}
                      </div>
                      <textarea value={block.content}
                        onChange={e => setPpgBlocks(prev => prev.map((b, i) => i === idx ? { ...b, content: e.target.value } : b))}
                        placeholder="Paste lyrics, describe a style, mood, reference…"
                        rows={3}
                        className="w-full bg-transparent outline-none resize-none text-xs leading-relaxed"
                        style={{ color: "var(--ln-parchment)", fontSize: "0.7rem" }} />
                    </div>
                  ))}
                </div>

                {/* Generate button */}
                <button
                  onClick={() => generatePpgMutation.mutate({ targetPlatform: ppgPlatform, promptType: ppgType, userInputBlocks: ppgBlocks.filter(b => b.content.trim()) })}
                  disabled={generatePpgMutation.isPending || ppgBlocks.every(b => !b.content.trim())}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ background: `${modeColor}22`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>
                  {generatePpgMutation.isPending
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating…</>
                    : <><Wand2 className="w-3 h-3" /> Generate Provenance Prompt</>}
                </button>

                {/* Result */}
                {ppgResult?.expressionPrompt && (
                  <div className="space-y-2 pt-2" style={{ borderTop: `1px solid var(--ln-panel-border)` }}>
                    {ppgResult.expressionId && (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded"
                        style={{ background: `${modeColor}11`, border: `1px solid ${modeColor}33` }}>
                        <span className="font-mono text-[10px] font-bold flex-1 truncate" style={{ color: modeColor }}>{ppgResult.expressionId}</span>
                        <button onClick={() => navigator.clipboard.writeText(ppgResult.expressionId ?? "")}
                          className="flex-shrink-0" style={{ color: modeColor, fontSize: 9 }}>
                          <ClipboardCopy style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                    )}
                    <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid var(--ln-panel-border)` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--ln-gold)" }}>PROMPT</span>
                        <button onClick={() => navigator.clipboard.writeText(ppgResult.expressionPrompt ?? "")} style={{ color: "var(--ln-gold)", fontSize: 9 }}>
                          <ClipboardCopy style={{ width: 10, height: 10 }} />
                        </button>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--ln-parchment)", fontSize: "0.7rem" }}>{ppgResult.expressionPrompt}</p>
                    </div>
                    {ppgResult.expressionStyleTags && (
                      <div className="p-2 rounded" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid var(--ln-panel-border)` }}>
                        <div className="text-[10px] font-mono tracking-widest mb-1" style={{ color: "var(--ln-smoke)" }}>STYLE TAGS</div>
                        <p className="text-xs" style={{ color: "rgba(209,213,219,0.7)", fontSize: "0.65rem" }}>{ppgResult.expressionStyleTags}</p>
                      </div>
                    )}
                    {/* Generate Art from prompt */}
                    <button
                      onClick={() => {
                        if (!ppgResult.expressionPrompt) return;
                        setIsGeneratingArt(true);
                        setGeneratedArtUrl(null);
                        generateArtworkMutation.mutate({
                          prompt: ppgResult.expressionPrompt,
                          styleTags: ppgResult.expressionStyleTags ? ppgResult.expressionStyleTags.split(',').map(s => s.trim()) : [],
                        });
                      }}
                      disabled={isGeneratingArt}
                      className="w-full flex items-center justify-center gap-2 py-1.5 rounded text-xs font-semibold transition-all disabled:opacity-40"
                      style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.35)", color: "var(--ln-gold)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>
                      {isGeneratingArt
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating Artwork…</>
                        : <><Palette className="w-3 h-3" /> Generate Art from Prompt</>}
                    </button>
                    {/* Generated artwork preview */}
                    {generatedArtUrl && (
                      <div className="rounded overflow-hidden" style={{ border: "1px solid rgba(196,154,40,0.3)" }}>
                        <img src={generatedArtUrl} alt="Generated artwork" className="w-full object-cover" style={{ maxHeight: 160 }} />
                        <div className="flex gap-1 p-1.5" style={{ background: "rgba(0,0,0,0.5)" }}>
                          <a href={generatedArtUrl} download="keeper-artwork.png" target="_blank" rel="noreferrer"
                            className="flex-1 text-center py-1 rounded text-[10px] font-mono transition-all"
                            style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.3)", color: "var(--ln-gold)" }}>
                            Download
                          </a>
                          <button
                            onClick={() => { onAskAgent?.(`[KEEPER ARTWORK] ${generatedArtUrl}`); setSandboxOpen(false); }}
                            className="flex-1 py-1 rounded text-[10px] font-mono transition-all"
                            style={{ background: `${modeColor}15`, border: `1px solid ${modeColor}33`, color: modeColor }}>
                            Send to Keeper
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Send to Keeper */}
                    <button onClick={() => { onAskAgent?.(`[PPG RESULT] ${ppgResult.expressionPrompt}`); setSandboxOpen(false); }}
                      className="w-full py-1.5 rounded text-xs font-semibold transition-all"
                      style={{ background: `${modeColor}22`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>
                      SEND TO KEEPER →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Persona tabs */}
          <div className="flex-shrink-0">
            <div className="flex" style={{ borderBottom: `1px solid var(--ln-panel-border)` }}>
              {(["Guide", "Conductor", "Witness", "Custodian", "Archivist"] as const).map(m => (
                <button key={m} onClick={() => onModeChange?.(m)}
                  className="flex-1 py-1.5 text-center transition-colors"
                  style={{
                    fontFamily: "'Space Mono', monospace", fontSize: "0.48rem",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    color: agentMode === m ? MODE_COLORS[m] : "var(--ln-smoke)",
                    borderBottom: agentMode === m ? `2px solid ${MODE_COLORS[m]}` : "2px solid transparent",
                    background: "transparent",
                  }}>
                  {m}
                </button>
              ))}
            </div>
            {/* Capability label for active persona */}
            {PERSONA_CAPABILITY[agentMode] && (
              <div className="px-3 py-1 text-center" style={{ borderBottom: `1px solid var(--ln-panel-border)`, background: `${modeColor}08` }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.45rem", color: `${modeColor}99`, letterSpacing: "0.05em" }}>
                  {PERSONA_CAPABILITY[agentMode]}
                </span>
              </div>
            )}
          </div>

          {/* Chat thread controls */}
          {agentMessages.length > 0 && (
            <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1" style={{ borderBottom: `1px solid var(--ln-panel-border)`, background: "rgba(0,0,0,0.3)" }}>
              <button onClick={onCopyAll} title="Copy all" className="p-1 rounded hover:opacity-80 transition-opacity" style={{ color: "var(--ln-smoke)" }}>
                <ClipboardCopy className="w-3 h-3" />
              </button>
              <button onClick={onSaveArchive} disabled={isSavingArchive} title="Save to archive" className="p-1 rounded hover:opacity-80 transition-opacity" style={{ color: "var(--ln-gold)" }}>
                {isSavingArchive ? <Loader2 className="w-3 h-3 animate-spin" /> : <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.06em" }}>SAVE</span>}
              </button>
              <button onClick={onChatRefresh} title="New thread" className="p-1 rounded hover:opacity-80 transition-opacity" style={{ color: "var(--ln-smoke)" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.06em" }}>NEW</span>
              </button>
              <button onClick={() => setArchiveOpen(a => !a)} title="Archives" className="p-1 rounded hover:opacity-80 transition-opacity" style={{ color: archiveOpen ? "var(--ln-gold)" : "var(--ln-smoke)" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", letterSpacing: "0.06em" }}>ARCH</span>
              </button>
              <div className="flex-1" />
              <button onClick={onClearAll} title="Clear all" className="p-1 rounded hover:opacity-80 transition-opacity" style={{ color: "#A67B7B" }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
          {/* Archive panel */}
          {archiveOpen && (
            <div className="flex-shrink-0 overflow-y-auto" style={{ maxHeight: 160, borderBottom: `1px solid var(--ln-panel-border)`, background: "rgba(0,0,0,0.5)" }}>
              {archives.length === 0 ? (
                <div className="p-3 text-center" style={{ color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.6rem" }}>No archives yet</div>
              ) : archives.map(arch => (
                <div key={arch.id} className="flex items-center gap-1 px-2 py-1.5" style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <button onClick={() => { onLoadArchive?.(arch.messages); setArchiveOpen(false); }} className="flex-1 text-left hover:opacity-80 transition-opacity" style={{ color: "var(--ln-parchment)", fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", letterSpacing: "0.04em" }}>
                    {arch.title}
                  </button>
                  <button onClick={() => onDeleteArchive?.(arch.id)} className="p-0.5 hover:opacity-80" style={{ color: "#A67B7B" }}>
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Profile gate banner */}
          {!profileGatePassed && (
            <div className="flex-shrink-0 px-3 py-2" style={{ background: "rgba(166,123,123,0.12)", borderBottom: `1px solid rgba(166,123,123,0.3)` }}>
              <p style={{ color: "#C4A0A0", fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", letterSpacing: "0.04em", lineHeight: 1.5 }}>
                Complete your profile to unlock full Keeper access.<br />
                Missing: {profileGateMissing.join(" · ")}
              </p>
            </div>
          )}
          {/* Message thread */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {agentMessages.length === 0 && (
              <div className="text-xs text-center mt-4"
                style={{ color: "var(--ln-smoke)", fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}>
                Your Keeper watches. Speak when ready.
              </div>
            )}
            {agentMessages.map(msg => (
              <div key={msg.id} className="group relative text-sm leading-relaxed" style={{ paddingRight: 52 }}>
                {editingId === msg.id ? (
                  <div className="flex flex-col gap-1">
                    <textarea
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      rows={3}
                      className="w-full rounded p-1.5 text-xs resize-none focus:outline-none"
                      style={{ background: "#0a0a0a", border: `1px solid ${modeColor}55`, color: "var(--ln-parchment)", fontFamily: "inherit", fontSize: "0.78rem", lineHeight: 1.5 }}
                    />
                    <div className="flex gap-1">
                      <button onClick={() => { onEditMessage?.(msg.id, editDraft); setEditingId(null); }} className="px-2 py-0.5 rounded text-xs" style={{ background: `${modeColor}22`, border: `1px solid ${modeColor}44`, color: modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}>SAVE</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-0.5 rounded text-xs" style={{ background: "transparent", border: "1px solid var(--ln-panel-border)", color: "var(--ln-smoke)", fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}>CANCEL</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-xs mr-2"
                      style={{ color: MODE_COLORS[msg.mode] ?? modeColor, fontFamily: "'Space Mono', monospace", fontSize: "0.55rem" }}>
                      [{msg.role === 'user' ? 'YOU' : msg.mode}]
                    </span>
                    <span style={{ color: "var(--ln-parchment)", fontSize: "0.8rem" }}>{msg.content}</span>
                    {/* Per-message controls (visible on hover) */}
                    <div className="absolute right-0 top-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onCopyMessage?.(msg.content)} title="Copy" className="p-0.5 rounded hover:opacity-80" style={{ color: "var(--ln-smoke)" }}>
                        <ClipboardCopy className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => { setEditingId(msg.id); setEditDraft(msg.content); }} title="Edit" className="p-0.5 rounded hover:opacity-80" style={{ color: "var(--ln-gold)" }}>
                        <PenLine className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => onDeleteMessage?.(msg.id)} title="Delete" className="p-0.5 rounded hover:opacity-80" style={{ color: "#A67B7B" }}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Ask input */}
          <div className="flex-shrink-0 p-2" style={{ borderTop: `1px solid var(--ln-panel-border)` }}>
            <div style={{ display: "flex", gap: 6 }}>
              <input id="keeper-input" type="text" placeholder="speak to your keeper…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) { onAskAgent?.(val); (e.target as HTMLInputElement).value = ""; }
                  }
                }}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${modeColor}33`, borderRadius: 6,
                  padding: "6px 10px", fontSize: "0.7rem",
                  color: "var(--ln-parchment)", fontFamily: "'Space Mono', monospace", outline: "none",
                }} />
              <button className="rounded transition-colors hover:opacity-80"
                style={{
                  background: `${modeColor}22`, border: `1px solid ${modeColor}44`,
                  color: modeColor, padding: "6px 10px", fontSize: "0.65rem",
                  fontFamily: "'Space Mono', monospace", cursor: "pointer",
                  flexShrink: 0, opacity: isThinking ? 0.5 : 1,
                }}
                disabled={isThinking}
                onClick={() => {
                  const el = document.getElementById("keeper-input") as HTMLInputElement | null;
                  const val = el?.value.trim();
                  if (val) { onAskAgent?.(val); if (el) el.value = ""; }
                }}>
                {isThinking ? "···" : "→"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
