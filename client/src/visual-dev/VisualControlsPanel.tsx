import { useRef, useState } from "react";
import { Download, FileUp, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import {
  VISUAL_TOKEN_DEFINITIONS,
  VISUAL_TOKEN_GROUPS,
  type VisualTokenKey,
  type VisualTokenValues,
} from "@/visual-safe/visualTokenSchema";
import type { VisualPresetV1 } from "@/visual-safe/visualPresetCodec";

interface VisualControlsPanelProps {
  tokens: VisualTokenValues;
  presets: VisualPresetV1[];
  activePresetName: string;
  resolvedColors: Partial<Record<VisualTokenKey, string>>;
  onUpdateToken: (key: VisualTokenKey, value: string | number) => void;
  onApplyPreset: (preset: VisualPresetV1) => void;
  onSaveLocalPreset: (name: string) => void;
  onDeleteLocalPreset: (name: string) => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
}

function controlColor(value: string | undefined): string {
  return /^#[0-9A-Fa-f]{6}$/.test(value ?? "") ? value! : "#C49A28";
}

export function VisualControlsPanel({
  tokens,
  presets,
  activePresetName,
  resolvedColors,
  onUpdateToken,
  onApplyPreset,
  onSaveLocalPreset,
  onDeleteLocalPreset,
  onReset,
  onExport,
  onImport,
}: VisualControlsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [presetName, setPresetName] = useState("");

  const submitPreset = () => {
    if (!presetName.trim()) return;
    onSaveLocalPreset(presetName);
    setPresetName("");
  };

  return (
    <aside className="ln-vl-controls" aria-label="Visual Controls">
      <div className="ln-vl-controls__section">
        <span className="ln-visual-lab__label">Visual Controls</span>
        <p>Every adjustment is preview-scoped, local, and reversible. No application record is changed.</p>
      </div>

      <div className="ln-vl-controls__section">
        <div className="ln-vl-controls__section-heading">
          <span className="ln-visual-lab__label">Presets</span>
          <span className="ln-vl-controls__active">{activePresetName}</span>
        </div>
        <div className="ln-vl-preset-list">
          {presets.map((preset) => {
            const builtIn = ["Current Production", "Dark Archive", "Gold Minimal", "Cinematic", "Compact Desktop", "Mobile Dense", "Experimental"].includes(preset.name);
            return (
              <div key={preset.name} className="ln-vl-preset-row">
                <button type="button" className={preset.name === activePresetName ? "is-active" : ""} onClick={() => onApplyPreset(preset)}>
                  {preset.name}
                </button>
                {!builtIn && (
                  <button type="button" className="ln-vl-icon-button" onClick={() => onDeleteLocalPreset(preset.name)} aria-label={`Delete ${preset.name}`}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="ln-vl-save-row">
          <input value={presetName} onChange={(event) => setPresetName(event.target.value)} maxLength={48} placeholder="Save local preset" aria-label="Local preset name" />
          <button type="button" onClick={submitPreset} disabled={!presetName.trim()} aria-label="Save local preset"><Save size={15} /></button>
        </div>
      </div>

      {VISUAL_TOKEN_GROUPS.map((group) => {
        const entries = (Object.entries(VISUAL_TOKEN_DEFINITIONS) as Array<[VisualTokenKey, (typeof VISUAL_TOKEN_DEFINITIONS)[VisualTokenKey]]>)
          .filter(([, definition]) => definition.group === group.id);
        return (
          <fieldset key={group.id} className="ln-vl-controls__section">
            <legend className="ln-visual-lab__label">{group.label}</legend>
            {entries.map(([key, definition]) => {
              const value = tokens[key];
              if (definition.kind === "color") {
                const colorValue = typeof value === "string" ? value : resolvedColors[key];
                return (
                  <label className="ln-vl-control" key={key}>
                    <span>{definition.label}</span>
                    <span className="ln-vl-color-control">
                      <input type="color" value={controlColor(colorValue)} onChange={(event) => onUpdateToken(key, event.target.value.toUpperCase())} />
                      <code>{colorValue ?? "active theme"}</code>
                    </span>
                  </label>
                );
              }

              const numericValue = typeof value === "number" ? value : definition.min ?? 0;
              const unit = "unit" in definition ? definition.unit ?? "" : "";
              return (
                <label className="ln-vl-control" key={key}>
                  <span>{definition.label}</span>
                  <span className="ln-vl-range-control">
                    <input
                      type="range"
                      min={definition.min}
                      max={definition.max}
                      step={definition.step}
                      value={numericValue}
                      onChange={(event) => onUpdateToken(key, Number(event.target.value))}
                    />
                    <output>{numericValue}{unit}</output>
                  </span>
                </label>
              );
            })}
          </fieldset>
        );
      })}

      <div className="ln-vl-controls__section ln-vl-controls__actions">
        <button type="button" onClick={onReset}><RotateCcw size={15} /> Reset to Current Production</button>
        <button type="button" onClick={onExport}><Download size={15} /> Export Theme</button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void onImport(file);
            event.currentTarget.value = "";
          }}
        />
        <button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={15} /> Import Theme</button>
        <p><FileUp size={13} /> Import accepts only versioned, validated visual values. CSS, URLs, unknown fields, and executable input are rejected.</p>
      </div>
    </aside>
  );
}
