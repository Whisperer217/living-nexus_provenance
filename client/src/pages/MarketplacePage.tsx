import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type ItemType = "all" | "album" | "skin" | "physical" | "creator_good";

const TYPE_LABELS: Record<ItemType, string> = {
  all: "All Items",
  album: "Albums",
  skin: "Keeper Skins",
  physical: "Physical",
  creator_good: "Creator Goods",
};

const TYPE_ICONS: Record<ItemType, string> = {
  all: "◈",
  album: "♪",
  skin: "◉",
  physical: "⬡",
  creator_good: "✦",
};

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Item Card ────────────────────────────────────────────────────────────────
function MarketplaceItemCard({
  item,
  onBuy,
  isPurchasing,
}: {
  item: any;
  onBuy: (item: any) => void;
  isPurchasing: boolean;
}) {
  const isSoldOut = item.stock !== null && item.stock !== undefined && item.stock <= 0;
  const isLimited = item.stock !== null && item.stock !== undefined && item.stock > 0;

  return (
    <div
      style={{
        background: "var(--ln-panel)",
        border: "1px solid var(--ln-panel-border)",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(196,154,40,0.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Featured badge */}
      {item.featured && (
        <div style={{
          position: "absolute", top: 10, left: 10, zIndex: 2,
          background: "var(--ln-gold)", color: "#000",
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
          padding: "2px 8px", borderRadius: "4px",
          fontFamily: "var(--font-display)",
        }}>
          FEATURED
        </div>
      )}

      {/* Artwork */}
      <div style={{
        width: "100%", aspectRatio: "1/1", overflow: "hidden",
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {item.artworkUrl ? (
          <img
            src={item.artworkUrl}
            alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: "48px", opacity: 0.3 }}>
            {TYPE_ICONS[item.type as ItemType] ?? "◈"}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Type tag */}
        <div style={{
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em",
          color: "var(--ln-gold)", fontFamily: "var(--font-display)",
          textTransform: "uppercase",
        }}>
          {TYPE_LABELS[item.type as ItemType] ?? item.type}
        </div>

        {/* Title */}
        <div style={{
          fontSize: "15px", fontWeight: 600, color: "var(--ln-parchment)",
          lineHeight: 1.3, fontFamily: "var(--font-display)",
        }}>
          {item.title}
        </div>

        {/* Creator */}
        {item.creatorName && (
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px" }}>
            {item.creatorAvatarUrl && (
              <img
                src={item.creatorAvatarUrl}
                alt={item.creatorName}
                style={{ width: 18, height: 18, borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <span>{item.creatorHandle ? `@${item.creatorHandle}` : item.creatorName}</span>
          </div>
        )}

        {/* WID badge */}
        {item.wid && (
          <div style={{
            fontSize: "10px", color: "var(--ln-gold)", fontFamily: "monospace",
            background: "rgba(196,154,40,0.08)", border: "1px solid rgba(196,154,40,0.2)",
            borderRadius: "4px", padding: "2px 6px", display: "inline-block", width: "fit-content",
          }}>
            WID#{item.wid.slice(-8)}
          </div>
        )}

        {/* Description */}
        {item.description && (
          <div style={{
            fontSize: "12px", color: "rgba(255,255,255,0.45)",
            lineHeight: 1.5, overflow: "hidden",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
          }}>
            {item.description}
          </div>
        )}

        {/* Stock indicator */}
        {isLimited && (
          <div style={{ fontSize: "11px", color: "#f59e0b" }}>
            Only {item.stock} left
          </div>
        )}
        {isSoldOut && (
          <div style={{ fontSize: "11px", color: "#ef4444" }}>Sold Out</div>
        )}

        {/* Royalty note */}
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "auto" }}>
          {item.royaltyPct}% goes to creator
        </div>
      </div>

      {/* Buy button */}
      <div style={{ padding: "0 16px 16px" }}>
        <button
          onClick={() => onBuy(item)}
          disabled={isSoldOut || isPurchasing}
          style={{
            width: "100%",
            padding: "10px",
            background: isSoldOut ? "rgba(255,255,255,0.05)" : "var(--ln-gold)",
            color: isSoldOut ? "rgba(255,255,255,0.3)" : "#000",
            border: "none",
            borderRadius: "8px",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "0.08em",
            cursor: isSoldOut ? "not-allowed" : "pointer",
            transition: "opacity 0.15s",
            opacity: isPurchasing ? 0.7 : 1,
          }}
        >
          {isSoldOut ? "SOLD OUT" : isPurchasing ? "PROCESSING..." : `BUY · ${formatPrice(item.priceCents)}`}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [activeType, setActiveType] = useState<ItemType>("all");
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Check for purchase success/cancel in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      toast.success("Purchase complete! Your provenance receipt will arrive shortly.");
      window.history.replaceState({}, "", "/marketplace");
    } else if (params.get("purchase") === "cancelled") {
      toast.info("Purchase cancelled.");
      window.history.replaceState({}, "", "/marketplace");
    }
  }, []);

  const { data: items = [], isLoading } = trpc.marketplace.listItems.useQuery({
    type: activeType === "all" ? undefined : activeType,
    limit: 50,
  });

  const utils = trpc.useUtils();
  const seedDefaults = trpc.marketplace.seedDefaults.useMutation({
    onSuccess: (data) => {
      if (data.seeded > 0) {
        toast.success(`${data.seeded} marketplace items seeded!`);
        utils.marketplace.listItems.invalidate();
      } else {
        toast.info(data.message);
      }
    },
    onError: (err) => toast.error(err.message ?? 'Seed failed.'),
  });
  const createCheckout = trpc.marketplace.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
      }
      setPurchasingId(null);
    },
    onError: (err) => {
      toast.error(err.message ?? "Purchase failed. Please try again.");
      setPurchasingId(null);
    },
  });

  const handleBuy = (item: any) => {
    if (!user) {
      window.location.href = getLoginUrl("/marketplace");
      return;
    }
    if (item.priceCents === 0) {
      toast.success("This item is free! It has been added to your collection.");
      return;
    }
    setPurchasingId(item.id);
    createCheckout.mutate({ itemId: item.id, origin: window.location.origin });
  };

  const featuredItems = items.filter((i: any) => i.featured);
  const regularItems = items.filter((i: any) => !i.featured);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ln-obsidian)",
      color: "var(--ln-parchment)",
      fontFamily: "var(--font-body)",
    }}>
      {/* ── Hero ── */}
      <div style={{
        background: "linear-gradient(180deg, rgba(196,154,40,0.08) 0%, transparent 100%)",
        borderBottom: "1px solid var(--ln-panel-border)",
        padding: "48px 24px 32px",
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em",
          color: "var(--ln-gold)", fontFamily: "var(--font-display)",
          marginBottom: "12px", textTransform: "uppercase",
        }}>
          Living Nexus
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 6vw, 48px)",
          fontWeight: 700,
          color: "var(--ln-parchment)",
          letterSpacing: "0.05em",
          margin: "0 0 12px",
          textTransform: "uppercase",
        }}>
          The Marketplace
        </h1>
        <p style={{
          fontSize: "14px", color: "rgba(255,255,255,0.5)",
          maxWidth: "480px", margin: "0 auto 0",
          lineHeight: 1.6,
        }}>
          Every item is anchored to a creator's provenance record.
          When you buy, you own a piece of the living archive.
        </p>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{
        display: "flex", gap: "8px", padding: "20px 24px",
        overflowX: "auto", borderBottom: "1px solid var(--ln-panel-border)",
        scrollbarWidth: "none",
      }}>
        {(Object.keys(TYPE_LABELS) as ItemType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            style={{
              padding: "8px 16px",
              background: activeType === type ? "var(--ln-gold)" : "rgba(255,255,255,0.05)",
              color: activeType === type ? "#000" : "rgba(255,255,255,0.6)",
              border: activeType === type ? "none" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: "20px",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: "12px",
              letterSpacing: "0.08em",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {TYPE_ICONS[type]} {TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px 120px" }}>
        {/* ── Loading ── */}
        {isLoading && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "20px",
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                background: "var(--ln-panel)",
                border: "1px solid var(--ln-panel-border)",
                borderRadius: "12px",
                aspectRatio: "0.75",
                animation: "pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!isLoading && items.length === 0 && (
          <div style={{
            textAlign: "center", padding: "80px 24px",
            color: "rgba(255,255,255,0.35)",
          }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>◈</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", marginBottom: "8px" }}>
              No items yet
            </div>
            <div style={{ fontSize: "13px", marginBottom: user ? "24px" : "0" }}>
              The first drops are coming. Check back soon.
            </div>
            {user && (
              <button
                onClick={() => seedDefaults.mutate()}
                disabled={seedDefaults.isPending}
                style={{
                  background: "rgba(196,154,40,0.12)",
                  border: "1px solid rgba(196,154,40,0.4)",
                  color: "var(--ln-gold)",
                  fontFamily: "var(--font-display)",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  padding: "8px 20px",
                  borderRadius: "4px",
                  cursor: seedDefaults.isPending ? "wait" : "pointer",
                  opacity: seedDefaults.isPending ? 0.6 : 1,
                }}
              >
                {seedDefaults.isPending ? "Seeding…" : "⊕ Seed Default Listings"}
              </button>
            )}
          </div>
        )}

        {/* ── Featured Section ── */}
        {!isLoading && featuredItems.length > 0 && (
          <div style={{ marginBottom: "40px" }}>
            <div style={{
              fontFamily: "var(--font-display)", fontSize: "12px",
              fontWeight: 700, letterSpacing: "0.15em",
              color: "var(--ln-gold)", textTransform: "uppercase",
              marginBottom: "16px",
            }}>
              ✦ Featured Drops
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "20px",
            }}>
              {featuredItems.map((item: any) => (
                <MarketplaceItemCard
                  key={item.id}
                  item={item}
                  onBuy={handleBuy}
                  isPurchasing={purchasingId === item.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── All Items ── */}
        {!isLoading && regularItems.length > 0 && (
          <div>
            {featuredItems.length > 0 && (
              <div style={{
                fontFamily: "var(--font-display)", fontSize: "12px",
                fontWeight: 700, letterSpacing: "0.15em",
                color: "rgba(255,255,255,0.4)", textTransform: "uppercase",
                marginBottom: "16px",
              }}>
                All Items
              </div>
            )}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "20px",
            }}>
              {regularItems.map((item: any) => (
                <MarketplaceItemCard
                  key={item.id}
                  item={item}
                  onBuy={handleBuy}
                  isPurchasing={purchasingId === item.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Coming Soon placeholder when empty ── */}
        {!isLoading && items.length === 0 && (
          <div style={{
            marginTop: "40px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "20px",
          }}>
            {[
              { icon: "♪", label: "Gated Albums", desc: "Download-gated releases from registered creators" },
              { icon: "◉", label: "Keeper Skins", desc: "Limited edition AI companion portraits" },
              { icon: "⬡", label: "Physical Artifacts", desc: "Thumb drives, prints, and provenance objects" },
              { icon: "✦", label: "Creator Goods", desc: "Mascot designs, artwork, and creator-made goods" },
            ].map((cat) => (
              <div key={cat.label} style={{
                background: "var(--ln-panel)",
                border: "1px dashed var(--ln-panel-border)",
                borderRadius: "12px",
                padding: "32px 20px",
                textAlign: "center",
                opacity: 0.5,
              }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>{cat.icon}</div>
                <div style={{
                  fontFamily: "var(--font-display)", fontSize: "14px",
                  fontWeight: 600, color: "var(--ln-parchment)", marginBottom: "8px",
                }}>
                  {cat.label}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
                  {cat.desc}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
