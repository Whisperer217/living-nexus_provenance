/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — HAAIDeclarationForm
   Human-Authored via AI Instrument (HAAI) structured authorship
   declaration. Captures the creator's directorial intent across six
   dimensions before and during AI instrument use.

   This form is shown in the upload flow when aiDisclosure is set to
   "human_authored_ai_instrument". It is also editable post-upload
   from the song settings panel.
═══════════════════════════════════════════════════════════════════ */

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Eye, Sliders, Mic2, Feather, Music2, Heart
} from "lucide-react";

export interface HAAIDeclaration {
  haaiVisualConcept: string;
  haaiStyleLanguage: string;
  haaiInstrumentation: string;
  haaiVocalConveyance: string;
  haaiLyricalInspiration: string;
  haaiEmotionalTone: string;
}

interface HAAIDeclarationFormProps {
  value: HAAIDeclaration;
  onChange: (updated: HAAIDeclaration) => void;
  compact?: boolean; // condensed layout for sidebar/modal contexts
}

const FIELDS: {
  key: keyof HAAIDeclaration;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  hint: string;
}[] = [
  {
    key: "haaiVisualConcept",
    label: "Visual Concept",
    icon: Eye,
    placeholder: "Describe the visual or cinematic image you were trying to articulate…",
    hint: "What did you see in your mind before you opened the instrument? Color, scene, movement, atmosphere.",
  },
  {
    key: "haaiStyleLanguage",
    label: "Style in Plain Language",
    icon: Sliders,
    placeholder: "Describe your desired style in your own words…",
    hint: "Not genre tags — your words. How does this work feel? What does it sound like to you?",
  },
  {
    key: "haaiInstrumentation",
    label: "Instrumentation",
    icon: Music2,
    placeholder: "Describe the sonic palette and instrument choices…",
    hint: "What instruments, textures, or sonic layers did you direct the AI to use or avoid?",
  },
  {
    key: "haaiVocalConveyance",
    label: "Vocal Conveyance",
    icon: Mic2,
    placeholder: "Describe the voice, tone, and delivery you were trying to convey…",
    hint: "The character of the voice — raw, reverent, commanding, broken, triumphant. What were you reaching for?",
  },
  {
    key: "haaiLyricalInspiration",
    label: "Lyrical Inspiration",
    icon: Feather,
    placeholder: "Share the lyrical seed, inspiration snippets, or idea fragments that anchored this work…",
    hint: "These are your words — the raw material you brought to the instrument. Even a single line counts.",
  },
  {
    key: "haaiEmotionalTone",
    label: "Emotional Tone",
    icon: Heart,
    placeholder: "Describe the emotional tone and the feeling you were pursuing…",
    hint: "What emotional state were you in? What did you want the listener to feel? What weight were you carrying?",
  },
];

export function HAAIDeclarationForm({
  value,
  onChange,
  compact = false,
}: HAAIDeclarationFormProps) {
  const handleChange = (key: keyof HAAIDeclaration, text: string) => {
    onChange({ ...value, [key]: text });
  };

  return (
    <div className="space-y-1">
      {/* Header */}
      <div
        className="rounded-xl px-4 py-3 mb-4"
        style={{
          background: "oklch(0.14 0.025 280)",
          border: "1px solid oklch(0.84 0.155 85 / 0.25)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "oklch(0.84 0.155 85 / 0.15)" }}
          >
            <Feather className="w-4 h-4" style={{ color: "oklch(0.84 0.155 85)" }} />
          </div>
          <div>
            <p
              className="text-sm font-semibold font-heading"
              style={{ color: "oklch(0.84 0.155 85)" }}
            >
              HAAI Authorship Declaration
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "oklch(0.60 0.03 280)" }}>
              You directed this work. The AI was your instrument — not your author.
              Document your creative intent across each dimension below. This declaration
              becomes part of your Witness ID provenance record.
            </p>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className={compact ? "space-y-4" : "space-y-5"}>
        {FIELDS.map(({ key, label, icon: Icon, placeholder, hint }) => (
          <div key={key} className="space-y-1.5">
            <Label
              htmlFor={`haai-${key}`}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "oklch(0.75 0.04 280)" }}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: "oklch(0.84 0.155 85 / 0.7)" }} />
              {label}
            </Label>
            <Textarea
              id={`haai-${key}`}
              value={value[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={placeholder}
              rows={compact ? 2 : 3}
              className="resize-none text-sm"
              style={{
                background: "oklch(0.11 0.015 280)",
                border: "1px solid oklch(0.22 0.02 280)",
                color: "oklch(0.88 0.02 280)",
              }}
            />
            <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.48 0.03 280)" }}>
              {hint}
            </p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        className="rounded-lg px-3 py-2 mt-4"
        style={{
          background: "oklch(0.65 0.2 300 / 0.08)",
          border: "1px solid oklch(0.65 0.2 300 / 0.2)",
        }}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: "oklch(0.65 0.2 300 / 0.9)" }}>
          <strong>Legal note:</strong> This declaration is stored as part of your Witness ID
          provenance record and supports — but does not replace — official copyright registration.
          The authorship of this work is attributed to you as the human director and author of
          intent. The AI instrument is credited as a rendering tool only.
        </p>
      </div>
    </div>
  );
}

export const EMPTY_HAAI: HAAIDeclaration = {
  haaiVisualConcept: "",
  haaiStyleLanguage: "",
  haaiInstrumentation: "",
  haaiVocalConveyance: "",
  haaiLyricalInspiration: "",
  haaiEmotionalTone: "",
};
