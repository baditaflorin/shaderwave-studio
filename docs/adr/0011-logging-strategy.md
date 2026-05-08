# 0011 - Logging Strategy

## Status

Accepted

## Context

Mode A has no server logs. Production browser console noise should stay low.

## Decision

Use visible UI errors for user-action failures. Keep console logging out of production code except browser/devtool surfaced errors from third-party APIs.

## Consequences

Creators see actionable errors without needing DevTools. Debug detail can be added behind a future diagnostics panel.

## Alternatives Considered

Remote log collection was rejected as unnecessary tracking for v1.
