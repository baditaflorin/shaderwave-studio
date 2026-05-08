# 0009 - Configuration And Secrets Management

## Status

Accepted

## Context

The frontend must never contain secrets. Mode A does not need runtime configuration.

## Decision

Use build-time public constants for repo URL, PayPal URL, app version, commit, and Pages base path. Commit `.env.example` with placeholders only. Use `gitleaks` in pre-commit.

## Consequences

There are no runtime secrets to rotate. All public constants are safe to inspect in the browser bundle.

## Alternatives Considered

Runtime `.env` files were rejected because GitHub Pages cannot read them and the app does not need them.
