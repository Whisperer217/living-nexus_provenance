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
  ARTIFACT_FORMS,
  ASSET,
  DEFAULT_COVER_ART,
  SPATIAL_REGISTRY_MOCK,
  SPATIAL_REGISTRY_NODES_BY_ID,
  INTERACTION_DOCTRINE,
  VISUAL_LANGUAGE,
  type SpatialArtifact,
  type SpatialRegistryNodeId,
  type SpatialView,
} from "@/lib/spatialRegistryMock";
import "./spatial-registry-mock.css";

const { creator, work, attribution, versions, creatorStages, lineageSequence, derivedArtifacts, exploreArtifacts } = SPATIAL_REGISTRY_MOCK;
const NAV: { id: "nexus" | "works" | "lineage" | "registry"; label: string; view: SpatialView }[] = [
  { id: "nexus", label: "NEXUS", view: "overview" },
  { id: "works", label: "WORKS", view: "explore" },
  { id: "lineage", label: "LINEAGE", view: "lineage" },
  { id: "registry", label: "REGISTRY", view: "register" },
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
  const [view, setView] = useState<SpatialView>("overview");
  const [selectedNode, setSelectedNode] = useState<SpatialRegistryNodeId>("work");
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
  const [loadedWorkId, setLoadedWorkId] = useState<string | null>(null);
  const [grabbing, setGrabbing] = useState<SpatialArtifact | null>(null);
  const [dropHot, setDropHot] = useState(false);
  const [inspectFile, setInspectFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const selected = SPATIAL_REGISTRY_NODES_BY_ID[selectedNode];
  const loaded = exploreArtifacts.find((item) => item.id === loadedWorkId) ?? null;

  useEffect(() => {
    if (!isPlaying || !loaded) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => (value >= loaded.durationSeconds ? 0 : value + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isPlaying, loaded]);

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
      setView("overview");
      setNav("nexus");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const enter = useCallback((nodeId: SpatialRegistryNodeId) => {
    setSelectedNode(nodeId);
    setView(nodeId);
    if (nodeId === "lineage") setNav("lineage");
    else if (nodeId === "register") setNav("registry");
    else if (nodeId === "work" || nodeId === "player") setNav("works");
    else setNav("nexus");
  }, []);

  const openExplore = useCallback(() => {
    setView("explore");
    setNav("works");
    setSelectedNode("work");
  }, []);

  const returnToConstellation = useCallback(() => {
    setView("overview");
    setNav("nexus");
    setSelectedNode("work");
    sceneRef.current?.reset();
  }, []);

  const register = useCallback(() => {
    enter("register");
    setCeremony("register");
    setCeremonyPhase("working");
    window.setTimeout(() => setCeremonyPhase("done"), reducedMotion ? 0 : 900);
  }, [enter, reducedMotion]);

  const loadWork = useCallback((artifact: SpatialArtifact) => {
    setLoadedWorkId(artifact.id);
    setCoverArtUrl(artifact.cover);
    setElapsed(0);
    setIsPlaying(true);
    setGrabbing(null);
    setDropHot(false);
  }, []);

  const witness = useCallback(() => {
    setWitnessCount((count) => count + 1);
    enter("witness");
    setCeremony("witness");
    setCeremonyPhase("working");
    window.setTimeout(() => setCeremonyPhase("done"), reducedMotion ? 0 : 700);
  }, [enter, reducedMotion]);

  const onFileInspect = useCallback((file: File) => {
    setInspectFile({ name: file.name, size: file.size, type: file.type || "audio" });
    enter("register");
  }, [enter]);

  const wave = useMemo(
    () => Array.from({ length: 18 }, (_, index) => 6 + ((index * 37) % 16)),
    [],
  );

  return (
    <main
      className={`spatial-registry-mock${view !== "overview" ? " is-entered" : ""}${grabbing ? " is-grabbing" : ""}${dropHot ? " is-drop-hot" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) onFileInspect(file);
      }}
    >
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
                if (item.view === "overview") returnToConstellation();
                else if (item.view === "explore") openExplore();
                else enter(item.view as SpatialRegistryNodeId);
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
          <button className="sr-avatar-btn" onClick={() => enter("profile")} aria-label="Open creator profile">
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
          view={view}
          selectedNode={selectedNode}
          witnessCount={witnessCount}
          isPlaying={isPlaying}
          coverArtUrl={coverArtUrl}
          loadedWorkId={loadedWorkId}
          ceremony={ceremony}
          reducedMotion={reducedMotion}
          onSelect={enter}
          onHover={setHoveredNode}
          onLoadWork={loadWork}
          onGrab={(artifact, hot) => {
            setGrabbing(artifact);
            setDropHot(hot);
          }}
        />
      </div>

      <div className="sr-toolbar">
        <button aria-label="Pan the spatial environment" onClick={() => sceneRef.current?.reset()}>
          <Move size={16} />
        </button>
        <button aria-label="Return to constellation" onClick={returnToConstellation}>
          <Crosshair size={16} />
        </button>
        <button aria-label="Zoom in" onClick={() => sceneRef.current?.zoom(0.82)}>
          <Plus size={16} />
        </button>
        <button aria-label="Zoom out" onClick={() => sceneRef.current?.zoom(1.22)}>
          <Minus size={16} />
        </button>
      </div>

      {view !== "overview" && (
        <button className="sr-ghost sr-return" onClick={returnToConstellation}>
          ← Return to constellation
        </button>
      )}

      {view !== "overview" && (
        <section className="sr-pathway-card">
          {view === "explore" ? (
            <>
              <Kicker>Explore → Player</Kicker>
              <h2 className="mt-2 font-display text-2xl">Grab a work</h2>
              <p className="mt-2 text-xs tracking-[0.16em] uppercase text-[var(--sr-electric)]">Load this registered artifact into my experience</p>
              <p className="sr-copy">Works are physical objects. Grab a record, drag it to the player, drop it. The platter takes the registered work. Playback begins without leaving the registry.</p>
              <ol className="sr-steps">
                {exploreArtifacts.map((artifact) => (
                  <li key={artifact.id}>
                    <b>{ARTIFACT_FORMS[artifact.medium].object}</b>
                    <span>{artifact.title}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <>
          <Kicker>{selected.form}</Kicker>
          <h2 className="mt-2 font-display text-2xl">{selected.shortLabel}</h2>
          <p className="mt-2 text-xs tracking-[0.16em] uppercase" style={{ color: selected.color }}>{selected.language}</p>
          <p className="sr-copy">{selected.description}</p>
          {view === "work" && (
            <ol className="sr-steps">
              {["Creator", "Edit", "Register", "Witness", "Lineage", "Player"].map((name) => (
                <li key={name}><b>{name}</b><span>connects here</span></li>
              ))}
            </ol>
          )}
          {view === "profile" && (
            <ol className="sr-steps">
              {creatorStages.map((stage) => (
                <li key={stage.id}><b>{stage.label}</b><span>{stage.caption}</span></li>
              ))}
            </ol>
          )}
          {view === "edit" && (
            <ol className="sr-steps">
              {versions.map((version) => (
                <li key={version.id}><b>{version.label}</b><span>{version.caption}</span></li>
              ))}
            </ol>
          )}
          {view === "register" && (
            <ol className="sr-steps">
              <li><b>Chamber</b><span>The work enters</span></li>
              <li><b>WID</b><span>{work.wid}</span></li>
              <li><b>Record</b><span>Registration establishes</span></li>
              <li><b>Seal</b><span>Closes on the event</span></li>
            </ol>
          )}
          {view === "witness" && (
            <ol className="sr-steps">
              <li><b>Witness</b><span>{witnessCount} luminous points</span></li>
              <li><b>Event</b><span>{SPATIAL_REGISTRY_MOCK.registrationEvent.id}</span></li>
              <li><b>Work</b><span>{work.title}</span></li>
            </ol>
          )}
          {view === "lineage" && (
            <ol className="sr-steps">
              {lineageSequence.map((step) => (
                <li key={step.id}><b>{step.label}</b><span>{step.caption}</span></li>
              ))}
            </ol>
          )}
          {view === "player" && (
            <ol className="sr-steps">
              <li><b>Playback</b><span>{isPlaying ? "Registry is resonating" : "Idle field"}</span></li>
              <li><b>Work</b><span>{work.title}</span></li>
              <li><b>Derived</b><span>{derivedArtifacts.map((item) => item.title).join(" · ")}</span></li>
            </ol>
          )}
          {view === "work" && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button className="sr-gold-btn" onClick={register}>Register</button>
              <button className="sr-gold-btn" onClick={witness}>Witness</button>
            </div>
          )}
          {view === "register" && (
            <>
              <p className="sr-copy">Drag a local file into this chamber to inspect it, then establish the record. Same gesture as loading a work into the player, reversed.</p>
              <button className="sr-gold-btn mt-4" onClick={register}>Simulate register</button>
            </>
          )}
          {view === "witness" && (
            <button className="sr-gold-btn mt-4" onClick={witness}>Simulate witness · {witnessCount}</button>
          )}
          {(view === "profile" || view === "work") && (
            <button className="sr-text-btn mt-3" onClick={() => setAttributionOpen(true)}>
              View Attribution
            </button>
          )}
            </>
          )}
        </section>
      )}

      <p className="sr-hint">
        <MousePointer2 size={13} />
        {grabbing
          ? dropHot
            ? grabbing.medium === "music"
              ? "RELEASE TO LOAD"
              : "THIS MEDIUM IS NOT PLAYABLE"
            : `CARRYING ${grabbing.title.toUpperCase()}`
          : view === "overview"
            ? hoveredNode
              ? `Enter ${SPATIAL_REGISTRY_NODES_BY_ID[hoveredNode].shortLabel}`
              : "WORKS · GRAB A RECORD"
            : view === "explore"
              ? "GRAB A WORK · DROP ON THE PLAYER"
              : view === "register"
                ? "DROP A LOCAL FILE TO ESTABLISH IT"
                : selected.language}
      </p>

      {view === "overview" && (
        <aside className="sr-rail right is-open">
          <Kicker>Six spatial pathways</Kicker>
          <h2 className="mt-2 font-display text-xl">The work is the center</h2>
          <p className="sr-copy">Each node is an environment, not a page. Enter it. The registry remains the source of truth; this is how it becomes visible.</p>
          <p className="mt-3 text-[10px] tracking-[0.16em] uppercase text-[var(--sr-gold)]">{VISUAL_LANGUAGE.principle}</p>
          <p className="sr-copy">{INTERACTION_DOCTRINE.standard}</p>
          <ol className="sr-steps">
            {INTERACTION_DOCTRINE.grammar.slice(0, 5).map((row) => (
              <li key={row.act}><b>{row.act}</b><span>{row.means}</span></li>
            ))}
          </ol>
          <button className="sr-gold-btn mt-4" onClick={openExplore}>
            Works · grab a record
          </button>
          <div className="sr-dl mt-4">
            {SPATIAL_REGISTRY_MOCK.nodes.filter((node) => node.id !== "work").map((node) => (
              <button key={node.id} className="sr-text-btn text-left" onClick={() => enter(node.id)}>
                <span className="block" style={{ color: node.color }}>{node.shortLabel}</span>
                <b className="block font-normal text-[11px] tracking-normal normal-case text-[var(--sr-muted)]">{node.form}</b>
              </button>
            ))}
          </div>
        </aside>
      )}

      <section className={`sr-player${dropHot ? " is-drop-hot" : ""}`} aria-label="Canonical global player">
        <div className="sr-now">
          <img src={loaded ? coverArtUrl : DEFAULT_COVER_ART} alt="" />
          <div className="min-w-0">
            <p className="truncate">{loaded ? loaded.title : "Awaiting a work"}</p>
            <span>
              {loaded
                ? `${loaded.artist} · ${loaded.wid ?? "Unregistered"}`
                : "Grab a record in Works"}
            </span>
            {loaded && (
              <em className="sr-registered">
                {loaded.status.toUpperCase()}
                {loaded.witnessed ? " · WITNESSED" : ""}
              </em>
            )}
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
            <button
              className="sr-icon-btn sr-play"
              onClick={() => loaded && setIsPlaying((value) => !value)}
              aria-label={isPlaying ? "Pause fictional track" : "Play fictional track"}
              disabled={!loaded}
            >
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
              max={loaded?.durationSeconds || work.durationSeconds}
              value={elapsed}
              aria-label="Playback progress"
              onChange={(event) => setElapsed(Number(event.target.value))}
              disabled={!loaded}
            />
            <span>{loaded?.duration || work.duration}</span>
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
          <button className="sr-icon-btn" aria-label="Enter player pathway" onClick={() => enter("player")}>
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

      {inspectFile && (
        <div className="sr-modal-scrim" onClick={() => setInspectFile(null)}>
          <section className="sr-modal max-w-md" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Kicker>Local file → Registry</Kicker>
                <h2 className="mt-2 font-display text-3xl">Inspect</h2>
              </div>
              <button className="sr-text-btn" onClick={() => setInspectFile(null)}>
                Close
              </button>
            </div>
            <ol className="sr-steps">
              <li><b>File</b><span>{inspectFile.name}</span></li>
              <li><b>Size</b><span>{Math.max(1, Math.round(inspectFile.size / 1024))} KB</span></li>
              <li><b>Type</b><span>{inspectFile.type || "unknown"}</span></li>
              <li><b>Next</b><span>Metadata → Register → WID</span></li>
            </ol>
            <p className="sr-copy">The file never leaves this prototype. Dropping it into Register is the same spatial verb as dropping a record onto the Player: you are moving a work through the Nexus.</p>
            <button
              className="sr-gold-btn mt-5"
              onClick={() => {
                setInspectFile(null);
                register();
              }}
            >
              Establish the record
            </button>
          </section>
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
