# Phase 3 Postmortem

Date: 2026-05-10

Version: 0.3.0

## Audit Grid Shift

- Input audit: 5 green / 1 yellow / 7 red -> 8 green / 2 yellow / 4 red
- Output audit: 3 green / 1 yellow / 6 red -> 6 green / 1 yellow / 3 red
- Controls audit: session controls moved from red to green
- Feature claims: save/import/debug moved from partial or missing to shipped

## Finished / Hidden / Deleted

- Finished: autosave restore, project JSON export, pasted/imported state restore, start-fresh reset, copy-state controls, compact share links
- Finished: shader visual pass for WebGPU and Canvas fallback
- Deleted: unused React Query bootstrap
- Kept with limits: share links, runtime capability panel
- Left out of scope: multi-file ingest, audio URL ingest, print/PDF, embed output

## Codebase Health

- Duplicated formatting helpers were consolidated into `src/features/project/format.ts`
- Session serialization moved into `src/features/project/sessionState.ts`
- Query-client dead bootstrapping was removed from `src/main.tsx`
- Real-user-path coverage improved with saved-state e2e coverage
- `App.tsx` is still larger than ideal and remains the biggest cleanup target for the next phase

## Stranger Test

See https://github.com/baditaflorin/shaderwave-studio/blob/main/docs/phase3/stranger-test.md

Top three addressed:

1. Hidden file-input conflict fixed
2. Weak shader look replaced with stronger visual composition
3. Share-link limits documented and surfaced

## What Surprised Us

- The visual quality problem mattered as much as the persistence gap; the app technically worked before, but it still felt cheap.
- Share links are useful, but only within a hard URL-size budget, so JSON export remains the honest default for full projects.
- The browser test suite caught a real regression introduced by the new state-import control before users had to.

## Still Open

1. Split `src/App.tsx` further so orchestration is easier to change safely
2. Real-device validation for mobile file input behavior
3. Explicit clipboard-read input flow
4. Multi-file ingest strategy, if it ever becomes a product goal
5. More user-guided runtime fallback messaging

## Honest Take

Could a stranger use this for real work end-to-end with zero help? Much closer to yes now.

Yes for the core single-project workflow: load audio, inspect health, tweak visuals, export MP4, save state, reload, and continue.

Still not fully yes for every imaginable workflow: batch ingest is absent, audio URL loading is absent, and share links are intentionally limited by payload size. The app is no longer a toy on the main path, but there is still refactor debt and a few deliberately missing input modes around the edges.
