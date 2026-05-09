import {
  Activity,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  Download,
  Gauge,
  Heart,
  Info,
  Music2,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
  Star,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  APP_COMMIT,
  APP_NAME,
  APP_VERSION,
  FFT_BAND_COUNT,
  PAYPAL_URL,
  REPO_URL,
} from "./config/app";
import { sampleBandsAtTime, smoothBands } from "./features/audio/analyze";
import { createDemoProject } from "./features/audio/demo";
import {
  issueToWarning,
  toUserFacingAudioIssue,
  type UserFacingAudioIssue,
} from "./features/audio/errors";
import { analyzeAudioFile } from "./features/audio/intelligence";
import type { AudioProject, AudioWarning } from "./features/audio/types";
import { exportMp4 } from "./features/export/exportMp4";
import {
  buildExportProvenance,
  stableStringify,
  type ExportProvenance,
} from "./features/export/provenance";
import {
  defaultVisualSettings,
  loadVisualSettings,
  saveVisualSettings,
  type ShaderPreset,
  type VisualSettings,
} from "./features/project/settings";
import { Toast } from "./features/ui/Toast";
import { SpectrogramCanvas } from "./features/visualizer/SpectrogramCanvas";
import { VisualizerCanvas } from "./features/visualizer/VisualizerCanvas";
import { presetLabels } from "./features/visualizer/presets";

const zeroBands = new Array<number>(FFT_BAND_COUNT).fill(0);

type WorkState =
  | "analyzing"
  | "cancelled"
  | "empty"
  | "export-ready"
  | "exporting"
  | "ready-ok"
  | "ready-warning"
  | "rejected-recoverable";

interface ProgressState {
  progress: number;
  label: string;
}

interface SessionEvent {
  id: string;
  label: string;
  detail: string;
  at: string;
}

