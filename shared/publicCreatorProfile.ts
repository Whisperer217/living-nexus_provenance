import { z } from "zod";

/**
 * Deliberate public Creator projections. These schemas must not be replaced by
 * raw `users` rows or expanded with authentication, role, billing, or editor
 * state without a separately reviewed privacy decision.
 */
export const publicCreatorCardSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().nullable(),
  artistHandle: z.string().nullable(),
  bio: z.string().nullable(),
  profilePhotoUrl: z.string().nullable(),
  primaryGenre: z.string().nullable(),
  originStatement: z.string().nullable(),
  activeMediums: z.array(z.string()).nullable(),
  sigilUrl: z.string().nullable(),
  founderWid: z.string().nullable(),
  publishedWorkCount: z.number().int().nonnegative(),
});

export const publicCreatorIdentitySchema = publicCreatorCardSchema.extend({
  bannerUrl: z.string().nullable(),
  bannerPositionX: z.number().nullable(),
  bannerPositionY: z.number().nullable(),
  creativeMission: z.string().nullable(),
  creativePhilosophy: z.string().nullable(),
  creativeDoctrine: z.string().nullable(),
  archiveContinuity: z.string().nullable(),
  officialArtistName: z.string().nullable(),
  localizedName: z.string().nullable(),
  labelName: z.string().nullable(),
  producerCredits: z.string().nullable(),
  dspSpotifyUrl: z.string().nullable(),
  dspAppleMusicUrl: z.string().nullable(),
  dspTikTokHandle: z.string().nullable(),
  website: z.string().nullable(),
  location: z.string().nullable(),
  twitterHandle: z.string().nullable(),
  instagramHandle: z.string().nullable(),
  youtubeHandle: z.string().nullable(),
  /** Whether the public Support Creator flow may be offered; no payout state is disclosed. */
  tipsEnabled: z.boolean(),
});

/** Public feed/playlist/work attribution: never carries role, payout, license, or slot state. */
export const publicCreatorAttributionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().nullable(),
  artistHandle: z.string().nullable(),
  profilePhotoUrl: z.string().nullable(),
  primaryGenre: z.string().nullable(),
  aiDisclosure: z.enum(["original", "ai_assisted", "ai_generated", "human_authored_ai_instrument"]).nullable(),
  founderWid: z.string().nullable(),
});

/** Public directory card. Internal ranking/pinning state is intentionally absent. */
export const publicCreatorDirectoryCardSchema = publicCreatorCardSchema.extend({
  bannerUrl: z.string().nullable(),
  publishedCount: z.number().int().nonnegative(),
});

export type PublicCreatorCard = z.infer<typeof publicCreatorCardSchema>;
export type PublicCreatorIdentity = z.infer<typeof publicCreatorIdentitySchema>;
export type PublicCreatorAttribution = z.infer<typeof publicCreatorAttributionSchema>;
export type PublicCreatorDirectoryCard = z.infer<typeof publicCreatorDirectoryCardSchema>;
