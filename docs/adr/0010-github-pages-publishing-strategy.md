# 0010 - GitHub Pages Publishing Strategy

## Status

Accepted

## Context

The live site must work from day one and the built frontend must be committed for GitHub Pages. The repository also needs documentation under `docs/`.

## Decision

Publish from `main` branch `/docs`. Vite builds the SPA directly into `docs/` with base path `/shaderwave-studio/`. `scripts/prepare-pages.mjs` removes generated Pages assets while preserving ADRs and documentation. `scripts/postbuild-pages.mjs` copies `index.html` to `404.html` for SPA fallback and writes `docs/build.json`.

## Consequences

Documentation and the published site share the same directory. The build script must preserve Markdown docs and clean only generated web assets.

## Alternatives Considered

Using a `gh-pages` branch would separate docs from output but add another publishing branch. Publishing from repository root would clutter source with generated assets.
