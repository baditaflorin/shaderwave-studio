# 0017 - Dependency Policy

## Status

Accepted

## Context

The app touches specialist browser APIs and media tooling.

## Decision

Use production-ready libraries for framework, FFT, WebGPU-independent tests, FFmpeg-WASM, schema validation, icons, PWA output, linting, and e2e testing. Avoid custom codec, FFT, or shader packaging implementations.

## Consequences

Dependency updates matter, and `npm audit` is part of the security baseline. Critical media math and encoding stay on maintained packages.

## Alternatives Considered

Handwritten FFT/export code was rejected because mature packages exist.
