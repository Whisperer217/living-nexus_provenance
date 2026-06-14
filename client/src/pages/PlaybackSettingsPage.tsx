/**
 * Playback Settings — /settings/playback
 * Phase 211: Seamless Playback Transitions
 *
 * Controls:
 *  • Transition Mode: Standard | Gapless | Crossfade | Album Blend
 *  • Crossfade Duration (1–12 s)
 *  • Global Fade-In / Fade-Out (0–8 s)
 *  • Respect Per-Track Fades toggle
 *  • Pre-buffer next track toggle
 *  • Album Mode toggle
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  Music2, Layers, Waves, Disc3, ChevronRight,
  Volume2, VolumeX, Shuffle, SkipForward, Info,
  Save, RotateCcw,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD        = "#C49A28";
const GOLD_HOT    = "#E8B840";
const GOLD_DIM    = "#8B6914";
const PARCHMENT   = "#E8DFC8";
const SMOKE       = "#6B6555";
const IRON        = "#1C1A14";
const COAL        = "#000000";
const GOLD_BORDER = `1px solid rgba(196,154,40,0.28)`;
const GOLD_GLOW   = "0 0 24px rgba(196,154,40,0.18)";

// ── Types ──────────────────────────────────────────────────────────────────────
type TransitionMode = "standard" | "gapless" | "crossfade" | "album_blend";

interface PlaybackSettings {
  transitionMode: TransitionMode;
  crossfadeDuration: number;
  globalFadeIn: number;
  globalFadeOut: number;
  respectTrackFades: boolean;
  preloadNext: boolean;
  albumMode: boolean;
}

const DEFAULT_SETTINGS: PlaybackSettings = {
  transitionMode: "standard",
  crossfadeDuration: 5,
  globalFadeIn: 0,
  globalFadeOut: 0,
  respectTrackFades: true,
  preloadNext: true,
  albumMode: false,
};

// ── Transition mode cards ──────────────────────────────────────────────────────
const MODES: {
  id: TransitionMode;
  label: string;
  icon: React.ReactNode;
  desc: string;
  detail: string;
}[] = [
  {
    id: "standard",
    label: "Standard",
    icon: <Music2 size={18} />,
    desc: "Natural track end, brief pause",
    detail: "Each track plays to completion. A brief natural gap (< 0.5 s) separates tracks. No processing applied.",
  },
  {
    id: "gapless",
    label: "Gapless",
    icon: <Layers size={18} />,
    desc: "Zero silence between tracks",
    detail: "The next track begins the instant the current one ends. Ideal for live albums, DJ sets, and continuous mixes. No volume overlap.",
  },
  {
    id: "crossfade",
    label: "Crossfade",
    icon: <Waves size={18} />,
    desc: "Tracks blend into each other",
    detail: "The outgoing track fades out while the incoming track fades in simultaneously. Duration is configurable from 1–12 seconds. Spotify-style.",
  },
  {
    id: "album_blend",
    label: "Album Blend",
    icon: <Disc3 size={18} />,
    desc: "Conceptual album continuity",
    detail: "Tracks in the same album play gapless with per-track fade metadata honoured. Different albums use your global fade settings. Designed for concept albums and suites.",
  },
];

// ── Tooltip helper ─────────────────────────────────────────────────────────────
function InfoTip({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info size={13} style={{ color: SMOKE, cursor: "help" }} />
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[260px] text-xs"
          style={{ background: IRON, border: GOLD_BORDER, color: PARCHMENT }}
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span style={{ color: GOLD }}>{icon}</span>
      <span
        className="text-[11px] font-bold uppercase tracking-[0.22em]"
        style={{ fontFamily: "'Cinzel', serif", color: GOLD_DIM }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Toggle row ─────────────────────────────────────────────────────────────────
function ToggleRow({
  label, desc, tip, checked, onChange,
}: {
  label: string;
  desc: string;
  tip?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 py-4 px-5 rounded-xl"
      style={{ background: IRON, border: GOLD_BORDER }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold" style={{ color: PARCHMENT }}>{label}</span>
          {tip && <InfoTip text={tip} />}
        </div>
        <p className="text-xs" style={{ color: SMOKE }}>{desc}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-amber-500"
      />
    </div>
  );
}

// ── Slider row ─────────────────────────────────────────────────────────────────
function SliderRow({
  label, desc, tip, value, min, max, step, unit, onChange, disabled,
}: {
  label: string;
  desc: string;
  tip?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="py-4 px-5 rounded-xl"
      style={{
        background: IRON,
        border: GOLD_BORDER,
        opacity: disabled ? 0.45 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: PARCHMENT }}>{label}</span>
          {tip && <InfoTip text={tip} />}
        </div>
        <span
          className="text-sm font-mono font-bold tabular-nums"
          style={{ color: GOLD_HOT, minWidth: "3.5rem", textAlign: "right" }}
        >
          {value === 0 ? "Off" : `${value}${unit}`}
        </span>
      </div>
      <p className="text-xs mb-3" style={{ color: SMOKE }}>{desc}</p>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: SMOKE }}>
          {min === 0 ? "Off" : `${min}${unit}`}
        </span>
        <span className="text-[10px]" style={{ color: SMOKE }}>{max}{unit}</span>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function PlaybackSettingsPage() {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<PlaybackSettings>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: savedSettings, isLoading } = trpc.playback.getSettings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const saveMutation = trpc.playback.saveSettings.useMutation({
    onSuccess: (data) => {
      if (data) setSettings({ ...DEFAULT_SETTINGS, ...(data as unknown as Partial<PlaybackSettings>) });
      setSaving(false);
      setDirty(false);
      toast.success("Playback preferences saved.");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to save settings.");
      setSaving(false);
    },
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...(savedSettings as Partial<PlaybackSettings>) });
    }
  }, [savedSettings]);

  function patch(update: Partial<PlaybackSettings>) {
    setSettings(s => ({ ...s, ...update }));
    setDirty(true);
  }

  function handleSave() {
    setSaving(true);
    saveMutation.mutate(settings);
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
    setDirty(true);
  }

  const isCrossfade = settings.transitionMode === "crossfade";
  const isAlbumBlend = settings.transitionMode === "album_blend";

  return (
    <TooltipProvider>
      <div className="min-h-screen py-12 px-4" style={{ background: COAL }}>
        <div className="max-w-2xl mx-auto space-y-10">

          {/* ── Page header ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Waves size={14} style={{ color: GOLD }} />
              <span
                className="text-[11px] font-bold uppercase tracking-[0.22em]"
                style={{ fontFamily: "'Cinzel', serif", color: GOLD_DIM }}
              >
                Playback Settings
              </span>
            </div>
            <h1
              className="text-4xl font-bold leading-tight mb-3"
              style={{ fontFamily: "'Cinzel', serif", color: PARCHMENT, letterSpacing: "0.06em" }}
            >
              Seamless Transitions
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: SMOKE }}>
              Control how the Living Nexus player moves between tracks — from zero-gap gapless
              playback to Spotify-style crossfades and conceptual album blending.
            </p>
          </div>

          {/* ── Transition Mode ── */}
          <div
            className="rounded-2xl p-6"
            style={{ background: IRON, border: GOLD_BORDER, boxShadow: GOLD_GLOW }}
          >
            <SectionHeader label="Transition Mode" icon={<Shuffle size={14} />} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODES.map(mode => {
                const active = settings.transitionMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => patch({ transitionMode: mode.id })}
                    className="text-left rounded-xl p-4 transition-all duration-200"
                    style={{
                      background: active ? "rgba(196,154,40,0.12)" : "rgba(255,255,255,0.03)",
                      border: active
                        ? `1px solid rgba(196,154,40,0.6)`
                        : `1px solid rgba(255,255,255,0.07)`,
                      boxShadow: active ? "0 0 16px rgba(196,154,40,0.15)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span style={{ color: active ? GOLD_HOT : SMOKE }}>{mode.icon}</span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: active ? PARCHMENT : "#9CA3AF" }}
                      >
                        {mode.label}
                      </span>
                      {active && (
                        <span
                          className="ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(196,154,40,0.2)", color: GOLD }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: active ? SMOKE : "#4B5563" }}>
                      {mode.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Mode description */}
            <div
              className="mt-4 p-3 rounded-lg text-xs leading-relaxed"
              style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)", color: SMOKE }}
            >
              <ChevronRight size={12} className="inline mr-1" style={{ color: GOLD }} />
              {MODES.find(m => m.id === settings.transitionMode)?.detail}
            </div>
          </div>

          {/* ── Crossfade Duration ── */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ background: IRON, border: GOLD_BORDER }}
          >
            <SectionHeader label="Crossfade Duration" icon={<Waves size={14} />} />
            <SliderRow
              label="Crossfade Length"
              desc="How many seconds the outgoing and incoming tracks overlap."
              tip="Only active when Transition Mode is set to Crossfade. The outgoing track fades out while the incoming track fades in over this duration."
              value={isCrossfade ? settings.crossfadeDuration : settings.crossfadeDuration}
              min={1}
              max={12}
              step={0.5}
              unit="s"
              disabled={!isCrossfade}
              onChange={v => patch({ crossfadeDuration: v })}
            />
            {!isCrossfade && (
              <p className="text-xs" style={{ color: SMOKE }}>
                Switch to <strong style={{ color: GOLD }}>Crossfade</strong> mode above to enable this control.
              </p>
            )}
          </div>

          {/* ── Fade In / Out ── */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ background: IRON, border: GOLD_BORDER }}
          >
            <SectionHeader label="Track Fades" icon={<Volume2 size={14} />} />

            <ToggleRow
              label="Respect Per-Track Fade Settings"
              desc="When enabled, individual tracks can override the global fade values below."
              tip="Creators can set custom fade-in and fade-out durations on each track during upload. This toggle lets those per-track values take priority over your global settings."
              checked={settings.respectTrackFades}
              onChange={v => patch({ respectTrackFades: v })}
            />

            <SliderRow
              label="Global Fade-In"
              desc="Fade up from silence at the start of every track."
              tip="Applied to all tracks unless 'Respect Per-Track Fades' is on and the track has its own fade-in value."
              value={settings.globalFadeIn}
              min={0}
              max={8}
              step={0.5}
              unit="s"
              onChange={v => patch({ globalFadeIn: v })}
            />

            <SliderRow
              label="Global Fade-Out"
              desc="Fade to silence at the end of every track."
              tip="Applied to all tracks unless 'Respect Per-Track Fades' is on and the track has its own fade-out value. In Crossfade mode, the crossfade takes over instead."
              value={settings.globalFadeOut}
              min={0}
              max={8}
              step={0.5}
              unit="s"
              disabled={isCrossfade}
              onChange={v => patch({ globalFadeOut: v })}
            />

            {isCrossfade && (
              <p className="text-xs" style={{ color: SMOKE }}>
                In <strong style={{ color: GOLD }}>Crossfade</strong> mode, the crossfade handles the fade-out automatically.
                The global fade-out slider is disabled.
              </p>
            )}
          </div>

          {/* ── Advanced ── */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{ background: IRON, border: GOLD_BORDER }}
          >
            <SectionHeader label="Advanced" icon={<SkipForward size={14} />} />

            <ToggleRow
              label="Pre-buffer Next Track"
              desc="Load the next track in the background before the current one ends."
              tip="Reduces the chance of any gap caused by network latency. Recommended on. Disable if you're on a limited data plan."
              checked={settings.preloadNext}
              onChange={v => patch({ preloadNext: v })}
            />

            <ToggleRow
              label="Album Mode"
              desc="Tracks in the same album play as a continuous suite."
              tip="When enabled, tracks sharing the same album name play gapless and honour per-track fades. Tracks from different albums use your global settings. Ideal for concept albums."
              checked={settings.albumMode || isAlbumBlend}
              onChange={v => patch({ albumMode: v, transitionMode: v ? "album_blend" : "gapless" })}
            />
          </div>

          {/* ── Save bar ── */}
          <div
            className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl px-6 py-4"
            style={{
              background: "rgba(28,26,20,0.95)",
              border: dirty ? `1px solid rgba(196,154,40,0.5)` : GOLD_BORDER,
              backdropFilter: "blur(12px)",
              boxShadow: dirty ? "0 0 32px rgba(196,154,40,0.2)" : "none",
              transition: "all 0.3s",
            }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: dirty ? PARCHMENT : SMOKE }}>
                {dirty ? "You have unsaved changes" : "Settings saved"}
              </p>
              <p className="text-xs" style={{ color: SMOKE }}>
                Changes apply immediately to the global player
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={saving}
                className="gap-1.5"
                style={{ color: SMOKE }}
              >
                <RotateCcw size={13} />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !dirty}
                className="gap-1.5 font-bold"
                style={{
                  background: dirty ? GOLD : "rgba(196,154,40,0.2)",
                  color: dirty ? "#000" : GOLD_DIM,
                  border: "none",
                  transition: "all 0.2s",
                }}
              >
                <Save size={13} />
                {saving ? "Saving…" : "Save Settings"}
              </Button>
            </div>
          </div>

          {/* ── Footer note ── */}
          <div
            className="rounded-xl p-4 text-xs leading-relaxed"
            style={{ background: "rgba(196,154,40,0.04)", border: "1px solid rgba(196,154,40,0.1)", color: SMOKE }}
          >
            <VolumeX size={12} className="inline mr-1.5" style={{ color: GOLD_DIM }} />
            <strong style={{ color: GOLD_DIM }}>Note on per-track fades:</strong>{" "}
            Creators can set custom fade-in and fade-out values on individual tracks during upload.
            These values are stored as part of the track's provenance record and will be honoured
            when "Respect Per-Track Fades" is enabled.
          </div>

        </div>
      </div>
    </TooltipProvider>
  );
}
