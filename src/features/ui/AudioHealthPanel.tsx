import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  X,
  XCircle,
} from "lucide-react";

import type { AudioProject, AudioWarning } from "../audio/types";
import type { VisualSettings } from "../project/settings";

export type WorkState =
  | "analyzing"
  | "cancelled"
  | "empty"
  | "export-ready"
  | "exporting"
  | "ready-ok"
  | "ready-warning"
  | "rejected-recoverable";

export interface ProgressState {
  progress: number;
  label: string;
}

interface AudioHealthPanelProps {
  issue: AudioWarning | null;
  isAnalyzing: boolean;
  onApplySuggestion: () => void;
  onCancelAnalysis: () => void;
  progress: ProgressState | null;
  project: AudioProject | null;
  settings: VisualSettings;
  state: WorkState;
}

export function AudioHealthPanel({
  issue,
  isAnalyzing,
  onApplySuggestion,
  onCancelAnalysis,
  progress,
  project,
  settings,
  state,
}: AudioHealthPanelProps) {
  const warnings = project?.insight.warnings ?? (issue ? [issue] : []);
  const confidence = project ? Math.round(project.insight.confidence * 100) : 0;
  const suggestion = project?.insight.suggestedExport;
  const currentFrameCount = settings.exportDuration * settings.exportFps;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-slate-700">
          <Activity aria-hidden="true" size={17} />
          Audio health
        </div>
        <StatePill state={state} />
      </div>

      {isAnalyzing ? (
        <div className="grid gap-3">
          <div>
            <div className="mb-2 flex justify-between text-sm text-slate-600">
              <span>{progress?.label ?? "Analyzing audio"}</span>
              <span>{Math.round((progress?.progress ?? 0) * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-slate-200">
              <div
                className="h-full bg-cyan-600"
                style={{
                  width: `${Math.round((progress?.progress ?? 0) * 100)}%`,
                }}
              />
            </div>
          </div>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-800 shadow-sm hover:border-rose-400"
            onClick={onCancelAnalysis}
          >
            <X aria-hidden="true" size={17} />
            Cancel analysis
          </button>
        </div>
      ) : null}

      {!isAnalyzing && !project && !issue ? (
        <p className="text-sm text-slate-500">
          Load audio to see source health.
        </p>
      ) : null}

      {project ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-950 px-2 py-1 text-sm font-medium text-white">
              {project.insight.profileLabel}
            </span>
            <span className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700">
              {confidence}% confidence
            </span>
            {project.fromCache ? (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-sm text-emerald-800">
                Cached analysis
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-600">{project.insight.summary}</p>

          <div className="grid gap-2 sm:grid-cols-3">
            {project.insight.facts.map((fact) => (
              <div
                key={fact.label}
                className="rounded-md border border-slate-200 px-3 py-2"
                title={fact.explanation}
              >
                <div className="text-xs uppercase tracking-normal text-slate-500">
                  {fact.label}
                </div>
                <div className="mt-1 truncate text-sm font-semibold text-slate-800">
                  {fact.value}
                </div>
              </div>
            ))}
          </div>

          {suggestion ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm text-cyan-950">
              <span>
                Suggested export: {suggestion.seconds}s, {suggestion.fps} FPS,{" "}
                {suggestion.frameCount} frames
              </span>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-cyan-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:border-cyan-600"
                onClick={onApplySuggestion}
              >
                <CheckCircle2 aria-hidden="true" size={16} />
                Apply
              </button>
            </div>
          ) : null}

          {currentFrameCount > 900 ? (
            <WarningItem
              warning={{
                code: "large_render",
                title: "Large render job",
                message: "The current export settings will render many frames.",
                why: `${currentFrameCount} frames are queued at the current duration and FPS.`,
                nextStep: "Use the suggested range while iterating.",
                severity: "warning",
                confidence: 0.95,
              }}
            />
          ) : null}
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {warnings.map((warning) => (
            <WarningItem key={warning.code} warning={warning} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function WarningItem({ warning }: { warning: AudioWarning }) {
  const Icon =
    warning.severity === "error"
      ? XCircle
      : warning.severity === "warning"
        ? AlertTriangle
        : Info;
  const tone =
    warning.severity === "error"
      ? "border-rose-200 bg-rose-50 text-rose-950"
      : warning.severity === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-slate-200 bg-slate-50 text-slate-800";

  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${tone}`}>
      <div className="flex items-start gap-2">
        <Icon aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
        <div className="min-w-0">
          <div className="font-semibold">{warning.title}</div>
          <p className="mt-1">{warning.message}</p>
          <p className="mt-1 text-xs opacity-80">{warning.why}</p>
          <p className="mt-1 text-xs font-medium">{warning.nextStep}</p>
        </div>
        <span className="ml-auto shrink-0 text-xs tabular-nums opacity-80">
          {Math.round(warning.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}

function StatePill({ state }: { state: WorkState }) {
  const label = state.replace(/-/g, " ");
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium uppercase tracking-normal text-slate-600">
      <Clock aria-hidden="true" size={14} />
      {label}
    </span>
  );
}
