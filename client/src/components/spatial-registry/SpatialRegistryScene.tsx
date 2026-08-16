/**
 * @domain   The Living Graph → Spatial Dashboard → Registry Visualization
 * @impl     React Component — Three.js visualization of a fictional provenance registry
 *
 * Visualization only. If this layer disappeared, the mock registry would still exist.
 * Overview is a constellation. Each pathway is a small 3D environment you enter.
 * Visual language: cyber-celestial wireframes, holographic panes, dark nebula.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  ASSET,
  CAMERA_PRESETS,
  SPATIAL_REGISTRY_MOCK,
  SPATIAL_REGISTRY_NODES_BY_ID,
  type SpatialRegistryNodeId,
  type SpatialView,
} from "@/lib/spatialRegistryMock";

export type SpatialCeremony = "register" | "witness" | null;

export type SpatialSceneHandle = {
  reset: () => void;
  zoom: (factor: number) => void;
};

type SpatialRegistrySceneProps = {
  view: SpatialView;
  selectedNode: SpatialRegistryNodeId;
  witnessCount: number;
  isPlaying: boolean;
  coverArtUrl: string;
  ceremony: SpatialCeremony;
  reducedMotion: boolean;
  onSelect: (nodeId: SpatialRegistryNodeId) => void;
  onHover: (nodeId: SpatialRegistryNodeId | null) => void;
};

type EdgeVisual = {
  from: SpatialRegistryNodeId;
  to: SpatialRegistryNodeId;
  mesh: THREE.Mesh;
  curve: THREE.QuadraticBezierCurve3;
  traveler: THREE.Mesh;
};

const GOLD = 0xd4af37;
const ELECTRIC = 0x29b6f6;
const TEAL = 0x4dd0e1;
const VIOLET = 0xc77dff;

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(212,175,55,0.95)");
  gradient.addColorStop(0.28, "rgba(79,195,247,0.22)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function wire(color: number, opacity = 0.88) {
  return new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity });
}

function geometryFor(id: SpatialRegistryNodeId) {
  switch (id) {
    case "work":
      return new THREE.SphereGeometry(0.18, 16, 16);
    case "profile":
      return new THREE.OctahedronGeometry(0.4, 0);
    case "edit":
      return new THREE.ConeGeometry(0.3, 0.52, 4);
    case "register":
      return new THREE.BoxGeometry(0.46, 0.46, 0.46);
    case "witness":
      return new THREE.SphereGeometry(0.34, 24, 24);
    case "lineage":
      return new THREE.TorusGeometry(0.32, 0.028, 10, 48);
    case "player":
      return new THREE.CylinderGeometry(0.4, 0.4, 0.06, 40);
    default:
      return new THREE.SphereGeometry(0.3, 24, 24);
  }
}

function makeRipples(color: number, count = 5, y = -1.55) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const inner = 0.55 + i * 0.48;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, inner + 0.025, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 - i * 0.07, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = y;
    ring.userData.ripple = i;
    group.add(ring);
  }
  return group;
}

function makeHoloTexture(title: string, rows: [string, string][], accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  ctx.fillStyle = "rgba(6,8,14,0.78)";
  ctx.fillRect(0, 0, 512, 640);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 488, 616);
  ctx.fillStyle = accent;
  ctx.font = "600 28px sans-serif";
  ctx.fillText(title, 40, 70);
  rows.forEach(([key, value], index) => {
    ctx.fillStyle = "rgba(176,176,176,0.85)";
    ctx.font = "16px sans-serif";
    ctx.fillText(key.toUpperCase(), 40, 150 + index * 100);
    ctx.fillStyle = "#ffffff";
    ctx.font = "22px sans-serif";
    ctx.fillText(value, 40, 184 + index * 100);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSilhouetteTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  ctx.fillStyle = "rgba(6,18,22,0.9)";
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4dd0e1";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#4dd0e1";
  ctx.beginPath();
  ctx.arc(64, 44, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(64, 90, 22, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

function makeWireBust(color: number) {
  const group = new THREE.Group();
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 1), wire(color, 0.55));
  head.position.y = 0.88;
  head.scale.set(0.82, 1.1, 0.9);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.3, 6), wire(color, 0.4));
  neck.position.y = 0.3;
  const shoulders = new THREE.Mesh(
    new THREE.TorusGeometry(0.74, 0.016, 8, 28, Math.PI),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
  );
  shoulders.rotation.x = Math.PI / 2;
  shoulders.position.y = 0.12;
  group.add(head, neck, shoulders);
  return group;
}

function makeWaveform(count = 28) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 1, 0.055),
      new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.88 }),
    );
    bar.position.x = (i - count / 2) * 0.11;
    bar.userData.wave = i;
    group.add(bar);
  }
  return group;
}

function makeArc(from: THREE.Vector3, to: THREE.Vector3) {
  const mid = from.clone().lerp(to, 0.5);
  mid.y += from.distanceTo(to) * 0.12;
  return new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
}

function disposeMaterial(material: THREE.Material | THREE.Material[] | undefined) {
  if (!material) return;
  if (Array.isArray(material)) material.forEach((item) => item.dispose());
  else material.dispose();
}

function loadMap(loader: THREE.TextureLoader, url: string) {
  const texture = loader.load(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeLabel(title: string, caption: string, work = false) {
  const wrap = document.createElement("div");
  wrap.className = `sr-node-label-wrap${work ? " is-work" : ""}`;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "sr-node-label";
  button.textContent = title;
  const sub = document.createElement("span");
  sub.className = "sr-node-caption";
  sub.textContent = caption;
  wrap.append(button, sub);
  return { wrap, button, caption: sub };
}

function backdrop(loader: THREE.TextureLoader, url: string, size: number, opacity: number) {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: loadMap(loader, url), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }),
  );
  return plane;
}

export const SpatialRegistryScene = forwardRef<SpatialSceneHandle, SpatialRegistrySceneProps>(function SpatialRegistryScene(
  { view, selectedNode, witnessCount, isPlaying, coverArtUrl, ceremony, reducedMotion, onSelect, onHover },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  const selectedRef = useRef(selectedNode);
  const witnessRef = useRef(witnessCount);
  const playingRef = useRef(isPlaying);
  const coverRef = useRef(coverArtUrl);
  const ceremonyRef = useRef(ceremony);
  const reducedRef = useRef(reducedMotion);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const controlBox = useRef<{ camera: THREE.PerspectiveCamera | null; controls: OrbitControls | null }>({
    camera: null,
    controls: null,
  });

  useImperativeHandle(ref, () => ({
    reset: () => {
      const preset = CAMERA_PRESETS.overview;
      const { camera, controls } = controlBox.current;
      if (!camera || !controls) return;
      camera.position.set(...preset.position);
      controls.target.set(...preset.target);
    },
    zoom: (factor: number) => {
      const { camera, controls } = controlBox.current;
      if (!camera || !controls) return;
      const dir = camera.position.clone().sub(controls.target).multiplyScalar(factor);
      camera.position.copy(controls.target).add(dir);
    },
  }));

  useEffect(() => {
    viewRef.current = view;
    selectedRef.current = selectedNode;
    witnessRef.current = witnessCount;
    playingRef.current = isPlaying;
    coverRef.current = coverArtUrl;
    ceremonyRef.current = ceremony;
    reducedRef.current = reducedMotion;
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
  }, [view, selectedNode, witnessCount, isPlaying, coverArtUrl, ceremony, reducedMotion, onSelect, onHover]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.012);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS.overview.position);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.cssText = "position:absolute;inset:0;pointer-events:none";
    mount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = true;
    controls.minDistance = 3.4;
    controls.maxDistance = 24;
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.maxPolarAngle = Math.PI * 0.78;
    controlBox.current = { camera, controls };

    const registry = new THREE.Group();
    scene.add(registry);
    scene.add(new THREE.AmbientLight(0xbfd7ea, 0.32));
    const goldLight = new THREE.PointLight(GOLD, 18, 28, 2);
    goldLight.position.set(0.4, 4.2, 5.4);
    scene.add(goldLight);
    const cyanLight = new THREE.PointLight(ELECTRIC, 10, 22, 2);
    cyanLight.position.set(5.5, -1.2, 4);
    scene.add(cyanLight);
    const violetLight = new THREE.PointLight(VIOLET, 8, 18, 2);
    violetLight.position.set(-5.2, 2.4, 3.2);
    scene.add(violetLight);

    const dustGeometry = new THREE.BufferGeometry();
    const dust = new Float32Array(720 * 3);
    for (let i = 0; i < 720; i += 1) {
      dust[i * 3] = (Math.random() - 0.5) * 32;
      dust[i * 3 + 1] = (Math.random() - 0.4) * 16;
      dust[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    const dustPoints = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: 0xe8d5a3, size: 0.022, transparent: true, opacity: 0.4, depthWrite: false }),
    );
    scene.add(dustPoints);

    const glowTexture = makeGlowTexture();
    const silhouetteTexture = makeSilhouetteTexture();
    const loader = new THREE.TextureLoader();
    const objectById = new Map<SpatialRegistryNodeId, THREE.Mesh>();
    const wrapsById = new Map<SpatialRegistryNodeId, HTMLDivElement>();
    const captionById = new Map<SpatialRegistryNodeId, HTMLSpanElement>();
    const pickables: THREE.Object3D[] = [];
    const overviewExtras: THREE.Object3D[] = [];

    SPATIAL_REGISTRY_MOCK.nodes.forEach((node) => {
      const isWork = node.id === "work";
      const mesh = new THREE.Mesh(geometryFor(node.id), wire(new THREE.Color(node.color).getHex(), isWork ? 0.2 : 0.92));
      mesh.position.set(...node.position);
      mesh.userData.nodeId = node.id;
      objectById.set(node.id, mesh);
      pickables.push(mesh);
      registry.add(mesh);

      if (node.id === "edit") {
        [0, 1, 2].forEach((index) => {
          const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.1, 0), wire(ELECTRIC, 0.7));
          shard.position.set(0.28 + index * 0.08, 0.18 - index * 0.1, 0.16);
          mesh.add(shard);
        });
      }
      if (node.id === "witness") {
        const iris = new THREE.Mesh(
          new THREE.TorusGeometry(0.16, 0.012, 8, 32),
          new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.9 }),
        );
        iris.rotation.x = Math.PI / 2;
        mesh.add(iris);
      }
      if (node.id === "register") {
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.62, 0.62, 0.62)), new THREE.LineBasicMaterial({ color: GOLD })));
      }

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, opacity: isWork ? 0.5 : 0.32, color: node.color }),
      );
      sprite.position.copy(mesh.position);
      sprite.scale.setScalar(isWork ? 4.1 : 1.7);
      sprite.userData.glow = isWork ? 4.1 : 1.7;
      registry.add(sprite);
      overviewExtras.push(sprite);

      const emblem = new THREE.Mesh(
        new THREE.PlaneGeometry(isWork ? 0.01 : 0.62, isWork ? 0.01 : 0.62),
        new THREE.MeshBasicMaterial({
          map: loadMap(loader, ASSET.pathways[node.id]),
          transparent: true,
          opacity: isWork ? 0 : 0.55,
          depthWrite: false,
        }),
      );
      emblem.position.copy(mesh.position);
      registry.add(emblem);
      overviewExtras.push(emblem);

      const { wrap, button, caption } = makeLabel(isWork ? node.label : node.shortLabel, node.caption, isWork);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(node.id);
      });
      wrap.addEventListener("pointerenter", () => onHoverRef.current(node.id));
      wrap.addEventListener("pointerleave", () => onHoverRef.current(null));
      wrapsById.set(node.id, wrap);
      captionById.set(node.id, caption);
      const labelObject = new CSS2DObject(wrap);
      labelObject.position.copy(mesh.position);
      labelObject.position.y += isWork ? 1.85 : 0.78;
      registry.add(labelObject);
      overviewExtras.push(labelObject);
    });

    const workPos = new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID.work.position);
    const workShell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.38, 2), wire(GOLD, 0.7));
    workShell.position.copy(workPos);
    registry.add(workShell);
    const workRingA = new THREE.Mesh(
      new THREE.TorusGeometry(1.58, 0.012, 8, 80),
      new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 }),
    );
    workRingA.position.copy(workPos);
    workRingA.rotation.x = Math.PI / 2;
    registry.add(workRingA);
    const workRingB = new THREE.Mesh(
      new THREE.TorusGeometry(1.82, 0.008, 8, 80),
      new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.4 }),
    );
    workRingB.position.copy(workPos);
    workRingB.rotation.x = Math.PI / 3;
    registry.add(workRingB);
    const coverMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.92),
      new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.98, side: THREE.DoubleSide }),
    );
    coverMesh.position.copy(workPos);
    coverMesh.userData.nodeId = "work";
    pickables.push(coverMesh);
    registry.add(coverMesh);
    let appliedCover = "";
    let coverTexture: THREE.Texture | null = null;
    const workRipples = makeRipples(GOLD, 4, workPos.y - 1.55);
    registry.add(workRipples);

    const workChamber = new THREE.Group();
    workChamber.visible = false;
    const workBackdrop = backdrop(loader, ASSET.pathways.work, 4.6, 0.42);
    workBackdrop.position.set(0, 0.7, -2.4);
    workChamber.add(workBackdrop);
    scene.add(workChamber);

    const edges: EdgeVisual[] = [];
    SPATIAL_REGISTRY_MOCK.edges.forEach(([from, to]) => {
      const curve = makeArc(
        new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID[from].position),
        new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID[to].position),
      );
      const destColor = new THREE.Color(SPATIAL_REGISTRY_NODES_BY_ID[to].color).getHex();
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, 0.01, 6, false),
        new THREE.MeshBasicMaterial({ color: destColor, transparent: true, opacity: 0.45 }),
      );
      registry.add(mesh);
      const traveler = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), new THREE.MeshBasicMaterial({ color: destColor }));
      registry.add(traveler);
      edges.push({ from, to, mesh, curve, traveler });
      overviewExtras.push(mesh, traveler);
    });

    const chambers = new THREE.Group();
    scene.add(chambers);

    const creatorChamber = new THREE.Group();
    creatorChamber.visible = false;
    const creatorField = backdrop(loader, ASSET.pathways.profile, 3.4, 0.5);
    creatorField.position.set(-2.4, 1.05, -1.2);
    creatorChamber.add(creatorField);
    const octa = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), wire(VIOLET, 0.95));
    octa.position.set(0.15, 0.85, 0.2);
    creatorChamber.add(octa);
    const bust = makeWireBust(VIOLET);
    bust.position.set(-1.85, 0.15, 0.15);
    creatorChamber.add(bust);
    creatorChamber.add(makeRipples(VIOLET, 5, -1.45));
    SPATIAL_REGISTRY_MOCK.creatorStages.forEach((stage, index) => {
      const angle = -0.35 + index * 0.52;
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), wire(VIOLET, 0.9));
      node.position.set(1.15 + Math.cos(angle) * 1.15, 0.25 + index * 0.38, Math.sin(angle) * 0.9);
      creatorChamber.add(node);
      const { wrap } = makeLabel(stage.label, stage.caption);
      wrap.style.pointerEvents = "none";
      const label = new CSS2DObject(wrap);
      label.position.copy(node.position);
      label.position.y += 0.28;
      creatorChamber.add(label);
    });
    chambers.add(creatorChamber);

    const editChamber = new THREE.Group();
    editChamber.visible = false;
    const editField = backdrop(loader, ASSET.pathways.edit, 3.6, 0.38);
    editField.position.set(-0.2, 1.1, -2.2);
    editChamber.add(editField);
    const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.15, 4), wire(ELECTRIC, 0.95));
    pyramid.position.set(0, 0.55, 0.15);
    editChamber.add(pyramid);
    editChamber.add(makeRipples(ELECTRIC, 4, -1.45));
    SPATIAL_REGISTRY_MOCK.versions.forEach((version, index) => {
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(1.15, 0.72),
        new THREE.MeshBasicMaterial({
          map: makeHoloTexture(version.label, [["State", version.caption], ["Layer", `0${index + 1}`]], "#29b6f6"),
          transparent: true,
          opacity: version.state === "registered" ? 0.95 : version.state === "forming" ? 0.7 : 0.42,
          side: THREE.DoubleSide,
        }),
      );
      panel.position.set(1.55 + index * 0.15, 0.35 + index * 0.55, -0.35 - index * 0.55);
      panel.rotation.y = -0.35;
      editChamber.add(panel);
      const { wrap } = makeLabel(version.label, version.caption);
      wrap.style.pointerEvents = "none";
      const label = new CSS2DObject(wrap);
      label.position.copy(panel.position);
      label.position.y += 0.5;
      editChamber.add(label);
      for (let shard = 0; shard < 5; shard += 1) {
        const fragment = new THREE.Mesh(new THREE.TetrahedronGeometry(0.09, 0), wire(ELECTRIC, 0.75));
        fragment.position.set(Math.cos(shard + index) * (0.9 + index * 0.2), 0.4 + Math.sin(shard * 1.4) * 0.55, Math.sin(shard + index) * 0.7);
        fragment.userData.orbit = { index, shard };
        editChamber.add(fragment);
      }
    });
    chambers.add(editChamber);

    const registerChamber = new THREE.Group();
    registerChamber.visible = false;
    const registerField = backdrop(loader, ASSET.pathways.register, 3.8, 0.4);
    registerField.position.set(0, 1.05, -2.3);
    registerChamber.add(registerField);
    const innerCube = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), wire(GOLD, 0.95));
    innerCube.position.set(0, 0.7, 0.2);
    const outerCube = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.45, 1.45), wire(GOLD, 0.55));
    outerCube.position.copy(innerCube.position);
    registerChamber.add(innerCube, outerCube);
    registerChamber.add(makeRipples(GOLD, 5, -1.5));
    const paneSpecs: { title: string; rows: [string, string][]; pos: [number, number, number] }[] = [
      { title: "WID", rows: [["Identifier", SPATIAL_REGISTRY_MOCK.work.wid], ["Work", SPATIAL_REGISTRY_MOCK.work.title]], pos: [-2.15, 1.15, 0.4] },
      { title: "RECORD", rows: [["Date", "Aug 15, 2026"], ["Time", "11:42 AM"]], pos: [2.15, 1.15, 0.4] },
      { title: "STATUS", rows: [["Event", SPATIAL_REGISTRY_MOCK.registrationEvent.status], ["Creator", "Jake"]], pos: [0, 2.05, -0.15] },
    ];
    const panes = paneSpecs.map((spec) => {
      const pane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.35, 1.55),
        new THREE.MeshBasicMaterial({
          map: makeHoloTexture(spec.title, spec.rows, "#d4af37"),
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        }),
      );
      pane.position.set(...spec.pos);
      registerChamber.add(pane);
      return pane;
    });
    const verified = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.42),
      new THREE.MeshBasicMaterial({
        map: makeHoloTexture("VERIFIED", [["Proof", "Registration sealed"]], "#e8d5a3"),
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      }),
    );
    verified.position.set(0, -0.35, 0.9);
    registerChamber.add(verified);
    const { wrap: widWrap } = makeLabel(SPATIAL_REGISTRY_MOCK.work.wid, "Registration created", true);
    widWrap.style.pointerEvents = "none";
    const widLabel = new CSS2DObject(widWrap);
    widLabel.position.set(0, 2.35, 0.4);
    registerChamber.add(widLabel);
    chambers.add(registerChamber);

    const witnessChamber = new THREE.Group();
    witnessChamber.visible = false;
    const witnessField = backdrop(loader, ASSET.pathways.witness, 3.6, 0.38);
    witnessField.position.set(2.2, 1.05, -1.8);
    witnessChamber.add(witnessField);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 32), wire(TEAL, 0.55));
    eye.position.set(0, 0.85, 0);
    witnessChamber.add(eye);
    const eyeCore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.85 }));
    eyeCore.position.copy(eye.position);
    witnessChamber.add(eyeCore);
    const eyeRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.012, 8, 64), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.8 }));
    eyeRing.position.copy(eye.position);
    eyeRing.rotation.x = Math.PI / 2.4;
    witnessChamber.add(eyeRing);
    const eventCube = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), wire(GOLD, 0.95));
    eventCube.position.set(0, 1.85, 1.05);
    witnessChamber.add(eventCube);
    const { wrap: eventWrap } = makeLabel("EVENT", SPATIAL_REGISTRY_MOCK.registrationEvent.id);
    eventWrap.style.pointerEvents = "none";
    const eventLabel = new CSS2DObject(eventWrap);
    eventLabel.position.copy(eventCube.position);
    eventLabel.position.y += 0.32;
    witnessChamber.add(eventLabel);
    const witnessLights: THREE.Mesh[] = [];
    const witnessLines: THREE.Line[] = [];
    const ensureWitnesses = (count: number) => {
      while (witnessLights.length < count) {
        const index = witnessLights.length;
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), wire(TEAL, 0.7));
        const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: silhouetteTexture, transparent: true, depthWrite: false }));
        icon.scale.setScalar(0.42);
        light.add(icon);
        witnessChamber.add(light);
        witnessLights.push(light);
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), eventCube.position.clone(), workPos.clone()]),
          new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.7 }),
        );
        witnessChamber.add(line);
        witnessLines.push(line);
        const person = SPATIAL_REGISTRY_MOCK.witnesses[index];
        const { wrap } = makeLabel(person?.name ?? `Witness ${index + 1}`, person?.at ?? "Attestation");
        wrap.style.pointerEvents = "none";
        const label = new CSS2DObject(wrap);
        light.add(label);
        label.position.set(0, 0.38, 0);
      }
      witnessLights.forEach((light, index) => {
        const angle = (index / Math.max(count, 1)) * Math.PI * 2 - 0.4;
        light.position.set(Math.cos(angle) * 2.4, 0.45 + (index % 2) * 0.22, Math.sin(angle) * 2.4);
        const line = witnessLines[index];
        line.geometry.dispose();
        line.geometry = new THREE.BufferGeometry().setFromPoints([light.position.clone(), eventCube.position.clone(), workPos.clone()]);
        light.visible = index < count;
        line.visible = index < count;
      });
    };
    chambers.add(witnessChamber);

    const lineageChamber = new THREE.Group();
    lineageChamber.visible = false;
    const lineageBackdrop = backdrop(loader, ASSET.pathways.lineage, 9.2, 0.32);
    lineageBackdrop.position.set(0, 1.6, -5.2);
    lineageChamber.add(lineageBackdrop);
    [2.2, 3.4, 4.6, 5.8].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 8, 96),
        new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.35 + index * 0.08 }),
      );
      ring.rotation.x = Math.PI / 2.15;
      ring.position.set(0, -0.2, 0);
      lineageChamber.add(ring);
    });
    SPATIAL_REGISTRY_MOCK.lineageSequence.forEach((step, index) => {
      const angle = -Math.PI / 2 + index * 0.55;
      const radius = 2.3 + index * 0.85;
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.16 + index * 0.02, 16, 16), wire(GOLD, 0.95));
      node.position.set(Math.cos(angle) * radius, 0.35 + index * 0.15, Math.sin(angle) * radius * 0.35);
      lineageChamber.add(node);
      const { wrap } = makeLabel(step.label, step.caption);
      wrap.style.pointerEvents = "none";
      const label = new CSS2DObject(wrap);
      label.position.copy(node.position);
      label.position.y += 0.38;
      lineageChamber.add(label);
    });
    SPATIAL_REGISTRY_MOCK.derivedArtifacts.forEach((artifact, index) => {
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), wire(ELECTRIC, 0.85));
      shard.position.set(4.8 + index * 0.55, 1.15, 1.1);
      lineageChamber.add(shard);
      const { wrap } = makeLabel(artifact.title, artifact.kind);
      wrap.style.pointerEvents = "none";
      const label = new CSS2DObject(wrap);
      label.position.copy(shard.position);
      label.position.y += 0.28;
      lineageChamber.add(label);
    });
    chambers.add(lineageChamber);

    const playerChamber = new THREE.Group();
    playerChamber.visible = false;
    const playerField = backdrop(loader, ASSET.pathways.player, 4.2, 0.4);
    playerField.position.set(0, 0.2, -2.4);
    playerChamber.add(playerField);
    const field = new THREE.Mesh(
      new THREE.CircleGeometry(2.6, 64),
      new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
    );
    field.rotation.x = -Math.PI / 2;
    field.position.set(0, -1.42, 0);
    playerChamber.add(field);
    const playerDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 48), wire(ELECTRIC, 0.9));
    playerDisc.position.set(0, -1.28, 0);
    playerChamber.add(playerDisc);
    const beams: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i += 1) {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 1.8, 6),
        new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.35 }),
      );
      const angle = (i / 8) * Math.PI * 2;
      beam.position.set(Math.cos(angle) * 0.55, -0.35, Math.sin(angle) * 0.55);
      playerChamber.add(beam);
      beams.push(beam);
    }
    const waveform = makeWaveform();
    waveform.position.set(0, 0.55, 0.2);
    playerChamber.add(waveform);
    const play = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.28, 3),
      new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.95 }),
    );
    play.rotation.z = -Math.PI / 2;
    play.position.set(0, 1.45, 0.3);
    playerChamber.add(play);
    const rewind = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 3), new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.7 }));
    rewind.rotation.z = Math.PI / 2;
    rewind.position.set(-0.55, 1.45, 0.3);
    const forward = rewind.clone();
    forward.rotation.z = -Math.PI / 2;
    forward.position.set(0.55, 1.45, 0.3);
    playerChamber.add(rewind, forward);
    const playerRings: THREE.Mesh[] = [];
    [1.15, 1.7, 2.3].forEach((radius) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.01, 8, 80),
        new THREE.MeshBasicMaterial({ color: ELECTRIC, transparent: true, opacity: 0.5 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, -1.38, 0);
      playerChamber.add(ring);
      playerRings.push(ring);
    });
    chambers.add(playerChamber);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerState = { x: 0, y: 0, dragged: false };
    let hovered: SpatialRegistryNodeId | null = null;
    const hitNode = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return (raycaster.intersectObjects(pickables, false)[0]?.object.userData.nodeId as SpatialRegistryNodeId | undefined) ?? null;
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerState.x = event.clientX;
      pointerState.y = event.clientY;
      pointerState.dragged = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - pointerState.x, event.clientY - pointerState.y) > 5) pointerState.dragged = true;
      const nodeId = hitNode(event);
      if (nodeId !== hovered) {
        hovered = nodeId;
        onHoverRef.current(nodeId);
        renderer.domElement.style.cursor = nodeId ? "pointer" : "grab";
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      renderer.domElement.style.cursor = "grab";
      if (pointerState.dragged) return;
      const nodeId = hitNode(event);
      if (nodeId) onSelectRef.current(nodeId);
    };
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      const w = Math.max(width, 1);
      const h = Math.max(height, 1);
      renderer.setSize(w, h, false);
      labelRenderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const desiredPos = new THREE.Vector3();
    const desiredTarget = new THREE.Vector3();
    let frame = 0;
    let animationFrame = 0;
    let seal = 0;
    const billboards = [coverMesh, creatorField, editField, registerField, witnessField, playerField, workBackdrop, lineageBackdrop, ...panes, verified];

    const render = () => {
      frame += 1;
      const reduced = reducedRef.current;
      const currentView = viewRef.current;
      const selected = selectedRef.current;
      const playing = playingRef.current;
      const entered = currentView !== "overview";
      const preset = CAMERA_PRESETS[currentView];
      desiredPos.set(...preset.position);
      desiredTarget.set(...preset.target);
      if (reduced) {
        camera.position.copy(desiredPos);
        controls.target.copy(desiredTarget);
      } else {
        camera.position.lerp(desiredPos, 0.045);
        controls.target.lerp(desiredTarget, 0.045);
      }

      objectById.forEach((mesh, id) => {
        const show = currentView === "overview" || currentView === "lineage" || id === "work" || id === currentView;
        mesh.visible = show;
        const material = mesh.material as THREE.MeshBasicMaterial;
        material.opacity = id === selected || id === "work" ? (playing && id === "work" ? 1 : 0.95) : 0.7;
      });
      overviewExtras.forEach((object) => {
        object.visible = currentView === "overview" || currentView === "lineage";
        if (object.userData.glow) {
          const base = object.userData.glow as number;
          object.scale.setScalar(playing ? base * (1 + Math.sin(frame * 0.08) * 0.08) : base);
        }
      });
      wrapsById.forEach((wrap, id) => {
        wrap.style.opacity = objectById.get(id)?.visible ? "1" : "0";
        wrap.classList.toggle("is-active", id === selected);
      });
      const witnessCaption = captionById.get("witness");
      if (witnessCaption) witnessCaption.textContent = `${witnessRef.current} Witnesses`;

      workChamber.visible = currentView === "work";
      creatorChamber.visible = currentView === "profile";
      editChamber.visible = currentView === "edit";
      registerChamber.visible = currentView === "register";
      witnessChamber.visible = currentView === "witness";
      lineageChamber.visible = currentView === "lineage";
      playerChamber.visible = currentView === "player";

      if (coverRef.current !== appliedCover) {
        appliedCover = coverRef.current;
        coverTexture?.dispose();
        coverTexture = loadMap(loader, appliedCover);
        const material = coverMesh.material as THREE.MeshBasicMaterial;
        material.map = coverTexture;
        material.needsUpdate = true;
      }
      billboards.forEach((board) => board.lookAt(camera.position));

      edges.forEach((edge, index) => {
        const material = edge.mesh.material as THREE.MeshBasicMaterial;
        const hot = edge.from === selected || edge.to === selected || currentView === "lineage";
        material.opacity = entered && currentView !== "lineage" ? 0.12 : hot ? 0.9 : 0.4;
        if (!reduced) edge.traveler.position.copy(edge.curve.getPointAt((frame * 0.004 + index * 0.14) % 1));
        edge.mesh.visible = currentView === "overview" || currentView === "lineage";
        edge.traveler.visible = edge.mesh.visible && !reduced;
      });

      const resonance = playing ? 1 + Math.sin(frame * 0.12) * 0.045 : 1;
      workShell.scale.setScalar((currentView === "work" || currentView === "player" ? 1.1 : 1) * resonance);
      workRipples.children.forEach((child, index) => {
        const pulse = playing ? 1 + Math.sin(frame * 0.05 + index) * 0.04 : 1;
        child.scale.set(pulse, pulse, 1);
      });
      if (!reduced) {
        workShell.rotation.y += playing ? 0.006 : 0.002;
        workRingA.rotation.z += playing ? 0.016 : 0.003;
        workRingB.rotation.y += playing ? 0.01 : 0.002;
        octa.rotation.y += 0.006;
        pyramid.rotation.y += 0.004;
        eye.rotation.y += 0.003;
        eyeRing.rotation.z += 0.004;
        dustPoints.rotation.y += playing ? 0.00055 : 0.00028;
        (dustPoints.material as THREE.PointsMaterial).opacity = playing ? 0.62 : 0.4;
        editChamber.children.forEach((child) => {
          if (child.userData.orbit) {
            const { index, shard } = child.userData.orbit as { index: number; shard: number };
            child.rotation.x += 0.012;
            child.rotation.y += 0.008;
            child.position.y += Math.sin(frame * 0.03 + shard) * 0.0014 * (index + 1);
          }
        });
      }

      const closing = currentView === "register" || ceremonyRef.current === "register";
      seal = reduced ? (closing ? 1 : 0) : seal + ((closing ? 1 : 0) - seal) * 0.04;
      innerCube.rotation.y = THREE.MathUtils.lerp(-0.55, 0.12, seal);
      outerCube.rotation.y = THREE.MathUtils.lerp(0.55, -0.12, seal);
      outerCube.scale.setScalar(THREE.MathUtils.lerp(1.18, 1.02, seal));
      (verified.material as THREE.MeshBasicMaterial).opacity = 0.15 + seal * 0.8;
      widWrap.style.opacity = String(0.25 + seal * 0.75);

      if (witnessChamber.visible) ensureWitnesses(witnessRef.current);
      playerDisc.scale.setScalar(playing ? 1 + Math.sin(frame * 0.1) * 0.04 : 1);
      playerRings.forEach((ring, index) => {
        const pulse = playing ? 1 + Math.sin(frame * 0.08 + index) * 0.06 : 1;
        ring.scale.set(pulse, pulse, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = playing ? 0.7 : 0.32;
      });
      beams.forEach((beam, index) => {
        (beam.material as THREE.MeshBasicMaterial).opacity = playing ? 0.35 + Math.sin(frame * 0.1 + index) * 0.2 : 0.12;
      });
      waveform.children.forEach((child) => {
        const i = child.userData.wave as number;
        const height = playing ? 0.25 + Math.abs(Math.sin(frame * 0.12 + i * 0.45)) * 0.9 : 0.18;
        child.scale.y = height;
      });

      goldLight.intensity = playing ? 26 : 16;
      cyanLight.intensity = playing ? 14 : 10;
      violetLight.intensity = currentView === "profile" ? 16 : 8;
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      animationFrame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      glowTexture.dispose();
      silhouetteTexture.dispose();
      dustGeometry.dispose();
      coverTexture?.dispose();
      wrapsById.forEach((wrap) => wrap.remove());
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        disposeMaterial(mesh.material as THREE.Material | THREE.Material[] | undefined);
      });
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0"
      role="application"
      aria-label="Enter a pathway in the fictional spatial registry. Drag to look around. Select a node to enter its environment."
    />
  );
});
