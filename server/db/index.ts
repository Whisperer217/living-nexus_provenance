/**
 * server/db/index.ts
 *
 * Clean entry point for the domain-organized data layer.
 *
 * Pass 1: Songs domain extracted.
 * Pass 2: Users domain extracted.
 * Future passes will add:
 *   export * from "./playlists";
 *   export * from "./comments";
 *   export * from "./tips";
 *   export * from "./admin";
 *   ... etc.
 *
 * Existing code that imports from "../utils/db" continues to work unchanged.
 * New code should prefer importing from "../db" (this file) or "../db/songs" directly.
 */

export * from "./songs";
export * from "./users";
