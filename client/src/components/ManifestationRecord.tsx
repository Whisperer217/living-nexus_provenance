/**
 * ManifestationRecord — The Canonical Provenance Document
 *
 * This is the living record of a creative journey. It surfaces:
 *   1. Origin (name, purpose, intent)
 *   2. Human Contributions
 *   3. AI Contributions
 *   4. Transformation Summary
 *   5. Declaration
 *   6. Witness ID (Session WID + Work WID)
 *   7. Relationship Graph (parent session, linked Guide WID)
 *
 * Can be rendered in two modes:
 *   - "edit"   — creator is filling in the record during the session
 *   - "view"   — public read-only provenance certificate
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, User, Cpu, GitBranch, FileText, Shield, Layers,
  CheckSquare, Square, Save, ExternalLink, Copy, Check
} from "lucide-react";
import { Link } from "wouter";

// ─── Contribution Definitions ─────────────────────────────────────────────────

const HUMAN_CONTRIBUTIONS = [
  { key: "vision",      label: "Vision",      desc: "The originating idea and creative direction" },
  { key: "story",       label: "Story",        desc: "Narrative structure, arc, and meaning" },
  { key: "lyrics",      label: "Lyrics",       desc: "Written words, verses, and poetic content" },
  { key: "editing",     label: "Editing",      desc: "Revision, refinement, and curation decisions" },
  { key: "arrangement", label: "Arrangement",  desc: "Musical structure, instrumentation choices" },
  { key: "direction",   label: "Direction",    desc: "Creative direction and final approval authority" },
  { key: "performance", label: "Performance",  desc: "Vocal or instrumental performance" },
  { key: "research",    label: "Research",     desc: "Source gathering, fact-finding, and reference work" },
  { key: "design",      label: "Design",       desc: "Visual composition, layout, and aesthetic choices" },
] as const;

const AI_CONTRIBUTIONS = [
  { key: "text_generation",   label: "Text Generation",   desc: "AI-generated prose, lyrics, or copy" },
  { key: "image_generation",  label: "Image Generation",  desc: "AI-generated visual assets" },
  { key: "music_assistance",  label: "Music Assistance",  desc: "AI-generated or AI-assisted audio/music" },
  { key: "voice",             label: "Voice",             desc: "AI-generated or AI-cloned voice content" },
  { key: "coding",            label: "Coding",            desc: "AI-generated code or software logic" },
  { key: "research_assist",   label: "Research Assist",   desc: "AI-assisted research, summarization, or analysis" },
  { key: "translation",       label: "Translation",       desc: "AI-assisted language translation" },
  { key: "editing_assist",    label: "Editing Assist",    desc: "AI-assisted editing, grammar, or refinement" },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ManifestationRecordProps {
  session: {
    id: number;
    sessionWid: string;
    name: string;
    intent: string;
    medium: string;
    declaration?: string | null;
    guideWid?: string | null;
    workWid?: string | null;
    humanContributions?: string[] | null;
    aiContributions?: string[] | null;
    transformationSummary?: string | null;
    parentSessionId?: number | null;
    status: string;
    createdAt: Date;
  };
  mode?: "edit" | "view";
  onSaved?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ManifestationRecord({ session, mode = "edit", onSaved }: ManifestationRecordProps) {
  const [copied, setCopied] = useState(false);

  // Local editable state
  const [humanContribs, setHumanContribs] = useState<string[]>(
    (session.humanContributions as string[] | null) ?? []
  );
  const [aiContribs, setAiContribs] = useState<string[]>(
    (session.aiContributions as string[] | null) ?? []
  );
  const [transformationSummary, setTransformationSummary] = useState(
    session.transformationSummary ?? ""
  );
  const [declaration, setDeclaration] = useState(session.declaration ?? "");

  const updateRecord = trpc.sessions.updateRecord.useMutation({
    onSuccess: () => {
      toast.success("Record saved", { description: "Your Manifestation Record has been updated." });
      onSaved?.();
    },
    onError: (err) => {
      toast.error("Save failed", { description: err.message });
    },
  });

  const toggleContrib = (
    key: string,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  };

  const handleSave = () => {
    updateRecord.mutate({
      sessionId: session.id,
      humanContributions: humanContribs,
      aiContributions: aiContribs,
      transformationSummary,
      declaration,
    });
  };

  const copyWid = (wid: string) => {
    navigator.clipboard.writeText(wid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isEditing = mode === "edit";

  const mediumLabel: Record<string, string> = {
    music: "Music", book: "Book", research: "Research",
    film: "Film", visual_art: "Visual Art", software: "Software", other: "Other",
  };

  return (
    <div className="space-y-6 text-sm">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-mono text-stone-500 uppercase tracking-widest">
              Manifestation Record
            </span>
          </div>
          <h2 className="text-xl font-semibold text-stone-100">{session.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs border-stone-600 text-stone-400">
              {mediumLabel[session.medium] ?? session.medium}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs border-stone-600 ${
                session.status === "completed"
                  ? "text-emerald-400 border-emerald-700"
                  : session.status === "active"
                  ? "text-violet-400 border-violet-700"
                  : "text-stone-400"
              }`}
            >
              {session.status}
            </Badge>
          </div>
        </div>
        {isEditing && (
          <Button
            onClick={handleSave}
            disabled={updateRecord.isPending}
            size="sm"
            className="bg-violet-600 hover:bg-violet-500 text-white shrink-0"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {updateRecord.isPending ? "Saving…" : "Save Record"}
          </Button>
        )}
      </div>

      {/* ── Section 1: Origin ───────────────────────────────────────────────── */}
      <RecordSection icon={<BookOpen className="w-4 h-4 text-amber-400" />} title="Origin">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Purpose / Intent</div>
            <p className="text-stone-300 leading-relaxed">{session.intent}</p>
          </div>
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Medium</div>
            <p className="text-stone-300">{mediumLabel[session.medium] ?? session.medium}</p>
          </div>
          <div>
            <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Session Opened</div>
            <p className="text-stone-400 font-mono text-xs">
              {new Date(session.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </RecordSection>

      {/* ── Section 2: Human Contributions ──────────────────────────────────── */}
      <RecordSection icon={<User className="w-4 h-4 text-sky-400" />} title="Human Contributions">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HUMAN_CONTRIBUTIONS.map(({ key, label, desc }) => {
            const checked = humanContribs.includes(key);
            return (
              <button
                key={key}
                onClick={() => isEditing && toggleContrib(key, humanContribs, setHumanContribs)}
                disabled={!isEditing}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                  checked
                    ? "border-sky-600/60 bg-sky-900/20 text-sky-200"
                    : "border-stone-700/50 bg-stone-800/30 text-stone-400"
                } ${isEditing ? "hover:border-sky-500/60 cursor-pointer" : "cursor-default"}`}
              >
                {checked
                  ? <CheckSquare className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  : <Square className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                }
                <div>
                  <div className="font-medium text-xs">{label}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        {humanContribs.length === 0 && !isEditing && (
          <p className="text-stone-500 text-xs italic">No human contributions recorded.</p>
        )}
      </RecordSection>

      {/* ── Section 3: AI Contributions ─────────────────────────────────────── */}
      <RecordSection icon={<Cpu className="w-4 h-4 text-rose-400" />} title="AI Contributions">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AI_CONTRIBUTIONS.map(({ key, label, desc }) => {
            const checked = aiContribs.includes(key);
            return (
              <button
                key={key}
                onClick={() => isEditing && toggleContrib(key, aiContribs, setAiContribs)}
                disabled={!isEditing}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors ${
                  checked
                    ? "border-rose-600/60 bg-rose-900/20 text-rose-200"
                    : "border-stone-700/50 bg-stone-800/30 text-stone-400"
                } ${isEditing ? "hover:border-rose-500/60 cursor-pointer" : "cursor-default"}`}
              >
                {checked
                  ? <CheckSquare className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  : <Square className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                }
                <div>
                  <div className="font-medium text-xs">{label}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{desc}</div>
                </div>
              </button>
            );
          })}
        </div>
        {aiContribs.length === 0 && !isEditing && (
          <p className="text-stone-500 text-xs italic">No AI contributions recorded.</p>
        )}
      </RecordSection>

      {/* ── Section 4: Transformation Summary ───────────────────────────────── */}
      <RecordSection icon={<GitBranch className="w-4 h-4 text-emerald-400" />} title="Transformation Summary">
        {isEditing ? (
          <Textarea
            value={transformationSummary}
            onChange={(e) => setTransformationSummary(e.target.value)}
            placeholder="Describe how this work evolved during the session — the decisions made, the pivots taken, the breakthroughs discovered. This is the testimony of the creative journey."
            className="min-h-[100px] bg-stone-800/50 border-stone-700 text-stone-200 placeholder:text-stone-600 text-sm resize-none"
          />
        ) : transformationSummary ? (
          <p className="text-stone-300 leading-relaxed whitespace-pre-wrap">{transformationSummary}</p>
        ) : (
          <p className="text-stone-500 text-xs italic">No transformation summary recorded.</p>
        )}
      </RecordSection>

      {/* ── Section 5: Declaration ───────────────────────────────────────────── */}
      <RecordSection icon={<FileText className="w-4 h-4 text-violet-400" />} title="Declaration">
        {isEditing ? (
          <Textarea
            value={declaration}
            onChange={(e) => setDeclaration(e.target.value)}
            placeholder="Your formal declaration of authorship and intent. This statement becomes part of the permanent provenance record. Example: 'I declare that this work originates from my lived experience and creative vision. The AI tools used were instruments under my direction.'"
            className="min-h-[100px] bg-stone-800/50 border-stone-700 text-stone-200 placeholder:text-stone-600 text-sm resize-none"
          />
        ) : declaration ? (
          <blockquote className="border-l-2 border-violet-500/50 pl-4 text-stone-300 leading-relaxed italic">
            {declaration}
          </blockquote>
        ) : (
          <p className="text-stone-500 text-xs italic">No declaration recorded.</p>
        )}
      </RecordSection>

      {/* ── Section 6: Witness ID ────────────────────────────────────────────── */}
      <RecordSection icon={<Shield className="w-4 h-4 text-amber-400" />} title="Witness ID">
        <div className="space-y-3">
          <WIDRow
            label="Session WID"
            wid={session.sessionWid}
            copied={copied}
            onCopy={copyWid}
            sublabel="Issued at intent declaration — the origin anchor"
          />
          {session.workWid && (
            <WIDRow
              label="Work WID"
              wid={session.workWid}
              copied={copied}
              onCopy={copyWid}
              sublabel="Issued at final registration — the canonical work anchor"
              accent="emerald"
            />
          )}
          {!session.workWid && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-stone-700 text-stone-500">
              <Shield className="w-4 h-4 opacity-40" />
              <span className="text-xs">Work WID will be issued when you register the final work</span>
            </div>
          )}
        </div>
      </RecordSection>

      {/* ── Section 7: Relationship Graph ───────────────────────────────────── */}
      <RecordSection icon={<GitBranch className="w-4 h-4 text-stone-400" />} title="Relationship Graph">
        {session.guideWid ? (
          <div className="space-y-2">
            <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">
              Linked Pre-Creation Declaration
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-900/10 border border-amber-700/30">
              <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-amber-300 font-mono truncate">{session.guideWid}</div>
                <div className="text-xs text-stone-500 mt-0.5">Guide WID — intent declared before creation began</div>
              </div>
              <Link href={`/guides/${session.guideWid}`}>
                <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 h-7 px-2">
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-stone-500 text-xs">
              No Guide WID linked. A Guide WID connects this work to a Pre-Creation Declaration —
              the strongest form of provenance on the platform.
            </p>
            {isEditing && (
              <Link href="/guides/upload">
                <Button variant="outline" size="sm" className="border-stone-700 text-stone-400 hover:text-stone-200 text-xs">
                  <BookOpen className="w-3 h-3 mr-1.5" />
                  Create a Guide WID
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Provenance chain visualization */}
        <div className="mt-4 pt-4 border-t border-stone-800">
          <div className="text-xs text-stone-500 uppercase tracking-wider mb-3">Provenance Chain</div>
          <div className="flex items-center gap-1 flex-wrap">
            {session.guideWid && (
              <>
                <ChainNode label="Guide WID" color="amber" />
                <ChainArrow />
              </>
            )}
            <ChainNode label="Session WID" color="violet" active />
            <ChainArrow />
            <ChainNode label="Creative Journey" color="stone" />
            <ChainArrow />
            {session.workWid ? (
              <ChainNode label="Work WID" color="emerald" />
            ) : (
              <ChainNode label="Work WID (pending)" color="stone" pending />
            )}
            <ChainArrow />
            <ChainNode label="Registry" color="stone" />
          </div>
        </div>
      </RecordSection>

      {/* ── Save button (bottom) ─────────────────────────────────────────────── */}
      {isEditing && (
        <div className="pt-2 border-t border-stone-800 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateRecord.isPending}
            className="bg-violet-600 hover:bg-violet-500 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateRecord.isPending ? "Saving…" : "Save Manifestation Record"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RecordSection({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/40 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-stone-800 bg-stone-900/60">
        {icon}
        <span className="text-xs font-semibold text-stone-300 uppercase tracking-widest">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function WIDRow({
  label, wid, copied, onCopy, sublabel, accent = "amber",
}: {
  label: string;
  wid: string;
  copied: boolean;
  onCopy: (wid: string) => void;
  sublabel?: string;
  accent?: "amber" | "emerald" | "violet";
}) {
  const colors = {
    amber:   "text-amber-300 bg-amber-900/20 border-amber-700/40",
    emerald: "text-emerald-300 bg-emerald-900/20 border-emerald-700/40",
    violet:  "text-violet-300 bg-violet-900/20 border-violet-700/40",
  };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[accent]}`}>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-stone-500 mb-0.5">{label}</div>
        <div className={`font-mono text-sm font-medium truncate ${colors[accent].split(" ")[0]}`}>
          {wid}
        </div>
        {sublabel && <div className="text-xs text-stone-500 mt-0.5">{sublabel}</div>}
      </div>
      <button
        onClick={() => onCopy(wid)}
        className="shrink-0 p-1.5 rounded hover:bg-stone-700/50 transition-colors"
        title="Copy WID"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-stone-500" />
        )}
      </button>
    </div>
  );
}

function ChainNode({
  label, color, active, pending,
}: { label: string; color: string; active?: boolean; pending?: boolean }) {
  const base = "text-xs px-2 py-1 rounded font-mono border";
  const colors: Record<string, string> = {
    amber:   "border-amber-700/50 text-amber-400 bg-amber-900/20",
    violet:  "border-violet-600/60 text-violet-300 bg-violet-900/30",
    emerald: "border-emerald-700/50 text-emerald-400 bg-emerald-900/20",
    stone:   "border-stone-700/50 text-stone-500 bg-stone-800/30",
  };
  return (
    <span className={`${base} ${colors[color] ?? colors.stone} ${active ? "ring-1 ring-violet-500/40" : ""} ${pending ? "opacity-50 border-dashed" : ""}`}>
      {label}
    </span>
  );
}

function ChainArrow() {
  return <span className="text-stone-600 text-xs">→</span>;
}
