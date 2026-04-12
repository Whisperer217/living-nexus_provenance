import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Shield, Upload, Music, Video, DollarSign, Users, BookOpen,
  ChevronRight, Maximize2, MessageCircle, Zap, Download, CreditCard,
  Eye, Globe, FileText, Network, Scroll, Film, Gift, Link2,
  Radio, ArrowUpFromLine, Library, FileArchive, Rocket, ImagePlus, Compass,
  Bell, LayoutGrid, ImageIcon, Sun, Moon, Sparkles, TrendingUp, Pin, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const CURRENT_VERSION = "v2.27.0";
const STORAGE_KEY = `living-nexus-whats-new-seen-${CURRENT_VERSION}`;

const UPDATES = [
  {
    version: "v2.27.0",
    date: "April 2026",
    label: "Latest",
    items: [
      { icon: FileText, text: "HAAI Work-Type Declarations — The Human-Authored via AI Instrument disclosure form now speaks your language. When uploading audio, the form uses music-native terms: Instrumentation, Vocal Conveyance, Lyrical Inspiration. When uploading a manuscript, it shifts to Structural Concept, Narrative Voice, Thematic Elements, Core Subject / Thesis. Lyrics use Imagery & Metaphor, Rhythmic Mechanics, and Intended Delivery. Comics use Composition & Framing, Color Palette & Lighting, and Atmosphere & Mood. The doctrine is the same — the vocabulary is yours." },
      { icon: Shield, text: "Auto-Advance Queue — Tap any track in Quick Access or a Work Carousel and the full list becomes your queue. Songs advance automatically when one ends — no button press needed. Lock screen and notification shade controls on mobile now skip forward and back within the queue." },
      { icon: Music, text: "Mobile Scroll Seal — The black void that appeared behind the app when rubber-band scrolling on iOS Safari while the player or Quick Access panel was active is now fully sealed. Panels contain their own scroll. The background never moves." },
    ],
  },
  {
    version: "v2.26.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Shield, text: "Prompt Studio Identity Lock — The Provenance Prompt Generator is now fully profile-centric. Only you can open your own studio. Prompts are private by default — a share link is only created when you explicitly click Share. Copying a shared prompt now automatically appends a provenance watermark (creator name, EID, date, source) so authorship travels with the content." },
      { icon: Music, text: "Custom Track Order — You can now drag and reorder your tracks in the Archive. The grip handle on each row lets you arrange your catalogue exactly as you intend it to be heard. Your custom order is respected everywhere your music appears: your creator profile, the Explore page, and the Home feed." },
      { icon: Link2, text: "Project Link Fix — Featured Project cards on the Home page and activity feed entries now correctly navigate to the project page. Old shared links using the previous URL format are automatically redirected to the correct destination." },
    ],
  },
  {
    version: "v2.25.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: TrendingUp, text: "New This Week — A fourth Explore filter now surfaces tracks published in the last 7 days, sorted by newest. Discover what the community just released before it trends." },
      { icon: Sparkles, text: "New Voices — The Home page now features a New Voices carousel showing creators who joined in the last 14 days. Fresh talent, front and center — never buried under established names." },
      { icon: Star, text: "Song Credits — Upload and edit pages now include a Credits section. Add producers, engineers, co-writers, and featured artists by role and name. Credits appear on every song detail page, giving collaborators the recognition they deserve." },
      { icon: Pin, text: "Pinned Creators — Admins can now pin any creator to the top of the Featured Creators carousel from the User Roster in LN Command. Pinned creators float above the track-count sort order, giving you a spotlight slot for emerging voices." },
    ],
  },
  {
    version: "v2.24.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Sun, text: "Lights On — Steel Overlay Mode is now available in Profile → Settings. The dark charcoal base palette stays fully active — Lights On lays a translucent steel-blue tint over the navigation bar and sidebar only, with a subtle body brightness reduction. Your music and content remain in full contrast. Toggle in Profile → Settings; preference is remembered across sessions with zero flash on load." },
      { icon: Sparkles, text: "Steel Tint Architecture — Unlike a full theme swap, Lights On applies a single backdrop-filtered overlay to nav surfaces only. No color tokens are overridden. Headings, titles, and body text remain on the dark base palette — only the chrome dims. Cathedral gold accents are fully preserved." },
      { icon: LayoutGrid, text: "Projects Promoted — Creator Projects now lead on both the home page (above Featured Songs) and on creator profile pages (above the song list). Projects are the first thing visitors see, giving campaigns maximum discovery surface." },
    ],
  },
  {
    version: "v2.23.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Sun, text: "Lights On — A new global display mode lives in your Profile → Settings. Toggle between Lantern Mode (the classic charred-oak dark palette) and Espresso Crème (a warm steamed-cream palette with roasted caramel accents). The switch applies instantly across the entire platform for every visitor." },
      { icon: Sparkles, text: "Instant Palette Fade — Switching modes now animates smoothly over 0.4 seconds instead of snapping. Background, text, and accent colors all cross-fade together for a polished, intentional feel." },
      { icon: Moon, text: "Flash-Free Load — Your last-chosen mode is remembered in the browser. On your next visit the correct palette is applied before the first pixel paints, so there is never a flash of the wrong theme." },
    ],
  },
  {
    version: "v2.22.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Bell, text: "Follow Projects — You can now follow any creator campaign without donating. Hit the Follow button on any project page to subscribe to updates. You’ll receive an in-app notification every time the creator posts a progress update, keeping you in the loop from day one." },
      { icon: LayoutGrid, text: "Featured Projects on Explore — The Explore page now surfaces active creator campaigns in a dedicated Featured Projects grid. Discover what the community is building, track funding progress, and follow projects you care about — all from the same page where you find new music." },
      { icon: ImageIcon, text: "Update Image Uploads — Creators can now attach a photo to each progress update. The Post Update dialog includes an image picker that uploads directly to the CDN and embeds the image in the update, making campaigns feel more alive." },
    ],
  },
  {
    version: "v2.21.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Rocket, text: "Creator Projects — You can now launch a crowdfunding campaign directly on Living Nexus. Build a project page with a cinematic banner, rich content blocks (text, images, quotes, video), and a Stripe-powered Support button. Set a funding goal and watch the progress bar fill. When you publish, a WID is generated — your project is provenance-sealed from day one. Go to My Projects in your account menu to get started." },
      { icon: ImagePlus, text: "Project Banner Upload — Drag and drop a cover image directly onto your project hero area to make your campaign page stand out. Supports JPG, PNG, and WebP up to 10 MB." },
      { icon: Compass, text: "Projects Discovery — A new /projects page lets anyone browse all active creator campaigns. Find projects to support, filter by status, and discover what the Living Nexus community is building next." },
    ],
  },
  {
    version: "v2.20.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Shield, text: "HAAI Disclosure — A fourth authorship label is now available: Human-Authored via AI Instrument. When you select it during upload, a structured declaration form captures your visual concept, style language, instrumentation, vocal conveyance, lyrical inspiration, and emotional tone. The intent is on record. The authorship is yours." },
      { icon: FileText, text: "Terms of Service v2.1 — A new Platform Infrastructure section now discloses honestly that Living Nexus currently operates within third-party hosting infrastructure. Until sovereign migration is complete, the host platform's terms may govern. You deserve to know the constraint before you accept the covenant." },
      { icon: BookOpen, text: "Platform TOS Comparison — A new page at /terms/compare shows side-by-side how major platforms (Meta, Spotify, YouTube, SoundCloud, TikTok) write their terms vs. what those terms actually mean. Includes a 12-term plain-English lexicon covering perpetual licenses, moral rights waivers, arbitration clauses, and more." },
    ],
  },
  {
    version: "v2.19.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Shield, text: "AI Disclosure Audit — All AI disclosure labels are now unified across every surface: Human-Made, AI-Assisted, and AI-Generated. One shared component, one vocabulary, no ambiguity anywhere on the platform." },
      { icon: ArrowUpFromLine, text: "Work Versioning — Every work now has a Version History. Upload a new version of a track, add a change note and version label, and the original is automatically archived as v1 with its WID preserved. Creative evolution, fully documented." },
      { icon: FileText, text: "Terms of Service — A full Terms page is now live at /terms. It opens with a creator-protection preamble: these terms exist to protect creators, not the platform. Accessible from the sidebar and mobile drawer." },
      { icon: Music, text: "Ordered Playback — Every section on the platform now plays its own ordered queue. Album tracks stay within the album. Homepage sections (Witnessed Voices, Discover, Trending) each play their own list in sequence. No more jumping across unrelated tracks." },
      { icon: Users, text: "Creator Profile Header — The artist name is now a stable display heading that never changes on interaction. Below it, the @handle appears as a Twitter-style sub-header: click it to copy the profile link to your clipboard." },
    ],
  },
  {
    version: "v2.18.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: BookOpen, text: "Multi-Medium Registry — Living Nexus now witnesses Music, Lyrics, Manuscripts, and Comics/Graphic Novels. Every medium. One registry." },
      { icon: Shield, text: "Medium-Aware WID Badges — Verify page now shows WID-MUS, WID-LYR, WID-MAN, or WID-CMX with a description of the work type." },
      { icon: Upload, text: "Expanded Upload — Choose your content type (Audio, Lyrics, Manuscript, Comic) before uploading. Each medium has its own WID prefix and flow." },
      { icon: Globe, text: "Explore Tabs — Filter the Explore page by medium: Music · Lyrics · Manuscripts · Comics." },
      { icon: Network, text: "Live Registry Counts — The homepage now shows real-time witnessed work counts per medium, updated with every new upload." },
    ],
  },
  {
    version: "v2.17.0",
    date: "March 2026",
    label: "",
    items: [
      { icon: Maximize2, text: "Direct Manipulation — Every image editor on the platform now works the same way: drag to reposition, scroll to zoom, double-click to reset. Banner, cover art, avatar, collection cover — one interaction language across the entire system. No sliders. No panels on the canvas. Just you and your work." },
      { icon: Zap, text: "Keyboard Layer — When the editor canvas is focused, a full keyboard shortcut layer activates: R to reset center, +/− to zoom, arrow keys to nudge (Shift for 5× step), Enter to save, Esc to cancel. The hints appear in the dock when active and disappear when not. Present when used, invisible otherwise." },
      { icon: Shield, text: "AI Focal Point Detection — When you upload a banner, the platform's vision system analyzes the image and identifies the primary subject. The editor opens with the focal point pre-centered and marked with a gold AI badge. Override it by dragging. Your intent always wins." },
    ],
  },
  {
    version: "v2.15.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Maximize2, text: "Banner Positioning Modes — Three explicit modes now govern how your banner image is framed: Fit (full image visible, no crop), Crop (cover-style with a zoom slider), and Stretch (fills the frame completely, no letterbox). Creator-controlled visual framing, no guesswork." },
      { icon: Shield, text: "Gold Banner Frame — Every creator profile and owner profile now carries an elegant gold border on the banner. Corner accents, top and bottom gold lines. Visible authorship. Your space is framed, not ambient." },
      { icon: Upload, text: "Empty Banner Upload Prompt — Profiles without a banner no longer show a plain gradient. The empty state is now an active gold-framed upload CTA: 'Upload Banner — Define your profile presence.' Every profile should either show authorship or clearly invite it." },
    ],
  },
  {
    version: "v2.8.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Maximize2, text: "Drag to Reposition — Your banner, avatar, track cover art, and collection cover art can now be repositioned to show exactly what you want. Upload your image, drag to frame it perfectly, save. Your creative space. Your arrangement." },
    ],
  },
  {
    version: "v2.7.3",
    date: "March 2026",
    label: null,
    items: [
      { icon: Download, text: "Player Bar Download — every track now has a Download button in the global player bar. The file is ID3-tagged with your WID, the verify URL, cover art, AI consent flag, and Colossians 1:17. Your provenance travels with every file, everywhere." },
      { icon: FileArchive, text: "Download My Archive — Dashboard → Archive tab. See all your tracks grouped into batches of 10. Download any batch as a ZIP containing ID3-tagged audio and WID certificate PDFs. Your full catalog, offline, with provenance intact." },
    ],
  },
  {
    version: "v2.7.1",
    date: "March 2026",
    label: null,
    items: [
      { icon: Globe, text: "Declaration-First Homepage — Living Nexus now opens with its declaration, doctrine, and the Creator/Fan value split front and center. This is what we are. No confusion." },
    ],
  },
  {
    version: "v2.6.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Library, text: "Collection Certificates — when you upload an album or batch of songs the platform now generates a Collection WID (WID-ALB-…) binding all works together as one origin record. Download a single certificate listing every track, every individual WID, and the collective cryptographic proof. Two layers of protection — individual and collective. Verify any collection at /verify/WID-ALB-…" },
      { icon: Shield, text: "Regenerate Certificate — creators can refresh their Collection Certificate at any time from Dashboard → Collections. Updates the PDF with the latest track metadata and re-uploads it to the archive." },
    ],
  },
  {
    version: "v2.5.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Shield, text: "Name Audit Trail — every WID certificate now shows the creator's original registered name at time of witnessing. If a creator changes their display name, a full name history timeline appears on the verify page. Your provenance is permanent and complete." },
      { icon: CreditCard, text: "Stripe Recovery — creators who started but didn't finish Stripe onboarding can now complete it. Go to Dashboard to finish connecting your bank and start receiving gifts." },
    ],
  },
  {
    version: "v2.4.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: ArrowUpFromLine, text: "Large File Upload Fix — WAV files of any size now upload reliably. The upload pipeline was rebuilt as a streaming relay, bypassing the platform's request-body limit entirely." },
    ],
  },
  {
    version: "v2.3.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Eye, text: "Witness Registry — a public ledger of all witnessed works on the platform. Browse by All, Full Works, or Lyrics. Every WID is permanently on record." },
      { icon: Shield, text: "Witness Notifications — when someone witnesses you, you receive an instant signal with their name and avatar. Your witness network is now a living, notified relationship." },
    ],
  },
  {
    version: "v2.2.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Music, text: "Collaborative Playlists — create playlists and invite other creators to build them together. Invite by username, manage collaborators, and play the full queue from any device." },
      { icon: MessageCircle, text: "Signals (Notification Feed) — every witness, comment, and playlist invite now lands in your personal Signals inbox. Archived forever, never lost. Access it from the sidebar." },
    ],
  },
  {
    version: "v2.1.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Users, text: "Community Notifications — when a new member joins Living Nexus, every logged-in user sees a live toast notification in real time. No refresh needed — the platform is always watching the door." },
      { icon: Video, text: "Background Video Buffering — cover art now holds steady while the background video loads. The fade only happens once the video is fully ready to play." },
      { icon: Shield, text: "Video WID Badge — any track with a witnessed video now shows a green ✓ Video WID badge in the player. Tap it to verify the video's cryptographic certificate." },
    ],
  },
  {
    version: "v2.0.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Film, text: "Background Video Playback — attach a muted looping video to any track. Cover art stays static until you press play, then the video fades in behind the music." },
      { icon: Network, text: "Witness Network — witness any creator to build a living network of creative relationships. View who witnesses you and who you witness from your profile." },
      { icon: Scroll, text: "Field Notes — write doctrine, journals, updates, and concepts directly on the platform. Your ideas now have a home alongside your music." },
      { icon: BookOpen, text: "Lexicon — the Living Nexus vocabulary legend. 28 terms translated from standard internet language into the platform's sovereign terminology." },
      { icon: FileText, text: "WID Public Specification v1.0 — the full technical and philosophical specification for the Witness ID system is now published and downloadable." },
      { icon: Globe, text: "Per-page link previews — every page on Living Nexus now shows its own title, description, and image when shared on Discord, iMessage, Twitter, or Slack." },
    ],
  },
  {
    version: "v1.7.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: CreditCard, text: "Live Payments — Creator License ($88.88) and Fan Gifts are now powered by real Stripe payments. Your money goes directly to creators." },
      { icon: DollarSign, text: "Fan Gifts — gift any creator directly from their song page. Choose $1, $2, $5, $10, $25, or a custom amount. Creators keep 90%." },
      { icon: Download, text: "Gift-to-Download — creators can gate downloads behind a minimum tip. Pay once, download unlocks instantly." },
      { icon: Zap, text: "Stripe Connect for Creators — go to Dashboard → Enable Gifts to connect your Stripe account and start receiving gifts directly to your bank." },
    ],
  },
  {
    version: "v1.6.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Maximize2, text: "Desktop Cinematic Bar — click \"expand player\" above the bottom bar. Full theater view opens with art or video, controls, WID, and a live comment feed." },
      { icon: MessageCircle, text: "Mobile Comments — Cinema Mode now has Lyrics and Comments tabs. Read the thread or leave your mark while the music plays." },
      { icon: MessageCircle, text: "Live Feed polling — the comment feed in the expanded bar refreshes automatically every 15 seconds so you see new witnesses in real time." },
    ],
  },
  {
    version: "v1.5.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Eye, text: "Cinema Mode — tap the eye icon next to the heart button to hide all controls and focus on art + lyrics." },
      { icon: Shield, text: "WID + AI tags row — your Witness ID and genre/AI disclosure now appear directly below the artist name." },
      { icon: Users, text: "Share button — share any track via native share sheet or copy link to clipboard." },
      { icon: BookOpen, text: "Grab handle — swipe down on the pill bar at the bottom of the player to close; no more accidental swipe-right dismissals." },
    ],
  },
  {
    version: "v1.4.0",
    date: "March 2026",
    label: null,
    items: [
      { icon: Video, text: "Music video support — attach an MP4/MOV to any track. Each video gets its own Witness ID." },
      { icon: Shield, text: "Video WID protection — your video is cryptographically hashed and timestamped alongside your audio." },
      { icon: BookOpen, text: "Archive lyrics editor — add or update lyrics on any track after upload, no re-upload needed." },
    ],
  },
  {
    version: "v1.3.0",
    date: "February 2026",
    label: null,
    items: [
      { icon: DollarSign, text: "Per-track download permissions — Free, Gift-to-Download, or No Downloads." },
      { icon: Music, text: "Now Playing redesign — controls overlay cover art, more room for lyrics." },
    ],
  },
];

