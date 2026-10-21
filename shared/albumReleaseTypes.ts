export const ALBUM_RELEASE_DRAFT_STATUSES = [
  "draft",
  "publishing",
  "published",
  "abandoned",
] as const;

export type AlbumReleaseDraftStatus = (typeof ALBUM_RELEASE_DRAFT_STATUSES)[number];

export const ALBUM_RELEASE_VISIBILITY = ["public", "unlisted", "private"] as const;
export type AlbumReleaseVisibility = (typeof ALBUM_RELEASE_VISIBILITY)[number];

/**
 * Safe owner-facing card vocabulary. These values describe relationship state;
 * they do not replace a Work WID, legacy WID-ALB record, or media authority.
 */
export type CreatorCollectionCard =
  | {
      kind: "draft_release";
      id: number;
      title: string;
      status: "draft";
      trackCount: number;
      revision: number;
      visibilityIntent: AlbumReleaseVisibility;
      coverArtUrl: string | null;
      updatedAt: Date;
    }
  | {
      kind: "legacy_sealed_album";
      id: number;
      title: string;
      collectionWid: string;
      trackCount: number;
      visibility: AlbumReleaseVisibility;
      coverArtUrl: string | null;
    }
  | {
      kind: "named_playlist";
      id: number;
      title: string;
      trackCount: number;
      isPublic: boolean;
      coverArtUrl: string | null;
      updatedAt: Date;
    };

export const RELEASE_SIGNING_HOLD =
  "Sealing is not available yet. Your private draft is preserved; WID-ALB2 publication will open only after the approved creator-signature lifecycle is complete.";
