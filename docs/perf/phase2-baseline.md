# Phase 2 Performance Baseline

Measured on 2026-05-08 in Chromium via the local Pages preview.

| Input                            | Decode/analyze result                  | Elapsed |
| -------------------------------- | -------------------------------------- | ------: |
| `soundhelix-song-1.mp3`          | Loaded 6:12 MP3                        |  2200ms |
| `sample-15s.wav`                 | Loaded 0:19 WAV                        |   326ms |
| `samplefiles-music-128.ogg`      | Loaded 0:30 OGG                        |   378ms |
| `samplefile-m4a-15s.m4a`         | Loaded 0:15 M4A                        |   352ms |
| `samplefiles-long-5min.m4a`      | Loaded 5:00 M4A                        |  1059ms |
| `track-001.ogg`                  | Loaded silent 0:05 OGG without warning |   441ms |
| `truncated-soundhelix-128kb.mp3` | Loaded partial MP3 as normal           |   247ms |
| `empty.mp3`                      | Rejected with raw decoder error        |   172ms |
| `html-renamed.mp3`               | Rejected with raw decoder error        |   157ms |

Export smoke used 2 seconds at 12 FPS / 480x270. Valid files exported in 1.7s to 4.2s.

## Phase 2 After Numbers

Measured after the substance implementation with the Playwright real-data fixture suite on the local Pages preview.

| Input                       | Phase 2 result                            | E2E elapsed |
| --------------------------- | ----------------------------------------- | ----------: |
| `Beyonce/Sao Paulo unicode` | Loaded with long-track warning            |        3.4s |
| `clean-long-mp3.mp3`        | Loaded with long-track warning            |        3.3s |
| `empty.mp3`                 | Rejected with actionable empty-file error |        0.7s |
| `long-m4a.m4a`              | Loaded with long-track warning            |        2.2s |
| `m4a-short.m4a`             | Loaded with no warnings                   |        0.5s |
| `ogg-music.ogg`             | Loaded with no warnings                   |        0.7s |
| `spoofed-html.mp3`          | Rejected before decode as non-audio       |        0.7s |
| `track-001.ogg`             | Loaded with low-energy warning            |        0.4s |
| `truncated-mp3.mp3`         | Loaded with partial-stream warning        |        0.5s |
| `uncompressed-wav.wav`      | Loaded with no warnings                   |        0.6s |

Full real-data fixture suite: 10/10 passed in 13.2s. Full smoke suite, including demo export: 12/12 passed in 19.4s.

Determinism check: two identical demo exports at 2 seconds, 12 FPS, 480x270 produced identical SHA-256 hashes: `d07b07461e26d0cf983533cb3ba48077dbfe812215a648a0333fafdf336a6272`.

## Budgets

- First visible analysis state: under 300ms.
- Normal file analysis under 10 MB: under 3s on target hardware.
- Export progress update cadence: at least once per rendered frame.
- Cancellable threshold: any operation expected to exceed 5s.
- Warn threshold: source over 15 minutes, file over 100 MB, or estimated export over 900 frames.
