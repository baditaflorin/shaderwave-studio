# 0061 - Input Pathway Coverage Policy

## Status

Accepted

## Context

Audio file loading works, but project-state loading, restore, and paste are missing.

## Decision

Support these first-class inputs in Phase 3:

- file picker
- drag and drop
- demo
- imported project state file
- pasted project state JSON or share link
- autosave restore

Explicitly leave multi-file batch, folder import, and remote audio URL ingest out of scope for this static build.

## Consequences

The session model must become serializable and versioned.

## Alternatives Considered

Building URL/CORS ingestion first was rejected because saved-state portability is a more common and more static-safe workflow.
