import { ArrowRight, Database, EyeOff, ShieldCheck, TestTube2 } from "lucide-react";

const included = ["Creator identity and registered public artwork", "Public testimony and distribution metadata", "Public web presence", "Count of Published, public Works"];
const excluded = ["Email, OpenID, login method", "Roles, slot counts, license state", "Stripe, billing, subscription records", "Hidden Domain blocks", "Domain layout snapshots and change notes"];

export default function P0ProfilePrivacyReviewPage() {
  return (
    <main className="min-h-screen px-4 py-10 sm:px-8" style={{ background: "var(--ln-void)", color: "var(--ln-bone)" }}>
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl p-6 sm:p-8" style={{ background: "var(--ln-coal)", border: "1px solid rgba(212,175,55,0.28)" }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ fontFamily: "var(--font-display)", color: "var(--ln-gold-dim)" }}>Local review only · P0 privacy repair</p>
          <h1 className="mt-3 text-3xl sm:text-4xl" style={{ fontFamily: "var(--font-display)", color: "var(--ln-parchment)" }}>Public Creator Projection</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed">This visualizer is not an API client. It has no live user query and no production data. It documents the boundary being reviewed on this branch.</p>
        </header>

        <section className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          <article className="rounded-2xl p-6" style={{ background: "var(--ln-iron)", border: "1px solid var(--ln-ash)" }}>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--ln-smoke)" }}>Legacy public route</p>
            <h2 className="mt-2 text-2xl" style={{ fontFamily: "var(--font-editorial)", color: "var(--ln-parchment)" }}>Raw account row</h2>
            <div className="mt-4 rounded-xl p-4 font-mono text-xs" style={{ background: "var(--ln-void)", border: "1px solid var(--ln-ash)" }}>{`profile.getById\n{ id, name, email, openId, role,\n  songSlotsUsed, stripeAccountId, ... }`}</div>
          </article>
          <ArrowRight className="mx-auto self-center" aria-hidden="true" style={{ color: "var(--ln-gold)" }} />
          <article className="rounded-2xl p-6" style={{ background: "rgba(196,154,40,0.08)", border: "1px solid rgba(212,175,55,0.28)" }}>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ fontFamily: "var(--font-display)", color: "var(--ln-gold)" }}>P0 public route</p>
            <h2 className="mt-2 text-2xl" style={{ fontFamily: "var(--font-editorial)", color: "var(--ln-parchment)" }}>Explicit public DTO</h2>
            <div className="mt-4 rounded-xl p-4 font-mono text-xs" style={{ background: "var(--ln-void)", border: "1px solid rgba(212,175,55,0.18)" }}>{`profile.getPublicById\n{ id, artistHandle, bio, artwork,\n  testimony, publishedWorkCount }`}</div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl p-6" style={{ background: "var(--ln-coal)", border: "1px solid rgba(212,175,55,0.15)" }}><div className="flex gap-3"><ShieldCheck style={{ color: "var(--ln-gold)" }} /><div><h2 className="text-xl" style={{ fontFamily: "var(--font-editorial)" }}>Included by intent</h2><ul className="mt-3 space-y-2 text-sm">{included.map((item) => <li key={item}>• {item}</li>)}</ul></div></div></article>
          <article className="rounded-2xl p-6" style={{ background: "var(--ln-coal)", border: "1px solid rgba(212,175,55,0.15)" }}><div className="flex gap-3"><EyeOff style={{ color: "var(--ln-gold)" }} /><div><h2 className="text-xl" style={{ fontFamily: "var(--font-editorial)" }}>Excluded by boundary</h2><ul className="mt-3 space-y-2 text-sm">{excluded.map((item) => <li key={item}>• {item}</li>)}</ul></div></div></article>
          <article className="rounded-2xl p-6" style={{ background: "var(--ln-coal)", border: "1px solid rgba(212,175,55,0.15)" }}><Database className="mb-3" style={{ color: "var(--ln-gold)" }} /><h2 className="text-xl" style={{ fontFamily: "var(--font-editorial)" }}>Caller migration</h2><p className="mt-2 text-sm">CreatorIdentityPage now calls the public DTO, consumes its public Work count, and cannot render account role, licensing, or slot state.</p></article>
          <article className="rounded-2xl p-6" style={{ background: "var(--ln-coal)", border: "1px solid rgba(212,175,55,0.15)" }}><TestTube2 className="mb-3" style={{ color: "var(--ln-gold)" }} /><h2 className="text-xl" style={{ fontFamily: "var(--font-editorial)" }}>Proof gates</h2><p className="mt-2 text-sm">Contracts verify DTO exclusions, anonymous public routes, visible-only Domain layout, owner-only Domain history, and the caller migration.</p></article>
        </section>
      </div>
    </main>
  );
}
