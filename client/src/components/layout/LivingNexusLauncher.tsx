/**
 * Living Nexus launcher. The symbols are original line work derived from the
 * user's ◆ / @ / ♪ / ◇ / ⛓ / ✦ visual vocabulary (2026-09-12).
 * Route targets are existing site contracts; unavailable products stay inert.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { usePlayer } from "@/contexts/PlayerContext";
import { useWSP } from "@/contexts/WSPContext";
import { Z } from "@/lib/viewportLayers";
import { LAUNCHER_ITEMS, type LauncherItem } from "./launcherDestinations";
import "./living-nexus-launcher.css";

const DEFAULT_FAVORITES = ["nexus", "player", "creators", "registry", "store"];

function LauncherGlyph({ id, size = 28 }: { id: string; size?: number }) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.55, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    nexus: <><path d="M12 2 21 12 12 22 3 12Z"/><path d="M12 2v20M3 12h18M7.5 7.5l9 9M16.5 7.5l-9 9"/><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/></>,
    player: <><path d="M10 18V5l10-2v12"/><path d="M10 8 20 6"/><ellipse cx="7" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="15" rx="3" ry="2"/></>,
    registry: <><path d="M12 2 21 12 12 22 3 12Z"/><path d="M12 6v12M6 12h12"/><circle cx="12" cy="12" r="2"/></>,
    creators: <><circle cx="10" cy="12" r="6"/><path d="M16 12c0 3 1 4 3 4 1.4 0 2-1 2-2.5V12a9 9 0 1 0-3.3 7"/><circle cx="10" cy="12" r="1.5"/></>,
    works: <><path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4Z"/><path d="m4 4 2 2m12 12 2 2"/></>,
    provenance: <><path d="M8 7h4l3 5-3 5H8l-3-5Z"/><path d="M16 7h2l3 5-3 5h-2M8 7l4 10M8 17l4-10"/></>,
    store: <><path d="M4 8h16v13H4zM3 8l2-5h14l2 5M8 8v13M16 8v13"/><path d="M9 13h6"/></>,
    intake: <><path d="M3 4h18v16H3zM7 8h8M7 12h6"/><path d="m14 16 3 3 4-5"/></>,
    community: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 4v4m0 8v4M4 12h4m8 0h4"/></>,
    messages: <><path d="M3 4h18v13H9l-5 4v-4H3z"/><path d="M7 8h10M7 12h7"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m14.5 14.5 6 6M7 10h6M10 7v6"/></>,
    settings: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared}>{paths[id]}</svg>;
}

function loadFavorites(key: string): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(key) ?? "null");
    if (Array.isArray(stored)) return Array.from(new Set(stored.filter((id): id is string => typeof id === "string" && LAUNCHER_ITEMS.some(item => item.id === id))));
  } catch { /* private browsing or invalid prior state */ }
  return DEFAULT_FAVORITES;
}

export default function LivingNexusLauncher() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { state } = usePlayer();
  const { expand } = useWSP();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const favoriteKey = `ln-launcher-favorites-v1:${user?.id ?? "guest"}`;
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites(favoriteKey));

  useEffect(() => { setFavorites(loadFavorites(favoriteKey)); }, [favoriteKey]);
  useEffect(() => { setOpen(false); }, [location]);
  useEffect(() => {
    if (!open) return;
    firstItemRef.current?.focus();
    const close = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== "Escape") return;
        setOpen(false);
        triggerRef.current?.focus();
      } else if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("pointerdown", close); };
  }, [open]);

  const toggleFavorite = (id: string) => {
    setFavorites(current => {
      const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
      try { localStorage.setItem(favoriteKey, JSON.stringify(next)); } catch { /* preference remains in memory */ }
      return next;
    });
  };

  const activate = (item: LauncherItem) => {
    if (item.destination === "unavailable") return;
    if (item.destination === "player") { if (state.tracks[state.currentIdx]) { expand(); setOpen(false); } return; }
    if (item.destination === "external" && item.path) { window.open(item.path, "_blank", "noopener,noreferrer"); setOpen(false); return; }
    if (!item.path) return;
    setOpen(false);
    if (item.auth && !user) { window.location.assign(getLoginUrl(item.path)); return; }
    navigate(item.path);
  };

  const renderItem = (item: LauncherItem) => {
    const unavailable = item.destination === "unavailable" || (item.destination === "player" && !state.tracks[state.currentIdx]);
    const pinned = favorites.includes(item.id);
    return <div key={item.id} className={`ln-launcher-tile ${unavailable ? "ln-launcher-tile-unavailable" : ""}`}>
      <button ref={item.id === "registry" ? firstItemRef : undefined} type="button" className="ln-launcher-destination" onClick={() => activate(item)} disabled={unavailable} title={unavailable ? item.description : undefined}>
        <span className="ln-launcher-glyph"><LauncherGlyph id={item.id} /></span>
        <span className="ln-launcher-label">{item.label}</span>
        <span className="ln-launcher-description">{unavailable ? (item.id === "player" ? "No track selected" : "Not connected") : item.description}</span>
      </button>
      <button type="button" className={`ln-launcher-pin ${pinned ? "is-pinned" : ""}`} onClick={() => toggleFavorite(item.id)} aria-label={`${pinned ? "Remove" : "Add"} ${item.label} ${pinned ? "from" : "to"} favorites`} aria-pressed={pinned} title={pinned ? "Remove from favorites" : "Add to favorites"}>✦</button>
    </div>;
  };

  const favoriteItems = favorites.map(id => LAUNCHER_ITEMS.find(item => item.id === id)).filter((item): item is LauncherItem => !!item);
  const otherItems = LAUNCHER_ITEMS.filter(item => !favorites.includes(item.id));

  return <div className="ln-launcher-root" ref={rootRef} style={{ zIndex: Z.TOOLTIP }}>
    <button ref={triggerRef} type="button" className="ln-launcher-trigger" aria-label="Open Living Nexus launcher" aria-expanded={open} aria-controls="ln-launcher-panel" onClick={() => setOpen(value => !value)} title="Living Nexus launcher">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><path d="M3 3h5v5H3zM10 3h4v5h-4zM16 3h5v5h-5zM3 10h5v4H3zM10 10h4v4h-4zM16 10h5v4h-5zM3 16h5v5H3zM10 16h4v5h-4zM16 16h5v5h-5z"/><path d="M12 10v4M10 12h4" stroke="var(--ln-gold)"/></svg>
    </button>
    {open && <div id="ln-launcher-panel" className="ln-launcher-panel" role="dialog" aria-label="Living Nexus launcher">
      <div className="ln-launcher-heading"><span className="ln-launcher-heading-mark">◆</span><div><strong>LIVING NEXUS</strong><span>Find your place in the field</span></div></div>
      {favoriteItems.length > 0 && <section aria-label="Favorites"><div className="ln-launcher-section-title">FAVORITES</div><div className="ln-launcher-grid">{favoriteItems.map(renderItem)}</div></section>}
      {otherItems.length > 0 && <section aria-label="All destinations"><div className="ln-launcher-section-title">{favoriteItems.length ? "ALL DESTINATIONS" : "DESTINATIONS"}</div><div className="ln-launcher-grid">{otherItems.map(renderItem)}</div></section>}
      <p className="ln-launcher-footnote">Pin your places with ✦. Unconnected services remain visible without claiming access.</p>
    </div>}
  </div>;
}
