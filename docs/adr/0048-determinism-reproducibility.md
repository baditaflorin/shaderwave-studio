# 0048 - Determinism And Reproducibility

## Status

Accepted

## Context

Music-video exports need to be rerunnable and supportable.

## Decision

Use fingerprint-derived project IDs, stable JSON serialization, deterministic export metadata, and deterministic analyzer output for the same input/settings.

## Consequences

Generated provenance must avoid wall-clock timestamps unless explicitly separated from deterministic payloads.

## Alternatives Considered

Timestamp-only provenance was rejected because it does not reproduce the work.
