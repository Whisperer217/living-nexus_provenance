/**
 * NewManifestationPage
 *
 * The Creative Operating System entry point.
 * This screen asks the three human questions before any work begins:
 *   1. What is this called? (Manifestation Name)
 *   2. Why does this exist? (Creator Intent)
 *   3. What medium? (Music / Book / Research / Film / Visual Art / Software)
 *
 * The moment the creator presses "Start Session", Living Nexus issues a Session ID.
 * Every prompt, image, lyric, revision, and AI response from that point forward
 * becomes part of the provenance graph — an append-only record of the creative journey.
 *
 * The work is protected before it exists.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Music, BookOpen, FlaskConical, Film, Palette, Code2, Layers,
  ArrowRight, Sparkles, Shield, Clock, ChevronDown, ChevronUp,
  CheckSquare, Square, User, Cpu,
} from "lucide-react";

// ─── Medium definitions ───────────────────────────────────────────────────────

const MEDIUMS = [
  {
    key: "music" as const,
    label: "Music",
    icon: Music,
    description: "Songs, compositions, soundscapes, albums",
    color: "from-violet-500/20 to-purple-500/20 border-violet-500/40",
    activeColor: "from-violet-500/30 to-purple-500/30 border-violet-400",
    iconColor: "text-violet-400",
  },
  {
    key: "book" as const,
    label: "Book",
    icon: BookOpen,
    description: "Novels, memoirs, poetry, scripture",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/40",
    activeColor: "from-amber-500/30 to-orange-500/30 border-amber-400",
    iconColor: "text-amber-400",
  },
  {
    key: "research" as const,
    label: "Research",
    icon: FlaskConical,
    description: "Academic work, doctrine, methodology",
    color: "from-cyan-500/20 to-teal-500/20 border-cyan-500/40",
    activeColor: "from-cyan-500/30 to-teal-500/30 border-cyan-400",
    iconColor: "text-cyan-400",
  },
  {
    key: "film" as const,
    label: "Film",
    icon: Film,
    description: "Short films, documentaries, visual stories",
    color: "from-rose-500/20 to-pink-500/20 border-rose-500/40",
    activeColor: "from-rose-500/30 to-pink-500/30 border-rose-400",
    iconColor: "text-rose-400",
  },
  {
    key: "visual_art" as const,
    label: "Visual Art",
    icon: Palette,
    description: "Paintings, photography, digital art, design",
    color: "from-green-500/20 to-emerald-500/20 border-green-500/40",
    activeColor: "from-green-500/30 to-emerald-500/30 border-green-400",
    iconColor: "text-green-400",
  },
  {
    key: "software" as const,
    label: "Software",
    icon: Code2,
    description: "Applications, tools, systems, platforms",
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/40",
    activeColor: "from-blue-500/30 to-indigo-500/30 border-blue-400",
    iconColor: "text-blue-400",
  },
  {
    key: "other" as const,
    label: "Other",
    icon: Layers,
    description: "Mixed media, performance, or undefined",
    color: "from-slate-500/20 to-gray-500/20 border-slate-500/40",
    activeColor: "from-slate-500/30 to-gray-500/30 border-slate-400",
    iconColor: "text-slate-400",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewManifestationPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  // Form state
  const [name, setName] = useState("");
  const [intent, setIntent] = useState("");
  const [medium, setMedium] = useState<typeof MEDIUMS[number]["key"] | "">("");
  const [declaration, setDeclaration] = useState("");
  const [collaborators, setCollaborators] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [humanContribs, setHumanContribs] = useState<string[]>([]);
  const [aiContribs, setAiContribs] = useState<string[]>([]);

  const toggleHuman = (key: string) =>
    setHumanContribs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const toggleAI = (key: string) =>
    setAiContribs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  // Session creation
  const createSession = trpc.sessions.create.useMutation({
    onSuccess: (data) => {
      // Navigate to the Manifestation Workspace with the new session
      navigate(`/manifestation/${data.session.id}`);
    },
  });

  // Auth gate
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Shield className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Sign in to begin</h2>
          <p className="text-slate-400 text-sm mb-6">
            A Manifestation Session is anchored to your creator identity. Sign in to issue your Session ID.
          </p>
          <a
            href={getLoginUrl("/new-manifestation")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const selectedMedium = MEDIUMS.find(m => m.key === medium);
  const canStart = name.trim().length > 0 && intent.trim().length > 0 && medium !== "";

  const handleStart = () => {
    if (!canStart || createSession.isPending) return;
    createSession.mutate({
      name: name.trim(),
      intent: intent.trim(),
      medium: medium as typeof MEDIUMS[number]["key"],
      declaration: declaration.trim() || undefined,
      collaborators: collaborators.trim() || undefined,
      humanContributions: humanContribs.length > 0 ? humanContribs : undefined,
      aiContributions: aiContribs.length > 0 ? aiContribs : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← Living Nexus
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Clock className="w-3 h-3" />
          <span>Session ID issued at declaration</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Title */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3" />
            Creative Operating System
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            + New Manifestation
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
            The work is protected before it exists. Every decision, prompt, and revision
            from this moment forward becomes part of the provenance record.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-8">

          {/* Step 1: Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="text-violet-400 mr-2">01</span>
              Manifestation Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Armor of Light"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-colors text-lg"
              maxLength={256}
            />
            <p className="text-xs text-slate-600 mt-1.5">
              The canonical name of this creative work. This becomes part of your Session WID.
            </p>
          </div>

          {/* Step 2: Intent */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <span className="text-violet-400 mr-2">02</span>
              Creator Intent
            </label>
            <textarea
              value={intent}
              onChange={e => setIntent(e.target.value)}
              placeholder="This work exists to..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 focus:bg-white/8 transition-colors resize-none leading-relaxed"
              maxLength={2000}
            />
            <div className="flex justify-between mt-1.5">
              <p className="text-xs text-slate-600">
                Why does this work exist? What is it for? This is your declaration of intent — the anchor of the entire provenance chain.
              </p>
              <span className="text-xs text-slate-600 shrink-0 ml-4">{intent.length}/2000</span>
            </div>
          </div>

          {/* Step 3: Medium */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              <span className="text-violet-400 mr-2">03</span>
              Medium
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {MEDIUMS.map(m => {
                const Icon = m.icon;
                const isSelected = medium === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMedium(m.key)}
                    className={`
                      relative p-4 rounded-xl border bg-gradient-to-br text-left transition-all
                      ${isSelected ? m.activeColor : m.color}
                      hover:opacity-90
                    `}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${m.iconColor}`} />
                    <div className="text-sm font-medium text-white">{m.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5 leading-tight">{m.description}</div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/80" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced (optional) */}
          <div>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Advanced (optional)
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-5 pl-4 border-l border-white/5">

                {/* Human Contributions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-sky-400" />
                    <label className="text-sm font-medium text-slate-300">Human Contributions</label>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: "vision",      label: "Vision" },
                      { key: "story",       label: "Story" },
                      { key: "lyrics",      label: "Lyrics" },
                      { key: "editing",     label: "Editing" },
                      { key: "arrangement", label: "Arrangement" },
                      { key: "direction",   label: "Direction" },
                      { key: "performance", label: "Performance" },
                      { key: "research",    label: "Research" },
                    ].map(({ key, label }) => {
                      const checked = humanContribs.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleHuman(key)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                            checked
                              ? "border-sky-600/50 bg-sky-900/20 text-sky-300"
                              : "border-white/8 bg-white/3 text-slate-400 hover:border-white/15"
                          }`}
                        >
                          {checked
                            ? <CheckSquare className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            : <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          }
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AI Contributions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-4 h-4 text-rose-400" />
                    <label className="text-sm font-medium text-slate-300">AI Contributions</label>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { key: "text_generation",  label: "Text Generation" },
                      { key: "image_generation", label: "Image Generation" },
                      { key: "music_assistance", label: "Music Assistance" },
                      { key: "voice",            label: "Voice" },
                      { key: "coding",           label: "Coding" },
                      { key: "research_assist",  label: "Research Assist" },
                    ].map(({ key, label }) => {
                      const checked = aiContribs.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleAI(key)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                            checked
                              ? "border-rose-600/50 bg-rose-900/20 text-rose-300"
                              : "border-white/8 bg-white/3 text-slate-400 hover:border-white/15"
                          }`}
                        >
                          {checked
                            ? <CheckSquare className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            : <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          }
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Declaration */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Formal Declaration
                  </label>
                  <textarea
                    value={declaration}
                    onChange={e => setDeclaration(e.target.value)}
                    placeholder="I, [name], declare that this work is an original creation..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/40 transition-colors resize-none text-sm"
                    maxLength={2000}
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    A formal declaration of authorship. This is appended to the provenance graph at session creation.
                  </p>
                </div>

                {/* Collaborators */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Collaborators
                  </label>
                  <input
                    type="text"
                    value={collaborators}
                    onChange={e => setCollaborators(e.target.value)}
                    placeholder="e.g. AI tools, co-writers, producers"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/40 transition-colors text-sm"
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    List any collaborators, AI tools, or co-creators involved in this manifestation.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Session WID preview */}
          {name.trim() && (
            <div className="rounded-lg bg-white/3 border border-white/8 px-4 py-3 flex items-center gap-3">
              <Shield className="w-4 h-4 text-violet-400 shrink-0" />
              <div>
                <div className="text-xs text-slate-500 mb-0.5">Session WID will be issued as</div>
                <div className="text-sm font-mono text-violet-300">
                  LN-SESSION-{name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20)}-####
                </div>
              </div>
            </div>
          )}

          {/* Start Session button */}
          <button
            onClick={handleStart}
            disabled={!canStart || createSession.isPending}
            className={`
              w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-3 transition-all
              ${canStart && !createSession.isPending
                ? "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                : "bg-white/5 text-slate-600 cursor-not-allowed"
              }
            `}
          >
            {createSession.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Issuing Session ID…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Start Session
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {createSession.isError && (
            <p className="text-center text-sm text-rose-400">
              {createSession.error?.message || "Failed to create session. Please try again."}
            </p>
          )}

          {/* Doctrine note */}
          <p className="text-center text-xs text-slate-600 leading-relaxed">
            The moment you press Start Session, Living Nexus issues a Session ID.
            Every prompt, image, lyric, version, and edit becomes part of the provenance graph.
            <br />
            <span className="text-slate-500">The beginning is protected before the work exists.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
