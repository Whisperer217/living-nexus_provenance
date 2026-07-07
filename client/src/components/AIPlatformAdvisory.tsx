/**
 * AIPlatformAdvisory.tsx
 *
 * Contextual AI Licensing Advisory — Living Nexus
 *
 * Architecture:
 *   • AI_PLATFORMS is the single source of truth for all platform advisory data.
 *     Adding a new platform requires only a new entry in this array — no UI changes.
 *   • AIPlatformAdvisory renders a gold-accented guidance panel beneath any
 *     AI-tool selector when one or more platforms are active.
 *   • The panel feels like contextual guidance, not a warning or error.
 *
 * Usage:
 *   <AIPlatformAdvisory activePlatforms={["suno", "udio"]} />
 *
 *   Where activePlatforms is an array of AI_PLATFORM keys that the creator
 *   has currently selected/toggled on.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Data — add new platforms here only
// ─────────────────────────────────────────────────────────────────────────────

export interface AIPlatformEntry {
  /** Stable key — used as the activePlatforms identifier */
  key: string;
  /** Display name shown in the panel heading */
  name: string;
  /** Short category label (Music, Image, Text, Video…) */
  category: string;
  /** One-paragraph contextual guidance for commercial use */
  advisory: string;
  /** URL to the platform's official licensing / terms page */
  licensingUrl: string;
  /** Optional: link label override (defaults to "View Licensing Terms") */
  licensingLabel?: string;
}

export const AI_PLATFORMS: AIPlatformEntry[] = [
  {
    key: "suno",
    name: "Suno",
    category: "Music",
    advisory:
      "Suno's commercial-use rights depend on your subscription tier. Free-plan generations are licensed for non-commercial use only. Pro and Premier subscribers receive a commercial license for tracks generated on their account. Please verify that your current plan covers the intended commercial use of this work before publishing.",
    licensingUrl: "https://suno.com/terms",
    licensingLabel: "View Suno Terms of Service",
  },
  {
    key: "udio",
    name: "Udio",
    category: "Music",
    advisory:
      "Udio grants commercial rights to paid subscribers. Free-tier generations are restricted to personal, non-commercial use. If you intend to distribute, sell, or monetise this work, confirm that your Udio subscription includes a commercial license before publishing.",
    licensingUrl: "https://www.udio.com/terms-of-service",
    licensingLabel: "View Udio Terms of Service",
  },
  {
    key: "sonato",
    name: "Sonato",
    category: "Music",
    advisory:
      "Sonato's licensing terms govern how generated music may be used commercially. Please review your account tier and the current Sonato terms to confirm you hold the appropriate rights to publish and distribute this work.",
    licensingUrl: "https://sonato.ai",
    licensingLabel: "View Sonato Terms",
  },
  {
    key: "midjourney",
    name: "Midjourney",
    category: "Image",
    advisory:
      "Midjourney's commercial-use rights are tied to your subscription plan. Free and Basic plans restrict commercial use. Standard and Pro subscribers receive a general commercial license, while Enterprise subscribers receive additional protections. Verify your plan covers the intended commercial use of this image before publishing.",
    licensingUrl: "https://docs.midjourney.com/docs/terms-of-service",
    licensingLabel: "View Midjourney Terms of Service",
  },
  {
    key: "dalle",
    name: "DALL·E / ChatGPT",
    category: "Image & Text",
    advisory:
      "OpenAI grants you ownership of images and text generated through ChatGPT and DALL·E, subject to their usage policies. You may use the output for commercial purposes provided the content complies with OpenAI's content policy and usage terms. Review the current terms before publishing, as policies may be updated.",
    licensingUrl: "https://openai.com/policies/usage-policies",
    licensingLabel: "View OpenAI Usage Policies",
  },
  {
    key: "firefly",
    name: "Adobe Firefly",
    category: "Image",
    advisory:
      "Adobe Firefly is designed for commercial use and trained on licensed content. However, commercial rights are subject to your Adobe plan and the specific Firefly feature used. Ensure your subscription includes commercial licensing for generated assets before publishing.",
    licensingUrl: "https://www.adobe.com/legal/terms/enterprise-licensing/overview.html",
    licensingLabel: "View Adobe Licensing Terms",
  },
  {
    key: "stable_diffusion",
    name: "Stable Diffusion",
    category: "Image",
    advisory:
      "Stable Diffusion models are released under various open-source licenses (CreativeML, RAIL, Apache 2.0). Commercial use rights depend on the specific model version and any fine-tuning applied. If you used a hosted service (e.g., DreamStudio, Automatic1111), also review that provider's terms. Verify the applicable license before publishing.",
    licensingUrl: "https://stability.ai/use-policy",
    licensingLabel: "View Stability AI Use Policy",
  },
  {
    key: "runway",
    name: "Runway",
    category: "Video",
    advisory:
      "Runway grants subscribers a license to use generated video content for commercial purposes, subject to their terms of service and content policy. Free-tier users may face restrictions. Confirm your subscription level and review Runway's current terms before publishing.",
    licensingUrl: "https://runwayml.com/terms-of-service",
    licensingLabel: "View Runway Terms of Service",
  },
  {
    key: "elevenlabs",
    name: "ElevenLabs",
    category: "Voice / Audio",
    advisory:
      "ElevenLabs grants commercial use rights to paid subscribers. Free-plan generations are for personal, non-commercial use only. If this work includes AI-generated voice content, confirm your subscription tier covers commercial distribution before publishing.",
    licensingUrl: "https://elevenlabs.io/terms",
    licensingLabel: "View ElevenLabs Terms of Service",
  },
  {
    key: "claude",
    name: "Claude (Anthropic)",
    category: "Text",
    advisory:
      "Anthropic grants you ownership of text you generate using Claude, subject to their usage policies. Commercial use is permitted provided the content complies with Anthropic's acceptable use policy. Review the current terms before publishing, as policies may be updated.",
    licensingUrl: "https://www.anthropic.com/legal/aup",
    licensingLabel: "View Anthropic Acceptable Use Policy",
  },
  {
    key: "gemini",
    name: "Gemini (Google)",
    category: "Text & Image",
    advisory:
      "Google grants you rights to use Gemini-generated content, subject to the Google Terms of Service and Gemini Additional Terms. Commercial use is generally permitted, but verify the current terms for your specific use case before publishing.",
    licensingUrl: "https://ai.google.dev/gemini-api/terms",
    licensingLabel: "View Gemini API Terms",
  },
];

