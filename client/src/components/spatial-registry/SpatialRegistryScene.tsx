/**
 * @domain   The Living Graph → Spatial Dashboard → Registry Visualization
 * @impl     React Component — Three.js visualization of a fictional provenance registry
 *
 * Visualization only. If this layer disappeared, the mock registry would still exist.
 * Overview is a constellation. Each pathway is a small 3D environment you enter.
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

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(212,175,55,0.95)");
  gradient.addColorStop(0.3, "rgba(79,195,247,0.22)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function geometryFor(id: SpatialRegistryNodeId) {
  switch (id) {
    case "work":
      return new THREE.SphereGeometry(0.22, 20, 20);
    case "profile":
      return new THREE.OctahedronGeometry(0.36, 0);
    case "edit":
      return new THREE.IcosahedronGeometry(0.34, 0);
    case "register":
      return new THREE.BoxGeometry(0.48, 0.48, 0.48);
    case "witness":
      return new THREE.SphereGeometry(0.34, 32, 32);
    case "lineage":
      return new THREE.TorusGeometry(0.32, 0.05, 12, 48);
    case "player":
      return new THREE.CylinderGeometry(0.4, 0.4, 0.07, 40);
    default:
      return new THREE.SphereGeometry(0.3, 24, 24);
  }
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
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.014);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS.overview.position);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
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
    scene.add(new THREE.AmbientLight(0xbfd7ea, 0.4));
    const goldLight = new THREE.PointLight(0xd4af37, 20, 28, 2);
    goldLight.position.set(0.4, 4.2, 5.4);
    scene.add(goldLight);
    const cyanLight = new THREE.PointLight(0x4fc3f7, 11, 22, 2);
    cyanLight.position.set(5.5, -1.2, 4);
    scene.add(cyanLight);

    const dustGeometry = new THREE.BufferGeometry();
    const dust = new Float32Array(640 * 3);
    for (let i = 0; i < 640; i += 1) {
      dust[i * 3] = (Math.random() - 0.5) * 32;
      dust[i * 3 + 1] = (Math.random() - 0.4) * 16;
      dust[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    const dustPoints = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: 0x9fd9f5, size: 0.024, transparent: true, opacity: 0.42, depthWrite: false }),
    );
    scene.add(dustPoints);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(11, 72),
      new THREE.MeshStandardMaterial({
        color: 0x070707,
        metalness: 0.88,
        roughness: 0.22,
        transparent: true,
        opacity: 0.42,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.55;
    scene.add(floor);

    const glowTexture = makeGlowTexture();
    const loader = new THREE.TextureLoader();
    const objectById = new Map<SpatialRegistryNodeId, THREE.Mesh>();
    const wrapsById = new Map<SpatialRegistryNodeId, HTMLDivElement>();
    const captionById = new Map<SpatialRegistryNodeId, HTMLSpanElement>();
    const pickables: THREE.Object3D[] = [];
    const overviewExtras: THREE.Object3D[] = [];

    SPATIAL_REGISTRY_MOCK.nodes.forEach((node) => {
      const isWork = node.id === "work";
      const mesh = new THREE.Mesh(
        geometryFor(node.id),
        new THREE.MeshStandardMaterial({
          color: node.color,
          emissive: node.color,
          emissiveIntensity: isWork ? 0.6 : 0.4,
          roughness: 0.28,
          metalness: 0.6,
        }),
      );
      mesh.position.set(...node.position);
      if (node.id === "profile") mesh.scale.set(1, 1.85, 1);
      mesh.userData.nodeId = node.id;
      objectById.set(node.id, mesh);
      pickables.push(mesh);
      registry.add(mesh);

      if (node.id === "edit") {
        [0, 1, 2].forEach((index) => {
          const shard = new THREE.Mesh(
            new THREE.TetrahedronGeometry(0.12, 0),
            new THREE.MeshStandardMaterial({ color: 0xc9b896, emissive: 0x8aa8b8, emissiveIntensity: 0.4, roughness: 0.35 }),
          );
          shard.position.set(0.28 + index * 0.08, 0.22 - index * 0.12, 0.18);
          mesh.add(shard);
        });
      }
      if (node.id === "witness") {
        const iris = new THREE.Mesh(
          new THREE.TorusGeometry(0.16, 0.018, 8, 32),
          new THREE.MeshBasicMaterial({ color: 0xf0d78a }),
        );
        iris.rotation.x = Math.PI / 2;
        mesh.add(iris);
      }

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, opacity: isWork ? 0.52 : 0.3, color: node.color }),
      );
      sprite.position.copy(mesh.position);
      sprite.scale.setScalar(isWork ? 4.1 : 1.65);
      sprite.userData.glow = isWork ? 4.1 : 1.65;
      registry.add(sprite);
      overviewExtras.push(sprite);

      const emblem = new THREE.Mesh(
        new THREE.PlaneGeometry(isWork ? 0.01 : 0.7, isWork ? 0.01 : 0.7),
        new THREE.MeshBasicMaterial({
          map: loadMap(loader, ASSET.pathways[node.id]),
          transparent: true,
          opacity: isWork ? 0 : 0.92,
          depthWrite: false,
        }),
      );
      emblem.position.copy(mesh.position);
      emblem.position.y += isWork ? 0 : 0.02;
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
    const workShell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.32, 1),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, wireframe: true, transparent: true, opacity: 0.62 }),
    );
    workShell.position.copy(workPos);
    registry.add(workShell);
    const workRingA = new THREE.Mesh(
      new THREE.TorusGeometry(1.52, 0.018, 8, 80),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.85, metalness: 0.8, roughness: 0.16 }),
    );
    workRingA.position.copy(workPos);
    workRingA.rotation.x = Math.PI / 2;
    registry.add(workRingA);
    const workRingB = new THREE.Mesh(
      new THREE.TorusGeometry(1.78, 0.012, 8, 80),
      new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.55 }),
    );
    workRingB.position.copy(workPos);
    workRingB.rotation.x = Math.PI / 3;
    registry.add(workRingB);
    const workCoreMap = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 1.05),
      new THREE.MeshBasicMaterial({ map: loadMap(loader, ASSET.pathways.work), transparent: true, side: THREE.DoubleSide }),
    );
    workCoreMap.position.copy(workPos);
    workCoreMap.userData.nodeId = "work";
    pickables.push(workCoreMap);
    registry.add(workCoreMap);
    const coverMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.72),
      new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.96, side: THREE.DoubleSide }),
    );
    coverMesh.position.copy(workPos);
    coverMesh.position.z += 0.04;
    coverMesh.userData.nodeId = "work";
    pickables.push(coverMesh);
    registry.add(coverMesh);
    let appliedCover = "";
    let coverTexture: THREE.Texture | null = null;
    const workPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.28, 0.16, 48),
      new THREE.MeshStandardMaterial({ color: 0x14110c, metalness: 0.7, roughness: 0.35, emissive: 0xd4af37, emissiveIntensity: 0.08 }),
    );
    workPedestal.position.copy(workPos);
    workPedestal.position.y = -1.05;
    registry.add(workPedestal);
    const workCrystals: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i += 1) {
      const crystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.1 + (i % 3) * 0.05, 0),
        new THREE.MeshStandardMaterial({
          color: 0xc9b896,
          emissive: 0xd4af37,
          emissiveIntensity: 0.22,
          transparent: true,
          opacity: 0.78,
          roughness: 0.18,
          metalness: 0.45,
        }),
      );
      const angle = (i / 8) * Math.PI * 2;
      crystal.position.set(workPos.x + Math.cos(angle) * 2.05, -0.72, workPos.z + Math.sin(angle) * 2.05);
      crystal.userData.baseY = crystal.position.y;
      registry.add(crystal);
      workCrystals.push(crystal);
    }

    const edges: EdgeVisual[] = [];
    SPATIAL_REGISTRY_MOCK.edges.forEach(([from, to]) => {
      const curve = makeArc(
        new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID[from].position),
        new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID[to].position),
      );
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, 0.013, 6, false),
        new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.5 }),
      );
      registry.add(mesh);
      const traveler = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x9be7ff }),
      );
      registry.add(traveler);
      edges.push({ from, to, mesh, curve, traveler });
      overviewExtras.push(mesh, traveler);
    });

    const chambers = new THREE.Group();
    scene.add(chambers);

    const creatorChamber = new THREE.Group();
    creatorChamber.visible = false;
    const creatorField = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 2.6),
      new THREE.MeshBasicMaterial({ map: loadMap(loader, ASSET.pathways.profile), transparent: true, side: THREE.DoubleSide }),
    );
    creatorField.position.set(-2.15, 0.95, -0.2);
    creatorChamber.add(creatorField);
    const portrait = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 48),
      new THREE.MeshBasicMaterial({ map: loadMap(loader, ASSET.portrait), side: THREE.DoubleSide }),
    );
    portrait.position.set(-2.15, 0.95, 0.05);
    creatorChamber.add(portrait);
    SPATIAL_REGISTRY_MOCK.creatorStages.forEach((stage, index) => {
      const angle = -0.4 + index * 0.55;
      const node = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshStandardMaterial({ color: 0xc9b896, emissive: 0xd4af37, emissiveIntensity: 0.45, metalness: 0.55, roughness: 0.3 }),
      );
      node.position.set(-0.35 + Math.cos(angle) * 1.7, 0.35 + index * 0.35, Math.sin(angle) * 1.1);
      creatorChamber.add(node);
      const { wrap } = makeLabel(stage.label, stage.caption);
      wrap.style.pointerEvents = "none";
      const label = new CSS2DObject(wrap);
      label.position.copy(node.position);
      label.position.y += 0.32;
      creatorChamber.add(label);
    });
    SPATIAL_REGISTRY_MOCK.creatorWorks.forEach((item, index) => {
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 28),
        new THREE.MeshStandardMaterial({
          color: index === 0 ? 0xd4af37 : 0x8aa8b8,
          emissive: index === 0 ? 0xd4af37 : 0x4fc3f7,
          emissiveIntensity: 0.4,
          metalness: 0.55,
          roughness: 0.32,
        }),
      );
      disc.position.set(1.15, 0.15 + index * 0.42, 0.35);
      disc.rotation.y = -0.35;
      creatorChamber.add(disc);
      const { wrap } = makeLabel(item.title, `${item.status}${item.wid !== "—" ? ` · ${item.wid}` : ""}`);
      wrap.style.pointerEvents = "none";
      const label = new CSS2DObject(wrap);
      label.position.copy(disc.position);
      label.position.x += 0.55;
      creatorChamber.add(label);
    });
    chambers.add(creatorChamber);

    const editChamber = new THREE.Group();
    editChamber.visible = false;
    SPATIAL_REGISTRY_MOCK.versions.forEach((version, index) => {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.35 - index * 0.12, 1.35 - index * 0.12),
        new THREE.MeshBasicMaterial({
          map: loadMap(loader, ASSET.pathways.edit),
          transparent: true,
          opacity: version.state === "registered" ? 0.95 : version.state === "forming" ? 0.62 : 0.32,
          side: THREE.DoubleSide,
        }),
      );
      plane.position.set(0.35 + index * 0.85, 0.55 + index * 0.22, -0.2 - index * 1.15);
      plane.rotation.y = -0.18 * index;
      editChamber.add(plane);
      const { wrap } = makeLabel(version.label, version.caption);
      wrap.style.pointerEvents = "none";
      const label = new CSS2DObject(wrap);
      label.position.copy(plane.position);
      label.position.y += 0.85;
      editChamber.add(label);
      if (index > 0) {
        for (let shard = 0; shard < 4; shard += 1) {
          const fragment = new THREE.Mesh(
            new THREE.TetrahedronGeometry(0.1, 0),
            new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0x8aa8b8, emissiveIntensity: 0.5, transparent: true, opacity: 0.8 }),
          );
          fragment.position.copy(plane.position);
          fragment.position.x += Math.cos(shard + index) * 0.7;
          fragment.position.y += Math.sin(shard * 1.3) * 0.45;
          fragment.userData.orbit = { index, shard };
          editChamber.add(fragment);
        }
      }
    });
    chambers.add(editChamber);

    const registerChamber = new THREE.Group();
    registerChamber.visible = false;
    const sealMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.55, metalness: 0.82, roughness: 0.18 });
    const sealLeft = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.15, 1.15), sealMat);
    const sealRight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.15, 1.15), sealMat.clone());
    sealLeft.position.set(-1.15, 0.7, 0.8);
    sealRight.position.set(1.15, 0.7, 0.8);
    registerChamber.add(sealLeft, sealRight);
    const sealEmblem = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({ map: loadMap(loader, ASSET.pathways.register), transparent: true, side: THREE.DoubleSide }),
    );
    sealEmblem.position.set(0, 0.75, 0.55);
    registerChamber.add(sealEmblem);
    for (let i = 0; i < 8; i += 1) {
      const pillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 2.2, 0.08),
        new THREE.MeshStandardMaterial({ color: 0xc5a059, emissive: 0xd4af37, emissiveIntensity: 0.2, metalness: 0.6, roughness: 0.4 }),
      );
      const a = (i / 8) * Math.PI * 2;
      pillar.position.set(Math.cos(a) * 3.05, 0.2, Math.sin(a) * 3.05);
      registerChamber.add(pillar);
    }
    const { wrap: widWrap } = makeLabel("LN-00017", "Registration created", true);
    widWrap.style.pointerEvents = "none";
    const widLabel = new CSS2DObject(widWrap);
    widLabel.position.set(0, 2.05, 0.6);
    registerChamber.add(widLabel);
    chambers.add(registerChamber);

    const witnessChamber = new THREE.Group();
    witnessChamber.visible = false;
    const eventCube = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.32, 0.32),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.7, metalness: 0.7, roughness: 0.22 }),
    );
    eventCube.position.set(0, 1.55, 1.15);
    witnessChamber.add(eventCube);
    const { wrap: eventWrap } = makeLabel("EVENT", "REG-LN-00017-01");
    eventWrap.style.pointerEvents = "none";
    const eventLabel = new CSS2DObject(eventWrap);
    eventLabel.position.copy(eventCube.position);
    eventLabel.position.y += 0.38;
    witnessChamber.add(eventLabel);
    const witnessEye = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 1.8),
      new THREE.MeshBasicMaterial({ map: loadMap(loader, ASSET.pathways.witness), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
    );
    witnessEye.position.set(2.4, 1.1, -0.4);
    witnessChamber.add(witnessEye);
    const witnessLights: THREE.Mesh[] = [];
    const witnessLines: THREE.Line[] = [];
    const ensureWitnesses = (count: number) => {
      while (witnessLights.length < count) {
        const index = witnessLights.length;
        const light = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 20, 20),
          new THREE.MeshStandardMaterial({ color: 0x4fc3f7, emissive: 0x4fc3f7, emissiveIntensity: 0.85, roughness: 0.25 }),
        );
        witnessChamber.add(light);
        witnessLights.push(light);
        const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), eventCube.position.clone(), workPos.clone()]);
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xf0d78a, transparent: true, opacity: 0.7 }));
        witnessChamber.add(line);
        witnessLines.push(line);
        const person = SPATIAL_REGISTRY_MOCK.witnesses[index];
        const { wrap } = makeLabel(person?.name ?? `Witness ${index + 1}`, person?.at ?? "Attestation");
        wrap.style.pointerEvents = "none";
        const label = new CSS2DObject(wrap);
        light.add(label);
        label.position.set(0, 0.32, 0);
      }
      witnessLights.forEach((light, index) => {
        const angle = (index / Math.max(count, 1)) * Math.PI * 2 - 0.4;
        light.position.set(Math.cos(angle) * 2.35, 0.55 + (index % 2) * 0.25, Math.sin(angle) * 2.35);
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
    const lineageBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(8.5, 8.5),
      new THREE.MeshBasicMaterial({ map: loadMap(loader, ASSET.pathways.lineage), transparent: true, opacity: 0.28, depthWrite: false }),
    );
    lineageBackdrop.position.set(0, 1.4, -4.5);
    lineageChamber.add(lineageBackdrop);
    SPATIAL_REGISTRY_MOCK.lineageSequence.forEach((step, index) => {
      const node = new THREE.Mesh(
        index === 4 ? new THREE.OctahedronGeometry(0.22, 0) : new THREE.SphereGeometry(0.2, 18, 18),
        new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.55, metalness: 0.5, roughness: 0.3 }),
      );
      node.position.set(-5.2 + index * 2.6, -1.15, 1.8);
      lineageChamber.add(node);
      const { wrap } = makeLabel(step.label, step.caption);
      wrap.style.pointerEvents = "none";
      const label = new CSS2DObject(wrap);
      label.position.copy(node.position);
      label.position.y += 0.42;
      lineageChamber.add(label);
      if (index < 4) {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([node.position.clone(), new THREE.Vector3(node.position.x + 2.6, -1.15, 1.8)]),
          new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.65 }),
        );
        lineageChamber.add(line);
      }
    });
    SPATIAL_REGISTRY_MOCK.derivedArtifacts.forEach((artifact, index) => {
      const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshStandardMaterial({
          color: 0x8fd4ff,
          emissive: 0x3a88c8,
          emissiveIntensity: 0.55,
          roughness: 0.28,
        }),
      );
      shard.position.set(6.6 + (index - 1) * 0.7, -0.35, 2.35 + index * 0.12);
      lineageChamber.add(shard);
      const { wrap } = makeLabel(artifact.title, artifact.kind);
      wrap.style.pointerEvents = "none";
      const label = new CSS2DObject(wrap);
      label.position.copy(shard.position);
      label.position.y += 0.32;
      lineageChamber.add(label);
    });
    chambers.add(lineageChamber);

    const playerChamber = new THREE.Group();
    playerChamber.visible = false;
    const field = new THREE.Mesh(
      new THREE.CircleGeometry(2.8, 64),
      new THREE.MeshBasicMaterial({ map: loadMap(loader, ASSET.pathways.player), transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    field.rotation.x = -Math.PI / 2;
    field.position.set(0, -1.35, 0);
    playerChamber.add(field);
    const playerDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.72, 0.72, 0.06, 48),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, emissive: 0xd4af37, emissiveIntensity: 0.7, metalness: 0.75, roughness: 0.18 }),
    );
    playerDisc.position.set(0, -0.55, 0);
    playerChamber.add(playerDisc);
    const playerRings: THREE.Mesh[] = [];
    [1.1, 1.7, 2.35, 3.0].forEach((radius) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.012, 8, 80),
        new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.55 }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, -1.32, 0);
      playerChamber.add(ring);
      playerRings.push(ring);
    });
    [0.35, 0.85, 1.35].forEach((height, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.48 + index * 0.08, 0.01, 8, 64),
        new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.42 }),
      );
      ring.position.set(0, -0.4 + height, 0);
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
        const material = mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = id === selected || id === "work" ? (playing && id === "work" ? 1.35 : 0.95) : 0.38;
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
      coverMesh.lookAt(camera.position);
      workCoreMap.lookAt(camera.position);
      creatorField.lookAt(camera.position);
      portrait.lookAt(camera.position);
      witnessEye.lookAt(camera.position);

      edges.forEach((edge, index) => {
        const material = edge.mesh.material as THREE.MeshBasicMaterial;
        const hot = edge.from === selected || edge.to === selected || currentView === "lineage";
        material.opacity = entered && currentView !== "lineage" ? 0.12 : hot ? 0.9 : 0.4;
        if (!reduced) edge.traveler.position.copy(edge.curve.getPointAt((frame * 0.004 + index * 0.14) % 1));
        edge.mesh.visible = currentView === "overview" || currentView === "lineage";
        edge.traveler.visible = edge.mesh.visible && !reduced;
      });

      const resonance = playing ? 1 + Math.sin(frame * 0.12) * 0.045 : 1;
      const enteredWork = currentView === "work";
      workShell.scale.setScalar((enteredWork || currentView === "player" ? 1.12 : 1) * resonance);
      workPedestal.visible = currentView === "overview" || currentView === "work" || currentView === "player" || currentView === "lineage";
      workCrystals.forEach((crystal, index) => {
        crystal.visible = currentView === "overview" || currentView === "work" || currentView === "player";
        crystal.scale.setScalar(enteredWork ? 1.25 : 0.85);
        if (!reduced) {
          crystal.rotation.y += 0.004 + index * 0.0004;
          crystal.position.y = crystal.userData.baseY + Math.sin(frame * 0.02 + index) * (playing ? 0.06 : 0.02);
        }
      });
      if (!reduced) {
        workShell.rotation.y += playing ? 0.006 : 0.0022;
        workRingA.rotation.z += playing ? 0.016 : 0.003;
        workRingB.rotation.y += playing ? 0.01 : 0.002;
        dustPoints.rotation.y += playing ? 0.00055 : 0.00028;
        (dustPoints.material as THREE.PointsMaterial).opacity = playing ? 0.62 : 0.42;
        editChamber.children.forEach((child) => {
          if (child.userData.orbit) {
            const { index, shard } = child.userData.orbit as { index: number; shard: number };
            child.rotation.x += 0.01;
            child.position.y += Math.sin(frame * 0.03 + shard) * 0.0015 * index;
          }
        });
      }

      const closing = currentView === "register" || ceremonyRef.current === "register";
      seal = reduced ? (closing ? 1 : 0) : seal + ((closing ? 1 : 0) - seal) * 0.04;
      sealLeft.position.x = THREE.MathUtils.lerp(-1.15, -0.28, seal);
      sealRight.position.x = THREE.MathUtils.lerp(1.15, 0.28, seal);
      sealLeft.rotation.y = THREE.MathUtils.lerp(-0.45, 0, seal);
      sealRight.rotation.y = THREE.MathUtils.lerp(0.45, 0, seal);
      widWrap.style.opacity = String(0.25 + seal * 0.75);

      if (witnessChamber.visible) ensureWitnesses(witnessRef.current);
      playerDisc.scale.setScalar(playing ? 1 + Math.sin(frame * 0.1) * 0.04 : 1);
      (playerDisc.material as THREE.MeshStandardMaterial).emissiveIntensity = playing ? 1.05 : 0.55;
      playerRings.forEach((ring, index) => {
        const pulse = playing ? 1 + Math.sin(frame * 0.08 + index) * 0.06 : 1;
        ring.scale.set(pulse, pulse, 1);
        (ring.material as THREE.MeshBasicMaterial).opacity = playing ? 0.7 : 0.35;
      });

      goldLight.intensity = playing ? 28 : 18;
      cyanLight.intensity = playing ? 14 : 11;
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
