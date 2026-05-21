/* ═══════════════════════════════════════════════════════════════════
   LIVING NEXUS — Unified Navigation System
   Single source of truth for all navigation items.
   Used by: LeftRail (desktop trigger), ContextDrawer (desktop nav),
            MobileNavDrawer (mobile nav).

   Contract:
   - Rail NEVER navigates directly — it opens the ContextDrawer.
   - Drawer ALWAYS handles navigation.
   - Mobile: Hamburger → full-screen Drawer → select → close.
   - Desktop: Rail icon → ContextDrawer opens → select → navigate.
═══════════════════════════════════════════════════════════════════ */

export type NavMode =
  | "HOME"
  | "EXPLORE"
  | "PROJECTS"
  | "MARKETPLACE"
  | "DISTRIBUTE"
  | "UPLOAD"
  | "DASHBOARD"
  | "ARCHIVE"
  | "BUILD"
  | null;

export interface NavSubItem {
  label: string;
  path: string;
  description?: string;
  authOnly?: boolean;
  badge?: string;
}

export interface NavItem {
  id: NavMode;
  label: string;
  iconName: string;           // lucide icon name — resolved in components
  authOnly?: boolean;
  subItems: NavSubItem[];     // items rendered inside the drawer for this mode
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "HOME",
    label: "Home",
    iconName: "Home",
    subItems: [
      { label: "Landing",          path: "/",              description: "Platform overview & featured works" },
      { label: "What's New",       path: "/__whats-new__", description: "Latest platform updates" },
      { label: "Founder's Era",    path: "/founders",      description: "Genesis Day — limited creator slots" },
      { label: "Pricing",          path: "/pricing",       description: "Covenant tiers & slot plans" },
    ],
  },
  {
    id: "EXPLORE",
    label: "Explore",
    iconName: "Compass",
    subItems: [
      { label: "All Works",        path: "/explore",       description: "Browse all witnessed creative works" },
      { label: "Music",            path: "/explore?type=audio",      description: "Witnessed voices & tracks" },
      { label: "Manuscripts",      path: "/explore?type=manuscript", description: "Books, essays, long-form" },
      { label: "Lyrics",           path: "/explore?type=lyrics",     description: "Song lyrics & poetry" },
      { label: "Comics",           path: "/explore?type=comic",      description: "Visual narratives" },
      { label: "Discover",         path: "/discover",      description: "Curated featured works" },
    ],
  },
  {
    id: "PROJECTS",
    label: "Projects",
    iconName: "Rocket",
    subItems: [
      { label: "My Projects",      path: "/projects",      description: "Your active creative projects" },
      { label: "Collaborations",   path: "/projects/collab", description: "Works in progress with others" },
      { label: "Listen Together",  path: "/together",      description: "Real-time co-listening rooms" },
    ],
  },
  {
    id: "MARKETPLACE",
    label: "Marketplace",
    iconName: "ShoppingBag",
    subItems: [
      { label: "Browse Licenses",  path: "/marketplace",   description: "Sync & commercial licensing" },
      { label: "Tip a Creator",    path: "/marketplace/tips", description: "Direct creator support" },
    ],
  },
  {
    id: "DISTRIBUTE",
    label: "Distribute",
    iconName: "Send",
    subItems: [
      { label: "Distribution Hub",  path: "/distribute",    description: "Sovereign distribution pipeline" },
      { label: "Physical Formats",  path: "/distribute#physical", description: "USB, CD, Vinyl, Books, Comics" },
      { label: "Interest Form",     path: "/distribute#form",     description: "Register your distribution interest" },
    ],
  },
  {
    id: "UPLOAD",
    label: "Upload",
    iconName: "Upload",
    authOnly: true,
    subItems: [
      { label: "Upload Work",      path: "/upload",        description: "Register a new creative work" },
      { label: "Manifest",         path: "/manifest",      description: "Guided manifestation studio" },
      { label: "Prompt Generator", path: "/prompt-gen",    description: "AI-assisted creation prompts" },
    ],
  },
  {
    id: "DASHBOARD",
    label: "Dashboard",
    iconName: "LayoutDashboard",
    authOnly: true,
    subItems: [
      { label: "Overview",         path: "/dashboard",     description: "Your creator command center" },
      { label: "My Works",         path: "/dashboard?tab=songs",    description: "Manage your uploaded tracks" },
      { label: "Analytics",        path: "/dashboard?tab=analytics", description: "Plays, tips, license stats" },
      { label: "Earnings",         path: "/dashboard?tab=earnings",  description: "Tips & license revenue" },
      { label: "Profile",          path: "/profile",       description: "Edit your public creator profile" },
    ],
  },
  {
    id: "ARCHIVE",
    label: "Archive",
    iconName: "Archive",
    authOnly: true,
    subItems: [
      { label: "My Archive",       path: "/archive",       description: "All your uploaded works" },
      { label: "Liked Works",      path: "/liked",         description: "Works you've saved" },
      { label: "Playlists",        path: "/playlists",     description: "Your curated playlists" },
    ],
  },
  {
    id: "BUILD",
    label: "Build",
    iconName: "Wrench",
    authOnly: true,
    subItems: [
      { label: "LN Command",       path: "/admin",         description: "Platform administration" },
      { label: "Moderation",       path: "/moderation",    description: "Content review queue" },
      { label: "API Docs",         path: "/docs/api",      description: "Developer documentation" },
    ],
  },
];

/** Flat lookup by mode id */
export const NAV_ITEM_MAP = Object.fromEntries(
  NAV_ITEMS.map(item => [item.id, item])
) as Record<NonNullable<NavMode>, NavItem>;
