/**
 * NEX-ARK ↔ Living Nexus Nexus Bridge contract, v0.1.
 *
 * This file is a portable contract for the future standalone NEX-ARK
 * repository. It is intentionally framework- and transport-neutral. It is
 * not a Living Nexus SDK and does not imply any production Living Nexus API.
 */

export type IsoInstant = string;

export type BridgeMode = "mock" | "connected" | "unavailable";

export type BridgeErrorCode =
  | "NOT_FOUND"
  | "NOT_CONNECTED"
  | "NOT_SUPPORTED"
  | "NOT_AUTHORIZED"
  | "NOT_PUBLIC"
  | "CONSENT_REQUIRED"
  | "UPSTREAM_UNAVAILABLE"
  | "INVALID_REFERENCE"
  | "INTEGRITY_UNKNOWN";

export interface BridgeError {
  code: BridgeErrorCode;
  message: string;
  retryable: boolean;
  /** Safe details only; never include tokens, private media URLs, or secrets. */
  details?: Record<string, string | number | boolean | null>;
}

export type BridgeResult<T> =
  | { ok: true; data: T; source: BridgeSource }
  | { ok: false; error: BridgeError; source: BridgeSource };

export interface BridgeSource {
  /** `mock` must be visibly labelled as non-canonical in NEX-ARK. */
  mode: BridgeMode;
  provider: "local-mock" | "living-nexus" | "none";
  fetchedAt: IsoInstant;
  /** Contract/schema version, not a claim about registry version. */
  contractVersion: "nexus-bridge/v0.1";
}

export interface PageRequest {
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor?: string;
}

/** A reference is a pointer to authority, never a duplicate canonical record. */
export interface LivingNexusReference {
  kind: "creator" | "creation" | "witness" | "proof" | "lineage" | "attribution" | "ai-statement";
  /** Stable external identifier such as a creator handle, Living Nexus creator id, or WID. */
  id: string;
  /** Canonical public route only when the adapter is allowed to disclose one. */
  canonicalUrl?: string;
  /** Original provenance system; must remain `living-nexus` for a real reference. */
  authority: "living-nexus";
}

export interface CreatorIdentity {
  reference: LivingNexusReference & { kind: "creator" };
  displayName: string;
  handle?: string;
  avatarUrl?: string;
  sigilUrl?: string;
  biography?: string;
  publicDomainUrl?: string;
  /** Non-sensitive presentation metadata only; absence is normal. */
  visualIdentity?: {
    accentHint?: string;
    bannerUrl?: string;
  };
}

export type CreationVisibility = "public" | "unlisted" | "private" | "unknown";

export interface CreationSummary {
  reference: LivingNexusReference & { kind: "creation" };
  creator: LivingNexusReference & { kind: "creator" };
  title: string;
  contentType: "audio" | "lyrics" | "manuscript" | "comic" | "visual" | "film" | "object-3d" | "model-3d" | "unknown";
  visibility: CreationVisibility;
  coverUrl?: string;
  durationSeconds?: number;
  witnessId?: string;
  canonicalUrl?: string;
  publishedAt?: IsoInstant;
}

export interface Creation extends CreationSummary {
  description?: string;
  creatorDeclaredDates?: {
    creationDate?: string;
    originalReleaseDate?: string;
  };
  album?: {
    reference: LivingNexusReference & { kind: "creation" };
    title: string;
  };
  /** Only declarations explicitly exposed by the connected provider. */
  participation?: {
    music?: string[];
    lyrics?: string[];
    voice?: string[];
  };
}

export interface WitnessProof {
  reference: LivingNexusReference & { kind: "proof" };
  witness: LivingNexusReference & { kind: "witness" };
  creation: LivingNexusReference & { kind: "creation" };
  fileHash?: string;
  publicKeyJwk?: string;
  signature?: string;
  signedPayload?: string;
  signedAt?: IsoInstant;
  verificationState: "verified" | "unverified" | "unknown" | "not-supported";
  /** A technical result, never a legal conclusion. */
  verificationNote?: string;
}

export interface LineageNode {
  reference: LivingNexusReference;
  label: string;
  relation: "self" | "parent" | "derived-from" | "remix-of" | "collection-member" | "unknown";
}

