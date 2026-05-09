# 0065 - Module Boundaries And Dependency Direction

## Status

Accepted

## Context

`App.tsx` currently mixes orchestration, persistence, and presentational UI in one place.

## Decision

Split toward:

- `features/project/` for project/session persistence and state portability
- `features/ui/` for visual panels and form controls
- `features/visualizer/` for render logic only

`App.tsx` remains the composition root, not the implementation root.

## Consequences

Tests can target state and UI modules separately, and future work has clearer seams.
