# 0003 - Frontend Framework And Build Tooling

## Status

Accepted

## Context

The app needs strict TypeScript, a fast local loop, lazy WASM loading, PWA output, and a Pages-compatible build.

## Decision

Use React, TypeScript strict settings, Vite, Tailwind CSS, zod, TanStack Query, lucide-react, Vitest, and Playwright.

## Consequences

The stack is familiar, static-hosting friendly, and easy to test locally. Vite controls the Pages base path and hashed assets.

## Alternatives Considered

Next.js was unnecessary because v1 does not need SSR or a runtime server. Plain TypeScript was possible but slower for building a dense tool UI.
