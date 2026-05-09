# Phase 3 Codebase Audit

Date: 2026-05-10

## DRY Violations

- Formatting helpers duplicated:
  [src/App.tsx](/Users/live/Documents/Codex/2026-05-08/implemment-the-following-music-to-visualizer/src/App.tsx:1201) and [src/features/audio/intelligence.ts](/Users/live/Documents/Codex/2026-05-08/implemment-the-following-music-to-visualizer/src/features/audio/intelligence.ts:678)
- Export/state serialization concepts split across app and export modules:
  [src/App.tsx](/Users/live/Documents/Codex/2026-05-08/implemment-the-following-music-to-visualizer/src/App.tsx:483) and [src/features/export/provenance.ts](/Users/live/Documents/Codex/2026-05-08/implemment-the-following-music-to-visualizer/src/features/export/provenance.ts:82)

## SOLID Violations

- `App.tsx` is a god module at 1215 lines with state orchestration, playback, export, persistence, formatting, and presentational components:
  [src/App.tsx](/Users/live/Documents/Codex/2026-05-08/implemment-the-following-music-to-visualizer/src/App.tsx:1)
- `intelligence.ts` is strong but large at 718 lines and mixes sniffing, persistence-adjacent hashing, user-facing phrasing, and export suggestions:
  [src/features/audio/intelligence.ts](/Users/live/Documents/Codex/2026-05-08/implemment-the-following-music-to-visualizer/src/features/audio/intelligence.ts:1)

## Dead Code / Overbuilt Infra

- `QueryClientProvider` is mounted, but there is no query usage anywhere:
  [src/main.tsx](/Users/live/Documents/Codex/2026-05-08/implemment-the-following-music-to-visualizer/src/main.tsx:1)

## TODO / FIXME / XXX / HACK Count

- Source count: `0`

## Type Safety Holes

- No `any` or `@ts-ignore` found in app source.
- A few `as` casts remain for controlled value narrowing:
  [src/App.tsx](/Users/live/Documents/Codex/2026-05-08/implemment-the-following-music-to-visualizer/src/App.tsx:740)

## Real-User Path Coverage Gaps

- No tests for session restore
- No tests for state export/import round-trip
- No tests for drag/drop specifically
- No tests for shader visual quality regressions
- No tests for start-fresh flow
