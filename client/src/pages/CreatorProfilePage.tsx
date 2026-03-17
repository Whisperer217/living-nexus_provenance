import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Music, Play, Shield, Twitter, Instagram, Youtube, Globe, DollarSign, ExternalLink, Copy } from "lucide-react";

export default function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const creatorId = parseInt(id || "0");

  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState("");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useState<HTMLAudioElement | null>(null);

  const { data: profile, isLoading } = trpc.profile.getCreator.useQuery(
    { creatorId },
    { enabled: !!creatorId, refetchOnWindowFocus: false }
  );
  const { data: songs } = trpc.songs.bySelf.useQuery(
    undefined,
    { enabled: false } // We'll use a public songs query
  );

  const connectMutation = trpc.tips.connectOnboarding.useMutation({
    onSuccess: (data: { url: string }) => { window.open(data.url, "_blank"); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const tipMutation = trpc.tips.createTipCheckout.useMutation({
    onSuccess: (data: { url: string | null }) => { if (data.url) { window.open(data.url, "_blank"); toast.info("Redirecting to checkout..."); } },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const playMutation = trpc.songs.play.useMutation();

  const isOwn = user?.id === creatorId;

  const handlePlay = (song: any) => {
    if (!song.fileUrl) { toast.error("No audio available"); return; }
    if (playingId === song.id) {
      (audioRef[0] as any)?.pause?.();
      (audioRef as any)[1](null);
      setPlayingId(null);
      return;
    }
    const audio = new Audio(song.fileUrl);
    (audioRef as any)[1](audio);
    audio.play().catch(() => toast.error("Could not play audio"));
    setPlayingId(song.id);
    playMutation.mutate({ songId: song.id });
  };

  const handleTip = () => {
    const cents = Math.round(parseFloat(tipAmount) * 100);
    if (!cents || cents < 100) { toast.error("Minimum tip is $1.00"); return; }
    // We need a songId for the tip — use the first song or show error
    const firstSong = profile?.songs?.[0];
    if (!firstSong) { toast.error("No songs to tip on this profile"); return; }
    tipMutation.mutate({ songId: (firstSong as any).id, amountCents: cents, origin: window.location.origin });
    setTipOpen(false);
  };

  const copyProfileLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Profile link copied!");
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "oklch(0.75 0.18 85)", borderTopColor: "transparent" }} />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.08 0.015 280)" }}>
      <div className="text-center">
        <p style={{ color: "oklch(0.6 0.04 280)" }}>Creator not found.</p>
        <Link href="/"><Button className="mt-4">Back to Discover</Button></Link>
      </div>
    </div>
  );

  const creator = profile.creator;
  const creatorSongs = profile.songs || [];

  return (
    <div className="min-h-screen" style={{ background: "oklch(0.08 0.015 280)" }}>
      {/* Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden" style={{ background: creator.bannerUrl ? undefined : "linear-gradient(135deg, oklch(0.12 0.04 300), oklch(0.10 0.02 260))" }}>
        {creator.bannerUrl && <img src={creator.bannerUrl} alt="Banner" className="w-full h-full object-cover" />}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, oklch(0.08 0.015 280))" }} />
      </div>

      <div className="container relative -mt-16 pb-16">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end mb-8">
          <div className="w-28 h-28 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "oklch(0.14 0.02 280)", border: "3px solid oklch(0.75 0.18 85 / 0.5)" }}>
            {creator.profilePhotoUrl ? (
              <img src={creator.profilePhotoUrl} alt={creator.name || ""} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold" style={{ color: "oklch(0.75 0.18 85)", fontFamily: "'Cinzel', serif" }}>{(creator.artistHandle || creator.name || "?")[0].toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}>
                {creator.artistHandle || creator.name || "Creator"}
              </h1>
              {creator.licenseStatus === "licensed" && (
                <Badge style={{ background: "oklch(0.75 0.18 85 / 0.2)", color: "oklch(0.75 0.18 85)" }}>Licensed</Badge>
              )}
              {creator.stripeAccountStatus === "enabled" && (
                <Badge style={{ background: "oklch(0.55 0.18 145 / 0.2)", color: "oklch(0.65 0.18 145)" }}>Tips Enabled</Badge>
              )}
            </div>
            {creator.bio && <p className="text-sm mb-2 max-w-xl" style={{ color: "oklch(0.65 0.04 280)" }}>{creator.bio}</p>}
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: "oklch(0.55 0.04 280)" }}>
              {creator.website && <a href={creator.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline"><Globe className="w-3 h-3" />{creator.website.replace(/^https?:\/\//, "")}</a>}
              {creator.twitterHandle && <a href={`https://twitter.com/${creator.twitterHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline"><Twitter className="w-3 h-3" />@{creator.twitterHandle}</a>}
              {creator.instagramHandle && <a href={`https://instagram.com/${creator.instagramHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline"><Instagram className="w-3 h-3" />@{creator.instagramHandle}</a>}
              {creator.youtubeHandle && <a href={`https://youtube.com/@${creator.youtubeHandle}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline"><Youtube className="w-3 h-3" />@{creator.youtubeHandle}</a>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={copyProfileLink} style={{ borderColor: "oklch(0.3 0.02 280)", color: "oklch(0.7 0.04 280)" }}>
              <Copy className="w-3 h-3 mr-1" /> Share
            </Button>
            {!isOwn && creator.stripeAccountStatus === "enabled" && (
              <Button size="sm" onClick={() => setTipOpen(true)} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
                <DollarSign className="w-3 h-3 mr-1" /> Tip Artist
              </Button>
            )}
            {isOwn && (
              <Link href="/dashboard">
                <Button size="sm" style={{ background: "oklch(0.65 0.2 300)", color: "white" }}>My Dashboard</Button>
              </Link>
            )}
            {isOwn && !creator.stripeAccountId && (
              <Button size="sm" variant="outline" onClick={() => connectMutation.mutate({ returnUrl: window.location.href })} disabled={connectMutation.isPending} style={{ borderColor: "oklch(0.55 0.18 145 / 0.5)", color: "oklch(0.65 0.18 145)" }}>
                <DollarSign className="w-3 h-3 mr-1" /> Enable Tips
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Songs", value: creatorSongs.length },
            { label: "Total Plays", value: creatorSongs.reduce((a: number, s: any) => a + (s.playCount || 0), 0) },
            { label: "Tips Received", value: creatorSongs.reduce((a: number, s: any) => a + (s.tipCount || 0), 0) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-4 text-center" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
              <p className="text-2xl font-bold" style={{ color: "oklch(0.75 0.18 85)", fontFamily: "'Cinzel', serif" }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.04 280)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Songs Catalog */}
        <div>
          <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
            Music Catalog
          </h2>
          {!creatorSongs.length ? (
            <div className="text-center py-12 rounded-xl" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.2 0.015 280)" }}>
              <Music className="w-10 h-10 mx-auto mb-2 opacity-20" style={{ color: "oklch(0.75 0.18 85)" }} />
              <p className="text-sm" style={{ color: "oklch(0.5 0.03 280)" }}>No songs published yet.</p>
              {isOwn && <Link href="/upload"><Button className="mt-3" size="sm" style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>Upload Your First Track</Button></Link>}
            </div>
          ) : (
            <div className="space-y-2">
              {creatorSongs.map((song: any, idx: number) => (
                <div key={song.id} className="flex items-center gap-4 p-3 rounded-xl group transition-colors hover:bg-white/5" style={{ background: "oklch(0.11 0.015 280)", border: "1px solid oklch(0.18 0.015 280)" }}>
                  <span className="text-xs w-5 text-center" style={{ color: "oklch(0.45 0.03 280)" }}>{idx + 1}</span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: "oklch(0.16 0.02 280)" }}>
                    {song.coverArtUrl ? <img src={song.coverArtUrl} alt={song.title} className="w-full h-full object-cover" /> : <Music className="w-4 h-4 opacity-40" style={{ color: "oklch(0.75 0.18 85)" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/song/${song.id}`}>
                      <p className="font-medium text-sm truncate hover:underline" style={{ color: "oklch(0.9 0.02 85)", fontFamily: "'Cinzel', serif" }}>{song.title}</p>
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      {song.genre && <span className="text-xs" style={{ color: "oklch(0.55 0.04 280)" }}>{song.genre}</span>}
                      {song.witnessId && <Badge className="text-xs px-1 py-0" style={{ background: "oklch(0.65 0.2 300 / 0.2)", color: "oklch(0.65 0.2 300)", fontSize: "9px" }}>WID</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "oklch(0.5 0.03 280)" }}>
                    <span>{song.playCount || 0} plays</span>
                    <span>{song.tipCount || 0} tips</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handlePlay(song)} className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "oklch(0.75 0.18 85)" }}>
                      {playingId === song.id ? <span style={{ color: "oklch(0.08 0.015 280)", fontWeight: 900 }}>■</span> : <Play className="w-3 h-3 fill-current" style={{ color: "oklch(0.08 0.015 280)" }} />}
                    </button>
                    <Link href={`/song/${song.id}`}>
                      <button className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "oklch(0.2 0.02 280)" }}>
                        <ExternalLink className="w-3 h-3" style={{ color: "oklch(0.65 0.2 300)" }} />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tip Modal */}
      <Dialog open={tipOpen} onOpenChange={setTipOpen}>
        <DialogContent style={{ background: "oklch(0.12 0.015 280)", border: "1px solid oklch(0.25 0.02 280)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.9 0.02 85)" }}>
              Tip {creator.artistHandle || creator.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "oklch(0.6 0.04 280)" }}>Support this creator directly. 90% goes to the artist, 10% supports the platform.</p>
            <div className="grid grid-cols-4 gap-2">
              {["1", "5", "10", "25"].map(amt => (
                <button key={amt} onClick={() => setTipAmount(amt)} className="py-2 rounded-lg text-sm font-medium transition-all" style={{ background: tipAmount === amt ? "oklch(0.75 0.18 85)" : "oklch(0.16 0.02 280)", color: tipAmount === amt ? "oklch(0.08 0.015 280)" : "oklch(0.7 0.04 280)", border: "1px solid oklch(0.25 0.02 280)" }}>
                  ${amt}
                </button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Custom amount ($)"
              value={tipAmount}
              onChange={e => setTipAmount(e.target.value)}
              min="0.50"
              step="0.01"
              style={{ background: "oklch(0.14 0.015 280)", border: "1px solid oklch(0.25 0.02 280)", color: "oklch(0.9 0.01 280)" }}
            />
            <Button className="w-full" onClick={handleTip} disabled={tipMutation.isPending} style={{ background: "oklch(0.75 0.18 85)", color: "oklch(0.08 0.015 280)" }}>
              {tipMutation.isPending ? "Processing..." : `Send $${tipAmount || "0"} Tip`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
