# 0044 - Confidence Surface In UI And Export

## Status

Accepted

## Context

Silent wrongness is worse than an obvious failure.

## Decision

Show confidence on the loaded project and attach warning confidence to MP4 metadata. Low-confidence warnings are visible before export and remain in debug/provenance data.

## Consequences

Export code needs a stable provenance payload and deterministic serialization.

## Alternatives Considered

Keeping confidence internal was rejected because the user cannot correct what they cannot see.
