# 0069 Type Safety Policy At Boundaries

- Status: accepted
- Date: 2026-05-10

## Context

Session import/export crosses browser APIs, compressed URL payloads, IndexedDB, and user-pasted JSON. Those are the highest-risk places for accidental trust.

## Decision

Every persisted or imported session payload is validated with Zod before restore. Browser file and clipboard boundaries convert to plain text or `File` first, then flow through schema validation and explicit restoration helpers.

## Consequences

- Phase 3 portability features fail loudly instead of half-hydrating bad state.
- Boundary code stays slightly more verbose, but safer.
- Schema evolution work will stay localized.

## Alternatives Considered

- Trust `JSON.parse` output and cast it: rejected because it reintroduces silent wrongness at the resume boundary.
