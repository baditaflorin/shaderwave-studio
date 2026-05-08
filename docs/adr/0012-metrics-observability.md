# 0012 - Metrics And Observability

## Status

Accepted

## Context

Usage analytics are optional for Mode A/B and must avoid PII.

## Decision

Ship with no analytics. The UI exposes local capability status for WebGPU, Web Audio, and FFmpeg-WASM.

## Consequences

No user behavior or audio metadata is collected. Product learning will come from issues and direct feedback.

## Alternatives Considered

Plausible was considered but deferred until there is a clear question analytics can answer.
