/**
 * MarketplaceDrawer — right-side persistent mini storefront
 * Slides in from the right edge. Shows featured marketplace items
 * with a quick-buy flow. Full catalog links to /marketplace.
 *
 * Z-index: 55 (above PlayerBar at 50, below Keeper at 60)
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

const TYPE_ICONS: Record<string, string> = {
  album: "♪",
  skin: "◉",
  physical: "⬡",
  creator_good: "✦",
};

// ─── Mini Item Card ───────────────────────────────────────────────────────────
function MiniItemCard({
  item,
  onBuy,
  isPurchasing,
}: {
  item: any;
  onBuy: (item: any) => void;
  isPurchasing: boolean;
}) {
  const isSoldOut = item.stock !== null && item.stock !== undefined && item.stock <= 0;

  return (
    <div style={{
      display: "flex",
      gap: "10px",
      padding: "10px",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid var(--ln-panel-border)",
      borderRadius: "8px",
      alignItems: "center",
    }}>
      {/* Thumbnail */}
      <div style={{
        width: "48px", height: "48px", flexShrink: 0,
        borderRadius: "6px", overflow: "hidden",
        background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {item.artworkUrl ? (
          <img src={item.artworkUrl} alt={item.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: "20px", opacity: 0.4 }}>
            {TYPE_ICONS[item.type] ?? "◈"}
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "12px", fontWeight: 600,
          color: "var(--ln-parchment)",
          fontFamily: "var(--font-display)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {item.title}
        </div>
        {item.creatorHandle && (
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
            @{item.creatorHandle}
          </div>
        )}
        <div style={{
          fontSize: "11px", fontWeight: 700,
          color: "var(--ln-gold)", marginTop: "4px",
        }}>
          {isSoldOut ? "Sold Out" : formatPrice(item.priceCents)}
        </div>
      </div>

      {/* Buy button */}
      <button
        onClick={() => onBuy(item)}
        disabled={isSoldOut || isPurchasing}
        style={{
          padding: "6px 10px",
          background: isSoldOut ? "rgba(255,255,255,0.05)" : "var(--ln-gold)",
          color: isSoldOut ? "rgba(255,255,255,0.3)" : "#000",
          border: "none",
          borderRadius: "6px",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "10px",
          letterSpacing: "0.06em",
          cursor: isSoldOut ? "not-allowed" : "pointer",
          flexShrink: 0,
          opacity: isPurchasing ? 0.6 : 1,
        }}
      >
        {isPurchasing ? "..." : isSoldOut ? "—" : "BUY"}
      </button>
    </div>
  );
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────
export default function MarketplaceDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  const [location] = useLocation();
  useEffect(() => { setIsOpen(false); }, [location]);

  // Listen for external open trigger (e.g. from PlaylistDrawer SHOP tab)
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("ln:open-shop", handler);
    return () => window.removeEventListener("ln:open-shop", handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  // Lazy query — only fires when drawer is open
  const { data: items = [], isLoading } = trpc.marketplace.listItems.useQuery(
    { featuredOnly: false, limit: 10 },
    { enabled: isOpen }
  );

  const createCheckout = trpc.marketplace.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
      setPurchasingId(null);
    },
    onError: (err) => {
      toast.error(err.message ?? "Purchase failed.");
      setPurchasingId(null);
    },
  });

  const handleBuy = (item: any) => {
    if (!user) {
      window.location.href = getLoginUrl("/marketplace");
      return;
    }
    if (item.priceCents === 0) {
      toast.success("This item is free! Added to your collection.");
      return;
    }
    setPurchasingId(item.id);
    createCheckout.mutate({ itemId: item.id, origin: window.location.origin });
  };

  const content = (
    <>
      {/* Drawer panel — handle is now the SHOP tab in PlaylistDrawer */}
      <div
        ref={drawerRef}
        style={{
          position: "fixed",
          top: 0,
          right: isOpen ? 0 : "-280px",
          width: "280px",
          height: "100vh",
          background: "var(--ln-panel)",
          borderLeft: "1px solid var(--ln-panel-border)",
          zIndex: 55,
          display: "flex",
          flexDirection: "column",
          transition: "right 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--ln-panel-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--ln-parchment)",
            }}>
              ✦ Marketplace
            </div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "2px" }}>
              Creator-anchored goods
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.4)", fontSize: "18px", padding: "4px",
            }}
          >
            ×
          </button>
        </div>

        {/* Items list */}
        <div style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {isLoading && (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{
                  height: "68px", borderRadius: "8px",
                  background: "rgba(255,255,255,0.04)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
              ))}
            </>
          )}

          {!isLoading && items.length === 0 && (
            <div style={{
              textAlign: "center", padding: "40px 16px",
              color: "rgba(255,255,255,0.3)",
            }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>◈</div>
              <div style={{ fontSize: "12px", fontFamily: "var(--font-display)" }}>
                First drops coming soon
              </div>
            </div>
          )}

          {!isLoading && items.map((item: any) => (
            <MiniItemCard
              key={item.id}
              item={item}
              onBuy={handleBuy}
              isPurchasing={purchasingId === item.id}
            />
          ))}
        </div>

        {/* Footer — link to full marketplace */}
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--ln-panel-border)",
          flexShrink: 0,
        }}>
          <button
            onClick={() => { navigate("/marketplace"); setIsOpen(false); }}
            style={{
              width: "100%",
              padding: "10px",
              background: "rgba(196,154,40,0.1)",
              border: "1px solid rgba(196,154,40,0.3)",
              borderRadius: "8px",
              color: "var(--ln-gold)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "12px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >
            View Full Marketplace →
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
