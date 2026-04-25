import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { X, Minimize2, ChevronUp, Music2, Sword } from "lucide-react";

// ─── Skin image URLs ──────────────────────────────────────────────────────────

export const SKIN_IMAGES: Record<string, string> = {
  "hooded-scholar": "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-hooded-scholar_67e69960.png",
  "conductor":      "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-conductor_4e479e6b.png",
  "witness":        "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-witness_f31f36b2.png",
  "archivist":      "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-archivist_07d235d9.png",
  "cipher":         "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-cipher_c8ee6e38.png",
  "upload-slot":    "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/HMNMkWUWAfVdTbRj3YmPCF/skin-upload-slot_ab8bd82e.png",
};

// ─── Mode colours ─────────────────────────────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
  Guide:     "#C9A84C",
  Conductor: "#7B9EA6",
  Critic:    "#A67B7B",
  Custodian: "#7BA67B",
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

interface FloatingAvatarProps {
  activeSkinId?: string;
  customImageUrl?: string | null;
  agentMode?: string;
  agentMessages?: { id: string; role: string; content: string; mode: string }[];
  onAskAgent?: (text: string) => void;
  onModeChange?: (mode: string) => void;
  cinematicMode?: boolean;
  onCinematicToggle?: () => void;
  userName?: string;
  isThinking?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FloatingAvatar({
  activeSkinId = "hooded-scholar",
  customImageUrl,
  agentMode = "Guide",
  agentMessages = [],
  onAskAgent,
  onModeChange,
  cinematicMode = false,
  onCinematicToggle,
  userName,
  isThinking = false,
}: FloatingAvatarProps) {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(false);
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

  // ─── Drag handlers ──────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mx: e.clientX, my: e.clientY, ox: position.x, oy: position.y };
  }, [position]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const newPos = { x: dragStart.current.ox - dx, y: dragStart.current.oy - dy };
      setPosition(newPos);
      try { localStorage.setItem("ln_avatar_pos", JSON.stringify(newPos)); } catch {}
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

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
        {/* Drag handle ring */}
        <div
          className="absolute inset-0 rounded-full cursor-grab"
          style={{ zIndex: 1 }}
          onMouseDown={onMouseDown}
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

  return (
    <div
      className="fixed flex flex-col rounded-lg overflow-hidden"
      style={{
        bottom: orbBottom,
        right: orbRight,
        zIndex: ORB_Z,
        width: 320,
        height: 480,
        background: "var(--ln-panel)",
        border: `1px solid ${modeColor}66`,
        boxShadow: `0 0 0 1px ${modeColor}22, 0 8px 40px rgba(0,0,0,0.7)`,
        userSelect: "none",
      }}
    >
      {/* Header — drag zone */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0 cursor-grab"
        style={{
          background: `linear-gradient(135deg, var(--ln-obsidian) 0%, ${modeColor}11 100%)`,
          borderBottom: `1px solid ${modeColor}33`,
        }}
        onMouseDown={onMouseDown}
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

      {/* Mode tabs */}
      <div
        className="flex flex-shrink-0"
        style={{ borderBottom: `1px solid var(--ln-panel-border)` }}
      >
        {(["Guide", "Conductor", "Critic", "Custodian"] as const).map(m => (
          <button
            key={m}
            onClick={() => onModeChange?.(m)}
            className="flex-1 py-1.5 text-center transition-colors"
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.55rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: agentMode === m ? MODE_COLORS[m] : "var(--ln-smoke)",
              borderBottom: agentMode === m ? `2px solid ${MODE_COLORS[m]}` : "2px solid transparent",
              background: "transparent",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {agentMessages.length === 0 && (
          <div
            className="text-xs text-center mt-4"
            style={{ color: "var(--ln-smoke)", fontFamily: "'EB Garamond', serif", fontStyle: "italic" }}
          >
            Your Keeper watches. Speak when ready.
          </div>
        )}
        {agentMessages.map(msg => (
          <div key={msg.id} className="text-sm leading-relaxed">
            <span
              className="text-xs mr-2"
              style={{
                color: MODE_COLORS[msg.mode] ?? modeColor,
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.55rem",
              }}
            >
              [{msg.mode}]
            </span>
            <span style={{ color: "var(--ln-parchment)", fontSize: "0.8rem" }}>{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Ask button */}
      <div
        className="flex-shrink-0 p-2"
        style={{ borderTop: `1px solid var(--ln-panel-border)` }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <input
            id="keeper-input"
            type="text"
            placeholder="speak to your keeper…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) { onAskAgent?.(val); (e.target as HTMLInputElement).value = ""; }
              }
            }}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${modeColor}33`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: "0.7rem",
              color: "var(--ln-parchment)",
              fontFamily: "'Space Mono', monospace",
              outline: "none",
            }}
          />
          <button
            className="rounded transition-colors hover:opacity-80"
            style={{
              background: `${modeColor}22`,
              border: `1px solid ${modeColor}44`,
              color: modeColor,
              padding: "6px 10px",
              fontSize: "0.65rem",
              fontFamily: "'Space Mono', monospace",
              cursor: "pointer",
              flexShrink: 0,
              opacity: isThinking ? 0.5 : 1,
            }}
            disabled={isThinking}
            onClick={() => {
              const el = document.getElementById("keeper-input") as HTMLInputElement | null;
              const val = el?.value.trim();
              if (val) { onAskAgent?.(val); if (el) el.value = ""; }
            }}
          >
            {isThinking ? "···" : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}
