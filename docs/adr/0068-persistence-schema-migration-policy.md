# 0068 Persistence Schema And Migration Policy

- Status: accepted
- Date: 2026-05-10

## Context

Phase 3 introduced real project persistence. Without an explicit schema and migration rule, autosave and portable JSON would become a silent compatibility hazard.

## Decision

Persisted and portable session formats are both versioned with `schemaVersion: 1` and validated with Zod before restore. Portable sessions include app version metadata; autosave uses IndexedDB and stores the current session under a stable key.

## Consequences

- Invalid or stale state is rejected at the boundary instead of corrupting runtime state.
- Future schema changes have a clear place to add migrations.
- Saved project JSON is now the canonical manual backup/export format.

## Alternatives Considered

- Unversioned local JSON blobs: rejected because they are too fragile across releases.
- Store only settings and re-run analysis every time: rejected because it breaks the resume promise.
