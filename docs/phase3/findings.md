# Phase 3 Findings

Date: 2026-05-10

## Top 5 Usability Gaps

1. Users could not save a project and resume it later.
2. There was no import path for a previously exported project state.
3. The app had no reset path; once a project was loaded, there was no clean way to clear it.
4. Output was not portable enough: MP4 and provenance existed, but not full-state round-trip.
5. The preview visuals were technically reactive but aesthetically thin, especially in bars/prism mode.

## Top 5 Half-Baked Features

1. Session persistence: finished
2. Debug overlay discoverability: finished
3. Runtime capability panel: kept
4. Query client bootstrapping with no queries: deleted
5. Share URL for full audio projects: kept with explicit size limit and fallback

## Top 5 Codebase Pain Points

1. `App.tsx` still owns too many responsibilities.
2. Format and state serialization helpers were duplicated.
3. Session actions were scattered across callbacks rather than living in one module.
4. Presentational UI and orchestration logic were interleaved.
5. Tests focused on Phase 2 flows, not long-lived user workflows.

## Top 5 Documentation / Reality Mismatches

1. README implied an end-to-end creator tool, but there was no save/import workflow.
2. Storage was documented, but only settings persisted.
3. Debug support existed but was undocumented.
4. There was no limitations section explaining why link-sharing huge audio projects is not supported.
5. There was no verified feature checklist in README.

## Fully Usable Means

- A stranger can load their own audio, inspect it, tune the scene, export MP4, save the project, reload the page, and continue.
- A stranger can export state from one browser and import it into another without losing the project.
- A stranger can recover from mistakes with clear reset and restore paths.
- A stranger can tell, from the UI alone, whether the current project is safe to export.

## Phase 3 Success Metrics

- State export/import round-trip passes in tests.
- Autosave restore works across reload for the demo and shared-link sessions.
- Every visible session control has a real end-to-end handler.
- Query-client dead bootstrapping is removed.
- README feature checklist matches tested behavior.

## Out Of Scope

- Server-side sync
- Full audio URL ingestion across CORS-restricted origins
- Multi-file batch studio workflows
- Print/PDF export
- New auth, backend, or architecture changes
