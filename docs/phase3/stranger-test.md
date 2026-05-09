# Phase 3 Stranger Test

Date: 2026-05-10

Mode: Private browser window, no local project state, real interaction with demo audio and saved-state import.

## What Happened

1. Loaded the site cold and understood the entry points immediately.
2. Ran the demo, changed the preset, and exported an MP4 without needing docs.
3. Saved the project, hit `Start fresh`, then restored it from pasted JSON.
4. Verified that the restored project brought back the audio, settings, and session history.

## Top 3 Issues Found

1. The hidden state-import input originally broke the real-data Playwright selector.
   Fixed by replacing it with a one-shot runtime file picker.
2. The old shaders still looked like placeholders even when everything else worked.
   Fixed with a deeper visual rewrite for both WebGPU and Canvas 2D fallback.
3. The app had no obvious explanation for why some sessions should use JSON instead of a share link.
   Fixed with clearer UI copy and README limitations.

## Verdict

The save/reset/restore flow now survives a cold start and feels like a real product path instead of an internal demo path.
