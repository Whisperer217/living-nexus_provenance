/**
 * server/routers/index.ts
 *
 * Thin combiner — imports all focused single-namespace routers and assembles
 * the final appRouter.  No procedures or logic live here.
 *
 * Each import below is a dedicated file with a single router({...}) export.
 */

import { router } from "../_core/trpc";
import { systemRouter } from "../_core/systemRouter";

// ── Framework ─────────────────────────────────────────────────────────────────
import { normalizationRouter } from "./normalization";
import { qrRouter }            from "./qr";
import { playbackRouter }      from "./playback";
import { provenanceRouter }    from "./provenance";
import { apiKeyRouter }        from "./apiKey";

// ── Songs domain ──────────────────────────────────────────────────────────────
import { songsRouter }        from "./songs";
import { commentsRouter }     from "./comments";
import { eventsRouter }       from "./events";
import { songDownloadRouter } from "./songDownload";
import { moderationRouter }   from "./moderation";
import { versionsRouter }     from "./versions";
import { activationRouter }   from "./activation";
import { evidenceRouter }     from "./evidence";
import { searchRouter }       from "./search";

// ── Profile domain ────────────────────────────────────────────────────────────
import { authRouter }            from "./auth";
import { profileRouter }         from "./profile";
import { fieldNotesRouter }      from "./fieldNotes";
import { onboardingRouter }      from "./onboarding";
import { declarationRouter }     from "./declaration";
import { agentsRouter }          from "./agents";
import { userCollectionsRouter } from "./userCollections";
import { widsRouter }            from "./wids";

// ── Witness / provenance domain ───────────────────────────────────────────────
import { witnessRouter }             from "./witness";
import { witnessSubscriptionRouter } from "./witnessSubscription";
import { imageGalleryRouter }        from "./imageGallery";
import { referenceRouter }           from "./reference";
import { witnessRegistryRouter }     from "./witnessRegistry";
import { guidesRouter }              from "./guides";
import { quiverRouter }              from "./quiver";
import { domainRouter }              from "./domain";
import { collectionsRouter }         from "./collections";

// ── Payment domain ────────────────────────────────────────────────────────────
import { tipsRouter }             from "./tips";
import { licensesRouter }         from "./licenses";
import { supportersRouter }       from "./supporters";
import { livingArchiveRouter }    from "./livingArchive";
import { paymentIntegrityRouter } from "./paymentIntegrity";
import { marketplaceRouter }      from "./marketplace";
import { satchelRouter }          from "./satchel";
import { ppgRouter }              from "./ppg";

// ── Admin domain ──────────────────────────────────────────────────────────────
import { adminRouter }   from "./admin";
import { promoRouter }   from "./promo";
import { discordRouter } from "./discord";
import { auditRouter }   from "./audit";
import { workerRouter }  from "./worker";

// ── Keeper / AI domain ────────────────────────────────────────────────────────
import { keeperRouter }       from "./keeper";
import { promptStudioRouter } from "./promptStudio";

// ── Platform domain ───────────────────────────────────────────────────────────
import { platformRouter }          from "./platform";
import { testimonyRouter }         from "./testimony";
import { playlistRouter }          from "./playlist";
import { playlistsRouter }         from "./playlists";
import { notificationsRouter }     from "./notifications";
import { globalActivityRouter }    from "./globalActivity";
import { booksRouter }             from "./books";
import { externalPlaylistsRouter } from "./externalPlaylists";
import { projectsRouter }          from "./projects";

// Re-export the Stripe webhook handler (lives in the payment domain)
export { handleStripeWebhook } from "./stripeWebhook";

// ── Main appRouter ────────────────────────────────────────────────────────────
export const appRouter = router({
  // Framework
  system:        systemRouter,
  normalization: normalizationRouter,
  qr:            qrRouter,
  playback:      playbackRouter,
  provenance:    provenanceRouter,
  apiKey:        apiKeyRouter,

  // Songs domain
  songs:        songsRouter,
  comments:     commentsRouter,
  events:       eventsRouter,
  songDownload: songDownloadRouter,
  moderation:   moderationRouter,
  versions:     versionsRouter,
  activation:   activationRouter,
  evidence:     evidenceRouter,
  search:       searchRouter,

  // Profile domain
  auth:            authRouter,
  profile:         profileRouter,
  fieldNotes:      fieldNotesRouter,
  onboarding:      onboardingRouter,
  declaration:     declarationRouter,
  agents:          agentsRouter,
  userCollections: userCollectionsRouter,
  wids:            widsRouter,

  // Witness / provenance domain
  witness:             witnessRouter,
  witnessSubscription: witnessSubscriptionRouter,
  imageGallery:        imageGalleryRouter,
  reference:           referenceRouter,
  witnessRegistry:     witnessRegistryRouter,
  guides:              guidesRouter,
  quiver:              quiverRouter,
  domain:              domainRouter,
  collections:         collectionsRouter,

  // Payment domain
  tips:             tipsRouter,
  licenses:         licensesRouter,
  supporters:       supportersRouter,
  livingArchive:    livingArchiveRouter,
  paymentIntegrity: paymentIntegrityRouter,
  marketplace:      marketplaceRouter,
  satchel:          satchelRouter,
  ppg:              ppgRouter,

  // Admin domain
  admin:   adminRouter,
  promo:   promoRouter,
  discord: discordRouter,
  audit:   auditRouter,
  worker:  workerRouter,

  // Keeper / AI domain
  keeper:       keeperRouter,
  promptStudio: promptStudioRouter,

  // Platform domain
  platform:          platformRouter,
  testimony:         testimonyRouter,
  playlist:          playlistRouter,
  playlists:         playlistsRouter,
  notifications:     notificationsRouter,
  globalActivity:    globalActivityRouter,
  books:             booksRouter,
  externalPlaylists: externalPlaylistsRouter,
  projects:          projectsRouter,
});

export type AppRouter = typeof appRouter;
