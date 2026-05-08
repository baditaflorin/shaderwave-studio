# 0015 - Deployment Topology

## Status

Accepted

## Context

Mode A deploys only static files.

## Decision

Serve the built app from GitHub Pages at `https://baditaflorin.github.io/shaderwave-studio/`. No Docker, nginx, Prometheus, backend host, or server deploy directory is needed.

## Consequences

Rollback is a git revert of the publishing commit. GitHub Pages limitations shape service worker scope and SPA fallback behavior.

## Alternatives Considered

Docker backend deployment was rejected because no runtime API exists.
