/**
 * Living Nexus Design System — Public API
 * ════════════════════════════════════════════════════════════════════
 * Single import point for all design system components and tokens.
 *
 * Usage:
 *   import { LnButton, LnCard, WIDBadge, COLOR_GOLD } from "@/design-system";
 *
 * RULE: All platform components MUST import from here, not from
 * individual files. This ensures the design system remains the
 * single source of truth.
 * ════════════════════════════════════════════════════════════════════
 */

// ── Tokens ────────────────────────────────────────────────────────────────────
export * from "./tokens";

// ── Primitives ────────────────────────────────────────────────────────────────
export {
  LnButton,
  LnBadge,
  LnDivider,
  LnAvatar,
  LnTag,
  LnOverline,
  LnText,
  LnIcon,
  LnSpinner,
  LnLiveWave,
  LnPulseDot,
} from "./primitives";

// ── Surfaces & Forms ──────────────────────────────────────────────────────────
export {
  LnCard,
  LnCardInfo,
  LnSurface,
  LnFormField,
  LnInput,
  LnTextarea,
  LnSelect,
  LnCheckbox,
  LnRadio,
  LnHeroFrame,
} from "./surfaces";

// ── Navigation & Overlays ─────────────────────────────────────────────────────
export {
  LnNavItem,
  LnTabs,
  LnModal,
  LnSheet,
  LnTooltip,
  LnBreadcrumb,
  LnEmptyState,
  LnPageHeader,
  LnContextMenu,
} from "./navigation";

// ── Platform Components ───────────────────────────────────────────────────────
export {
  WIDBadge,
  ProvenancePill,
  HarmonicBar,
  KeeperChip,
  SanctuarySlot,
  NexusPointBadge,
  WitnessCount,
  OriginStamp,
  MediumPill,
  CreatorCard,
  TrackRow,
} from "./platform";