const exportSettingKeys = new Set<keyof VisualSettings>([
  "exportDuration",
  "exportFps",
  "exportWidth",
  "exportHeight",
]);

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const projectUrlRef = useRef<string | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const playheadRef = useRef(0);
  const analysisAbortRef = useRef<AbortController | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const eventSequenceRef = useRef(0);
  const userEditedExportRef = useRef(false);

  const [settings, setSettings] = useState<VisualSettings>(() =>
    typeof window === "undefined"
      ? defaultVisualSettings
      : loadVisualSettings(),
  );
  const [project, setProject] = useState<AudioProject | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [bands, setBands] = useState(zeroBands);
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [analysisProgress, setAnalysisProgress] =
    useState<ProgressState | null>(null);
  const [exportProgress, setExportProgress] = useState<ProgressState | null>(
    null,
  );
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [lastIssue, setLastIssue] = useState<UserFacingAudioIssue | null>(null);
  const [lastProvenance, setLastProvenance] = useState<ExportProvenance | null>(
    null,
  );
  const [sessionLog, setSessionLog] = useState<SessionEvent[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const capabilities = useMemo(
    () => [
      { label: "WebGPU", ok: "gpu" in navigator },
      { label: "Web Audio", ok: "AudioContext" in window },
      {
        label: "FFmpeg-WASM",
        ok: "Worker" in window && "WebAssembly" in window,
      },
    ],
    [],
  );

  const debugEnabled = useMemo(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("debug"),
    [],
  );

  const workState: WorkState = useMemo(() => {
    if (isAnalyzing) {
      return "analyzing";
    }
    if (isExporting) {
      return "exporting";
    }
    if (downloadUrl) {
      return "export-ready";
    }
    if (lastIssue) {
      return "rejected-recoverable";
    }
    if (project?.insight.warnings.length) {
      return "ready-warning";
    }
    if (project) {
      return "ready-ok";
    }
    return "empty";
  }, [downloadUrl, isAnalyzing, isExporting, lastIssue, project]);

  const appendEvent = useCallback((label: string, detail: string) => {
    eventSequenceRef.current += 1;
    const nextEvent: SessionEvent = {
      id: `evt-${eventSequenceRef.current}`,
      label,
      detail,
      at: new Date().toISOString(),
    };
    setSessionLog((current) => [nextEvent, ...current].slice(0, 8));
  }, []);

  useEffect(() => {
    saveVisualSettings(settings);
  }, [settings]);

  useEffect(() => {
    playheadRef.current = playhead;
  }, [playhead]);

  useEffect(() => {
    let frameId = 0;

    const tick = () => {
      const currentTime = project
        ? (audioRef.current?.currentTime ?? playheadRef.current)
        : playheadRef.current;

      if (Math.abs(currentTime - playheadRef.current) > 0.025) {
        playheadRef.current = currentTime;
        setPlayhead(currentTime);
      }

      if (project) {
        const nextBands = sampleBandsAtTime(project.analysis, currentTime);
        setBands((previous) =>
          smoothBands(previous, nextBands, settings.smoothing),
        );
      }

      frameId = window.requestAnimationFrame(tick);
    };

    tick();
    return () => window.cancelAnimationFrame(frameId);
  }, [project, settings.smoothing]);

  useEffect(
    () => () => {
      analysisAbortRef.current?.abort();
      exportAbortRef.current?.abort();
      if (projectUrlRef.current) {
        URL.revokeObjectURL(projectUrlRef.current);
      }
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
    },
    [],
  );

  const replaceProject = useCallback((nextProject: AudioProject) => {
    if (projectUrlRef.current) {
      URL.revokeObjectURL(projectUrlRef.current);
    }
    projectUrlRef.current = nextProject.url;
    setProject(nextProject);
    setLastIssue(null);
    setLastProvenance(null);
    setPlayhead(0);
    setBands(zeroBands);
    setIsPlaying(false);
  }, []);

  const updateSetting = useCallback(
    <Key extends keyof VisualSettings>(
      key: Key,
      value: VisualSettings[Key],
    ) => {
      if (exportSettingKeys.has(key)) {
        userEditedExportRef.current = true;
      }
      setSettings((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const applySuggestedExport = useCallback((nextProject: AudioProject) => {
    const suggestion = nextProject.insight.suggestedExport;
    setSettings((current) => ({
      ...current,
      exportDuration: suggestion.seconds,
      exportFps: suggestion.fps,
      exportWidth: suggestion.width,
      exportHeight: suggestion.height,
    }));
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = files[0];
      if (!file) {
        return;
      }

      analysisAbortRef.current?.abort();
      exportAbortRef.current?.abort();
      const controller = new AbortController();
      analysisAbortRef.current = controller;

      setIsAnalyzing(true);
      setIsExporting(false);
      setAnalysisProgress({ progress: 0, label: "Reading source" });
      setExportProgress(null);
      setToast(null);

      try {
        const result = await analyzeAudioFile(file, {
          signal: controller.signal,
          onProgress: (progress, label) =>
            setAnalysisProgress({ progress, label }),
        });
        const nextProject: AudioProject = {
          id: result.source.id,
          name: file.name,
          mimeType: file.type || "audio",
          size: file.size,
          url: URL.createObjectURL(file),
          file,
          analysis: result.analysis,
          source: result.source,
          insight: result.insight,
          fromCache: result.fromCache,
        };

        replaceProject(nextProject);
        if (!userEditedExportRef.current) {
          applySuggestedExport(nextProject);
        }
        appendEvent(
          "Loaded audio",
          `${result.insight.profileLabel} (${Math.round(result.insight.confidence * 100)}% confidence)`,
        );
      } catch (error) {
        if (
          analysisAbortRef.current !== controller &&
          controller.signal.aborted
        ) {
          return;
        }
        const issue = toUserFacingAudioIssue(error);
        setLastIssue(issue);
        appendEvent(
          issue.code === "analysis_cancelled"
            ? "Cancelled analysis"
            : "Rejected audio",
          issue.message,
        );
        setToast(issue.message);
      } finally {
        if (analysisAbortRef.current === controller) {
          analysisAbortRef.current = null;
          setIsAnalyzing(false);
          setAnalysisProgress(null);
        }
      }
    },
    [appendEvent, applySuggestedExport, replaceProject],
  );

  const cancelAnalysis = useCallback(() => {
    analysisAbortRef.current?.abort();
    setIsAnalyzing(false);
    setAnalysisProgress(null);
    setLastIssue(
      toUserFacingAudioIssue(new DOMException("Cancelled", "AbortError")),
    );
    appendEvent("Cancelled analysis", "Current project was preserved.");
  }, [appendEvent]);

  const cancelExport = useCallback(() => {
    exportAbortRef.current?.abort();
    setIsExporting(false);
    setExportProgress({ progress: 0, label: "Export cancelled" });
    appendEvent("Cancelled export", "No project data was changed.");
  }, [appendEvent]);

  const handleDemo = useCallback(() => {
    analysisAbortRef.current?.abort();
    exportAbortRef.current?.abort();
    setIsAnalyzing(true);
    window.setTimeout(() => {
      try {
        const demo = createDemoProject();
        replaceProject(demo);
        if (!userEditedExportRef.current) {
          applySuggestedExport(demo);
        }
        appendEvent("Loaded demo", "Generated browser demo audio.");
      } catch (error) {
        const issue = toUserFacingAudioIssue(error);
        setLastIssue(issue);
        setToast(issue.message);
      } finally {
        setIsAnalyzing(false);
      }
    }, 0);
  }, [appendEvent, applySuggestedExport, replaceProject]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !project) {
      return;
    }

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [project]);

  const scrub = useCallback(
    (value: number) => {
      const next = Math.min(
        project?.analysis.duration ?? 0,
        Math.max(0, value),
      );
      if (audioRef.current) {
        audioRef.current.currentTime = next;
      }
      playheadRef.current = next;
      setPlayhead(next);
      if (project) {
        setBands(sampleBandsAtTime(project.analysis, next));
      }
    },
    [project],
  );

  const handleExport = useCallback(async () => {
    if (!project) {
      setToast("Load audio before exporting.");
      return;
    }

    exportAbortRef.current?.abort();
    const controller = new AbortController();
    exportAbortRef.current = controller;
    setIsExporting(true);
    setExportProgress({ progress: 0, label: "Preparing export" });

    try {
      const provenance = buildExportProvenance({
        app: {
          name: APP_NAME,
          version: APP_VERSION,
          commit: APP_COMMIT,
        },
        project,
        settings,
      });
      const video = await exportMp4({
        analysis: project.analysis,
        audioFile: project.file,
        provenance,
        signal: controller.signal,
        settings,
        onProgress: (progress, label) => setExportProgress({ progress, label }),
      });
      const url = URL.createObjectURL(video);

      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
      downloadUrlRef.current = url;
      setDownloadUrl(url);
      setLastProvenance(provenance);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.source.safeBaseName}-visualizer.mp4`;
      anchor.click();
      appendEvent(
        "Exported MP4",
        `${settings.exportDuration}s at ${settings.exportFps} FPS`,
      );
    } catch (error) {
      if (exportAbortRef.current !== controller && controller.signal.aborted) {
        return;
      }
      const issue = toUserFacingAudioIssue(error);
      appendEvent(
        issue.code === "analysis_cancelled"
          ? "Cancelled export"
          : "Export failed",
        issue.message,
      );
      setToast(
        issue.code === "analysis_cancelled"
          ? "Export cancelled."
          : `${issue.message} ${issue.nextStep}`,
      );
    } finally {
      if (exportAbortRef.current === controller) {
        exportAbortRef.current = null;
        setIsExporting(false);
      }
    }
  }, [appendEvent, project, settings]);

  const projectDuration = project?.analysis.duration ?? 0;
  const exportLabel = exportProgress
    ? `${exportProgress.label} ${Math.round(exportProgress.progress * 100)}%`
    : "Ready";
  const visibleIssue = lastIssue ? issueToWarning(lastIssue) : null;
  const debugPayload = useMemo(
    () =>
      stableStringify({
        state: workState,
        project: project
          ? {
              id: project.id,
              source: project.source,
              insight: project.insight,
              fromCache: project.fromCache ?? false,
            }
          : null,
        lastIssue,
        settings,
        sessionLog,
        lastProvenance,
      }),
    [lastIssue, lastProvenance, project, sessionLog, settings, workState],
  );

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-cyan-700">
              Browser-only shader playground
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              {APP_NAME}
            </h1>
          </div>
          <nav
            className="flex flex-wrap items-center gap-2"
            aria-label="Project links"
          >
            <VersionBadge />
            <a
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600"
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Star aria-hidden="true" size={18} />
              Star
            </a>
            <a
              className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 shadow-sm hover:border-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600"
              href={PAYPAL_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Heart aria-hidden="true" size={18} />
              Support
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <VisualizerCanvas bands={bands} settings={settings} time={playhead} />

          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-normal text-slate-700">
                  Spectrogram
                </h2>
                <p className="text-sm text-slate-500">
                  {project
                    ? `${project.name} | ${formatTime(projectDuration)} | ${formatSize(project.size)}`
                    : "Load an audio file or demo"}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                onClick={togglePlayback}
                disabled={!project}
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" size={18} />
                ) : (
                  <Play aria-hidden="true" size={18} />
                )}
                {isPlaying ? "Pause" : "Play"}
              </button>
            </div>
            <SpectrogramCanvas
              analysis={project?.analysis ?? null}
              playhead={playhead}
            />
            <input
              className="mt-3 w-full accent-cyan-600"
              type="range"
              min={0}
              max={Math.max(0.001, projectDuration)}
              step={0.01}
              value={Math.min(playhead, projectDuration)}
              onChange={(event) => scrub(Number(event.target.value))}
              disabled={!project}
              aria-label="Timeline"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-500">
              <span>{formatTime(playhead)}</span>
              <span>{formatTime(projectDuration)}</span>
            </div>
            {project ? (
              <audio
                ref={audioRef}
                src={project.url}
                onEnded={() => setIsPlaying(false)}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                className="mt-3 w-full"
                controls
              />
            ) : null}
          </div>

          <AudioHealthPanel
            issue={visibleIssue}
            isAnalyzing={isAnalyzing}
            onApplySuggestion={() => {
              if (project) {
                userEditedExportRef.current = false;
                applySuggestedExport(project);
                appendEvent(
                  "Applied export suggestion",
                  project.insight.suggestedExport.reason,
                );
              }
            }}
            onCancelAnalysis={cancelAnalysis}
            progress={analysisProgress}
            project={project}
            settings={settings}
            state={workState}
          />

          <div className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-slate-700">
              <Gauge aria-hidden="true" size={17} />
              FFT Bands
            </div>
            <div className="grid grid-cols-8 gap-2 sm:grid-cols-16">
              {bands.map((band, index) => (
                <div
                  key={index}
                  className="flex h-28 flex-col justify-end gap-1"
                >
                  <div className="relative h-full overflow-hidden rounded bg-slate-200">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-cyan-500"
                      style={{ height: `${Math.max(3, band * 100)}%` }}
                    />
                  </div>
                  <span className="truncate text-center text-[10px] text-slate-500">
                    {project?.analysis.bandLabels[index] ?? index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-slate-700">
              <Upload aria-hidden="true" size={17} />
              Audio
            </div>
            <div
              className={`grid min-h-40 place-items-center rounded-lg border border-dashed p-4 text-center ${
                dragActive
                  ? "border-cyan-500 bg-cyan-50"
                  : "border-slate-300 bg-slate-50"
              }`}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                void handleFiles(event.dataTransfer.files);
              }}
            >
              <div className="space-y-3">
                <Music2
                  className="mx-auto text-cyan-700"
                  aria-hidden="true"
                  size={34}
                />
                <p className="text-sm font-medium text-slate-800">
                  Drop audio file
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                  >
                    <Upload aria-hidden="true" size={17} />
                    Choose
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-900 shadow-sm hover:border-cyan-500"
                    onClick={handleDemo}
                    disabled={isAnalyzing}
                  >
                    <Sparkles aria-hidden="true" size={17} />
                    Demo
                  </button>
                  {isAnalyzing ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-800 shadow-sm hover:border-rose-400"
                      onClick={cancelAnalysis}
                    >
                      <X aria-hidden="true" size={17} />
                      Cancel
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
              onChange={(event) => {
                if (event.currentTarget.files) {
                  void handleFiles(event.currentTarget.files);
                }
              }}
            />
            {isAnalyzing ? (
              <p className="mt-3 text-sm font-medium text-cyan-800">
                {analysisProgress?.label ?? "Analyzing audio..."}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-slate-700">
              <SlidersHorizontal aria-hidden="true" size={17} />
              Shader
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Preset
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2"
                value={settings.preset}
                onChange={(event) =>
                  updateSetting("preset", event.target.value as ShaderPreset)
                }
              >
                {Object.entries(presetLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Slider
              label="Intensity"
              min={0.25}
              max={2.5}
              step={0.01}
              value={settings.intensity}
              onChange={(value) => updateSetting("intensity", value)}
            />
            <Slider
              label="Color shift"
              min={0}
              max={1}
              step={0.01}
              value={settings.colorShift}
              onChange={(value) => updateSetting("colorShift", value)}
            />
            <Slider
              label="Bloom"
              min={0}
              max={1.5}
              step={0.01}
              value={settings.bloom}
              onChange={(value) => updateSetting("bloom", value)}
            />
            <Slider
              label="Band smoothing"
              min={0}
              max={0.96}
              step={0.01}
              value={settings.smoothing}
              onChange={(value) => updateSetting("smoothing", value)}
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-slate-700">
              <Download aria-hidden="true" size={17} />
              Export
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Seconds"
                min={2}
                max={45}
                value={settings.exportDuration}
                onChange={(value) => updateSetting("exportDuration", value)}
              />
              <NumberField
                label="FPS"
                min={12}
                max={30}
                value={settings.exportFps}
                onChange={(value) => updateSetting("exportFps", value)}
              />
              <NumberField
                label="Width"
                min={480}
                max={1920}
                value={settings.exportWidth}
                onChange={(value) => updateSetting("exportWidth", value)}
              />
              <NumberField
                label="Height"
                min={270}
                max={1080}
                value={settings.exportHeight}
                onChange={(value) => updateSetting("exportHeight", value)}
              />
            </div>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              onClick={handleExport}
              disabled={!project || isExporting}
            >
              <Download aria-hidden="true" size={18} />
              {isExporting ? "Exporting" : "Export MP4"}
            </button>
            {isExporting ? (
              <button
                type="button"
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-800 shadow-sm hover:border-rose-400"
                onClick={cancelExport}
              >
                <X aria-hidden="true" size={17} />
                Cancel export
              </button>
            ) : null}
            <div className="mt-3 h-2 overflow-hidden rounded bg-slate-200">
              <div
                className="h-full bg-cyan-600"
                style={{
                  width: `${Math.round((exportProgress?.progress ?? 0) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">{exportLabel}</p>
            {downloadUrl ? (
              <div className="mt-3 grid gap-2">
                <a
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500"
                  href={downloadUrl}
                  download="shaderwave-visualizer.mp4"
                >
                  <Download aria-hidden="true" size={17} />
                  Download last export
                </a>
                {lastProvenance ? (
                  <a
                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500"
                    href={`data:application/json;charset=utf-8,${encodeURIComponent(
                      stableStringify(lastProvenance),
                    )}`}
                    download={`${project?.source.safeBaseName ?? "shaderwave"}-provenance.json`}
                  >
                    <Info aria-hidden="true" size={17} />
                    Download provenance
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>

          <SessionLog events={sessionLog} />

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold uppercase tracking-normal text-slate-700">
              Runtime
            </div>
            <div className="grid gap-2">
              {capabilities.map((capability) => (
                <div
                  key={capability.label}
                  className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <span>{capability.label}</span>
                  <span
                    className={
                      capability.ok
                        ? "font-medium text-emerald-700"
                        : "font-medium text-amber-700"
                    }
                  >
                    {capability.ok ? "Ready" : "Fallback"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      {debugEnabled ? <DebugPanel payload={debugPayload} /> : null}
      <Toast message={toast} onDismiss={() => setToast(null)} />
    </main>
  );
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

function AudioHealthPanel({
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

function SessionLog({ events }: { events: SessionEvent[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-normal text-slate-700">
        <Clock aria-hidden="true" size={17} />
        Session log
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-slate-500">No audio activity yet.</p>
      ) : (
        <ol className="grid gap-2">
          {events.map((event) => (
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
  );
}

function DebugPanel({ payload }: { payload: string }) {
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

function VersionBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span>v{APP_VERSION}</span>
      <span className="h-1 w-1 rounded-full bg-slate-400" />
      <span>{APP_COMMIT}</span>
    </div>
  );
}

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className="mt-4 grid gap-1 text-sm font-medium text-slate-700">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="tabular-nums text-slate-500">{value.toFixed(2)}</span>
      </span>
      <input
        className="w-full accent-cyan-700"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface NumberFieldProps {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

function NumberField({ label, min, max, value, onChange }: NumberFieldProps) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        className="w-full rounded-md border border-slate-300 px-3 py-2"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function formatTime(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default App;
