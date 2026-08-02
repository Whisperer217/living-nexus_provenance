import { useState, useEffect, useRef } from "react";
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

const TIP_AMOUNTS = [100, 300, 500, 1000, 2500];

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Tip Modal ────────────────────────────────────────────────────────────────
function TipModal({
  item,
  onClose,
}: {
  item: any;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(500);
  const createAvatarTip = trpc.marketplace.createAvatarTip.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
      onClose();
    },
    onError: (err) => toast.error(err.message ?? "Gift failed."),
  });

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--ln-panel)",
          border: "1px solid var(--ln-panel-border)",
          borderRadius: "16px",
          padding: "28px",
          maxWidth: "380px",
          width: "100%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "0.15em", color: "var(--ln-gold)", marginBottom: "8px", textTransform: "uppercase" }}>
          Gift the Creator
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--ln-parchment)", marginBottom: "4px" }}>
          {item.title}
        </div>
        {item.creatorName && (
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginBottom: "20px" }}>
            by {item.creatorHandle ? `@${item.creatorHandle}` : item.creatorName}
          </div>
        )}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          {TIP_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => setSelected(amt)}
              style={{
                padding: "8px 14px",
                background: selected === amt ? "var(--ln-gold)" : "rgba(255,255,255,0.05)",
                color: selected === amt ? "#000" : "rgba(255,255,255,0.7)",
                border: selected === amt ? "none" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "20px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {formatPrice(amt)}
            </button>
          ))}
        </div>
        <button
          onClick={() => createAvatarTip.mutate({ itemId: item.id, amountCents: selected, origin: window.location.origin })}
          disabled={createAvatarTip.isPending}
          style={{
            width: "100%",
            padding: "12px",
            background: "var(--ln-gold)",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "14px",
            letterSpacing: "0.08em",
            cursor: createAvatarTip.isPending ? "wait" : "pointer",
            opacity: createAvatarTip.isPending ? 0.7 : 1,
          }}
        >
          {createAvatarTip.isPending ? "Opening…" : `GIFT ${formatPrice(selected)}`}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%", marginTop: "10px", padding: "10px",
            background: "transparent", color: "rgba(255,255,255,0.4)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
            fontFamily: "var(--font-display)", fontSize: "12px", cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Submit Avatar Modal (Founder Only) ───────────────────────────────────────
