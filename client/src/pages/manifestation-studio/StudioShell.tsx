/* ═══════════════════════════════════════════════════════════════════
   STUDIO SHELL — Split-layout container for all manifestation environments
   Left: Guided process / instructions / metadata
   Right: Live preview / provenance state / integrity indicators
═══════════════════════════════════════════════════════════════════ */

import { type ReactNode } from "react";
import { ChevronLeft, Shield, Check } from "lucide-react";
import { type ManifestationAtmosphere, type StudioStep, STUDIO_STEPS } from "./types";

interface StudioShellProps {
  atmosphere: ManifestationAtmosphere;
  currentStep: StudioStep;
  onBack: () => void;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  /** Progress percentage 0-100 */
  progress: number;
}

export function StudioShell({
  atmosphere,
  currentStep,
  onBack,
  leftPanel,
  rightPanel,
  progress,
}: StudioShellProps) {
  const currentStepIdx = STUDIO_STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#111009" }}>
      {/* ── Top Bar ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: atmosphere.colorBorder, background: "rgba(17,16,9,0.95)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all hover:opacity-80"
          style={{ color: atmosphere.colorPrimary }}
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Back</span>
        </button>

        {/* Type indicator */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{atmosphere.icon}</span>
          <div>
            <p
              className="text-xs font-semibold"
              style={{ fontFamily: "'Cinzel', serif", color: atmosphere.colorPrimary }}
            >
              {atmosphere.label}
            </p>
            <p
              className="text-[9px] italic"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.5)" }}
            >
              {atmosphere.tagline}
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 ml-auto">
          {STUDIO_STEPS.map((s, i) => {
            const isActive = s.id === currentStep;
            const isDone = i < currentStepIdx;
            return (
              <div key={s.id} className="flex items-center gap-1">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                  style={{
                    background: isDone
                      ? "var(--ln-seal-bright)"
                      : isActive
                      ? atmosphere.colorPrimary
                      : "rgba(196,154,40,0.08)",
                    color: isDone || isActive ? "#111009" : "rgba(196,154,40,0.4)",
                    border: `1px solid ${isDone ? "var(--ln-seal-bright)" : isActive ? atmosphere.colorPrimary : "rgba(196,154,40,0.15)"}`,
                    boxShadow: isActive ? `0 0 12px ${atmosphere.colorGlow}` : "none",
                  }}
                >
                  {isDone ? <Check size={10} /> : s.number}
                </div>
                <span
                  className="text-[10px] hidden md:inline"
                  style={{ color: isActive ? atmosphere.colorPrimary : isDone ? "var(--ln-seal-bright)" : "rgba(245,237,216,0.3)" }}
                >
                  {s.label}
                </span>
                {i < STUDIO_STEPS.length - 1 && (
                  <div
                    className="w-4 h-px mx-1 hidden md:block"
                    style={{ background: isDone ? "var(--ln-seal-bright)" : "rgba(196,154,40,0.12)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="h-[2px] w-full flex-shrink-0" style={{ background: "rgba(196,154,40,0.08)" }}>
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${atmosphere.colorPrimary}, var(--ln-gold))`,
            boxShadow: `0 0 8px ${atmosphere.colorGlow}`,
          }}
        />
      </div>

      {/* ── Split Layout ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel — Guided Process */}
        <div
          className="flex-1 lg:w-[58%] lg:flex-none overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: `${atmosphere.colorPrimary}40 transparent`,
          }}
        >
          <div className="p-6 md:p-8 lg:p-10 max-w-2xl mx-auto">
            {leftPanel}
          </div>
        </div>

        {/* Divider */}
        <div
          className="hidden lg:block w-px flex-shrink-0"
          style={{ background: `linear-gradient(to bottom, transparent, ${atmosphere.colorBorder}, transparent)` }}
        />

        {/* Right Panel — Live Preview */}
        <div
          className="lg:w-[42%] lg:flex-none overflow-y-auto border-t lg:border-t-0"
          style={{
            borderColor: atmosphere.colorBorder,
            background: atmosphere.gradient,
            scrollbarWidth: "thin",
            scrollbarColor: `${atmosphere.colorPrimary}40 transparent`,
          }}
        >
          <div className="p-6 md:p-8 lg:p-10 sticky top-0">
            {rightPanel}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Provenance Status Indicator ── */
export function ProvenanceIndicator({
  status,
  wid,
  atmosphere,
}: {
  status: "pending" | "generating" | "sealed";
  wid?: string;
  atmosphere: ManifestationAtmosphere;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{
        background: status === "sealed" ? "rgba(74,222,128,0.06)" : "rgba(196,154,40,0.04)",
        border: `1px solid ${status === "sealed" ? "rgba(74,222,128,0.25)" : atmosphere.colorBorder}`,
      }}
    >
      <Shield
        size={14}
        style={{
          color: status === "sealed" ? "var(--ln-seal-bright)" : status === "generating" ? atmosphere.colorPrimary : "rgba(196,154,40,0.4)",
        }}
        className={status === "generating" ? "animate-pulse" : ""}
      />
      <div>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: status === "sealed" ? "var(--ln-seal-bright)" : "rgba(245,237,216,0.5)" }}>
          {status === "sealed" ? "Provenance Sealed" : status === "generating" ? `${atmosphere.language.progressVerb}...` : "Awaiting Provenance"}
        </p>
        {wid && (
          <p className="text-[11px] font-mono" style={{ color: "var(--ln-seal-bright)" }}>
            {wid}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Creator Reassurance Message ── */
export function ReassuranceMessage({ message, atmosphere }: { message: string; atmosphere: ManifestationAtmosphere }) {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2 rounded-lg mt-3"
      style={{ background: `${atmosphere.colorPrimary}08`, border: `1px solid ${atmosphere.colorBorder}` }}
    >
      <span className="text-sm flex-shrink-0 mt-0.5">✦</span>
      <p
        className="text-[11px] italic leading-relaxed"
        style={{ fontFamily: "'Cormorant Garamond', serif", color: "rgba(245,237,216,0.7)" }}
      >
        {message}
      </p>
    </div>
  );
}
