# Phase 2 Substance Real-Data Audit

Status: draft, awaiting confirmation before ADRs, fixture commits, or code.

Audit date: 2026-05-08

App version audited: 0.1.0

Public app: https://baditaflorin.github.io/shaderwave-studio/

Repository: https://github.com/baditaflorin/shaderwave-studio

## Method

I ran the current browser flow against 10 realistic audio inputs: upload, decode/analyze, spectrogram/FFT preview, shader preview, and, for files that loaded, a reduced MP4 export smoke of 2 seconds at 12 FPS / 480x270. This export size was intentionally small so the audit could cover multiple real files without turning the audit into a rendering benchmark.

Fixture sources used:

- https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3
- https://samplelib.com/lib/preview/wav/sample-15s.wav
- https://sample-files.com/audio/ogg/
- https://sample-files.com/audio/m4a/
- https://samplefile.com/samples/audio/m4a/

## 10 Inputs

| #   | Input                                                                   | Category                             | What v1 did                                                                                      | What it should have done                                                                                                       | Failure mode                                |
| --- | ----------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| 1   | `soundhelix-song-1.mp3`, 6:12, 8.5 MB                                   | Clean long MP3 music                 | Loaded in 2.2s, showed spectrogram/FFT, exported 2s MP4.                                         | Keep this working, but infer better defaults for long tracks: export range, estimated render cost, and audio profile.          | Pass, but weak guidance.                    |
| 2   | `sample-15s.wav`, 0:19, 3.2 MB                                          | Uncompressed WAV                     | Loaded in 326ms, previewed, exported 2s MP4.                                                     | Keep working; surface detected sample rate/channels and file weight implications.                                              | Pass, metadata hidden.                      |
| 3   | `samplefiles-music-128.ogg`, 0:30, 397 KB                               | OGG Vorbis music                     | Loaded in 378ms, previewed, exported 2s MP4.                                                     | Keep working; explain browser codec support risk where relevant.                                                               | Pass, compatibility is implicit.            |
| 4   | `samplefile-m4a-15s.m4a`, 0:15, 140 KB                                  | M4A/AAC                              | Loaded in 352ms, previewed, exported 2s MP4.                                                     | Keep working; show codec/container confidence instead of treating every decode as identical.                                   | Pass, no confidence.                        |
| 5   | `samplefiles-long-5min.m4a`, 5:00, 7.0 MB                               | Long M4A music                       | Loaded in 1.06s, previewed, exported 2s MP4.                                                     | Warn about long-song export duration, memory/render cost, and default to a useful preview range.                               | Pass, but default export can be misleading. |
| 6   | `Beyonce - Sao Paulo...` equivalent with Unicode filename               | Weird filename / real library naming | Loaded in 2.07s, previewed, exported 2s MP4.                                                     | Preserve Unicode names safely and derive a human-friendly project name; export filename should reflect source safely.          | Pass, but naming/provenance is thin.        |
| 7   | `track-001.ogg`, 0:05, 4 KB, silent audio renamed from a silence sample | Silent/near-empty content            | Loaded as if useful audio, produced a tiny MP4, gave no silence/low-energy warning.              | Detect silence/near-silence, show low confidence, and suggest choosing another file or exporting intentionally silent visuals. | Wrong-but-confident.                        |
| 8   | `truncated-soundhelix-128kb.mp3`, first 128 KB of a real MP3            | Partial/truncated upload             | Decoded as a 5s track, previewed, exported, no warning that the source looked incomplete.        | Detect suspicious truncation/metadata mismatch where possible, label as partial/low-confidence, and keep export provenance.    | Wrong-but-confident.                        |
| 9   | `empty.mp3`, 0 bytes                                                    | Empty/broken                         | Rejected with raw browser message: `Unable to decode audio data`.                                | Say the file is empty or not audio, preserve current project, and offer a next step.                                           | Obvious but not actionable.                 |
| 10  | `html-renamed.mp3`, HTML content with `.mp3` extension                  | Adversarial/spoofed                  | Accepted by extension gate, then failed with raw browser message: `Unable to decode audio data`. | Sniff file signatures/MIME before decode and explain that the file is not an audio stream.                                     | Obvious late failure, poor domain language. |

Extra spot-check: a normal short MP3 sound effect loaded and exported correctly. Determinism spot-check on one MP3 export was byte-identical across two runs with identical settings.

## Top 5 Logic Gaps

1. Decode success is treated as full trust. Silent and truncated inputs become confident projects with no quality warnings.
2. The app does no audio-domain classification: music vs silence vs short effect vs partial file vs unsupported/spoofed stream.
3. Errors leak browser/decoder language instead of explaining what failed, why it likely failed, and what to try next.
4. Export defaults are not inferred from the source; a 5-6 minute track and a 5 second clip get the same default treatment.
5. Long work lacks real performance honesty: analysis has only a generic status, no progress/cancel, no size budget, and no main-thread responsiveness guarantee.

## Top 3 Intuition Failures

1. A silent audio file looks "successfully visualized" instead of being called out as probably useless input.
2. A truncated transfer becomes a normal 5 second song, so the preview/export can be wrong without the user knowing.
3. Broken/spoofed files fail with `Unable to decode audio data`, which is technically true but not enough to recover.

## Top 3 Feels-Stupid Moments

1. The user has to know whether the file is silence, clipped, partial, or useful; the app should infer that.
2. The user has to choose export seconds/FPS/resolution before the app explains render cost or recommends source-aware defaults.
3. The user has no confidence/provenance trail for "what did the analyzer think this audio was?"

## What Smart Means For Shaderwave Studio

- Dropping a file immediately produces a useful preview plus an audio health read: duration, channels, loudness, silence/clipping, and confidence.
- Bad or suspicious input is called out in music-video language before export: empty, not audio, silent, probably truncated, unsupported codec.
- Export defaults adapt to the source and tell the user what will be rendered: range, FPS, resolution, estimated frames, and expected cost.
- Every inference has confidence and a short explanation; low confidence blocks silent wrongness.
- Every exported artifact carries enough provenance to reproduce it: app version, commit, source fingerprint, settings, duration, and confidence warnings.

## Phase 2 Substance Success Metrics

- At least 7 of the 10 audit inputs complete the primary flow with no manual intervention and no silent wrongness.
- 100% of rejected files explain what failed, why, and the next action in domain terms.
- Silent and truncated fixtures must surface visible low-confidence warnings before export.
- Identical input/settings produce byte-identical analysis JSON and MP4 output in deterministic tests.
- Analysis starts showing useful state in under 300ms; operations over 5s are cancellable.
- Export metadata includes version, commit, source fingerprint, settings, and warning/confidence payload.

## Explicitly Out Of Scope

- New shader presets, new visual styles, timeline editing, beat editing, multiplayer/collaboration, accounts, cloud storage, server-side rendering, paid features, analytics, marketing polish, dark mode, landing-page redesign, command palette, and architecture escalation beyond Mode A.
