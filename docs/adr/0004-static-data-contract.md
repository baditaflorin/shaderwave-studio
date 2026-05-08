# 0004 - Static Data Contract

## Status

Accepted

## Context

Mode A has no backend or shared generated dataset.

## Decision

There is no external static data contract in v1. App metadata is embedded at build time and also emitted as `docs/build.json` with version, commit, and timestamp.

## Consequences

The frontend does not depend on network data after the static bundle loads. Future preset packs can add a versioned `/data/v1/` contract if needed.

## Alternatives Considered

Mode B data artifacts were rejected because user audio and shader state are local to each browser.
