/**
 * Living Nexus — Manifestation Card System Types
 * Shared interfaces for the variable card ecosystem.
 */

export type MediumType = "audio" | "comic" | "manuscript" | "guide" | "lore" | "video" | "archive";

export interface ManifestationData {
  id: number;
  title: string;
  coverArtUrl?: string | null;
  artistName?: string | null;
  artistHandle?: string | null;
  profilePhotoUrl?: string | null;
  userId?: number | null;
  genre?: string | null;
  wid?: string | null;
  widShort?: string | null;
  playCount?: number | null;
  likeCount?: number | null;
  fileUrl?: string | null;
  duration?: number | null;
  aiDisclosure?: string | null;
  contentType?: string | null;
  description?: string | null;
  lyricsText?: string | null;
  totalFundingCents?: number | null;
  tipCount?: number | null;
  medium?: MediumType;
  /** Bundle parent ID — if this manifestation belongs to a bundle */
  bundleId?: number | null;
  /** Is this a collaborative work */
  isCollaborative?: boolean;
  /** Is this currently live/in-progress */
  isLive?: boolean;
}

export type CardSize = "large" | "medium" | "micro";

export interface CardInteractionProps {
  onPlay?: (data: ManifestationData) => void;
  onTip?: (data: ManifestationData, rect: DOMRect) => void;
}
