/**
 * QRIdentityCard
 * Renders a visually rich identity card with a QR code, creator/entity info,
 * and a provenance marker. Supports PNG export via canvas.
 *
 * Design language: dark gold — matching the Living Nexus aesthetic.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { Download, Share2, Copy, Check, Loader2, ExternalLink } from "lucide-react";
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
  subtitle?: string;       // artist handle / project tagline / song artist
  description?: string;    // short bio / project description
  thumbnailUrl?: string;   // cover art / profile photo / banner
  verifiedBadge?: boolean;
}

interface QRIdentityCardProps {
  entity: QRCardEntity;
  campaign?: string;
  tag?: string;
  onClose?: () => void;
}

// ─── Card dimensions ─────────────────────────────────────────────────────────
const CARD_W = 480;
const CARD_H = 720;

// ─── Canvas renderer ─────────────────────────────────────────────────────────

async function renderCardToCanvas(
  canvas: HTMLCanvasElement,
  entity: QRCardEntity,
  qrUrl: string,
  shareUrl: string
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = CARD_W;
  canvas.height = CARD_H;

  // ── Background gradient (dark charcoal → near-black) ──────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, "#1a1508");
  bg.addColorStop(0.5, "#0d0d0d");
  bg.addColorStop(1, "#0a0a0a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── Gold border ────────────────────────────────────────────────────────────
  const borderGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  borderGrad.addColorStop(0, "#c9a84c");
  borderGrad.addColorStop(0.5, "#f0d080");
  borderGrad.addColorStop(1, "#c9a84c");
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, CARD_W - 12, CARD_H - 12);

  // ── Inner border (subtle) ─────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(201,168,76,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, CARD_W - 28, CARD_H - 28);

  // ── Thumbnail / artwork ───────────────────────────────────────────────────
  const thumbH = 220;
  if (entity.thumbnailUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // graceful fallback
        img.src = entity.thumbnailUrl!;
      });
      if (img.complete && img.naturalWidth > 0) {
        // Clip to rectangle
        ctx.save();
        ctx.beginPath();
        ctx.rect(20, 20, CARD_W - 40, thumbH);
        ctx.clip();
        // Cover-fit the image
        const scale = Math.max((CARD_W - 40) / img.naturalWidth, thumbH / img.naturalHeight);
        const sw = img.naturalWidth * scale;
        const sh = img.naturalHeight * scale;
        const sx = 20 + ((CARD_W - 40) - sw) / 2;
        const sy = 20 + (thumbH - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh);
        ctx.restore();
        // Gradient overlay on thumbnail bottom
        const thumbOverlay = ctx.createLinearGradient(0, 20 + thumbH - 80, 0, 20 + thumbH);
        thumbOverlay.addColorStop(0, "rgba(10,10,10,0)");
        thumbOverlay.addColorStop(1, "rgba(10,10,10,0.95)");
        ctx.fillStyle = thumbOverlay;
        ctx.fillRect(20, 20, CARD_W - 40, thumbH);
      }
    } catch (_) { /* ignore */ }
  } else {
    // Placeholder gradient
    const ph = ctx.createLinearGradient(20, 20, CARD_W - 20, 20 + thumbH);
    ph.addColorStop(0, "#1e1a0e");
    ph.addColorStop(1, "#2a2010");
    ctx.fillStyle = ph;
    ctx.fillRect(20, 20, CARD_W - 40, thumbH);
  }

  // ── Entity type badge ─────────────────────────────────────────────────────
  const badgeLabel = entity.type === "creator" ? "CREATOR" : entity.type === "project" ? "PROJECT" : "TRACK";
  ctx.fillStyle = "rgba(201,168,76,0.85)";
  const badgeW = 90;
  const badgeH = 22;
  ctx.beginPath();
  ctx.roundRect(CARD_W - 20 - badgeW, 30, badgeW, badgeH, 4);
  ctx.fill();
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "bold 10px 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(badgeLabel, CARD_W - 20 - badgeW / 2, 30 + 15);

  // ── Living Nexus watermark (top-left) ─────────────────────────────────────
  ctx.fillStyle = "rgba(201,168,76,0.7)";
  ctx.font = "bold 9px 'Arial', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("LIVING NEXUS", 30, 44);

  // ── Entity name ───────────────────────────────────────────────────────────
  const nameY = 20 + thumbH + 28;
  ctx.fillStyle = "#f0d080";
  ctx.font = "bold 26px 'Georgia', serif";
  ctx.textAlign = "center";
  // Truncate long names
  let displayName = entity.name;
  if (ctx.measureText(displayName).width > CARD_W - 60) {
    while (ctx.measureText(displayName + "…").width > CARD_W - 60 && displayName.length > 0) {
      displayName = displayName.slice(0, -1);
    }
    displayName += "…";
  }
  ctx.fillText(displayName, CARD_W / 2, nameY);

  // ── Subtitle / handle ─────────────────────────────────────────────────────
  if (entity.subtitle) {
    ctx.fillStyle = "rgba(201,168,76,0.7)";
    ctx.font = "14px 'Arial', sans-serif";
    ctx.fillText(entity.subtitle, CARD_W / 2, nameY + 26);
  }

  // ── Gold divider ──────────────────────────────────────────────────────────
  const divY = nameY + (entity.subtitle ? 46 : 22);
  const divGrad = ctx.createLinearGradient(40, 0, CARD_W - 40, 0);
  divGrad.addColorStop(0, "transparent");
  divGrad.addColorStop(0.3, "#c9a84c");
  divGrad.addColorStop(0.7, "#c9a84c");
  divGrad.addColorStop(1, "transparent");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, divY);
  ctx.lineTo(CARD_W - 40, divY);
  ctx.stroke();

  // ── Description ───────────────────────────────────────────────────────────
  if (entity.description) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "12px 'Arial', sans-serif";
    ctx.textAlign = "center";
    const words = entity.description.split(" ");
    const lines: string[] = [];
    let currentLine = "";
    const maxW = CARD_W - 80;
    for (const word of words) {
      const test = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(test).width > maxW) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
      if (lines.length >= 3) break;
    }
    if (currentLine && lines.length < 3) lines.push(currentLine);
    lines.forEach((line, i) => {
      ctx.fillText(line, CARD_W / 2, divY + 18 + i * 18);
    });
  }

  // ── QR Code ───────────────────────────────────────────────────────────────
  const qrSize = 160;
  const qrX = (CARD_W - qrSize) / 2;
  const qrY = CARD_H - qrSize - 80;

  // White background for QR
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 8);
  ctx.fill();

  // Gold border around QR
  ctx.strokeStyle = "#c9a84c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 10);
  ctx.stroke();

  // Render QR code into a temp canvas
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, shareUrl, {
    width: qrSize,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // ── Scan instruction ──────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(201,168,76,0.8)";
  ctx.font = "11px 'Arial', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SCAN TO WITNESS", CARD_W / 2, qrY + qrSize + 22);

  // ── URL (truncated) ───────────────────────────────────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "9px 'Arial', sans-serif";
  const shortUrl = shareUrl.length > 60 ? shareUrl.slice(0, 57) + "…" : shareUrl;
  ctx.fillText(shortUrl, CARD_W / 2, qrY + qrSize + 38);

  // ── Bottom provenance strip ───────────────────────────────────────────────
  const stripY = CARD_H - 28;
  ctx.fillStyle = "rgba(201,168,76,0.08)";
  ctx.fillRect(20, stripY - 6, CARD_W - 40, 22);
  ctx.fillStyle = "rgba(201,168,76,0.5)";
  ctx.font = "8px 'Arial', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("LIVING NEXUS · CREATIVE PROVENANCE PLATFORM", 30, stripY + 8);
  ctx.textAlign = "right";
  ctx.fillText(new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }), CARD_W - 30, stripY + 8);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function QRIdentityCard({ entity, campaign, tag, onClose }: QRIdentityCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [shareId, setShareId] = useState<number | null>(null);

  const generateMutation = trpc.qr.generate.useMutation();

  // Generate the QR share on mount
  useEffect(() => {
    const origin = window.location.origin;
    generateMutation.mutate(
      {
        entityType: entity.type,
        entityId: entity.id,
        entitySlug: entity.slug,
        campaign,
        tag,
        origin,
      },
      {
        onSuccess: async (data) => {
          setShareUrl(data.url);
          setShareId(data.share.id);
          setIsGenerating(false);
          // Render the card
          if (canvasRef.current) {
            await renderCardToCanvas(canvasRef.current, entity, data.url, data.url);
          }
        },
        onError: (err) => {
          setIsGenerating(false);
          toast.error("Failed to generate QR: " + err.message);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadPng = useCallback(() => {
    if (!canvasRef.current) return;
    const filename = `living-nexus-${entity.type}-${entity.slug}.png`;
    // iOS Safari does not support <a download> for data URIs — use toBlob + object URL instead
    canvasRef.current.toBlob((blob) => {
      if (!blob) {
        // Fallback for browsers that don't support toBlob
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvasRef.current!.toDataURL("image/png");
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
        // Revoke after a short delay to allow the download to start
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      toast.success("Card downloaded — PNG saved to your device.");
    }, "image/png");
  }, [entity]);

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
      {/* Canvas preview — scales down on narrow screens */}
      <div className="relative rounded-xl overflow-hidden shadow-2xl border border-amber-700/40"
        style={{ width: "min(240px, calc(100vw - 4rem))", aspectRatio: `${CARD_W} / ${CARD_H}` }}>
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>

      {/* Share URL display */}
      {shareUrl && (
        <div className="w-full max-w-sm bg-black/40 border border-amber-700/30 rounded-lg px-3 py-2 flex items-center gap-2">
          <ExternalLink className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="text-xs text-amber-200/60 truncate flex-1">{shareUrl}</span>
        </div>
      )}

      {/* Campaign tag */}
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
          className="bg-amber-600 hover:bg-amber-500 text-black font-semibold gap-2"
          size="sm"
        >
          <Download className="w-4 h-4" />
          Download PNG
        </Button>
        <Button
          onClick={handleCopyLink}
          disabled={isGenerating}
          variant="outline"
          className="border-amber-700/50 text-amber-300 hover:bg-amber-900/30 gap-2"
          size="sm"
        >
          {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {isCopied ? "Copied!" : "Copy Link"}
        </Button>
        <Button
          onClick={handleNativeShare}
          disabled={isGenerating}
          variant="outline"
          className="border-amber-700/50 text-amber-300 hover:bg-amber-900/30 gap-2"
          size="sm"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>

      {shareId && (
        <p className="text-xs text-white/30 text-center">
          Share ID #{shareId} · Scans are tracked for provenance attribution
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

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </span>
      {open && (
        // Backdrop: overflow-y-auto here (not on the card) so the whole modal scrolls on small screens
        <div
          className="fixed inset-0 z-[9990] overflow-y-auto bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="flex min-h-full items-start justify-center p-4 py-8">
            <div
              className="bg-[#0d0d0d] border border-amber-700/40 rounded-2xl shadow-2xl w-full"
              style={{ maxWidth: "min(480px, calc(100vw - 2rem))" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sticky header so title + close are always visible while scrolling */}
              <div className="sticky top-0 z-10 bg-[#0d0d0d] flex items-center justify-between px-5 pt-5 pb-2 rounded-t-2xl border-b border-amber-700/20">
                <div>
                  <h2 className="text-amber-300 font-bold text-lg">Share Identity Card</h2>
                  <p className="text-white/40 text-xs mt-0.5">
                    Provenance-preserving QR — every scan is attributed
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-white/40 hover:text-white/80 text-xl leading-none ml-4 shrink-0"
                >
                  ×
                </button>
              </div>
              <QRIdentityCard
                entity={entity}
                campaign={campaign}
                tag={tag}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
