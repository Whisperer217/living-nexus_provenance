/**
 * @domain   The Living Graph → Spatial Dashboard → Registry Visualization
 * @impl     React Component — Three.js visualization of a fictional provenance registry
 *
 * Visualization only. If this layer disappeared, the mock registry would still exist.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  SPATIAL_REGISTRY_MOCK,
  SPATIAL_REGISTRY_NODES_BY_ID,
  type SpatialRegistryNodeId,
} from "@/lib/spatialRegistryMock";

export type SpatialCeremony = "register" | "witness" | null;

type SpatialRegistrySceneProps = {
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
  gradient.addColorStop(0, "rgba(232,184,64,0.95)");
  gradient.addColorStop(0.35, "rgba(196,154,40,0.28)");
  gradient.addColorStop(1, "rgba(196,154,40,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function geometryFor(id: SpatialRegistryNodeId) {
  switch (id) {
    case "work":
      return new THREE.IcosahedronGeometry(0.92, 2);
    case "profile":
      return new THREE.OctahedronGeometry(0.34, 0);
    case "edit":
      return new THREE.TetrahedronGeometry(0.38, 0);
    case "register":
      return new THREE.BoxGeometry(0.44, 0.44, 0.44);
    case "witness":
      return new THREE.SphereGeometry(0.32, 32, 32);
    case "lineage":
      return new THREE.TorusGeometry(0.3, 0.075, 12, 36);
    case "player":
      return new THREE.CylinderGeometry(0.34, 0.34, 0.11, 36);
    default:
      return new THREE.SphereGeometry(0.3, 24, 24);
  }
}

function makeArc(from: THREE.Vector3, to: THREE.Vector3) {
  const mid = from.clone().lerp(to, 0.5);
  mid.y += from.distanceTo(to) * 0.16;
  const sideways = new THREE.Vector3().subVectors(to, from).cross(new THREE.Vector3(0, 1, 0)).normalize();
  if (Number.isFinite(sideways.x)) mid.addScaledVector(sideways, 0.18);
  return new THREE.QuadraticBezierCurve3(from.clone(), mid, to.clone());
}

function disposeMaterial(material: THREE.Material | THREE.Material[] | undefined) {
  if (!material) return;
  if (Array.isArray(material)) material.forEach((item) => item.dispose());
  else material.dispose();
}

export function SpatialRegistryScene({
  selectedNode,
  witnessCount,
  isPlaying,
  coverArtUrl,
  ceremony,
  reducedMotion,
  onSelect,
  onHover,
}: SpatialRegistrySceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedNode);
  const witnessRef = useRef(witnessCount);
  const playingRef = useRef(isPlaying);
  const coverRef = useRef(coverArtUrl);
  const ceremonyRef = useRef(ceremony);
  const reducedRef = useRef(reducedMotion);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);

  useEffect(() => {
    selectedRef.current = selectedNode;
    witnessRef.current = witnessCount;
    playingRef.current = isPlaying;
    coverRef.current = coverArtUrl;
    ceremonyRef.current = ceremony;
    reducedRef.current = reducedMotion;
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
  }, [selectedNode, witnessCount, isPlaying, coverArtUrl, ceremony, reducedMotion, onSelect, onHover]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050403, 0.048);
    scene.background = new THREE.Color(0x050403);

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
    camera.position.set(3.1, 3.4, 11.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x050403, 1);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    mount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = true;
    controls.minDistance = 6.5;
    controls.maxDistance = 18;
    controls.target.set(0, 0.45, 0);
    controls.maxPolarAngle = Math.PI * 0.72;

    const registry = new THREE.Group();
    scene.add(registry);

    scene.add(new THREE.AmbientLight(0xede5d0, 0.42));
    const key = new THREE.PointLight(0xc49a28, 22, 28, 2);
    key.position.set(2.2, 5.4, 6.2);
    scene.add(key);
    const fill = new THREE.PointLight(0x8a8478, 7, 22, 2);
    fill.position.set(-7.2, -0.8, 4.2);
    scene.add(fill);
    const rim = new THREE.PointLight(0xe8b840, 5, 18, 2);
    rim.position.set(0.4, -3.4, -5.8);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9.2, 72),
      new THREE.MeshBasicMaterial({ color: 0x0a0907, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.2;
    scene.add(floor);

    [3.15, 5.35, 7.7].forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius - 0.012, radius + 0.012, 96),
        new THREE.MeshBasicMaterial({
          color: 0xc49a28,
          transparent: true,
          opacity: 0.16 - index * 0.03,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -3.18;
      scene.add(ring);
    });

    const dustGeometry = new THREE.BufferGeometry();
    const dust = new Float32Array(640 * 3);
    for (let index = 0; index < 640; index += 1) {
      dust[index * 3] = (Math.random() - 0.5) * 34;
      dust[index * 3 + 1] = (Math.random() - 0.5) * 18;
      dust[index * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    const dustPoints = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: 0xdfc57e, size: 0.026, transparent: true, opacity: 0.42, depthWrite: false }),
    );
    scene.add(dustPoints);

    const glowTexture = makeGlowTexture();
    const objectById = new Map<SpatialRegistryNodeId, THREE.Mesh>();
    const labelsById = new Map<SpatialRegistryNodeId, HTMLButtonElement>();
    const pickables: THREE.Object3D[] = [];

    SPATIAL_REGISTRY_MOCK.nodes.forEach((node) => {
      const isWork = node.id === "work";
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: isWork ? 0.72 : 0.24,
        roughness: isWork ? 0.22 : 0.38,
        metalness: isWork ? 0.72 : 0.46,
      });
      const mesh = new THREE.Mesh(geometryFor(node.id), material);
      mesh.position.set(...node.position);
      mesh.userData.nodeId = node.id;
      objectById.set(node.id, mesh);
      pickables.push(mesh);
      registry.add(mesh);

      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          transparent: true,
          depthWrite: false,
          opacity: isWork ? 0.55 : 0.22,
          color: node.color,
        }),
      );
      sprite.position.copy(mesh.position);
      sprite.scale.setScalar(isWork ? 3.4 : 1.45);
      sprite.userData.kind = "glow";
      sprite.userData.nodeId = node.id;
      registry.add(sprite);

      const label = document.createElement("button");
      label.type = "button";
      label.className = `sr-node-label${isWork ? " is-work" : ""}`;
      label.textContent = isWork ? node.label : node.shortLabel;
      label.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(node.id);
      });
      label.addEventListener("pointerenter", () => onHoverRef.current(node.id));
      label.addEventListener("pointerleave", () => onHoverRef.current(null));
      labelsById.set(node.id, label);
      const labelObject = new CSS2DObject(label);
      labelObject.position.copy(mesh.position);
      labelObject.position.y += isWork ? 1.42 : 0.62;
      registry.add(labelObject);
    });

    const workMesh = objectById.get("work");
    const workCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.12, 1),
      new THREE.MeshBasicMaterial({ color: 0xc49a28, wireframe: true, transparent: true, opacity: 0.22 }),
    );
    if (workMesh) workCore.position.copy(workMesh.position);
    registry.add(workCore);

    const workRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.32, 0.016, 8, 80),
      new THREE.MeshStandardMaterial({
        color: 0xe8b840,
        emissive: 0xc49a28,
        emissiveIntensity: 0.7,
        metalness: 0.8,
        roughness: 0.18,
      }),
    );
    if (workMesh) workRing.position.copy(workMesh.position);
    workRing.rotation.x = Math.PI / 2;
    registry.add(workRing);

    const coverMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    coverMesh.position.set(1.58, 0.62, 0.18);
    coverMesh.userData.nodeId = "work";
    pickables.push(coverMesh);
    registry.add(coverMesh);
    const textureLoader = new THREE.TextureLoader();
    let appliedCover = "";
    let coverTexture: THREE.Texture | null = null;

    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x887144,
      transparent: true,
      opacity: 0.38,
    });
    const edges: EdgeVisual[] = [];
    SPATIAL_REGISTRY_MOCK.edges.forEach(([from, to]) => {
      const start = new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID[from].position);
      const end = new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID[to].position);
      const curve = makeArc(start, end);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.012, 6, false), edgeMaterial.clone());
      registry.add(mesh);
      const traveler = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xf5cc5a, transparent: true, opacity: 0.85 }),
      );
      registry.add(traveler);
      edges.push({ from, to, mesh, curve, traveler });
    });

    const attestations = new THREE.Group();
    registry.add(attestations);
    const attestationPickables: THREE.Mesh[] = [];

    const syncAttestations = (count: number) => {
      const extra = Math.max(0, Math.min(count - 1, 5));
      while (attestationPickables.length < extra) {
        const index = attestationPickables.length;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 20, 20),
          new THREE.MeshStandardMaterial({
            color: 0xb08a5a,
            emissive: 0xb08a5a,
            emissiveIntensity: 0.55,
            roughness: 0.32,
            metalness: 0.5,
          }),
        );
        const witnessPos = new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID.witness.position);
        const angle = index * 0.95 + 0.55;
        mesh.position.set(
          witnessPos.x + Math.cos(angle) * 1.18,
          witnessPos.y + 0.42 + (index % 2) * 0.22,
          witnessPos.z + Math.sin(angle) * 1.18,
        );
        mesh.userData.nodeId = "witness";
        mesh.scale.setScalar(0.01);
        attestations.add(mesh);
        attestationPickables.push(mesh);

        const curve = makeArc(new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID.register.position), mesh.position);
        const tube = new THREE.Mesh(
          new THREE.TubeGeometry(curve, 24, 0.01, 5, false),
          new THREE.MeshBasicMaterial({ color: 0xe8b840, transparent: true, opacity: 0.62 }),
        );
        attestations.add(tube);
      }
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerState = { x: 0, y: 0, dragged: false };
    let hovered: SpatialRegistryNodeId | null = null;

    const setPointerFromEvent = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const hitNode = (event: PointerEvent) => {
      setPointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects([...pickables, ...attestationPickables], false)[0];
      return (hit?.object.userData.nodeId as SpatialRegistryNodeId | undefined) ?? null;
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

    const lookTarget = new THREE.Vector3();
    let frame = 0;
    let animationFrame = 0;

    const render = () => {
      frame += 1;
      const reduced = reducedRef.current;
      const selected = selectedRef.current;
      const ceremonyKind = ceremonyRef.current;
      const path =
        selected === "lineage" || ceremonyKind === "register"
          ? ceremonyKind === "register"
            ? SPATIAL_REGISTRY_MOCK.registrationPath
            : SPATIAL_REGISTRY_MOCK.lineagePath
          : ceremonyKind === "witness"
            ? (["register", "witness"] as SpatialRegistryNodeId[])
            : null;

      syncAttestations(witnessRef.current);
      attestationPickables.forEach((mesh) => {
        const next = reduced ? 1 : mesh.scale.x + (1 - mesh.scale.x) * 0.08;
        mesh.scale.setScalar(next);
      });

      if (coverRef.current !== appliedCover) {
        appliedCover = coverRef.current;
        coverTexture?.dispose();
        coverTexture = textureLoader.load(appliedCover);
        coverTexture.colorSpace = THREE.SRGBColorSpace;
        const material = coverMesh.material as THREE.MeshBasicMaterial;
        material.map = coverTexture;
        material.needsUpdate = true;
      }

      objectById.forEach((mesh, id) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        const isSelected = id === selected;
        const onPath = path?.includes(id) ?? false;
        const isHovered = id === hovered;
        const base = id === "work" ? 0.72 : 0.24;
        material.emissiveIntensity = isSelected ? 1.28 : onPath || isHovered ? 0.82 : base;
        const pulse = reduced ? 1 : isSelected ? 1 + Math.sin(frame * 0.06) * 0.045 : 1;
        mesh.scale.setScalar(pulse);
        const label = labelsById.get(id);
        if (label) {
          label.classList.toggle("is-active", isSelected);
          label.classList.toggle("is-hovered", isHovered);
        }
      });

      edges.forEach((edge, index) => {
        const material = edge.mesh.material as THREE.MeshBasicMaterial;
        const hot =
          edge.from === selected ||
          edge.to === selected ||
          edge.from === hovered ||
          edge.to === hovered ||
          (path?.includes(edge.from) && path?.includes(edge.to));
        material.opacity = hot ? 0.82 : 0.32;
        material.color.set(hot ? 0xf5cc5a : 0x887144);
        if (!reduced) {
          const t = (frame * 0.004 + index * 0.17) % 1;
          edge.traveler.position.copy(edge.curve.getPointAt(t));
          edge.traveler.visible = true;
        } else {
          edge.traveler.visible = false;
        }
      });

      if (!reduced) {
        workCore.rotation.y += 0.0022;
        workRing.rotation.z += playingRef.current ? 0.012 : 0.0028;
        dustPoints.rotation.y += 0.00035;
      }

      const focus = objectById.get(selected);
      if (focus) {
        lookTarget.set(focus.position.x * 0.28, focus.position.y * 0.35 + 0.35, focus.position.z * 0.28);
        if (reduced) controls.target.copy(lookTarget);
        else controls.target.lerp(lookTarget, 0.035);
      }

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
      labelsById.forEach((label) => label.remove());
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
      className="absolute inset-0 z-0"
      role="application"
      aria-label="Interactive fictional spatial registry. Drag to rotate and pan. Select a node to inspect it."
    />
  );
}
