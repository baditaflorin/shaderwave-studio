# 0013 - Testing Strategy

## Status

Accepted

## Context

The highest-risk logic is FFT band extraction, settings validation, rendering initialization, and Pages routing.

## Decision

Use Vitest for unit tests and Playwright for one static Pages smoke path. `make smoke` builds, serves the Pages output, loads the app, and exercises the demo audio path.

## Consequences

Checks stay fast enough for local hooks. Browser-only WebGPU availability is tested through capability UI and graceful fallback.

## Alternatives Considered

Large media fixture e2e exports were rejected because FFmpeg-WASM startup would make pre-push too slow.
