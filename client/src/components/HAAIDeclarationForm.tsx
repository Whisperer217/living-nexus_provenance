/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — HAAIDeclarationForm
   Human-Authored via AI Instrument (HAAI) structured authorship
   declaration. Captures the creator's directorial intent across six
   dimensions before and during AI instrument use.

   This form is work-type-aware. The terminology, labels, placeholders,
   and hints adapt to the creative domain of the uploaded work:
     - audio      → music production language
     - lyrics     → poetic / lyrical language
     - manuscript → prose / academic / narrative language
     - comic      → visual art / illustration language
     - video      → cinematic / directorial language

   The 6 core database columns (haaiVisualConcept, haaiStyleLanguage,
   haaiInstrumentation, haaiVocalConveyance, haaiLyricalInspiration,
   haaiEmotionalTone) are preserved across all work types. Only the
   UI presentation layer changes.

   This form is shown in the upload flow when aiDisclosure is set to
   "human_authored_ai_instrument". It is also editable post-upload
   from the song/work settings panel.
═══════════════════════════════════════════════════════════════════ */

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Eye, Sliders, Mic2, Feather, Music2, Heart,
  BookOpen, Layers, AlignLeft, Zap, Lightbulb,
  Palette, Frame, Move, Film, Camera,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HAAIDeclaration {
  haaiVisualConcept: string;
  haaiStyleLanguage: string;
  haaiInstrumentation: string;
  haaiVocalConveyance: string;
  haaiLyricalInspiration: string;
  haaiEmotionalTone: string;
}

export type HAAIWorkType = "audio" | "lyrics" | "manuscript" | "comic" | "video";

interface HAAIDeclarationFormProps {
  value: HAAIDeclaration;
  onChange: (updated: HAAIDeclaration) => void;
  workType?: HAAIWorkType;
  compact?: boolean; // condensed layout for sidebar/modal contexts
}

// ─── Field Configuration by Work Type ────────────────────────────────────────

type FieldConfig = {
  key: keyof HAAIDeclaration;
  label: string;
  icon: React.ElementType;
  placeholder: string;
  hint: string;
};

