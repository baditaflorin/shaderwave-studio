# 0071 Stranger Test Findings And Response

- Status: accepted
- Date: 2026-05-10

## Context

Phase 3 required a cold-start stranger test to catch demo-only assumptions.

## Decision

Use a private browsing session and real saved-state round-trip as the acceptance path. The top three issues found were fixed immediately: file-input selector conflict, weak shader aesthetics, and undocumented share-link limits.

## Consequences

- The app now validates a realistic save/reset/restore path instead of only the happy-path export demo.
- Smoke coverage explicitly exercises a stranger workflow.
- Remaining usability risk is now concentrated in out-of-scope input modes rather than core workflow confusion.

## Alternatives Considered

- Rely on existing Phase 2 demos: rejected because they under-tested resumability.
