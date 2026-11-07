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
});

export type PublicCreatorCard = z.infer<typeof publicCreatorCardSchema>;
export type PublicCreatorIdentity = z.infer<typeof publicCreatorIdentitySchema>;
