# 0064 - DRY Consolidation Map

## Status

Accepted

## Context

Formatting, serialization, and session concerns currently leak across `App.tsx`, audio intelligence, and export modules.

## Decision

Consolidate:

- size/time formatting into one shared module
- project state serialization into one shared module
- session persistence into one shared module

## Consequences

`App.tsx` should shrink and orchestration should get easier to test.