const FIELD_CONFIGS: Record<HAAIWorkType, FieldConfig[]> = {

  // ── Audio / Music ──────────────────────────────────────────────────────────
  audio: [
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
  ],

  // ── Lyrics / Poetry ────────────────────────────────────────────────────────
  lyrics: [
    {
      key: "haaiVisualConcept",
      label: "Imagery & Metaphor",
      icon: Eye,
      placeholder: "Describe the central imagery or metaphorical landscape you were trying to paint…",
      hint: "What picture, symbol, or recurring image anchored the language of this work?",
    },
    {
      key: "haaiStyleLanguage",
      label: "Poetic Form & Style",
      icon: AlignLeft,
      placeholder: "Describe the structural style — free verse, structured rhyme, spoken word, prose poem…",
      hint: "Not a genre label — your intent. How did you want the words to land on the page and in the ear?",
    },
    {
      key: "haaiInstrumentation",
      label: "Rhythmic Mechanics",
      icon: Sliders,
      placeholder: "Describe the cadence, meter, or syllable structures you directed the AI to use…",
      hint: "Did you want a driving pulse, a broken stutter, a flowing breath? What rhythmic rules did you set?",
    },
    {
      key: "haaiVocalConveyance",
      label: "Intended Delivery",
      icon: Mic2,
      placeholder: "How is this meant to be spoken or sung? Aggressive, whispered, melodic, declarative…",
      hint: "The voice that should carry these words — its weight, its pace, its emotional register.",
    },
    {
      key: "haaiLyricalInspiration",
      label: "Foundational Concept",
      icon: Feather,
      placeholder: "Share the raw thought, memory, or specific phrase that sparked these lyrics…",
      hint: "The seed you brought. Even a single line, a name, a moment — this is your authorship anchor.",
    },
    {
      key: "haaiEmotionalTone",
      label: "Emotional Tone",
      icon: Heart,
      placeholder: "Describe the emotional weight and the feeling you were pursuing…",
      hint: "What were you carrying when you wrote this? What should the reader feel in their chest?",
    },
  ],

  // ── Manuscript / Written Work ──────────────────────────────────────────────
  manuscript: [
    {
      key: "haaiVisualConcept",
      label: "Structural Concept",
      icon: BookOpen,
      placeholder: "Describe the narrative arc, chapter structure, or organizational framework you were trying to build…",
      hint: "How did you envision this work being structured? Beginning, middle, end — or something more complex?",
    },
    {
      key: "haaiStyleLanguage",
      label: "Narrative Voice",
      icon: AlignLeft,
      placeholder: "Describe the prose style, perspective, and authorial voice you directed…",
      hint: "First person or third? Academic or conversational? Dense or spare? These are your directorial choices.",
    },
    {
      key: "haaiInstrumentation",
      label: "Thematic Elements",
      icon: Layers,
      placeholder: "What core themes, motifs, or philosophical arguments did you direct the AI to explore or avoid?",
      hint: "The intellectual and thematic architecture you brought — the ideas that had to be present.",
    },
    {
      key: "haaiVocalConveyance",
      label: "Pacing & Flow",
      icon: Zap,
      placeholder: "Describe the rhythm of the prose — urgent, methodical, reflective, chaotic…",
      hint: "How fast or slow should this move? Where should the reader slow down? Where should they be propelled forward?",
    },
    {
      key: "haaiLyricalInspiration",
      label: "Core Subject / Thesis",
      icon: Lightbulb,
      placeholder: "Share the foundational thesis, lived experience, or specific event that anchored this work…",
      hint: "The thing only you could bring. The lived knowledge, the argument, the testimony at the center of this work.",
    },
    {
      key: "haaiEmotionalTone",
      label: "Emotional Resonance",
      icon: Heart,
      placeholder: "What emotional state were you writing from? What should the reader feel?",
      hint: "The emotional contract between you and the reader — what you were carrying and what you intended to transfer.",
    },
  ],

  // ── Comic / Visual Art ─────────────────────────────────────────────────────
  comic: [
    {
      key: "haaiVisualConcept",
      label: "Composition & Framing",
      icon: Frame,
      placeholder: "Describe the visual composition, camera angles, and framing you directed…",
      hint: "How did you want the eye to move through the frame? What was centered, what was cut off?",
    },
    {
      key: "haaiStyleLanguage",
      label: "Aesthetic & Medium",
      icon: Palette,
      placeholder: "Describe the visual style — ink wash, cyberpunk, watercolor, high-contrast noir, manga…",
      hint: "Not a genre tag — your visual language. What does this world look like in your mind?",
    },
    {
      key: "haaiInstrumentation",
      label: "Color Palette & Lighting",
      icon: Sliders,
      placeholder: "What specific colors, lighting setups, or shadow structures did you direct the AI to use or avoid?",
      hint: "The specific palette choices that are yours — warm or cold, saturated or muted, harsh light or diffused.",
    },
    {
      key: "haaiVocalConveyance",
      label: "Action & Movement",
      icon: Move,
      placeholder: "Describe the kinetic energy or static tension you were trying to capture in the frame…",
      hint: "Is this a moment frozen in time, or does it feel like it is about to explode? What motion did you direct?",
    },
    {
      key: "haaiLyricalInspiration",
      label: "Subject & Character",
      icon: Feather,
      placeholder: "Share the core character details, setting, or specific visual reference that anchored this piece…",
      hint: "The specific person, place, or reference image you brought to the instrument. This is your authorship anchor.",
    },
    {
      key: "haaiEmotionalTone",
      label: "Atmosphere & Mood",
      icon: Heart,
      placeholder: "What is the atmospheric weight of the image? What should the viewer feel instantly?",
      hint: "The emotional hit — the feeling that should land in the first second of looking at this work.",
    },
  ],

  // ── Video / Multimedia ─────────────────────────────────────────────────────
  video: [
    {
      key: "haaiVisualConcept",
      label: "Cinematic Vision",
      icon: Film,
      placeholder: "Describe the overall cinematic look, visual texture, and world you were trying to create…",
      hint: "The visual world of this piece — its grain, its color grade, its sense of time and place.",
    },
    {
      key: "haaiStyleLanguage",
      label: "Directorial Style",
      icon: Eye,
      placeholder: "Describe the directorial approach — documentary, surreal, hyper-realistic, impressionistic…",
      hint: "Not a genre — your directorial intent. How does this piece want to be perceived?",
    },
    {
      key: "haaiInstrumentation",
      label: "Scene Mechanics",
      icon: Layers,
      placeholder: "What specific subjects, environments, or physical elements did you direct the AI to include or avoid?",
      hint: "The specific things that had to be in the frame — the objects, the environments, the physical details.",
    },
    {
      key: "haaiVocalConveyance",
      label: "Motion & Camera",
      icon: Camera,
      placeholder: "Describe the camera movement — handheld, sweeping drone, static, slow zoom, whip pan…",
      hint: "How the camera moves is a directorial choice. What did you direct? What feeling does that motion create?",
    },
    {
      key: "haaiLyricalInspiration",
      label: "Narrative Prompt",
      icon: Feather,
      placeholder: "Share the core action, event, or sequence that anchored the generation…",
      hint: "The specific moment or sequence you brought — the narrative seed that only you could have provided.",
    },
    {
      key: "haaiEmotionalTone",
      label: "Atmospheric Tone",
      icon: Heart,
      placeholder: "Describe the emotional weight and atmospheric tension of this sequence…",
      hint: "What should the viewer feel? What emotional contract does this piece make in the first frame?",
    },
  ],
};