export interface LineageGraph {
  subject: LivingNexusReference & { kind: "creation" };
  nodes: LineageNode[];
  edges: Array<{
    from: string;
    to: string;
    relation: LineageNode["relation"];
    disclosedAt?: IsoInstant;
  }>;
  completeness: "complete" | "partial" | "unknown";
}

export interface AttributionStatement {
  subject: LivingNexusReference & { kind: "creation" };
  creator: LivingNexusReference & { kind: "creator" };
  sourceDeclarations: Array<{
    label: string;
    value: string;
    disclosure: "creator-declared" | "system-observed" | "independently-verified";
  }>;
  credits?: Array<{ role: string; creditedTo: string }>;
}

export interface AIStatement {
  subject: LivingNexusReference & { kind: "creation" };
  classification: "original" | "ai-assisted" | "human-authored-ai-instrument" | "ai-generated" | "unknown";
  disclosure?: string;
  source: "creator-declared" | "system-recorded" | "unknown";
}

export interface VerificationResult {
  reference: LivingNexusReference;
  state: "verified" | "unverified" | "unknown" | "not-supported";
  checkedAt: IsoInstant;
  note?: string;
}

export interface BridgeReadContext {
  /** NEX-ARK account id; never substitute a Living Nexus user id. */
  nexArkAccountId?: string;
  /** Explicit scopes granted to the Bridge by the NEX-ARK user. */
  grantedScopes: Array<"identity:read" | "works:read" | "proof:read" | "lineage:read" | "attribution:read" | "ai:read">;
  /** Prevent a mock adapter from masquerading as a connected canonical source. */
  requireCanonical?: boolean;
}

export interface CreatorIdentityProvider {
  getCreator(reference: LivingNexusReference & { kind: "creator" }, context: BridgeReadContext): Promise<BridgeResult<CreatorIdentity>>;
  resolveCreator(input: { handle?: string; creatorId?: string }, context: BridgeReadContext): Promise<BridgeResult<CreatorIdentity>>;
}

export interface CreationProvider {
  getCreatorWorks(creator: LivingNexusReference & { kind: "creator" }, page: PageRequest, context: BridgeReadContext): Promise<BridgeResult<Page<CreationSummary>>>;
  getCreation(reference: LivingNexusReference & { kind: "creation" }, context: BridgeReadContext): Promise<BridgeResult<Creation>>;
}

export interface ProvenanceProvider {
  getProof(creation: LivingNexusReference & { kind: "creation" }, context: BridgeReadContext): Promise<BridgeResult<WitnessProof>>;
}

export interface LineageProvider {
  getLineage(creation: LivingNexusReference & { kind: "creation" }, context: BridgeReadContext): Promise<BridgeResult<LineageGraph>>;
}

export interface WitnessProvider {
  getWitness(witness: LivingNexusReference & { kind: "witness" }, context: BridgeReadContext): Promise<BridgeResult<WitnessProof>>;
  verifyReference(reference: LivingNexusReference, context: BridgeReadContext): Promise<BridgeResult<VerificationResult>>;
}

export interface AttributionProvider {
  getAttribution(creation: LivingNexusReference & { kind: "creation" }, context: BridgeReadContext): Promise<BridgeResult<AttributionStatement>>;
  getAIStatement(creation: LivingNexusReference & { kind: "creation" }, context: BridgeReadContext): Promise<BridgeResult<AIStatement>>;
}

export interface NexusBridge {
  readonly source: BridgeSource;
  readonly creatorIdentity: CreatorIdentityProvider;
  readonly creations: CreationProvider;
  readonly provenance: ProvenanceProvider;
  readonly lineage: LineageProvider;
  readonly witness: WitnessProvider;
  readonly attribution: AttributionProvider;
}

/**
 * Required mock-adapter behavior:
 * 1. Return source.mode === "mock" on every result.
 * 2. Use only clearly fictional fixture ids and URLs.
 * 3. Return NOT_SUPPORTED for verification unless a deterministic local fixture proves it.
 * 4. Never emit a WID-shaped fixture as though it was issued by Living Nexus.
 */
