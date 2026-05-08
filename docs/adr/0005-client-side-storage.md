# 0005 - Client-Side Storage Strategy

## Status

Accepted

## Context

The app needs to remember lightweight UI and shader settings, not sync user projects across devices.

## Decision

Use `localStorage` validated with zod for settings. Keep dropped audio files in memory only. Consider IndexedDB/OPFS later for explicit saved projects.

## Consequences

No private audio is persisted without a deliberate future feature. Settings survive refreshes.

## Alternatives Considered

IndexedDB was considered for complete project persistence but deferred to keep v1 privacy-preserving and predictable.
