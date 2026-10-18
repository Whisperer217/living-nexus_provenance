import { ExternalLink, HeartHandshake, Shirt } from "lucide-react";
import { RANDALL_MEMORIAL_STOREFRONT } from "@/lib/externalStorefront";

/**
 * A public remembrance entry that intentionally opens the external storefront.
 * It is not a Living Nexus checkout, catalog, order, or fulfillment surface.
 */
export function ExternalMemorialProductCard() {
  return (
    <section
      data-testid="external-memorial-storefront"
      className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
      aria-labelledby="external-memorial-storefront-title"
      style={{
        background: "linear-gradient(135deg, color-mix(in srgb, var(--ln-gold) 9%, var(--ln-obsidian)), var(--ln-obsidian))",
        border: "1px solid color-mix(in srgb, var(--ln-gold) 34%, transparent)",
        boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--ln-parchment) 9%, transparent)",
      }}
    >
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full pointer-events-none" aria-hidden="true" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--ln-gold) 18%, transparent), transparent 68%)" }} />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: "color-mix(in srgb, var(--ln-gold) 14%, var(--ln-void))",
              border: "1px solid color-mix(in srgb, var(--ln-gold) 42%, transparent)",
              color: "var(--ln-gold-hot, var(--ln-gold))",
            }}
            aria-hidden="true"
          >
            <Shirt size={22} strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-[10px] uppercase tracking-[0.16em]" style={{ color: "var(--ln-gold)" }}>
              In remembrance · external storefront
            </p>
            <h2 id="external-memorial-storefront-title" className="font-heading mt-1 text-[1.25rem] leading-tight" style={{ color: "var(--ln-parchment)" }}>
              {RANDALL_MEMORIAL_STOREFRONT.productName}
            </h2>
            <p className="font-editorial mt-2 text-[1.08rem] leading-snug" style={{ color: "var(--ln-bone)" }}>
              {RANDALL_MEMORIAL_STOREFRONT.message}
            </p>
            <p className="font-body mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
              {RANDALL_MEMORIAL_STOREFRONT.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <a
            href={RANDALL_MEMORIAL_STOREFRONT.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-heading inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: "var(--ln-gold)",
              color: "var(--ln-void)",
              fontSize: "0.65rem",
              letterSpacing: "0.08em",
              textDecoration: "none",
            }}
          >
            VIEW MEMORIAL HOODIE
            <ExternalLink size={14} aria-hidden="true" />
          </a>
          <span className="font-body inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--ln-smoke)" }}>
            <HeartHandshake size={13} aria-hidden="true" />
            Opens {RANDALL_MEMORIAL_STOREFRONT.providerLabel} in a new tab
          </span>
          <span className="font-body max-w-[24rem] text-center text-[11px] leading-relaxed sm:text-right" style={{ color: "var(--ln-smoke)" }}>
            Product choice, payment, fulfillment, and delivery happen in that external storefront.
          </span>
        </div>
      </div>
    </section>
  );
}
