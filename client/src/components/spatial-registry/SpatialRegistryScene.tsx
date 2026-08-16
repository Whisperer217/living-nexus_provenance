/**
 * @domain   The Living Graph → Spatial Dashboard → Registry Visualization
 * @impl     React Component — Three.js visualization of a fictional provenance registry
 *
 * Visualization only. If this layer disappeared, the mock registry would still exist.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import {
  SPATIAL_REGISTRY_MOCK,
  SPATIAL_REGISTRY_NODES_BY_ID,
  type SpatialRegistryNodeId,
} from "@/lib/spatialRegistryMock";

export type SpatialCeremony = "register" | "witness" | null;

export type SpatialSceneHandle = {
  reset: () => void;
  zoom: (factor: number) => void;
};

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

type ControlBox = {
  camera: THREE.PerspectiveCamera | null;
  controls: OrbitControls | null;
};

function makeGlowTexture(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.28, "rgba(79,195,247,0.28)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function geometryFor(id: SpatialRegistryNodeId) {
  switch (id) {
    case "work":
      return new THREE.IcosahedronGeometry(0.42, 1);
    case "profile":
      return new THREE.TetrahedronGeometry(0.42, 0);
    case "edit":
      return new THREE.TetrahedronGeometry(0.4, 0);
    case "register":
      return new THREE.BoxGeometry(0.5, 0.5, 0.5);
    case "witness":
      return new THREE.SphereGeometry(0.34, 32, 32);
    case "lineage":
      return new THREE.TorusGeometry(0.32, 0.055, 12, 48);
    case "player":
      return new THREE.CylinderGeometry(0.38, 0.38, 0.08, 40);
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

export const SpatialRegistryScene = forwardRef<SpatialSceneHandle, SpatialRegistrySceneProps>(function SpatialRegistryScene(
  { selectedNode, witnessCount, isPlaying, coverArtUrl, ceremony, reducedMotion, onSelect, onHover },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedNode);
  const witnessRef = useRef(witnessCount);
  const playingRef = useRef(isPlaying);
  const coverRef = useRef(coverArtUrl);
  const ceremonyRef = useRef(ceremony);
  const reducedRef = useRef(reducedMotion);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const controlBox = useRef<ControlBox>({ camera: null, controls: null });

  useImperativeHandle(ref, () => ({
    reset: () => {
      const { camera, controls } = controlBox.current;
      if (!camera || !controls) return;
      camera.position.set(0.2, 2.6, 11.6);
      controls.target.set(0, 0.4, 0);
    },
    zoom: (factor: number) => {
      const { camera, controls } = controlBox.current;
      if (!camera || !controls) return;
      const dir = camera.position.clone().sub(controls.target);
      dir.multiplyScalar(factor);
      camera.position.copy(controls.target).add(dir);
    },
  }));

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
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.018);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    camera.position.set(0.2, 2.6, 11.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setClearColor(0x000000, 0);
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
    controls.minDistance = 6.2;
    controls.maxDistance = 18;
    controls.target.set(0, 0.4, 0);
    controls.maxPolarAngle = Math.PI * 0.72;
    controlBox.current = { camera, controls };

    const registry = new THREE.Group();
    scene.add(registry);

    scene.add(new THREE.AmbientLight(0xbfd7ea, 0.42));
    const goldLight = new THREE.PointLight(0xd4af37, 18, 26, 2);
    goldLight.position.set(0.4, 4.2, 5.4);
    scene.add(goldLight);
    const cyanLight = new THREE.PointLight(0x4fc3f7, 10, 22, 2);
    cyanLight.position.set(5.5, -1.2, 4);
    scene.add(cyanLight);
    const violetLight = new THREE.PointLight(0x9c27b0, 7, 16, 2);
    violetLight.position.set(-6, 2.4, 3);
    scene.add(violetLight);

    const dustGeometry = new THREE.BufferGeometry();
    const dust = new Float32Array(520 * 3);
    for (let index = 0; index < 520; index += 1) {
      dust[index * 3] = (Math.random() - 0.5) * 28;
      dust[index * 3 + 1] = (Math.random() - 0.4) * 14;
      dust[index * 3 + 2] = (Math.random() - 0.5) * 16;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    const dustPoints = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({ color: 0x9fd9f5, size: 0.024, transparent: true, opacity: 0.45, depthWrite: false }),
    );
    scene.add(dustPoints);

    const glowTexture = makeGlowTexture("rgba(212,175,55,0.95)");
    const objectById = new Map<SpatialRegistryNodeId, THREE.Mesh>();
    const wrapsById = new Map<SpatialRegistryNodeId, HTMLDivElement>();
    const captionById = new Map<SpatialRegistryNodeId, HTMLSpanElement>();
    const pickables: THREE.Object3D[] = [];

    SPATIAL_REGISTRY_MOCK.nodes.forEach((node) => {
      const isWork = node.id === "work";
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: isWork ? 0.55 : 0.42,
        roughness: 0.28,
        metalness: 0.58,
      });
      const mesh = new THREE.Mesh(isWork ? new THREE.SphereGeometry(0.2, 16, 16) : geometryFor(node.id), material);
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
          opacity: isWork ? 0.5 : 0.32,
          color: node.color,
        }),
      );
      sprite.position.copy(mesh.position);
      sprite.scale.setScalar(isWork ? 3.8 : 1.7);
      registry.add(sprite);

      const wrap = document.createElement("div");
      wrap.className = `sr-node-label-wrap${isWork ? " is-work" : ""}`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sr-node-label";
      button.textContent = isWork ? node.label : node.shortLabel;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(node.id);
      });
      const caption = document.createElement("span");
      caption.className = "sr-node-caption";
      caption.textContent = node.caption;
      wrap.append(button, caption);
      wrap.addEventListener("pointerenter", () => onHoverRef.current(node.id));
      wrap.addEventListener("pointerleave", () => onHoverRef.current(null));
      wrapsById.set(node.id, wrap);
      captionById.set(node.id, caption);
      const labelObject = new CSS2DObject(wrap);
      labelObject.position.copy(mesh.position);
      labelObject.position.y += isWork ? 1.72 : 0.7;
      registry.add(labelObject);
    });

    const workMesh = objectById.get("work");
    const workCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.28, 1),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, wireframe: true, transparent: true, opacity: 0.62 }),
    );
    if (workMesh) workCore.position.copy(workMesh.position);
    registry.add(workCore);

    const workRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.48, 0.018, 8, 80),
      new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        emissive: 0xd4af37,
        emissiveIntensity: 0.8,
        metalness: 0.8,
        roughness: 0.18,
      }),
    );
    if (workMesh) workRing.position.copy(workMesh.position);
    workRing.rotation.x = Math.PI / 2;
    registry.add(workRing);

    const coverMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.12, 1.12),
      new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 1, side: THREE.DoubleSide }),
    );
    if (workMesh) coverMesh.position.copy(workMesh.position);
    coverMesh.userData.nodeId = "work";
    pickables.push(coverMesh);
    registry.add(coverMesh);
    const textureLoader = new THREE.TextureLoader();
    let appliedCover = "";
    let coverTexture: THREE.Texture | null = null;

    const edges: EdgeVisual[] = [];
    SPATIAL_REGISTRY_MOCK.edges.forEach(([from, to]) => {
      const start = new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID[from].position);
      const end = new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID[to].position);
      const curve = makeArc(start, end);
      const mesh = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 40, 0.013, 6, false),
        new THREE.MeshBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.52 }),
      );
      registry.add(mesh);
      const traveler = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.9 }),
      );
      registry.add(traveler);
      edges.push({ from, to, mesh, curve, traveler });
    });

    const attestations = new THREE.Group();
    registry.add(attestations);
    const attestationPickables: THREE.Mesh[] = [];
    const syncAttestations = (count: number) => {
      const extra = Math.max(0, Math.min(count - 2, 4));
      while (attestationPickables.length < extra) {
        const index = attestationPickables.length;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 18, 18),
          new THREE.MeshStandardMaterial({
            color: 0x4fc3f7,
            emissive: 0x4fc3f7,
            emissiveIntensity: 0.7,
            roughness: 0.3,
            metalness: 0.45,
          }),
        );
        const witnessPos = new THREE.Vector3(...SPATIAL_REGISTRY_NODES_BY_ID.witness.position);
        const angle = index * 0.9 + 0.4;
        mesh.position.set(
          witnessPos.x + Math.cos(angle) * 1.05,
          witnessPos.y + 0.35,
          witnessPos.z + Math.sin(angle) * 1.05,
        );
        mesh.userData.nodeId = "witness";
        mesh.scale.setScalar(0.01);
        attestations.add(mesh);
        attestationPickables.push(mesh);
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
        mesh.scale.setScalar(reduced ? 1 : mesh.scale.x + (1 - mesh.scale.x) * 0.08);
      });
      const witnessCaption = captionById.get("witness");
      if (witnessCaption) witnessCaption.textContent = `${witnessRef.current} Witnesses`;

      if (coverRef.current !== appliedCover) {
        appliedCover = coverRef.current;
        coverTexture?.dispose();
        coverTexture = textureLoader.load(appliedCover);
        coverTexture.colorSpace = THREE.SRGBColorSpace;
        const material = coverMesh.material as THREE.MeshBasicMaterial;
        material.map = coverTexture;
        material.needsUpdate = true;
      }
      coverMesh.lookAt(camera.position);

      objectById.forEach((mesh, id) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        const isSelected = id === selected;
        const onPath = path?.includes(id) ?? false;
        const isHovered = id === hovered;
        material.emissiveIntensity = isSelected ? 1.15 : onPath || isHovered ? 0.78 : id === "work" ? 0.55 : 0.42;
        mesh.scale.setScalar(reduced || !isSelected ? 1 : 1 + Math.sin(frame * 0.06) * 0.04);
        const wrap = wrapsById.get(id);
        if (wrap) {
          wrap.classList.toggle("is-active", isSelected);
          wrap.classList.toggle("is-hovered", isHovered);
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
        material.opacity = hot ? 0.92 : 0.42;
        material.color.set(hot ? 0xf0d78a : 0x4fc3f7);
        if (!reduced) {
          edge.traveler.position.copy(edge.curve.getPointAt((frame * 0.004 + index * 0.14) % 1));
          edge.traveler.visible = true;
        } else edge.traveler.visible = false;
      });

      if (!reduced) {
        workCore.rotation.y += 0.0024;
        workRing.rotation.z += playingRef.current ? 0.014 : 0.003;
        dustPoints.rotation.y += 0.00028;
      }

      const focus = objectById.get(selected);
      if (focus) {
        lookTarget.set(focus.position.x * 0.22, focus.position.y * 0.28 + 0.35, focus.position.z * 0.22);
        if (reduced) controls.target.copy(lookTarget);
        else controls.target.lerp(lookTarget, 0.03);
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
      aria-label="Interactive fictional spatial registry. Drag to rotate and pan. Select a node to inspect it."
    />
  );
});
