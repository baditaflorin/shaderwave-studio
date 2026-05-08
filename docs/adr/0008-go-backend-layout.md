# 0008 - Go Backend Project Layout

## Status

Accepted

## Context

The bootstrap standard includes Go backend guidance for Modes B and C.

## Decision

Skip Go backend layout in Mode A. No `cmd/`, `internal/`, `pkg/`, runtime API, Docker image, or Go data generator is required.

## Consequences

The repository stays focused on the static frontend. If a future backend is introduced, it must get a new ADR before implementation.

## Alternatives Considered

Adding an empty Go skeleton was rejected because it would imply an operational surface that v1 does not use.
