import { Landmark, ShieldCheck } from "lucide-react";

type Memorial = {
  id: number;
  body: string;
  bodyHash: string;
  createdAt: Date | string;
  stewardName: string | null;
  stewardHandle: string | null;
};

export function LegacyMemorialSection({
  creatorName,
  memorials,
}: {
  creatorName: string;
  memorials: Memorial[];
}) {
  if (memorials.length === 0) return null;

  return (
    <section
      className="ln-legacy-memorial max-w-5xl mx-auto px-4 sm:px-6 py-12"
      aria-labelledby="legacy-memorial-heading"
    >
      <div
        className="rounded-2xl p-5 sm:p-8"
        style={{
          border: "1px solid color-mix(in srgb, var(--ln-gold) 44%, transparent)",
          background: "linear-gradient(135deg, color-mix(in srgb, var(--ln-gold) 8%, var(--ln-void)) 0%, color-mix(in srgb, var(--ln-coal) 92%, transparent) 100%)",
          boxShadow: "0 16px 42px rgba(0,0,0,0.24), inset 0 1px 0 color-mix(in srgb, var(--ln-parchment) 12%, transparent)",
        }}
      >
        <div className="flex items-start gap-3 mb-5">
          <div
            className="mt-0.5 shrink-0 rounded-full p-2"
            style={{ background: "color-mix(in srgb, var(--ln-gold) 13%, transparent)", color: "var(--ln-gold)" }}
            aria-hidden="true"
          >
            <Landmark size={17} />
          </div>
          <div className="min-w-0">
            <p
              className="text-[11px] uppercase tracking-[0.19em]"
              style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-gold-hot, var(--ln-gold))" }}
            >
              Legacy memorial
            </p>
            <h2 id="legacy-memorial-heading" className="mt-1 break-words text-2xl sm:text-3xl" style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}>
              In remembrance of {creatorName}
            </h2>
          </div>
        </div>

        <div className="space-y-7">
          {memorials.map((memorial) => (
            <article key={memorial.id}>
              <blockquote
                className="whitespace-pre-line break-words text-xl sm:text-2xl leading-relaxed"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "color-mix(in srgb, var(--ln-parchment) 92%, transparent)",
                  borderLeft: "2px solid color-mix(in srgb, var(--ln-gold) 70%, transparent)",
                  paddingLeft: "1rem",
                }}
              >
                {memorial.body}
              </blockquote>
              <div className="mt-4 flex items-start gap-2 text-sm" style={{ color: "color-mix(in srgb, var(--ln-parchment) 62%, transparent)" }}>
                <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: "var(--ln-gold)" }} aria-hidden="true" />
                <p className="break-words">
                  Append-only stewardship notice maintained by <span style={{ color: "var(--ln-parchment)" }}>{memorial.stewardHandle ? `@${memorial.stewardHandle}` : memorial.stewardName || "an authorized Legacy Steward"}</span>. It is distinct from {creatorName}&apos;s original Testimonies, Works, Witness IDs, and provenance records.
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
