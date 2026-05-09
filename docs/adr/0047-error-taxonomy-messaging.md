# 0047 - Error Taxonomy And Messaging

## Status

Accepted

## Context

The audit exposed raw decoder errors and late failure for spoofed files.

## Decision

Use recoverable input errors with code, message, why, next step, and severity. Fatal runtime errors remain exceptional. User errors never replace the current valid project.

## Consequences

Tests assert error codes and visible user-facing copy.

## Alternatives Considered

Throwing plain `Error` from every path was rejected because it collapses recovery and fatal paths.
