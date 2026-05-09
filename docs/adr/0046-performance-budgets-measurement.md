# 0046 - Performance Budgets And Measurement

## Status

Accepted

## Context

Long audio and FFmpeg export are the slowest paths.

## Decision

Use the Phase 2 fixture timings as baseline. Show progress for analysis/export, make export cancellable between frame renders, cache analysis by fingerprint, and warn on large render jobs.

## Consequences

The first implementation still decodes audio on the browser's Web Audio path, but expensive repeated analysis is avoided.

## Alternatives Considered

Moving all analysis into a worker was deferred because Web Audio decoding remains main-thread/browser-bound and cache plus cancellation handles the audited pain first.
