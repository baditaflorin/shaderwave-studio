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

## Budgets

- First visible analysis state: under 300ms.
- Normal file analysis under 10 MB: under 3s on target hardware.
- Export progress update cadence: at least once per rendered frame.
- Cancellable threshold: any operation expected to exceed 5s.
- Warn threshold: source over 15 minutes, file over 100 MB, or estimated export over 900 frames.
