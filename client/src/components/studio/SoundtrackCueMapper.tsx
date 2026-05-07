/**
 * SoundtrackCueMapper — Phase 148 Manifestation Studio
 * ─────────────────────────────────────────────────────────────────────────────
 * Maps soundtrack tracks to pages/panel regions.
 * Outputs: SoundtrackCue[] serialized as JSON → soundtrackCuesJson
 */

import { useState } from "react";
import { Plus, Trash2, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SoundtrackCue } from "@/components/reader/CinematicComicReader";

interface Props {
  pages: Array<{ pageNumber: number }>;
  cues: SoundtrackCue[];
  onChange: (cues: SoundtrackCue[]) => void;
}

const ACCENT = "var(--ln-gold)";
const SMOKE = "var(--ln-smoke)";
const PARCHMENT = "var(--ln-parchment)";
const VOID = "var(--ln-void)";

export default function SoundtrackCueMapper({ pages, cues, onChange }: Props) {
  function addCue() {
    const newCue: SoundtrackCue = {
      page: pages[0]?.pageNumber ?? 1,
      trackId: "",
      startTime: 0,
      label: "",
    };
    onChange([...cues, newCue]);
  }

  function updateCue(index: number, patch: Partial<SoundtrackCue>) {
    onChange(cues.map((c, i) => i === index ? { ...c, ...patch } : c));
  }

  function deleteCue(index: number) {
    onChange(cues.filter((_, i) => i !== index));
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-50">
        <Music size={32} style={{ color: ACCENT }} />
        <p className="text-sm font-heading" style={{ color: SMOKE }}>
          Add pages first, then map soundtrack cues here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-heading font-bold tracking-widest uppercase" style={{ color: "rgba(196,154,40,0.6)" }}>
            Soundtrack Cues
          </h4>
          <p className="text-xs mt-0.5" style={{ color: SMOKE }}>
            Map music tracks to specific pages or panel regions. The reader will trigger these cues during guided playback.
          </p>
        </div>
        <button
          onClick={addCue}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-heading font-bold transition-all hover:opacity-80"
          style={{ background: "rgba(196,154,40,0.12)", color: ACCENT, border: "1px solid rgba(196,154,40,0.25)" }}
        >
          <Plus size={12} />
          Add Cue
        </button>
      </div>

      {cues.length === 0 && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: "rgba(196,154,40,0.04)", border: "1px dashed rgba(196,154,40,0.15)" }}
        >
          <Music size={24} className="mx-auto mb-2 opacity-40" style={{ color: ACCENT }} />
          <p className="text-xs" style={{ color: SMOKE }}>
            No soundtrack cues yet. Click "Add Cue" to map a track to a page.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {cues.map((cue, i) => (
          <div
            key={i}
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(196,154,40,0.05)", border: "1px solid rgba(196,154,40,0.12)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold" style={{ color: ACCENT }}>
                Cue #{i + 1}
              </span>
              <button
                onClick={() => deleteCue(i)}
                className="p-1 rounded hover:opacity-80"
                style={{ color: "#ef4444" }}
              >
                <Trash2 size={12} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Page */}
              <div className="space-y-1">
                <label className="text-xs" style={{ color: SMOKE }}>Page</label>
                <Select
                  value={String(cue.page)}
                  onValueChange={(v) => updateCue(i, { page: parseInt(v) })}
                >
                  <SelectTrigger className="h-8 text-xs studio-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pages.map(p => (
                      <SelectItem key={p.pageNumber} value={String(p.pageNumber)} className="text-xs">
                        Page {p.pageNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start time */}
              <div className="space-y-1">
                <label className="text-xs" style={{ color: SMOKE }}>Start Time (sec)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={cue.startTime}
                  onChange={(e) => updateCue(i, { startTime: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-xs studio-input"
                />
              </div>
            </div>

            {/* Track ID */}
            <div className="space-y-1">
              <label className="text-xs" style={{ color: SMOKE }}>Track ID or URL</label>
              <Input
                value={cue.trackId}
                onChange={(e) => updateCue(i, { trackId: e.target.value })}
                placeholder="Track ID, WID, or audio URL…"
                className="h-8 text-xs studio-input"
              />
            </div>

            {/* Label */}
            <div className="space-y-1">
              <label className="text-xs" style={{ color: SMOKE }}>Label (optional)</label>
              <Input
                value={cue.label ?? ""}
                onChange={(e) => updateCue(i, { label: e.target.value })}
                placeholder="e.g. Opening Theme, Battle Theme…"
                className="h-8 text-xs studio-input"
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl p-4"
        style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.10)" }}
      >
        <p className="text-xs font-heading font-bold tracking-wide uppercase mb-2" style={{ color: "rgba(196,154,40,0.5)" }}>
          Coming Soon
        </p>
        <ul className="space-y-1">
          {["Auto-sync with Living Nexus audio library", "Per-panel cue triggers", "Crossfade control", "Ambient loop layers"].map(f => (
            <li key={f} className="text-xs flex items-center gap-2" style={{ color: SMOKE }}>
              <span style={{ color: "rgba(196,154,40,0.4)" }}>·</span> {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
