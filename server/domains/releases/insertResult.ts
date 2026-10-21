/**
 * MySQL2 may return an insert result directly or as the first item in a tuple
 * when a query runs through a transaction connection. Draft Release writes must
 * not carry an unknown identifier into a related insert.
 */
export class ReleaseDraftPersistenceError extends Error {
  constructor(message = "Draft Release could not be created. Nothing was saved.") {
    super(message);
    this.name = "ReleaseDraftPersistenceError";
  }
}

type InsertHeader = { insertId?: unknown };

export function requireInsertId(result: unknown): number {
  const header: InsertHeader | undefined = Array.isArray(result)
    ? result[0] as InsertHeader | undefined
    : result as InsertHeader | undefined;
  const insertId = Number(header?.insertId);

  if (!Number.isSafeInteger(insertId) || insertId < 1) {
    throw new ReleaseDraftPersistenceError();
  }

  return insertId;
}
