/**
 * QRIdentityCard — Ceremonial Collectible Card
 *
 * A provenance-first identity artifact for Living Nexus creators, tracks, and projects.
 * Designed as a collectible card — not a utility widget.
 *
 * Layers:
 *   1. Background — deep charcoal with radial ambient glow
 *   2. Rarity border — color-coded by rarity class (Genesis / Witnessed / Resonant / Standard)
 *   3. Artwork — full-bleed thumbnail, bottom gradient fade
 *   4. Rarity badge — top-right corner, color-coded
 *   5. Entity name + subtitle — centered, gold serif
 *   6. Resonance signature row — plays · witnesses · contributions
 *   7. Creator seal — WID fragment + "WITNESSED ON LIVING NEXUS"
 *   8. QR code — centered, white background, gold border
 *   9. SCAN TO WITNESS instruction
 *  10. Bottom provenance strip — date + Living Nexus mark
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Download, Share2, Copy, Check, Loader2, ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QRCardEntity {
  type: "creator" | "project" | "song";
  id: number;
  slug: string;
  name: string;
  subtitle?: string;
  description?: string;
  thumbnailUrl?: string;
  thumbnailPositionX?: number;
  thumbnailPositionY?: number;
  /**
   * A direct canonical destination for read-only identity artifacts. This
   * intentionally avoids minting a QR-share record when scan attribution is
   * not part of the creator-card contract.
   */
  canonicalUrl?: string;
  verifiedBadge?: boolean;
  // Resonance data (optional — shown in signature row if provided)
  playCount?: number;
  witnessCount?: number;
  totalFundingCents?: number;
  // Rarity — auto-computed if not provided
  rarityClass?: "genesis" | "witnessed" | "resonant" | "standard";
}

interface QRIdentityCardProps {
  entity: QRCardEntity;
  campaign?: string;
  tag?: string;
  onClose?: () => void;
}

// ─── Card dimensions ─────────────────────────────────────────────────────────
const CARD_W = 480;
const CARD_H = 760;

// ─── Rarity system ────────────────────────────────────────────────────────────
function computeRarity(entity: QRCardEntity): "genesis" | "witnessed" | "resonant" | "standard" {
  if (entity.rarityClass) return entity.rarityClass;
  const funding = (entity.totalFundingCents ?? 0) / 100;
  const witnesses = entity.witnessCount ?? 0;
  const plays = entity.playCount ?? 0;
  if (funding >= 500 || witnesses >= 100) return "genesis";
  if (funding >= 100 || witnesses >= 25 || plays >= 1000) return "witnessed";
  if (funding >= 10 || witnesses >= 5 || plays >= 100) return "resonant";
  return "standard";
}

const RARITY_CONFIG = {
  genesis: {
    label: "GENESIS",
    primary: "#FFD700",
    secondary: "#FFA500",
    glow: "rgba(255,215,0,0.35)",
    borderStops: ["#FFD700", "#FFA500", "#FFD700", "#FFF8DC", "#FFD700"],
  },
  witnessed: {
    label: "WITNESSED",
    primary: "#C49A28",
    secondary: "#E8C84A",
    glow: "rgba(196,154,40,0.25)",
    borderStops: ["#C49A28", "#E8C84A", "#C49A28"],
  },
  resonant: {
    label: "RESONANT",
    primary: "#9B7FD4",
    secondary: "#C4A8FF",
    glow: "rgba(155,127,212,0.2)",
    borderStops: ["#9B7FD4", "#C4A8FF", "#9B7FD4"],
  },
  standard: {
    label: "STANDARD",
    primary: "#6B7280",
    secondary: "#9CA3AF",
    glow: "rgba(107,114,128,0.15)",
    borderStops: ["#6B7280", "#9CA3AF", "#6B7280"],
  },
};

// ─── Canvas renderer ─────────────────────────────────────────────────────────

