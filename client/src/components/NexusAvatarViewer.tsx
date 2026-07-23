/**
 * NexusAvatarViewer
 * ─────────────────────────────────────────────────────────────────────────────
 * Three.js 3D Personal Nexus Avatar — procedurally generated sacred geometry
 * seeded from the user's ID so every creator has a unique form.
 *
 * Features:
 *  • Idle Y-axis spin (subtle, ~0.003 rad/frame)
 *  • OrbitControls — drag to rotate, scroll/pinch to zoom
 *  • Sacred geometry: icosahedron core + orbiting octahedra + wireframe shell
 *  • Cathedral palette: obsidian void, amber/gold emissive glow
 *  • Fully self-contained — no external assets required
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ── Seeded pseudo-random ───────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

// ── Palette derived from seed ──────────────────────────────────────────────────
function deriveColors(rand: () => number) {
  // Always stay in amber/gold/teal/violet cathedral range
  const palettes = [
    { core: 0xc9a84c, wire: 0xf0c060, orbit: 0xe8b84b },   // gold
    { core: 0x7b9ea6, wire: 0xa8d0da, orbit: 0x6bb8c8 },   // teal
    { core: 0x9b6b9b, wire: 0xc890c8, orbit: 0xb07ab0 },   // violet
    { core: 0xc9784c, wire: 0xf09060, orbit: 0xe87040 },   // ember
    { core: 0x4c9b6b, wire: 0x70c890, orbit: 0x50b878 },   // jade
  ];
  return palettes[Math.floor(rand() * palettes.length)];
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NexusAvatarViewerProps {
  /** User ID or any stable string — seeds the geometry uniquely */
  seed?: string | number;
  /** Container width in px (default: 192) */
  width?: number;
  /** Container height in px (default: 256) */
  height?: number;
  /** Accent color for corner brackets (CSS string) */
  accentColor?: string;
}

export default function NexusAvatarViewer({
  seed = "default",
  width = 192,
  height = 256,
  accentColor = "#C9A84C",
}: NexusAvatarViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const W = container.clientWidth || width;
    const H = container.clientHeight || height;

    // ── Seeded RNG ─────────────────────────────────────────────────────────
    const seedNum = typeof seed === "number" ? seed : hashString(String(seed));
    const rand = seededRandom(seedNum);
    const colors = deriveColors(rand);

    // ── Renderer ───────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Camera ─────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 4.5);

    // ── Orbit Controls ─────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minDistance = 2.5;
    controls.maxDistance = 8;
    controls.autoRotate = false; // we handle idle spin manually

    // ── Lighting ───────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x111111, 1.2);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(colors.core, 3.5, 12);
    keyLight.position.set(2, 3, 2);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(colors.orbit, 2, 10);
    rimLight.position.set(-3, -1, -2);
    scene.add(rimLight);

    // ── Root group (idle spin target) ──────────────────────────────────────
    const root = new THREE.Group();
    scene.add(root);

    // ── Core geometry — icosahedron ────────────────────────────────────────
    const detail = Math.floor(rand() * 2); // 0 or 1 — low/medium detail
    const coreGeo = new THREE.IcosahedronGeometry(0.9, detail);
    const coreMat = new THREE.MeshStandardMaterial({
      color: colors.core,
      emissive: colors.core,
      emissiveIntensity: 0.35,
      metalness: 0.8,
      roughness: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    root.add(coreMesh);

    // ── Wireframe shell ────────────────────────────────────────────────────
    const wireGeo = new THREE.IcosahedronGeometry(1.05, detail);
    const wireMat = new THREE.MeshBasicMaterial({
      color: colors.wire,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    root.add(wireMesh);

    // ── Outer geodesic shell ───────────────────────────────────────────────
    const outerGeo = new THREE.IcosahedronGeometry(1.35, 1);
    const outerMat = new THREE.MeshBasicMaterial({
      color: colors.orbit,
      wireframe: true,
      transparent: true,
      opacity: 0.07,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    root.add(outerMesh);

    // ── Orbiting octahedra (3–5 satellites) ───────────────────────────────
    const satCount = 3 + Math.floor(rand() * 3); // 3, 4, or 5
    const satellites: { mesh: THREE.Mesh; pivot: THREE.Group; speed: number; tilt: number }[] = [];

    for (let i = 0; i < satCount; i++) {
      const pivot = new THREE.Group();
      // Tilt each orbital plane uniquely
      pivot.rotation.x = rand() * Math.PI;
      pivot.rotation.z = rand() * Math.PI;
      root.add(pivot);

      const satGeo = new THREE.OctahedronGeometry(0.13 + rand() * 0.08, 0);
      const satMat = new THREE.MeshStandardMaterial({
        color: colors.orbit,
        emissive: colors.orbit,
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.1,
      });
      const satMesh = new THREE.Mesh(satGeo, satMat);
      // Place at orbital radius
      const radius = 1.5 + rand() * 0.4;
      const angle = (i / satCount) * Math.PI * 2 + rand() * 0.5;
      satMesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      pivot.add(satMesh);

      satellites.push({
        mesh: satMesh,
        pivot,
        speed: 0.004 + rand() * 0.006,
        tilt: rand() * 0.02,
      });
    }

    // ── Particle field ─────────────────────────────────────────────────────
    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const r = 1.8 + rand() * 1.2;
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: colors.wire,
      size: 0.025,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    root.add(particles);

    // ── Animation loop ─────────────────────────────────────────────────────
    let animId: number;
    let idleSpinActive = true;

    // Pause idle spin while user is interacting
    const onStart = () => { idleSpinActive = false; };
    const onEnd   = () => { idleSpinActive = true; };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end",   onEnd);

    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (idleSpinActive) {
        root.rotation.y += 0.003;
        outerMesh.rotation.y -= 0.001;
        outerMesh.rotation.x += 0.0005;
      }

      // Satellites orbit independently
      satellites.forEach(({ pivot, speed, tilt }) => {
        pivot.rotation.y += speed;
        pivot.rotation.x += tilt * 0.1;
      });

      // Subtle core pulse
      const t = performance.now() * 0.001;
      const pulse = 1 + Math.sin(t * 1.2) * 0.015;
      coreMesh.scale.setScalar(pulse);
      wireMesh.scale.setScalar(pulse * 1.02);

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ── Resize observer ────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    // ── Cleanup ────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end",   onEnd);
      controls.dispose();
      ro.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [seed, width, height]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: height,
        cursor: "grab",
        touchAction: "none",
      }}
      title="Drag to rotate · Scroll to zoom"
    />
  );
}
