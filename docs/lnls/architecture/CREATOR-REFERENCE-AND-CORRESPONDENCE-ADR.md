# ADR — Creator References and Witnessing Circle Correspondence

**Status:** Accepted — additive implementation in progress; migration generated and applied to the current development database
**Date:** 2026-10-03  
**Scope:** Creator mentions in public Work Signals and consent-based creator correspondence from the Witnessing Circle

## Current verified boundary

Living Nexus currently has a public Work conversation model:

```text
comments
  ├── songId
  ├── userId
  ├── content
  └── parentId (reply threading)
```

A submitted comment is also recorded as a `COMMENT` activity event and can notify the Work owner. The existing table has **no structured creator-reference relation**, and the product has **no creator-to-creator direct-message tables, consent policy, block list, or moderation workflow**. The PNA/Keeper chat is an AI interaction and must not be repurposed as creator correspondence.

## Decision

Keep **Work Signals** public, attributable, and linked to a Work. Add structured references as an additive relation, rather than parsing `@handle` strings every time a Signal is rendered.

Treat private correspondence as a separate, consent-based product surface within the Witnessing Circle. Do not claim end-to-end encryption unless client-side encryption, key exchange, recovery, and attachment handling are designed and verified separately.

## Accepted additive schema

### 1. Public creator references in Work Signals

```text
commentMentions
├── id                         PK
├── commentId                  FK → comments.id, cascade delete
├── mentionedUserId            FK → users.id
├── mentionedHandleSnapshot    varchar(128)   // display/audit snapshot at send time
├── createdAt                  timestamp
└── UNIQUE(commentId, mentionedUserId)
```

**Write flow**

1. The composer resolves typed `@handle` tokens against public creator handles.
2. The server independently validates each resolved creator and writes the Signal plus mention rows in one transaction.
3. The referenced creator receives a dedicated `signal_mention` notification that links to the Work and exact Signal.
4. Rendered text uses the persisted relation to create safe profile links; raw user input remains escaped.

**Non-goals**

- A mention never implies contribution, co-authorship, licensing, endorsement, or provenance participation.
- A mention does not change a Work’s WID, Registry, or Participation Chain.
- Unresolved handles remain plain text rather than generating phantom accounts or links.

### 2. Witnessing Circle correspondence

```text
correspondenceThreads
├── id                         bigint PK
├── kind                       enum('direct')
├── directKey                  char(64) UNIQUE  // deterministic pair key for two users
├── initiatedByUserId          FK → users.id
├── workContextId              FK → songs.id NULL
├── createdAt                  timestamp
├── updatedAt                  timestamp
└── closedAt                   timestamp NULL

correspondenceParticipants
├── threadId                   FK → correspondenceThreads.id, cascade delete
├── userId                     FK → users.id
├── role                       enum('initiator','recipient')
├── state                      enum('requested','accepted','declined','left','blocked')
├── lastReadMessageId          bigint NULL
├── joinedAt                   timestamp
├── respondedAt                timestamp NULL
└── PRIMARY KEY(threadId, userId)

correspondenceMessages
├── id                         bigint PK
├── threadId                   FK → correspondenceThreads.id, cascade delete
├── senderId                   FK → users.id
├── body                       text
├── workContextId              FK → songs.id NULL
├── clientMessageId            varchar(64)  // sender idempotency key
├── createdAt                  timestamp
├── editedAt                   timestamp NULL
├── deletedAt                  timestamp NULL
└── UNIQUE(threadId, senderId, clientMessageId)

correspondenceBlocks
├── blockerUserId              FK → users.id
├── blockedUserId              FK → users.id
├── createdAt                  timestamp
└── PRIMARY KEY(blockerUserId, blockedUserId)

creatorContactSettings
├── userId                     FK → users.id, PK
├── incomingPolicy             enum('none','mutual_witnesses','witnesses','all')
├── allowWorkContext           boolean
├── updatedAt                  timestamp
└── createdAt                  timestamp
```

## Authorization and safety rules

- Only authenticated humans may request correspondence.
- A request is allowed only when the recipient’s `incomingPolicy` permits it. The implementation default is **`witnesses`**: the requester must already witness the recipient, and the recipient must explicitly accept before any message is sent. Creators can tighten this to `mutual_witnesses` or close requests entirely.
- A request remains silent to the sender until accepted; it must never reveal a private block or hidden contact policy.
- Every thread/message query verifies participation server-side. No client-supplied user ID determines access.
- Work context is optional and references a published Work only; it is an invitation context, not a statement of participation or rights.
- Blocks terminate existing access and prevent new requests.
- Requests and messages are rate limited server-side; a durable report/review record, request decline, and block controls ship with the initial correspondence surface. Retention/deletion policy remains a separate governance decision; messages are not advertised as ephemeral.
- Standard server-stored messaging is private-to-participants, **not end-to-end encrypted**.

## Delivery sequence

1. Implement `commentMentions` and creator-reference notifications for public Signals.
2. Add contact settings and block controls.
3. Add correspondence request/accept/decline with a thread inbox in the Witnessing Circle.
4. Add messages, unread state, notifications, reports, and moderation operations.
5. Add live delivery only after the durable, authorized message model is complete.

## Implementation record

- `drizzle/0135_dazzling_firebird.sql` is the first generated migration after the reconciled `0134` baseline. It creates the reference/correspondence tables and extends the existing notification enum with `signal_mention` and `correspondence`.
- The migration has been source-reviewed for additive DDL only. It has **not** been applied to a shared, staging, or production database as part of this decision record.
- The implementation does not reuse `pnaThreads`; PNA remains creator-private AI context, while these tables carry only human participant correspondence.

## Current interface refinement

The Circle may expose support for a creator’s latest eligible public Work because that routes through the existing `SupportCreatorDrawer`. It must not expose a fake chat affordance before the correspondence schema and consent flow exist.