async function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  entity: QRCardEntity,
  shareUrl: string,
  renderMode: "preview" | "export" = "preview"
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CARD_W;
  canvas.height = CARD_H;

  const rarity = computeRarity(entity);
  const rc = RARITY_CONFIG[rarity];

  // ── 1. Full-vertical creator art field ───────────────────────────────────
  // Preview motion lives in the DOM layer below this canvas. Exports render a
  // static cover crop into the same geometry so downloaded/print artifacts stay
  // stable and scan-ready.
  if (renderMode === "export" || !entity.thumbnailUrl) {
    const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
    bg.addColorStop(0, "#1a1508");
    bg.addColorStop(0.48, "#0e0e0e");
    bg.addColorStop(1, "#080808");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  if (renderMode === "export" && entity.thumbnailUrl) {
    try {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.crossOrigin = "anonymous";
        img.src = entity.thumbnailUrl!;
      });
      if (img.complete && img.naturalWidth > 0) {
        const scale = Math.max(CARD_W / img.naturalWidth, CARD_H / img.naturalHeight);
        const drawnW = img.naturalWidth * scale;
        const drawnH = img.naturalHeight * scale;
        const cropX = Math.min(100, Math.max(0, entity.thumbnailPositionX ?? 50)) / 100;
        const cropY = Math.min(100, Math.max(0, entity.thumbnailPositionY ?? 42)) / 100;
        ctx.drawImage(img, (CARD_W - drawnW) * cropX, (CARD_H - drawnH) * cropY, drawnW, drawnH);
      }
    } catch (_) { /* dark fallback remains */ }
  }

  // Contrast protection keeps visual art present while never consuming the
  // creator's declared identity, testimony, or QR quiet zone.
  const veil = ctx.createLinearGradient(0, 0, 0, CARD_H);
  veil.addColorStop(0, "rgba(5,5,5,0.10)");
  veil.addColorStop(0.34, "rgba(5,5,5,0.18)");
  veil.addColorStop(0.56, "rgba(5,5,5,0.66)");
  veil.addColorStop(0.78, "rgba(5,5,5,0.86)");
  veil.addColorStop(1, "rgba(5,5,5,0.96)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const radial = ctx.createRadialGradient(CARD_W / 2, CARD_H * 0.32, 0, CARD_W / 2, CARD_H * 0.32, CARD_W * 0.7);
  radial.addColorStop(0, rc.glow);
  radial.addColorStop(1, "transparent");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── 2. Rarity border ──────────────────────────────────────────────────────
  const borderGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  rc.borderStops.forEach((stop, i) => {
    borderGrad.addColorStop(i / (rc.borderStops.length - 1), stop);
  });
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = rarity === "genesis" ? 3.5 : 2.5;
  const r = 16;
  ctx.beginPath();
  ctx.roundRect(5, 5, CARD_W - 10, CARD_H - 10, r);
  ctx.stroke();

  // Inner border (subtle)
  ctx.strokeStyle = `${rc.primary}22`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(12, 12, CARD_W - 24, CARD_H - 24, r - 4);
  ctx.stroke();

  // ── 3. Rarity badge (top-right) ───────────────────────────────────────────
  const badgeW = rarity === "genesis" ? 100 : 90;
  const badgeH = 24;
  const badgeX = CARD_W - 20 - badgeW;
  const badgeY = 28;
  ctx.fillStyle = rc.primary;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4);
  ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  ctx.font = `bold 10px 'Arial', sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(rc.label, badgeX + badgeW / 2, badgeY + 16);

  // Genesis star
  if (rarity === "genesis") {
    ctx.fillStyle = "#0a0a0a";
    ctx.font = "10px 'Arial', sans-serif";
    ctx.fillText("★", badgeX + 10, badgeY + 16);
  }

  // ── Living Nexus watermark (top-left) ─────────────────────────────────────
  ctx.fillStyle = `${rc.primary}BB`;
  ctx.font = "bold 9px 'Arial', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("LIVING NEXUS", 28, 44);

  // ── 4. Identity plane ─────────────────────────────────────────────────────
  const nameY = 334;
  ctx.fillStyle = "#F0D080";
  ctx.font = "bold 26px 'Georgia', serif";
  ctx.textAlign = "center";
  let displayName = entity.name;
  if (ctx.measureText(displayName).width > CARD_W - 60) {
    while (ctx.measureText(displayName + "…").width > CARD_W - 60 && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    displayName += "…";
  }
  ctx.fillText(displayName, CARD_W / 2, nameY);

  if (entity.subtitle) {
    ctx.fillStyle = `${rc.primary}BB`;
    ctx.font = "13px 'Arial', sans-serif";
    ctx.fillText(entity.subtitle, CARD_W / 2, nameY + 24);
  }

  // Gold divider
  const divY = nameY + (entity.subtitle ? 44 : 22);
  const divGrad = ctx.createLinearGradient(40, 0, CARD_W - 40, 0);
  divGrad.addColorStop(0, "transparent");
  divGrad.addColorStop(0.3, rc.primary);
  divGrad.addColorStop(0.7, rc.primary);
  divGrad.addColorStop(1, "transparent");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, divY);
  ctx.lineTo(CARD_W - 40, divY);
  ctx.stroke();

  // ── 5. Resonance signature row ────────────────────────────────────────────
  const sigY = divY + 22;
  const hasResonance = (entity.playCount ?? 0) > 0 || (entity.witnessCount ?? 0) > 0 || (entity.totalFundingCents ?? 0) > 0;

  if (hasResonance) {
    const items: { icon: string; value: string }[] = [];
    if ((entity.playCount ?? 0) > 0) items.push({ icon: "▶", value: `${entity.playCount!.toLocaleString()} plays` });
    if ((entity.witnessCount ?? 0) > 0) items.push({ icon: "◈", value: `${entity.witnessCount} witnesses` });
    if ((entity.totalFundingCents ?? 0) > 0) items.push({ icon: "$", value: `$${((entity.totalFundingCents!) / 100).toFixed(0)} contributed` });

    const colW = Math.floor((CARD_W - 80) / items.length);
    items.forEach((item, i) => {
      const cx = 40 + colW * i + colW / 2;
      ctx.fillStyle = rc.primary;
      ctx.font = "bold 12px 'Arial', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.icon, cx, sigY);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "10px 'Arial', sans-serif";
      ctx.fillText(item.value, cx, sigY + 16);
    });
  }

  // ── 6. Creator seal ───────────────────────────────────────────────────────
  const sealY = hasResonance ? sigY + 42 : sigY + 4;
  ctx.fillStyle = `${rc.primary}44`;
  ctx.beginPath();
  ctx.roundRect(40, sealY, CARD_W - 80, 28, 6);
  ctx.fill();
  ctx.fillStyle = `${rc.primary}99`;
  ctx.font = "bold 9px 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("WITNESSED ON LIVING NEXUS · PROVENANCE PRESERVED", CARD_W / 2, sealY + 18);

  // ── 6.5 Creator-declared testimony excerpt ───────────────────────────────
  // This is intentionally limited to existing creator-declared copy. It is not
  // a provenance, ownership, or legal assertion authored by the card system.
  if (entity.description) {
    const statement = entity.description.replace(/\s+/g, " ").trim();
    const maxLineWidth = CARD_W - 88;
    const testimonyLineLimit = hasResonance ? 2 : 3;
    const words = statement.split(" ");
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxLineWidth && line) {
        lines.push(line);
        line = word;
        if (lines.length === testimonyLineLimit) break;
      } else {
        line = candidate;
      }
    }
    if (line && lines.length < testimonyLineLimit) lines.push(line);
    const consumed = lines.join(" ");
    if (consumed.length < statement.length && lines.length > 0) {
      lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:!?]?$/, "")}…`;
    }
    ctx.fillStyle = `${rc.primary}CC`;
    ctx.font = "bold 8px 'Arial', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CREATOR-DECLARED TESTIMONY", CARD_W / 2, sealY + 50);
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "11px 'Arial', sans-serif";
    ctx.textAlign = "center";
    lines.forEach((copy, index) => ctx.fillText(copy, CARD_W / 2, sealY + 68 + index * 16));
  }

  // ── 7. QR Code — protected quiet plane ────────────────────────────────────
  const qrSize = 140;
  const qrX = (CARD_W - qrSize) / 2;
  const qrY = CARD_H - qrSize - 78;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10);
  ctx.fill();

  const qrBorderGrad = ctx.createLinearGradient(qrX - 12, qrY - 12, qrX + qrSize + 12, qrY + qrSize + 12);
  qrBorderGrad.addColorStop(0, rc.primary);
  qrBorderGrad.addColorStop(0.5, rc.secondary);
  qrBorderGrad.addColorStop(1, rc.primary);
  ctx.strokeStyle = qrBorderGrad;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 12);
  ctx.stroke();

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, shareUrl, {
    width: qrSize,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // ── 8. Scan instruction ───────────────────────────────────────────────────
  ctx.fillStyle = `${rc.primary}CC`;
  ctx.font = "bold 11px 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SCAN TO WITNESS", CARD_W / 2, qrY + qrSize + 24);

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "9px 'Arial', sans-serif";
  const shortUrl = shareUrl.length > 55 ? shareUrl.slice(0, 52) + "…" : shareUrl;
  ctx.fillText(shortUrl, CARD_W / 2, qrY + qrSize + 40);

  // ── 9. Bottom provenance strip ────────────────────────────────────────────
  const stripY = CARD_H - 26;
  ctx.fillStyle = `${rc.primary}11`;
  ctx.fillRect(18, stripY - 8, CARD_W - 36, 22);
  ctx.fillStyle = `${rc.primary}55`;
  ctx.font = "8px 'Arial', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("LIVING NEXUS · CREATIVE PROVENANCE PLATFORM", 28, stripY + 7);
  ctx.textAlign = "right";
  ctx.fillText(new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }), CARD_W - 28, stripY + 7);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QRIdentityCard({ entity, campaign, tag, onClose }: QRIdentityCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [shareId, setShareId] = useState<number | null>(null);

  const generateMutation = trpc.qr.generate.useMutation();
  const rarity = computeRarity(entity);
  const rc = RARITY_CONFIG[rarity];

  useEffect(() => {
    if (entity.canonicalUrl) {
      setShareUrl(entity.canonicalUrl);
      setIsGenerating(false);
      if (canvasRef.current) {
          renderCardToCanvas(canvasRef.current, entity, entity.canonicalUrl, "preview").catch(() => {
          toast.error("Failed to render Creator Witness Card");
        });
      }
      return;
    }

    const origin = window.location.origin;
    generateMutation.mutate(
      { entityType: entity.type, entityId: entity.id, entitySlug: entity.slug, campaign, tag, origin },
      {
        onSuccess: async (data) => {
          setShareUrl(data.url);
          setShareId(data.share.id);
          setIsGenerating(false);
          if (canvasRef.current) {
            await renderCardToCanvas(canvasRef.current, entity, data.url, "preview");
          }
        },
        onError: (err) => {
          toast.error("Failed to generate QR: " + err.message);
          setIsGenerating(false);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadPng = useCallback(async () => {
    if (!canvasRef.current || !shareUrl) return;
    const filename = `living-nexus-${entity.type}-${entity.slug}.png`;
    const exportCanvas = document.createElement("canvas");
    try {
      await renderCardToCanvas(exportCanvas, entity, shareUrl, "export");
    } catch (_) {
      toast.error("Failed to prepare print-safe card export.");
      return;
    }
    exportCanvas.toBlob((blob) => {
      if (!blob) {
        const link = document.createElement("a");
        link.download = filename;
        link.href = exportCanvas.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      toast.success("Card downloaded — PNG saved to your device.");
    }, "image/png");
  }, [entity, shareUrl]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Link copied to clipboard.");
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${entity.name} on Living Nexus`,
          text: entity.description ?? `Check out ${entity.name} on Living Nexus`,
          url: shareUrl,
        });
      } catch (_) { /* user cancelled */ }
    } else {
      handleCopyLink();
    }
  }, [shareUrl, entity, handleCopyLink]);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Rarity class indicator */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
          style={{ background: `${rc.primary}18`, border: `1px solid ${rc.primary}44`, color: rc.primary }}
        >
          {rarity === "genesis" && "★ "}
          {rc.label} CARD
        </span>
      </div>

      {/* Canvas preview */}
      <div
        className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: "min(320px, calc(100vw - 4rem))",
          aspectRatio: `${CARD_W} / ${CARD_H}`,
          boxShadow: `0 0 40px ${rc.glow}, 0 0 80px ${rc.glow}`,
          border: `2px solid ${rc.primary}44`,
        }}
      >
        {entity.thumbnailUrl && (
          <div
            aria-hidden="true"
            className="creator-witness-card-preview-art absolute -inset-[8%] bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url(${entity.thumbnailUrl})`,
              backgroundPosition: `${entity.thumbnailPositionX ?? 50}% ${entity.thumbnailPositionY ?? 42}%`,
            }}
          />
        )}
        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: rc.primary }} />
            <span className="text-xs tracking-widest uppercase" style={{ color: `${rc.primary}88` }}>
              Preparing card…
            </span>
          </div>
        )}
        <canvas ref={canvasRef} className="relative z-[1]" style={{ width: "100%", height: "100%", display: "block" }} />
      </div>

      {entity.description && (
        <section
          className="w-full max-w-sm rounded-xl border px-4 py-3 text-left"
          style={{ borderColor: `${rc.primary}33`, background: "rgba(0,0,0,0.35)" }}
        >
          <p className="text-[10px] font-semibold tracking-[0.16em] uppercase" style={{ color: `${rc.primary}CC` }}>
            Creator-declared testimony
          </p>
          <p className="mt-2 text-sm leading-6 text-white/80 whitespace-pre-wrap break-words">
            {entity.description}
          </p>
        </section>
      )}

      {/* Share URL */}
      {shareUrl && (
        <div className="w-full max-w-sm bg-black/40 border border-amber-700/30 rounded-lg px-3 py-2 flex items-center gap-2">
          <ExternalLink className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-200/60 truncate flex-1">{shareUrl}</span>
        </div>
      )}

      {campaign && (
        <Badge variant="outline" className="border-amber-600/50 text-amber-400 text-xs">
          {campaign}
        </Badge>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        <Button
          onClick={handleDownloadPng}
          disabled={isGenerating}
          className="font-semibold gap-2 text-black"
          size="sm"
          style={{ background: rc.primary }}
        >
          <Download className="w-4 h-4" />
          Download Card
        </Button>
        <Button
          onClick={handleCopyLink}
          disabled={isGenerating}
          variant="outline"
          className="gap-2"
          size="sm"
          style={{ borderColor: `${rc.primary}50`, color: rc.primary }}
        >
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? "Copied!" : "Copy Link"}
        </Button>
        <Button
          onClick={handleNativeShare}
          disabled={isGenerating}
          variant="outline"
          className="gap-2"
          size="sm"
          style={{ borderColor: `${rc.primary}50`, color: rc.primary }}
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>

      {shareId && (
        <p className="text-xs text-white/30 text-center">
          Share #{shareId} · Every scan is provenance-attributed
        </p>
      )}
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

interface QRShareModalProps {
  entity: QRCardEntity;
  campaign?: string;
  tag?: string;
  trigger: React.ReactNode;
}

export function QRShareModal({ entity, campaign, tag, trigger }: QRShareModalProps) {
  const [open, setOpen] = useState(false);
  const rarity = computeRarity(entity);
  const rc = RARITY_CONFIG[rarity];

  const modalContent = open ? (
    <div
      className="fixed inset-0 overflow-y-auto bg-black/75 backdrop-blur-sm"
      style={{ zIndex: 99999 }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
    >
      <div className="flex min-h-full items-center justify-center p-4 py-8">
        <div
          className="bg-[#0a0a0a] rounded-2xl shadow-2xl w-full"
          style={{
            maxWidth: "min(520px, calc(100vw - 2rem))",
            border: `1.5px solid ${rc.primary}44`,
            boxShadow: `0 0 60px ${rc.glow}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3" style={{ borderBottom: `1px solid ${rc.primary}22` }}>
            <div>
              <h2 className="font-bold text-lg" style={{ color: rc.primary }}>
                {entity.type === "creator" ? "Creator Witness Card" : "Identity Card"}
              </h2>
              <p className="text-white/40 text-xs mt-0.5">
                Ceremonial provenance artifact · {rc.label} class
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              ✕
            </button>
          </div>

          <QRIdentityCard entity={entity} campaign={campaign} tag={tag} onClose={() => setOpen(false)} />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <span onClick={() => setOpen(true)} style={{ cursor: "pointer", display: "inline-flex" }}>
        {trigger}
      </span>
      {typeof document !== "undefined" && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
