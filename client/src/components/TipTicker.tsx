import { trpc } from "@/lib/trpc";

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export default function TipTicker() {
  const { data: tips } = trpc.tips.recentTips.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 25_000,
  });

  const items: string[] =
    tips && tips.length > 0
      ? tips.map(
          (t) =>
            `🔐 ${t.fanName} tipped ${t.creatorName} ${formatAmount(t.amountCents)} for "${t.songTitle}"`
        )
      : ["Be the first to tip a creator on Living Nexus 🎵"];

  // Duplicate items so the marquee loops seamlessly
  const marqueeItems = [...items, ...items];

  return (
    <div
      className="w-full overflow-hidden select-none"
      style={{
        background: "oklch(0.06 0.015 280 / 0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid oklch(0.84 0.155 85 / 0.15)",
        height: "28px",
      }}
      aria-label="Live tip activity"
    >
      <div
        className="flex items-center h-full"
        style={{ animation: "tip-ticker-scroll 40s linear infinite" }}
      >
        {marqueeItems.map((item, i) => (
          <span
            key={i}
            className="whitespace-nowrap text-xs md:text-sm font-medium px-8"
            style={{
              color: "oklch(0.84 0.155 85)",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.02em",
              textShadow: "0 0 12px oklch(0.84 0.155 85 / 0.4)",
            }}
          >
            {item}
            <span
              className="mx-6 opacity-40"
              style={{ color: "oklch(0.84 0.155 85)" }}
            >
              ✦
            </span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes tip-ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .tip-ticker-inner { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
