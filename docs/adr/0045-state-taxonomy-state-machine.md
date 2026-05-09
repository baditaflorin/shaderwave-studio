# 0045 - State Taxonomy And State Machine

## Status

Accepted

## Context

Analysis/export can now fail or be cancelled without losing a previous project.

## Decision

Model empty, analyzing, ready-ok, ready-warning, rejected-recoverable, exporting, export-ready, cancelled, and fatal-runtime states. New analysis aborts old analysis/export and recoverable failures keep the current project.

## Consequences

The UI gains cancel paths and a small session log.

## Alternatives Considered

Boolean-only loading flags were rejected because they allow half-loaded states.
