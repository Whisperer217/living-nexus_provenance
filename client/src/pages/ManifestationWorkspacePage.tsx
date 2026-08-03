/**
 * ManifestationWorkspacePage
 *
 * The unified creative workspace for a Manifestation Session.
 * Every panel is anchored to the active session — all work flows
 * into the same provenance graph.
 *
 * Panels:
 *   Conversation | Music | Images | Storyboard | Lyrics
 *   Timeline     | Registry | Evidence | Versions | Collaborators | Publish
 */

import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  MessageSquare, Music, Image, Film, FileText,
  Clock, Shield, FileCheck, GitBranch, Users, Upload,
  Sparkles, ChevronRight, ExternalLink, Lock,
  BookOpen, Zap, AlertCircle,
} from "lucide-react";
import { ManifestationRecord } from "@/components/ManifestationRecord";
// Explicit ManifestationSession type matching the database schema
type ManifestationSession = {
  id: number;
  userId: number;
  sessionWid: string;
  name: string;
  intent: string;
  medium: "music" | "book" | "research" | "film" | "visual_art" | "software" | "other";
  collaborators: string | null;
  declaration: string | null;
  guideWid: string | null;
  workWid: string | null;
  humanContributions: string[] | null;
  aiContributions: string[] | null;
  transformationSummary: string | null;
  parentSessionId: number | null;
  status: "active" | "paused" | "completed" | "archived";
  createdAt: Date;
  updatedAt: Date;
};

// ─── Panel definitions ────────────────────────────────────────────────────────

const PANELS = [
  { key: "conversation", label: "Conversation", icon: MessageSquare, description: "AI-assisted creative dialogue" },
  { key: "music",        label: "Music",        icon: Music,         description: "Compose, record, and arrange" },
  { key: "images",       label: "Images",       icon: Image,         description: "Generate and curate visuals" },
  { key: "storyboard",   label: "Storyboard",   icon: Film,          description: "Visual narrative planning" },
  { key: "lyrics",       label: "Lyrics",       icon: FileText,      description: "Write and version lyrics" },
  { key: "timeline",     label: "Timeline",     icon: Clock,         description: "Provenance event log" },
  { key: "registry",     label: "Registry",     icon: Shield,        description: "WID issuance and verification" },
  { key: "evidence",     label: "Evidence",     icon: FileCheck,     description: "Supporting documentation" },
  { key: "versions",     label: "Versions",     icon: GitBranch,     description: "Version history" },
  { key: "collaborators",label: "Collaborators",icon: Users,         description: "Team and AI contributors" },
  { key: "publish",      label: "Publish",      icon: Upload,        description: "Distribution and release" },
  { key: "record",       label: "Record",       icon: Shield,        description: "Manifestation Record — provenance document" },
] as const;

type PanelKey = typeof PANELS[number]["key"];

// ─── Medium display helpers ───────────────────────────────────────────────────

