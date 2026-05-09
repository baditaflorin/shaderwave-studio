# Phase 3 Feature Claims Audit

Date: 2026-05-10

| Claim                                 | Source               | Status              | Notes                                                                                           |
| ------------------------------------- | -------------------- | ------------------- | ----------------------------------------------------------------------------------------------- |
| Browser-only GitHub Pages app         | README, ADR 0001     | `shipped fully`     | True.                                                                                           |
| Drop an MP3 and export MP4 in browser | README               | `shipped fully`     | Wider than MP3 now, but claim is true.                                                          |
| WebGPU shader preview                 | README               | `shipped partially` | Works when available, but export uses Canvas 2D parity path rather than captured WebGPU output. |
| Local settings persistence            | README, ADR 0005     | `shipped fully`     | Visual settings persist.                                                                        |
| Project/session persistence           | implied by usability | `not shipped`       | No saved project state yet.                                                                     |
| Debug support                         | ADR 0049             | `shipped partially` | `?debug=1` exists but is undocumented.                                                          |
| Deterministic export metadata         | ADR 0048, postmortem | `shipped fully`     | Provenance sidecar and MP4 comment metadata exist.                                              |

## Mismatch Priority

1. README talks about a creator workflow, but there is no save/import workflow.
2. Architecture/docs mention local storage, but only settings persist.
3. Debug capability exists but is invisible to users.
