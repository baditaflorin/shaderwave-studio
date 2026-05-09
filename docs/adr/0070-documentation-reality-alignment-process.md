# 0070 Documentation Reality Alignment Process

- Status: accepted
- Date: 2026-05-10

## Context

The README and earlier docs drifted ahead of the actual product, especially around persistence and usability.

## Decision

The README now lists only verified features and explicit limitations. Phase postmortems and audit documents are updated in the same batch as implementation so public claims and tested behavior move together.

## Consequences

- The live repo explains what the app can actually do today.
- Limitations such as share-link size and missing multi-file ingest are visible instead of surprising.
- Future feature claims should be backed by tests or omitted.

## Alternatives Considered

- Keep README aspirational and let postmortems carry nuance: rejected because users land on the README first.