const HOW_TO_STEPS = [
  {
    step: "1",
    icon: Upload,
    title: "Upload your track",
    body: "Add audio, cover art, lyrics, and optionally a muted background video. A Witness ID is generated automatically — your cryptographic proof of creation.",
  },
  {
    step: "2",
    icon: Shield,
    title: "Your WID is your proof",
    body: "SHA-256 hash of your file + identity + timestamp. Cannot be faked or backdated. Use it to prove ownership if your music is ever used without permission.",
  },
  {
    step: "3",
    icon: DollarSign,
    title: "Get paid directly",
    body: "Enable gifts via Dashboard → Connect Stripe. Fans gift you directly — you keep 90%. Set download permissions per track.",
  },
  {
    step: "4",
    icon: Network,
    title: "Build your Witness Network",
    body: "Witness other creators to build a living record of your creative relationships. Your network compounds over time — it cannot be replicated elsewhere.",
  },
  {
    step: "5",
    icon: Music,
    title: "Manage your archive",
    body: "Edit metadata, update lyrics, attach a background video, change track status, or update download permissions at any time from Archive.",
  },
];

interface WhatsNewModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export function WhatsNewModal({ forceOpen = false, onClose }: WhatsNewModalProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"updates" | "howto">("updates");

  useEffect(() => {
    if (forceOpen) { setOpen(true); return; }
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(t);
    }
  }, [forceOpen]);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    onClose?.();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="flex flex-col p-0 overflow-hidden rounded-2xl w-[calc(100vw-32px)] max-w-md"
        style={{
          background: "oklch(0.09 0.02 270)",
          border: "1px solid oklch(0.84 0.155 85 / 0.2)",
          maxHeight: "min(88vh, 640px)",
        }}
      >
        <DialogDescription className="sr-only">
          Living Nexus platform updates and how-to guide for new features.
        </DialogDescription>
        {/* Header */}
        <div
          className="flex-shrink-0 px-4 pt-4 pb-3"
          style={{
            background: "linear-gradient(135deg, oklch(0.11 0.04 270), oklch(0.09 0.02 270))",
            borderBottom: "1px solid oklch(0.84 0.155 85 / 0.12)",
          }}
        >
          <div
            className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase mb-2 px-2.5 py-1 rounded-full"
            style={{
              background: "oklch(0.84 0.155 85 / 0.1)",
              border: "1px solid oklch(0.84 0.155 85 / 0.25)",
              color: "oklch(0.84 0.155 85)",
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {CURRENT_VERSION}
          </div>
          <DialogTitle
            className="text-base font-bold leading-snug"
            style={{ fontFamily: "'Cinzel', serif", color: "oklch(0.95 0.02 85)" }}
          >
            What's New on Living Nexus
          </DialogTitle>
          <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.03 280)" }}>
            Platform updates and a quick guide to get started.
          </p>
        </div>

        {/* Tab bar */}
        <div
          className="flex-shrink-0 flex border-b"
          style={{ borderColor: "oklch(0.84 0.155 85 / 0.1)" }}
        >
          {(["updates", "howto"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all"
              style={{
                color: tab === t ? "oklch(0.84 0.155 85)" : "oklch(0.42 0.03 280)",
                borderBottom: tab === t ? "2px solid oklch(0.84 0.155 85)" : "2px solid transparent",
                background: "transparent",
              }}
            >
              {t === "updates" ? "Recent Updates" : "How It Works"}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 min-h-0">
          {tab === "updates" && UPDATES.map((release) => (
            <div key={release.version}>
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="text-[11px] font-bold"
                  style={{ color: "oklch(0.84 0.155 85)", fontFamily: "'Orbitron', sans-serif" }}
                >
                  {release.version}
                </span>
                <span className="text-[11px]" style={{ color: "oklch(0.42 0.03 280)" }}>{release.date}</span>
                {release.label && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "oklch(0.84 0.155 85 / 0.15)", color: "oklch(0.84 0.155 85)" }}
                  >
                    {release.label}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {release.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <div
                        className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5"
                        style={{ background: "oklch(0.84 0.155 85 / 0.1)", border: "1px solid oklch(0.84 0.155 85 / 0.2)" }}
                      >
                        <Icon size={11} style={{ color: "oklch(0.84 0.155 85)" }} />
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.66 0.03 280)" }}>
                        {item.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {tab === "howto" && (
            <div className="space-y-3">
              {HOW_TO_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.step}
                    className="rounded-xl p-3 flex gap-3"
                    style={{ background: "oklch(0.11 0.02 270)", border: "1px solid oklch(0.84 0.155 85 / 0.08)" }}
                  >
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
                      style={{
                        background: "oklch(0.84 0.155 85)",
                        color: "#2C3438",
                        fontFamily: "'Orbitron', sans-serif",
                      }}
                    >
                      {step.step}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon size={11} style={{ color: "oklch(0.84 0.155 85)" }} />
                        <span className="text-xs font-bold" style={{ color: "oklch(0.88 0.03 85)" }}>
                          {step.title}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "oklch(0.56 0.03 280)" }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-4 py-3 flex items-center justify-between gap-3"
          style={{ borderTop: "1px solid oklch(0.84 0.155 85 / 0.1)" }}
        >
          <Link
            href="/manifesto"
            onClick={handleClose}
            className="text-[11px] flex items-center gap-1 hover:underline whitespace-nowrap"
            style={{ color: "oklch(0.50 0.04 280)" }}
          >
            Read the Manifesto <ChevronRight size={10} />
          </Link>
          <Button
            onClick={handleClose}
            size="sm"
            className="font-semibold text-xs px-5 h-8 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.84 0.155 85), oklch(0.72 0.14 75))",
              color: "#2C3438",
            }}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