const MEDIUM_LABELS: Record<string, string> = {
  music: "Music", book: "Book", research: "Research",
  film: "Film", visual_art: "Visual Art", software: "Software", other: "Other",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManifestationWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [activePanel, setActivePanel] = useState<PanelKey>("conversation");

  const sessionId = parseInt(id || "0", 10);

  const { data: session, isLoading, error } = trpc.sessions.getSession.useQuery(
    { sessionId },
    { enabled: !!sessionId && !!user },
  );

  const { data: timeline } = trpc.sessions.getTimeline.useQuery(
    { sessionId },
    { enabled: !!sessionId && !!user && activePanel === "timeline" },
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center">
          <Lock className="w-10 h-10 text-violet-400 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Sign in to access your Manifestation Session.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h2 className="text-white font-semibold mb-2">Session not found</h2>
          <p className="text-slate-400 text-sm mb-4">This session may not exist or you may not have access to it.</p>
          <button
            onClick={() => navigate("/sessions")}
            className="text-violet-400 hover:text-violet-300 text-sm transition-colors"
          >
            View all sessions →
          </button>
        </div>
      </div>
    );
  }

  const activePanel_ = PANELS.find(p => p.key === activePanel)!;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

      {/* Session Header */}
      <div className="border-b border-white/5 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate("/sessions")}
            className="text-slate-500 hover:text-white text-sm transition-colors shrink-0"
          >
            ← Sessions
          </button>
          <div className="h-4 w-px bg-white/10 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white truncate">{session.name}</h1>
              <span className={`
                text-xs px-2 py-0.5 rounded-full shrink-0
                ${session.status === "active" ? "bg-green-500/15 text-green-400" :
                  session.status === "completed" ? "bg-violet-500/15 text-violet-400" :
                  "bg-slate-500/15 text-slate-400"}
              `}>
                {session.status}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono truncate">{session.sessionWid}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-600 hidden sm:block">
            {MEDIUM_LABELS[session.medium] || session.medium}
          </span>
          {session.workWid ? (
            <div className="flex items-center gap-1.5 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-3 py-1">
              <Shield className="w-3 h-3" />
              {session.workWid}
            </div>
          ) : (
            <button
              onClick={() => setActivePanel("registry")}
              className="text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1 transition-colors flex items-center gap-1.5"
            >
              <Shield className="w-3 h-3" />
              Issue WID
            </button>
          )}
        </div>
      </div>

      {/* Intent bar */}
      <div className="bg-violet-500/5 border-b border-violet-500/10 px-6 py-2.5 flex items-start gap-3">
        <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-300/80 leading-relaxed line-clamp-2">
          <span className="text-violet-400 font-medium">Intent: </span>
          {session.intent}
        </p>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* Panel Navigation (sidebar) */}
        <nav className="w-48 shrink-0 border-r border-white/5 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {PANELS.map(panel => {
            const Icon = panel.icon;
            const isActive = activePanel === panel.key;
            return (
              <button
                key={panel.key}
                onClick={() => setActivePanel(panel.key)}
                className={`
                  flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors text-sm
                  ${isActive
                    ? "text-white bg-white/8 border-r-2 border-violet-500"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/4"
                  }
                `}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-violet-400" : ""}`} />
                {panel.label}
              </button>
            );
          })}
        </nav>

        {/* Panel Content */}
        <main className="flex-1 overflow-y-auto">
          <PanelContent
            panelKey={activePanel}
            session={session}
            timeline={timeline}
            sessionId={sessionId}
            navigate={navigate}
          />
        </main>
      </div>
    </div>
  );
}

// ─── Panel Content Router ─────────────────────────────────────────────────────

