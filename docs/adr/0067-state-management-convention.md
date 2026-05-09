# 0067 State Management Convention

- Status: accepted
- Date: 2026-05-10

## Context

The app is still Mode A and intentionally small, but by Phase 3 it had enough persistence and export behavior that ad hoc local state was becoming fragile.

## Decision

Keep React local state for live interaction, but centralize portable/autosaved session shape in `src/features/project/sessionState.ts`. UI components stay presentational; `App.tsx` orchestrates and the session module owns schema, serialization, import/export, and storage contracts.

## Consequences

- One canonical session shape now drives autosave, paste import, file export, and share links.
- The app avoids introducing a global state library without returning to scattered serialization logic.
- `App.tsx` is still too large, but the persistence boundary is no longer duplicated.

## Alternatives Considered

- Zustand or Redux: rejected as unnecessary architecture escalation.
- Keep serialization inline in `App.tsx`: rejected because Phase 3 required repeatable round-trip behavior.
