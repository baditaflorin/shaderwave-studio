# Phase 3 Findings

Date: 2026-05-10

## Top 5 Usability Gaps

1. Users cannot save a project and resume it later.
2. There is no import path for a previously exported project state.
3. The app has no reset path; once a project is loaded, there is no clean way to clear it.
4. Output is not portable enough: MP4 and provenance exist, but not full-state round-trip.
5. The preview visuals are technically reactive but aesthetically thin, especially in bars/prism mode.

## Top 5 Half-Baked Features

1. Session persistence: finish
2. Debug overlay discoverability: finish
3. Runtime capability panel: keep, but make it supportive
4. Query client bootstrapping with no queries: delete
5. Share URL for full audio projects: hide / explicitly out of scope

## Top 5 Codebase Pain Points

1. `App.tsx` owns too many responsibilities.
2. Format and state serialization helpers are duplicated.
3. Session actions are scattered across callbacks rather than living in one module.
4. Presentational UI and orchestration logic are interleaved.
5. Tests focus on Phase 2 flows, not long-lived user workflows.

## Top 5 Documentation / Reality Mismatches

1. README implies an end-to-end creator tool, but there is no save/import workflow.
2. Storage is documented, but only settings persist.
3. Debug support exists but is undocumented.
4. There is no limitations section explaining why link-sharing huge audio projects is not supported.
5. There is no verified feature checklist in README.

## Fully Usable Means

- A stranger can load their own audio, inspect it, tune the scene, export MP4, save the project, reload the page, and continue.
- A stranger can export state from one browser and import it into another without losing the project.
- A stranger can recover from mistakes with clear reset and restore paths.
- A stranger can tell, from the UI alone, whether the current project is safe to export.

## Phase 3 Success Metrics

- State export/import round-trip passes in tests.
- Autosave restore works across reload for at least one real-data fixture and the demo.
- Every visible session control has a real end-to-end handler.
- `App.tsx` drops below 700 lines.
- README feature checklist matches tested behavior.

## Out Of Scope

- Server-side sync
- Full audio URL ingestion across CORS-restricted origins
- Multi-file batch studio workflows
- Print/PDF export
- New auth, backend, or architecture changes
