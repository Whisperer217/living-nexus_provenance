import type { ReactNode } from "react";

interface RegistrationAssetCardProps {
  id: string;
  sectionNumber: string;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  action?: ReactNode;
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
  children,
}: RegistrationAssetCardProps) {
  const titleId = `${id}-title`;

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-sm border px-4 py-4 sm:px-5"
      style={{
        borderColor: "rgba(196,154,40,0.3)",
        background: "rgba(196,154,40,0.035)",
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <p
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: "var(--ln-gold)", fontFamily: "'Cinzel', serif" }}
          >
            {sectionNumber} · {eyebrow}
          </p>
          <h3
            id={titleId}
            className="mt-2 text-lg font-semibold leading-tight"
            style={{ color: "var(--ln-parchment)", fontFamily: "'Cormorant Garamond', serif" }}
          >
            {title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "rgba(245,237,216,0.68)" }}>
            {description}
          </p>
        </div>
        {action && <div className="w-full sm:w-auto">{action}</div>}
      </div>

      <div className="mt-4 border-t pt-4" style={{ borderColor: "rgba(196,154,40,0.16)" }}>
        {children}
      </div>

      <p className="mt-3 text-xs leading-relaxed" style={{ color: "rgba(245,237,216,0.54)" }} role="status">
        {status}
      </p>
    </section>
  );
}
