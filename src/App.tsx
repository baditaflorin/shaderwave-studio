import {
  Download,
  Gauge,
  Heart,
  Music2,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
  Star,
  Upload,
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
import {
  decodeAudioFile,
  sampleBandsAtTime,
  smoothBands,
} from "./features/audio/analyze";
import { createDemoProject } from "./features/audio/demo";
import type { AudioProject } from "./features/audio/types";
import { exportMp4 } from "./features/export/exportMp4";
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

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const projectUrlRef = useRef<string | null>(null);
  const downloadUrlRef = useRef<string | null>(null);
  const playheadRef = useRef(0);

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
  const [exportProgress, setExportProgress] = useState<{
    progress: number;
    label: string;
  } | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
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
    setPlayhead(0);
    setBands(zeroBands);
    setIsPlaying(false);
  }, []);

  const updateSetting = useCallback(
    <Key extends keyof VisualSettings>(
      key: Key,
      value: VisualSettings[Key],
    ) => {
      setSettings((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = files[0];
      if (!file) {
        return;
      }

      if (
        !file.type.startsWith("audio/") &&
        !/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name)
      ) {
        setToast("Choose an audio file.");
        return;
      }

      setIsAnalyzing(true);
      setToast(null);

      try {
        const analysis = await decodeAudioFile(file);
        replaceProject({
          name: file.name,
          mimeType: file.type || "audio",
          size: file.size,
          url: URL.createObjectURL(file),
          file,
          analysis,
        });
      } catch (error) {
        setToast(
          error instanceof Error ? error.message : "Audio decode failed.",
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [replaceProject],
  );

  const handleDemo = useCallback(() => {
    setIsAnalyzing(true);
    window.setTimeout(() => {
      try {
        replaceProject(createDemoProject());
      } catch (error) {
        setToast(
          error instanceof Error
            ? error.message
            : "Could not create demo audio.",
        );
      } finally {
        setIsAnalyzing(false);
      }
    }, 0);
  }, [replaceProject]);

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

    setIsExporting(true);
    setExportProgress({ progress: 0, label: "Preparing export" });

    try {
      const video = await exportMp4({
        analysis: project.analysis,
        audioFile: project.file,
        settings,
        onProgress: (progress, label) => setExportProgress({ progress, label }),
      });
      const url = URL.createObjectURL(video);

      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current);
      }
      downloadUrlRef.current = url;
      setDownloadUrl(url);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.name.replace(/\.[^.]+$/, "") || "shaderwave"}-visualizer.mp4`;
      anchor.click();
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : `Export failed: ${String(error)}`,
      );
    } finally {
      setIsExporting(false);
    }
  }, [project, settings]);

  const projectDuration = project?.analysis.duration ?? 0;
  const exportLabel = exportProgress
    ? `${exportProgress.label} ${Math.round(exportProgress.progress * 100)}%`
    : "Ready";

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
                  Drop MP3/WAV/M4A
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
                Analyzing audio...
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
              <a
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:border-slate-500"
                href={downloadUrl}
                download="shaderwave-visualizer.mp4"
              >
                <Download aria-hidden="true" size={17} />
                Download last export
              </a>
            ) : null}
          </section>

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

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </main>
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
