import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Heart, Users, Calendar, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function formatCents(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Video Hero ────────────────────────────────────────────────────────────────

function VideoHero({ videoUrl, videoType, bannerUrl, title }: {
  videoUrl: string | null;
  videoType: string | null;
  bannerUrl: string | null;
  title: string;
}) {
  if (videoUrl && videoType === "youtube") {
    const id = getYouTubeId(videoUrl);
    if (id) return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }
  if (videoUrl && videoType === "vimeo") {
    const id = getVimeoId(videoUrl);
    if (id) return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
        <iframe
          src={`https://player.vimeo.com/video/${id}?color=d4a017&title=0&byline=0&portrait=0`}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }
  if (videoUrl && videoType === "s3") {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-black">
        <video src={videoUrl} controls className="w-full h-full object-contain" />
      </div>
    );
  }
  // Fallback: banner image
  if (bannerUrl) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
        <img src={bannerUrl} alt={title} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#1a1025] to-[#0a0812] flex items-center justify-center">
      <span className="text-white/20 text-6xl font-bold">{title[0]}</span>
    </div>
  );
}

// ── Donate Dialog ─────────────────────────────────────────────────────────────

function DonateDialog({ project, open, onClose }: {
  project: { id: number; title: string; slug: string };
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("10");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const presets = [5, 10, 25, 50, 100];

  const donate = trpc.projects.donate.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Redirecting to checkout — opening Stripe in a new tab.");
        window.open(data.url, "_blank");
        onClose();
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSubmit = () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents < 100) {
      toast.error("Minimum donation is $1");
      return;
    }
    donate.mutate({
      projectId: project.id,
      amountCents: cents,
      message: message || undefined,
      anonymous,
      origin: window.location.origin,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#0d0d1a] border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Support this project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-white/70 text-sm mb-2 block">Choose an amount</Label>
            <div className="flex gap-2 flex-wrap mb-3">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    amount === String(p)
                      ? "bg-[#d4a017] text-black border-[#d4a017]"
                      : "bg-white/5 text-white/70 border-white/10 hover:border-[#d4a017]/50"
                  }`}
                >
                  ${p}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
              <Input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 bg-white/5 border-white/10 text-white"
                placeholder="Custom amount"
              />
            </div>
          </div>

          <div>
            <Label className="text-white/70 text-sm mb-2 block">Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Leave a note for the creator…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="anon"
              checked={anonymous}
              onCheckedChange={(v) => setAnonymous(!!v)}
              className="border-white/20"
            />
            <Label htmlFor="anon" className="text-white/60 text-sm cursor-pointer">
              Donate anonymously
            </Label>
          </div>

          <p className="text-white/30 text-xs">
            10% platform fee applies. Stripe processes payment securely.
          </p>

          <Button
            onClick={handleSubmit}
            disabled={donate.isPending}
            className="w-full bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold"
          >
            {donate.isPending ? "Processing…" : `Support with $${amount || "0"}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const [donateOpen, setDonateOpen] = useState(false);
  const [updatesExpanded, setUpdatesExpanded] = useState(false);

  const { data, isLoading, error } = trpc.projects.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  // Check for donation success
  const urlParams = new URLSearchParams(window.location.search);
  const donationSuccess = urlParams.get("donation") === "success";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080d14] flex items-center justify-center">
        <div className="animate-pulse text-white/40">Loading project…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#080d14] flex flex-col items-center justify-center gap-4">
        <p className="text-white/60">Project not found.</p>
        <Link href="/"><Button variant="outline" className="border-white/20 text-white">Go Home</Button></Link>
      </div>
    );
  }

  const { project, updates, donations } = data;
  const pct = project.goalAmountCents
    ? Math.min(100, Math.round((project.raisedAmountCents / project.goalAmountCents) * 100))
    : null;

  const visibleDonors = donations.filter((d) => !d.anonymous).slice(0, 8);
  const displayedUpdates = updatesExpanded ? updates : updates.slice(0, 2);

  return (
    <div className="min-h-screen bg-[#080d14] text-white">
      {/* ── Banner ── */}
      {project.bannerUrl && (
        <div className="relative w-full h-56 md:h-80 overflow-hidden">
          <img src={project.bannerUrl} alt={project.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080d14]/40 to-[#080d14]" />
          {/* Funding badge */}
          <div className="absolute top-4 right-4">
            <Badge className="bg-[#d4a017]/90 text-black font-bold px-3 py-1 text-sm">
              Funding
            </Badge>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Donation success toast ── */}
        {donationSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-green-900/30 border border-green-500/30 text-green-300 text-sm">
            Thank you for your support! Your donation has been received.
          </div>
        )}

        {/* ── Hero grid: video + project info ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-10">
          {/* Video / cinematic panel */}
          <div className="lg:col-span-3 space-y-4">
            <VideoHero
              videoUrl={project.videoUrl}
              videoType={project.videoType}
              bannerUrl={project.bannerUrl}
              title={project.title}
            />
            {/* Quick donate under video (matches sketch) */}
            {project.status === "active" && (
              <Button
                onClick={() => setDonateOpen(true)}
                className="w-full bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold py-3 text-base"
              >
                <Heart className="w-4 h-4 mr-2" />
                Donate
              </Button>
            )}
          </div>

          {/* Project info panel */}
          <div className="lg:col-span-2 space-y-5">
            {/* Creator bubble */}
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-[#d4a017]/40">
                <AvatarImage src={project.creatorAvatar ?? undefined} />
                <AvatarFallback className="bg-[#1a1025] text-[#d4a017] text-sm font-bold">
                  {(project.creatorHandle || project.creatorName || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium text-sm leading-tight">
                  {project.creatorHandle || project.creatorName || "Creator"}
                </p>
                <Link href={`/creator/${project.userId}`}>
                  <span className="text-[#d4a017]/70 text-xs hover:text-[#d4a017] transition-colors cursor-pointer">
                    View profile →
                  </span>
                </Link>
              </div>
            </div>

            {/* Title + tagline */}
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight mb-1">{project.title}</h1>
              {project.tagline && (
                <p className="text-white/60 text-sm leading-relaxed">{project.tagline}</p>
              )}
            </div>

            {/* WID pill */}
            {project.linkedWitnessId && (
              <Link href={`/verify/${project.linkedWitnessId}`}>
                <Badge
                  variant="outline"
                  className="border-[#d4a017]/40 text-[#d4a017]/80 text-xs cursor-pointer hover:border-[#d4a017] transition-colors"
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  WID: {project.linkedWitnessId.slice(0, 12)}…
                </Badge>
              </Link>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[#d4a017] font-bold text-lg">{formatCents(project.raisedAmountCents)}</p>
                <p className="text-white/40 text-xs">raised</p>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <p className="text-[#d4a017] font-bold text-lg">{project.donorCount}</p>
                <p className="text-white/40 text-xs">supporters</p>
              </div>
            </div>

            {/* Goal bar */}
            {pct !== null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-white/50">
                  <span>{pct}% funded</span>
                  <span>Goal: {formatCents(project.goalAmountCents!)}</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#d4a017] to-[#f0c040] rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status badge */}
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Calendar className="w-3 h-3" />
              <span>Started {formatDate(project.createdAt)}</span>
              <Badge
                variant="outline"
                className={`ml-auto text-xs ${
                  project.status === "active"
                    ? "border-green-500/40 text-green-400"
                    : project.status === "completed"
                    ? "border-blue-500/40 text-blue-400"
                    : "border-white/20 text-white/40"
                }`}
              >
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </Badge>
            </div>
          </div>
        </div>

        {/* ── Description (rich text body) ── */}
        {project.description && (
          <Card className="bg-white/[0.03] border-white/10 mb-8">
            <CardContent className="p-6">
              <h2 className="text-white font-semibold text-lg mb-4">About this project</h2>
              <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                {project.description}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Progress updates ── */}
        {updates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              Progress Updates
              <Badge variant="outline" className="border-white/20 text-white/50 text-xs">
                {updates.length}
              </Badge>
            </h2>
            <div className="space-y-4">
              {displayedUpdates.map((u) => (
                <Card key={u.id} className="bg-white/[0.03] border-white/10">
                  <CardContent className="p-5">
                    {u.title && <h3 className="text-white font-medium mb-2">{u.title}</h3>}
                    <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{u.body}</p>
                    {u.imageUrl && (
                      <img
                        src={u.imageUrl}
                        alt="Update image"
                        className="mt-3 rounded-lg max-h-64 object-cover w-full"
                      />
                    )}
                    <p className="text-white/30 text-xs mt-3">{formatDate(u.createdAt)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {updates.length > 2 && (
              <button
                onClick={() => setUpdatesExpanded(!updatesExpanded)}
                className="mt-3 flex items-center gap-1 text-[#d4a017]/70 hover:text-[#d4a017] text-sm transition-colors"
              >
                {updatesExpanded ? (
                  <><ChevronUp className="w-4 h-4" /> Show less</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Show {updates.length - 2} more updates</>
                )}
              </button>
            )}
          </div>
        )}

        {/* ── Supporters wall ── */}
        {visibleDonors.length > 0 && (
          <div className="mb-8">
            <h2 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#d4a017]" />
              Supporters
            </h2>
            <div className="flex flex-wrap gap-2">
              {visibleDonors.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 text-sm"
                >
                  <span className="text-white/70">{d.donorName || "Supporter"}</span>
                  <span className="text-[#d4a017]/70 text-xs">{formatCents(d.amountCents)}</span>
                </div>
              ))}
              {donations.length > 8 && (
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 text-sm text-white/40">
                  +{donations.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom donate CTA ── */}
        {project.status === "active" && (
          <div className="sticky bottom-6 flex justify-center">
            <div className="bg-[#0d0d1a]/95 backdrop-blur border border-white/10 rounded-2xl p-4 flex items-center gap-6 shadow-2xl">
              <div className="text-center">
                <p className="text-[#d4a017] font-bold text-lg leading-none">
                  {formatCents(project.raisedAmountCents)}
                </p>
                {project.goalAmountCents && (
                  <p className="text-white/40 text-xs">
                    of {formatCents(project.goalAmountCents)} goal
                  </p>
                )}
              </div>
              {pct !== null && (
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#d4a017] to-[#f0c040] rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              <Button
                onClick={() => setDonateOpen(true)}
                className="bg-[#d4a017] hover:bg-[#b8891a] text-black font-bold px-6"
              >
                Donate
              </Button>
            </div>
          </div>
        )}
      </div>

      <DonateDialog
        project={{ id: project.id, title: project.title, slug: project.slug }}
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
      />
    </div>
  );
}
