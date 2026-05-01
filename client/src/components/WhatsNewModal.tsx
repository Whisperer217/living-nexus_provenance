import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Shield, Upload, Music, Video, DollarSign, Users, BookOpen, FolderOpen,
  ChevronRight, Maximize2, MessageCircle, Zap, Download, CreditCard,
  Eye, Globe, FileText, Network, Scroll, Film, Gift, Link2,
  Radio, ArrowUpFromLine, Library, FileArchive, Rocket, ImagePlus, Compass,
  Bell, LayoutGrid, ImageIcon, Sun, Moon, Sparkles, TrendingUp, Pin, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const CURRENT_VERSION = "v2.39.0";
const STORAGE_KEY = `living-nexus-whats-new-seen-${CURRENT_VERSION}`;

const UPDATES = [
  {
    version: "v2.39.0",
    date: "May 1, 2026",
    label: "Latest",
    items: [
      { icon: Maximize2, text: "Desktop Player — On desktop (≥1024px) the player is now a contained floating card: clamp(680px, 50vw, 820px) wide, anchored bottom-right with 32px margin, fully rounded on all four corners. No longer a full-width tray." },
      { icon: Maximize2, text: "Desktop Expanded = Centered Modal — Expanding the player on desktop opens a centered modal overlay (900×700 max) instead of a bottom sheet. Desktop mental model, not mobile." },
      { icon: Zap, text: "Directional Glow — Desktop glow now pushes upward toward content (gold) with a deep drop shadow below, reinforcing elevation. Mobile glow tightened — no fog bleed." },
      { icon: Music, text: "3-Tier Button Hierarchy — Play button is the brightest gold with hot glow. Skip/transport buttons are mid gold. Utility buttons (Like, Add, Volume, Glow) are dim gold. Visual weight matches action importance." },
      { icon: Music, text: "Crisp Progress Bar — Track is now a sharp 3px line. Glow is applied only to the 12px knob, not the entire bar." },
    ],
  },
  {
    version: "v2.38.1",
    date: "April 30, 2026",
    label: "",
    items: [
      { icon: FolderOpen, text: "Profile Collections tab — Legacy playlists now appear below your named Collections in the Collections tab. Expand any playlist to see its tracks. No data loss — all playlists are preserved alongside the new Collections system." },
      { icon: Music, text: "BUILD drawer tab — Legacy playlists now appear in a \"My Playlists\" section below your Collections in the BUILD tab of the Quick Play drawer. Expand to browse tracks inline." },
      { icon: Users, text: "Navigation fix — \"My Profile\" in the menu now correctly goes to your profile settings page. \"Creator Page\" goes to your public creator view." },
    ],
  },
  {
    version: "v2.38.0",
    date: "April 30, 2026",
    label: "",
    items: [
      { icon: Music, text: "Global Player v3.0 — The player is now a draggable floating overlay that lives above all content. Drag it up to expand to full-screen (artwork, provenance strip, Up Next queue, action row). Drag down to the floating bar (controls + progress). Drag to the bottom edge for the compact mini strip. Three snap zones: Mini (72px), Float (140px), Expanded (full height). Glass backdrop with gold glow system. Works on all screen sizes." },
      { icon: BookOpen, text: "Expanded Player — Full artwork, creator name with verified badge, Witnessed on Living Nexus strip, provenance shield button, Up Next queue (next 3 tracks), Add to Collection, Like, Share, Tip, and Verify actions. Waveform visualizer and frequency glow available in expanded view." },
    ],
  },
  {
    version: "v2.37.1",
    date: "April 30, 2026",
    label: "",
    items: [
      { icon: BookOpen, text: "Collections & Likes system — Every track card now has a + button that opens an Add to Collection modal. Create named collections, drag-reorder liked tracks in the LIKED drawer, manage collections in the BUILD drawer. Profile page has Likes and Collections tabs synced with the drawer." },
    ],
  },
  {
    version: "v2.36.1",
    date: "April 30, 2026",
    label: "",
    items: [
      { icon: BookOpen, text: "SHOP Tab Added — A SHOP tab handle now appears in the right-side drawer stack below BUILD. Clicking SHOP closes the Quick Play drawer and opens the Marketplace drawer directly. All five tabs (NEW / TREND / LIKED / BUILD / SHOP) are stacked on the right edge." },
    ],
  },
  {
    version: "v2.36.0",
    date: "April 30, 2026",
    label: "",
    items: [
      { icon: BookOpen, text: "Individual Stacked Tab Handles — Each tab on both side drawers is now its own individual protruding handle on the screen edge, stacked vertically top-to-bottom. Left drawer: LIVE / PLAYING / TIPS tabs stacked on the left edge. Right drawer: NEW / TREND / LIKED / BUILD tabs stacked on the right edge. Clicking a tab opens the drawer and switches to that section; clicking the active tab again collapses the drawer. The header inside the panel now shows the active section name instead of a pill row." },
    ],
  },
  {
    version: "v2.35.0",
    date: "April 30, 2026",
    label: "",
    items: [
      { icon: BookOpen, text: "Unified Drawer Handles — All three side drawers (Live Activity left, Quick Play right, Shop right) now share the same interaction pattern. Each drawer has a single centered handle button that protrudes from the screen edge and slides in sync with the panel. Click the handle to open; click again to close. The multi-tab BookSpine strip has been replaced with a compact pill tab row inside the panel header — cleaner, less visual noise, consistent with the Shop drawer that was already using this pattern." },
    ],
  },
  {
    version: "v2.34.2",
    date: "April 30, 2026",
    label: "",
    items: [
      { icon: BookOpen, text: "Book-Tab Drawer Fix — The spine tab strips on both side drawers (Live Activity left, Quick Play right) now render as fixed-position overlays outside the sliding panel. Previously, clicking the active tab to collapse the drawer would slide the tabs off-screen with the panel, making them impossible to click to reopen. The tabs now always remain visible at the screen edge — left drawer tabs stay at the left edge when closed, right drawer tabs at the right edge — and slide in sync with the panel when it opens or closes." },
      { icon: Music, text: "StoreTrackCard Play Fix — Track cards on the Home and Explore pages now play on click instead of navigating to the song detail page. Navigation to the song page is available through the three-dot context menu (Go to Song)." },
      { icon: Users, text: "Featured Creators Filter — The Featured Creators carousel now excludes accounts with auto-generated placeholder names (e.g. \"Creator 5330001\"). Only creators with a real display name or artist handle appear." },
    ],
  },
  {
    version: "v2.34.0",
    date: "April 30, 2026",
    label: "",
    items: [
      { icon: BookOpen, text: "Book-Tab Spine Drawers — Both side panels (Live Activity on the left, Quick Play on the right) have been redesigned as book-divider spine drawers. Vertical protruding tabs on the drawer edge mimic the tabbed dividers of a reference book. Left panel: Live / Playing / Tips tabs on the right spine edge. Right panel: New / Trending / Liked / Build tabs on the left spine edge. Cinzel small-caps labels, gold foil active state, warm near-black parchment interior." },
    ],
  },
  {
    version: "v2.33.0",
    date: "April 29, 2026",
    label: "",
    items: [
      { icon: Zap, text: "Live Waveform Visualizer — The player bar now has a real-time oscilloscope waveform drawn directly from the audio signal. When Frequency Glow is enabled (the ∿ button), a smooth bezier wave runs the full width of the bar, color-shifting from violet at rest to gold on bass hits and cyan on mid-heavy passages. The wave is drawn on a canvas layer behind the controls so nothing is obscured. The glow effect and waveform share the same Web Audio graph — no extra CPU overhead." },
      { icon: Shield, text: "Reaction Error Fixed (Production) — Emoji reactions were silently failing on the live site with a raw database error message appearing in the toast. Two fixes: the DB connection pool now handles ECONNRESET (stale serverless connections) with a 60-second idle timeout, and the error toast now always shows a clean user-facing message instead of leaking internal SQL." },
    ],
  },
  {
    version: "v2.32.5",
    date: "April 29, 2026",
    label: "",
    items: [
      { icon: Zap, text: "Beat-Reactive Glow Pulse — The Frequency Glow system was rewritten from scratch. Instead of linearly tracking raw frequency values, the glow now pulses with the music using a beat detection + peak/decay envelope. When bass energy exceeds the running peak by 15%, a beat is detected and the peak snaps up instantly. Between beats, it decays exponentially at ×0.88 per frame (~0.5s full decay). The peak envelope drives all glow spread and opacity values — not raw frequency. Color palette: violet at idle, gold/amber on bass hits, cyan on mid-heavy passages, white shimmer on high-freq transients. Six glow layers: upward pulse, mid layer, white edge flash, inset bar glow, side glow, and subtle downward pulse." },
    ],
  },
  {
    version: "v2.32.4",
    date: "April 29, 2026",
    label: "",
    items: [
      { icon: Zap, text: "Frequency Glow Visual Fix — The Frequency Glow toggle was enabled but the glow was invisible. Root cause: the Audio element was created without crossOrigin='anonymous' before any S3 URL was loaded. The Web Audio API's createMediaElementSource() requires this attribute — without it, the browser CORS-taints the stream and blocks the analyser from reading any frequency data. Fix: PlayerContext now sets crossOrigin='anonymous' on the Audio element before assigning any src. The glow now radiates in all directions: upward above the bar, inset on the bar itself (always visible), left and right side edges, and a subtle downward pulse." },
    ],
  },
  {
    version: "v2.32.2",
    date: "April 28, 2026",
    label: "",
    items: [
      { icon: Shield, text: "Emoji Reactions Fixed — The 🔥❤️👏 reaction bar on song pages was silently failing for all users. A database column mismatch (emoji chars stored in a varchar(10) utf8 column) caused every reaction toggle to roll back without any error message. The column has been migrated to a safe varchar(32) utf8mb4 type using ASCII slug keys. Reactions now register correctly and a clear error toast appears if anything goes wrong." },
      { icon: Users, text: "Creator Cards Fixed — Clicking a creator card on the Home page showcase rows or Explore page was returning a 404. The card was linking to the creator's @handle instead of their numeric profile ID. All creator cards now navigate correctly to the full public profile with their complete track list, albums, and collections." },
      { icon: Music, text: "Track Card Context Menu — Every track card in the Home and Explore showcase rows now has a three-dot menu (appears on hover). Options: Play Next, Add to List (shows your playlists or creates a new one), Go to Song, View Creator, and Copy WID Link." },
    ],
  },
  {
    version: "v2.32.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: LayoutGrid, text: "Home — Store Layout — The Home page now opens with a Microsoft Store-style layout. A 3-slide hero carousel auto-rotates every 5 seconds with prev/next arrows and dot pagination. Below it, four horizontal shelf rows surface New Arrivals, Trending This Week, Featured Creators, and Recently Witnessed works — each row scrolls independently with snap points and left/right nav arrows." },
      { icon: Music, text: "StoreTrackCard — A new tall-rectangle card format replaces the square cards in the Home shelves. Cover art fills the card, creator avatar and name are pinned to the bottom, a WID badge appears when the work is witnessed, and a circular play button fades in on hover. Cards snap cleanly in horizontal scroll rows on both desktop and mobile." },
      { icon: Users, text: "StoreCreatorCard — Featured Creators now display in a dedicated card format: banner image at the top, circular avatar overlaid at the bottom edge, creator name, optional @handle, Founder badge for Founder's Era members, and published-works count. Cards link directly to the creator's profile." },
      { icon: Compass, text: "Explore — Store View — The Explore page gains a Store / Classic view toggle. Store View (default) groups all tracks into ShowcaseRow shelves by genre — one top-level row for the active mode (All / Trending / New) plus per-genre rows for any genre with 3 or more tracks. Genre filtering now uses horizontal pill chips instead of the icon grid, and the hero banner is compacted to 120px to put more catalogue on screen immediately." },
    ],
  },
  {
    version: "v2.31.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Music, text: "Genre Multi-Select — The genre selector on track edit and creator profile is now a chip grid instead of a dropdown. Select as many genres as your work spans — Gospel, Trap, Power Metal, Neo-Soul, and 60+ other styles are available. Selections are stored as a comma-separated list and the 64-character cap has been removed entirely." },
      { icon: BookOpen, text: "Comic Upload — Storyboard-Only Mode — Comics and novels can now be published using storyboard pages alone, without uploading a separate file. The Next: Metadata button unlocks as soon as pages are added, the Witness ID is generated from the page layout, and the file drop zone relabels itself as optional once pages are present." },
      { icon: Eye, text: "Reader — Close and Fullscreen Fixed — The X and expand icons in the flip reader now register correctly on all devices. A CSS stacking context conflict caused the nav zone buttons to paint above the top bar, intercepting every tap. The top bar is now at a higher z-index and both buttons call stopPropagation." },
      { icon: Star, text: "Credits — Role Badges — Role labels in the Credits section (Publisher, Co-Writer, Producer, etc.) are now pill badges with proper contrast. Publisher roles show in blue; all other roles show in gold. The previous near-black text color made them invisible against the dark background." },
    ],
  },
  {
    version: "v2.30.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Music, text: "Lyrics Editor — Undo / Redo — Press Ctrl/Cmd+Z to undo and Ctrl/Cmd+Y (or Ctrl/Cmd+Shift+Z) to redo any change in the lyrics editor. Two toolbar buttons sit above the Save Lyrics row and grey out automatically at stack boundaries. History holds up to 200 entries per session." },
      { icon: FileText, text: "Lyrics Editor — Auto-Save Draft — Every keystroke in the lyrics editor is saved to your browser. If you close the panel without saving, your unsaved lyrics are restored the next time you open it. A gold notice appears when a draft is present and clears automatically after a successful save." },
      { icon: Star, text: "Lyrics Editor — Line & Syllable Stats — The character count row now shows the number of non-empty lines and the average syllable count per line, helping songwriters structure verses and choruses to a target length without leaving the editor." },
      { icon: Users, text: "Contributors Strip — The home page now shows a contributors strip at the bottom with creator avatars and roles, linking through to the full Attribution page. Slimdoggy and thiiirdgenkill are now publicly credited for their QA work." },
    ],
  },
  {
    version: "v2.29.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: Gift, text: "Gift Confirmation Banner — When you send a gift to a creator or tip a track and return from checkout, a gold-bordered confirmation banner now appears directly in the page — unmissable, auto-dismisses in 8 seconds, with a manual dismiss button. No more wondering if the payment went through." },
      { icon: Bell, text: "Notifications Repositioned — All site-wide toasts (tips, comments, errors, system messages) moved from top-center to bottom-center. They no longer compete with the header on mobile and sit cleanly above the mini player bar." },
      { icon: TrendingUp, text: "Explore — Unlimited Tracks — Randomize, Trending, and New This Week modes now load up to 500 tracks instead of the previous 24-track hard cap. All three modes display a flat responsive grid across all creators — no more per-creator grouping that hid most of the catalogue." },
      { icon: Music, text: "Song Page Scroll Restored — Tapping play, like, or next on the mini player bar no longer freezes the page behind it. The scroll lock now only activates after a confirmed upward swipe of 8px or more, so tap targets work freely without locking the page." },
    ],
  },
  {
    version: "v2.28.0",
    date: "April 2026",
    label: "",
    items: [
      { icon: BookOpen, text: "Comic Book Reader — Comics and novels now open in a full-screen horizontal page-turn reader. Pages slide left and right with a CSS 3D page-curl animation. Desktop shows a two-page spread; mobile shows one page at a time. The chrome fades away after a few seconds so nothing stands between you and the art. Swipe on mobile, arrow keys on desktop, Escape to close." },
      { icon: Gift, text: "Creator-Level Gifting — The Send a Gift button on a creator’s profile now goes directly to the creator — not attached to any specific track. Support the artist, not just the song." },
      { icon: Users, text: "Witness Network Modal — Clicking the Witnessing or Witnesses count on a creator profile now opens a panel showing the full list of creators they follow and who follows them. Each entry links directly to that creator’s profile." },
      { icon: Compass, text: "Storyboard Builder — When uploading a comic or novel, a new Storyboard step lets you drag individual page images into order, set a cover, and add per-page captions before publishing. The reader uses your layout exactly as arranged." },
      { icon: LayoutGrid, text: "Unified Card Standard — Every track, comic, and project card across the platform — Home, Discover, Creator Profile, and Explore — now shares the same size, border, hover lift, and texture. One visual language, everywhere." },
    ],
  },
  {
    version: "v2.27.0",
    date: "April 2026",
    label: "",
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
          background: "var(--ln-coal)",
          border: "1px solid rgba(196,154,40,0.15)",
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
            background: "linear-gradient(135deg, var(--ln-coal), #111009)",
            borderBottom: "1px solid rgba(196,154,40,0.08)",
          }}
        >
          <div
            className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase mb-2 px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(196,154,40,0.06)",
              border: "1px solid rgba(196,154,40,0.2)",
              color: "var(--ln-gold)",
              fontFamily: "'Orbitron', sans-serif",
            }}
          >
            {CURRENT_VERSION}
          </div>
          <DialogTitle
            className="text-base font-bold leading-snug"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            What's New on Living Nexus
          </DialogTitle>
          <p className="text-xs mt-0.5" style={{ color: "var(--ln-smoke)" }}>
            Platform updates and a quick guide to get started.
          </p>
        </div>

        {/* Tab bar */}
        <div
          className="flex-shrink-0 flex border-b"
          style={{ borderColor: "rgba(196,154,40,0.06)" }}
        >
          {(["updates", "howto"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all"
              style={{
                color: tab === t ? "var(--ln-gold)" : "var(--ln-iron)",
                borderBottom: tab === t ? "2px solid #C49A28" : "2px solid transparent",
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
                  style={{ color: "var(--ln-gold)", fontFamily: "'Orbitron', sans-serif" }}
                >
                  {release.version}
                </span>
                <span className="text-[11px]" style={{ color: "var(--ln-iron)" }}>{release.date}</span>
                {release.label && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(196,154,40,0.08)", color: "var(--ln-gold)" }}
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
                        style={{ background: "rgba(196,154,40,0.06)", border: "1px solid rgba(196,154,40,0.15)" }}
                      >
                        <Icon size={11} style={{ color: "var(--ln-gold)" }} />
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
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
                    className="p-3 flex gap-3"
                    style={{ background: "var(--ln-coal)", border: "1px solid rgba(196,154,40,0.06)" }}
                  >
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
                      style={{
                        background: "var(--ln-gold)",
                        color: "var(--ln-coal)",
                        fontFamily: "'Orbitron', sans-serif",
                      }}
                    >
                      {step.step}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Icon size={11} style={{ color: "var(--ln-gold)" }} />
                        <span className="text-xs font-bold" style={{ color: "var(--ln-parchment)" }}>
                          {step.title}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
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
          style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}
        >
          <Link
            href="/manifesto"
            onClick={handleClose}
            className="text-[11px] flex items-center gap-1 hover:underline whitespace-nowrap"
            style={{ color: "var(--ln-iron)" }}
          >
            Read the Manifesto <ChevronRight size={10} />
          </Link>
          <Button
            onClick={handleClose}
            size="sm"
            className="font-semibold text-xs px-5 h-8 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #C49A28, #C49A28)",
              color: "var(--ln-coal)",
            }}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
