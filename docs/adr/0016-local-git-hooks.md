# 0016 - Local Git Hooks

## Status

Accepted

## Context

The project explicitly avoids GitHub Actions and relies on local checks.

## Decision

Use plain `.githooks/` wired with `git config core.hooksPath .githooks`. Pre-commit runs lint, format check, typecheck, and gitleaks. Commit-msg validates Conventional Commits. Pre-push runs tests, build, and smoke.

## Consequences

Checks are transparent and runnable through Makefile targets. Contributors must install hooks locally.

## Alternatives Considered

Lefthook was considered but not installed in the environment; plain hooks are sufficient.
