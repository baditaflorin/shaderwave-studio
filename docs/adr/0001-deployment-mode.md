# 0001 - Deployment Mode

## Status

Accepted

## Context

Shaderwave Studio needs audio ingest, FFT/spectrogram analysis, shader rendering, local project settings, and MP4 export. The project has no v1 need for auth, shared data, secrets, server-side transcoding, or runtime mutations.

## Decision

Use Mode A: Pure GitHub Pages. The app ships as static files from `docs/`, runs all compute in the browser, stores settings locally, and lazy-loads WASM only after user action.

## Consequences

The public surface is static and cheap to host. Browser support matters: WebGPU and FFmpeg-WASM vary by browser, so the UI must expose capability status and provide graceful fallbacks.

## Alternatives Considered

Mode B was unnecessary because there are no shared static data artifacts. Mode C was rejected because a runtime backend would add operational cost without solving a v1 requirement.
