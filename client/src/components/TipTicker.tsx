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
          (t: any) =>
            `🔐 ${t.fanName} tipped ${t.creatorName} ${formatAmount(t.amountCents)} for "${t.songTitle}"`
        )
      : ["Support creators directly on Living Nexus 🎵"];

  // Duplicate items so the marquee loops seamlessly
  const marqueeItems = [...items, ...items];

  return (
    <div
      className="w-full overflow-hidden select-none"
      style={{
        background: "rgba(44,52,56,0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(203,177,131,0.12)",
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
              color: "#CBB183",
              fontFamily: "'Cinzel', serif",
              letterSpacing: "0.02em",
              textShadow: "0 0 12px rgba(203,177,131,0.35)",
            }}
          >
            {item}
            <span
              className="mx-6 opacity-40"
              style={{ color: "#CBB183" }}
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
