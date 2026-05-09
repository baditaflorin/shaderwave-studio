# Phase 2 Substance Plan

Status: accepted for implementation

This plan is ranked by the real-data audit, not implementation novelty. The goal is the same surface area with a smarter engine.

## Picklist

| Rank | Catalog item | Implementation target                                | Audit reason                                                      |
| ---- | -----------: | ---------------------------------------------------- | ----------------------------------------------------------------- |
| 1    |           32 | Actionable audio errors with what/why/next-step copy | Empty/spoofed files fail with raw decoder text.                   |
| 2    |           33 | Validate file boundaries before decode               | Spoofed `.mp3` should fail before Web Audio.                      |
| 3    |           12 | Domain-aware validation warnings                     | Silent/truncated files need music-video language.                 |
| 4    |           16 | Confidence scores on every inference                 | No silent wrongness.                                              |
| 5    |           18 | Surface anomalies                                    | Silence, clipping, truncation, suspicious containers.             |
| 6    |            6 | Auto-detect audio structure                          | Infer song, long track, clip, silence, or partial file.           |
| 7    |            7 | Auto-classify audio fields                           | Container, duration, loudness, channels, fingerprint.             |
| 8    |            8 | Useful first guess on input                          | Health read and export suggestion appear on load.                 |
| 9    |            9 | Format normalization                                 | Normalize extension/container names and safe output names.        |
| 10   |           14 | Domain-aware export                                  | MP4 metadata carries source/settings/warnings.                    |
| 11   |           38 | Output provenance                                    | Version, commit, fingerprint, settings, warnings.                 |
| 12   |           35 | Deterministic outputs                                | Same input/settings produce identical analysis/provenance/export. |
| 13   |            4 | Partial inputs                                       | Detect likely incomplete MP3 streams.                             |
| 14   |            5 | Adversarial input                                    | Reject HTML/text masquerading as audio.                           |
| 15   |            3 | Huge inputs                                          | Define file/render budgets and surface cost.                      |
| 16   |           26 | Cancellation actually cancels                        | Analyze/export can be aborted by the user.                        |
| 17   |           27 | Concurrency safety                                   | New file aborts prior analysis/export; double-clicks are safe.    |
| 18   |           25 | No stuck states                                      | Every loading/error/export state has an exit.                     |
| 19   |           24 | State taxonomy                                       | Document and model expected reachable states.                     |
| 20   |           17 | Suggest fixes                                        | Warnings include next-step suggestions.                           |
| 21   |           19 | Explain decisions                                    | Warnings/facts include reason text.                               |
| 22   |           31 | Cache expensive things                               | Reuse analysis by source fingerprint.                             |
| 23   |           36 | Inspectable history                                  | Session log records load/reject/export/cancel.                    |
| 24   |           37 | Debug overlay                                        | `?debug=1` exposes internal state and warnings.                   |
| 25   |           11 | Domain vocabulary                                    | UI says audio health, silence, clipping, partial track.           |
| 26   |           28 | Profile real data                                    | Document baseline and after numbers.                              |
| 27   |            1 | Fuzz parser with fixtures                            | Real and synthetic boundary tests cover crash paths.              |
| 28   |           34 | Recoverable vs fatal                                 | Rejected input keeps the existing project intact.                 |
| 29   |           22 | Stable IDs                                           | Projects derive stable IDs from source fingerprint.               |

## Acceptance

- All 10 audit fixtures have sibling expected files under `test/fixtures/realdata/`.
- Unit tests cover sniffing, validation, warnings, confidence, deterministic IDs, and provenance.
- Playwright loads the 10 real-data fixtures and asserts the expected visible behavior.
- `make test`, `make build`, and `make smoke` pass before tagging.
