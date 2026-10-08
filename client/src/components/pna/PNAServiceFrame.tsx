import type { ReactNode } from "react";
import { ArrowLeft, Compass, ShieldCheck } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AI_OPERATIONS_ENABLED } from "@shared/aiAvailability";

type PNAServiceSurface = "workspace" | "settings";

interface PNAServiceFrameProps {
  children: ReactNode;
  surface: PNAServiceSurface;
}

function publicHomeHref() {
  if (typeof window === "undefined") return "/";
  return window.location.hostname.toLowerCase().startsWith("pna.")
    ? "https://www.livingnexus.org/"
    : "/";
}

function pnaReturnHref(search: string) {
  const candidate = new URLSearchParams(search).get("returnTo");
  return candidate && candidate.startsWith("/pna") && !candidate.startsWith("//")
    ? candidate
    : "/pna";
}

/**
 * PNA is a focused, private creator service—not a panel inside the public
 * discovery shell. This frame provides one recovery boundary for both the
 * main-domain and pna subdomain routes, while letting the workspace retain
 * ownership of its thread navigation, inspector, and playback surface.
 */
export function PNAServiceFrame({ children, surface }: PNAServiceFrameProps) {
  const [location] = useLocation();
  const search = useSearch();
  const isSettings = surface === "settings";
  const workspaceHref = pnaReturnHref(search);

  return (
    <ErrorBoundary resetKey={location}>
      <div className={`pna-service-frame pna-service-frame--${surface} ${AI_OPERATIONS_ENABLED ? "" : "pna-service-frame--paused"}`}>
        {!AI_OPERATIONS_ENABLED ? (
          <div className="pna-service-frame__wip" role="status">
            <span>WORK IN PROGRESS</span>
            <span className="pna-service-frame__wip-detail">PNA model operations are paused; private records remain available for review.</span>
          </div>
        ) : null}
        {isSettings ? (
          <header className="pna-service-frame__bar">
            <div className="flex min-w-0 items-center gap-3">
              <div className="pna-service-frame__seal" aria-hidden="true">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-display text-[var(--text-xs)] tracking-[0.16em] uppercase" style={{ color: "var(--ln-gold-dim)" }}>
                  Private creator service
                </p>
                <p className="truncate font-editorial text-[var(--text-h4)] leading-none" style={{ color: "var(--ln-parchment)" }}>
                  PNA Stewardship
                </p>
              </div>
            </div>
            <nav className="flex flex-wrap items-center justify-end gap-2" aria-label="PNA service navigation">
              <Link
                href={workspaceHref}
                className="pna-service-frame__action"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                <span>Return to workspace</span>
              </Link>
              <a href={publicHomeHref()} className="pna-service-frame__action">
                <Compass size={14} aria-hidden="true" />
                <span>Living Nexus</span>
              </a>
            </nav>
          </header>
        ) : null}
        {children}
      </div>
    </ErrorBoundary>
  );
}

export type { PNAServiceSurface };
export { pnaReturnHref };
