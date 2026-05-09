import {
  ClipboardCopy,
  Download,
  FileInput,
  History,
  Link2,
  RefreshCcw,
  RotateCcw,
  Upload,
} from "lucide-react";

import type { SessionEvent } from "../project/sessionState";

interface SessionPanelProps {
  canCopyProvenance: boolean;
  canShare: boolean;
  hasProject: boolean;
  onCopyProject: () => void;
  onCopyProvenance: () => void;
  onCopyShareLink: () => void;
  onExportProject: () => void;
  onImportFile: () => void;
  onLoadPastedState: () => void;
  onReset: () => void;
  pasteValue: string;
  sessionLog: SessionEvent[];
  setPasteValue: (value: string) => void;
}

export function SessionPanel({
  canCopyProvenance,
  canShare,
  hasProject,
  onCopyProject,
  onCopyProvenance,
  onCopyShareLink,
  onExportProject,
  onImportFile,
  onLoadPastedState,
  onReset,
  pasteValue,
  sessionLog,
  setPasteValue,
}: SessionPanelProps) {
  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-slate-700">
          <History aria-hidden="true" size={17} />
          Session
        </div>
        <div className="grid gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onExportProject}
            disabled={!hasProject}
          >
            <Download aria-hidden="true" size={17} />
            Save project
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500"
            onClick={onImportFile}
          >
            <FileInput aria-hidden="true" size={17} />
            Import state
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onCopyProject}
            disabled={!hasProject}
          >
            <ClipboardCopy aria-hidden="true" size={17} />
            Copy state
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onCopyProvenance}
            disabled={!canCopyProvenance}
          >
            <Upload aria-hidden="true" size={17} />
            Copy provenance
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onCopyShareLink}
            disabled={!canShare}
          >
            <Link2 aria-hidden="true" size={17} />
            Copy scene link
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-800 shadow-sm hover:border-rose-400"
            onClick={onReset}
          >
            <RotateCcw aria-hidden="true" size={17} />
            Start fresh
          </button>
        </div>
        <label className="mt-4 grid gap-2 text-sm font-medium text-slate-700">
          Paste state JSON or link
          <textarea
            className="min-h-24 rounded-md border border-slate-300 px-3 py-2 font-mono text-xs"
            value={pasteValue}
            onChange={(event) => setPasteValue(event.target.value)}
            placeholder="Paste a saved session JSON file or copied scene link."
          />
        </label>
        <button
          type="button"
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onLoadPastedState}
          disabled={pasteValue.trim().length === 0}
        >
          <RefreshCcw aria-hidden="true" size={17} />
          Load pasted state
        </button>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-slate-700">
          <History aria-hidden="true" size={17} />
          Session log
        </div>
        {sessionLog.length === 0 ? (
          <p className="text-sm text-slate-500">No audio activity yet.</p>
        ) : (
          <ol className="grid gap-2">
            {sessionLog.map((event) => (
              <li
                key={event.id}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <div className="font-medium text-slate-800">{event.label}</div>
                <div className="mt-1 text-slate-500">{event.detail}</div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
