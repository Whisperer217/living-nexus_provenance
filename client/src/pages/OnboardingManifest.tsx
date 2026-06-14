/**
 * OnboardingManifest — The Living Nexus Creator Onboarding Pipeline
 *
 * 7-step ceremony that converts a reader into a registered, licensed creator.
 *
 * Steps:
 *   1. covenant    — Read and accept the creator covenant
 *   2. identity    — Account is already created (OAuth); confirm identity
 *   3. domain      — Name your creator domain + upload avatar + cover art
 *   4. presence    — Write your origin statement (why you create)
 *   5. testimony   — Leave your first testimony (linked to a WID or standalone)
 *   6. license     — Choose your upload pack (Stripe checkout)
 *   7. first_work  — Upload your first manifestation and receive your first WID
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Shield, User, Globe, BookOpen, MessageSquare, CreditCard, Upload,
  ChevronRight, ChevronLeft, Check, Star, Sparkles, ArrowRight, Loader2,
  Camera, ImageIcon, X
} from "lucide-react";

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "covenant" as const,
    label: "Covenant",
    icon: Shield,
    title: "The Creator Covenant",
    subtitle: "Understand what you're entering",
    color: "#C49A28",
  },
  {
    id: "identity" as const,
    label: "Identity",
    icon: User,
    title: "Your Identity is Confirmed",
    subtitle: "You are now in the archive",
    color: "#7C3AED",
  },
  {
    id: "domain" as const,
    label: "Domain",
    icon: Globe,
    title: "Establish Your Domain",
    subtitle: "Name your creative territory",
    color: "#2563EB",
  },
  {
    id: "presence" as const,
    label: "Presence",
    icon: BookOpen,
    title: "Your Origin Statement",
    subtitle: "Why you create",
    color: "#059669",
  },
  {
    id: "testimony" as const,
    label: "Testimony",
    icon: MessageSquare,
    title: "Leave Your First Testimony",
    subtitle: "A statement that will live in the archive",
    color: "#DC2626",
  },
  {
    id: "license" as const,
    label: "License",
    icon: CreditCard,
    title: "Choose Your Upload Pack",
    subtitle: "Unlock your upload slots",
    color: "#D97706",
  },
  {
    id: "first_work" as const,
    label: "First Work",
    icon: Upload,
    title: "Register Your First Work",
    subtitle: "Receive your first WID",
    color: "#C49A28",
  },
] as const;

type StepId = typeof STEPS[number]["id"];

// ─── Upload helper ────────────────────────────────────────────────────────────

function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const upload = useCallback(async (file: File): Promise<string | null> => {
    if (!file) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.url as string;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading };
}

// ─── Step components ──────────────────────────────────────────────────────────

function CovenantStep({ onAccept }: { onAccept: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setScrolled(true);
  };

  return (
    <div className="space-y-8">

      {/* Founding voices — real creators who entered before you */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className="rounded-xl p-5 space-y-3"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
              style={{ background: "rgba(124,58,237,0.18)", color: "#A78BFA" }}>D</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>Doc Seraph Mercer</p>
              <p className="text-xs opacity-50">Founder · Combat Medic · Architect of the Witness</p>
            </div>
          </div>
          <blockquote className="text-xs leading-relaxed italic border-l-2 pl-3" style={{ borderColor: "rgba(124,58,237,0.4)", color: "var(--ln-smoke)" }}>
            "The platform exists because I recognized a problem the technology industry had not named. Truth enters through witnesses, survives through return, and collapses when systems sever it from its origin. Living Nexus is the system that cannot sever it."
          </blockquote>
          <p className="text-xs opacity-40 font-mono">Entered the archive · January 2026</p>
        </div>

        <div
          className="rounded-xl p-5 space-y-3"
          style={{ background: "rgba(180,83,9,0.06)", border: "1px solid rgba(180,83,9,0.2)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shrink-0"
              style={{ background: "rgba(180,83,9,0.18)", color: "#F59E0B" }}>M</div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ln-parchment)" }}>Mannon The Conquerer</p>
              <p className="text-xs opacity-50">thiiirdgenkill · First Witness · Gospel Warrior</p>
            </div>
          </div>
          <blockquote className="text-xs leading-relaxed italic border-l-2 pl-3" style={{ borderColor: "rgba(180,83,9,0.4)", color: "var(--ln-smoke)" }}>
            "First to catch the missing tip confirmation on the song page — reported it immediately after donating. Every request was precise, practical, and creator-first. He built this platform by using it."
          </blockquote>
          <p className="text-xs opacity-40 font-mono">First Witness · Catalog Pioneer · April 2026</p>
        </div>
      </div>

      {/* Covenant scroll */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest mb-3 opacity-50" style={{ color: "var(--ln-gold)" }}>The Creator Covenant</p>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto rounded-xl text-sm leading-relaxed"
          style={{
            height: "340px",
            background: "rgba(196,154,40,0.03)",
            border: "1px solid rgba(196,154,40,0.15)",
            color: "var(--ln-parchment)",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(196,154,40,0.2) transparent",
          }}
        >
          <div className="p-7 space-y-7">
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Article I — What You Are Entering</p>
              <p className="leading-loose">Living Nexus is not a platform. It is an archive. When you register here, you are not signing up for a service — you are anchoring your creative identity to a permanent, immutable record of origin. The distinction matters: platforms come and go. Archives endure.</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Article II — What the WID Guarantees</p>
              <p className="leading-loose">Every work you register receives a Witness ID (WID) — a cryptographic provenance anchor that records: the work itself, the creator identity, the timestamp, and the context of creation. This record cannot be altered, deleted, or transferred without your explicit action.</p>
              <div className="rounded-lg px-4 py-3 text-xs font-mono" style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.12)", color: "var(--ln-gold)" }}>
                WID-FB13-1FB049D8 · Doc Seraph Mercer · Jan 2026 · Immutable
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Article III — What You Are Responsible For</p>
              <p className="leading-loose">You attest that every work you register is your original creation, or that you have the legal right to register it. You understand that false registration is a violation of the covenant and may result in revocation of your WIDs. The archive is only as sovereign as the truth that enters it.</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Article IV — What Living Nexus Will Never Do</p>
              <p className="leading-loose">Living Nexus will never claim ownership of your work. We will never sell your creative data. We will never remove your WID record without your explicit request. We will never use your testimony to train AI systems without your consent. Your provenance is yours — unconditionally.</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Article V — The Testimony Obligation</p>
              <p className="leading-loose">As a creator in this archive, you are encouraged — not required — to leave testimony. Testimony is a statement about your work, your process, or your creative identity. It becomes part of the permanent record. Future witnesses of your work will read it. Write with intention.</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Article VI — The Living Archive</p>
              <p className="leading-loose">This archive is designed to outlast any single platform. Your WIDs are anchored to a provenance chain that exists independently of Living Nexus as a business. If Living Nexus ceases to operate, your provenance records remain valid and verifiable. The archive is not the company. The archive is the record.</p>
            </div>

            <div className="pt-2 pb-1">
              <p className="text-xs opacity-40 text-center font-mono">— End of Creator Covenant v1.0 · BDDT Publishing / Command Domains LLC —</p>
            </div>
          </div>
        </div>

        {/* Scroll progress indicator */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs opacity-30">Scroll to read the full covenant</p>
          {scrolled && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "#34D399" }}>
              <Check className="w-3 h-3" />
              <span>Covenant read</span>
            </div>
          )}
        </div>
      </div>

      <Button
        onClick={onAccept}
        disabled={!scrolled}
        className="w-full gap-2 font-semibold py-3 text-sm"
        style={{
          background: scrolled ? "rgba(196,154,40,0.15)" : "rgba(196,154,40,0.04)",
          border: `1px solid ${scrolled ? "rgba(196,154,40,0.6)" : "rgba(196,154,40,0.12)"}`,
          color: scrolled ? "var(--ln-gold)" : "rgba(196,154,40,0.3)",
          transition: "all 0.5s ease",
          letterSpacing: scrolled ? "0.06em" : "0",
        }}
      >
        <Shield className="w-4 h-4" />
        I Accept the Creator Covenant
      </Button>
      {!scrolled && (
        <p className="text-center text-xs opacity-30">Read the full covenant above to continue</p>
      )}
    </div>
  );
}

