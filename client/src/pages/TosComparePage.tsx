import { useState } from "react";
import { Link } from "wouter";
import {
  ChevronLeft,
  AlertTriangle,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
  BookOpen,
  Scale,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Data ──────────────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    name: "Meta (Facebook / Instagram)",
    wordCount: 14200,
    readingMinutes: 59,
    gradeLevel: "College Graduate",
    fleschScore: 30,
    privacyWordCount: 19000,
    aiTrainingClause: true,
    moralRightsWaiver: true,
    perpetualLicense: true,
    arbitrationClause: true,
    color: "blue",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    clauses: [
      {
        label: "Content License",
        raw: "You grant us a non-exclusive, transferable, sub-licensable, royalty-free, and worldwide license to host, use, distribute, modify, run, copy, publicly perform or display, translate, and create derivative works of your content.",
        plain:
          "They can copy, modify, share, translate, and build on your work — forever, worldwide, for free — and let anyone else do the same.",
        severity: "critical",
      },
      {
        label: "AI Training",
        raw: "We use information we collect, including about your interactions with AI features, to develop and improve our products and services, including AI models.",
        plain:
          "Your posts, photos, and interactions train their AI models. The opt-out exists but is buried in privacy settings and not retroactive.",
        severity: "critical",
      },
      {
        label: "Arbitration",
        raw: "You agree that any claim, cause of action, or dispute you have against us must be resolved exclusively in the U.S. District Court for the Northern District of California or a state court located in San Mateo County.",
        plain:
          "You can't sue them in your local court. You must go to their home court in California — or agree to binding arbitration where you waive your right to a jury trial.",
        severity: "high",
      },
      {
        label: "Termination",
        raw: "We can remove or restrict your access to our Products if we determine that doing so is reasonably necessary to avoid or mitigate adverse legal or regulatory impacts on us.",
        plain:
          "They can delete your account and all your content if it's convenient for them legally — no appeal process required.",
        severity: "high",
      },
    ],
  },
  {
    name: "Spotify",
    wordCount: 8600,
    readingMinutes: 36,
    gradeLevel: "College",
    fleschScore: 42,
    privacyWordCount: 6800,
    aiTrainingClause: false,
    moralRightsWaiver: true,
    perpetualLicense: true,
    arbitrationClause: true,
    color: "green",
    badgeColor: "bg-green-500/20 text-green-300 border-green-500/30",
    clauses: [
      {
        label: "Content License",
        raw: "By posting, uploading or otherwise making available any User Content through the Spotify Service, you grant Spotify a non-exclusive, transferable, sub-licensable, royalty-free, perpetual, irrevocable, fully paid, worldwide license to use, reproduce, make available to the public, publish, translate, modify, create derivative works from, and distribute any of your User Content.",
        plain:
          "Perpetual. Irrevocable. Worldwide. Royalty-free. They can use your content forever, even after you delete your account.",
        severity: "critical",
      },
      {
        label: "Moral Rights Waiver",
        raw: "To the extent permitted by applicable law, you also waive any 'moral rights' or equivalent rights, such as your right to be identified as the author of any User Content.",
        plain:
          "You waive your right to be credited as the creator of your own work.",
        severity: "critical",
      },
      {
        label: "Indemnification",
        raw: "You agree to indemnify, defend, and hold harmless Spotify from and against all claims, losses, expenses, damages, and costs.",
        plain:
          "If someone sues Spotify because of your content, you pay Spotify's legal bills.",
        severity: "high",
      },
    ],
  },
  {
    name: "YouTube (Google)",
    wordCount: 9800,
    readingMinutes: 41,
    gradeLevel: "College",
    fleschScore: 50,
    privacyWordCount: 12000,
    aiTrainingClause: true,
    moralRightsWaiver: false,
    perpetualLicense: true,
    arbitrationClause: false,
    color: "red",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
    clauses: [
      {
        label: "Content License",
        raw: "By providing Content to the Service, you grant to YouTube a worldwide, non-exclusive, royalty-free, sublicensable and transferable license to use that Content (including to reproduce, distribute, prepare derivative works, display and perform it) in connection with the Service and YouTube's (and its successors' and Affiliates') business.",
        plain:
          "YouTube can use your videos to run their business — including advertising — without paying you, and can pass that right to their partners.",
        severity: "critical",
      },
      {
        label: "AI Training",
        raw: "Google uses the information we collect to develop new technologies and services for Google consistent with this Privacy Policy.",
        plain:
          "Your content and behavior data feeds Google's AI research and product development.",
        severity: "high",
      },
      {
        label: "Content Removal",
        raw: "YouTube reserves the right to remove Content if YouTube reasonably believes the Content violates this Agreement or may cause harm to YouTube, our users, or third parties.",
        plain:
          "They can remove your content for any reason they consider reasonable — including protecting their business interests.",
        severity: "medium",
      },
    ],
  },
  {
    name: "SoundCloud",
    wordCount: 7200,
    readingMinutes: 30,
    gradeLevel: "College",
    fleschScore: 45,
    privacyWordCount: 5400,
    aiTrainingClause: false,
    moralRightsWaiver: true,
    perpetualLicense: true,
    arbitrationClause: true,
    color: "orange",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    clauses: [
      {
        label: "Content License",
        raw: "By uploading your Content to the Platform, you grant SoundCloud a non-exclusive, worldwide, royalty-free, sublicensable and transferable license to use, reproduce, distribute, prepare derivative works of, display, and perform the Content in connection with the Platform and SoundCloud's (and its successors' and affiliates') business.",
        plain:
          "Same royalty-free, worldwide, sublicensable license as every other platform. Your music funds their business.",
        severity: "critical",
      },
      {
        label: "Moral Rights Waiver",
        raw: "You hereby waive any and all moral rights you may have in your Content to the fullest extent permitted by applicable law.",
        plain: "You give up the right to be credited as the author of your work.",
        severity: "critical",
      },
      {
        label: "Arbitration",
        raw: "You and SoundCloud agree to resolve any disputes through binding arbitration or small claims court, and you waive the right to participate in a class action lawsuit.",
        plain:
          "No class action lawsuits. No jury. Disputes go to private arbitration — a process that statistically favors corporations.",
        severity: "high",
      },
    ],
  },
  {
    name: "TikTok",
    wordCount: 7459,
    readingMinutes: 31,
    gradeLevel: "College",
    fleschScore: 44,
    privacyWordCount: 10200,
    aiTrainingClause: true,
    moralRightsWaiver: true,
    perpetualLicense: true,
    arbitrationClause: true,
    color: "pink",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/30",
    clauses: [
      {
        label: "Content License",
        raw: "You grant TikTok an unconditional, irrevocable, non-exclusive, royalty-free, fully transferable, perpetual worldwide licence to use, modify, adapt, reproduce, make derivative works of, publish and/or transmit, and/or distribute and to authorise other users of the Services and other third-parties to view, access, use, download, modify, adapt, reproduce, make derivative works of, publish and/or transmit your User Content.",
        plain:
          "Unconditional. Irrevocable. Perpetual. They can give your content to any third party to use however they want.",
        severity: "critical",
      },
      {
        label: "AI / Biometric Data",
        raw: "We may collect biometric identifiers and biometric information as defined under US state biometric privacy laws, such as faceprints and voiceprints, from your User Content.",
        plain:
          "They collect your face and voice biometrics from your videos. This is regulated in some states but not federally.",
        severity: "critical",
      },
      {
        label: "Data Transfer",
        raw: "The personal data we collect about you may be transferred to, stored at, or processed in the United States, Singapore, or other countries.",
        plain:
          "Your data is stored in multiple countries under different legal jurisdictions — some with fewer privacy protections than the US.",
        severity: "high",
      },
    ],
  },
];

