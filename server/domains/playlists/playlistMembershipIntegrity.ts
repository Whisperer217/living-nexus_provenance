export class PlaylistMembershipIntegrityError extends Error {
  constructor(message = "Playlist membership changed. Refresh and try again.") {
    super(message);
    this.name = "PlaylistMembershipIntegrityError";
  }
}

/**
 * A reorder must name every current playlist membership row once and only once.
 * Membership row IDs—not Work IDs—preserve legitimate duplicate Work entries.
 */
export function assertExactPlaylistMembershipIds(
  currentMembershipIds: readonly number[],
  orderedMembershipIds: readonly number[],
): void {
  const currentIds = new Set(currentMembershipIds);
  const orderedIds = new Set(orderedMembershipIds);
  const exactMembership = currentIds.size === currentMembershipIds.length
    && orderedIds.size === orderedMembershipIds.length
    && currentMembershipIds.length === orderedMembershipIds.length
    && currentMembershipIds.every((id) => orderedIds.has(id));
  if (!exactMembership) throw new PlaylistMembershipIntegrityError();
}
