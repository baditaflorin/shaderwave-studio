# Phase 3 Input Audit

Date: 2026-05-10

Legend:

- `green` = works fully on current build
- `yellow` = works partially or with meaningful caveats
- `red` = not built or misleading

| Pathway                | Status   | Notes                                                                   |
| ---------------------- | -------- | ----------------------------------------------------------------------- |
| File picker            | `green`  | Loads supported audio files and demo fixtures.                          |
| Drag and drop          | `green`  | Same behavior as file picker.                                           |
| Mobile file picker     | `yellow` | Browser file input should work, but not explicitly tested or optimized. |
| Demo sample            | `green`  | Loads and exports correctly.                                            |
| Multi-file input       | `red`    | Only first file in a `FileList` is used.                                |
| Folder input           | `red`    | Not built.                                                              |
| Paste audio/state text | `red`    | No paste surface.                                                       |
| Clipboard read         | `red`    | Not built.                                                              |
| URL input              | `red`    | Not built.                                                              |
| Imported project state | `red`    | Not built.                                                              |
| Deep-link restore      | `red`    | `?debug=1` exists, but no state link import.                            |
| Last-session restore   | `red`    | Settings persist, project state does not.                               |
| Start fresh            | `red`    | No clear-state control.                                                 |

## Phase 3 Goal

Turn file picker, drag and drop, state import, last-session restore, and start-fresh into `green`. Leave multi-file, folder, clipboard read, and URL audio ingest explicitly out of scope unless a lightweight static-safe path emerges.