function SubmitAvatarModal({
  styleGuideItems,
  onClose,
  onSuccess,
}: {
  styleGuideItems: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    artworkUrl: "",
    priceCents: 0,
    wid: "",
    aiPrompt: "",
    artistCredit: "",
    artStyle: "digital concept art",
    featured: false,
  });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createAvatarItem = trpc.marketplace.createAvatarItem.useMutation({
    onSuccess: () => {
      toast.success("Avatar submitted to the marketplace!");
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.message ?? "Submission failed."),
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5 MB."); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        // Upload via profile.uploadAvatar endpoint to get a CDN URL
        const res = await fetch("/api/trpc/profile.uploadAvatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ json: { base64, mimeType: file.type } }),
        });
        const json = await res.json();
        const url = json?.result?.data?.json?.url;
        if (url) {
          setForm((f) => ({ ...f, artworkUrl: url }));
          toast.success("Artwork uploaded.");
        } else {
          toast.error("Upload failed — try again.");
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Upload failed.");
      setUploading(false);
    }
  };

  const ART_STYLES = ["digital concept art", "hand-drawn", "AI-generated", "pixel art", "3D render", "watercolor", "ink illustration"];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px", overflowY: "auto" }}
      onClick={onClose}
    >
      <div
        style={{ background: "var(--ln-panel)", border: "1px solid var(--ln-panel-border)", borderRadius: "16px", padding: "28px", maxWidth: "640px", width: "100%", marginTop: "20px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ fontFamily: "var(--font-display)", fontSize: "11px", letterSpacing: "0.15em", color: "var(--ln-gold)", marginBottom: "6px", textTransform: "uppercase" }}>
          Founder Submission
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 700, color: "var(--ln-parchment)", marginBottom: "4px" }}>
          Submit Avatar to Marketplace
        </div>
        <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "24px", lineHeight: 1.5 }}>
          Avatars must match the style and quality of existing marketplace skins. Your submission is gated — only founders may list avatars.
        </div>

        {/* Style Guide */}
        {styleGuideItems.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "10px" }}>
              Style Reference — Match These
            </div>
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
              {styleGuideItems.map((item: any) => (
                <div key={item.id} style={{ flexShrink: 0, width: "80px" }}>
                  <img
                    src={item.artworkUrl}
                    alt={item.title}
                    style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--ln-panel-border)" }}
                  />
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginTop: "4px", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.title.replace("Keeper Skin Pack — ", "")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Artwork Upload */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Artwork *
            </label>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {form.artworkUrl && (
                <img src={form.artworkUrl} alt="Preview" style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px", border: "1px solid var(--ln-panel-border)" }} />
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: "10px 16px",
                  background: "rgba(196,154,40,0.1)",
                  border: "1px dashed rgba(196,154,40,0.4)",
                  color: "var(--ln-gold)",
                  borderRadius: "8px",
                  fontFamily: "var(--font-display)",
                  fontSize: "12px",
                  letterSpacing: "0.08em",
                  cursor: uploading ? "wait" : "pointer",
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                {uploading ? "Uploading…" : form.artworkUrl ? "Replace Image" : "⊕ Upload Artwork"}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Keeper Skin Pack — The Sentinel"
              style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "var(--ln-parchment)", fontSize: "14px", fontFamily: "var(--font-body)", boxSizing: "border-box" }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the avatar, its lore, and capabilities it unlocks…"
              rows={3}
              style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "var(--ln-parchment)", fontSize: "13px", fontFamily: "var(--font-body)", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {/* Art Style + Artist Credit / AI Prompt */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                Art Style
              </label>
              <select
                value={form.artStyle}
                onChange={(e) => setForm((f) => ({ ...f, artStyle: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", background: "var(--ln-panel)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "var(--ln-parchment)", fontSize: "13px", fontFamily: "var(--font-body)" }}
              >
                {ART_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                Price (USD)
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.priceCents / 100}
                onChange={(e) => setForm((f) => ({ ...f, priceCents: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                placeholder="0.00 = Free"
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "var(--ln-parchment)", fontSize: "14px", fontFamily: "var(--font-body)", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* AI Prompt (shown when AI-generated) */}
          {form.artStyle === "AI-generated" ? (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                AI Generation Prompt <span style={{ color: "var(--ln-gold)" }}>(Provenance)</span>
              </label>
              <textarea
                value={form.aiPrompt}
                onChange={(e) => setForm((f) => ({ ...f, aiPrompt: e.target.value }))}
                placeholder="Paste the exact prompt used to generate this avatar. This becomes part of the WID provenance record."
                rows={3}
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(196,154,40,0.25)", borderRadius: "8px", color: "var(--ln-parchment)", fontSize: "12px", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                Artist Credit
              </label>
              <input
                value={form.artistCredit}
                onChange={(e) => setForm((f) => ({ ...f, artistCredit: e.target.value }))}
                placeholder="Artist name or handle"
                style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "var(--ln-parchment)", fontSize: "14px", fontFamily: "var(--font-body)", boxSizing: "border-box" }}
              />
            </div>
          )}

          {/* WID */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              WID Anchor <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              value={form.wid}
              onChange={(e) => setForm((f) => ({ ...f, wid: e.target.value }))}
              placeholder="WID-FDR-0001-… or leave blank"
              style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "var(--ln-parchment)", fontSize: "13px", fontFamily: "monospace", boxSizing: "border-box" }}
            />
          </div>

          {/* Featured toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              style={{ width: "16px", height: "16px", accentColor: "var(--ln-gold)" }}
            />
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>Feature this avatar (shows in Featured Drops)</span>
          </label>
        </div>

        {/* Submit */}
        <div style={{ display: "flex", gap: "10px", marginTop: "24px" }}>
          <button
            onClick={() => {
              if (!form.title.trim()) { toast.error("Title is required."); return; }
              if (!form.artworkUrl) { toast.error("Please upload artwork first."); return; }
              createAvatarItem.mutate(form);
            }}
            disabled={createAvatarItem.isPending}
            style={{
              flex: 1, padding: "12px",
              background: "var(--ln-gold)", color: "#000",
              border: "none", borderRadius: "8px",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px",
              letterSpacing: "0.08em", cursor: createAvatarItem.isPending ? "wait" : "pointer",
              opacity: createAvatarItem.isPending ? 0.7 : 1,
            }}
          >
            {createAvatarItem.isPending ? "Submitting…" : "SUBMIT AVATAR"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "12px 20px", background: "transparent",
              color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px", fontFamily: "var(--font-display)", fontSize: "13px", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────
function MarketplaceItemCard({
  item,
  onBuy,
  onTip,
  onEquip,
  isPurchasing,
  isEquipped,
  isEquipping,
}: {
  item: any;
  onBuy: (item: any) => void;
  onTip: (item: any) => void;
  onEquip: (item: any) => void;
  isPurchasing: boolean;
  isEquipped: boolean;
  isEquipping: boolean;
}) {
  const isSoldOut = item.stock !== null && item.stock !== undefined && item.stock <= 0;
  const isLimited = item.stock !== null && item.stock !== undefined && item.stock > 0;
  const isSkin = item.type === "skin";
  const has3D = item.model3dStatus === "ready" && item.model3dUrl;

  return (
    <div
      style={{
        background: "var(--ln-panel)",
        border: isEquipped ? "1px solid var(--ln-gold)" : "1px solid var(--ln-panel-border)",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        position: "relative",
        boxShadow: isEquipped ? "0 0 20px rgba(196,154,40,0.2)" : "none",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = isEquipped
          ? "0 8px 32px rgba(196,154,40,0.3)"
          : "0 8px 32px rgba(196,154,40,0.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = isEquipped ? "0 0 20px rgba(196,154,40,0.2)" : "none";
      }}
    >
      {/* Equipped badge */}
      {isEquipped && (
        <div style={{
          position: "absolute", top: 10, right: 10, zIndex: 2,
          background: "var(--ln-gold)", color: "#000",
          fontSize: "10px", fontWeight: 700, letterSpacing: "0.1em",
          padding: "2px 8px", borderRadius: "4px",
          fontFamily: "var(--font-display)",
        }}>
          EQUIPPED
        </div>
      )}

      {/* Featured badge */}
      {item.featured && !isEquipped && (
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
          {item.artStyle && <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, marginLeft: "6px" }}>· {item.artStyle}</span>}
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

        {/* Artist credit */}
        {item.artistCredit && (
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            Art by {item.artistCredit}
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

        {/* 3D model badge */}
        {has3D && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              fontSize: "10px", color: "#a78bfa", fontFamily: "var(--font-display)",
              background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)",
              borderRadius: "4px", padding: "2px 6px", display: "inline-block", fontWeight: 700, letterSpacing: "0.08em",
            }}>
              ⬡ 3D READY
            </div>
            <a
              href={item.model3dUrl}
              download
              style={{ fontSize: "10px", color: "rgba(167,139,250,0.7)", textDecoration: "underline", fontFamily: "var(--font-display)" }}
            >
              Download {item.model3dFormat?.toUpperCase() ?? "3D"}
            </a>
          </div>
        )}
        {item.model3dStatus === "pending" || item.model3dStatus === "processing" ? (
          <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-display)" }}>
            ⟳ 3D model generating…
          </div>
        ) : null}

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

      {/* Action buttons */}
      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {/* Buy button */}
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

        {/* Equip + Tip row (skins only) */}
        {isSkin && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => onEquip(item)}
              disabled={isEquipping || isEquipped}
              style={{
                flex: 1, padding: "8px",
                background: isEquipped ? "rgba(196,154,40,0.1)" : "rgba(255,255,255,0.06)",
                color: isEquipped ? "var(--ln-gold)" : "rgba(255,255,255,0.6)",
                border: isEquipped ? "1px solid rgba(196,154,40,0.3)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.08em",
                cursor: isEquipped ? "default" : isEquipping ? "wait" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {isEquipped ? "✓ EQUIPPED" : isEquipping ? "…" : "EQUIP"}
            </button>
            <button
              onClick={() => onTip(item)}
              style={{
                flex: 1, padding: "8px",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.08em",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--ln-gold)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              ♡ GIFT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Creator Guides Section ──────────────────────────────────────────────────
function MarketplaceGuidesSection() {
  const [selected, setSelected] = useState<any | null>(null);
  const [tipping, setTipping] = useState(false);
  const [tipAmount, setTipAmount] = useState(500);
  const { user } = useAuth();
  const { data: guides = [], isLoading } = trpc.guides.listPublished.useQuery(
    { limit: 20 },
    { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );
  const createTip = trpc.guides.createTip.useMutation({
    onSuccess: (data: any) => {
      if (data?.url) window.open(data.url, "_blank");
      setTipping(false);
      setSelected(null);
    },
    onError: (err: any) => toast.error(err.message ?? "Gift failed."),
  });

  if (isLoading || (guides as any[]).length === 0) return null;

  return (
    <div style={{ marginTop: 48, borderTop: "1px solid var(--ln-panel-border)", paddingTop: 32 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "var(--ln-gold)", textTransform: "uppercase", marginBottom: 6 }}>
            ✦ Creator Guides
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", maxWidth: 480, lineHeight: 1.5, margin: 0 }}>
            Sovereign creative companions — each anchored to a WID and authored by a registered creator.
          </p>
        </div>
        <a href="/guides" style={{ fontFamily: "var(--font-display)", fontSize: 11, color: "var(--ln-gold)", letterSpacing: "0.1em", textDecoration: "none", whiteSpace: "nowrap", marginLeft: 16 }}>
          View all →
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
        {(guides as any[]).map((guide: any) => (
          <button
            key={guide.id}
            onClick={() => setSelected(guide)}
            style={{ textAlign: "left", background: "var(--ln-panel)", border: "1px solid var(--ln-panel-border)", borderRadius: 8, overflow: "hidden", cursor: "pointer", padding: 0, transition: "transform 0.15s, border-color 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(196,154,40,0.4)"; (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--ln-panel-border)"; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            <div style={{ aspectRatio: "3/4", overflow: "hidden", background: "var(--ln-void)" }}>
              {guide.artworkUrl ? (
                <img src={guide.artworkUrl} alt={guide.canonicalName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 32, opacity: 0.3 }}>◈</span>
                </div>
              )}
            </div>
            <div style={{ padding: "10px 12px" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: "var(--ln-parchment)", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {guide.canonicalName}
              </div>
              {guide.archetypeType && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guide.archetypeType}</div>
              )}
              {guide.widCode && (
                <div style={{ display: "inline-block", padding: "2px 6px", borderRadius: 3, background: "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.25)", fontSize: 9, color: "var(--ln-gold)", fontFamily: "var(--font-display)" }}>
                  {guide.widCode}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 20, overflowY: "auto" }}
          onClick={() => { setSelected(null); setTipping(false); }}
        >
          <div
            style={{ background: "var(--ln-panel)", border: "1px solid rgba(196,154,40,0.35)", borderRadius: 10, width: "100%", maxWidth: 560, padding: 28, position: "relative", marginTop: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => { setSelected(null); setTipping(false); }} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 22, lineHeight: "1" }}>×</button>
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              {selected.artworkUrl && (
                <div style={{ width: 110, flexShrink: 0, borderRadius: 6, overflow: "hidden", border: "1px solid var(--ln-panel-border)" }}>
                  <img src={selected.artworkUrl} alt={selected.canonicalName} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", objectPosition: "top", display: "block" }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", color: "var(--ln-gold)", textTransform: "uppercase", marginBottom: 6 }}>
                  {selected.archetypeType ?? "Guide"}
                </div>
                <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--ln-parchment)", margin: "0 0 8px", lineHeight: 1.2 }}>
                  {selected.canonicalName}
                </h2>
                {selected.widCode && (
                  <div style={{ display: "inline-block", padding: "3px 8px", borderRadius: 4, background: "rgba(196,154,40,0.1)", border: "1px solid rgba(196,154,40,0.3)", fontSize: 10, color: "var(--ln-gold)", fontFamily: "var(--font-display)", marginBottom: 10 }}>
                    {selected.widCode}
                  </div>
                )}
                {selected.role && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 4, margin: "0 0 4px" }}>{selected.role}</p>}
                {selected.alignment && <p style={{ fontSize: 11, color: "rgba(196,154,40,0.7)", margin: 0 }}>{selected.alignment}</p>}
              </div>
            </div>
            {selected.loreDescription && (
              <div style={{ padding: 14, borderRadius: 6, background: "var(--ln-void)", border: "1px solid var(--ln-panel-border)", marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, margin: 0 }}>{selected.loreDescription}</p>
              </div>
            )}
            {selected.testimony && (
              <div style={{ padding: 14, borderRadius: 6, background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.2)", marginBottom: 16 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 9, color: "var(--ln-gold)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>Origin Testimony</div>
                <p style={{ fontSize: 12, color: "var(--ln-parchment)", lineHeight: 1.7, fontStyle: "italic", margin: 0 }}>"{selected.testimony}"</p>
              </div>
            )}
            {tipping ? (
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: "var(--ln-gold)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 10 }}>Choose a Gift Amount</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {[100, 300, 500, 1000, 2500].map((amt) => (
                    <button key={amt} onClick={() => setTipAmount(amt)} style={{ padding: "6px 14px", borderRadius: 4, background: tipAmount === amt ? "var(--ln-gold)" : "rgba(255,255,255,0.06)", color: tipAmount === amt ? "#000" : "rgba(255,255,255,0.7)", border: tipAmount === amt ? "none" : "1px solid rgba(255,255,255,0.15)", fontFamily: "var(--font-display)", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                      ${(amt / 100).toFixed(2)}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { if (!user) { window.location.href = getLoginUrl("/marketplace"); return; } createTip.mutate({ guideId: selected.id, amountCents: tipAmount, origin: window.location.origin }); }}
                    disabled={createTip.isPending}
                    style={{ flex: 1, padding: "10px 16px", background: "var(--ln-gold)", color: "#000", border: "none", borderRadius: 4, fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", cursor: createTip.isPending ? "wait" : "pointer", opacity: createTip.isPending ? 0.7 : 1 }}
                  >
                    {createTip.isPending ? "Processing…" : `✨ Gift $${(tipAmount / 100).toFixed(2)}`}
                  </button>
                  <button onClick={() => setTipping(false)} style={{ padding: "10px 16px", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.5)", borderRadius: 4, cursor: "pointer", fontSize: 11 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <a href={`/guide/${selected.id}`} style={{ flex: 1, textAlign: "center", padding: "10px 16px", background: "var(--ln-gold)", color: "#000", borderRadius: 4, fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textDecoration: "none", textTransform: "uppercase" }}>
                  View Guide
                </a>
                <button onClick={() => setTipping(true)} style={{ flex: 1, padding: "10px 16px", background: "transparent", border: "1px solid rgba(196,154,40,0.4)", color: "var(--ln-gold)", borderRadius: 4, fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase" }}>
                  ✨ Gift Creator
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarketplacePage() {
  const [activeType, setActiveType] = useState<ItemType>("all");
  const [purchasingId, setPurchasingId] = useState<number | null>(null);
  const [equippingId, setEquippingId] = useState<number | null>(null);
  const [tipItem, setTipItem] = useState<any | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const isFounder = (user as any)?.role === "founder";
  const equippedAvatarItemId = (user as any)?.equippedAvatarItemId ?? null;

  // Check for purchase/tip success/cancel in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("purchase") === "success") {
      toast.success("Purchase complete! Your provenance receipt will arrive shortly.");
      window.history.replaceState({}, "", "/marketplace");
    } else if (params.get("purchase") === "cancelled") {
      toast.info("Purchase cancelled.");
      window.history.replaceState({}, "", "/marketplace");
    } else if (params.get("tip") === "success") {
      toast.success("Gift sent! Thank you for supporting the creator.");
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
    onError: (err) => toast.error(err.message ?? "Seed failed."),
  });

  const createCheckout = trpc.marketplace.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
      setPurchasingId(null);
    },
    onError: (err) => {
      toast.error(err.message ?? "Purchase failed. Please try again.");
      setPurchasingId(null);
    },
  });

  const equipAvatar = trpc.marketplace.equipAvatar.useMutation({
    onSuccess: (data) => {
      toast.success("Avatar equipped! Your profile photo has been updated.");
      utils.marketplace.listItems.invalidate();
      // Refresh auth state so equippedAvatarItemId updates
      utils.auth.me.invalidate();
      setEquippingId(null);
    },
    onError: (err) => {
      toast.error(err.message ?? "Equip failed.");
      setEquippingId(null);
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

  const handleEquip = (item: any) => {
    if (!user) {
      window.location.href = getLoginUrl("/marketplace");
      return;
    }
    setEquippingId(item.id);
    equipAvatar.mutate({ itemId: item.id });
  };

  const skinItems = (items as any[]).filter((i: any) => i.type === "skin");
  const featuredItems = (items as any[]).filter((i: any) => i.featured);
  const regularItems = (items as any[]).filter((i: any) => !i.featured);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--ln-obsidian)",
      color: "var(--ln-parchment)",
      fontFamily: "var(--font-body)",
    }}>
      {/* Modals */}
      {tipItem && <TipModal item={tipItem} onClose={() => setTipItem(null)} />}
      {showSubmit && (
        <SubmitAvatarModal
          styleGuideItems={skinItems.slice(0, 6)}
          onClose={() => setShowSubmit(false)}
          onSuccess={() => utils.marketplace.listItems.invalidate()}
        />
      )}

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
          maxWidth: "480px", margin: "0 auto 16px",
          lineHeight: 1.6,
        }}>
          Every item is anchored to a creator's provenance record.
          When you buy, you own a piece of the living archive.
        </p>

        {/* Founder submit button */}
        {isFounder && (
          <button
            onClick={() => setShowSubmit(true)}
            style={{
              padding: "10px 24px",
              background: "rgba(196,154,40,0.12)",
              border: "1px solid rgba(196,154,40,0.4)",
              color: "var(--ln-gold)",
              fontFamily: "var(--font-display)",
              fontSize: "12px",
              letterSpacing: "0.1em",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ⊕ Submit Avatar
          </button>
        )}
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
                  onTip={setTipItem}
                  onEquip={handleEquip}
                  isPurchasing={purchasingId === item.id}
                  isEquipped={equippedAvatarItemId === item.id}
                  isEquipping={equippingId === item.id}
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
                  onTip={setTipItem}
                  onEquip={handleEquip}
                  isPurchasing={purchasingId === item.id}
                  isEquipped={equippedAvatarItemId === item.id}
                  isEquipping={equippingId === item.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Creator Guides Section ── */}
        <MarketplaceGuidesSection />

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
