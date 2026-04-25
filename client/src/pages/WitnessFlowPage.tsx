/*
═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Witness Flow
   4-step trust-layer visualization:
   Identity → Work → Contribution → Certificate

   Shows the provenance chain for any work registered on the platform.
   Can be reached from:
     - Upload completion ("View your Witness Certificate")
     - Song detail page ("Verify Provenance")
     - Share pages ("Authenticated by Living Nexus")
═══════════════════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Shield, User, Music, GitCommit, Award, Copy, Check, ExternalLink, ChevronRight, Loader2, AlertCircle, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Step definitions ────────────────────────────────────────────
const STEPS = [
  {
    id: 1,
    key: "identity",
    label: "Identity",
    icon: User,
    color: "text-blue-400",
    borderColor: "border-blue-400",
    bgColor: "bg-blue-400/10",
    description: "Creator identity anchored to the platform",
  },
  {
    id: 2,
    key: "work",
    label: "Work",
    icon: Music,
    color: "text-amber-400",
    borderColor: "border-amber-400",
    bgColor: "bg-amber-400/10",
    description: "Content hash and metadata sealed at upload",
  },
  {
    id: 3,
    key: "contribution",
    label: "Contribution",
    icon: GitCommit,
    color: "text-emerald-400",
    borderColor: "border-emerald-400",
    bgColor: "bg-emerald-400/10",
    description: "Play events and interactions linked to the WID",
  },
  {
    id: 4,
    key: "certificate",
    label: "Certificate",
    icon: Award,
    color: "text-purple-400",
    borderColor: "border-purple-400",
    bgColor: "bg-purple-400/10",
    description: "Signed certificate of provenance",
  },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

// ─── Utility ─────────────────────────────────────────────────────
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-2 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

function HashDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1">
        <code className="text-xs font-mono text-emerald-400 bg-zinc-900 px-2 py-1 rounded break-all">
          {value}
        </code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

// ─── Step Panels ─────────────────────────────────────────────────

function IdentityPanel({ song }: { song: any }) {
  // song.artistName and song.artistHandle come from the verifyWid server response
  // song.creatorId is the numeric user id returned by the fixed verifyWid handler
  const displayName = song?.artistName || "Unknown Creator";
  const handle = song?.artistHandle;
  const platformId = song?.creatorId != null
    ? `LN-${String(song.creatorId).padStart(6, "0")}`
    : "LN-??????";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {song?.profilePhotoUrl ? (
          <img
            src={song.profilePhotoUrl}
            alt={displayName}
            className="w-14 h-14 rounded-full border-2 border-blue-400/40 object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-blue-400/10 border-2 border-blue-400/40 flex items-center justify-center">
            <User size={24} className="text-blue-400" />
          </div>
        )}
        <div>
          <p className="font-semibold text-white text-lg">{displayName}</p>
          {handle && (
            <p className="text-sm text-zinc-400">@{handle}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        <div className="bg-zinc-900 rounded-lg p-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Platform ID</p>
          <p className="font-mono text-sm text-blue-300">{platformId}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">AI Disclosure</p>
          <p className="text-sm text-white capitalize">{(song?.aiDisclosure as string | null | undefined)?.replace(/_/g, " ") ?? "Not specified"}</p>
        </div>
      </div>
      <div className="bg-blue-400/5 border border-blue-400/20 rounded-lg p-3 text-xs text-zinc-400">
        <Shield size={12} className="inline mr-1 text-blue-400" />
        Creator identity is anchored to their Living Nexus account. Every work they register is permanently linked to this identity record.
      </div>
    </div>
  );
}

function WorkPanel({ song }: { song: any }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        {song?.coverArtUrl && (
          <img
            src={song.coverArtUrl}
            alt={song.title}
            className="w-16 h-16 rounded-lg object-cover border border-amber-400/30 flex-shrink-0"
          />
        )}
        <div>
          <p className="font-semibold text-white text-lg">{song?.title ?? "Untitled"}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {song?.genre && <Badge variant="outline" className="text-xs border-amber-400/40 text-amber-300">{song.genre}</Badge>}
            {song?.contentType && <Badge variant="outline" className="text-xs border-zinc-600 text-zinc-400 capitalize">{song.contentType}</Badge>}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {song?.fileHash && <HashDisplay label="File Hash (SHA-256)" value={song.fileHash} />}
        {song?.lyricsHash && <HashDisplay label="Lyrics Hash (SHA-256)" value={song.lyricsHash} />}
        {song?.harmonicSignature && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Harmonic Signature</span>
            <code className="text-xs font-mono text-amber-400 bg-zinc-900 px-2 py-1 rounded break-all">
              {song.harmonicSignature}
            </code>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {song?.durationSeconds && (
          <div className="bg-zinc-900 rounded p-2 text-center">
            <p className="text-xs text-zinc-500">Duration</p>
            <p className="text-sm text-white font-mono">{Math.floor(song.durationSeconds / 60)}:{String(song.durationSeconds % 60).padStart(2, "0")}</p>
          </div>
        )}
        {song?.sampleRate && (
          <div className="bg-zinc-900 rounded p-2 text-center">
            <p className="text-xs text-zinc-500">Sample Rate</p>
            <p className="text-sm text-white font-mono">{(song.sampleRate / 1000).toFixed(1)} kHz</p>
          </div>
        )}
        {song?.bpm && (
          <div className="bg-zinc-900 rounded p-2 text-center">
            <p className="text-xs text-zinc-500">BPM</p>
            <p className="text-sm text-white font-mono">{song.bpm}</p>
          </div>
        )}
        {song?.keySignature && (
          <div className="bg-zinc-900 rounded p-2 text-center">
            <p className="text-xs text-zinc-500">Key</p>
            <p className="text-sm text-white font-mono">{song.keySignature}</p>
          </div>
        )}
      </div>

      {/* Credits (Publisher, Author, etc.) */}
      {(() => {
        const rawCredits = song?.creditsJson;
        if (!rawCredits) return null;
        let creds: { role: string; name: string }[] = [];
        try { creds = JSON.parse(rawCredits); } catch { return null; }
        if (creds.length === 0) return null;
        return (
          <div className="bg-zinc-900 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Credits</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {creds.map((c: { role: string; name: string }, i: number) => (
                <div key={i} className="flex items-baseline gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600 flex-shrink-0" style={{ minWidth: "64px" }}>{c.role}</span>
                  <span className="text-sm text-amber-200">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3 text-xs text-zinc-400">
        <Shield size={12} className="inline mr-1 text-amber-400" />
        File hash is computed client-side at upload and sealed into the WID. Any modification to the file would produce a different hash, making tampering detectable.
      </div>
    </div>
  );
}

function ContributionPanel({ song, playStats }: { song: any; playStats: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{playStats?.total ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Qualified Plays</p>
          <p className="text-xs text-zinc-600 mt-0.5">(≥ 30 seconds)</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{playStats?.completions ?? 0}</p>
          <p className="text-xs text-zinc-500 mt-1">Full Listens</p>
          <p className="text-xs text-zinc-600 mt-0.5">(≥ 80% of track)</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {playStats?.avgDuration ? `${Math.floor(playStats.avgDuration / 60)}:${String(playStats.avgDuration % 60).padStart(2, "0")}` : "—"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Avg Listen Time</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 rounded-lg p-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Plays (all)</p>
          <p className="text-lg font-bold text-white">{song?.playCount ?? 0}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Tips Received</p>
          <p className="text-lg font-bold text-white">{song?.tipCount ?? 0}</p>
        </div>
      </div>

      {(playStats?.total ?? 0) === 0 && (song?.playCount ?? 0) > 0 && (
        <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3 text-xs text-zinc-400">
          <span className="text-amber-400 font-semibold">Note:</span> Page visits are counted in "Total Plays" above. Qualified plays (≥ 30 s through the audio player) will appear once listeners engage via the embedded player.
        </div>
      )}
      <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-3 text-xs text-zinc-400">
        <GitCommit size={12} className="inline mr-1 text-emerald-400" />
        Every qualified play is recorded in the <code className="text-emerald-400">playEvents</code> table with the WID of the track at time of play. This creates an immutable interaction log linked to the provenance chain.
      </div>
    </div>
  );
}

function CertificatePanel({ song }: { song: any }) {
  const wid = song?.witnessId;
  const shareUrl = wid ? `${window.location.origin}/verify/${wid}` : null;

  return (
    <div className="space-y-4">
      {wid ? (
        <>
          <div className="bg-gradient-to-br from-purple-900/30 to-zinc-900 border border-purple-400/30 rounded-xl p-5 text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-purple-400/10 border-2 border-purple-400/40 flex items-center justify-center">
                <Award size={28} className="text-purple-400" />
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Witness ID</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-sm font-mono text-purple-300 bg-zinc-900 px-3 py-1.5 rounded-lg border border-purple-400/20">
                  {wid}
                </code>
                <CopyButton value={wid} />
              </div>
            </div>
            {song?.ecdsaPublicKey && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">ECDSA Public Key</p>
                <code className="text-xs font-mono text-zinc-400 break-all">{song.ecdsaPublicKey.slice(0, 40)}…</code>
              </div>
            )}
            {song?.ecdsaSignature && (
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Signature</p>
                <code className="text-xs font-mono text-zinc-400 break-all">{song.ecdsaSignature.slice(0, 40)}…</code>
              </div>
            )}
          </div>

          {shareUrl && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Share / Verify URL</p>
              <div className="flex items-center gap-2 bg-zinc-900 rounded-lg px-3 py-2">
                <code className="text-xs font-mono text-blue-300 flex-1 truncate">{shareUrl}</code>
                <CopyButton value={shareUrl} />
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-amber-400 transition-colors"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {song?.certificateUrl && (
            <a
              href={song.certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-500 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <Award size={16} />
              View Full Certificate
              <ExternalLink size={14} />
            </a>
          )}

          <div className="bg-purple-400/5 border border-purple-400/20 rounded-lg p-3 text-xs text-zinc-400">
            <Shield size={12} className="inline mr-1 text-purple-400" />
            This certificate is cryptographically signed using ECDSA. The WID links the creator identity, file hash, and metadata into a single verifiable record.
          </div>
        </>
      ) : (
        <div className="text-center py-8 space-y-3">
          <AlertCircle size={32} className="mx-auto text-zinc-600" />
          <p className="text-zinc-500 text-sm">No Witness ID has been generated for this work yet.</p>
          <p className="text-zinc-600 text-xs">Upload the work through the Living Nexus platform to generate a WID.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export default function WitnessFlowPage() {
  const [, params] = useRoute("/witness-flow/:witnessId");
  const [, songParams] = useRoute("/witness-flow/song/:songId");
  const [activeStep, setActiveStep] = useState<StepKey>("identity");
  const { user } = useAuth();

  const witnessId = params?.witnessId;
  const songId = songParams?.songId ? parseInt(songParams.songId, 10) : undefined;

  // Fetch song by witnessId or songId
  const { data: songByWid, isLoading: loadingWid } = trpc.songs.verifyWid.useQuery(
    { witnessId: witnessId! },
    { enabled: !!witnessId }
  );

  const { data: songById, isLoading: loadingId } = trpc.songs.getById.useQuery(
    { id: songId! },
    { enabled: !!songId }
  );

  // Normalize songById (nested { song, creator }) to a flat shape matching verifyWid
  const normalizedSongById = songById
    ? {
        ...(songById as any).song,
        artistName: (songById as any).creator?.artistHandle || (songById as any).creator?.name || undefined,
        artistHandle: (songById as any).creator?.artistHandle ?? undefined,
        profilePhotoUrl: (songById as any).creator?.profilePhotoUrl ?? undefined,
        aiDisclosure: (songById as any).creator?.aiDisclosure ?? null,
        creatorId: (songById as any).creator?.id ?? null,
        creatorUserId: (songById as any).song?.userId ?? null,
      }
    : undefined;

  const song = songByWid ?? normalizedSongById;
  const isLoading = loadingWid || loadingId;

  // Owner check: the authenticated user owns this work if their id matches creatorUserId
  const isOwner = !!user && !!song && (
    (song as any).creatorUserId === user.id ||
    (song as any).creatorId === user.id
  );

  // Fetch play audit stats
  const { data: playStats } = trpc.songs.playAuditStats.useQuery(
    { songId: song?.id! },
    { enabled: !!song?.id }
  );

  const activeStepDef = STEPS.find(s => s.key === activeStep)!;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-amber-400 mx-auto" />
          <p className="text-zinc-400 text-sm">Loading provenance chain…</p>
        </div>
      </div>
    );
  }

  if (!song && !isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <AlertCircle size={40} className="mx-auto text-zinc-600" />
          <h2 className="text-white text-xl font-semibold">Work Not Found</h2>
          <p className="text-zinc-400 text-sm">
            No work was found for this Witness ID. It may have been removed or the ID is incorrect.
          </p>
          <Link href="/">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-amber-400" />
            <span className="font-semibold text-sm tracking-wide">Witness Flow</span>
            <span className="text-zinc-600 text-xs hidden sm:block">Provenance Chain</span>
            {!isOwner && (
              <span className="hidden sm:flex items-center gap-1 text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                <Eye size={10} />
                View Only
              </span>
            )}
          </div>
          {song?.witnessId && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500">WID:</span>
              <code className="text-xs font-mono text-amber-400">{song.witnessId.slice(0, 16)}…</code>
              <CopyButton value={song.witnessId} />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Step Navigator */}
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute top-6 left-6 right-6 h-0.5 bg-zinc-800 hidden sm:block" />
          <div className="flex justify-between relative">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = step.key === activeStep;
              const stepIdx = STEPS.findIndex(s => s.key === activeStep);
              const isPast = idx < stepIdx;
              return (
                <button
                  key={step.key}
                  onClick={() => setActiveStep(step.key)}
                  className="flex flex-col items-center gap-2 group flex-1"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 bg-zinc-950 relative z-10",
                      isActive
                        ? `${step.borderColor} ${step.bgColor}`
                        : isPast
                        ? "border-zinc-600 bg-zinc-800"
                        : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                    )}
                  >
                    <Icon
                      size={20}
                      className={cn(
                        "transition-colors",
                        isActive ? step.color : isPast ? "text-zinc-400" : "text-zinc-600 group-hover:text-zinc-400"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors hidden sm:block",
                      isActive ? "text-white" : isPast ? "text-zinc-400" : "text-zinc-600"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Step Panel */}
        <div
          className={cn(
            "rounded-xl border p-6 transition-all duration-200",
            activeStepDef.borderColor.replace("border-", "border-") + "/30",
            "bg-zinc-900/50"
          )}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", activeStepDef.bgColor)}>
              <activeStepDef.icon size={20} className={activeStepDef.color} />
            </div>
            <div>
              <h2 className="font-semibold text-white text-lg">
                Step {activeStepDef.id}: {activeStepDef.label}
              </h2>
              <p className="text-xs text-zinc-500">{activeStepDef.description}</p>
            </div>
          </div>

          {activeStep === "identity" && <IdentityPanel song={song} />}
          {activeStep === "work" && <WorkPanel song={song} />}
          {activeStep === "contribution" && <ContributionPanel song={song} playStats={playStats} />}
          {activeStep === "certificate" && <CertificatePanel song={song} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400 hover:text-white"
            onClick={() => {
              const idx = STEPS.findIndex(s => s.key === activeStep);
              if (idx > 0) setActiveStep(STEPS[idx - 1].key);
            }}
            disabled={activeStep === "identity"}
          >
            Previous
          </Button>

          <div className="flex gap-1.5">
            {STEPS.map(step => (
              <button
                key={step.key}
                onClick={() => setActiveStep(step.key)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step.key === activeStep ? "bg-amber-400 w-4" : "bg-zinc-700 hover:bg-zinc-500"
                )}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-400 hover:text-white"
            onClick={() => {
              const idx = STEPS.findIndex(s => s.key === activeStep);
              if (idx < STEPS.length - 1) setActiveStep(STEPS[idx + 1].key);
            }}
            disabled={activeStep === "certificate"}
          >
            Next
            <ChevronRight size={14} className="ml-1" />
          </Button>
        </div>

        {/* Back link */}
        {song?.id && (
          <div className="text-center">
            <Link href={`/song/${song.id}`}>
              <span className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
                ← Back to work
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