/** Lookup map for O(1) access by key */
export const AI_PLATFORM_MAP = new Map<string, AIPlatformEntry>(
  AI_PLATFORMS.map(p => [p.key, p])
);

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface AIPlatformAdvisoryProps {
  /**
   * Keys of the platforms currently active/selected by the creator.
   * Pass an empty array to render nothing.
   */
  activePlatforms: string[];
  /**
   * Optional: additional class names for the outer wrapper.
   */
  className?: string;
}

export function AIPlatformAdvisory({ activePlatforms, className = "" }: AIPlatformAdvisoryProps) {
  const entries = activePlatforms
    .map(k => AI_PLATFORM_MAP.get(k))
    .filter((e): e is AIPlatformEntry => e !== undefined);

  if (entries.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {entries.map(entry => (
        <div
          key={entry.key}
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(196,154,40,0.05)",
            border: "1px solid rgba(196,154,40,0.22)",
          }}
        >
          {/* Header bar */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid rgba(196,154,40,0.12)" }}
          >
            {/* ⓘ icon */}
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
              style={{
                background: "rgba(196,154,40,0.18)",
                color: "var(--ln-gold, #C49A28)",
                border: "1px solid rgba(196,154,40,0.35)",
              }}
            >
              i
            </div>
            <span
              className="text-[10px] font-heading tracking-widest uppercase"
              style={{ color: "var(--ln-gold, #C49A28)" }}
            >
              Commercial Use Reminder
            </span>
            <span
              className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full"
              style={{
                background: "rgba(196,154,40,0.12)",
                color: "rgba(196,154,40,0.7)",
                border: "1px solid rgba(196,154,40,0.2)",
              }}
            >
              {entry.name} · {entry.category}
            </span>
          </div>

          {/* Body */}
          <div className="px-3 py-2.5 space-y-2">
            <p className="text-xs leading-relaxed" style={{ color: "#A89A7A" }}>
              {entry.advisory}
            </p>
            <a
              href={entry.licensingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] hover:underline transition-opacity hover:opacity-80"
              style={{ color: "var(--ln-gold, #C49A28)" }}
            >
              {entry.licensingLabel ?? "View Licensing Terms"}
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
                <path d="M1.5 7.5L7.5 1.5M7.5 1.5H3M7.5 1.5V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: AIPlatformSelector
//
// A drop-in replacement for the plain "which tools were used?" toggle block.
// Renders the tool toggles AND the advisory panel together.
// ─────────────────────────────────────────────────────────────────────────────

export interface AIPlatformSelectorOption {
  key: string;
  label: string;
  active: boolean;
  onToggle: (active: boolean) => void;
}

interface AIPlatformSelectorProps {
  /** Options to render as toggle buttons */
  options: AIPlatformSelectorOption[];
  /** Optional "Other" text input value */
  otherValue?: string;
  /** Called when the "Other" input changes */
  onOtherChange?: (value: string) => void;
  /** Whether the "Other" toggle is active */
  otherActive?: boolean;
  /** Called when the "Other" toggle changes */
  onOtherToggle?: (active: boolean) => void;
  /** Visual style: "toggle" (UploadPage style) | "checkbox" (BatchUploadPage style) */
  variant?: "toggle" | "checkbox";
}

export function AIPlatformSelector({
  options,
  otherValue = "",
  onOtherChange,
  otherActive = false,
  onOtherToggle,
  variant = "toggle",
}: AIPlatformSelectorProps) {
  const activePlatformKeys = options
    .filter(o => o.active && AI_PLATFORM_MAP.has(o.key))
    .map(o => o.key);

  return (
    <div className="space-y-3">
      {/* Tool toggles */}
      <div className={variant === "toggle" ? "space-y-2" : "flex flex-wrap gap-3"}>
        {options.map(opt => (
          variant === "toggle" ? (
            <div key={opt.key} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => opt.onToggle(!opt.active)}
                className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors"
                style={{ background: opt.active ? "var(--ln-gold, #C49A28)" : "rgba(196,154,40,0.15)" }}
                aria-pressed={opt.active}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: opt.active ? "translateX(16px)" : "translateX(2px)" }}
                />
              </button>
              <span className="text-sm" style={{ color: opt.active ? "var(--ln-parchment, #E8DFC8)" : "#B8A88A" }}>
                {opt.label}
              </span>
            </div>
          ) : (
            <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={opt.active}
                onChange={e => opt.onToggle(e.target.checked)}
                className="accent-yellow-500"
              />
              <span className="text-xs" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>{opt.label}</span>
            </label>
          )
        ))}

        {/* Other toggle */}
        {onOtherToggle && (
          variant === "toggle" ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOtherToggle(!otherActive)}
                className="relative flex-shrink-0 w-9 h-5 rounded-full transition-colors"
                style={{ background: otherActive ? "var(--ln-gold, #C49A28)" : "rgba(196,154,40,0.15)" }}
                aria-pressed={otherActive}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ transform: otherActive ? "translateX(16px)" : "translateX(2px)" }}
                />
              </button>
              <span className="text-sm" style={{ color: otherActive ? "var(--ln-parchment, #E8DFC8)" : "#B8A88A" }}>Other</span>
            </div>
          ) : (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={otherActive}
                onChange={e => onOtherToggle(e.target.checked)}
                className="accent-yellow-500"
              />
              <span className="text-xs" style={{ color: "var(--ln-parchment, #E8DFC8)" }}>Other</span>
            </label>
          )
        )}
      </div>

      {/* Other name input */}
      {otherActive && onOtherChange && (
        <input
          type="text"
          placeholder="Name the tool…"
          value={otherValue}
          onChange={e => onOtherChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--ln-coal, rgba(22,22,22,0.8))",
            border: "1px solid rgba(196,154,40,0.3)",
            color: "var(--ln-parchment, #E8DFC8)",
          }}
        />
      )}

      {/* Advisory panel — appears for each known active platform */}
      <AIPlatformAdvisory activePlatforms={activePlatformKeys} />
    </div>
  );
}
