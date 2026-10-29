import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Download, Monitor, Smartphone, Tablet } from "lucide-react";
import {
  INITIAL_VISUAL_PRESETS,
  MAX_VISUAL_PRESET_BYTES,
  MAX_VISUAL_PRESETS,
  VISUAL_PRESET_STORAGE_KEY,
  parseVisualPreset,
  parseVisualPresetCollection,
  parseVisualPresetJson,
  serializeVisualPreset,
  type VisualPresetV1,
} from "@/visual-safe/visualPresetCodec";
import {
  VISUAL_TOKEN_DEFINITIONS,
  visualTokensToPreviewStyle,
  type VisualTokenKey,
  type VisualTokenValues,
} from "@/visual-safe/visualTokenSchema";
import { VisualControlsPanel } from "./VisualControlsPanel";
import { VisualSpecimens } from "./VisualSpecimens";
import "./visualLab.css";
import "./visualSpecimens.css";

type Viewport = "mobile" | "tablet" | "desktop";
type Status = { tone: "neutral" | "success" | "error"; message: string };

const BUILT_IN_NAMES = new Set(INITIAL_VISUAL_PRESETS.map((preset) => preset.name));

function currentProductionPreset(): VisualPresetV1 {
  return INITIAL_VISUAL_PRESETS[0];
}

