import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";

/** Illustrative product mockup, never a claim of a physical device connection. */
export function PlayerDevicePreview({
  title = "Your next collection",
  artist = "Living Nexus",
  count = 0,
}: {
  title?: string;
  artist?: string;
  count?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef({ title, artist, count });
  labels.current = { title, artist, count };
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    } // Accessible HTML fallback remains visible.
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
    camera.position.set(20, 8, 172);
    camera.lookAt(0, 0, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x302919, 3));
    const key = new THREE.DirectionalLight(0xffe2a2, 4);
    key.position.set(40, 50, 100);
    scene.add(key);
    const device = new THREE.Group();
    scene.add(device);
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 640;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(39, 52),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    screen.position.set(0, 9, 8.1);
    device.add(screen);
    let previous = "";
    const paint = () => {
      const data = labels.current;
      const signature = JSON.stringify(data);
      if (signature === previous) return;
      previous = signature;
      const c = canvas.getContext("2d");
      if (!c) return;
      c.fillStyle = "#090b0e";
      c.fillRect(0, 0, 480, 640);
      c.fillStyle = "#c49a28";
      c.font = "20px sans-serif";
      c.fillText("LIVING NEXUS", 30, 45);
      c.strokeStyle = "#c49a28";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(240, 220, 95, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(240, 220, 25, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = "#f3e9d2";
      c.font = "bold 25px sans-serif";
      c.fillText(data.title.slice(0, 27), 28, 380);
      c.fillStyle = "#c49a28";
      c.font = "21px sans-serif";
      c.fillText(data.artist.slice(0, 32), 28, 420);
      c.fillStyle = "#777";
      c.fillRect(28, 465, 424, 3);
      c.fillStyle = "#c49a28";
      c.fillRect(28, 465, Math.min(data.count / 50, 1) * 424, 3);
      c.fillStyle = "#f3e9d2";
      c.font = "19px sans-serif";
      c.fillText(`${data.count} / 50 tracks selected`, 28, 515);
      c.fillStyle = "#aaa";
      c.font = "17px sans-serif";
      c.fillText("COLLECTION PREVIEW", 28, 590);
      texture.needsUpdate = true;
    };
    new ThreeMFLoader().load(
      "/models/living-nexus-player-concept.3mf",
      object => {
        if (disposed) {
          object.traverse(o => {
            if (o instanceof THREE.Mesh) {
              o.geometry.dispose();
              const materials = Array.isArray(o.material)
                ? o.material
                : [o.material];
              materials.forEach(m => m.dispose());
            }
          });
          return;
        }
        device.add(object);
      },
      undefined,
      () => {
        /* HTML fallback explains the preview if the asset fails. */
      }
    );
    const resize = () => {
      const w = Math.max(el.clientWidth, 1),
        h = Math.max(el.clientHeight, 1);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const draw = (time: number) => {
      paint();
      device.rotation.y = reduced ? -0.13 : Math.sin(time / 4500) * 0.12 - 0.13;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.traverse(o => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach(m => m.dispose());
        }
      });
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <figure className="player-device-preview">
      <div ref={host} className="player-device-canvas" aria-hidden="true" />
      <figcaption>
        Illustrative player · {count} tracks selected
        <br />
        <small>
          {title} — {artist}
        </small>
      </figcaption>
    </figure>
  );
}