function PanelContent({
  panelKey,
  session,
  timeline,
  sessionId,
  navigate,
}: {
  panelKey: PanelKey;
  session: ManifestationSession;
  timeline: unknown[] | undefined;
  sessionId: number;
  navigate: (path: string) => void;
}) {
  switch (panelKey) {

    case "conversation":
      return (
        <div className="p-6 max-w-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Conversation</h2>
            <p className="text-sm text-slate-400">
              Your Keeper AI knows this session. Every conversation is anchored to your intent
              and appended to the provenance graph.
            </p>
          </div>
          <div className="rounded-xl bg-white/3 border border-white/8 p-5 text-center">
            <MessageSquare className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-4">
              Open the Keeper to begin a session-aware conversation.
              Your intent and declaration are already loaded as context.
            </p>
            <button
              onClick={() => navigate("/keeper-compose")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Open Keeper
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );

    case "music":
      return (
        <div className="p-6 max-w-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Music</h2>
            <p className="text-sm text-slate-400">
              Compose, record, and arrange. All audio work is linked to this session's provenance chain.
            </p>
          </div>
          <div className="rounded-xl bg-white/3 border border-white/8 p-5 text-center">
            <Music className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-4">
              Open the Manifestation Studio to compose music for this session.
              Your session context will be pre-loaded.
            </p>
            <button
              onClick={() => navigate(`/manifest?sessionId=${sessionId}&type=music`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Music className="w-4 h-4" />
              Open Studio
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );

    case "timeline":
      return (
        <div className="p-6 max-w-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Provenance Timeline</h2>
            <p className="text-sm text-slate-400">
              The append-only record of this creative journey. Every event is immutable.
            </p>
          </div>
          {!timeline ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No events yet.</div>
          ) : (
            <div className="space-y-3">
              {(timeline as Array<{
                id: number;
                eventType: string;
                actorType: string;
                summary: string | null;
                createdAt: Date | string;
                payload: unknown;
              }>).map((event) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-2.5 h-2.5 rounded-full mt-1.5 shrink-0
                      ${event.actorType === "ai" ? "bg-violet-400" :
                        event.actorType === "system" ? "bg-slate-400" : "bg-green-400"}
                    `} />
                    <div className="w-px flex-1 bg-white/5 mt-1" />
                  </div>
                  <div className="pb-4 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-slate-400">{event.eventType}</span>
                      <span className={`
                        text-xs px-1.5 py-0.5 rounded
                        ${event.actorType === "ai" ? "bg-violet-500/15 text-violet-400" :
                          event.actorType === "system" ? "bg-slate-500/15 text-slate-400" :
                          "bg-green-500/15 text-green-400"}
                      `}>
                        {event.actorType}
                      </span>
                    </div>
                    {event.summary && (
                      <p className="text-sm text-slate-300 leading-relaxed">{event.summary}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case "registry":
      return (
        <div className="p-6 max-w-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Registry</h2>
            <p className="text-sm text-slate-400">
              When your work is ready, issue a Work WID. This culminates the session and
              carries the full provenance graph into the canonical registry.
            </p>
          </div>

          {session.workWid ? (
            <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-violet-400" />
                <span className="text-sm font-medium text-violet-300">Work WID Issued</span>
              </div>
              <div className="font-mono text-violet-200 text-sm mb-3">{session.workWid}</div>
              <button
                onClick={() => navigate(`/verify/${session.workWid}`)}
                className="inline-flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Verify in Registry <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/3 border border-white/8 p-5">
                <div className="flex items-start gap-3 mb-4">
                  <BookOpen className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-300 mb-1">Session WID</div>
                    <div className="font-mono text-xs text-slate-400">{session.sessionWid}</div>
                    <div className="text-xs text-slate-600 mt-1">
                      Issued at session creation — {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    To issue a Work WID, complete your work in the Manifestation Studio.
                    The full session provenance chain will be linked to the registered work.
                  </p>
                  <button
                    onClick={() => navigate(`/manifest?sessionId=${sessionId}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Zap className="w-4 h-4" />
                    Complete & Register
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );

    case "record":
      return (
        <div className="p-6 max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-1">Manifestation Record</h2>
            <p className="text-sm text-slate-400">
              The canonical provenance document for this creative journey.
              Declare your contributions, summarize the transformation, and sign your declaration.
            </p>
          </div>
          <ManifestationRecord
            session={session}
            mode="edit"
            onSaved={() => {}}
          />
        </div>
      );

    default:
      return (
        <div className="p-6 flex items-center justify-center min-h-[300px]">
          <div className="text-center max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
              {(() => {
                const panel = PANELS.find(p => p.key === panelKey);
                if (!panel) return null;
                const Icon = panel.icon;
                return <Icon className="w-5 h-5 text-slate-400" />;
              })()}
            </div>
            <h3 className="text-sm font-medium text-slate-300 mb-1">
              {PANELS.find(p => p.key === panelKey)?.label}
            </h3>
            <p className="text-xs text-slate-500">
              {PANELS.find(p => p.key === panelKey)?.description}
            </p>
            <div className="mt-4 text-xs text-slate-600 bg-white/3 border border-white/5 rounded-lg px-3 py-2">
              This panel is being built. All work here will be anchored to session{" "}
              <span className="font-mono text-slate-500">{session.sessionWid}</span>.
            </div>
          </div>
        </div>
      );
  }
}
