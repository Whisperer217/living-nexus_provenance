import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useLocation } from "wouter";
import {
  SPATIAL_REGISTRY_MOCK,
  type SpatialRegistryNode,
  type SpatialRegistryNodeId,
} from "@/lib/spatialRegistryMock";

const nodesById = Object.fromEntries(
  SPATIAL_REGISTRY_MOCK.nodes.map((node) => [node.id, node]),
) as Record<SpatialRegistryNodeId, SpatialRegistryNode>;

function SpatialScene({
  selectedNode,
  witnessCount,
  onSelect,
}: {
  selectedNode: SpatialRegistryNodeId;
  witnessCount: number;
  onSelect: (nodeId: SpatialRegistryNodeId) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedNode);
  const witnessRef = useRef(witnessCount);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    selectedRef.current = selectedNode;
    witnessRef.current = witnessCount;
    onSelectRef.current = onSelect;
  }, [selectedNode, witnessCount, onSelect]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#060606", 0.075);
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0.9, 11.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = true;
    controls.minDistance = 7;
    controls.maxDistance = 16;
    controls.target.set(0, 0.3, 0);

    const starsGeometry = new THREE.BufferGeometry();
    const stars = new Float32Array(480 * 3);
    for (let index = 0; index < 480; index += 1) {
      stars[index * 3] = (Math.random() - 0.5) * 36;
      stars[index * 3 + 1] = (Math.random() - 0.5) * 22;
      stars[index * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: "#dfc57e", size: 0.028, transparent: true, opacity: 0.65 })));

    const registryGroup = new THREE.Group();
    registryGroup.rotation.x = -0.12;
    scene.add(registryGroup);

    const workGlow = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.22, 96),
      new THREE.MeshBasicMaterial({ color: "#d6ad4a", transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    workGlow.position.set(0, 0.7, -0.12);
    registryGroup.add(workGlow);

    const objectById = new Map<SpatialRegistryNodeId, THREE.Mesh>();
    SPATIAL_REGISTRY_MOCK.nodes.forEach((node) => {
      const isWork = node.id === "work";
      const geometry = isWork ? new THREE.IcosahedronGeometry(0.82, 3) : new THREE.SphereGeometry(0.3, 28, 28);
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: isWork ? 0.82 : 0.28,
        roughness: 0.32,
        metalness: isWork ? 0.63 : 0.42,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...node.position);
      mesh.userData.nodeId = node.id;
      objectById.set(node.id, mesh);
      registryGroup.add(mesh);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(isWork ? 1.0 : 0.43, isWork ? 1.035 : 0.455, 48),
        new THREE.MeshBasicMaterial({ color: node.color, transparent: true, opacity: isWork ? 0.34 : 0.16, side: THREE.DoubleSide }),
      );
      halo.position.copy(mesh.position);
      halo.position.z -= 0.08;
      halo.userData.nodeId = node.id;
      registryGroup.add(halo);
    });

    const edgeMaterial = new THREE.LineBasicMaterial({ color: "#887144", transparent: true, opacity: 0.46 });
    SPATIAL_REGISTRY_MOCK.edges.forEach(([from, to]) => {
      const fromNode = nodesById[from];
      const toNode = nodesById[to];
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...fromNode.position),
        new THREE.Vector3(...toNode.position),
      ]);
      registryGroup.add(new THREE.Line(geometry, edgeMaterial));
    });

    const accentLight = new THREE.PointLight("#d6ad4a", 22, 20, 2);
    accentLight.position.set(0, 3.2, 5);
    scene.add(accentLight);
    const fillLight = new THREE.PointLight("#8f78d1", 9, 18, 2);
    fillLight.position.set(-6, -2, 3);
    scene.add(fillLight);
    scene.add(new THREE.AmbientLight("#e9dec4", 0.85));

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const selectFromPointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(Array.from(objectById.values()), false)[0];
      if (hit?.object.userData.nodeId) onSelectRef.current(hit.object.userData.nodeId as SpatialRegistryNodeId);
    };
    renderer.domElement.addEventListener("pointerup", selectFromPointer);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let frame = 0;
    let animationFrame = 0;
    const render = () => {
      frame += 1;
      const selectedMesh = objectById.get(selectedRef.current);
      objectById.forEach((mesh, id) => {
        const selected = id === selectedRef.current;
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = selected ? 1.25 : id === "work" ? 0.82 : 0.28;
        const baseScale = id === "work" ? 1 : 1;
        const pulse = selected ? 1 + Math.sin(frame * 0.065) * 0.06 : baseScale;
        mesh.scale.setScalar(pulse);
      });
      if (selectedMesh) workGlow.material.opacity = selectedRef.current === "work" ? 0.95 : 0.38;
      registryGroup.rotation.y += 0.0013;
      controls.update();
      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerup", selectFromPointer);
      controls.dispose();
      starsGeometry.dispose();
      registryGroup.traverse((object) => {
        const candidate = object as THREE.Mesh;
        candidate.geometry?.dispose?.();
        const material = candidate.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" aria-label="Interactive fictional spatial registry. Drag to rotate and tap a node to inspect it." />;
}

function Glyph({ children }: { children: string }) {
  return <span className="font-mono text-[10px] tracking-[0.22em] text-[var(--ln-gold)]">{children}</span>;
}

export default function SpatialRegistryMockPage() {
  const [, navigate] = useLocation();
  const [selectedNode, setSelectedNode] = useState<SpatialRegistryNodeId>("work");
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(34);
  const [witnessCount, setWitnessCount] = useState(1);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [coverSelected, setCoverSelected] = useState(false);
  const [generated, setGenerated] = useState(false);
  const selected = nodesById[selectedNode];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => setProgress((value) => (value >= 100 ? 0 : value + 0.45)), 1_000);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const register = useCallback(() => {
    setRegistrationNotice("Registration Created · LN-00017");
    setSelectedNode("register");
  }, []);

  const witness = useCallback(() => {
    setWitnessCount((count) => count + 1);
    setSelectedNode("witness");
  }, []);

  return (
    <main className="min-h-dvh overflow-hidden bg-[#060606] text-[var(--ln-parchment)] selection:bg-[color:var(--ln-gold)] selection:text-black">
      <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_52%_38%,rgba(177,135,45,0.13),transparent_25%),radial-gradient(circle_at_14%_8%,rgba(105,75,163,0.14),transparent_26%),#060606]">
        <SpatialScene selectedNode={selectedNode} witnessCount={witnessCount} onSelect={setSelectedNode} />

        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4 sm:p-7">
          <div className="pointer-events-auto max-w-[18rem]">
            <button onClick={() => navigate("/")} className="mb-4 flex items-center gap-2 rounded-full border border-[color:rgba(214,173,74,0.28)] bg-black/35 px-3 py-1.5 text-[10px] tracking-[0.2em] text-[var(--ln-parchment)] backdrop-blur-md transition hover:border-[var(--ln-gold)]">
              ← LIVING NEXUS
            </button>
            <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--ln-gold)]">Prototype · fictional registry</p>
            <h1 className="mt-2 font-display text-2xl leading-none sm:text-4xl">Spatial Registry</h1>
            <p className="mt-2 text-xs leading-relaxed text-[var(--ln-smoke)]">A visual demonstration only. The 3D environment represents registry relationships; it is not the registry.</p>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button onClick={() => setAiOpen(true)} className="rounded-full border border-[color:rgba(214,173,74,0.24)] bg-black/40 px-3 py-2 text-[10px] tracking-[0.16em] transition hover:border-[var(--ln-gold)]">MY AI</button>
            <button onClick={() => setStudioOpen(true)} className="rounded-full bg-[var(--ln-gold)] px-3 py-2 text-[10px] font-semibold tracking-[0.16em] text-black transition hover:brightness-110">COVER ART STUDIO</button>
          </div>
        </header>

        <aside className="pointer-events-none absolute left-4 top-40 z-10 hidden w-56 sm:block sm:left-7 sm:top-48">
          <div className="pointer-events-auto border-l border-[color:rgba(214,173,74,0.55)] bg-black/25 px-4 py-3 backdrop-blur-sm">
            <Glyph>CREATOR DOMAIN</Glyph>
            <p className="mt-2 font-display text-xl">Jake</p>
            <p className="text-sm text-[var(--ln-smoke)]">Weave & Breathe</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
              <span><strong className="block text-[var(--ln-parchment)]">1</strong><span className="text-[var(--ln-smoke)]">registered work</span></span>
              <span><strong className="block text-[var(--ln-parchment)]">{witnessCount}</strong><span className="text-[var(--ln-smoke)]">witnesses</span></span>
            </div>
          </div>
        </aside>

        <section className="pointer-events-none absolute inset-x-4 bottom-28 z-10 sm:inset-x-auto sm:right-7 sm:bottom-32 sm:w-80">
          <div className="pointer-events-auto border border-[color:rgba(222,197,126,0.25)] bg-[color:rgba(8,8,8,0.82)] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <Glyph>{selected.eyebrow}</Glyph>
            <h2 className="mt-2 font-display text-xl leading-tight">{selected.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ln-smoke)]">{selected.description}</p>
            {selectedNode === "work" && <div className="mt-4 border-t border-white/10 pt-3 text-xs text-[var(--ln-smoke)]"><span className="text-[var(--ln-parchment)]">LN-00017</span> · Version 01 · Registered · {witnessCount} witness{witnessCount === 1 ? "" : "es"}</div>}
            {selectedNode === "register" && <button onClick={register} className="mt-4 w-full border border-[var(--ln-gold)] px-3 py-2 text-xs tracking-[0.18em] text-[var(--ln-gold)] transition hover:bg-[var(--ln-gold)] hover:text-black">SIMULATE REGISTER</button>}
            {selectedNode === "witness" && <button onClick={witness} className="mt-4 w-full border border-[var(--ln-gold)] px-3 py-2 text-xs tracking-[0.18em] text-[var(--ln-gold)] transition hover:bg-[var(--ln-gold)] hover:text-black">SIMULATE WITNESS</button>}
          </div>
        </section>

        <nav className="pointer-events-auto absolute bottom-28 left-4 z-10 flex max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-full border border-white/10 bg-black/45 p-1 backdrop-blur-md sm:bottom-32 sm:left-7">
          {SPATIAL_REGISTRY_MOCK.nodes.map((node) => (
            <button key={node.id} onClick={() => setSelectedNode(node.id)} className={`shrink-0 rounded-full px-3 py-2 text-[9px] tracking-[0.14em] transition ${selectedNode === node.id ? "bg-[var(--ln-gold)] text-black" : "text-[var(--ln-smoke)] hover:text-[var(--ln-parchment)]"}`}>{node.label === "YAHWEH LIGHTS MY WAY" ? "WORK" : node.label}</button>
          ))}
        </nav>

        <section className="pointer-events-auto absolute inset-x-3 bottom-3 z-20 border border-[color:rgba(214,173,74,0.32)] bg-[color:rgba(7,7,7,0.9)] px-4 py-3 backdrop-blur-xl sm:inset-x-7 sm:bottom-6 sm:px-5">
          <div className="flex items-center gap-3">
            <div className={`grid h-12 w-12 shrink-0 place-items-center border border-[color:rgba(214,173,74,0.7)] bg-[radial-gradient(circle_at_65%_35%,#f0d78e,transparent_18%),linear-gradient(145deg,#1f170b,#503312_48%,#070707)] ${coverSelected ? "ring-1 ring-[var(--ln-gold)]" : ""}`}><span className="font-display text-lg text-[var(--ln-gold)]">Y</span></div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-base">Yahweh Lights My Way</p>
              <p className="text-xs text-[var(--ln-smoke)]">Weave & Breathe · LN-00017</p>
              <div className="mt-2 h-px overflow-hidden bg-white/10"><div className="h-full bg-[var(--ln-gold)] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
            </div>
            <span className="hidden font-mono text-[10px] text-[var(--ln-smoke)] sm:block">{Math.floor((progress / 100) * 4).toString().padStart(2, "0")}:{Math.floor((progress * 12) % 60).toString().padStart(2, "0")} / 04:12</span>
            <button onClick={() => setIsPlaying((value) => !value)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--ln-gold)] text-lg text-black transition hover:brightness-110" aria-label={isPlaying ? "Pause fictional track" : "Play fictional track"}>{isPlaying ? "Ⅱ" : "▶"}</button>
          </div>
        </section>

        {registrationNotice && <div className="absolute inset-x-0 top-28 z-20 mx-auto w-fit border border-[var(--ln-gold)] bg-black/85 px-5 py-3 text-center shadow-xl backdrop-blur-md"><Glyph>PROVENANCE EVENT</Glyph><p className="mt-1 font-display text-lg">{registrationNotice}</p><p className="mt-1 text-xs text-[var(--ln-smoke)]">Creator → Work → Registration</p></div>}

        {studioOpen && <div className="fixed inset-0 z-30 grid place-items-center bg-black/75 p-3 backdrop-blur-sm"><section className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto border border-[color:rgba(214,173,74,0.38)] bg-[var(--ln-coal)] p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><Glyph>OPTIONAL CREATOR TOOL · MOCK</Glyph><h2 className="mt-2 font-display text-3xl">Cover Art Studio</h2><p className="mt-2 text-sm text-[var(--ln-smoke)]">Reference Images → Direction → Generation → Feedback → Revision → Final Artwork</p></div><button onClick={() => setStudioOpen(false)} className="text-sm text-[var(--ln-smoke)] hover:text-[var(--ln-parchment)]">CLOSE</button></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((slot) => <div key={slot} className="grid aspect-square place-items-center border border-dashed border-[color:rgba(214,173,74,0.32)] bg-black/20 text-center text-[10px] tracking-[0.14em] text-[var(--ln-smoke)]">REFERENCE<br />{slot}</div>)}</div><label className="mt-5 block text-xs tracking-[0.15em] text-[var(--ln-gold)]">CREATIVE DIRECTION<textarea defaultValue="A quiet nocturnal path illuminated by gold, artistically bound to Yahweh Lights My Way." className="mt-2 min-h-24 w-full border border-white/10 bg-black/35 p-3 text-sm normal-case tracking-normal text-[var(--ln-parchment)] outline-none focus:border-[var(--ln-gold)]" /></label><label className="mt-4 block text-xs tracking-[0.15em] text-[var(--ln-gold)]">FEEDBACK<input className="mt-2 w-full border border-white/10 bg-black/35 p-3 text-sm normal-case tracking-normal text-[var(--ln-parchment)] outline-none focus:border-[var(--ln-gold)]" placeholder="Make the path more intimate and the light warmer" /></label><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => setGenerated(true)} className="bg-[var(--ln-gold)] px-4 py-3 text-xs font-semibold tracking-[0.14em] text-black">GENERATE MOCK</button>{generated && <><div className="h-20 w-20 border border-[var(--ln-gold)] bg-[radial-gradient(circle_at_70%_20%,#f4d98a,transparent_15%),linear-gradient(145deg,#050505,#2e1e0b_45%,#704a1d)]" /><button onClick={() => { setCoverSelected(true); setStudioOpen(false); }} className="border border-[var(--ln-gold)] px-4 py-3 text-xs tracking-[0.14em] text-[var(--ln-gold)]">SELECT AS COVER ART</button></>}</div></section></div>}

        {aiOpen && <div className="fixed inset-0 z-30 grid place-items-center bg-black/75 p-3 backdrop-blur-sm"><section className="w-full max-w-md border border-[color:rgba(214,173,74,0.38)] bg-[var(--ln-coal)] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><Glyph>OPTIONAL CREATOR TOOL · MOCK</Glyph><h2 className="mt-2 font-display text-3xl">My AI</h2></div><button onClick={() => setAiOpen(false)} className="text-sm text-[var(--ln-smoke)]">CLOSE</button></div><div className="mt-6 space-y-4 text-sm"><p><span className="text-[var(--ln-smoke)]">Name</span><br />Orison</p><p><span className="text-[var(--ln-smoke)]">Personality</span><br />Attentive, quiet, creator-directed.</p><p><span className="text-[var(--ln-smoke)]">Creator context</span><br />Weave & Breathe · music work and provenance only.</p></div><button onClick={() => setAiOpen(false)} className="mt-6 border border-[var(--ln-gold)] px-4 py-3 text-xs tracking-[0.14em] text-[var(--ln-gold)]">SAVE MOCK CONFIGURATION</button></section></div>}
      </div>
    </main>
  );
}
