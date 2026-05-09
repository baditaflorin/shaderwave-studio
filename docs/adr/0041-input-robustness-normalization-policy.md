# 0041 - Input Robustness And Normalization Policy

## Status

Accepted

## Context

The upload boundary currently trusts MIME type or extension and lets Web Audio discover bad inputs late.

## Decision

Read the file bytes once, sniff common audio signatures, normalize container names, detect empty/text/HTML spoofing, and run MP3 frame-boundary checks before decode. Decoding failures are mapped to recoverable audio errors.

## Consequences

The app can reject spoofed files before expensive decode and can warn on likely partial streams.

## Alternatives Considered

Full media parsing libraries were rejected for v2 because the needed signatures and MP3 frame checks are small and testable.
