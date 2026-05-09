# Phase 3 Feature Claims Audit

Date: 2026-05-10

| Claim                                 | Source               | Status          | Notes                                                              |
| ------------------------------------- | -------------------- | --------------- | ------------------------------------------------------------------ |
| Browser-only GitHub Pages app         | README, ADR 0001     | `shipped fully` | True.                                                              |
| Drop an MP3 and export MP4 in browser | README               | `shipped fully` | Wider than MP3 now, but claim is still true.                       |
| WebGPU shader preview                 | README               | `shipped fully` | Preview uses WebGPU when available and falls back gracefully.      |
| Local settings persistence            | README, ADR 0005     | `shipped fully` | Visual settings persist.                                           |
| Project/session persistence           | README, Phase 3 docs | `shipped fully` | Portable state JSON, autosave restore, and pasted import are live. |
| Debug support                         | ADR 0049, README     | `shipped fully` | `?debug=1` is now documented.                                      |
| Deterministic export metadata         | ADR 0048, postmortem | `shipped fully` | Provenance sidecar and MP4 comment metadata exist.                 |

## Mismatch Priority

1. Share-link capability is deliberately size-limited and must stay documented as such.
2. Mobile picker behavior still lacks explicit device validation.
3. Multi-file ingest remains intentionally out of scope and should stay out of feature summaries.
