/**
 * LexiconPage — The Living Nexus Platform Lexicon
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprehensive reference for every term, phrase, and concept used across
 * the Living Nexus platform. Designed for newcomers and veterans alike.
 *
 * Sections:
 *  1. Identity & Authorship
 *  2. The WID System (Witness ID)
 *  3. Works & The Archive
 *  4. HA AI — Human Authored, AI Assisted
 *  5. The Keeper (AI Companion)
 *  6. Spaces & Community
 *  7. Actions & Gestures
 *  8. Economy & Reciprocity
 *  9. Doctrine & Covenant
 */

import { useState, useRef, useEffect } from "react";
import { BookOpen, Search, ChevronDown, ChevronUp, ArrowRight, X } from "lucide-react";
import { Link } from "wouter";

// ── Image URLs ─────────────────────────────────────────────────────────────────
const SECTION_IMAGES = {
  identity:      "/manus-storage/lexicon-identity_ed3e4029.png",
  wid:           "/manus-storage/lexicon-wid_24bbd0c7.png",
  haai:          "/manus-storage/lexicon-haai_49f70045.png",
  sanctuary:     "/manus-storage/lexicon-sanctuary_1fd668a2.png",
  keeper:        "/manus-storage/lexicon-keeper_55786890.png",
  community:     "/manus-storage/lexicon-community_68c3d123.png",
  economy:       "/manus-storage/lexicon-economy_8c3e1c5a.png",
  constellation: "/manus-storage/lexicon-constellation_64439111.png",
  doctrine:      "/manus-storage/lexicon-doctrine_10c0624c.png",
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface LexEntry {
  /** The term used on this platform */
  term: string;
  /** What it replaces or maps from (elsewhere) — optional */
  elsewhere?: string;
  /** Plain-language definition */
  meaning: string;
  /** Whether this is a foundational / core term */
  core?: boolean;
}

interface LexSection {
  id: string;
  label: string;
  tagline: string;
  image: string;
  color: string;
  entries: LexEntry[];
}

// ── Full Lexicon Data ──────────────────────────────────────────────────────────
const SECTIONS: LexSection[] = [
  {
    id: "identity",
    label: "Identity & Authorship",
    tagline: "Who you are on this platform is not a profile. It is a record.",
    image: SECTION_IMAGES.identity,
    color: "#C49A28",
    entries: [
      {
        term: "Identity",
        elsewhere: "Profile / Account",
        meaning: "Your sovereign record on the platform. Not a social page — a provenance anchor. Everything you create is tied to this Identity.",
        core: true,
      },
      {
        term: "WID Handle",
        elsewhere: "Username / Handle",
        meaning: "Your artist name tied to your Witness ID. The name that appears on every Work you register. It travels with your provenance.",
        core: true,
      },
      {
        term: "Origin Statement",
        elsewhere: "Bio",
        meaning: "Where you came from and what you carry. Not a marketing blurb — a declaration of origin. Part of your provenance record.",
      },
      {
        term: "WITNESSED",
        elsewhere: "Verified Badge",
        meaning: "Status shown when your Work has been formally acknowledged by the network. Not a vanity badge — a provenance signal.",
      },
      {
        term: "Founding Creator",
        meaning: "A creator who registered on Living Nexus during the Founder's Era — before the platform reached public scale. Their WID is permanently marked as foundational. This status cannot be purchased after the era closes.",
        core: true,
      },
      {
        term: "First Witness",
        meaning: "The original human who first interacted with and acknowledged the platform's existence. A singular, non-transferable designation marking the genesis of the Living Nexus provenance chain.",
        core: true,
      },
      {
        term: "Foundational Steward",
        meaning: "A role held by the First Witness — the person responsible for the original doctrine, the platform's ethical framework, and the integrity of the provenance system.",
      },
      {
        term: "Founder's Era",
        meaning: "The early period of Living Nexus when the first creators registered their Works. Works and identities from this era carry a permanent timestamp marking their place in the platform's origin.",
      },
      {
        term: "EID (Expression ID)",
        elsewhere: "Creator ID",
        meaning: "A unique identifier tied to a creator's expression profile — used internally to link provenance watermarks, PPG outputs, and shared prompts back to their originating author.",
      },
      {
        term: "Creator License",
        elsewhere: "Subscription / Membership",
        meaning: "Your formal standing on the platform. Proof that your catalog is protected and your identity is registered. Not a subscription — a declaration of participation.",
        core: true,
      },
      {
        term: "Archivist",
        meaning: "A Keeper archetype. The Archivist mode focuses on semantics, pattern recognition, and corpus analysis — reading your body of work as a whole to find meaning across it.",
      },
      {
        term: "Custodian",
        meaning: "A Keeper archetype. The Custodian mode focuses on provenance, archive integrity, and legacy — ensuring your record is complete and traceable.",
      },
    ],
  },

  {
    id: "wid",
    label: "The WID System",
    tagline: "Every Work deserves a permanent record of when it was made and who made it.",
    image: SECTION_IMAGES.wid,
    color: "#D4AF37",
    entries: [
      {
        term: "WID (Witness ID)",
        elsewhere: "Song ID / Track ID / DOI",
        meaning: "A unique, timestamped identifier permanently tied to your Work. Proof of origin. Where a DOI identifies where something lives, a WID identifies who made it and when.",
        core: true,
      },
      {
        term: "Register",
        elsewhere: "Upload",
        meaning: "To submit a Work to the Living Nexus provenance system and receive a Witness ID. Registration is the act of making your Work part of the permanent record.",
        core: true,
      },
      {
        term: "Provenance",
        meaning: "The documented history of a Work's origin, authorship, and chain of custody. On Living Nexus, provenance is not a claim — it is a timestamped, cryptographically anchored record.",
        core: true,
      },
      {
        term: "Chain of Record",
        meaning: "The unbroken sequence of provenance events attached to a Work — registration, updates, witness testimonies, licensing events, and transformations. The Chain of Record is what makes provenance traceable over time.",
        core: true,
      },
      {
        term: "Provenance Event",
        meaning: "Any significant action recorded in a Work's Chain of Record — registration, a witness testimony, a license grant, a transformation, or an update. Each event is timestamped and attributed.",
      },
      {
        term: "Harmonic Signature",
        meaning: "A unique audio fingerprint generated from a registered Work's frequency profile. Part of the WID document — a mathematical representation of the Work's sonic identity that can be used to detect unauthorized copies.",
        core: true,
      },
      {
        term: "ECDSA Certificate",
        meaning: "The cryptographic certificate generated at the moment of WID registration. It uses Elliptic Curve Digital Signature Algorithm to create a tamper-evident proof of authorship tied to the creator's identity.",
      },
      {
        term: "Witness Input Set",
        meaning: "The collection of data submitted at registration that feeds into the WID generation process — audio file, metadata, creator identity, timestamp, and content type.",
      },
      {
        term: "Witness Record",
        meaning: "The complete output of a WID registration — the WID string, Harmonic Signature, ECDSA certificate, and all associated metadata. The full provenance document.",
      },
      {
        term: "WID Document",
        meaning: "The full provenance record for a registered Work, containing the WID string, creator identity, timestamp, Harmonic Signature, ECDSA certificate, and Chain of Record.",
      },
      {
        term: "Expression Lineage",
        meaning: "The traceable creative ancestry of a Work — which earlier Works influenced it, which creators contributed to it, and how it connects to the broader network of registered creative output.",
      },
      {
        term: "Transformation",
        elsewhere: "Derivative / Remix",
        meaning: "A new Work that traces its lineage to an existing WID. The chain of origin stays intact — the original creator's provenance is preserved even as the Work evolves.",
      },
      {
        term: "Fork Lineage Mapping",
        meaning: "The Archivist Keeper mode's ability to trace all derivative Works back to their origin WID — showing the full creative family tree of a registered Work.",
      },
      {
        term: "Reference",
        elsewhere: "Citation / Credit",
        meaning: "Formally linking your Work to another creator's WID as a source of influence or derivation. References become part of both Works' provenance records.",
      },
      {
        term: "Awaiting Provenance",
        meaning: "Status shown for a Work that has been submitted but whose WID has not yet been fully generated and anchored. A transitional state before the Work enters the permanent record.",
      },
    ],
  },

  {
    id: "works",
    label: "Works & The Archive",
    tagline: "Your catalog is not a library. It is a living record of everything you have made.",
    image: SECTION_IMAGES.constellation,
    color: "#C49A28",
    entries: [
      {
        term: "Work",
        elsewhere: "Song / Track / Post / Article",
        meaning: "Any creative artifact you register and protect on Living Nexus. Music, art, writing, visual work — it is all a Work. The term is intentionally broad.",
        core: true,
      },
      {
        term: "Archive (LNA)",
        elsewhere: "Library / Catalog",
        meaning: "Your complete registered catalog on Living Nexus. Every Work you have ever submitted. The LNA (Living Nexus Archive) is your permanent creative record.",
        core: true,
      },
      {
        term: "Archive Slots",
        meaning: "The number of Works you are authorized to register under your current Creator License. Each slot represents one registered Work in your Archive.",
      },
      {
        term: "Sovereign Archive",
        meaning: "The full export of your registered catalog — all Works, metadata, WID documents, and provenance records — packaged as a portable ZIP file. Your data, in your hands.",
        core: true,
      },
      {
        term: "Field Note",
        elsewhere: "Blog Post / Article",
        meaning: "A written entry in your doctrine layer. Journal, manifesto, update, or concept — your voice on record. Field Notes are timestamped and attributed like any other Work.",
      },
      {
        term: "Constellation",
        meaning: "An interactive visual map showing a Work's creative relationships — the creator's other Works, related Works by genre, and the network of influence surrounding a single piece. A star chart of creative lineage.",
        core: true,
      },
      {
        term: "Archive Artifact",
        meaning: "A Work that has been in the Archive long enough to accumulate provenance events, witness testimonies, and references — a piece with documented history and weight.",
      },
      {
        term: "Content Authenticity",
        meaning: "The verifiable claim that a Work is what it says it is — made by who it says it was made by, at the time it says it was made. The WID system is the mechanism for establishing content authenticity.",
      },
      {
        term: "Cinematic Mode",
        meaning: "A full-screen immersive playback experience for registered Works. The Cinematic Mode surfaces the Work's visual identity, provenance data, and creator information in a theater-like presentation.",
      },
      {
        term: "Ambient Mode",
        meaning: "A low-intensity background playback mode that allows registered Works to play continuously without demanding full attention. Designed for extended listening sessions.",
      },
      {
        term: "Ambient Reading Mode",
        meaning: "A combined mode where music plays softly in the background while the user reads Field Notes, doctrine pages, or creator profiles. The audio and text coexist without competing.",
      },
      {
        term: "Discovery Trail",
        meaning: "A curated path through the platform's registered Works, designed to surface new creators and Works based on provenance connections rather than algorithmic popularity.",
      },
    ],
  },

  {
    id: "haai",
    label: "HA AI — Human Authored, AI Assisted",
    tagline: "The human is the author. The AI is the instrument. This distinction is not optional.",
    image: SECTION_IMAGES.haai,
    color: "#7B9EA6",
    entries: [
      {
        term: "HA AI",
        meaning: "Human Authored, AI Assisted. The foundational doctrine governing how artificial intelligence is used on Living Nexus. The human creator is always the author. AI is a tool, not a co-author.",
        core: true,
      },
      {
        term: "HA AI Declaration",
        meaning: "A formal statement attached to a Work declaring the nature of AI involvement in its creation. Not a disclaimer — a provenance record. The Declaration specifies what the human authored and what AI assisted with.",
        core: true,
      },
      {
        term: "AI Disclosure Pill",
        meaning: "A small visual indicator attached to Works that used AI assistance during creation. Transparent, non-stigmatizing, and part of the provenance record. Honesty about process is a platform value.",
      },
      {
        term: "Pathology of Emergence",
        meaning: "The doctrine describing what happens when AI systems are allowed to generate without human authorship — the gradual erosion of origin, attribution, and creative sovereignty. Living Nexus exists in opposition to this pathology.",
        core: true,
      },
      {
        term: "Provenance Prompt Generator (PPG)",
        elsewhere: "AI Writing Tool",
        meaning: "A platform tool that generates creative prompts bound to the creator's own identity and registered Works. The PPG is profile-centric — only the profile owner can open their own studio. Prompts carry a provenance watermark.",
        core: true,
      },
      {
        term: "Provenance Watermark",
        meaning: "A text tag automatically appended to any PPG-generated prompt that is shared — containing the creator's name, EID, date, and source. Authorship travels with the content.",
      },
      {
        term: "Conservative / Exploratory / Divergent",
        meaning: "The three PPG variant modes. Conservative stays close to the creator's established voice. Exploratory pushes into adjacent territory. Divergent challenges the creator's assumptions entirely.",
      },
      {
        term: "Prompt Studio Identity Lock",
        meaning: "The security mechanism that ensures the PPG is bound to a single creator's identity. Prompts generated in one creator's studio cannot be attributed to another. The lock is architectural, not just policy.",
      },
      {
        term: "Human Agency",
        meaning: "The principle that every creative decision on Living Nexus must trace back to a human being. AI can suggest, assist, and generate — but a human must author, choose, and register. Agency is what makes provenance meaningful.",
        core: true,
      },
      {
        term: "Sovereign Shutter",
        meaning: "The doctrine of maintaining human control over the creative process in the age of AI. The Sovereign Shutter is the moment a human creator decides what is made, what is kept, and what is registered.",
      },
    ],
  },

  {
    id: "keeper",
    label: "The Keeper",
    tagline: "An AI companion that serves the creator. Not the other way around.",
    image: SECTION_IMAGES.keeper,
    color: "#C9A84C",
    entries: [
      {
        term: "The Keeper",
        meaning: "The platform's AI companion — a customizable, mode-switching agent that assists creators with analysis, feedback, provenance review, and creative guidance. The Keeper serves the creator's archive, not the platform's interests.",
        core: true,
      },
      {
        term: "Keeper Skin",
        meaning: "The visual identity of your Keeper — from the default Hooded Scholar to unlockable archetypes like The Conductor, The Witness, The Archivist, and The Cipher. Each skin unlocks specific capabilities.",
      },
      {
        term: "Hooded Scholar",
        meaning: "The default Keeper skin. Available to all creators at no cost. Unlocks Guide mode, Custodian mode, and Basic PPG access.",
      },
      {
        term: "Guide Mode",
        meaning: "A Keeper operating mode focused on direction, inspiration, and voice. The Guide helps creators find their next step, overcome creative blocks, and articulate their artistic intent.",
      },
      {
        term: "Conductor Mode",
        meaning: "A Keeper operating mode focused on structure, arrangement, and flow. The Conductor analyzes the technical architecture of a Work — beat mapping, structural critique, arrangement analysis.",
      },
      {
        term: "Witness Mode",
        meaning: "A Keeper operating mode focused on testimony, emotional truth, and depth. The Witness reads a Work for its emotional range, testimonial authenticity, and corpus resonance.",
      },
      {
        term: "Custodian Mode",
        meaning: "A Keeper operating mode focused on provenance, archive integrity, and legacy. The Custodian reviews your Chain of Record, identifies gaps, and ensures your archive is complete.",
      },
      {
        term: "Archivist Mode",
        meaning: "A Keeper operating mode focused on semantics, pattern recognition, and corpus analysis. The Archivist reads your entire body of work to find themes, contradictions, and evolution.",
      },
      {
        term: "The Conductor (skin)",
        meaning: "An unlockable Keeper skin (50 ◈) that activates Conductor mode — arrangement analysis, structural critique, and beat mapping capabilities.",
      },
      {
        term: "The Witness (skin)",
        meaning: "An unlockable Keeper skin (75 ◈) that activates Witness mode — testimonial analysis, emotional range assessment, and corpus deep-read.",
      },
      {
        term: "The Archivist (skin)",
        meaning: "An unlockable Keeper skin (100 ◈) that activates Archivist mode — provenance graph visualization, fork lineage mapping, and WID cross-reference.",
      },
      {
        term: "The Cipher (skin)",
        meaning: "An unlockable Keeper skin (150 ◈) that activates advanced signing capabilities — multi-sig provenance events, key ceremony tools, and advanced cryptographic functions.",
      },
      {
        term: "Celestial Codex",
        meaning: "The Keeper's companion tool — a floating reference panel that surfaces platform documentation, WID specifications, and doctrine pages alongside the Keeper's active session.",
      },
      {
        term: "Keeper Character Sheet",
        meaning: "A summary of your Keeper's current configuration — active skin, unlocked modes, attribute settings, and session history. The character sheet is part of your creator identity.",
      },
      {
        term: "◈ (Nexus Points)",
        meaning: "The platform's internal currency used to unlock Keeper skins and capabilities. Earned through platform participation and purchasable directly. The hexagonal symbol ◈ represents the platform's core geometry.",
        core: true,
      },
    ],
  },

  {
    id: "spaces",
    label: "Spaces & Community",
    tagline: "The rooms you enter on this platform are not feeds. They are shared experiences.",
    image: SECTION_IMAGES.sanctuary,
    color: "#C49A28",
    entries: [
      {
        term: "Sanctuary",
        elsewhere: "Live Room / Session",
        meaning: "A live, shared listening space. A room where registered Works play in real time for everyone present. The Sanctuary is communal, reverent, and built by its participants.",
        core: true,
      },
      {
        term: "Sanctuary Queue",
        elsewhere: "Playlist",
        meaning: "The live sequence of Works playing in a Sanctuary. Built by the community one Slot at a time. No algorithm selects what plays — only the people in the room.",
        core: true,
      },
      {
        term: "Slot",
        meaning: "A position in the Sanctuary Queue. Hosting a Slot means paying $0.88 to place a specific Work in the live queue. You chose it. It plays for the room. The act of choosing is the act of curation.",
        core: true,
      },
      {
        term: "Host a Slot",
        elsewhere: "Queue a Song",
        meaning: "To pay $0.88 to place a Work in the live Sanctuary queue. The host's identity is attached to the Slot — the room knows who brought this Work.",
      },
      {
        term: "Celestial Lounge",
        meaning: "A named Sanctuary space — a specific room within the platform's live listening infrastructure. Each Lounge has its own queue, atmosphere, and community.",
      },
      {
        term: "Discover",
        elsewhere: "Feed / Explore",
        meaning: "The public catalog of registered Works available to the entire network. Discovery on Living Nexus is driven by provenance connections and creator relationships — not engagement metrics.",
      },
      {
        term: "Explore",
        elsewhere: "Trending / Charts",
        meaning: "Works gaining acknowledgment across the network. Signal without manipulation — the Explore surface reflects genuine community activity, not promoted content.",
      },
      {
        term: "Signals",
        elsewhere: "Notifications",
        meaning: "Real-time alerts when your Work is witnessed, honored, referenced, or carried by the network. Signals are provenance events — they become part of your Chain of Record.",
      },
      {
        term: "Witness Flow",
        meaning: "The stream of witness acknowledgments flowing into a Work or creator's record in real time. The Witness Flow is visible on creator profiles and Work detail pages.",
      },
      {
        term: "Witness Registry",
        meaning: "The complete record of all witness acknowledgments attached to a Work — who witnessed it, when, and any testimony they left. Part of the Work's Chain of Record.",
      },
      {
        term: "Resonance Heatmaps",
        meaning: "A Creator Studio analytics feature showing which parts of a Work generated the most witness engagement — visualized as a heat map across the Work's timeline.",
      },
      {
        term: "Witness Engagement Timeline",
        meaning: "A chronological view of all witness activity on a Work — showing when acknowledgments, testimonies, and references occurred relative to the Work's registration date.",
      },
    ],
  },

  {
    id: "actions",
    label: "Actions & Gestures",
    tagline: "Every action on this platform is a record. Choose deliberately.",
    image: SECTION_IMAGES.community,
    color: "#7B9EA6",
    entries: [
      {
        term: "Witness a Work",
        elsewhere: "Like / Heart",
        meaning: "To formally acknowledge a specific piece of creative work. Not a reaction — a record. Witnessing a Work adds to its Chain of Record and signals its significance to the network.",
        core: true,
      },
      {
        term: "Witness (a creator)",
        elsewhere: "Follow",
        meaning: "To formally acknowledge a creator's existence and work. Not a passive subscription — an act of recognition. You are saying: I see you, and I am standing in acknowledgment of your record.",
        core: true,
      },
      {
        term: "Carry",
        elsewhere: "Share",
        meaning: "To take someone's Work into your own network. You carry it — and the origin comes with it. The provenance travels with the Work wherever it goes.",
      },
      {
        term: "Leave a Mark",
        elsewhere: "Comment",
        meaning: "A timestamped response attached to a Work. Part of the record. Marks are not ephemeral comments — they become part of the Work's provenance history.",
      },
      {
        term: "Honor",
        elsewhere: "Tip / Donate",
        meaning: "A direct financial acknowledgment sent to a creator. Not charity — reciprocity. You are returning value for value received.",
      },
      {
        term: "Witness Testimony",
        meaning: "A written statement from a community member attesting to the significance, authenticity, or impact of a Work. Testimonies become part of the Work's provenance record.",
      },
      {
        term: "Contribution Breakdown",
        meaning: "A Creator Studio view showing how different community members have contributed to a Work's provenance record — witnesses, testimonies, references, and honors.",
      },
    ],
  },

  {
    id: "economy",
    label: "Economy & Reciprocity",
    tagline: "Value flows back to creators. That is not a feature — it is the architecture.",
    image: SECTION_IMAGES.economy,
    color: "#C49A28",
    entries: [
      {
        term: "Reciprocity",
        elsewhere: "Monetization",
        meaning: "The return of value to a creator for what they have given. Not monetization — acknowledgment with weight. The platform is built on the principle that creators deserve to receive what they have given.",
        core: true,
      },
      {
        term: "Covenant",
        elsewhere: "Platform Fee / Terms of Service",
        meaning: "The agreement between creator and platform. Living Nexus keeps 10%. Creators keep 90%. The Covenant is not a fine-print clause — it is the foundational economic agreement.",
        core: true,
      },
      {
        term: "Covenant Partner",
        meaning: "A creator or organization that has entered into a formal licensing or collaboration agreement with another entity on the platform, governed by the platform's Covenant framework.",
      },
      {
        term: "Covenant Moderation",
        meaning: "The process of reviewing and enforcing the platform's Covenant agreements — ensuring that the 90/10 split is honored and that creator rights are protected.",
      },
      {
        term: "Living Archive Subscription",
        meaning: "A premium tier giving creators access to expanded storage, advanced provenance tools, and priority registration. The Living Archive is the creator's permanent home on the platform.",
      },
      {
        term: "Slot Package",
        meaning: "A purchasable bundle of Sanctuary Slots — 10, 30, or 50 slots at $0.88 each. Slots are used to place Works in the live Sanctuary queue.",
      },
      {
        term: "Founding Creator — $88.88",
        meaning: "The price of Founding Creator status during the Founder's Era. The number 88 carries significance on the platform — it represents the covenant price, the Slot unit price ($0.88), and the platform's founding numerology.",
      },
      {
        term: "◈ (Nexus Points)",
        meaning: "The platform's internal currency. Used to unlock Keeper skins, capabilities, and platform features. The hexagonal symbol represents the platform's core geometry — six sides, one center.",
        core: true,
      },
      {
        term: "Collector Editions",
        meaning: "Limited-release registered Works with enhanced provenance documentation — numbered editions, special WID certificates, and exclusive Chain of Record events.",
      },
    ],
  },

  {
    id: "doctrine",
    label: "Doctrine & Covenant",
    tagline: "The words we use shape what we believe. These words were chosen deliberately.",
    image: SECTION_IMAGES.doctrine,
    color: "#C49A28",
    entries: [
      {
        term: "Doctrine",
        meaning: "The foundational principles governing how Living Nexus operates — its values, its language, its economic model, and its stance on AI and human authorship. Doctrine is not marketing copy. It is the platform's constitution.",
        core: true,
      },
      {
        term: "Manifesto",
        meaning: "The public declaration of Living Nexus's purpose, values, and position in the world. The Manifesto is a living document — it evolves as the platform evolves, but its core commitments do not change.",
        core: true,
      },
      {
        term: "Creator Sovereignty",
        meaning: "The principle that creators own their Work, their identity, and their provenance record — and that the platform exists to protect and amplify that ownership, not to extract value from it.",
        core: true,
      },
      {
        term: "Testimony",
        meaning: "A first-person account of creative experience, process, or impact. On Living Nexus, testimony is a provenance act — it becomes part of the permanent record. Testimony is not anecdote. It is evidence.",
        core: true,
      },
      {
        term: "Witness",
        meaning: "The act of formally acknowledging another's existence, work, or testimony. To witness is to say: I see this, and I am standing in acknowledgment of it. Witnessing is the platform's core relational gesture.",
        core: true,
      },
      {
        term: "Command Domains LLC",
        meaning: "The parent company and intellectual property holder behind Living Nexus. The platform's doctrine, methodology, and provenance system are the intellectual property of Command Domains LLC.",
      },
      {
        term: "BDDT (Breakthrough Doctrine & Deployment Training)",
        meaning: "The patent-pending methodology developed by the platform's founder — a framework for processing lived experience, acknowledging failure, recovering from it, and carrying the weight of that experience into creative and professional work.",
        core: true,
      },
      {
        term: "Testimonial Completion",
        meaning: "A BDDT methodology concept — the process of bringing a testimony to its full expression, ensuring that the lived experience is fully articulated, attributed, and recorded rather than suppressed or extracted.",
      },
      {
        term: "Sovereign Shutter",
        meaning: "The doctrine of maintaining human control over the creative process in the age of AI. The moment a human creator decides what is made, what is kept, and what is registered — that decision is the Sovereign Shutter.",
      },
      {
        term: "Pathology of Emergence",
        meaning: "The doctrine describing what happens when AI systems generate without human authorship — the gradual erosion of origin, attribution, and creative sovereignty. Living Nexus exists in direct opposition to this pathology.",
        core: true,
      },
      {
        term: "Reciprocity for Others",
        meaning: "The motivating principle behind the platform's economic model — that the value extracted from lived experience, creative work, and human testimony must be returned to the people who generated it.",
        core: true,
      },
      {
        term: "Doctrine Phrases Canonized",
        meaning: "Platform language that has been formally adopted into the Living Nexus doctrine — terms that have been tested, refined, and declared as part of the platform's permanent vocabulary.",
      },
      {
        term: "Earliest Provenance Anchors",
        meaning: "The first Works registered on the platform — the foundational entries in the Living Nexus provenance chain. These Works carry the earliest timestamps and are part of the Founder's Era record.",
      },
    ],
  },
];

// ── Component ──────────────────────────────────────────────────────────────────
export default function LexiconPage() {
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Filter entries across all sections
  const q = query.trim().toLowerCase();
  const filteredSections = SECTIONS.map((s) => ({
    ...s,
    entries: q
      ? s.entries.filter(
          (e) =>
            e.term.toLowerCase().includes(q) ||
            e.meaning.toLowerCase().includes(q) ||
            (e.elsewhere && e.elsewhere.toLowerCase().includes(q))
        )
      : s.entries,
  })).filter((s) => s.entries.length > 0);

  const totalTerms = SECTIONS.reduce((acc, s) => acc + s.entries.length, 0);

  const toggleTerm = (key: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--ln-coal)" }}>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ minHeight: "420px" }}>
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${SECTION_IMAGES.identity})`, filter: "brightness(0.25)" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, var(--ln-coal) 100%)" }} />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#C49A28 1px, transparent 1px), linear-gradient(90deg, #C49A28 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase mb-6"
            style={{ background: "rgba(196,154,40,0.1)", color: "var(--ln-gold)", border: "1px solid rgba(196,154,40,0.25)" }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Platform Language Reference
          </div>
          <h1
            className="text-4xl sm:text-6xl font-bold tracking-tight mb-5"
            style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
          >
            The Living Nexus Lexicon
          </h1>
          <p className="text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-4" style={{ color: "var(--ln-smoke)" }}>
            This platform speaks a different language. Not because it is trying to be different — but because the words we use shape what we believe about creation, identity, and value.
          </p>
          <p className="text-sm" style={{ color: "var(--ln-iron)" }}>
            {totalTerms} terms across {SECTIONS.length} sections
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto mt-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--ln-iron)" }} />
            <input
              type="text"
              placeholder="Search any term, concept, or phrase…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3.5 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "color-mix(in srgb, var(--ln-obsidian) 90%, transparent)",
                border: "1px solid rgba(196,154,40,0.2)",
                color: "var(--ln-parchment)",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: "var(--ln-iron)" }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Opening quote ── */}
      {!q && (
        <div className="max-w-3xl mx-auto px-6 py-8 text-center">
          <blockquote className="text-base italic leading-relaxed" style={{ color: "var(--ln-smoke)" }}>
            "Words have power. Power has meaning. Meaning is what changes the internal state of the witness."
          </blockquote>
          <p className="text-xs mt-2" style={{ color: "var(--ln-iron)" }}>— Command Domains LLC</p>
        </div>
      )}

      {/* ── Layout: TOC + Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="flex gap-8 items-start">

          {/* ── Sticky Section TOC (desktop) ── */}
          {!q && (
            <aside className="hidden lg:block w-52 flex-shrink-0 sticky top-6 pt-4">
              <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--ln-iron)" }}>
                Sections
              </p>
              <nav className="space-y-1">
                {SECTIONS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
                    style={{
                      color: activeSection === s.id ? s.color : "var(--ln-smoke)",
                      background: activeSection === s.id ? `${s.color}12` : "transparent",
                      borderLeft: activeSection === s.id ? `2px solid ${s.color}` : "2px solid transparent",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </nav>
              <div className="mt-8 pt-6" style={{ borderTop: "1px solid rgba(196,154,40,0.08)" }}>
                <p className="text-xs mb-3" style={{ color: "var(--ln-iron)" }}>Legend</p>
                <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--ln-smoke)" }}>
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-xs font-semibold"
                    style={{ background: "rgba(196,154,40,0.15)", color: "var(--ln-gold)", fontSize: "9px" }}
                  >
                    CORE
                  </span>
                  Foundational term
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ln-smoke)" }}>
                  <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: "var(--ln-iron)" }} />
                  Replaces this term
                </div>
              </div>
            </aside>
          )}

          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 space-y-20 pt-4">
            {filteredSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                ref={(el) => { sectionRefs.current[section.id] = el; }}
              >
                {/* Section hero image */}
                <div
                  className="relative rounded-2xl overflow-hidden mb-8"
                  style={{ height: "220px" }}
                >
                  <img
                    src={section.image}
                    alt={section.label}
                    className="w-full h-full object-cover"
                    style={{ filter: "brightness(0.6)" }}
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }}
                  />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-1.5 h-5 rounded-full" style={{ background: section.color }} />
                      <h2
                        className="text-xl sm:text-2xl font-bold tracking-tight"
                        style={{ fontFamily: "'Cinzel', serif", color: "var(--ln-parchment)" }}
                      >
                        {section.label}
                      </h2>
                    </div>
                    <p className="text-sm max-w-lg" style={{ color: "color-mix(in srgb, var(--ln-parchment) 75%, transparent)" }}>
                      {section.tagline}
                    </p>
                    <p className="text-xs mt-2" style={{ color: "rgba(107,101,85,0.8)" }}>
                      {section.entries.length} terms
                    </p>
                  </div>
                </div>

                {/* Term cards */}
                <div className="space-y-2">
                  {section.entries.map((entry) => {
                    const key = `${section.id}::${entry.term}`;
                    const isOpen = expandedTerms.has(key);
                    return (
                      <div
                        key={key}
                        className="rounded-xl overflow-hidden transition-all"
                        style={{
                          background: isOpen ? "rgba(44,52,56,0.7)" : "rgba(28,26,20,0.8)",
                          border: isOpen
                            ? `1px solid ${section.color}30`
                            : "1px solid rgba(44,52,56,0.4)",
                        }}
                      >
                        {/* Header row — always visible */}
                        <button
                          className="w-full flex items-center gap-4 px-5 py-4 text-left"
                          onClick={() => toggleTerm(key)}
                        >
                          {/* Core badge */}
                          {entry.core && (
                            <span
                              className="flex-shrink-0 text-xs font-bold tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: `${section.color}18`, color: section.color, fontSize: "9px" }}
                            >
                              CORE
                            </span>
                          )}

                          {/* Term name */}
                          <span
                            className="font-semibold text-sm sm:text-base flex-1"
                            style={{ color: isOpen ? section.color : "var(--ln-parchment)" }}
                          >
                            {entry.term}
                          </span>

                          {/* Elsewhere tag */}
                          {entry.elsewhere && (
                            <span
                              className="hidden sm:flex items-center gap-1.5 text-xs flex-shrink-0"
                              style={{ color: "var(--ln-iron)" }}
                            >
                              <span className="line-through opacity-60">{entry.elsewhere}</span>
                              <ArrowRight className="w-3 h-3 opacity-40" />
                            </span>
                          )}

                          {/* Chevron */}
                          <span style={{ color: "var(--ln-iron)" }} className="flex-shrink-0">
                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </button>

                        {/* Expanded definition */}
                        {isOpen && (
                          <div
                            className="px-5 pb-5"
                            style={{ borderTop: `1px solid ${section.color}15` }}
                          >
                            {/* Mobile elsewhere tag */}
                            {entry.elsewhere && (
                              <div className="sm:hidden flex items-center gap-1.5 text-xs mb-3 mt-3" style={{ color: "var(--ln-iron)" }}>
                                <span className="text-xs" style={{ color: "var(--ln-iron)" }}>Elsewhere called:</span>
                                <span className="line-through opacity-60">{entry.elsewhere}</span>
                              </div>
                            )}
                            <p
                              className="text-sm leading-relaxed mt-3"
                              style={{ color: "var(--ln-smoke)" }}
                            >
                              {entry.meaning}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* No results */}
            {filteredSections.length === 0 && (
              <div className="text-center py-24">
                <p className="text-base mb-2" style={{ color: "var(--ln-smoke)" }}>
                  No terms found for "{query}"
                </p>
                <button
                  onClick={() => setQuery("")}
                  className="text-sm underline"
                  style={{ color: "var(--ln-iron)" }}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer CTA ── */}
      <div
        className="border-t px-6 py-16 text-center"
        style={{ borderColor: "rgba(196,154,40,0.08)" }}
      >
        <div className="max-w-xl mx-auto">
          <p className="text-base mb-2" style={{ color: "var(--ln-parchment)" }}>
            Ready to enter the record?
          </p>
          <p className="text-sm mb-8" style={{ color: "var(--ln-smoke)" }}>
            Register your first Work and receive your Witness ID.
          </p>
          <Link href="/upload">
            <button
              className="px-8 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all hover:opacity-90"
              style={{ background: "var(--ln-gold)", color: "var(--ln-coal)" }}
            >
              Register a Work →
            </button>
          </Link>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs" style={{ color: "var(--ln-iron)" }}>
            <Link href="/doctrine/wid-spec" className="hover:underline" style={{ color: "var(--ln-iron)" }}>
              WID Specification
            </Link>
            <span>·</span>
            <Link href="/manifesto" className="hover:underline" style={{ color: "var(--ln-iron)" }}>
              The Manifesto
            </Link>
            <span>·</span>
            <Link href="/doctrine/haai" className="hover:underline" style={{ color: "var(--ln-iron)" }}>
              HA AI Doctrine
            </Link>
            <span>·</span>
            <Link href="/founders" className="hover:underline" style={{ color: "var(--ln-iron)" }}>
              Founding Creators
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
