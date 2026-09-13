import { DISCORD_COMMUNITY_URL } from "@/lib/loopProduct";

export type LauncherDestination = "route" | "player" | "external" | "unavailable";
export type LauncherItem = { id: string; label: string; description: string; destination: LauncherDestination; path?: string; auth?: boolean };

// Source: the user's 2026-09-12 Living Nexus launcher vocabulary.
// Route targets were reconciled against App.tsx at main 58049283.
export const LAUNCHER_ITEMS: readonly LauncherItem[] = [
  { id: "nexus", label: "Nexus AI", description: "Awaiting authenticated Nexus service", destination: "unavailable" },
  { id: "player", label: "Player", description: "Open the current playback session", destination: "player" },
  { id: "registry", label: "Registry", description: "Public witnessed works", destination: "route", path: "/witness-registry" },
  { id: "creators", label: "Creators", description: "Public creator directory", destination: "route", path: "/explore?view=creators" },
  { id: "works", label: "Works", description: "Explore published works", destination: "route", path: "/explore?view=list" },
  { id: "provenance", label: "Provenance", description: "WID and lineage specification", destination: "route", path: "/doctrine/wid-spec" },
  { id: "store", label: "Store", description: "Avatar marketplace", destination: "route", path: "/avatar-registry" },
  { id: "intake", label: "Intake", description: "Creator onboarding", destination: "route", path: "/onboarding" },
  { id: "community", label: "Community", description: "Living Nexus Discord", destination: "external", path: DISCORD_COMMUNITY_URL },
  { id: "messages", label: "Messages", description: "Messaging surface not connected", destination: "unavailable" },
  { id: "search", label: "Search", description: "Discover creators, works, and WIDs", destination: "route", path: "/search" },
  { id: "settings", label: "Settings", description: "Playback preferences", destination: "route", path: "/settings/playback", auth: true },
] as const;
