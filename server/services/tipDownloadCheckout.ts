import { z } from "zod";

/**
 * The only public return origin permitted for tip-to-download checkout.
 * Checkout is a public-facing transaction; its redirect targets must remain
 * server-owned rather than supplied by a browser or a model.
 */
export const CANONICAL_TIP_DOWNLOAD_ORIGIN = "https://www.livingnexus.org";

export const tipDownloadCheckoutInput = z.object({
  songId: z.number().int().positive(),
  origin: z.string().url().refine(
    (origin) => origin === CANONICAL_TIP_DOWNLOAD_ORIGIN,
    { message: "Tip-download checkout must return to the canonical Living Nexus origin." },
  ),
});
