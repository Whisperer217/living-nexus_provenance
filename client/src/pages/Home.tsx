import { useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/create");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-obsidian)" }}>
        <div className="ln-hash animate-pulse">Initializing ledger…</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--ln-obsidian)" }}
    >
      {/* Glyph mark */}
      <div className="mb-8 text-center">
        <div
          className="inline-block w-16 h-16 rounded-full border-2 mb-4"
          style={{ borderColor: "var(--ln-gold)", boxShadow: "0 0 32px var(--ln-gold-glow)" }}
        />
        <div className="ln-wid-badge mb-2">LIVING NEXUS</div>
        <h1
          className="text-4xl md:text-5xl font-semibold tracking-tight mb-3"
          style={{ color: "var(--ln-parchment)", fontFamily: "'EB Garamond', serif" }}
        >
          Provenance-First Creator Surface
        </h1>
        <p
          className="text-base max-w-md mx-auto leading-relaxed"
          style={{ color: "var(--ln-smoke)" }}
        >
          Every lyric you write is cryptographically witnessed. Nothing leaves this surface without provenance attached.
        </p>
      </div>

      {/* Feature pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full mb-10">
        {[
          { label: "Ed25519 Keys", desc: "Your identity, your signature" },
          { label: "Append-Only Ledger", desc: "Immutable event chain" },
          { label: "WID Anchoring", desc: "Verifiable work identity" },
        ].map(f => (
          <div key={f.label} className="ln-panel p-4 text-center">
            <div className="ln-panel-header mb-2">{f.label}</div>
            <p className="text-xs" style={{ color: "var(--ln-smoke)" }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a href={getLoginUrl()}>
        <Button
          className="ln-btn-gold px-8 py-3 text-base rounded"
          style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
        >
          Enter the Surface
        </Button>
      </a>

      <p className="mt-6 ln-hash text-xs" style={{ color: "var(--ln-smoke)" }}>
        Manus OAuth · Ed25519 · SHA-256 · Append-Only
      </p>
    </div>
  );
}
