# Postmortem

## What Was Built

Shaderwave Studio v0.1.0 is a static GitHub Pages app for MP3/WAV/M4A-style audio ingest, FFT band extraction, spectrogram rendering, audio-reactive shader preview, and lazy FFmpeg-WASM MP4 export. The published UI links back to:

https://github.com/baditaflorin/shaderwave-studio

and includes support link:

https://www.paypal.com/paypalme/florinbadita

## Mode Check

Mode A was correct. The project did not need auth, secrets, cross-device state, shared data, or a runtime API. Web Audio, `fft.js`, WebGPU with Canvas 2D fallback, localStorage, and FFmpeg-WASM covered the v1 requirements.

## What Worked

GitHub Pages could serve the whole app, including the FFmpeg core assets. The lazy export path kept initial load small. Playwright smoke testing caught real Pages/base-path and preview-port issues before final delivery.

## What Did Not

Build metadata needed care. Stamping the current commit directly into committed Pages output caused generated assets to move after each commit. The final strategy stamps the latest non-`docs/` source commit and excludes `build.json` from precache.

## Surprises

Workbox sourcemaps include temporary local paths, so they were not reproducible. Production sourcemaps were removed from the Pages output.

## Accepted Tech Debt

The MP4 exporter uses the Canvas 2D shader-equivalent path instead of frame-capturing WebGPU output. It preserves the audio-reactive look and keeps export reliable in static hosting, but a future renderer abstraction could share more exact shader code.

## Next Improvements

1. Add shader code editing with safe WGSL validation and preset save/load.
2. Add an explicit IndexedDB project library for saved local sessions.
3. Add export presets for 9:16, 1:1, and 4K with estimated render cost.

## Time

Estimated v1 scaffold plus core implementation: about 4 hours. Actual work was in that range, with extra time spent making Pages builds reproducible and hook-friendly.
