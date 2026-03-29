/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — VerifyPage
   Public provenance verification for Witness IDs.
   No authentication required — accessible to anyone with a WID.
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ShieldCheck, ShieldX, Search, ExternalLink,
  Music, FileText, Copy, CheckCircle2, Loader2,
  Calendar, Hash, Key, Fingerprint, Tag, History, UserCheck, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663123503966/7kHkqvMBX9Ci3pQfWTqqQr/living-nexus-icon_d108b3b1.png";

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`));
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
    <div className="rounded-xl p-4" style={{ background: "oklch(0.09 0.01 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.04 280)" }} />
        <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "oklch(0.45 0.03 280)" }}>{label}</p>
      </div>
      {children}
    </div>
  );
}

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

  const { data, isLoading, error } = trpc.songs.verifyWid.useQuery(
    { witnessId: queryWid },
    { enabled: !!queryWid, retry: false }
  );

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
  .cert { max-width: 800px; margin: 0 auto; border: 1px solid #D4AF37; padding: 40px; position: relative; }
  .cert::before { content: ''; position: absolute; inset: 6px; border: 1px solid rgba(201,168,76,0.2); pointer-events: none; }
  h1 { font-family: 'Orbitron', monospace; color: #D4AF37; font-size: 22px; letter-spacing: 4px; margin: 0 0 4px; }
  h2 { font-family: 'Orbitron', monospace; color: #6ee7f7; font-size: 13px; letter-spacing: 3px; margin: 0 0 32px; }
  .divider { border: none; border-top: 1px solid #D4AF37; margin: 24px 0; opacity: 0.4; }
  .label { color: #6ee7f7; font-size: 11px; letter-spacing: 2px; margin-bottom: 2px; }
  .value { color: #e2e8f0; font-size: 14px; margin-bottom: 16px; word-break: break-all; }
  .wid { font-family: 'Orbitron', monospace; color: #D4AF37; font-size: 18px; letter-spacing: 3px; }
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
  <div class="value" style="font-size:18px;color:#D4AF37;">${data.title}</div>

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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.08 0.015 280)" }}>

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "oklch(0.15 0.015 280)" }}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
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
              Enter a Witness ID to verify cryptographic provenance of a registered work.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex gap-2 mb-8">
            <Input
              value={inputWid}
              onChange={e => setInputWid(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="WID-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
              className="font-mono text-sm flex-1"
              style={{ background: "oklch(0.12 0.015 280)", borderColor: "oklch(0.22 0.015 280)", color: "oklch(0.88 0.01 280)" }}
            />
            <Button
              onClick={handleSearch}
              disabled={!inputWid.trim() || isLoading}
              style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "oklch(0.84 0.155 85)" }} />
              <p className="text-sm" style={{ color: "oklch(0.48 0.03 280)" }}>Querying provenance ledger…</p>
            </div>
          )}

          {/* Not found */}
          {!isLoading && error && (
            <div className="rounded-2xl p-8 text-center" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.65 0.18 25 / 0.35)" }}>
              <ShieldX className="w-14 h-14 mx-auto mb-4" style={{ color: "oklch(0.65 0.18 25)" }} />
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.65 0.18 25)" }}>
                Not Verified
              </h2>
              <p className="text-sm mb-6" style={{ color: "oklch(0.5 0.03 280)" }}>
                No record found for this Witness ID. The ID may be incorrect or the work was not registered on Living Nexus.
              </p>
              <Button variant="outline" onClick={handleVerifyAnother} style={{ borderColor: "oklch(0.28 0.02 280)", color: "oklch(0.6 0.04 280)" }}>
                Try Another WID
              </Button>
            </div>
          )}

          {/* Verified result */}
          {!isLoading && data && (
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

                {/* Name at time of witnessing — only shown when it differs from current */}
                {data.nameAtWitnessing && data.nameAtWitnessing !== data.artistName && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-xs" style={{ background: "oklch(0.84 0.155 85 / 0.1)", border: "1px solid oklch(0.84 0.155 85 / 0.3)", color: "oklch(0.75 0.12 85)" }}>
                    <UserCheck className="w-3 h-3" />
                    <span>Registered as: <strong>{data.nameAtWitnessing}</strong></span>
                  </div>
                )}

                {/* Audio / Lyrics indicator */}
                <div className="flex items-center justify-center gap-2">
                  {data.isLyricsOnly ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "oklch(0.75 0.18 85 / 0.15)", color: "oklch(0.84 0.155 85)", border: "1px solid oklch(0.75 0.18 85 / 0.4)" }}>
                      <FileText className="w-3.5 h-3.5" /> Lyrics Registration
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: "oklch(0.65 0.2 300 / 0.15)", color: "oklch(0.65 0.2 300)", border: "1px solid oklch(0.65 0.2 300 / 0.4)" }}>
                      <Music className="w-3.5 h-3.5" /> Audio Registration
                    </span>
                  )}
                  {data.genre && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs" style={{ background: "oklch(0.14 0.015 280)", color: "oklch(0.5 0.03 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
                      <Tag className="w-3 h-3" /> {data.genre}
                    </span>
                  )}
                </div>
              </div>

              {/* ── WID ── */}
              <Field icon={Fingerprint} label="Witness ID">
                <TruncatedMono value={data.witnessId ?? ""} label="Witness ID" />
              </Field>

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
                    style={{ background: "oklch(0.84 0.155 85)", color: "oklch(0.08 0.015 280)", fontFamily: "'Cinzel', serif" }}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" /> View Track
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleVerifyAnother}
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
          )}

          {/* Empty state — no query yet */}
          {!isLoading && !error && !data && !queryWid && (
            <div className="text-center py-12 rounded-2xl" style={{ background: "oklch(0.115 0.055 278)", border: "1px solid oklch(0.18 0.015 280)" }}>
              <ShieldCheck className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: "oklch(0.84 0.155 85)" }} />
              <p className="text-sm" style={{ color: "oklch(0.42 0.03 280)" }}>
                Enter a Witness ID above to verify a registered work.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
