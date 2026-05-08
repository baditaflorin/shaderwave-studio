# 0014 - Error Handling Conventions

## Status

Accepted

## Context

Most errors come from browser capabilities, audio decode, WebGPU setup, and FFmpeg export.

## Decision

Return typed results or throw `Error` with user-safe messages at feature boundaries. The UI catches errors and displays a toast. React rendering failures go through an error boundary.

## Consequences

Failures are explicit and visible. Low-level errors are not silently swallowed.

## Alternatives Considered

Global panic-style handling was rejected because browser media APIs fail in user-specific ways.
