# 0049 - Inspectability And Debug Surface

## Status

Accepted

## Context

Power users and support need to see why the app inferred a warning.

## Decision

Add an opt-in `?debug=1` surface with project ID, source, insight, warnings, state, history, and current settings.

## Consequences

Debug data must avoid secrets and stay local to the browser.

## Alternatives Considered

Console-only debugging was rejected because production console output should stay minimal.