const LEXICON = [
  {
    term: "Perpetual License",
    definition:
      "A license with no end date. Even if you delete your account or the platform shuts down, the license you granted continues to exist. There is no expiration.",
    example:
      "Spotify's TOS grants a 'perpetual, irrevocable' license — meaning they can use your content forever, even after you're gone.",
    severity: "critical",
  },
  {
    term: "Irrevocable License",
    definition:
      "A license that cannot be taken back or cancelled. Once granted, you cannot revoke it — even if you delete your content or close your account.",
    example:
      "Most platform licenses are both perpetual AND irrevocable — a combination that permanently transfers use rights to the platform.",
    severity: "critical",
  },
  {
    term: "Sublicensable",
    definition:
      "The platform can pass your license rights to third parties — advertisers, AI companies, partners — without asking you. You granted the right to grant rights.",
    example:
      "Meta's license is sublicensable, meaning they can license your content to their advertising partners or AI training vendors.",
    severity: "critical",
  },
  {
    term: "Royalty-Free",
    definition:
      "The platform uses your work without paying you. 'Free' here means free for them — not free for you to use elsewhere.",
    example:
      "Every major platform uses 'royalty-free' language. Your music, photos, and videos generate revenue for them at zero cost.",
    severity: "high",
  },
  {
    term: "Derivative Works",
    definition:
      "Works created by modifying or building on your original content. By granting a license to create derivative works, you allow the platform to remix, edit, translate, or transform your work.",
    example:
      "YouTube can create derivative works of your videos — including AI-generated remixes or dubbed versions — under their standard license.",
    severity: "high",
  },
  {
    term: "Moral Rights Waiver",
    definition:
      "Moral rights are your rights as a creator to be credited and to object to distortions of your work. A waiver means you give those up. Platforms routinely ask creators to waive moral rights 'to the fullest extent permitted by law.'",
    example:
      "Spotify and SoundCloud both include moral rights waivers — meaning they can use your work without crediting you.",
    severity: "critical",
  },
  {
    term: "Indemnification",
    definition:
      "You agree to pay the platform's legal costs if someone sues them because of your content. Even if you did nothing wrong, you may be on the hook for their defense.",
    example:
      "Most platform TOS include broad indemnification clauses that shift legal liability from the platform to the creator.",
    severity: "high",
  },
  {
    term: "Binding Arbitration",
    definition:
      "Instead of going to court, disputes are resolved by a private arbitrator — usually one the platform has a relationship with. You waive your right to a jury trial and often your right to appeal.",
    example:
      "SoundCloud and Spotify require binding arbitration and prohibit class action lawsuits — making it nearly impossible to challenge them collectively.",
    severity: "high",
  },
  {
    term: "Class Action Waiver",
    definition:
      "You agree not to join or lead a class action lawsuit against the platform. This prevents creators from organizing collectively against platform abuses.",
    example:
      "TikTok's arbitration clause includes a class action waiver — isolating each creator's dispute so the platform never faces collective accountability.",
    severity: "high",
  },
  {
    term: "Worldwide License",
    definition:
      "The license applies in every country on Earth, regardless of where you or your content is located. Your local laws may offer protections — but the license you signed may override them.",
    example:
      "All five platforms in this comparison grant worldwide licenses. Your content has no geographic protection once uploaded.",
    severity: "medium",
  },
  {
    term: "Non-Exclusive License",
    definition:
      "You keep the right to license your work to others, but so does the platform. 'Non-exclusive' sounds creator-friendly — but combined with 'perpetual, irrevocable, sublicensable,' it still grants enormous power to the platform.",
    example:
      "Platforms use 'non-exclusive' to appear fair while still retaining broad, permanent rights to your work.",
    severity: "medium",
  },
  {
    term: "Biometric Data",
    definition:
      "Unique physical identifiers — face geometry, voiceprint, fingerprint. Some platforms collect this from your uploaded content. Regulated in Illinois (BIPA), Texas, and Washington — but not federally.",
    example:
      "TikTok's TOS explicitly mentions collecting faceprints and voiceprints from user content under US state biometric privacy laws.",
    severity: "critical",
  },
];

