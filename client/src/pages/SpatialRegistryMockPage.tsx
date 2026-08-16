/**
 * @domain   The Registry → Spatial Prototype → Living Nexus Engine Mock
 * @impl     Page Component — Isolated visual prototype for the spatial registry experience
 *
 * Fictional data only. No production registry, auth, player, storage, or payments.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronUp,
  Crosshair,
  ExternalLink,
  ListMusic,
  Minus,
  MousePointer2,
  Move,
  Pause,
  Play,
  Plus,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SpatialRegistryScene, type SpatialCeremony, type SpatialSceneHandle } from "@/components/spatial-registry/SpatialRegistryScene";
import {
  ASSET,
  DEFAULT_COVER_ART,
  SPATIAL_REGISTRY_MOCK,
  SPATIAL_REGISTRY_NODES_BY_ID,
  type SpatialRegistryNodeId,
} from "@/lib/spatialRegistryMock";
import "./spatial-registry-mock.css";

const { creator, work, attribution, registrationEvent, witnesses } = SPATIAL_REGISTRY_MOCK;
const NAV: { id: "nexus" | "works" | "lineage" | "registry"; label: string; node: SpatialRegistryNodeId }[] = [
  { id: "nexus", label: "NEXUS", node: "work" },
  { id: "works", label: "WORKS", node: "work" },
  { id: "lineage", label: "LINEAGE", node: "lineage" },
  { id: "registry", label: "REGISTRY", node: "register" },
];

function formatClock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60).toString().padStart(2, "0")}:${(whole % 60).toString().padStart(2, "0")}`;
}

function generateMockCoverArt(seed: number, direction: string, feedback: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  if (!ctx) return DEFAULT_COVER_ART;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 768, 768);
  const gx = 420 + Math.sin(seed * 0.7) * 90;
  const gy = 270 + Math.cos(seed * 0.5) * 70;
  const glow = ctx.createRadialGradient(gx, gy, 16, gx, gy, 430);
  glow.addColorStop(0, "rgba(212,175,55,0.58)");
  glow.addColorStop(0.38, "rgba(79,195,247,0.1)");
  glow.addColorStop(1, "rgba(5,4,3,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 768, 768);
  ctx.beginPath();
  ctx.arc(384, 384, 220, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(212,175,55,0.85)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "22px Cinzel, serif";
  ctx.fillText(work.title, 48, 724);
  ctx.fillStyle = "rgba(212,175,55,0.45)";
  ctx.font = "12px DM Sans, sans-serif";
  ctx.fillText((feedback || direction).slice(0, 64), 48, 748);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function Kicker({ children }: { children: string }) {
  return <p className="sr-kicker">{children}</p>;
}

export default function SpatialRegistryMockPage() {
  const [, navigate] = useLocation();
  const reducedMotion = useReducedMotion();
  const sceneRef = useRef<SpatialSceneHandle>(null);
  const [nav, setNav] = useState<(typeof NAV)[number]["id"]>("nexus");
  const [selectedNode, setSelectedNode] = useState<SpatialRegistryNodeId>("register");
  const [hoveredNode, setHoveredNode] = useState<SpatialRegistryNodeId | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(68);
  const [witnessCount, setWitnessCount] = useState(2);
  const [ceremony, setCeremony] = useState<SpatialCeremony>(null);
  const [ceremonyPhase, setCeremonyPhase] = useState<"working" | "done" | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [attributionOpen, setAttributionOpen] = useState(false);
  const [coverArtUrl, setCoverArtUrl] = useState<string>(DEFAULT_COVER_ART);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const selected = SPATIAL_REGISTRY_NODES_BY_ID[selectedNode];
  const extraWitnesses = Math.max(0, witnessCount - 2);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => (value >= work.durationSeconds ? 0 : value + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!ceremony || ceremonyPhase !== "done") return;
    const timer = window.setTimeout(() => {
      setCeremony(null);
      setCeremonyPhase(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [ceremony, ceremonyPhase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setStudioOpen(false);
      setAiOpen(false);
      setAttributionOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const register = useCallback(() => {
    setSelectedNode("register");
    setNav("registry");
    setCeremony("register");
    setCeremonyPhase("working");
    window.setTimeout(() => setCeremonyPhase("done"), reducedMotion ? 0 : 900);
  }, [reducedMotion]);

  const witness = useCallback(() => {
    setWitnessCount((count) => count + 1);
    setSelectedNode("witness");
    setCeremony("witness");
    setCeremonyPhase("working");
    window.setTimeout(() => setCeremonyPhase("done"), reducedMotion ? 0 : 700);
  }, [reducedMotion]);

  const inspector = useMemo(() => {
    if (selectedNode === "register") {
      return (
        <>
          <Kicker>Selected event</Kicker>
          <h2>REGISTRATION</h2>
          <div className="sr-dl">
            <div>
              <span>Event ID</span>
              <b>{registrationEvent.id}</b>
            </div>
            <div>
              <span>Status</span>
              <b className="sr-status">
                <i />
                {registrationEvent.status}
              </b>
            </div>
            <div>
              <span>Created by</span>
              <b>{registrationEvent.createdBy}</b>
            </div>
            <div>
              <span>Date</span>
              <b>{registrationEvent.date}</b>
            </div>
          </div>
          <p className="sr-copy">{registrationEvent.copy}</p>
          <Kicker>Witnesses</Kicker>
          <div className="sr-people">
            {witnesses.map((person) => (
              <div className="sr-person" key={person.name}>
                <div className="sr-mini">
                  <img src={person.avatar} alt="" />
                </div>
                <div>
                  <strong>{person.name}</strong>
                  <span>{person.at}</span>
                </div>
              </div>
            ))}
            {Array.from({ length: extraWitnesses }).map((_, index) => (
              <div className="sr-person" key={`extra-${index}`}>
                <div className="sr-mini" />
                <div>
                  <strong>Attestation {index + 3}</strong>
                  <span>Recorded in this mock</span>
                </div>
              </div>
            ))}
          </div>
          <button className="sr-gold-btn mt-4" onClick={register}>
            Simulate register
          </button>
          <button className="sr-text-btn mt-3" onClick={() => setAttributionOpen(true)}>
            View full record
          </button>
        </>
      );
    }

    if (selectedNode === "work") {
      return (
        <>
          <Kicker>Registered work</Kicker>
          <h2>{work.title}</h2>
          <img src={coverArtUrl} alt="" className="mt-3 w-full border border-[rgba(212,175,55,0.35)]" />
          <div className="sr-dl mt-4">
            <div>
              <span>Artist</span>
              <b>{work.artist}</b>
            </div>
            <div>
              <span>Version</span>
              <b>{work.version}</b>
            </div>
            <div>
              <span>WID</span>
              <b>{work.wid}</b>
            </div>
            <div>
              <span>Status</span>
              <b>{work.status}</b>
            </div>
            <div>
              <span>Witnesses</span>
              <b>{witnessCount}</b>
            </div>
            <div>
              <span>Registration date</span>
              <b>
                {work.registrationDate} · {work.registrationTime}
              </b>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="sr-gold-btn" onClick={register}>
              Register
            </button>
            <button className="sr-gold-btn" onClick={witness}>
              Witness
            </button>
          </div>
          <button className="sr-text-btn mt-3" onClick={() => setAttributionOpen(true)}>
            View Attribution
          </button>
        </>
      );
    }

    if (selectedNode === "witness") {
      return (
        <>
          <Kicker>Attestation</Kicker>
          <h2>WITNESS</h2>
          <p className="sr-copy">A witness is an attestation of the registration event. Each new witness appears as another relation in space.</p>
          <div className="sr-dl mt-4">
            <div>
              <span>Witnesses</span>
              <b>{witnessCount}</b>
            </div>
          </div>
          <button className="sr-gold-btn mt-4" onClick={witness}>
            Simulate witness
          </button>
        </>
      );
    }

    if (selectedNode === "lineage") {
      return (
        <>
          <Kicker>Visible relation</Kicker>
          <h2>LINEAGE</h2>
          <p className="sr-copy">CREATOR → EDIT → REGISTER → WITNESS. Provenance is meant to be understood by looking at it.</p>
        </>
      );
    }

    if (selectedNode === "profile") {
      return (
        <>
          <Kicker>Creator identity</Kicker>
          <h2>{creator.name}</h2>
          <p className="sr-copy">{creator.artistName}. Attribution stays with the work even when this overlay is closed.</p>
          <button className="sr-gold-btn mt-4" onClick={() => setAttributionOpen(true)}>
            View Attribution
          </button>
        </>
      );
    }

    return (
      <>
        <Kicker>{selected.eyebrow}</Kicker>
        <h2>{selected.shortLabel}</h2>
        <p className="sr-copy">{selected.description}</p>
      </>
    );
  }, [coverArtUrl, creator.artistName, creator.name, extraWitnesses, register, selected.description, selected.eyebrow, selected.shortLabel, selectedNode, witness, witnessCount]);

  const wave = useMemo(
    () => Array.from({ length: 18 }, (_, index) => 6 + ((index * 37) % 16)),
    [],
  );

  return (
    <main className="spatial-registry-mock">
      <header className="sr-header">
        <button className="sr-brand" onClick={() => navigate("/")}>
          <span className="sr-mark">LN</span>
          <span>
            <strong>LIVING NEXUS</strong>
            <span>SPATIAL REGISTRY</span>
          </span>
        </button>
        <nav className="sr-nav" aria-label="Prototype surfaces">
          {NAV.map((item) => (
            <button
              key={item.id}
              className={nav === item.id ? "is-active" : ""}
              onClick={() => {
                setNav(item.id);
                setSelectedNode(item.node);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sr-header-tools">
          <button className="sr-ghost" onClick={() => setAiOpen(true)}>
            My AI
          </button>
          <button className="sr-ghost" onClick={() => setStudioOpen(true)}>
            Cover Art Studio
          </button>
          <button className="sr-avatar-btn" onClick={() => setSelectedNode("profile")} aria-label="Open creator profile">
            <img src={ASSET.portrait} alt="" />
          </button>
        </div>
      </header>

      <aside className="sr-rail">
        <div className="sr-portrait-wrap">
          <div className="sr-portrait">
            <img src={ASSET.portrait} alt="Jake" />
          </div>
          <h2>JAKE</h2>
          <p className="artist">WEAVE & BREATHE</p>
        </div>
        <div className="mt-6">
          <div className="sr-stat">
            <span>Registered works</span>
            <b>{creator.registeredWorks}</b>
          </div>
          <div className="sr-stat">
            <span>Witnessed works</span>
            <b>{creator.witnessedWorks}</b>
          </div>
          <div className="sr-stat">
            <span>Registration slots</span>
            <b>
              {creator.slotsRemaining} / {creator.registrationCapacity}
            </b>
          </div>
          <div className="sr-stat">
            <span>Member since</span>
            <b>{creator.memberSince}</b>
          </div>
        </div>
        <button className="sr-gold-btn mt-5" onClick={() => setAttributionOpen(true)}>
          View Attribution <ExternalLink size={12} className="ml-1 inline" />
        </button>
        <div className="sr-gauge" aria-label="Registration capacity">
          <svg viewBox="0 0 140 82" role="img">
            <path d="M18 72 A 52 52 0 0 1 122 72" fill="none" stroke="rgba(212,175,55,0.18)" strokeWidth="8" strokeLinecap="round" />
            <path
              d="M18 72 A 52 52 0 0 1 122 72"
              fill="none"
              stroke="#d4af37"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="163"
              strokeDashoffset={163 * (1 - creator.slotsRemaining / creator.registrationCapacity)}
            />
          </svg>
          <p>
            {creator.slotsRemaining} / {creator.registrationCapacity} slots remaining
          </p>
        </div>
        <p className="sr-quote">
          “{creator.quote}”
          <span>— {creator.quoteAttribution}</span>
        </p>
        <p className="mt-4 text-[10px] leading-relaxed tracking-[0.04em] text-[rgba(176,176,176,0.55)]">
          Prototype · fictional registry. The 3D environment visualizes relationships; it is not the source of truth.
        </p>
      </aside>

      <div className="sr-scene-layer">
        <SpatialRegistryScene
          ref={sceneRef}
          selectedNode={selectedNode}
          witnessCount={witnessCount}
          isPlaying={isPlaying}
          coverArtUrl={coverArtUrl}
          ceremony={ceremony}
          reducedMotion={reducedMotion}
          onSelect={(nodeId) => {
            setSelectedNode(nodeId);
            if (nodeId === "lineage") setNav("lineage");
            if (nodeId === "register") setNav("registry");
            if (nodeId === "work") setNav("works");
          }}
          onHover={setHoveredNode}
        />
      </div>

      <div className="sr-toolbar">
        <button aria-label="Pan the spatial environment" onClick={() => sceneRef.current?.reset()}>
          <Move size={16} />
        </button>
        <button aria-label="Recenter on the work" onClick={() => { sceneRef.current?.reset(); setSelectedNode("work"); }}>
          <Crosshair size={16} />
        </button>
        <button aria-label="Zoom in" onClick={() => sceneRef.current?.zoom(0.82)}>
          <Plus size={16} />
        </button>
        <button aria-label="Zoom out" onClick={() => sceneRef.current?.zoom(1.22)}>
          <Minus size={16} />
        </button>
      </div>

      <p className="sr-hint">
        <MousePointer2 size={13} />
        {hoveredNode ? SPATIAL_REGISTRY_NODES_BY_ID[hoveredNode].shortLabel : "CLICK ANY NODE TO EXPLORE"}
      </p>

      <aside className="sr-rail right is-open">
        <div className="sr-event">{inspector}</div>
      </aside>

      <section className="sr-player" aria-label="Canonical global player">
        <div className="sr-now">
          <img src={coverArtUrl} alt="" />
          <div className="min-w-0">
            <p className="truncate">{work.title}</p>
            <span>
              {work.artist} · {work.wid}
            </span>
          </div>
        </div>
        <div className="sr-transport">
          <div className="sr-transport-btns">
            <button className={`sr-icon-btn ${shuffle ? "is-on" : ""}`} aria-label="Shuffle" onClick={() => setShuffle((value) => !value)}>
              <Shuffle size={14} />
            </button>
            <button className="sr-icon-btn" aria-label="Previous">
              <SkipBack size={15} />
            </button>
            <button className="sr-icon-btn sr-play" onClick={() => setIsPlaying((value) => !value)} aria-label={isPlaying ? "Pause fictional track" : "Play fictional track"}>
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button className="sr-icon-btn" aria-label="Next">
              <SkipForward size={15} />
            </button>
            <button className={`sr-icon-btn ${repeat ? "is-on" : ""}`} aria-label="Repeat" onClick={() => setRepeat((value) => !value)}>
              <Repeat size={14} />
            </button>
          </div>
          <div className="sr-progress-row">
            <span>{formatClock(elapsed)}</span>
            <input
              className="sr-slider"
              type="range"
              min={0}
              max={work.durationSeconds}
              value={elapsed}
              aria-label="Playback progress"
              onChange={(event) => setElapsed(Number(event.target.value))}
            />
            <span>{work.duration}</span>
          </div>
        </div>
        <div className="sr-player-extra">
          <div className={`sr-wave ${isPlaying ? "is-playing" : ""}`} aria-hidden="true">
            {wave.map((height, index) => (
              <i key={index} style={{ height, animationDelay: `${index * 0.06}s` }} />
            ))}
          </div>
          <button className="sr-icon-btn" aria-label="Volume">
            <Volume2 size={15} />
          </button>
          <button className="sr-icon-btn" aria-label="Queue">
            <ListMusic size={15} />
          </button>
          <button className="sr-icon-btn" aria-label="Expand player" onClick={() => setSelectedNode("player")}>
            <ChevronUp size={15} />
          </button>
        </div>
      </section>

      {ceremony && ceremonyPhase && (
        <div className="sr-ceremony" role="status" aria-live="polite">
          <Kicker>{ceremony === "register" ? "Provenance event" : "Attestation"}</Kicker>
          {ceremony === "register" && ceremonyPhase === "working" && <p className="mt-2 font-display text-2xl">Recording registration</p>}
          {ceremony === "register" && ceremonyPhase === "done" && (
            <>
              <p className="mt-2 font-display text-2xl">Registration Created</p>
              <p className="mt-3 font-mono text-sm tracking-[0.18em] text-[var(--sr-gold)]">WID · {work.wid}</p>
              <p className="mt-3 text-xs tracking-[0.16em] text-[var(--sr-muted)]">CREATOR → WORK → REGISTRATION</p>
            </>
          )}
          {ceremony === "witness" && ceremonyPhase === "working" && <p className="mt-2 font-display text-2xl">Recording witness</p>}
          {ceremony === "witness" && ceremonyPhase === "done" && (
            <>
              <p className="mt-2 font-display text-2xl">Witness recorded</p>
              <p className="mt-3 text-sm text-[var(--sr-muted)]">
                Witnesses: {witnessCount}. Registration is the event. Witness is the attestation.
              </p>
            </>
          )}
        </div>
      )}

      {studioOpen && (
        <CoverArtStudio
          coverArtUrl={coverArtUrl}
          onClose={() => setStudioOpen(false)}
          onSelect={(url) => {
            setCoverArtUrl(url);
            setStudioOpen(false);
            setSelectedNode("work");
          }}
        />
      )}
      {aiOpen && <MyAiMock onClose={() => setAiOpen(false)} />}
      {attributionOpen && (
        <div className="sr-modal-scrim" onClick={() => setAttributionOpen(false)}>
          <section className="sr-modal max-w-md" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Kicker>External attribution</Kicker>
                <h2 className="mt-2 font-display text-3xl">Attribution</h2>
              </div>
              <button className="sr-text-btn" onClick={() => setAttributionOpen(false)}>
                Close
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--sr-muted)]">{attribution.note}</p>
            <p className="mt-4 font-mono text-xs tracking-[0.12em] text-[var(--sr-gold)]">{attribution.destinationHost}</p>
            <p className="mt-2 text-sm">
              {creator.name} / {creator.artistName}
              <br />
              {work.title} · {work.wid}
            </p>
            <a className="sr-gold-btn mt-6 inline-block text-center no-underline" href={`https://${attribution.destinationHost}`} target="_blank" rel="noreferrer">
              Open destination
            </a>
          </section>
        </div>
      )}
    </main>
  );
}

function CoverArtStudio({
  coverArtUrl,
  onClose,
  onSelect,
}: {
  coverArtUrl: string;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [refs, setRefs] = useState<(string | null)[]>([null, null, null, null]);
  const [direction, setDirection] = useState("A quiet nocturnal path illuminated by gold, bound to Yahweh Lights My Way.");
  const [feedback, setFeedback] = useState("");
  const [generated, setGenerated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = (index: number, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRefs((current) => current.map((value, slot) => (slot === index ? String(reader.result) : value)));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="sr-modal-scrim" onClick={onClose}>
      <section className="sr-modal" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Kicker>Optional creator tool · mock</Kicker>
            <h2 className="mt-2 font-display text-3xl">Cover Art Studio</h2>
            <p className="mt-2 text-sm text-[var(--sr-muted)]">Reference Images → Direction → Generation → Feedback → Revision → Final Artwork</p>
          </div>
          <button className="sr-text-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {refs.map((src, index) => (
            <label key={index} className="sr-ref-slot grid place-items-center text-center">
              {src ? <img src={src} alt="" /> : <span>Reference {index + 1}</span>}
              <input type="file" accept="image/*" aria-label={`Reference image ${index + 1}`} onChange={(event) => onFile(index, event.target.files?.[0])} />
            </label>
          ))}
        </div>
        <label className="sr-field">
          Creative direction
          <textarea value={direction} onChange={(event) => setDirection(event.target.value)} rows={3} />
        </label>
        <label className="sr-field">
          Feedback
          <input value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Make the path more intimate and the light warmer" />
        </label>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <button
            className="sr-gold-btn w-auto px-5"
            onClick={() => {
              setBusy(true);
              window.setTimeout(() => {
                setGenerated(generateMockCoverArt(Date.now(), direction, feedback));
                setBusy(false);
              }, 700);
            }}
            disabled={busy}
          >
            {busy ? "Generating…" : generated ? "Revise" : "Generate"}
          </button>
          {(generated || coverArtUrl) && <img src={generated ?? coverArtUrl} alt="Generated cover art" className="h-20 w-20 object-cover" />}
          {generated && (
            <button className="sr-ghost" onClick={() => onSelect(generated)}>
              Select as Cover Art
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function MyAiMock({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("Orison");
  const [personality, setPersonality] = useState("Attentive, quiet, creator-directed.");
  const [instructions, setInstructions] = useState("Stay with the work. Speak only from the creator's context.");
  const [context, setContext] = useState("Jake / Weave & Breathe. Music. Yahweh Lights My Way, WID LN-00017.");
  const [saved, setSaved] = useState(false);

  return (
    <div className="sr-modal-scrim" onClick={onClose}>
      <section className="sr-modal max-w-md" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Kicker>Optional creator tool · mock</Kicker>
            <h2 className="mt-2 font-display text-3xl">My AI</h2>
          </div>
          <button className="sr-text-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <label className="sr-field">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="sr-field">
          Personality
          <input value={personality} onChange={(event) => setPersonality(event.target.value)} />
        </label>
        <label className="sr-field">
          Instructions
          <textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} rows={3} />
        </label>
        <label className="sr-field">
          Creator context
          <textarea value={context} onChange={(event) => setContext(event.target.value)} rows={3} />
        </label>
        <button
          className="sr-gold-btn mt-5"
          onClick={() => {
            setSaved(true);
            window.setTimeout(onClose, 700);
          }}
        >
          {saved ? "Saved" : "Save mock configuration"}
        </button>
      </section>
    </div>
  );
}
