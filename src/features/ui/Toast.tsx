import { X } from "lucide-react";

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[min(92vw,560px)] -translate-x-1/2 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg">
      <p>{message}</p>
      <button
        type="button"
        className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X aria-hidden="true" size={18} />
      </button>
    </div>
  );
}