function readLocalPresets(): VisualPresetV1[] {
  try {
    const raw = window.localStorage.getItem(VISUAL_PRESET_STORAGE_KEY);
    return raw ? parseVisualPresetCollection(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function persistLocalPresets(presets: VisualPresetV1[]): boolean {
  try {
    window.localStorage.setItem(VISUAL_PRESET_STORAGE_KEY, JSON.stringify(presets));
    return true;
  } catch {
    return false;
  }
}

function downloadPreset(preset: VisualPresetV1): void {
  const blob = new Blob([serializeVisualPreset(preset)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `living-nexus-visual-${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "preset"}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function VisualLabPage() {
  const previewRef = useRef<HTMLDivElement>(null);
  const [tokens, setTokens] = useState<VisualTokenValues>(() => ({ ...currentProductionPreset().tokens }));
  const [activePresetName, setActivePresetName] = useState("Current Production");
  const [localPresets, setLocalPresets] = useState<VisualPresetV1[]>([]);
  const [resolvedColors, setResolvedColors] = useState<Partial<Record<VisualTokenKey, string>>>({});
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [status, setStatus] = useState<Status>({ tone: "neutral", message: "Current Production is loaded. Changes stay inside this preview." });

  useEffect(() => {
    setLocalPresets(readLocalPresets());
  }, []);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;
    const computed = window.getComputedStyle(preview);
    const colors: Partial<Record<VisualTokenKey, string>> = {};
    for (const [rawKey, definition] of Object.entries(VISUAL_TOKEN_DEFINITIONS) as Array<[VisualTokenKey, (typeof VISUAL_TOKEN_DEFINITIONS)[VisualTokenKey]]>) {
      if (definition.kind === "color" && definition.fallbackVariable) {
        const value = computed.getPropertyValue(definition.fallbackVariable).trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) colors[rawKey] = value.toUpperCase();
      }
    }
    setResolvedColors(colors);
  }, []);

  const presets = useMemo(() => [...INITIAL_VISUAL_PRESETS, ...localPresets], [localPresets]);
  const previewStyle = useMemo(() => visualTokensToPreviewStyle(tokens) as CSSProperties, [tokens]);

  const applyPreset = (preset: VisualPresetV1) => {
    setTokens({ ...preset.tokens });
    setActivePresetName(preset.name);
    setStatus({ tone: "success", message: `${preset.name} is now applied only to this local preview.` });
  };

  const saveLocalPreset = (name: string) => {
    const parsed = parseVisualPreset({ version: 1, name, tokens });
    if (!parsed.ok) {
      setStatus({ tone: "error", message: parsed.error });
      return;
    }
    if (BUILT_IN_NAMES.has(parsed.preset.name)) {
      setStatus({ tone: "error", message: "Built-in presets remain read-only. Choose a new local name." });
      return;
    }
    const next = [...localPresets.filter((preset) => preset.name !== parsed.preset.name), parsed.preset].slice(-MAX_VISUAL_PRESETS);
    setLocalPresets(next);
    setActivePresetName(parsed.preset.name);
    const stored = persistLocalPresets(next);
    setStatus({ tone: stored ? "success" : "error", message: stored ? "Local preset saved in this browser." : "The browser blocked local preset storage; the preview is still active for this session." });
  };

  const deleteLocalPreset = (name: string) => {
    const next = localPresets.filter((preset) => preset.name !== name);
    setLocalPresets(next);
    persistLocalPresets(next);
    if (activePresetName === name) applyPreset(currentProductionPreset());
    setStatus({ tone: "success", message: `${name} was removed from local browser storage.` });
  };

  const importPreset = async (file: File) => {
    if (file.size > MAX_VISUAL_PRESET_BYTES) {
      setStatus({ tone: "error", message: "The preset file exceeds the 32 KB Visual Lab limit." });
      return;
    }
    const parsed = parseVisualPresetJson(await file.text());
    if (!parsed.ok) {
      setStatus({ tone: "error", message: parsed.error });
      return;
    }
    applyPreset(parsed.preset);
    setStatus({ tone: "success", message: `${parsed.preset.name} passed validation and is active in this preview.` });
  };

  const exportPreset = () => {
    const parsed = parseVisualPreset({ version: 1, name: activePresetName, tokens });
    if (!parsed.ok) {
      setStatus({ tone: "error", message: parsed.error });
      return;
    }
    downloadPreset(parsed.preset);
    setStatus({ tone: "success", message: `${parsed.preset.name} was exported as a validated local JSON file.` });
  };

  return (
    <div className="ln-visual-lab">
      <header className="ln-visual-lab__header">
        <div>
          <div className="ln-visual-lab__eyebrow">Living Nexus · Development Tool</div>
          <h1>Visual Lab</h1>
        </div>
        <p className="ln-visual-lab__isolation">Isolated preview: no app data, authentication, player, upload, Registry, or provenance record is mounted here.</p>
      </header>

      <div className="ln-visual-lab__layout">
        <div className="ln-visual-lab__controls">
          <VisualControlsPanel
            tokens={tokens}
            presets={presets}
            activePresetName={activePresetName}
            resolvedColors={resolvedColors}
            onUpdateToken={(key, value) => {
              setTokens((current) => ({ ...current, [key]: value }));
              setActivePresetName("Unsaved local study");
              setStatus({ tone: "neutral", message: "Preview updated. Save a local preset or export a validated JSON theme when ready." });
            }}
            onApplyPreset={applyPreset}
            onSaveLocalPreset={saveLocalPreset}
            onDeleteLocalPreset={deleteLocalPreset}
            onReset={() => applyPreset(currentProductionPreset())}
            onExport={exportPreset}
            onImport={importPreset}
          />
        </div>

        <main className="ln-visual-lab__workspace">
          <div className="ln-vl-viewport-controls" aria-label="Preview viewport">
            {([
              ["mobile", Smartphone, "Mobile"],
              ["tablet", Tablet, "Tablet"],
              ["desktop", Monitor, "Desktop"],
            ] as const).map(([id, Icon, label]) => (
              <button key={id} type="button" className={viewport === id ? "is-active" : ""} onClick={() => setViewport(id)}>
                <Icon size={15} /> {label}
              </button>
            ))}
            <span><Download size={14} /> Exported themes contain presentation values only.</span>
          </div>
          <p className="ln-visual-lab__status" data-tone={status.tone} aria-live="polite">{status.message}</p>
          <div className="ln-visual-lab__preview-frame" data-viewport={viewport}>
            <div ref={previewRef}>
              <VisualSpecimens previewStyle={previewStyle} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