// ─── Header Copy by Work Type ─────────────────────────────────────────────────

const HEADER_COPY: Record<HAAIWorkType, { title: string; subtitle: string }> = {
  audio: {
    title: "HAAI Authorship Declaration — Audio",
    subtitle:
      "You directed this work. The AI was your instrument — not your author. Document your creative intent across each dimension below. This declaration becomes part of your Witness ID provenance record.",
  },
  lyrics: {
    title: "HAAI Authorship Declaration — Lyrics",
    subtitle:
      "You are the poet. The AI rendered your language — it did not originate it. Document the creative direction behind these words. This declaration becomes part of your Witness ID provenance record.",
  },
  manuscript: {
    title: "HAAI Authorship Declaration — Manuscript",
    subtitle:
      "You are the author. The AI was your writing instrument — not your ghostwriter. Document the intellectual and creative direction you provided. This declaration becomes part of your Witness ID provenance record.",
  },
  comic: {
    title: "HAAI Authorship Declaration — Visual Work",
    subtitle:
      "You are the artist and director. The AI rendered your vision — it did not conceive it. Document the visual and compositional direction you provided. This declaration becomes part of your Witness ID provenance record.",
  },
  video: {
    title: "HAAI Authorship Declaration — Video / Multimedia",
    subtitle:
      "You are the director. The AI was your production instrument — not your creative lead. Document the cinematic and narrative direction you provided. This declaration becomes part of your Witness ID provenance record.",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function HAAIDeclarationForm({
  value,
  onChange,
  workType = "audio",
  compact = false,
}: HAAIDeclarationFormProps) {
  const handleChange = (key: keyof HAAIDeclaration, text: string) => {
    onChange({ ...value, [key]: text });
  };

  const fields = FIELD_CONFIGS[workType] ?? FIELD_CONFIGS.audio;
  const header = HEADER_COPY[workType] ?? HEADER_COPY.audio;

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
              {header.title}
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "oklch(0.60 0.03 280)" }}>
              {header.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className={compact ? "space-y-4" : "space-y-5"}>
        {fields.map(({ key, label, icon: Icon, placeholder, hint }) => (
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
                border: "1px solid #CBB183",
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
