/**
 * WIDPanel — Clickable WID badge + full provenance record modal
 *
 * Usage:
 *   <WIDPanel
 *     witnessId="LN-2026-..."
 *     songTitle="My Track"
 *     creatorName="Artist Name"
 *     registeredAt={new Date("2026-03-01")}
 *     coverArtUrl="https://..."
 *     certificateUrl="https://..."   // optional
 *     // HAAI fields (optional — only when aiDisclosure = "human_authored_ai_instrument")
 *     haaiVisualConcept="..."
 *     haaiStyleLanguage="..."
 *     haaiInstrumentation="..."
 *     haaiVocalConveyance="..."
 *     haaiLyricalInspiration="..."
 *     haaiEmotionalTone="..."
 *     haaiDeclaredAt={new Date("2026-03-01")}
 *   />
 *
 * The badge is inline and clickable. On click it opens a Dialog with the
 * full provenance record and a "Download Provenance" button that saves a
 * plain-text certificate to the user's device.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Copy,
  Download,
  ExternalLink,
  CheckCircle2,
  Fingerprint,
  Share2,
  Link2,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

interface WIDPanelProps {
  witnessId: string;
  songTitle?: string;
  creatorName?: string;
  registeredAt?: Date | string | number | null;
  coverArtUrl?: string | null;
  certificateUrl?: string | null;
  /** If true, renders only the badge text (no icon), useful in compact rows */
  compact?: boolean;
  className?: string;
  // HAAI Declaration fields — only populated when aiDisclosure = "human_authored_ai_instrument"
  haaiVisualConcept?: string | null;
  haaiStyleLanguage?: string | null;
  haaiInstrumentation?: string | null;
  haaiVocalConveyance?: string | null;
  haaiLyricalInspiration?: string | null;
  haaiEmotionalTone?: string | null;
  haaiDeclaredAt?: Date | string | number | null;
}

