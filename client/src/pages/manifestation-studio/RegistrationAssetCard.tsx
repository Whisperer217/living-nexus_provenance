import type { ReactNode } from "react";

interface RegistrationAssetCardProps {
  id: string;
  sectionNumber: string;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  action?: ReactNode;
  interactive?: boolean;
  children: ReactNode;
}

/**
 * Shared presentation grammar for assets prepared during registration.
 * Asset state is intentionally shown without claiming that every attached item
 * is part of the WID payload.
 */
export function RegistrationAssetCard({
  id,
  sectionNumber,
  eyebrow,
  title,
  description,
  status,
  action,
  interactive = false,
  children,
}: RegistrationAssetCardProps) {
  const titleId = `${id}-title`;

  return (
    <section
      aria-labelledby={titleId}
      className={`registration-asset-card rounded-sm border px-4 py-5 sm:px-6 sm:py-6${interactive ? " registration-asset-card--interactive" : ""}`}
      style={{
        borderColor: "color-mix(in srgb, var(--ln-gold) 30%, transparent)",
        background: "color-mix(in srgb, var(--ln-gold) 4%, var(--ln-coal))",
      }}
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
          >
            {sectionNumber} · {eyebrow}
          </p>
          <h3
            id={titleId}
            className="mt-2 text-xl font-semibold leading-tight"
            style={{ color: "var(--ln-parchment)", fontFamily: "'Cormorant Garamond', serif" }}
          >
            {title}
          </h3>
          <p className="mt-2 max-w-2xl text-base leading-relaxed" style={{ color: "var(--ln-bone)" }}>
            {description}
          </p>
        </div>
        {action && <div className="w-full sm:w-auto">{action}</div>}
      </div>

      <div className="mt-5 border-t pt-5" style={{ borderColor: "rgba(196,154,40,0.16)" }}>
        {children}
      </div>

      <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--ln-bone)" }} role="status">
        {status}
      </p>
    </section>
  );
}