function IdentityStep({ user }: { user: { name?: string | null; email?: string | null; profilePhotoUrl?: string | null } }) {
  return (
    <div className="space-y-6">
      <div
        className="flex items-center gap-4 p-5 rounded-lg"
        style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
      >
        {user.profilePhotoUrl ? (
          <img src={user.profilePhotoUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover" style={{ border: "2px solid rgba(124,58,237,0.4)" }} />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: "rgba(124,58,237,0.2)", color: "#7C3AED" }}>
            {(user.name ?? "?")[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-base" style={{ color: "var(--ln-parchment)" }}>{user.name ?? "Creator"}</p>
          {user.email && <p className="text-sm opacity-60">{user.email}</p>}
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-emerald-400">Identity confirmed</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-sm" style={{ color: "var(--ln-smoke)" }}>
        <div className="flex items-start gap-3">
          <Check className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
          <p>Your account is created and linked to the Living Nexus archive</p>
        </div>
        <div className="flex items-start gap-3">
          <Check className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
          <p>Your creator identity is now anchored — every WID you issue will carry this identity</p>
        </div>
        <div className="flex items-start gap-3">
          <Check className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
          <p>You can change your display name at any time — but your provenance chain will record every name change</p>
        </div>
      </div>
    </div>
  );
}

function DomainStep({
  domainName, setDomainName,
  avatarUrl, setAvatarUrl,
  bannerUrl, setBannerUrl,
}: {
  domainName: string; setDomainName: (v: string) => void;
  avatarUrl: string; setAvatarUrl: (v: string) => void;
  bannerUrl: string; setBannerUrl: (v: string) => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading } = useImageUpload();

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large — Avatar must be under 5MB"); return; }
    const url = await upload(file);
    if (url) setAvatarUrl(url);
    else toast.error("Upload failed — Please try again");
  };

  const handleBannerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large — Banner must be under 10MB"); return; }
    const url = await upload(file);
    if (url) setBannerUrl(url);
    else toast.error("Upload failed — Please try again");
  };

  return (
    <div className="space-y-5">
      {/* Domain name */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Creator Domain Name</label>
        <Input
          value={domainName}
          onChange={e => setDomainName(e.target.value.replace(/[^a-zA-Z0-9_\-. ]/g, ""))}
          placeholder="e.g. thiiirdgenkill, Doc Seraph Mercer"
          maxLength={64}
          className="bg-transparent"
          style={{ border: "1px solid rgba(196,154,40,0.25)", color: "var(--ln-parchment)" }}
        />
        <p className="text-xs opacity-50">This is how you'll appear in the archive. You can change it later.</p>
      </div>

      {/* Avatar */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Profile Avatar</label>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer relative overflow-hidden shrink-0"
            style={{ background: "rgba(196,154,40,0.08)", border: "2px dashed rgba(196,154,40,0.25)" }}
            onClick={() => avatarInputRef.current?.click()}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 opacity-40" style={{ color: "var(--ln-gold)" }} />
            )}
            {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-white" /></div>}
          </div>
          <div className="space-y-1 text-sm opacity-60">
            <p>Click to upload your avatar</p>
            <p className="text-xs">JPG, PNG, WebP — max 5MB</p>
            {avatarUrl && (
              <button onClick={() => setAvatarUrl("")} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                <X className="w-3 h-3" /> Remove
              </button>
            )}
          </div>
        </div>
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
      </div>

      {/* Banner / Cover Art */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Domain Banner / Cover Art</label>
        <div
          className="w-full h-28 rounded-lg flex items-center justify-center cursor-pointer relative overflow-hidden"
          style={{ background: "rgba(196,154,40,0.04)", border: "2px dashed rgba(196,154,40,0.2)" }}
          onClick={() => bannerInputRef.current?.click()}
        >
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 opacity-40">
              <ImageIcon className="w-8 h-8" style={{ color: "var(--ln-gold)" }} />
              <span className="text-xs">Click to upload banner — 16:9 recommended</span>
            </div>
          )}
          {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-white" /></div>}
        </div>
        {bannerUrl && (
          <button onClick={() => setBannerUrl("")} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
            <X className="w-3 h-3" /> Remove banner
          </button>
        )}
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFile} />
      </div>
    </div>
  );
}

function PresenceStep({ originStatement, setOriginStatement }: { originStatement: string; setOriginStatement: (v: string) => void }) {
  const remaining = 1000 - originStatement.length;
  return (
    <div className="space-y-4">
      <div
        className="p-4 rounded-lg text-sm leading-relaxed"
        style={{ background: "rgba(5,150,105,0.06)", border: "1px solid rgba(5,150,105,0.2)", color: "var(--ln-smoke)" }}
      >
        <p className="font-semibold mb-2" style={{ color: "#059669" }}>What is an Origin Statement?</p>
        <p>Your origin statement is a permanent record of <em>why you create</em>. It's not a bio. It's not a marketing pitch. It's a testimony to your creative identity — the reason you make things, in your own words.</p>
        <p className="mt-2 opacity-70">This becomes part of your provenance chain. Future witnesses of your work will see this statement alongside your WIDs.</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Your Origin Statement</label>
        <Textarea
          value={originStatement}
          onChange={e => setOriginStatement(e.target.value.slice(0, 1000))}
          placeholder="I create because... / My work exists to... / The reason I make things is..."
          rows={6}
          className="resize-none bg-transparent"
          style={{ border: "1px solid rgba(196,154,40,0.25)", color: "var(--ln-parchment)" }}
        />
        <p className={`text-xs text-right ${remaining < 100 ? "text-amber-400" : "opacity-40"}`}>{remaining} characters remaining</p>
      </div>
    </div>
  );
}

function TestimonyStep({
  testimonyText, setTestimonyText,
  testimonyWid, setTestimonyWid,
}: {
  testimonyText: string; setTestimonyText: (v: string) => void;
  testimonyWid: string; setTestimonyWid: (v: string) => void;
}) {
  const remaining = 3000 - testimonyText.length;
  return (
    <div className="space-y-5">
      <div
        className="p-4 rounded-lg text-sm leading-relaxed"
        style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)", color: "var(--ln-smoke)" }}
      >
        <p className="font-semibold mb-2" style={{ color: "#DC2626" }}>What is Testimony?</p>
        <p>Testimony is a statement that lives in the archive permanently. It can be about a specific work (linked to a WID), about your creative process, or about something you want the archive to remember.</p>
        <p className="mt-2 opacity-70">Unlike your origin statement, testimony is immutable once submitted. Write with intention.</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Your Testimony</label>
        <Textarea
          value={testimonyText}
          onChange={e => setTestimonyText(e.target.value.slice(0, 3000))}
          placeholder="This work was made during... / I want the archive to know... / The story behind this is..."
          rows={7}
          className="resize-none bg-transparent"
          style={{ border: "1px solid rgba(196,154,40,0.25)", color: "var(--ln-parchment)" }}
        />
        <p className={`text-xs text-right ${remaining < 200 ? "text-amber-400" : "opacity-40"}`}>{remaining} characters remaining</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-widest opacity-60" style={{ color: "var(--ln-gold)" }}>Link to a WID (optional)</label>
        <Input
          value={testimonyWid}
          onChange={e => setTestimonyWid(e.target.value)}
          placeholder="WID-XXXX-XXXX-XXXX"
          className="bg-transparent font-mono text-sm"
          style={{ border: "1px solid rgba(196,154,40,0.2)", color: "var(--ln-parchment)" }}
        />
        <p className="text-xs opacity-40">If this testimony is about a specific work, enter its WID here. Leave blank for a standalone testimony.</p>
      </div>
    </div>
  );
}

function LicenseStep({ onSelectPack }: { onSelectPack: (packId: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [, navigate] = useLocation();

  const packs = [
    {
      id: "founder",
      label: "Founder's Era",
      badge: "MOST POWERFUL",
      slots: "Unlimited",
      price: "$88.88",
      description: "Unlimited upload slots. Founder badge. Earliest provenance anchor. First 10 founders only.",
      color: "#C49A28",
      highlight: true,
    },
    {
      id: "license",
      label: "Creator License",
      badge: "RECOMMENDED",
      slots: "100 slots",
      price: "$88.88",
      description: "100 upload slots. One-time payment. Full WID issuance. No subscription.",
      color: "#7C3AED",
      highlight: false,
    },
    {
      id: "micro_10",
      label: "Micro Pack",
      badge: "START SMALL",
      slots: "10 slots",
      price: "$8.80",
      description: "10 upload slots. Perfect for your first works. Upgrade anytime.",
      color: "#2563EB",
      highlight: false,
    },
  ];

  const handleSelect = (packId: string) => {
    setSelected(packId);
    onSelectPack(packId);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm opacity-60">Choose the pack that fits where you are right now. You can always add more slots later.</p>

      <div className="space-y-3">
        {packs.map(pack => (
          <button
            key={pack.id}
            onClick={() => handleSelect(pack.id)}
            className="w-full text-left p-4 rounded-lg transition-all duration-300"
            style={{
              background: selected === pack.id ? `rgba(${pack.color === "#C49A28" ? "196,154,40" : pack.color === "#7C3AED" ? "124,58,237" : "37,99,235"},0.12)` : "rgba(255,255,255,0.03)",
              border: `1px solid ${selected === pack.id ? pack.color : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm" style={{ color: "var(--ln-parchment)" }}>{pack.label}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-mono" style={{ background: `${pack.color}20`, color: pack.color, border: `1px solid ${pack.color}40` }}>{pack.badge}</span>
                </div>
                <p className="text-xs opacity-60 leading-relaxed">{pack.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-base" style={{ color: pack.color }}>{pack.price}</p>
                <p className="text-xs opacity-50">{pack.slots}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate("/register")}
        className="w-full text-center text-xs opacity-40 hover:opacity-60 transition-opacity py-2"
      >
        View all packs on the full pricing page →
      </button>
    </div>
  );
}

function FirstWorkStep({ onSkip }: { onSkip: () => void }) {
  const [, navigate] = useLocation();
  return (
    <div className="space-y-5">
      <div
        className="p-5 rounded-lg text-center space-y-3"
        style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.2)" }}
      >
        <Sparkles className="w-10 h-10 mx-auto" style={{ color: "var(--ln-gold)" }} />
        <p className="font-semibold text-base" style={{ color: "var(--ln-parchment)" }}>You're ready to register your first work</p>
        <p className="text-sm opacity-60 leading-relaxed">
          Every work you register receives a Witness ID — a permanent, cryptographic provenance anchor. Your first WID is the beginning of your archive.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => navigate("/upload")}
          className="w-full gap-2 font-semibold"
          style={{ background: "rgba(196,154,40,0.15)", border: "1px solid rgba(196,154,40,0.4)", color: "var(--ln-gold)" }}
        >
          <Upload className="w-4 h-4" />
          Upload My First Work
        </Button>

        <button
          onClick={onSkip}
          className="w-full text-center text-xs opacity-40 hover:opacity-60 transition-opacity py-2"
        >
          Skip for now — I'll upload later
        </button>
      </div>

      <div className="space-y-2 text-xs opacity-50">
        <div className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-400" /> Music, lyrics, manuscripts, comics, games — all supported</div>
        <div className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-400" /> WID issued immediately on upload</div>
        <div className="flex items-center gap-2"><Check className="w-3 h-3 text-emerald-400" /> Provenance anchored to your identity</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingManifest() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Step state
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);

  // Form state
  const [domainName, setDomainName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [originStatement, setOriginStatement] = useState("");
  const [testimonyText, setTestimonyText] = useState("");
  const [testimonyWid, setTestimonyWid] = useState("");
  const [selectedPackId, setSelectedPackId] = useState("");

  const currentStep = STEPS[currentStepIdx];
  const progressPct = ((currentStepIdx) / (STEPS.length - 1)) * 100;

  // Load existing progress
  const { data: progress } = trpc.onboarding.getProgress.useQuery(undefined, { enabled: !!user });
  const saveStepMutation = trpc.onboarding.saveStep.useMutation();

  useEffect(() => {
    if (!progress) return;
    const stepIdx = STEPS.findIndex(s => s.id === progress.currentStep);
    if (stepIdx > 0) setCurrentStepIdx(stepIdx);
    if (progress.completedSteps) {
      try {
        const parsed = typeof progress.completedSteps === 'string'
          ? JSON.parse(progress.completedSteps)
          : progress.completedSteps;
        setCompletedSteps(parsed as StepId[]);
      } catch { /* ignore parse errors */ }
    }
  }, [progress]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = getLoginUrl("/onboarding");
    }
  }, [authLoading, user]);

  const markComplete = (stepId: StepId) => {
    setCompletedSteps(prev => prev.includes(stepId) ? prev : [...prev, stepId]);
  };

  const handleNext = async () => {
    const stepId = currentStep.id;
    markComplete(stepId);

    try {
      await saveStepMutation.mutateAsync({
        currentStep: stepId,
        completedSteps: [...completedSteps, stepId],
        domainName: domainName || undefined,
        avatarUrl: avatarUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        originStatement: originStatement || undefined,
        testimonyText: testimonyText || undefined,
        testimonyWid: testimonyWid || undefined,
        firstWorkWid: undefined,
        isComplete: currentStepIdx === STEPS.length - 1,
      });
    } catch (e) {
      // Non-blocking — continue even if save fails
    }

    if (currentStepIdx < STEPS.length - 1) {
      setCurrentStepIdx(i => i + 1);
    } else {
      toast.success("Welcome to the archive — Your creator domain is established.");
      navigate("/dashboard");
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) setCurrentStepIdx(i => i - 1);
  };

  const canAdvance = () => {
    if (currentStep.id === "covenant") return false; // handled by CovenantStep button
    if (currentStep.id === "domain") return domainName.trim().length >= 2;
    if (currentStep.id === "presence") return originStatement.trim().length >= 20;
    if (currentStep.id === "testimony") return testimonyText.trim().length >= 10;
    if (currentStep.id === "license") return selectedPackId.length > 0;
    return true;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ln-void)" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--ln-gold)" }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--ln-void)", fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Observatory background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(196,154,40,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(124,58,237,0.04) 0%, transparent 50%)" }} />
        {/* Witness thread lines */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${10 + i * 12}%`,
              top: 0,
              bottom: 0,
              width: "1px",
              background: `linear-gradient(to bottom, transparent, rgba(196,154,40,${0.02 + i * 0.005}), transparent)`,
              transform: `rotate(${-2 + i * 0.5}deg)`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(196,154,40,0.1)" }}>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
            <Star className="w-4 h-4" style={{ color: "var(--ln-gold)" }} />
            <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--ln-gold)" }}>Living Nexus</span>
          </button>
          <div className="text-xs opacity-40 font-mono">
            Step {currentStepIdx + 1} of {STEPS.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <Progress value={progressPct} className="h-0.5" style={{ background: "rgba(196,154,40,0.1)" }} />
        </div>

        {/* Step nav */}
        <div className="flex items-center gap-1 px-6 pt-4 overflow-x-auto pb-1">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = idx === currentStepIdx;
            return (
              <div
                key={step.id}
                className="flex items-center gap-1 shrink-0"
              >
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all duration-300"
                  style={{
                    background: isCurrent ? `${step.color}18` : "transparent",
                    border: `1px solid ${isCurrent ? step.color : isCompleted ? "rgba(196,154,40,0.3)" : "rgba(255,255,255,0.08)"}`,
                    color: isCurrent ? step.color : isCompleted ? "rgba(196,154,40,0.7)" : "rgba(255,255,255,0.3)",
                  }}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && <div className="w-3 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />}
              </div>
            );
          })}
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-start justify-center px-6 py-8">
          <div className="w-full max-w-2xl">
            {/* Step header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                {(() => { const Icon = currentStep.icon; return <Icon className="w-5 h-5" style={{ color: currentStep.color }} />; })()}
                <span className="text-xs font-mono uppercase tracking-widest opacity-60" style={{ color: currentStep.color }}>
                  {currentStep.label}
                </span>
              </div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--ln-parchment)" }}>{currentStep.title}</h1>
              <p className="text-sm opacity-60">{currentStep.subtitle}</p>
            </div>

            {/* Step body */}
            <div className="mb-8">
              {currentStep.id === "covenant" && (
                <CovenantStep onAccept={handleNext} />
              )}
              {currentStep.id === "identity" && user && (
                <IdentityStep user={user} />
              )}
              {currentStep.id === "domain" && (
                <DomainStep
                  domainName={domainName} setDomainName={setDomainName}
                  avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl}
                  bannerUrl={bannerUrl} setBannerUrl={setBannerUrl}
                />
              )}
              {currentStep.id === "presence" && (
                <PresenceStep originStatement={originStatement} setOriginStatement={setOriginStatement} />
              )}
              {currentStep.id === "testimony" && (
                <TestimonyStep
                  testimonyText={testimonyText} setTestimonyText={setTestimonyText}
                  testimonyWid={testimonyWid} setTestimonyWid={setTestimonyWid}
                />
              )}
              {currentStep.id === "license" && (
                <LicenseStep onSelectPack={setSelectedPackId} />
              )}
              {currentStep.id === "first_work" && (
                <FirstWorkStep onSkip={handleNext} />
              )}
            </div>

            {/* Navigation — not shown for covenant (handled inline) or first_work */}
            {currentStep.id !== "covenant" && currentStep.id !== "first_work" && (
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStepIdx === 0}
                  className="gap-2 opacity-60 hover:opacity-100"
                  style={{ color: "var(--ln-smoke)" }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={!canAdvance() || saveStepMutation.isPending}
                  className="gap-2 font-semibold"
                  style={{
                    background: canAdvance() ? "rgba(196,154,40,0.15)" : "rgba(196,154,40,0.05)",
                    border: `1px solid ${canAdvance() ? "rgba(196,154,40,0.5)" : "rgba(196,154,40,0.15)"}`,
                    color: canAdvance() ? "var(--ln-gold)" : "rgba(196,154,40,0.3)",
                    transition: "all 0.3s ease",
                  }}
                >
                  {saveStepMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : currentStepIdx === STEPS.length - 2 ? (
                    <>Continue <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Continue <ChevronRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            )}

            {/* Skip option for optional steps */}
            {(currentStep.id === "testimony" || currentStep.id === "license") && (
              <button
                onClick={handleNext}
                className="w-full text-center text-xs opacity-30 hover:opacity-50 transition-opacity mt-3 py-1"
              >
                Skip this step for now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
