/**
 * GCodeViewer — Interactive 3D toolpath renderer for G-code files
 *
 * Uses the `gcode-preview` library (Three.js-based) to render the toolpath
 * as a glowing line mesh in the cathedral's gold-on-dark palette.
 *
 * Features:
 *  - Orbit controls (rotate / zoom / pan)
 *  - Layer-by-layer animation ("Replay Build")
 *  - Print statistics panel
 *  - Responsive: fills its container
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Play, Pause, Layers, Maximize2 } from "lucide-react";

interface PrintStats {
  layerCount?: number;
  estimatedPrintTime?: string;
  filamentUsedMm?: number;
  filamentUsedG?: number;
  slicer?: string;
  slicerVersion?: string;
  bedSizeX?: number;
  bedSizeY?: number;
  bedSizeZ?: number;
  nozzleDiameter?: number;
  layerHeight?: number;
  infillPercent?: number;
  printTemperature?: number;
  bedTemperature?: number;
}

interface GCodeViewerProps {
  gcodeUrl: string;
  printStats?: PrintStats | null;
  title?: string;
}

export function GCodeViewer({ gcodeUrl, printStats, title }: GCodeViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalLayers, setTotalLayers] = useState(0);
  const [currentLayer, setCurrentLayer] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const animStateRef = useRef({ isAnimating: false, currentLayer: 0, totalLayers: 0 });

  const initViewer = useCallback(async () => {
    if (!canvasRef.current) return;
    setLoading(true);
    setError(null);

    try {
      // Dynamically import gcode-preview to avoid SSR issues
      const { WebGLPreview } = await import("gcode-preview");

      // Fetch the G-code file
      const response = await fetch(gcodeUrl);
      if (!response.ok) throw new Error(`Failed to fetch G-code: ${response.status}`);
      const gcodeText = await response.text();

      // Initialize the preview
      const preview = new WebGLPreview({
        canvas: canvasRef.current,
        // Cathedral color scheme: gold toolpath on dark background
        extrusionColor: 0xc49a28,       // Living Nexus gold
        travelColor: 0x2a2020,          // near-invisible dark travel moves
        backgroundColor: 0x080d14,      // cathedral void background
        lineWidth: 1.5,
        renderTravel: false,            // hide travel moves for cleaner look
        topLayerColor: 0xffd700,        // bright gold for the current top layer
        lastSegmentColor: 0xffeaa0,     // highlight the last segment
        buildVolume: {
          x: printStats?.bedSizeX ?? 220,
          y: printStats?.bedSizeY ?? 220,
          z: printStats?.bedSizeZ ?? 250,
        },
      });

      previewRef.current = preview;

      // Parse and render
      await preview.processGCode(gcodeText);

      const layers = preview.layers?.length ?? 0;
      setTotalLayers(layers);
      animStateRef.current.totalLayers = layers;
      animStateRef.current.currentLayer = layers;
      setCurrentLayer(layers);

      // Show all layers initially
      preview.endLayer = layers;
      preview.render();

      setLoading(false);
    } catch (err) {
      console.error("[GCodeViewer] Error:", err);
      setError("Unable to render G-code. The file may be too large or unsupported.");
      setLoading(false);
    }
  }, [gcodeUrl, printStats]);

  useEffect(() => {
    initViewer();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      previewRef.current?.dispose?.();
    };
  }, [initViewer]);

  // Layer animation — replay the build layer by layer
  const startAnimation = useCallback(() => {
    if (!previewRef.current || animStateRef.current.totalLayers === 0) return;
    animStateRef.current.isAnimating = true;
    animStateRef.current.currentLayer = 0;
    setIsAnimating(true);
    setCurrentLayer(0);

    const step = () => {
      if (!animStateRef.current.isAnimating) return;
      const next = animStateRef.current.currentLayer + 1;
      if (next > animStateRef.current.totalLayers) {
        animStateRef.current.isAnimating = false;
        setIsAnimating(false);
        return;
      }
      animStateRef.current.currentLayer = next;
      setCurrentLayer(next);
      if (previewRef.current) {
        previewRef.current.endLayer = next;
        previewRef.current.render();
      }
      // ~30 layers/sec for smooth animation
      animFrameRef.current = requestAnimationFrame(() => setTimeout(step, 33));
    };
    step();
  }, []);

  const stopAnimation = useCallback(() => {
    animStateRef.current.isAnimating = false;
    setIsAnimating(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }, []);

  const resetView = useCallback(() => {
    stopAnimation();
    if (previewRef.current) {
      previewRef.current.endLayer = animStateRef.current.totalLayers;
      previewRef.current.render();
      setCurrentLayer(animStateRef.current.totalLayers);
    }
  }, [stopAnimation]);

  const handleLayerScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    stopAnimation();
    const layer = parseInt(e.target.value);
    animStateRef.current.currentLayer = layer;
    setCurrentLayer(layer);
    if (previewRef.current) {
      previewRef.current.endLayer = layer;
      previewRef.current.render();
    }
  }, [stopAnimation]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ background: "#080d14", border: "1px solid rgba(196,154,40,0.2)" }}>
      {/* Canvas */}
      <div className="relative w-full" style={{ aspectRatio: "16/9", minHeight: 280 }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: loading || error ? "none" : "block" }}
        />

        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full animate-spin" style={{ border: "2px solid transparent", borderTopColor: "rgba(196,154,40,0.8)" }} />
              <div className="absolute inset-[4px] rounded-full animate-spin" style={{ border: "1px solid transparent", borderTopColor: "rgba(196,154,40,0.4)", animationDirection: "reverse", animationDuration: "1.5s" }} />
            </div>
            <p className="text-sm" style={{ color: "rgba(196,154,40,0.7)", fontFamily: "'Cinzel', serif" }}>Rendering toolpath…</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <Layers className="w-8 h-8" style={{ color: "rgba(196,154,40,0.4)" }} />
            <p className="text-sm" style={{ color: "rgba(196,154,40,0.6)" }}>{error}</p>
          </div>
        )}

        {/* Top-right controls */}
        {!loading && !error && (
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => setShowStats(s => !s)}
              className="rounded-lg px-2 py-1 text-xs transition-all"
              style={{
                background: showStats ? "rgba(196,154,40,0.2)" : "rgba(8,13,20,0.7)",
                border: "1px solid rgba(196,154,40,0.3)",
                color: "rgba(196,154,40,0.9)",
                fontFamily: "'Cinzel', serif",
                backdropFilter: "blur(8px)",
              }}
            >
              Stats
            </button>
            <button
              onClick={resetView}
              className="rounded-lg p-1.5 transition-all"
              style={{
                background: "rgba(8,13,20,0.7)",
                border: "1px solid rgba(196,154,40,0.3)",
                color: "rgba(196,154,40,0.9)",
                backdropFilter: "blur(8px)",
              }}
              title="Reset view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stats overlay */}
        {showStats && printStats && !loading && !error && (
          <div
            className="absolute top-12 right-3 rounded-xl p-4 text-xs space-y-1.5"
            style={{
              background: "rgba(8,13,20,0.88)",
              border: "1px solid rgba(196,154,40,0.25)",
              backdropFilter: "blur(12px)",
              minWidth: 200,
              color: "rgba(196,154,40,0.85)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            <p className="font-semibold text-sm mb-2" style={{ color: "rgba(196,154,40,1)" }}>Print Statistics</p>
            {printStats.slicer && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Slicer</span>
                <span>{printStats.slicer}{printStats.slicerVersion ? ` ${printStats.slicerVersion}` : ""}</span>
              </div>
            )}
            {printStats.layerCount != null && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Layers</span>
                <span>{printStats.layerCount.toLocaleString()}</span>
              </div>
            )}
            {printStats.estimatedPrintTime && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Est. Time</span>
                <span>{printStats.estimatedPrintTime}</span>
              </div>
            )}
            {printStats.filamentUsedG != null && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Filament</span>
                <span>{printStats.filamentUsedG.toFixed(1)} g</span>
              </div>
            )}
            {printStats.layerHeight != null && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Layer Height</span>
                <span>{printStats.layerHeight} mm</span>
              </div>
            )}
            {printStats.nozzleDiameter != null && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Nozzle</span>
                <span>{printStats.nozzleDiameter} mm</span>
              </div>
            )}
            {printStats.infillPercent != null && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Infill</span>
                <span>{printStats.infillPercent}%</span>
              </div>
            )}
            {printStats.printTemperature != null && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Nozzle Temp</span>
                <span>{printStats.printTemperature}°C</span>
              </div>
            )}
            {printStats.bedTemperature != null && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Bed Temp</span>
                <span>{printStats.bedTemperature}°C</span>
              </div>
            )}
            {(printStats.bedSizeX != null) && (
              <div className="flex justify-between gap-4">
                <span style={{ color: "rgba(196,154,40,0.5)" }}>Bed Size</span>
                <span>{printStats.bedSizeX}×{printStats.bedSizeY}×{printStats.bedSizeZ ?? "?"}mm</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls bar */}
      {!loading && !error && totalLayers > 0 && (
        <div
          className="px-4 py-3 flex flex-col gap-2"
          style={{ borderTop: "1px solid rgba(196,154,40,0.12)", background: "rgba(8,13,20,0.95)" }}
        >
          {/* Layer scrubber */}
          <div className="flex items-center gap-3">
            <Layers className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(196,154,40,0.5)" }} />
            <input
              type="range"
              min={0}
              max={totalLayers}
              value={currentLayer}
              onChange={handleLayerScrub}
              className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgba(196,154,40,0.8) ${(currentLayer / totalLayers) * 100}%, rgba(196,154,40,0.15) ${(currentLayer / totalLayers) * 100}%)`,
                accentColor: "rgba(196,154,40,0.9)",
              }}
            />
            <span className="text-xs tabular-nums flex-shrink-0" style={{ color: "rgba(196,154,40,0.6)", fontFamily: "'Cinzel', serif", minWidth: 72 }}>
              {currentLayer} / {totalLayers}
            </span>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={isAnimating ? stopAnimation : startAnimation}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: isAnimating ? "rgba(196,154,40,0.15)" : "rgba(196,154,40,0.1)",
                border: "1px solid rgba(196,154,40,0.3)",
                color: "rgba(196,154,40,0.9)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              {isAnimating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isAnimating ? "Pause" : "Replay Build"}
            </button>
            <span className="text-xs" style={{ color: "rgba(196,154,40,0.35)", fontFamily: "'Cinzel', serif" }}>
              Drag to scrub • Scroll to zoom • Drag to orbit
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
