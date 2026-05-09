# 0062 - Output Pathway Coverage Policy

## Status

Accepted

## Context

The app exports media, but not the full project state needed to resume work elsewhere.

## Decision

Phase 3 outputs are:

- MP4 export
- provenance JSON export
- full project state JSON export
- clipboard copy for project state and provenance

Share URLs for full audio projects remain constrained by payload size and stay documented as limited.

## Consequences

The saved-state format must be compact, versioned, and validated.

## Alternatives Considered

Print/PDF output was rejected as not central to music-video workflows.