function formatDate(d: Date | string | number | null | undefined): string {
  if (!d) return "Unknown";
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildCertificate(props: WIDPanelProps): string {
  const hasHaai = !!(
    props.haaiVisualConcept ||
    props.haaiStyleLanguage ||
    props.haaiInstrumentation ||
    props.haaiVocalConveyance ||
    props.haaiLyricalInspiration ||
    props.haaiEmotionalTone
  );

  const lines = [
    "╔══════════════════════════════════════════════════╗",
    "║        LIVING NEXUS — WITNESS ID CERTIFICATE      ║",
    "╚══════════════════════════════════════════════════╝",
    "",
    `Work Title : ${props.songTitle || "Untitled"}`,
    `Creator    : ${props.creatorName || "Unknown Artist"}`,
    `Witness ID : ${props.witnessId}`,
    `Registered : ${formatDate(props.registeredAt)}`,
    "",
    "Verify at  : https://www.livingnexus.org/verify/" + props.witnessId,
    "",
    "──────────────────────────────────────────────────",
    "This certificate is cryptographically bound to the",
    "work above. The Witness ID is immutable and cannot",
    "be transferred, revoked, or reassigned.",
    "──────────────────────────────────────────────────",
  ];

  if (hasHaai) {
    lines.push(
      "",
      "╔══════════════════════════════════════════════════╗",
      "║      HAAI AUTHORSHIP DECLARATION                  ║",
      "║  Human-Authored via AI Instrument (HAAI)          ║",
      "╚══════════════════════════════════════════════════╝",
      "",
      "This work was authored by a human creator using AI",
      "as an instrument. The following declaration fields",
      "record the creator's original intent and authorship",
      "at the time of registration.",
      ""
    );

    if (props.haaiVisualConcept) {
      lines.push(`Visual Concept      : ${props.haaiVisualConcept}`);
    }
    if (props.haaiStyleLanguage) {
      lines.push(`Style Language      : ${props.haaiStyleLanguage}`);
    }
    if (props.haaiInstrumentation) {
      lines.push(`Instrumentation     : ${props.haaiInstrumentation}`);
    }
    if (props.haaiVocalConveyance) {
      lines.push(`Vocal Conveyance    : ${props.haaiVocalConveyance}`);
    }
    if (props.haaiLyricalInspiration) {
      lines.push(`Lyrical Inspiration : ${props.haaiLyricalInspiration}`);
    }
    if (props.haaiEmotionalTone) {
      lines.push(`Emotional Tone      : ${props.haaiEmotionalTone}`);
    }
    if (props.haaiDeclaredAt) {
      lines.push(`Declaration Sealed  : ${formatDate(props.haaiDeclaredAt)}`);
    }

    lines.push(
      "",
      "──────────────────────────────────────────────────",
      "HAAI declaration is part of the immutable authorship",
      "record. It cannot be altered after registration.",
      "──────────────────────────────────────────────────"
    );
  }

  lines.push(
    "",
    `Generated  : ${new Date().toISOString()}`
  );

  return lines.join("\n");
}

export function WIDPanel({
  witnessId,
  songTitle,
  creatorName,
  registeredAt,
  coverArtUrl,
  certificateUrl,
  compact = false,
  className = "",
  haaiVisualConcept,
  haaiStyleLanguage,
  haaiInstrumentation,
  haaiVocalConveyance,
  haaiLyricalInspiration,
  haaiEmotionalTone,
  haaiDeclaredAt,
}: WIDPanelProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(witnessId).then(() => {
      setCopied(true);
      toast.success("Witness ID copied");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleShare() {
    const verifyUrl = `https://www.livingnexus.org/verify/${witnessId}`;
    const text = songTitle
      ? `"${songTitle}" by ${creatorName || "an artist"} is permanently witnessed on @LivingNexus. Witness ID: ${witnessId} — ${verifyUrl}`
      : `Witness ID ${witnessId} is permanently registered on @LivingNexus — ${verifyUrl}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleCopyLink() {
    const verifyUrl = `https://www.livingnexus.org/verify/${witnessId}`;
    navigator.clipboard.writeText(verifyUrl).then(() => {
      toast.success("Verify link copied");
    });
  }

  function handleDownload() {
    const cert = buildCertificate({
      witnessId,
      songTitle,
      creatorName,
      registeredAt,
      haaiVisualConcept,
      haaiStyleLanguage,
      haaiInstrumentation,
      haaiVocalConveyance,
      haaiLyricalInspiration,
      haaiEmotionalTone,
      haaiDeclaredAt,
    });
    const blob = new Blob([cert], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wid-${witnessId.replace(/[^a-zA-Z0-9-]/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Provenance certificate downloaded");
  }

  return (
    <>
      {/* ── Inline Badge (clickable) ─────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono transition-all
          hover:scale-105 active:scale-95 cursor-pointer select-none ${className}`}
        style={{
          background: "oklch(0.65 0.2 300 / 0.12)",
          border: "1px solid oklch(0.65 0.2 300 / 0.35)",
          color: "oklch(0.75 0.18 300)",
        }}
        title="View Witness ID provenance record"
      >
        <Fingerprint className="w-3 h-3 flex-shrink-0" />
        {compact ? (
          <span>{witnessId.slice(0, 14)}…</span>
        ) : (
          <span>WID · {witnessId.slice(0, 18)}…</span>
        )}
      </button>

      {/* ── Full Provenance Modal ────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-lg"
          style={{
            background: "oklch(0.09 0.025 278)",
            border: "1px solid oklch(0.65 0.2 300 / 0.3)",
            color: "oklch(0.92 0.02 85)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="flex items-center gap-2"
              style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.65 0.2 300)" }}
            >
              <Shield className="w-5 h-5" />
              Witness ID Record
            </DialogTitle>
          </DialogHeader>

          {/* Cover art + title */}
          {(coverArtUrl || songTitle) && (
            <div className="flex items-center gap-3 mb-4">
              {coverArtUrl && (
                <img
                  src={coverArtUrl}
                  alt={songTitle || "Cover art"}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  style={{ border: "1px solid oklch(0.65 0.2 300 / 0.2)" }}
                />
              )}
              <div className="min-w-0">
                {songTitle && (
                  <p
                    className="font-semibold text-sm truncate"
                    style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}
                  >
                    {songTitle}
                  </p>
                )}
                {creatorName && (
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.6 0.04 280)" }}>
                    {creatorName}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Provenance record table */}
          <div
            className="rounded-xl p-4 space-y-3 text-xs font-mono"
            style={{ background: "oklch(0.065 0.02 278)", border: "1px solid oklch(0.65 0.2 300 / 0.15)" }}
          >
            {/* WID */}
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "oklch(0.5 0.03 280)" }}>
                Witness ID
              </p>
              <div className="flex items-center gap-2">
                <p className="break-all flex-1" style={{ color: "oklch(0.75 0.18 300)" }}>
                  {witnessId}
                </p>
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 p-1 rounded hover:bg-white/5 transition-colors"
                  title="Copy WID"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.18 145)" }} />
                  ) : (
                    <Copy className="w-3.5 h-3.5" style={{ color: "oklch(0.5 0.03 280)" }} />
                  )}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid oklch(0.65 0.2 300 / 0.1)" }} />

            {/* Registration date */}
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "oklch(0.5 0.03 280)" }}>
                Registered
              </p>
              <p style={{ color: "#E2E8F0" }}>{formatDate(registeredAt)}</p>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid oklch(0.65 0.2 300 / 0.1)" }} />

            {/* Verify URL */}
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "oklch(0.5 0.03 280)" }}>
                Verify
              </p>
              <a
                href={`/verify/${witnessId}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:underline"
                style={{ color: "oklch(0.65 0.2 300)" }}
              >
                livingnexus.org/verify/{witnessId.slice(0, 20)}…
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>

            {/* HAAI Declaration fields — shown when present */}
            {(haaiVisualConcept || haaiStyleLanguage || haaiInstrumentation ||
              haaiVocalConveyance || haaiLyricalInspiration || haaiEmotionalTone) && (
              <>
                <div style={{ borderTop: "1px solid oklch(0.65 0.2 300 / 0.1)" }} />
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "oklch(0.75 0.18 85)" }}>
                    HAAI Authorship Declaration
                  </p>
                  <div className="space-y-1.5 font-sans">
                    {[
                      { label: "Visual Concept",      value: haaiVisualConcept },
                      { label: "Style Language",      value: haaiStyleLanguage },
                      { label: "Instrumentation",     value: haaiInstrumentation },
                      { label: "Vocal Conveyance",    value: haaiVocalConveyance },
                      { label: "Lyrical Inspiration", value: haaiLyricalInspiration },
                      { label: "Emotional Tone",      value: haaiEmotionalTone },
                    ].filter(f => f.value).map(f => (
                      <div key={f.label}>
                        <span className="text-[9px] uppercase tracking-wider" style={{ color: "oklch(0.55 0.04 280)" }}>
                          {f.label}
                        </span>
                        <p className="text-[11px] leading-snug mt-0.5" style={{ color: "oklch(0.82 0.04 280)" }}>
                          {f.value}
                        </p>
                      </div>
                    ))}
                    {haaiDeclaredAt && (
                      <p className="text-[9px] mt-1" style={{ color: "oklch(0.45 0.03 280)" }}>
                        Declaration sealed {formatDate(haaiDeclaredAt)}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 mt-1">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
              style={{
                background: "oklch(0.65 0.18 145 / 0.12)",
                border: "1px solid oklch(0.65 0.18 145 / 0.3)",
                color: "oklch(0.65 0.18 145)",
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              Immutable · Cannot be revoked or transferred
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Share on X/Twitter */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="flex-1"
              style={{
                borderColor: "oklch(0.65 0.2 300 / 0.3)",
                color: "oklch(0.65 0.2 300)",
                background: "transparent",
              }}
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share WID
            </Button>

            {/* Copy verify link */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="flex-1"
              style={{
                borderColor: "oklch(0.65 0.2 300 / 0.3)",
                color: "oklch(0.65 0.2 300)",
                background: "transparent",
              }}
            >
              <Link2 className="w-3.5 h-3.5 mr-1.5" />
              Copy Link
            </Button>

            {/* Download provenance */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-1"
              style={{
                borderColor: "oklch(0.65 0.2 300 / 0.3)",
                color: "oklch(0.65 0.2 300)",
                background: "transparent",
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Provenance
            </Button>

            {certificateUrl && (
              <a href={certificateUrl} target="_blank" rel="noreferrer" className="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  style={{
                    borderColor: "oklch(0.65 0.2 300 / 0.3)",
                    color: "oklch(0.65 0.2 300)",
                    background: "transparent",
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  View Certificate
                </Button>
              </a>
            )}
            {/* Witness Flow — full provenance chain visualization */}
            <Link href={`/witness-flow/${witnessId}`} className="flex-1" onClick={() => setOpen(false)}>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                style={{
                  borderColor: "oklch(0.65 0.18 145 / 0.4)",
                  color: "oklch(0.65 0.18 145)",
                  background: "oklch(0.65 0.18 145 / 0.05)",
                }}
              >
                <GitBranch className="w-3.5 h-3.5 mr-1.5" />
                Witness Flow
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default WIDPanel;
