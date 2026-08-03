/**
 * SessionsListPage
 *
 * Lists all Manifestation Sessions for the authenticated creator.
 * Entry point from the left rail and the homepage "+ New Manifestation" flow.
 */

import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Plus, Music, BookOpen, FlaskConical, Film, Palette, Code2, Layers,
  Shield, Clock, ChevronRight, Sparkles, Lock,
} from "lucide-react";

const MEDIUM_ICONS: Record<string, React.ElementType> = {
  music: Music, book: BookOpen, research: FlaskConical,
  film: Film, visual_art: Palette, software: Code2, other: Layers,
};

const MEDIUM_LABELS: Record<string, string> = {
  music: "Music", book: "Book", research: "Research",
  film: "Film", visual_art: "Visual Art", software: "Software", other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  active:    "bg-green-500/15 text-green-400",
  paused:    "bg-amber-500/15 text-amber-400",
  completed: "bg-violet-500/15 text-violet-400",
  archived:  "bg-slate-500/15 text-slate-400",
};

export default function SessionsListPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const { data: sessions, isLoading } = trpc.sessions.listMine.useQuery(
    undefined,
    { enabled: !!user },
  );

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
          <Lock className="w-12 h-12 text-violet-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Sign in to view sessions</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your Manifestation Sessions are anchored to your creator identity.
          </p>
          <a
            href={getLoginUrl("/sessions")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Manifestation Sessions</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Each session is a creative journey with an append-only provenance record.
          </p>
        </div>
        <button
          onClick={() => navigate("/new-manifestation")}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Manifestation
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500/40 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : !sessions || sessions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-8 h-8 text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">No sessions yet</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              A Manifestation Session is where the creative journey begins.
              The work is protected before it exists.
            </p>
            <button
              onClick={() => navigate("/new-manifestation")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Start Your First Session
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session: typeof sessions[number]) => {
              const Icon = MEDIUM_ICONS[session.medium] || Layers;
              return (
                <button
                  key={session.id}
                  onClick={() => navigate(`/manifestation/${session.id}`)}
                  className="w-full text-left rounded-xl bg-white/3 hover:bg-white/5 border border-white/8 hover:border-white/15 p-5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-white truncate">{session.name}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[session.status] || "bg-slate-500/15 text-slate-400"}`}>
                            {session.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-2">
                          {session.intent}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            {session.sessionWid}
                          </span>
                          {session.workWid && (
                            <span className="flex items-center gap-1 text-violet-500">
                              <Shield className="w-3 h-3" />
                              {session.workWid}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                          <span>{MEDIUM_LABELS[session.medium] || session.medium}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
