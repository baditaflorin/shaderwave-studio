# Phase 2 Substance Postmortem

Date: 2026-05-09

Version: 0.2.0

## Real-Data Pass Rate

Before: 6/10 inputs completed without obvious failure, but 2 of those were wrong-confident: silent audio and truncated audio both looked successful.

After: 10/10 inputs now complete the intended primary outcome:

- 7 valid audio inputs load with preview, audio health, confidence, and export readiness.
- 1 silent input loads with a visible low-energy warning.
- 1 truncated MP3 loads with a visible partial-stream warning.
- 2 invalid inputs are rejected with recoverable, actionable messages while the previous project remains intact.

## Top 5 Logic Gaps Closed

1. Decode success no longer means full trust. Audio health warnings can downgrade confidence after a successful decode.
2. The app now classifies source profile: song, long track, short clip, silent track, or partial track.
3. Empty/spoofed inputs now fail with domain errors instead of raw browser decoder text.
4. Export defaults are source-aware and can be reapplied inline.
5. Long work has visible progress and cancellation paths for analysis/export.

## Smart Behaviors Delivered

- Dropping audio produces an immediate health read with duration, channel count, container, loudness, fingerprint, confidence, and warnings.
- Silent and truncated fixtures are no longer silently accepted as normal.
- MP4 export carries deterministic provenance metadata, and the UI exposes a provenance JSON download.
- `?debug=1` exposes state, source, insight, settings, provenance, and session log for support.
- Session history records load/reject/export/cancel activity.

## Determinism

Analysis determinism is covered by unit tests over synthetic samples and stable source IDs. Export determinism was checked with two identical demo exports:

- Result: pass.
- Size: 84,334 bytes each.
- SHA-256: `d07b07461e26d0cf983533cb3ba48077dbfe812215a648a0333fafdf336a6272`.

## Performance

The real-data Playwright suite passed in 13.2s for all 10 fixtures. The full smoke suite, including demo MP4 export and provenance, passed in 19.4s. The slowest fixture path is the repeated long MP3 decode at about 3.4s end to end.

## Surprises

The browser can decode a 128 KB truncated MP3 into a plausible 5 second track, which makes partial-file detection more important than a simple decode success/failure split. Running large audio fixtures in parallel also made the browser runner less stable, so e2e tests now run serially to match a real user session.

## Still Open

1. Move FFT analysis fully off the main thread after decode.
2. Add deeper codec-specific validation for M4A/OGG truncation, not just MP3.
3. Provide a visual confidence overlay on the spectrogram itself.
4. Add OPFS/IndexedDB project recovery for page reloads with user-provided files.
5. Add a richer export manifest embedded as standards-friendly timed metadata or sidecar workflow.

## Honest Take

It no longer feels like a toy on the audited inputs. The app now notices when audio is silent, suspicious, too long for casual export, or not audio at all, and it gives the user a useful first guess without configuration. It still has toy-like limits around deep codec validation and long-running worker isolation, but the core loop is substantially more honest and resilient.
