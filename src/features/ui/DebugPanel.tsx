import { Bug } from "lucide-react";

export function DebugPanel({ payload }: { payload: string }) {
  return (
    <section className="fixed bottom-4 right-4 z-40 max-h-[50vh] w-[min(92vw,520px)] overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-cyan-50 shadow-lg">
      <div className="mb-2 flex items-center gap-2 font-semibold uppercase tracking-normal">
        <Bug aria-hidden="true" size={15} />
        Debug
      </div>
      <pre className="whitespace-pre-wrap break-words">{payload}</pre>
    </section>
  );
}
