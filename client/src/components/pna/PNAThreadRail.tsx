import React, { useMemo, useState } from "react";
import {
  Archive,
  BookMarked,
  ChevronLeft,
  ChevronRight,
  FileStack,
  Image,
  Menu,
  MessageSquarePlus,
  Search,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import type { PNAMode, PNAModeOption, PNAThreadSummary } from "./pnaWorkspaceTypes";

interface PNAThreadRailProps {
  threads: PNAThreadSummary[];
  activeThreadId: string | null;
  activeMode: PNAMode;
  modes: PNAModeOption[];
  contextCount: number;
  appearanceImageUrl?: string | null;
  collapsed?: boolean;
  mobile?: boolean;
  onToggleCollapsed?: () => void;
  onClose?: () => void;
  onCreateThread: () => void;
  onSelectThread: (id: string) => void;
  onOpenCommand: () => void;
  onOpenAppearance?: () => void;
  onNavigate: (href: string) => void;
}

function updatedLabel(value: Date | string) {
  const date = new Date(value);
  const elapsed = Date.now() - date.getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return "recently updated";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 2) return "updated now";
  if (minutes < 60) return `updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `updated ${days}d ago`;
}

const LIBRARY = [
  { label: "Private Quiver", description: "Review preserved proposals", icon: Image, href: "/pna?view=quiver" },
  { label: "Notes & diaries", description: "Return to private working notes", icon: BookMarked, href: "/keeper" },
  { label: "My Archive", description: "Open registered Works", icon: Archive, href: "/archive" },
  { label: "Manifest", description: "Prepare a new Work", icon: FileStack, href: "/manifest" },
] as const;

export function PNAThreadRail({
  threads,
  activeThreadId,
  activeMode,
  modes,
  contextCount,
  appearanceImageUrl = null,
  collapsed = false,
  mobile = false,
  onToggleCollapsed,
  onClose,
  onCreateThread,
  onSelectThread,
  onOpenCommand,
  onOpenAppearance,
  onNavigate,
}: PNAThreadRailProps) {
  const [query, setQuery] = useState("");
  const activeProfile = modes.find((mode) => mode.id === activeMode) ?? modes[0];
  const visibleThreads = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return threads;
    return threads.filter((thread) => `${thread.title} ${thread.activeMode}`.toLowerCase().includes(normalized));
  }, [query, threads]);

  const railWidth = mobile ? "min(22rem, 90vw)" : collapsed ? 76 : 272;

  return (
    <aside
      className="flex h-full min-h-0 flex-col"
      aria-label="PNA private navigation"
      style={{
        width: railWidth,
        background: "var(--ln-panel)",
        borderRight: mobile ? "none" : "1px solid var(--ln-panel-border)",
      }}
    >
      <header className="flex min-h-[72px] items-center gap-3 px-4" style={{ borderBottom: "1px solid var(--ln-panel-border)" }}>
        {collapsed && !mobile ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2"
            style={{ color: "var(--ln-gold)", border: "1px solid var(--ln-panel-border)" }}
            aria-label="Expand private navigation"
            title="Expand private navigation"
          >
            <Menu size={17} aria-hidden="true" />
          </button>
        ) : (
          <>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: "color-mix(in srgb, var(--ln-gold) 11%, transparent)", border: "1px solid color-mix(in srgb, var(--ln-gold) 28%, transparent)", color: "var(--ln-gold)" }}>
              <Sparkles size={16} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[var(--text-sm)] tracking-[0.13em] uppercase" style={{ color: "var(--ln-parchment)" }}>PNA workspace</p>
              <p className="mt-0.5 truncate font-body text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>Private creator continuity</p>
            </div>
            {mobile ? (
              <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2" style={{ color: "var(--ln-smoke)", border: "1px solid var(--ln-panel-border)" }} aria-label="Close private navigation"><X size={16} /></button>
            ) : (
              <button type="button" onClick={onToggleCollapsed} className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2" style={{ color: "var(--ln-smoke)", border: "1px solid var(--ln-panel-border)" }} aria-label="Collapse private navigation" title="Collapse private navigation"><ChevronLeft size={16} /></button>
            )}
          </>
        )}
      </header>

      {collapsed && !mobile ? (
        <div className="flex min-h-0 flex-1 flex-col items-center gap-3 px-2 py-4">
          <button type="button" onClick={onCreateThread} className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2" style={{ background: "var(--ln-gold)", color: "var(--ln-void)" }} aria-label="Begin private thread" title="Begin private thread"><MessageSquarePlus size={16} /></button>
          <button type="button" onClick={onOpenCommand} className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2" style={{ color: "var(--ln-smoke)", border: "1px solid var(--ln-panel-border)" }} aria-label="Search private workspace" title="Search private workspace"><Search size={16} /></button>
          <div className="mt-2 h-px w-8" style={{ background: "var(--ln-panel-border)" }} />
          {threads.slice(0, 5).map((thread) => (
            <button key={thread.id} type="button" onClick={() => onSelectThread(thread.id)} className="flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2" style={{ background: activeThreadId === thread.id ? "color-mix(in srgb, var(--ln-gold) 14%, transparent)" : "transparent", border: `1px solid ${activeThreadId === thread.id ? "color-mix(in srgb, var(--ln-gold) 34%, transparent)" : "var(--ln-panel-border)"}`, color: activeThreadId === thread.id ? "var(--ln-gold)" : "var(--ln-smoke)" }} aria-label={`Open ${thread.title}`} title={thread.title}><Sparkles size={14} /></button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--ln-panel-border)" }}>
            <button type="button" onClick={onCreateThread} className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2" style={{ background: "var(--ln-gold)", color: "var(--ln-void)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.07em" }}><MessageSquarePlus size={14} /> NEW THREAD</button>
            <button type="button" onClick={onOpenCommand} className="flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2" style={{ border: "1px solid var(--ln-panel-border)", color: "var(--ln-bone)", fontFamily: "var(--font-display)", fontSize: "var(--text-xs)", letterSpacing: "0.07em" }}><Search size={14} /> COMMAND</button>
          </div>

          <section className="px-4 py-3" aria-label="Quick reference" style={{ borderBottom: "1px solid var(--ln-panel-border)" }}>
            <p className="font-display text-[var(--text-xs)] tracking-[0.16em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Quick reference</p>
            <div className="mt-2 rounded-lg px-3 py-2.5" style={{ background: "color-mix(in srgb, var(--ln-gold) 6%, var(--ln-coal))", border: "1px solid color-mix(in srgb, var(--ln-gold) 18%, var(--ln-panel-border))" }}>
              <p className="font-editorial text-[var(--text-h4)]" style={{ color: "var(--ln-parchment)" }}>{activeProfile.label}</p>
              <p className="mt-1 font-body text-[var(--text-sm)] leading-relaxed" style={{ color: "var(--ln-smoke)" }}>{activeProfile.desc}</p>
              <p className="mt-2 font-mono text-[var(--text-xs)]" style={{ color: "var(--ln-gold-dim)" }}>{contextCount === 0 ? "No context attached" : `${contextCount} selected source${contextCount === 1 ? "" : "s"}`}</p>
            </div>
          </section>

          <div className="min-h-0 flex-1 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
            <section className="px-4 pt-4" aria-labelledby="pna-recent-threads">
              <div className="flex items-center justify-between gap-2"><h2 id="pna-recent-threads" className="font-display text-[var(--text-xs)] tracking-[0.16em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Recent threads</h2><span className="font-mono text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>{threads.length}</span></div>
              <label className="mt-3 flex min-h-11 items-center gap-2 rounded-lg px-3" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)", color: "var(--ln-smoke)" }}>
                <Search size={14} aria-hidden="true" />
                <span className="sr-only">Search private threads</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search threads" className="min-w-0 flex-1 bg-transparent font-body text-[var(--text-sm)] outline-none placeholder:text-[var(--ln-smoke)]" style={{ color: "var(--ln-parchment)" }} />
              </label>
              <div className="mt-2 grid gap-1.5">
                {visibleThreads.length > 0 ? visibleThreads.map((thread) => {
                  const active = activeThreadId === thread.id;
                  return <button key={thread.id} type="button" onClick={() => onSelectThread(thread.id)} className="w-full rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2" style={{ background: active ? "color-mix(in srgb, var(--ln-gold) 11%, transparent)" : "transparent", border: `1px solid ${active ? "color-mix(in srgb, var(--ln-gold) 28%, transparent)" : "transparent"}` }}><p className="truncate font-editorial text-[var(--text-h4)]" style={{ color: active ? "var(--ln-parchment)" : "var(--ln-bone)" }}>{thread.title}</p><p className="mt-1 flex items-center justify-between gap-2 font-mono text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}><span className="truncate">{thread.activeMode}</span><span className="flex-shrink-0">{updatedLabel(thread.updatedAt)}</span></p></button>;
                }) : <p className="rounded-lg px-3 py-4 font-body text-[var(--text-sm)] leading-relaxed" style={{ background: "var(--ln-coal)", color: "var(--ln-smoke)", border: "1px dashed var(--ln-ash)" }}>{threads.length === 0 ? "Begin a private thread to keep this work continuous." : "No private thread matches that search."}</p>}
              </div>
            </section>

            <section className="px-4 pb-4 pt-6" aria-labelledby="pna-library">
              <h2 id="pna-library" className="font-display text-[var(--text-xs)] tracking-[0.16em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>Private library</h2>
              <div className="mt-2 grid gap-1">
                {LIBRARY.map((item) => <button key={item.href} type="button" onClick={() => onNavigate(item.href)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 hover:bg-[color-mix(in_srgb,var(--ln-gold)_7%,transparent)]" style={{ color: "var(--ln-bone)" }}><item.icon size={15} style={{ color: "var(--ln-gold-dim)" }} /><span className="min-w-0 flex-1"><span className="block font-body text-[var(--text-sm)]">{item.label}</span><span className="block truncate font-body text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>{item.description}</span></span><ChevronRight size={14} style={{ color: "var(--ln-smoke)" }} /></button>)}
              </div>
            </section>
          </div>

          <footer className="grid gap-2 px-4 py-3" style={{ borderTop: "1px solid var(--ln-panel-border)" }}>
            <button type="button" onClick={() => onNavigate("/settings/stewardship")} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left focus-visible:outline-none focus-visible:ring-2" style={{ background: "var(--ln-coal)", border: "1px solid var(--ln-panel-border)", color: "var(--ln-bone)" }}><Settings2 size={15} style={{ color: "var(--ln-gold-dim)" }} /><span className="min-w-0"><span className="block font-body text-[var(--text-sm)]">Stewardship settings</span><span className="block truncate font-body text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>Profile and model-route permission</span></span></button>
            {onOpenAppearance ? <button type="button" onClick={onOpenAppearance} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left focus-visible:outline-none focus-visible:ring-2" style={{ color: "var(--ln-bone)" }}>{appearanceImageUrl ? <img src={appearanceImageUrl} alt="" className="h-7 w-7 rounded-full object-cover" style={{ border: "1px solid color-mix(in srgb, var(--ln-gold) 35%, transparent)" }} /> : <Sparkles size={15} style={{ color: "var(--ln-gold-dim)" }} />}<span className="min-w-0"><span className="block font-body text-[var(--text-sm)]">Appearance</span><span className="block truncate font-body text-[var(--text-xs)]" style={{ color: "var(--ln-smoke)" }}>Manage your PNA steward avatar</span></span></button> : null}
          </footer>
        </>
      )}
    </aside>
  );
}
