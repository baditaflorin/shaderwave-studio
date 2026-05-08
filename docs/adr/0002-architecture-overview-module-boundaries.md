# 0002 - Architecture Overview And Module Boundaries

## Status

Accepted

## Context

The app combines audio analysis, rendering, export, storage, and UI concerns.

## Decision

Use feature folders under `src/features/`: `audio`, `visualizer`, `export`, `project`, and `ui`. Shared app constants live under `src/config`.

## Consequences

Rendering and export can share the same band sampling and 2D shader math without coupling UI controls to low-level media code.

## Alternatives Considered

A flat component-only structure was rejected because FFT, WebGPU, and FFmpeg code need clear boundaries.
