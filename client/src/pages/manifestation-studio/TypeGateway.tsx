/* ═══════════════════════════════════════════════════════════════════
   TYPE GATEWAY — Immersive manifestation type selector
   The first thing creators see: "What are you manifesting today?"
   Each card has its own atmosphere, language, and visual identity.
═══════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Music, PenTool, BookOpen, Film, Palette } from "lucide-react";
import { type ManifestationType, ATMOSPHERES } from "./types";

const TYPE_ICONS: Record<ManifestationType, typeof Music> = {
  music: Music,
  lyrics: PenTool,
  comic: Palette,
  manuscript: BookOpen,
  video: Film,
};

interface TypeGatewayProps {
  onSelect: (type: ManifestationType) => void;
}

export function TypeGateway({ onSelect }: TypeGatewayProps) {
  const [hovered, setHovered] = useState<ManifestationType | null>(null);
  const types = Object.values(ATMOSPHERES);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12 max-w-xl">
        <p
          className="text-[10px] uppercase tracking-[0.25em] mb-3"
          style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
        >
          Living Nexus Manifestation Studio
        </p>
        <h1
          className="text-3xl md:text-4xl font-bold mb-3"
          style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
        >
          What Are You Manifesting?
        </h1>
        <p
          className="text-sm md:text-base"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)", lineHeight: 1.6 }}
        >
          Choose your medium. Each path is purpose-built for its art form —
          unique atmosphere, guided process, and live provenance.
        </p>
      </div>

      {/* Type Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {types.map((atm) => {
          const Icon = TYPE_ICONS[atm.type];
          const isHovered = hovered === atm.type;

          return (
            <button
              key={atm.type}
              onClick={() => onSelect(atm.type)}
              onMouseEnter={() => setHovered(atm.type)}
              onMouseLeave={() => setHovered(null)}
              className="group relative flex flex-col items-start p-6 rounded-2xl text-left transition-all duration-300"
              style={{
                background: isHovered ? atm.colorBg : "rgba(17,16,9,0.8)",
                border: `1px solid ${isHovered ? atm.colorBorder : "rgba(196,154,40,0.12)"}`,
                boxShadow: isHovered ? `0 8px 32px ${atm.colorGlow}, inset 0 0 40px ${atm.colorBg}` : "none",
                transform: isHovered ? "translateY(-4px) scale(1.02)" : "none",
              }}
            >
              {/* Ambient glow */}
              {isHovered && (
                <div
                  className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none"
                  style={{ background: atm.gradient }}
                />
              )}

              {/* Icon + Type */}
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isHovered ? `${atm.colorPrimary}20` : "rgba(196,154,40,0.06)",
                    border: `1px solid ${isHovered ? atm.colorPrimary : "rgba(196,154,40,0.15)"}`,
                  }}
                >
                  <Icon
                    size={20}
                    style={{ color: isHovered ? atm.colorPrimary : "rgba(196,154,40,0.6)" }}
                  />
                </div>
                <div>
                  <h3
                    className="text-base font-semibold"
                    style={{ fontFamily: "'Cinzel', serif", color: isHovered ? atm.colorPrimary : "var(--ln-parchment)" }}
                  >
                    {atm.label}
                  </h3>
                  <p
                    className="text-[11px] italic"
                    style={{ fontFamily: "'Cormorant Garamond', serif", color: isHovered ? atm.colorPrimary : "rgba(245,237,216,0.5)" }}
                  >
                    {atm.tagline}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p
                className="text-xs leading-relaxed relative z-10"
                style={{ color: "rgba(245,237,216,0.6)" }}
              >
                {atm.description}
              </p>

              {/* Bottom accent line */}
              <div
                className="absolute bottom-0 left-6 right-6 h-px transition-all duration-300"
                style={{
                  background: isHovered
                    ? `linear-gradient(90deg, transparent, ${atm.colorPrimary}, transparent)`
                    : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Reassurance */}
      <p
        className="mt-8 text-[11px] text-center"
        style={{ color: "rgba(245,237,216,0.4)", fontFamily: "'Cormorant Garamond', serif" }}
      >
        Every manifestation type uses the same provenance infrastructure —
        your work is cryptographically sealed regardless of medium.
      </p>
    </div>
  );
}
