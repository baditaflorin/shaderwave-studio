# 0006 - WASM Modules Used

## Status

Accepted

## Context

MP4 export in a static browser app requires a client-side encoder.

## Decision

Use FFmpeg-WASM via `@ffmpeg/ffmpeg` and ship the single-thread `@ffmpeg/core` files as static assets under `ffmpeg-core/`. Load them lazily only when the user exports.

## Consequences

The initial UI bundle stays small while export remains fully client-side. Single-thread FFmpeg avoids requiring COOP/COEP headers that GitHub Pages cannot configure.

## Alternatives Considered

Server-side FFmpeg was rejected because it would require Mode C. MediaRecorder was rejected because browser codec/container output is inconsistent for MP4.
