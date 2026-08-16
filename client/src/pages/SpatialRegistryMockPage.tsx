/**
 * @domain   The Registry → Spatial Prototype → Living Nexus Engine Mock
 * @impl     Page Component — Isolated visual prototype for the spatial registry experience
 *
 * Fictional data only. No production registry, auth, player, storage, or payments.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SpatialRegistryScene, type SpatialCeremony } from "@/components/spatial-registry/SpatialRegistryScene";
import {
  DEFAULT_COVER_ART,
  SPATIAL_REGISTRY_MOCK,
  SPATIAL_REGISTRY_NODES_BY_ID,
  type SpatialRegistryNodeId,
} from "@/lib/spatialRegistryMock";
import "./spatial-registry-mock.css";

const { creator, work, attribution } = SPATIAL_REGISTRY_MOCK;
const LINEAGE_STEPS: { id: SpatialRegistryNodeId; label: string }[] = [
  { id: "profile", label: "CREATOR" },
  { id: "edit", label: "EDIT" },
  { id: "register", label: "REGISTER" },
  { id: "witness", label: "WITNESS" },
];

function formatClock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60)
    .toString()
    .padStart(2, "0");
  const secs = (whole % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function generateMockCoverArt(seed: number, direction: string, feedback: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  if (!ctx) return DEFAULT_COVER_ART;
  ctx.fillStyle = "#080705";
  ctx.fillRect(0, 0, 768, 768);
  const gx = 420 + Math.sin(seed * 0.7) * 90;
  const gy = 270 + Math.cos(seed * 0.5) * 70;
  const glow = ctx.createRadialGradient(gx, gy, 16, gx, gy, 430);
  glow.addColorStop(0, "rgba(232,184,64,0.58)");
  glow.addColorStop(0.38, "rgba(196,154,40,0.16)");
  glow.addColorStop(1, "rgba(5,4,3,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 768, 768);
  for (let index = 0; index < 90; index += 1) {
    const x = (seed * 41 + index * 97) % 768;
    const y = (seed * 53 + index * 131) % 640;
    ctx.fillStyle = `rgba(237,229,208,${0.12 + (index % 6) * 0.06})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.beginPath();
  ctx.moveTo(52, 690);
  ctx.bezierCurveTo(170, 610, 230 + (seed % 50), 410, 360, 338);
  ctx.bezierCurveTo(510, 250, 560, 150, 720, 82);
  ctx.strokeStyle = "rgba(232,184,64,0.78)";
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.fillStyle = "rgba(237,229,208,0.5)";
  ctx.font = "22px Cinzel, serif";
  ctx.fillText(work.title, 48, 724);
  ctx.fillStyle = "rgba(196,154,40,0.45)";
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
  const [selectedNode, setSelectedNode] = useState<SpatialRegistryNodeId>("work");
  const [hoveredNode, setHoveredNode] = useState<SpatialRegistryNodeId | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(86);
  const [witnessCount, setWitnessCount] = useState(1);
  const [ceremony, setCeremony] = useState<SpatialCeremony>(null);
  const [ceremonyPhase, setCeremonyPhase] = useState<"working" | "done" | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [attributionOpen, setAttributionOpen] = useState(false);
  const [coverArtUrl, setCoverArtUrl] = useState(DEFAULT_COVER_ART);
  const [coverSelected, setCoverSelected] = useState(false);
  const selected = SPATIAL_REGISTRY_NODES_BY_ID[selectedNode];
  const hotNode = hoveredNode ?? selectedNode;
  const slotsUsed = creator.registrationCapacity - creator.slotsRemaining;
  const progress = (elapsed / work.durationSeconds) * 100;

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
    if (selectedNode === "profile") {
      return (
        <>
          <div className="mt-4 flex items-center gap-3">
            <div className="sr-avatar" aria-hidden="true">
              J
            </div>
            <div>
              <p className="font-display text-xl leading-none">{creator.name}</p>
              <p className="mt-1 text-sm text-[var(--sr-smoke)]">{creator.artistName}</p>
            </div>
          </div>
          <div className="sr-meta grid-cols-3">
            <div>
              <span>Registered works</span>
              <strong>{creator.registeredWorks}</strong>
            </div>
            <div>
              <span>Slots remaining</span>
              <strong>
                {creator.slotsRemaining} / {creator.registrationCapacity}
              </strong>
            </div>
            <div>
              <span>Witness activity</span>
              <strong>{witnessCount}</strong>
            </div>
          </div>
        </>
      );
    }

    if (selectedNode === "work") {
      return (
        <>
          <div className="mt-4 flex gap-3">
            <img src={coverArtUrl} alt="" className="sr-cover" />
            <div className="min-w-0">
              <p className="font-display text-[1.35rem] leading-tight">{work.title}</p>
              <p className="mt-1 text-sm text-[var(--sr-smoke)]">{work.artist}</p>
            </div>
          </div>
          <div className="sr-meta grid-cols-2">
            <div>
              <span>Version</span>
              <strong>{work.version}</strong>
            </div>
            <div>
              <span>WID</span>
              <strong>{work.wid}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{work.status}</strong>
            </div>
            <div>
              <span>Witnesses</span>
              <strong>{witnessCount}</strong>
            </div>
            <div className="col-span-2">
              <span>Registration date</span>
              <strong>{work.registrationDate}</strong>
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
          <button className="sr-text-btn mt-3 text-[10px] tracking-[0.18em]" onClick={() => setAttributionOpen(true)}>
            View Attribution
          </button>
        </>
      );
    }

    if (selectedNode === "register") {
      return (
        <>
          <p className="mt-3 text-sm leading-relaxed text-[var(--sr-smoke)]">
            Registration is an event. It establishes durable provenance for the work without becoming the work itself.
          </p>
          <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-[var(--sr-gold-hot)]">
            CREATOR → WORK → REGISTRATION
          </p>
          <button className="sr-gold-btn mt-4" onClick={register}>
            Simulate register
          </button>
        </>
      );
    }

    if (selectedNode === "witness") {
      return (
        <>
          <p className="mt-3 text-sm leading-relaxed text-[var(--sr-smoke)]">
            A witness is an attestation of the registration event. Each new witness appears as another relation in space.
          </p>
          <div className="sr-meta">
            <div>
              <span>Witnesses</span>
              <strong>{witnessCount}</strong>
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
          <p className="mt-3 text-sm leading-relaxed text-[var(--sr-smoke)]">
            Provenance is meant to be understood by looking at it. Follow the path through the spatial registry.
          </p>
          <div className="sr-ribbon mt-4">
            {LINEAGE_STEPS.map((step, index) => (
              <span key={step.id} className="inline-flex items-center gap-1">
                {index > 0 && <span className="sr-arrow">→</span>}
                <button className={hotNode === step.id || selectedNode === "lineage" ? "is-hot" : ""} onClick={() => setSelectedNode(step.id)}>
                  {step.label}
                </button>
              </span>
            ))}
          </div>
        </>
      );
    }

    if (selectedNode === "player") {
      return (
        <p className="mt-3 text-sm leading-relaxed text-[var(--sr-smoke)]">
          One canonical player remains present while the registry is explored. Playback belongs to the environment, not a separate widget.
        </p>
      );
    }

    return <p className="mt-3 text-sm leading-relaxed text-[var(--sr-smoke)]">{selected.description}</p>;
  }, [attribution.label, coverArtUrl, hotNode, register, selected.description, selectedNode, witness, witnessCount]);

  return (
    <main className="spatial-registry-mock">
      <SpatialRegistryScene
        selectedNode={selectedNode}
        witnessCount={witnessCount}
        isPlaying={isPlaying}
        coverArtUrl={coverArtUrl}
        ceremony={ceremony}
        reducedMotion={reducedMotion}
        onSelect={setSelectedNode}
        onHover={setHoveredNode}
      />

      <div className="sr-hud absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 sm:p-7">
        <div className="max-w-[20rem]">
          <button className="sr-ghost-btn mb-4" onClick={() => navigate("/")}>
            ← Living Nexus
          </button>
          <Kicker>Prototype · fictional registry</Kicker>
          <h1 className="sr-title">Spatial Registry</h1>
          <p className="sr-whisper">
            A living spatial dashboard backed by a provenance registry. The 3D environment visualizes relationships; it is not the source of truth.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button className="sr-ghost-btn" onClick={() => setAiOpen(true)}>
              My AI
            </button>
            <button className="sr-ghost-btn" onClick={() => setStudioOpen(true)}>
              Cover Art Studio
            </button>
          </div>
          <p className="text-right font-mono text-[9px] tracking-[0.18em] uppercase text-[var(--sr-smoke)] sm:hidden">
            {creator.slotsRemaining} / {creator.registrationCapacity} slots remaining
          </p>
        </div>
      </div>

      <aside className="sr-hud absolute left-4 top-44 hidden w-56 sm:left-7 sm:top-52 sm:block">
        <div className="sr-plate">
          <Kicker>Creator domain</Kicker>
          <div className="mt-3 flex items-center gap-3">
            <div className="sr-avatar" aria-hidden="true">
              J
            </div>
            <div>
              <p className="font-display text-lg leading-none">{creator.name}</p>
              <p className="mt-1 text-xs text-[var(--sr-smoke)]">{creator.artistName}</p>
            </div>
          </div>
          <div className="sr-meta grid-cols-2">
            <div>
              <span>Works</span>
              <strong>{creator.registeredWorks}</strong>
            </div>
            <div>
              <span>Witnesses</span>
              <strong>{witnessCount}</strong>
            </div>
          </div>
          <div className="mt-4">
            <Kicker>Registration capacity</Kicker>
            <p className="mt-2 font-display text-xl">
              {creator.slotsRemaining} / {creator.registrationCapacity} slots remaining
            </p>
            <div className="sr-capacity-track" aria-hidden="true">
              <span style={{ width: `${(slotsUsed / creator.registrationCapacity) * 100}%` }} />
            </div>
          </div>
        </div>
      </aside>

      <section className="sr-hud absolute inset-x-4 bottom-[5.75rem] sm:inset-x-auto sm:right-7 sm:bottom-36 sm:w-[21rem]">
        <div className="sr-plate">
          <Kicker>{selected.eyebrow}</Kicker>
          <h2>{selected.shortLabel === "WORK" ? work.title : selected.label}</h2>
          {inspector}
        </div>
      </section>

      <div className="sr-hud absolute bottom-[5.75rem] left-4 hidden sm:bottom-36 sm:left-7 sm:block">
        <div className="sr-ribbon">
          {LINEAGE_STEPS.map((step, index) => (
            <span key={step.id} className="inline-flex items-center gap-1">
              {index > 0 && <span className="sr-arrow">→</span>}
              <button className={hotNode === step.id || selectedNode === "lineage" ? "is-hot" : ""} onClick={() => setSelectedNode(step.id)}>
                {step.label}
              </button>
            </span>
          ))}
        </div>
      </div>

      <nav className="sr-hud absolute left-4 right-4 top-36 sm:hidden">
        <div className="sr-legend">
          {SPATIAL_REGISTRY_MOCK.nodes.map((node) => (
            <button key={node.id} className={selectedNode === node.id ? "is-active" : ""} onClick={() => setSelectedNode(node.id)}>
              {node.shortLabel}
            </button>
          ))}
        </div>
      </nav>

      <section className="sr-player" aria-label="Canonical global player">
        <img src={coverArtUrl} alt="" className="sr-cover h-12 w-12" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base">{work.title}</p>
          <p className="text-xs text-[var(--sr-smoke)]">
            {work.artist}
            {coverSelected ? " · cover selected" : ""}
          </p>
          <div className="sr-progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="hidden font-mono text-[10px] tracking-[0.12em] text-[var(--sr-smoke)] sm:block">
          {formatClock(elapsed)} / {work.duration}
        </span>
        <button
          className="sr-play"
          onClick={() => setIsPlaying((value) => !value)}
          aria-label={isPlaying ? "Pause fictional track" : "Play fictional track"}
        >
          {isPlaying ? "Ⅱ" : "▶"}
        </button>
      </section>

      {ceremony && ceremonyPhase && (
        <div className="sr-ceremony" role="status" aria-live="polite">
          <Kicker>{ceremony === "register" ? "Provenance event" : "Attestation"}</Kicker>
          {ceremony === "register" && ceremonyPhase === "working" && <p className="mt-2 font-display text-2xl">Recording registration</p>}
          {ceremony === "register" && ceremonyPhase === "done" && (
            <>
              <p className="mt-2 font-display text-2xl">Registration Created</p>
              <p className="mt-3 font-mono text-sm tracking-[0.18em] text-[var(--sr-gold-hot)]">WID · {work.wid}</p>
              <p className="mt-3 text-xs tracking-[0.16em] text-[var(--sr-smoke)]">CREATOR → WORK → REGISTRATION</p>
            </>
          )}
          {ceremony === "witness" && ceremonyPhase === "working" && <p className="mt-2 font-display text-2xl">Recording witness</p>}
          {ceremony === "witness" && ceremonyPhase === "done" && (
            <>
              <p className="mt-2 font-display text-2xl">Witness recorded</p>
              <p className="mt-3 text-sm text-[var(--sr-smoke)]">
                Witnesses: {witnessCount}. Registration is the event. Witness is the attestation.
              </p>
            </>
          )}
        </div>
      )}

      {studioOpen && <CoverArtStudio coverArtUrl={coverArtUrl} onClose={() => setStudioOpen(false)} onSelect={(url) => { setCoverArtUrl(url); setCoverSelected(true); setStudioOpen(false); setSelectedNode("work"); }} />}
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
            <p className="mt-4 text-sm leading-relaxed text-[var(--sr-smoke)]">{attribution.note}</p>
            <p className="mt-4 font-mono text-xs tracking-[0.12em] text-[var(--sr-gold-hot)]">{attribution.destinationHost}</p>
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

  const generate = () => {
    setBusy(true);
    window.setTimeout(() => {
      setGenerated(generateMockCoverArt(Date.now(), direction, feedback));
      setBusy(false);
    }, 700);
  };

  return (
    <div className="sr-modal-scrim" onClick={onClose}>
      <section className="sr-modal" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Kicker>Optional creator tool · mock</Kicker>
            <h2 className="mt-2 font-display text-3xl">Cover Art Studio</h2>
            <p className="mt-2 text-sm text-[var(--sr-smoke)]">Reference Images → Direction → Generation → Feedback → Revision → Final Artwork</p>
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
          <button className="sr-gold-btn w-auto px-5" onClick={generate} disabled={busy}>
            {busy ? "Generating…" : generated ? "Revise" : "Generate"}
          </button>
          {(generated || coverArtUrl) && <img src={generated ?? coverArtUrl} alt="Generated cover art" className="sr-cover" />}
          {generated && (
            <button className="sr-ghost-btn" onClick={() => onSelect(generated)}>
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
