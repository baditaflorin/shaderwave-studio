# Phase 2 State Taxonomy

## Reachable States

| State                  | Meaning                                                                                                     | Required exit                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `empty`                | No user project loaded. Demo and file upload are available.                                                 | Choose a file or demo.                               |
| `analyzing`            | A file is being read, sniffed, decoded, and analyzed.                                                       | Cancel, finish as ready, or fail recoverably.        |
| `ready-ok`             | A project is loaded with no blocking warnings.                                                              | Play, scrub, export, replace file.                   |
| `ready-warning`        | A project is loaded with non-fatal warnings such as silence, clipping, partial stream, or long render cost. | Export intentionally, change settings, replace file. |
| `rejected-recoverable` | Latest selected file was rejected before replacing the current project.                                     | Choose another file, demo, or dismiss.               |
| `exporting`            | MP4 frames/audio are being rendered/encoded.                                                                | Cancel or finish.                                    |
| `export-ready`         | A download URL exists for the latest MP4.                                                                   | Download, export again, or replace project.          |
| `cancelled`            | The user aborted analysis or export. Existing project remains intact.                                       | Choose file, demo, or export again.                  |
| `fatal-runtime`        | Browser lacks a required capability or rendering hit an unrecoverable runtime error.                        | Reload or try another browser.                       |

No state may discard the current valid project because a later file failed.

## Concurrency Rules

- Selecting a new file aborts the previous analysis.
- Starting a new analysis aborts any active export.
- Export button is disabled while exporting.
- Cancel restores the last coherent ready state.
- Repeated cancel is a no-op.
