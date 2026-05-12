/**
 * Shared search result types — used by both server/db.ts and client SearchResultsPage.
 */
export interface SearchResults {
  creators: {
    id: number;
    name: string | null;
    artistHandle: string | null;
    bio: string | null;
    profilePhotoUrl: string | null;
    role: string;
    publishedCount: number;
  }[];
  songs: {
    id: number;
    title: string;
    genre: string | null;
    contentType: string;
    witnessId: string | null;
    coverArtUrl: string | null;
    creatorName: string | null;
    creatorHandle: string | null;
    userId: number;
  }[];
  guides: {
    id: number;
    canonicalName: string;
    tagline: string | null;
    widCode: string | null;
    artworkUrl: string | null;
    archetypeType: string | null;
    creatorId: number;
  }[];
  collections: {
    id: number;
    name: string;
    collectionWid: string;
    coverArtUrl: string | null;
    trackCount: number;
    creatorId: number;
  }[];
  widMatch: {
    type: "song" | "guide" | "collection";
    id: number;
    wid: string;
    title: string;
    url: string;
  } | null;
}
