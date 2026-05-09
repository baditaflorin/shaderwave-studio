# 0066 Error Handling Convention

- Status: accepted
- Date: 2026-05-10

## Context

Phase 3 added more user-facing boundaries: autosave, import/export, pasted state, scene links, and clipboard actions. These paths needed one consistent way to turn raw failures into actionable UI.

## Decision

All browser-facing failures pass through `toUserFacingAudioIssue` before they reach toast or session-log copy. Session actions use the same `message + next step` pattern already established in Phase 2.

## Consequences

- Users see one error language across audio, export, and session flows.
- Tests can assert behavior through visible copy rather than implementation details.
- Some non-audio failures still reuse audio-oriented issue names; that remains acceptable until a broader app-level taxonomy is worth the extra surface.

## Alternatives Considered

- Add a second session-specific error mapper: rejected as duplication.
- Expose raw exception text: rejected as too brittle and too technical.
