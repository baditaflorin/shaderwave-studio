# 0040 - Real-Data Audit Findings And Substance Success Metrics

## Status

Accepted

## Context

The Phase 2 audit found that common formats load, but the app is wrong-confident for silent and truncated audio and vague for broken or spoofed files.

## Decision

Use the 10 audit inputs as the Phase 2 grading set. The engine must classify source health, expose confidence and warnings, reject non-audio inputs before decode, and preserve the last valid project on recoverable failures.

## Consequences

The core analyzer becomes responsible for both FFT data and audio-domain judgment. The UI must show warnings and confidence before export.

## Alternatives Considered

Leaving errors as decoder failures was rejected because it does not help music-video users recover.
