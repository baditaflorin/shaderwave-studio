# 0042 - Inference Engine And Confidence

## Status

Accepted

## Context

Users should not configure basic audio facts or manually notice silence, clipping, and long render costs.

## Decision

Infer source profile, container, loudness health, clipping, truncation risk, render cost, and suggested export settings. Every inference carries a confidence score, explanation, and optional next step.

## Consequences

Warnings become part of project state and export provenance.

## Alternatives Considered

Only displaying raw technical metadata was rejected because it still makes the user do the domain interpretation.