// ─── Components ────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-300 border-red-500/30",
    high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[severity] ?? map.medium}`}
    >
      {severity.toUpperCase()}
    </span>
  );
}

function ClauseCard({
  clause,
}: {
  clause: (typeof PLATFORMS)[0]["clauses"][0];
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <SeverityBadge severity={clause.severity} />
          <span className="text-[#e8dcc8] text-sm font-medium">
            {clause.label}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#6a5a4a] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#6a5a4a] flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#2a2a2a]">
          <div className="mt-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <EyeOff className="w-3.5 h-3.5 text-[#6a5a4a]" />
              <span className="text-xs text-[#6a5a4a] font-medium uppercase tracking-wide">
                How They Write It
              </span>
            </div>
            <blockquote className="text-xs text-[#7a6a5a] italic leading-relaxed border-l-2 border-[#3a3a3a] pl-3 font-mono">
              "{clause.raw}"
            </blockquote>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs text-amber-400 font-medium uppercase tracking-wide">
                What It Actually Means
              </span>
            </div>
            <p className="text-sm text-[#c8b89a] leading-relaxed">
              {clause.plain}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformCard({ platform }: { platform: (typeof PLATFORMS)[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#2a2a2a] rounded-xl overflow-hidden bg-[#0d0d0d]">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[#e8dcc8] font-semibold text-base">
              {platform.name}
            </h3>
            <p className="text-[#6a5a4a] text-xs mt-0.5">
              TOS + Privacy Policy combined
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${platform.badgeColor}`}
          >
            {platform.gradeLevel}
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#111] rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#e8dcc8]">
              {platform.wordCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#6a5a4a] uppercase tracking-wide mt-0.5">
              Words
            </div>
          </div>
          <div className="bg-[#111] rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#e8dcc8]">
              {platform.readingMinutes}m
            </div>
            <div className="text-[10px] text-[#6a5a4a] uppercase tracking-wide mt-0.5">
              To Read
            </div>
          </div>
          <div className="bg-[#111] rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#e8dcc8]">
              {platform.fleschScore}
            </div>
            <div className="text-[10px] text-[#6a5a4a] uppercase tracking-wide mt-0.5">
              Flesch Score
            </div>
          </div>
        </div>

        {/* Feature flags */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "AI Training Clause", val: platform.aiTrainingClause },
            { label: "Perpetual License", val: platform.perpetualLicense },
            { label: "Moral Rights Waiver", val: platform.moralRightsWaiver },
            { label: "Arbitration Clause", val: platform.arbitrationClause },
          ].map((f) => (
            <div
              key={f.label}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-xs border ${
                f.val
                  ? "bg-red-500/5 border-red-500/20 text-red-300"
                  : "bg-green-500/5 border-green-500/20 text-green-400"
              }`}
            >
              {f.val ? (
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
              ) : (
                <ShieldCheck className="w-3 h-3 flex-shrink-0" />
              )}
              {f.label}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full text-[#8a7a6a] border-[#2a2a2a] bg-transparent hover:bg-[#1a1a1a] text-xs"
          onClick={() => setOpen(!open)}
        >
          {open ? "Hide Clauses" : `Show ${platform.clauses.length} Key Clauses`}
          {open ? (
            <ChevronUp className="w-3.5 h-3.5 ml-1.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
          )}
        </Button>
      </div>

      {open && (
        <div className="px-5 pb-5 space-y-2 border-t border-[#1a1a1a] pt-4">
          {platform.clauses.map((c) => (
            <ClauseCard key={c.label} clause={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function LexiconEntry({ entry }: { entry: (typeof LEXICON)[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#2a2a2a] rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#1a1a1a] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2.5">
          <SeverityBadge severity={entry.severity} />
          <span className="text-[#e8dcc8] text-sm font-semibold">
            {entry.term}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#6a5a4a] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#6a5a4a] flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#2a2a2a] pt-3">
          <p className="text-sm text-[#b0a090] leading-relaxed">
            {entry.definition}
          </p>
          <div className="flex items-start gap-2 p-2.5 rounded bg-[#111] border border-[#2a2a2a]">
            <Info className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#8a7a6a] leading-relaxed italic">
              {entry.example}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function TosComparePage() {
  const [activeTab, setActiveTab] = useState<"platforms" | "lexicon" | "ours">(
    "platforms"
  );

  return (
    <div className="min-h-screen bg-[#080808] text-[#e8dcc8]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] sticky top-0 z-20 bg-[#080808]/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/terms">
            <button className="flex items-center gap-1.5 text-[#6a5a4a] hover:text-[#e8dcc8] transition-colors text-sm">
              <ChevronLeft className="w-4 h-4" />
              Terms
            </button>
          </Link>
          <span className="text-[#3a3a3a]">/</span>
          <span className="text-[#e8dcc8] text-sm font-medium">
            Platform TOS Comparison
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
              Creator Rights
            </Badge>
            <Badge className="bg-[#1a1a1a] text-[#6a5a4a] border-[#2a2a2a] text-xs">
              Platform Accountability
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#e8dcc8] leading-tight mb-4">
            What You Actually Agreed To
          </h1>
          <p className="text-[#8a7a6a] text-base leading-relaxed max-w-2xl">
            Every major platform buries its Terms of Service in legal language
            that requires a college degree to read, takes 30–60 minutes per
            document, and contains clauses that strip creators of fundamental
            rights. This page translates what they wrote into what it means —
            and shows you what a creator-first TOS looks like instead.
          </p>

          {/* Stat bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {[
              { value: "97%", label: "of users never read the TOS" },
              {
                value: "250 hrs",
                label: "to read every contract you've accepted",
              },
              {
                value: "College+",
                label: "reading level required for all major platforms",
              },
              {
                value: "0",
                label: "platforms that define their legal terms in plain English",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 text-center"
              >
                <div className="text-2xl font-bold text-amber-400 mb-1">
                  {s.value}
                </div>
                <div className="text-[10px] text-[#6a5a4a] leading-tight uppercase tracking-wide">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-1">
          {(
            [
              { id: "platforms", label: "Platform Analysis", icon: AlertTriangle },
              { id: "lexicon", label: "Legal Lexicon", icon: BookOpen },
              { id: "ours", label: "Our Approach", icon: ShieldCheck },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-[#6a5a4a] hover:text-[#e8dcc8] hover:bg-[#1a1a1a]"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Platform Analysis Tab */}
        {activeTab === "platforms" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 mb-6">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200/70 leading-relaxed">
                <strong className="text-amber-300">Reading guide:</strong> The
                Flesch Reading Ease Score runs 0–100. Higher = easier. A score
                below 50 requires college-level comprehension. All platforms
                below score under 55. The average adult reads at a 7th–8th grade
                level (score 60–70).
              </p>
            </div>
            {PLATFORMS.map((p) => (
              <PlatformCard key={p.name} platform={p} />
            ))}
            <p className="text-xs text-[#4a4a4a] text-center pt-2">
              Word counts and Flesch scores sourced from Visual Capitalist (2020),
              Social Media Lab at Toronto Metropolitan University (2024), and
              direct TOS review. Clause excerpts are verbatim from current
              platform documents.
            </p>
          </div>
        )}

        {/* Lexicon Tab */}
        {activeTab === "lexicon" && (
          <div className="space-y-3">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#e8dcc8] mb-2">
                Plain-English Legal Lexicon
              </h2>
              <p className="text-[#6a5a4a] text-sm leading-relaxed">
                These are the terms platforms rely on creators not understanding.
                Every definition below appears in at least one of the five
                platform TOS documents analyzed on this page.
              </p>
            </div>
            {LEXICON.map((entry) => (
              <LexiconEntry key={entry.term} entry={entry} />
            ))}
          </div>
        )}

        {/* Our Approach Tab */}
        {activeTab === "ours" && (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-xl font-bold text-[#e8dcc8] mb-2">
                How Living Nexus Writes Its Terms
              </h2>
              <p className="text-[#6a5a4a] text-sm leading-relaxed">
                We don't use the same playbook. Here's what we do differently —
                and where we're honest about what we can't yet guarantee.
              </p>
            </div>

            {[
              {
                icon: ShieldCheck,
                color: "text-green-400",
                bg: "bg-green-500/5 border-green-500/20",
                title: "No Perpetual License",
                body: "We do not claim a perpetual or irrevocable license to your work. Your content is yours. When you delete it, our right to use it ends.",
              },
              {
                icon: ShieldCheck,
                color: "text-green-400",
                bg: "bg-green-500/5 border-green-500/20",
                title: "No Moral Rights Waiver",
                body: "We do not ask you to waive your moral rights. You retain the right to be credited as the creator of your work and to object to distortions of it.",
              },
              {
                icon: ShieldCheck,
                color: "text-green-400",
                bg: "bg-green-500/5 border-green-500/20",
                title: "No AI Training Without Consent",
                body: "Your work will never be used to train, fine-tune, or improve any AI model without your explicit, affirmative consent. The AI Training Consent field is binding — not a suggestion.",
              },
              {
                icon: ShieldCheck,
                color: "text-green-400",
                bg: "bg-green-500/5 border-green-500/20",
                title: "Plain Language, Defined Terms",
                body: "Our TOS is written at a reading level accessible to most adults. Every legal concept we use is defined in plain English — including on this page.",
              },
              {
                icon: Scale,
                color: "text-blue-400",
                bg: "bg-blue-500/5 border-blue-500/20",
                title: "10% Platform Fee — Disclosed at Every Transaction",
                body: "We take a 10% fee on direct creator-to-fan transactions. It is disclosed at every transaction point. There are no hidden fees.",
              },
              {
                icon: AlertTriangle,
                color: "text-amber-400",
                bg: "bg-amber-500/5 border-amber-500/20",
                title: "Current Platform Limitation — We're Being Honest",
                body: "Living Nexus currently operates within a third-party AI infrastructure platform. Until we complete migration to sovereign hosting, the host platform's terms may supersede ours in areas of conflict. We cannot fully confirm our TOS is self-enforcing until that migration is complete. We are telling you this because you deserve to know.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`flex items-start gap-4 p-4 rounded-xl border ${item.bg}`}
              >
                <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <h3 className="text-[#e8dcc8] font-semibold text-sm mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[#8a7a6a] text-sm leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/terms">
                <Button
                  variant="outline"
                  className="border-[#2a2a2a] text-[#8a7a6a] bg-transparent hover:bg-[#1a1a1a] text-sm"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Read Full Terms
                </Button>
              </Link>
              <a
                href="https://www.copyright.gov/registration/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="border-[#2a2a2a] text-[#8a7a6a] bg-transparent hover:bg-[#1a1a1a] text-sm"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Official Copyright Registration
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
