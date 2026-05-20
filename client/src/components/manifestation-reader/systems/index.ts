/**
 * Manifestation Operating System — Shared Systems Layer
 * ═══════════════════════════════════════════════════════
 * 
 * Independent subsystems that any medium adapter can consume.
 * Each system operates autonomously but coordinates through
 * the ManifestationContext.
 * 
 * Architecture:
 *   AtmosphereSystem  → ambient lighting, mood, background transitions
 *   ProvenanceSystem  → progressive WID/lineage/transformation reveal
 *   SyncSystem        → subtle optional soundtrack synchronization
 *   IdentitySystem    → creator sigils, contributor presence
 *   NavigationSystem  → shared nav adaptable per medium type
 */

export { useAtmosphereSystem, type AtmosphereState, type MoodProfile } from "./useAtmosphereSystem";
export { useProvenanceSystem, type ProvenanceState, type ProvenanceDepth } from "./useProvenanceSystem";
export { useSyncSystem, type SyncState, type SyncCue } from "./useSyncSystem";
export { useIdentitySystem, type IdentityState, type CreatorPresence } from "./useIdentitySystem";
export { useNavigationSystem, type NavigationState, type NavigationConfig } from "./useNavigationSystem";
