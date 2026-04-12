/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — VerifyPage
   Public provenance verification for Witness IDs (WID) and
   Collection Witness IDs (WID-ALB-*).
   No authentication required — accessible to anyone with a WID.
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ShieldCheck, ShieldX, Search, ExternalLink,
  Music, FileText, Copy, CheckCircle2, Loader2,
  Calendar, Hash, Key, Fingerprint, Tag, History, UserCheck, Download,
  Library, Link2, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
}

function ShareVerifyButton({ witnessId, title }: { witnessId: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const handleShare = () => {
    const url = `${window.location.origin}/verify/${encodeURIComponent(witnessId)}`;
    if (navigator.share) {
      navigator.share({ title: `${title} — Living Nexus Provenance`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        toast.success("Verification link copied");
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };
  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-80 active:scale-95"
      style={{ background: "oklch(0.65 0.18 145 / 0.15)", border: "1px solid oklch(0.65 0.18 145 / 0.5)", color: "oklch(0.65 0.18 145)" }}
    >
      {copied ? (
        <><CheckCircle2 className="w-4 h-4" /> Copied!</>
      ) : (
        <><Copy className="w-4 h-4" /> Copy Verification Link</>
      )}
    </button>
  );
}

function TruncatedMono({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-start gap-2 group">
      <p className="text-xs font-mono break-all flex-1 leading-5" style={{ color: "oklch(0.6 0.04 280)" }}>
        {value}
      </p>
      <button
        onClick={() => copyToClipboard(value, label)}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
        title={`Copy ${label}`}
      >
        <Copy className="w-3.5 h-3.5" style={{ color: "oklch(0.5 0.04 280)" }} />
      </button>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid #CBB183" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.04 280)" }} />
        <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.45 0.03 280)" }}>{label}</p>
      </div>
      {children}
    </div>
  );
}

// ─── Collection View ─────────────────────────────────────────────────────────

function CollectionVerifyView({
  collectionWid,
  onVerifyAnother,
}: {
  collectionWid: string;
  onVerifyAnother: () => void;
}) {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = trpc.songs.verifyCollection.useQuery(
    { collectionWid },
    { enabled: !!collectionWid, retry: false }
  );

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "oklch(0.84 0.155 85)" }} />
        <p className="text-sm" style={{ color: "oklch(0.48 0.03 280)" }}>Querying collection provenance ledger…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "oklch(0.125 0.028 52)", border: "1px solid oklch(0.65 0.18 25 / 0.35)" }}>
        <ShieldX className="w-14 h-14 mx-auto mb-4" style={{ color: "oklch(0.65 0.18 25)" }} />
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.65 0.18 25)" }}>
          Collection Not Found
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.5 0.03 280)" }}>
          No collection found for this WID-ALB. The ID may be incorrect or the collection was not registered on Living Nexus.
        </p>
        <Button variant="outline" onClick={onVerifyAnother} style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}>
          Try Another WID
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Verified badge ── */}
      <div className="rounded-2xl p-6 text-center" style={{ background: "oklch(0.84 0.155 85 / 0.06)", border: "2px solid oklch(0.84 0.155 85 / 0.35)" }}>
        {(data as any).coverArtUrl ? (
          <div className="w-28 h-28 rounded-xl mx-auto mb-4 overflow-hidden" style={{ border: "2px solid oklch(0.84 0.155 85 / 0.5)", boxShadow: "0 0 20px oklch(0.84 0.155 85 / 0.15)" }}>
            <img src={(data as any).coverArtUrl} alt={data.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "oklch(0.84 0.155 85 / 0.12)", border: "2px solid oklch(0.84 0.155 85 / 0.4)" }}>
            <Library className="w-10 h-10" style={{ color: "oklch(0.84 0.155 85)" }} />
          </div>
        )}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3" style={{ background: "oklch(0.65 0.18 145 / 0.15)", border: "1px solid oklch(0.65 0.18 145 / 0.5)" }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.65 0.18 145)" }} />
          <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "oklch(0.65 0.18 145)", fontFamily: "'Cinzel', serif" }}>Collection Verified</span>
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.92 0.02 85)" }}>
          {data.name}
        </h2>
        <p className="text-sm mb-1" style={{ color: "oklch(0.55 0.04 280)" }}>by {data.creatorName}</p>
        <p className="text-xs mt-2" style={{ color: "oklch(0.45 0.03 280)" }}>
          {data.trackCount} {data.trackCount === 1 ? "work" : "works"} collectively witnessed
        </p>
      </div>

      {/* ── Collection WID ── */}
      <Field icon={Fingerprint} label="Collection Witness ID (WID-ALB)">
        <TruncatedMono value={data.collectionWid} label="Collection WID" />
      </Field>

      {/* ── Registration date ── */}
      <Field icon={Calendar} label="Registration Date">
        <p className="text-sm font-medium" style={{ color: "oklch(0.78 0.03 280)" }}>
          {new Date(data.createdAt).toLocaleString("en-US", {
            year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit", timeZoneName: "short",
          })}
        </p>
      </Field>

      {/* ── Collective Hash ── */}
      <Field icon={Hash} label="Collective Hash (SHA-256 of all sorted WIDs)">
        <TruncatedMono value={`sha256:${data.collectiveHash}`} label="Collective Hash" />
        <p className="text-[10px] mt-1.5" style={{ color: "oklch(0.38 0.02 280)" }}>
          Computed as SHA-256 of all individual Witness IDs sorted lexicographically and joined by '|'
        </p>
      </Field>

      {/* ── Included tracks ── */}
      <div className="rounded-xl p-4" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid #CBB183" }}>
        <div className="flex items-center gap-1.5 mb-3">
          <Music className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.04 280)" }} />
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.45 0.03 280)" }}>
            Included Works ({data.tracks.length})
          </p>
        </div>
        <div className="space-y-2">
          {data.tracks.map((track: typeof data.tracks[number], i: number) => (
            <div
              key={track.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              style={{ background: "oklch(0.12 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}
            >
              <span className="text-[10px] font-mono w-5 text-right flex-shrink-0" style={{ color: "oklch(0.45 0.03 280)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "oklch(0.82 0.03 280)" }}>{track.title}</p>
                {track.witnessId && (
                  <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: "oklch(0.84 0.155 85 / 0.7)" }}>{track.witnessId}</p>
                )}
              </div>
              {track.witnessId && (
                <button
                  onClick={() => navigate(`/verify/${encodeURIComponent(track.witnessId!)}`)}
                  className="flex-shrink-0 p-1.5 rounded hover:opacity-80 transition-opacity"
                  style={{ background: "oklch(0.84 0.155 85 / 0.1)", border: "1px solid oklch(0.84 0.155 85 / 0.3)" }}
                  title="Verify individual track"
                >
                  <Link2 className="w-3 h-3" style={{ color: "oklch(0.84 0.155 85)" }} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex gap-3">
          {data.pdfUrl && (
            <a
              href={data.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold"
              style={{ background: "oklch(0.84 0.155 85)", color: "#E6CDAE", fontFamily: "'Cinzel', serif" }}
            >
              <Download className="w-4 h-4" /> Download Certificate
            </a>
          )}
          <Button
            variant="outline"
            onClick={onVerifyAnother}
            className={data.pdfUrl ? "" : "flex-1"}
            style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}
          >
            <Search className="w-4 h-4 mr-2" /> Verify Another
          </Button>
        </div>
      </div>

      {/* ── Covenant Declaration ── */}
      <div className="rounded-2xl px-5 py-5" style={{ background: "oklch(0.12 0.04 85 / 0.10)", border: "1px solid oklch(0.75 0.18 85 / 0.15)" }}>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "oklch(0.75 0.18 85 / 0.7)", fontFamily: "'Cinzel', serif" }}>
          Covenant Declaration
        </p>
        <p className="text-[12px] leading-relaxed mb-3" style={{ color: "oklch(0.5 0.03 280)" }}>
          This collection record was sealed by Living Nexus at the moment of batch registration.
          The Collection WID cryptographically binds all included works into a single origin record
          under the Sovereign Shutter™ framework. The collective hash is immutable.
        </p>
        <p className="text-[11px] italic" style={{ color: "oklch(0.4 0.03 280)" }}>
          "He is before all things, and in Him all things hold together." — Colossians 1:17
        </p>
      </div>

      {/* ── Footer note ── */}
      <p className="text-center text-xs pt-2" style={{ color: "oklch(0.35 0.02 280)" }}>
        BDDT Publishing · Command Domains LLC · Living Nexus Witness Registry
      </p>
      <p className="text-center text-[10px] pb-2" style={{ color: "oklch(0.28 0.02 280)" }}>
        Laminin/Logos Doctrine v0.1 · Sovereign Shutter™ Framework
      </p>
    </div>
  );
}

// ─── Individual Track View (existing) ────────────────────────────────────────

function TrackVerifyView({
  queryWid,
  onVerifyAnother,
}: {
  queryWid: string;
  onVerifyAnother: () => void;
}) {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = trpc.songs.verifyWid.useQuery(
    { witnessId: queryWid },
    { enabled: !!queryWid, retry: false }
  );

  // Collection back-reference
  const { data: collectionData } = trpc.songs.getCollectionForSong.useQuery(
    { songId: data?.songId ?? 0 },
    { enabled: !!data?.songId, retry: false }
  );

  // Audio version history (public)
  const { data: audioVersionHistory } = trpc.songs.getAudioVersionsByWid.useQuery(
    { witnessId: queryWid },
    { enabled: !!queryWid && !data?.isLyricsOnly, staleTime: 60_000 }
  );

  const downloadCertificate = () => {
    if (!data) return;
    const year = new Date().getFullYear();
    const regDate = data.registeredAt
      ? new Date(data.registeredAt).toLocaleString("en-US", {
          year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit", timeZoneName: "short",
        })
      : "Unknown";
    const consentColor =
      data.aiConsent === "prohibited" ? "#ef4444" :
      data.aiConsent === "permitted_attribution" ? "#f59e0b" : "#22c55e";
    const consentLabel =
      data.aiConsent === "prohibited" ? "AI Training Prohibited" :
      data.aiConsent === "permitted_attribution" ? "Permitted with Attribution" :
      data.aiConsent === "permitted" ? "Freely Permitted" : "Not Specified";
    const nameChanged = data.nameAtWitnessing && data.nameAtWitnessing !== data.artistName;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Witness ID Certificate — ${data.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
  body { background: #0a0a0a; color: #e2e8f0; font-family: 'Share Tech Mono', monospace; margin: 0; padding: 40px; }
  .cert { max-width: 800px; margin: 0 auto; border: 1px solid #CBB183; padding: 40px; position: relative; }
  .cert::before { content: ''; position: absolute; inset: 6px; border: 1px solid rgba(201,168,76,0.2); pointer-events: none; }
  h1 { font-family: 'Orbitron', monospace; color: #CBB183; font-size: 22px; letter-spacing: 4px; margin: 0 0 4px; }
  h2 { font-family: 'Orbitron', monospace; color: #6ee7f7; font-size: 13px; letter-spacing: 3px; margin: 0 0 32px; }
  .divider { border: none; border-top: 1px solid #CBB183; margin: 24px 0; opacity: 0.4; }
  .label { color: #6ee7f7; font-size: 11px; letter-spacing: 2px; margin-bottom: 2px; }
  .value { color: #e2e8f0; font-size: 14px; margin-bottom: 16px; word-break: break-all; }
  .wid { font-family: 'Orbitron', monospace; color: #CBB183; font-size: 18px; letter-spacing: 3px; }
  .consent { display: inline-block; padding: 6px 16px; border: 1px solid ${consentColor}; color: ${consentColor}; font-family: 'Orbitron', monospace; font-size: 13px; letter-spacing: 2px; margin-bottom: 16px; }
  .sig { font-size: 10px; color: rgba(226,232,240,0.5); word-break: break-all; line-height: 1.6; }
  .provenance-badge { display: inline-block; padding: 4px 12px; border: 1px solid rgba(201,168,76,0.4); color: #c9a84c; font-size: 11px; letter-spacing: 1px; margin-bottom: 8px; }
  .verified-stamp { color: #22c55e; font-family: 'Orbitron', monospace; font-size: 11px; letter-spacing: 2px; }
</style>
</head>
<body>
<div class="cert">
  <h1>WITNESS ID CERTIFICATE</h1>
  <h2>Command Domains LLC / BDDT Publishing — Sovereign Shutter™ Framework</h2>
  <div class="verified-stamp">✓ VERIFIED — Living Nexus Provenance Registry</div>
  <hr class="divider">

  <div class="label">WORK TITLE</div>
  <div class="value" style="font-size:18px;color:#CBB183;">${data.title}</div>

  <div class="label">CREATOR (CURRENT NAME)</div>
  <div class="value">${data.artistName}</div>

  ${nameChanged ? `<div class="label">REGISTERED NAME AT TIME OF WITNESSING</div>
  <div class="provenance-badge">${data.nameAtWitnessing}</div>
  <div class="value" style="font-size:11px;color:rgba(201,168,76,0.6);margin-top:-10px;">Creator's identity at moment of registration. Legally binding for provenance purposes.</div>` : ""}

  ${data.genre ? `<div class="label">GENRE</div><div class="value">${data.genre}</div>` : ""}
  ${data.isrc ? `<div class="label">ISRC</div><div class="value">${data.isrc}</div>` : ""}

  <hr class="divider">

  <div class="label">WITNESS ID</div>
  <div class="value wid">${data.witnessId ?? ""}</div>

  <div class="label">REGISTRATION DATE</div>
  <div class="value">${regDate}</div>

  ${(data.fileHash || data.lyricsHash) ? `<div class="label">${data.isLyricsOnly ? "LYRICS HASH (SHA-256)" : "FILE HASH (SHA-256)"}</div>
  <div class="value sig">sha256:${data.isLyricsOnly ? data.lyricsHash : data.fileHash}</div>` : ""}

  ${data.ecdsaSignature ? `<div class="label">ECDSA P-256 SIGNATURE</div>
  <div class="value sig">${data.ecdsaSignature.slice(0, 80)}...</div>` : ""}

  ${data.ecdsaPublicKey ? `<div class="label">PUBLIC KEY (JWK)</div>
  <div class="value sig">${data.ecdsaPublicKey.slice(0, 80)}...</div>` : ""}

  <hr class="divider">

  <div class="label">AI TRAINING CONSENT</div>
  <div class="consent">${consentLabel}</div>

  <hr class="divider">

  <div class="label">LEGAL NOTICE</div>
  <div style="font-size:11px;color:rgba(226,232,240,0.4);line-height:1.8;">
    This certificate establishes provenance of the above work under the Sovereign Shutter™ framework, Command Domains LLC.
    Unauthorized AI training use is <strong style="color:${consentColor}">${consentLabel}</strong>.<br><br>
    Copyright © ${year} ${data.artistName}. Published under BDDT Publishing. All rights reserved.<br>
    This record was sealed by Living Nexus at the moment of creation. The Witness ID is cryptographically bound to the original file.<br>
    Verified via Living Nexus Provenance Registry — livingnexus.org/verify/${data.witnessId ?? ""}
  </div>
</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `WitnessID-${data.witnessId ?? "certificate"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const aiConsentLabel = (v?: string) => {
    if (v === "prohibited") return { text: "AI Training Prohibited", color: "oklch(0.65 0.18 25)" };
    if (v === "permitted_attribution") return { text: "Permitted with Attribution", color: "oklch(0.84 0.155 85)" };
    if (v === "permitted") return { text: "Freely Permitted", color: "oklch(0.65 0.18 145)" };
    return { text: "Not specified", color: "oklch(0.45 0.03 280)" };
  };

  const consent = aiConsentLabel(data?.aiConsent ?? undefined);

  if (isLoading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "oklch(0.84 0.155 85)" }} />
        <p className="text-sm" style={{ color: "oklch(0.48 0.03 280)" }}>Querying provenance ledger…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "oklch(0.125 0.028 52)", border: "1px solid oklch(0.65 0.18 25 / 0.35)" }}>
        <ShieldX className="w-14 h-14 mx-auto mb-4" style={{ color: "oklch(0.65 0.18 25)" }} />
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.65 0.18 25)" }}>
          Not Verified
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.5 0.03 280)" }}>
          No record found for this Witness ID. The ID may be incorrect or the work was not registered on Living Nexus.
        </p>
        <Button variant="outline" onClick={onVerifyAnother} style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}>
          Try Another WID
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Verified badge ── */}
      <div className="rounded-2xl p-6 text-center" style={{ background: "oklch(0.65 0.18 145 / 0.07)", border: "2px solid oklch(0.65 0.18 145 / 0.4)" }}>
        <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "oklch(0.65 0.18 145 / 0.15)", border: "2px solid oklch(0.65 0.18 145 / 0.5)" }}>
          <ShieldCheck className="w-10 h-10" style={{ color: "oklch(0.65 0.18 145)" }} />
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-3" style={{ background: "oklch(0.65 0.18 145 / 0.15)", border: "1px solid oklch(0.65 0.18 145 / 0.5)" }}>
          <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.65 0.18 145)" }} />
          <span className="text-sm font-bold tracking-widest uppercase" style={{ color: "oklch(0.65 0.18 145)", fontFamily: "'Cinzel', serif" }}>Verified</span>
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.92 0.02 85)" }}>
          {data.title}
        </h2>
        <p className="text-sm mb-1" style={{ color: "oklch(0.55 0.04 280)" }}>by {data.artistName}</p>

        {/* Name at time of witnessing */}
        {data.nameAtWitnessing && data.nameAtWitnessing !== data.artistName && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs" style={{ background: "oklch(0.84 0.155 85 / 0.1)", border: "1px solid oklch(0.84 0.155 85 / 0.3)", color: "oklch(0.75 0.12 85)" }}>
            <UserCheck className="w-3 h-3" />
            <span>Registered as: <strong>{data.nameAtWitnessing}</strong></span>
          </div>
        )}

        {/* Medium-aware WID badge */}
        {(() => {
          const ct = data.contentType ?? (data.isLyricsOnly ? "lyrics" : "audio");
          const mediumMap: Record<string, { label: string; wid: string; desc: string; icon: React.ReactNode; bg: string; color: string; border: string }> = {
            audio:      { label: "Audio Registration",      wid: "WID-MUS", desc: "Cryptographic proof of origin for an audio recording.",           icon: <Music className="w-3.5 h-3.5" />,    bg: "oklch(0.65 0.2 300 / 0.15)",  color: "oklch(0.65 0.2 300)",  border: "oklch(0.65 0.2 300 / 0.4)" },
            lyrics:     { label: "Lyrics Registration",     wid: "WID-LYR", desc: "Standalone lyric sheet — words witnessed before the music.",     icon: <FileText className="w-3.5 h-3.5" />, bg: "oklch(0.75 0.18 85 / 0.15)",   color: "oklch(0.84 0.155 85)",  border: "oklch(0.75 0.18 85 / 0.4)" },
            manuscript: { label: "Manuscript Registration", wid: "WID-MAN", desc: "Novel, screenplay, or written work — sealed at first draft.",    icon: <BookOpen className="w-3.5 h-3.5" />, bg: "oklch(0.65 0.18 145 / 0.15)",  color: "oklch(0.65 0.18 145)",  border: "oklch(0.65 0.18 145 / 0.4)" },
            comic:      { label: "Comic / Graphic Novel",   wid: "WID-CMX", desc: "Sequential art — pages, script, and cover witnessed together.",  icon: <FileText className="w-3.5 h-3.5" />, bg: "oklch(0.65 0.18 25 / 0.15)",   color: "oklch(0.75 0.18 25)",   border: "oklch(0.65 0.18 25 / 0.4)" },
          };
          const m = mediumMap[ct] ?? mediumMap.audio;
          return (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
                  {m.icon} {m.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold" style={{ background: "oklch(0.84 0.155 85 / 0.08)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.84 0.155 85 / 0.25)" }}>
                  {m.wid}
                </span>
                {data.genre && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs" style={{ background: "oklch(0.14 0.015 280)", color: "oklch(0.5 0.03 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
                    <Tag className="w-3 h-3" /> {data.genre}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-center" style={{ color: "oklch(0.45 0.03 280)" }}>{m.desc}</p>
            </div>
          );
        })()}
        {/* ── Share button ── */}
        <div className="mt-4 flex justify-center">
          <ShareVerifyButton witnessId={data.witnessId ?? ""} title={data.title} />
        </div>
      </div>

      {/* ── Collection back-reference ── */}
      {collectionData && (
        <div className="rounded-xl p-4" style={{ background: "oklch(0.84 0.155 85 / 0.05)", border: "1px solid oklch(0.84 0.155 85 / 0.25)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Library className="w-3.5 h-3.5" style={{ color: "oklch(0.84 0.155 85 / 0.7)" }} />
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.65 0.1 85)" }}>Part of Collection</p>
          </div>
          <button
            onClick={() => navigate(`/verify/${encodeURIComponent(collectionData.collectionWid)}`)}
            className="text-left hover:opacity-80 transition-opacity"
          >
            <p className="text-sm font-semibold" style={{ color: "oklch(0.84 0.155 85)" }}>{collectionData.name}</p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "oklch(0.75 0.12 85 / 0.7)" }}>{collectionData.collectionWid}</p>
          </button>
        </div>
      )}

      {/* ── WID ── */}
      <Field icon={Fingerprint} label="Witness ID">
        <TruncatedMono value={data.witnessId ?? ""} label="Witness ID" />
      </Field>

      {/* ── Audio Version History ── */}
      {audioVersionHistory && audioVersionHistory.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid #CBB183" }}>
          <div className="flex items-center gap-1.5 mb-3">
            <History className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.04 280)" }} />
            <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.45 0.03 280)" }}>Audio Version History</p>
            <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "oklch(0.84 0.155 85 / 0.1)", color: "oklch(0.75 0.12 85)" }}>
              {audioVersionHistory.length} archived version{audioVersionHistory.length !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[10px] mb-3" style={{ color: "oklch(0.4 0.03 280)" }}>
            Each version below was superseded by a new upload. All WID-MUS proofs are permanently preserved.
          </p>
          <div className="space-y-2">
            {audioVersionHistory.map((v: any, i: number) => (
              <div key={v.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
                style={{ background: "oklch(0.12 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                  style={{ background: "oklch(0.84 0.155 85 / 0.1)", color: "oklch(0.75 0.12 85)", border: "1px solid oklch(0.84 0.155 85 / 0.25)" }}>
                  v{audioVersionHistory.length - i}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono break-all" style={{ color: "oklch(0.6 0.04 280)" }}>{v.witnessId}</p>
                  {v.versionNote && (
                    <p className="text-xs mt-0.5 font-medium" style={{ color: "oklch(0.78 0.03 280)" }}>{v.versionNote}</p>
                  )}
                  <p className="text-[10px] mt-0.5" style={{ color: "oklch(0.38 0.02 280)" }}>
                    Archived {new Date(v.replacedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lyrics WID (WID-LYR) ── */}
      {(data as any).lyricsWid && (
        <Field icon={BookOpen} label="Lyrics Witness ID (WID-LYR)">
          <div className="space-y-1.5">
            <TruncatedMono value={(data as any).lyricsWid} label="WID-LYR" />
            {(data as any).lyricsFileName && (
              <p className="text-xs" style={{ color: "oklch(0.7 0.04 280)" }}>
                File: {(data as any).lyricsFileName}
                {(data as any).lyricsAddedAt
                  ? ` · ${new Date((data as any).lyricsAddedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
                  : ""}
              </p>
            )}
            <p className="text-[10px]" style={{ color: "oklch(0.45 0.03 280)" }}>
              Separate cryptographic proof for the lyrical content of this work.
            </p>
          </div>
        </Field>
      )}

      {/* ── Registration date ── */}
      <Field icon={Calendar} label="Registration Date">
        <p className="text-sm font-medium" style={{ color: "oklch(0.78 0.03 280)" }}>
          {data.registeredAt
            ? new Date(data.registeredAt).toLocaleString("en-US", {
                year: "numeric", month: "long", day: "numeric",
                hour: "2-digit", minute: "2-digit", timeZoneName: "short",
              })
            : "Unknown"}
        </p>
      </Field>

      {/* ── Hash ── */}
      {(data.fileHash || data.lyricsHash) && (
        <Field icon={Hash} label={data.isLyricsOnly ? "SHA-256 Lyrics Hash" : "SHA-256 File Hash"}>
          <TruncatedMono value={(data.isLyricsOnly ? data.lyricsHash : data.fileHash) ?? ""} label="Hash" />
        </Field>
      )}

      {/* ── ECDSA Signature ── */}
      {data.ecdsaSignature && (
        <Field icon={Key} label="ECDSA P-256 Signature">
          <TruncatedMono value={data.ecdsaSignature} label="ECDSA Signature" />
        </Field>
      )}

      {/* ── ECDSA Public Key ── */}
      {data.ecdsaPublicKey && (
        <Field icon={Key} label="ECDSA Public Key (JWK)">
          <TruncatedMono value={data.ecdsaPublicKey} label="Public Key" />
        </Field>
      )}

      {/* ── AI Consent ── */}
      <Field icon={ShieldCheck} label="AI Training Consent">
        <Badge style={{ background: `${consent.color}22`, color: consent.color, border: `1px solid ${consent.color}55` }}>
          {consent.text}
        </Badge>
      </Field>

      {/* ── ISRC ── */}
      {data.isrc && (
        <Field icon={Tag} label="ISRC">
          <p className="text-sm font-mono" style={{ color: "oklch(0.7 0.04 280)" }}>{data.isrc}</p>
        </Field>
      )}

      {/* ── Name History (Provenance Audit Trail) ── */}
      {data.nameHistory && data.nameHistory.length > 0 && (
        <Field icon={History} label="Creator Name History">
          <div className="space-y-2">
            {data.nameHistory.map((entry: { oldName: string | null; newName: string; changedAt: Date }, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: i === 0 ? "oklch(0.65 0.18 145)" : "oklch(0.35 0.02 280)", marginTop: "5px" }} />
                <div className="flex-1">
                  {entry.oldName ? (
                    <span style={{ color: "oklch(0.6 0.04 280)" }}>
                      <span style={{ color: "oklch(0.45 0.03 280)" }}>{entry.oldName}</span>
                      {" → "}
                      <span style={{ color: "oklch(0.78 0.03 280)", fontWeight: 600 }}>{entry.newName}</span>
                    </span>
                  ) : (
                    <span style={{ color: "oklch(0.78 0.03 280)", fontWeight: 600 }}>Registered as: {entry.newName}</span>
                  )}
                  <span className="ml-2" style={{ color: "oklch(0.38 0.02 280)" }}>
                    {new Date(entry.changedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Field>
      )}

      {/* ── Actions ── */}
      <div className="flex flex-col gap-2 pt-2">
        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={() => navigate(`/songs/${data.songId}`)}
            style={{ background: "oklch(0.84 0.155 85)", color: "#E6CDAE", fontFamily: "'Cinzel', serif" }}
          >
            <ExternalLink className="w-4 h-4 mr-2" /> View Track
          </Button>
          <Button
            variant="outline"
            onClick={onVerifyAnother}
            style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}
          >
            <Search className="w-4 h-4 mr-2" /> Verify Another
          </Button>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={downloadCertificate}
          style={{ borderColor: "oklch(0.84 0.155 85 / 0.4)", color: "oklch(0.75 0.12 85)", fontFamily: "'Cinzel', serif" }}
        >
          <Download className="w-4 h-4 mr-2" /> Download Certificate
        </Button>
      </div>

      {/* ── Covenant Declaration ── */}
      <div className="rounded-2xl px-5 py-5" style={{ background: "oklch(0.12 0.04 85 / 0.10)", border: "1px solid oklch(0.75 0.18 85 / 0.15)" }}>
        <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: "oklch(0.75 0.18 85 / 0.7)", fontFamily: "'Cinzel', serif" }}>
          Covenant Declaration
        </p>
        <p className="text-[12px] leading-relaxed mb-3" style={{ color: "oklch(0.5 0.03 280)" }}>
          This record was sealed by Living Nexus at the moment of creation. The Witness ID is
          cryptographically bound to the original file and cannot be transferred or reassigned.
          The creator owns this proof. The platform hosts it.
        </p>
        <p className="text-[11px] italic" style={{ color: "oklch(0.4 0.03 280)" }}>
          "He is before all things, and in Him all things hold together." — Colossians 1:17
        </p>
      </div>

      {/* ── Footer note ── */}
      <p className="text-center text-xs pt-2" style={{ color: "oklch(0.35 0.02 280)" }}>
        BDDT Publishing · Command Domains LLC · Living Nexus Witness Registry
      </p>
      <p className="text-center text-[10px] pb-2" style={{ color: "oklch(0.28 0.02 280)" }}>
        Laminin/Logos Doctrine v0.1 · Sovereign Shutter™ Framework
      </p>
    </div>
  );
}

// ─── Main VerifyPage ──────────────────────────────────────────────────────────

export default function VerifyPage() {
  const params = useParams<{ witnessId?: string }>();
  const [, navigate] = useLocation();
  const [inputWid, setInputWid] = useState(params.witnessId ?? "");
  const [queryWid, setQueryWid] = useState(params.witnessId ?? "");

  // Sync URL param → input when navigating directly
  useEffect(() => {
    if (params.witnessId) {
      setInputWid(params.witnessId);
      setQueryWid(params.witnessId);
    }
  }, [params.witnessId]);

  const isCollection = queryWid.startsWith("WID-ALB-");

  const handleSearch = () => {
    const trimmed = inputWid.trim();
    if (!trimmed) return;
    setQueryWid(trimmed);
    navigate(`/verify/${encodeURIComponent(trimmed)}`, { replace: true });
  };

  const handleVerifyAnother = () => {
    setInputWid("");
    setQueryWid("");
    navigate("/verify", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#E6CDAE" }}>

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "oklch(0.15 0.015 280)" }}>
        <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <img src={LOGO_URL} alt="Living Nexus" className="w-8 h-8 object-contain" />
          <span className="font-display text-base" style={{ color: "oklch(0.82 0.14 85)", fontFamily: "'Cinzel', serif" }}>Living Nexus</span>
        </button>
        <div className="flex-1" />
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: "oklch(0.45 0.03 280)" }}>Provenance Verification</span>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-xl">

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.92 0.02 85)" }}>
              Verify Witness ID
            </h1>
            <p className="text-sm" style={{ color: "oklch(0.48 0.03 280)" }}>
              Enter a Witness ID (WID-…) or Collection ID (WID-ALB-…) to verify cryptographic provenance.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex gap-2 mb-8">
            <Input
              value={inputWid}
              onChange={e => setInputWid(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="WID-… or WID-ALB-…"
              className="font-mono text-sm flex-1"
              style={{ background: "oklch(0.12 0.015 280)", borderColor: "oklch(0.22 0.015 280)", color: "oklch(0.88 0.01 280)" }}
            />
            <Button
              onClick={handleSearch}
              disabled={!inputWid.trim()}
              style={{ background: "oklch(0.84 0.155 85)", color: "#E6CDAE", fontFamily: "'Cinzel', serif" }}
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* Route to correct view */}
          {queryWid && isCollection && (
            <CollectionVerifyView collectionWid={queryWid} onVerifyAnother={handleVerifyAnother} />
          )}

          {queryWid && !isCollection && (
            <TrackVerifyView queryWid={queryWid} onVerifyAnother={handleVerifyAnother} />
          )}

          {/* Empty state — no query yet */}
          {!queryWid && (
            <div className="text-center py-12 rounded-2xl" style={{ background: "oklch(0.125 0.028 52)", border: "1px solid #CBB183" }}>
              <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: "oklch(0.84 0.155 85)" }} />
              <p className="text-sm" style={{ color: "oklch(0.42 0.03 280)" }}>
                Enter a Witness ID or Collection ID above to verify a registered work.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
