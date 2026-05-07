/**
 * PanelRegionEditor — Phase 148 Manifestation Studio
 * ─────────────────────────────────────────────────────────────────────────────
 * Visual editor for defining panel regions on a comic page.
 * Allows creators to draw bounding boxes, assign read order, type, transition,
 * emotional beat flag, and creator commentary.
 *
 * Outputs: PagePanelData[] serialized as JSON → panelRegionsJson
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Star, MessageSquare, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PagePanelData, PanelRegion, PanelType, TransitionType } from "@/components/reader/CinematicComicReader";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  pages: Array<{ pageNumber: number; url: string }>;
  panelData: PagePanelData[];
  onChange: (data: PagePanelData[]) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId() {
  return `panel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const PANEL_TYPES: { value: PanelType; label: string }[] = [
  { value: "panel", label: "Panel" },
  { value: "dialogue", label: "Dialogue" },
  { value: "narration", label: "Narration" },
  { value: "splash", label: "Splash" },
  { value: "reveal", label: "Reveal" },
  { value: "cinematic", label: "Cinematic" },
];

const TRANSITION_TYPES: { value: TransitionType; label: string }[] = [
  { value: "cut", label: "Cut" },
  { value: "fade", label: "Fade" },
  { value: "zoom", label: "Zoom" },
  { value: "pan", label: "Pan" },
];

const ACCENT = "var(--ln-gold)";
const VOID = "var(--ln-void)";
const SMOKE = "var(--ln-smoke)";
const PARCHMENT = "var(--ln-parchment)";

// ── Component ─────────────────────────────────────────────────────────────────

export default function PanelRegionEditor({ pages, panelData, onChange }: Props) {
  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const page = pages[selectedPage];
  const pageNum = page?.pageNumber ?? selectedPage + 1;

  // Get or create panel data for current page
  const currentPageData = panelData.find(p => p.page === pageNum);
  const regions: PanelRegion[] = currentPageData?.regions ?? [];

  const selectedRegion = regions.find(r => r.id === selectedRegionId) ?? null;

  // ── Coordinate helpers ────────────────────────────────────────────────────

  function getRelativeCoords(e: React.MouseEvent<HTMLDivElement>) {
    const el = overlayRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }

  // ── Region CRUD ───────────────────────────────────────────────────────────

  function updatePageData(newRegions: PanelRegion[]) {
    const updated = panelData.filter(p => p.page !== pageNum);
    if (newRegions.length > 0) {
      updated.push({ page: pageNum, regions: newRegions });
    }
    onChange(updated);
  }

  function addRegion(x: number, y: number, w: number, h: number) {
    const newRegion: PanelRegion = {
      id: generateId(),
      x, y, width: w, height: h,
      type: "panel",
      readOrder: regions.length + 1,
      transitionType: "cut",
      isEmotionalBeat: false,
      commentary: "",
    };
    const newRegions = [...regions, newRegion];
    // Re-assign readOrder
    newRegions.forEach((r, i) => { r.readOrder = i + 1; });
    updatePageData(newRegions);
    setSelectedRegionId(newRegion.id);
  }

  function deleteRegion(id: string) {
    const newRegions = regions.filter(r => r.id !== id);
    newRegions.forEach((r, i) => { r.readOrder = i + 1; });
    updatePageData(newRegions);
    if (selectedRegionId === id) setSelectedRegionId(null);
  }

  function updateRegion(id: string, patch: Partial<PanelRegion>) {
    updatePageData(regions.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  function moveRegionUp(id: string) {
    const idx = regions.findIndex(r => r.id === id);
    if (idx <= 0) return;
    const newRegions = [...regions];
    [newRegions[idx - 1], newRegions[idx]] = [newRegions[idx], newRegions[idx - 1]];
    newRegions.forEach((r, i) => { r.readOrder = i + 1; });
    updatePageData(newRegions);
  }

  function moveRegionDown(id: string) {
    const idx = regions.findIndex(r => r.id === id);
    if (idx < 0 || idx >= regions.length - 1) return;
    const newRegions = [...regions];
    [newRegions[idx], newRegions[idx + 1]] = [newRegions[idx + 1], newRegions[idx]];
    newRegions.forEach((r, i) => { r.readOrder = i + 1; });
    updatePageData(newRegions);
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    // If clicking on a region handle, don't start drawing
    const target = e.target as HTMLElement;
    if (target.dataset.regionHandle) return;
    setIsDrawing(true);
    const coords = getRelativeCoords(e);
    setDrawStart(coords);
    setDrawCurrent(coords);
    setSelectedRegionId(null);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDrawing) return;
    setDrawCurrent(getRelativeCoords(e));
  }

  function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }
    setIsDrawing(false);
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const w = Math.abs(drawCurrent.x - drawStart.x);
    const h = Math.abs(drawCurrent.y - drawStart.y);
    // Minimum size: 5% x 5%
    if (w >= 5 && h >= 5) {
      addRegion(x, y, w, h);
    }
    setDrawStart(null);
    setDrawCurrent(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
        <Move size={32} style={{ color: ACCENT }} />
        <p className="text-sm font-heading" style={{ color: SMOKE }}>
          Add pages in the Pages tab first, then define panel regions here.
        </p>
      </div>
    );
  }

  // Draw preview rect
  let drawRect: { x: number; y: number; w: number; h: number } | null = null;
  if (isDrawing && drawStart && drawCurrent) {
    drawRect = {
      x: Math.min(drawStart.x, drawCurrent.x),
      y: Math.min(drawStart.y, drawCurrent.y),
      w: Math.abs(drawCurrent.x - drawStart.x),
      h: Math.abs(drawCurrent.y - drawStart.y),
    };
  }

  return (
    <div className="flex gap-4 h-full" style={{ minHeight: 500 }}>
      {/* ── Page Selector ── */}
      <div
        className="flex flex-col gap-1 overflow-y-auto flex-shrink-0"
        style={{ width: 80, maxHeight: 600 }}
      >
        {pages.map((p, i) => (
          <button
            key={p.pageNumber}
            onClick={() => { setSelectedPage(i); setSelectedRegionId(null); }}
            className="relative rounded overflow-hidden flex-shrink-0 transition-all"
            style={{
              width: 72, height: 96,
              border: `2px solid ${i === selectedPage ? ACCENT : "rgba(196,154,40,0.15)"}`,
              opacity: i === selectedPage ? 1 : 0.6,
            }}
          >
            <img src={p.url} alt={`Page ${p.pageNumber}`} className="w-full h-full object-cover" />
            <div
              className="absolute bottom-0 left-0 right-0 text-center text-xs font-heading font-bold py-0.5"
              style={{ background: "rgba(13,20,25,0.85)", color: i === selectedPage ? ACCENT : SMOKE }}
            >
              {p.pageNumber}
            </div>
            {/* Region count badge */}
            {(() => {
              const cnt = (panelData.find(pd => pd.page === p.pageNumber)?.regions ?? []).length;
              return cnt > 0 ? (
                <div
                  className="absolute top-1 right-1 rounded-full text-xs font-bold w-4 h-4 flex items-center justify-center"
                  style={{ background: ACCENT, color: VOID, fontSize: 9 }}
                >
                  {cnt}
                </div>
              ) : null;
            })()}
          </button>
        ))}
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-heading font-bold tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.6)" }}>
            Page {pageNum} — {regions.length} region{regions.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs" style={{ color: SMOKE }}>
            Click and drag on the image to draw a panel region
          </p>
        </div>

        {/* Image + overlay */}
        <div
          className="relative rounded-xl overflow-hidden flex-shrink-0"
          style={{
            maxWidth: 480,
            border: "1px solid rgba(196,154,40,0.15)",
            cursor: isDrawing ? "crosshair" : "crosshair",
            userSelect: "none",
          }}
        >
          {page?.url ? (
            <img
              ref={imgRef}
              src={page.url}
              alt={`Page ${pageNum}`}
              className="w-full block"
              draggable={false}
            />
          ) : (
            <div className="w-full aspect-[2/3] flex items-center justify-center" style={{ background: "rgba(196,154,40,0.05)" }}>
              <p className="text-xs" style={{ color: SMOKE }}>No image</p>
            </div>
          )}

          {/* Overlay for drawing */}
          <div
            ref={overlayRef}
            className="absolute inset-0"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { if (isDrawing) { setIsDrawing(false); setDrawStart(null); setDrawCurrent(null); } }}
          >
            {/* Existing regions */}
            {regions.map((region, i) => (
              <div
                key={region.id}
                data-region-handle="true"
                onClick={(e) => { e.stopPropagation(); setSelectedRegionId(region.id); }}
                className="absolute transition-all"
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                  border: `2px solid ${region.id === selectedRegionId ? ACCENT : "rgba(196,154,40,0.5)"}`,
                  background: region.id === selectedRegionId ? "rgba(196,154,40,0.12)" : "rgba(196,154,40,0.04)",
                  cursor: "pointer",
                  boxShadow: region.id === selectedRegionId ? `0 0 0 1px ${ACCENT}` : "none",
                }}
              >
                {/* Read order badge */}
                <div
                  className="absolute top-0 left-0 text-xs font-heading font-bold px-1.5 py-0.5 rounded-br"
                  style={{
                    background: region.id === selectedRegionId ? ACCENT : "rgba(196,154,40,0.7)",
                    color: VOID,
                    fontSize: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {i + 1}
                  {region.isEmotionalBeat && " ★"}
                </div>
              </div>
            ))}

            {/* Drawing preview */}
            {drawRect && drawRect.w > 0 && drawRect.h > 0 && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${drawRect.x}%`,
                  top: `${drawRect.y}%`,
                  width: `${drawRect.w}%`,
                  height: `${drawRect.h}%`,
                  border: `2px dashed ${ACCENT}`,
                  background: "rgba(196,154,40,0.08)",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Region List + Editor ── */}
      <div
        className="flex flex-col gap-3 overflow-y-auto flex-shrink-0"
        style={{ width: 240, maxHeight: 600 }}
      >
        <p className="text-xs font-heading font-bold tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.6)" }}>
          Regions
        </p>

        {regions.length === 0 && (
          <p className="text-xs" style={{ color: SMOKE }}>Draw on the image to add regions.</p>
        )}

        {regions.map((region, i) => (
          <div
            key={region.id}
            className="rounded-xl p-3 space-y-2 cursor-pointer transition-all"
            onClick={() => setSelectedRegionId(region.id)}
            style={{
              background: region.id === selectedRegionId ? "rgba(196,154,40,0.10)" : "rgba(196,154,40,0.04)",
              border: `1px solid ${region.id === selectedRegionId ? "rgba(196,154,40,0.35)" : "rgba(196,154,40,0.12)"}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold" style={{ color: region.id === selectedRegionId ? ACCENT : PARCHMENT }}>
                #{i + 1} {region.type}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); moveRegionUp(region.id); }}
                  className="p-0.5 rounded hover:opacity-80"
                  style={{ color: SMOKE }}
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveRegionDown(region.id); }}
                  className="p-0.5 rounded hover:opacity-80"
                  style={{ color: SMOKE }}
                >
                  <ChevronDown size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteRegion(region.id); }}
                  className="p-0.5 rounded hover:opacity-80"
                  style={{ color: "#ef4444" }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {region.id === selectedRegionId && (
              <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                {/* Type */}
                <Select
                  value={region.type}
                  onValueChange={(v) => updateRegion(region.id, { type: v as PanelType })}
                >
                  <SelectTrigger className="h-7 text-xs studio-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PANEL_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Transition */}
                <Select
                  value={region.transitionType ?? "cut"}
                  onValueChange={(v) => updateRegion(region.id, { transitionType: v as TransitionType })}
                >
                  <SelectTrigger className="h-7 text-xs studio-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSITION_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Emotional beat toggle */}
                <button
                  onClick={() => updateRegion(region.id, { isEmotionalBeat: !region.isEmotionalBeat })}
                  className="flex items-center gap-2 text-xs w-full px-2 py-1.5 rounded-lg transition-all"
                  style={{
                    background: region.isEmotionalBeat ? "rgba(196,154,40,0.15)" : "rgba(255,255,255,0.04)",
                    color: region.isEmotionalBeat ? ACCENT : SMOKE,
                    border: `1px solid ${region.isEmotionalBeat ? "rgba(196,154,40,0.3)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <Star size={11} />
                  Emotional Beat
                </button>

                {/* Creator Commentary */}
                <div className="space-y-1">
                  <label className="flex items-center gap-1 text-xs" style={{ color: SMOKE }}>
                    <MessageSquare size={10} />
                    Commentary
                  </label>
                  <Textarea
                    value={region.commentary ?? ""}
                    onChange={(e) => updateRegion(region.id, { commentary: e.target.value })}
                    placeholder="Creator's note for this panel…"
                    rows={2}
                    className="studio-input resize-none text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
