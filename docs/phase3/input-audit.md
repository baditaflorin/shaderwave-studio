# Phase 3 Input Audit

Date: 2026-05-10

Legend:

- `green` = works fully on current build
- `yellow` = works partially or with meaningful caveats
- `red` = not built or misleading

| Pathway                | Status   | Notes                                                                              |
| ---------------------- | -------- | ---------------------------------------------------------------------------------- |
| File picker            | `green`  | Loads supported audio files and demo fixtures.                                     |
| Drag and drop          | `green`  | Same behavior as file picker.                                                      |
| Mobile file picker     | `yellow` | Browser file input should work, but still needs real-device validation.            |
| Demo sample            | `green`  | Loads and exports correctly.                                                       |
| Multi-file input       | `red`    | Only first file in a `FileList` is used.                                           |
| Folder input           | `red`    | Not built.                                                                         |
| Paste audio/state text | `green`  | Saved state JSON or a copied scene link can be pasted directly into the app.       |
| Clipboard read         | `red`    | Read-from-clipboard permission flow is still not built.                            |
| URL input              | `red`    | Audio URL ingest remains out of scope on static Pages because of CORS constraints. |
| Imported project state | `green`  | Saved state JSON can be imported from disk.                                        |
| Deep-link restore      | `yellow` | Scene-link restore works for compact sessions; large projects should use JSON.     |
| Last-session restore   | `green`  | Full project autosave now restores from IndexedDB.                                 |
| Start fresh            | `green`  | Explicit reset clears the current project, export state, autosave, and link hash.  |

## Phase 3 Goal

Turn file picker, drag and drop, state import, last-session restore, and start-fresh into `green`. Keep multi-file, folder, clipboard read, and audio URL ingest explicitly out of scope for Mode A.
