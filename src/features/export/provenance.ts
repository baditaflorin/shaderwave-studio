import type { AudioProject } from "../audio/types";
import type { VisualSettings } from "../project/settings";

export interface ExportProvenance {
  schemaVersion: 1;
  app: {
    name: string;
    version: string;
    commit: string;
  };
  source: {
    id: string;
    fileName: string;
    fingerprint: string;
    container: string;
    size: number;
  };
  analysis: {
    duration: number;
    sampleRate: number;
    channelCount: number;
    profile: string;
    confidence: number;
    warningCodes: string[];
  };
  settings: {
    exportDuration: number;
    exportFps: number;
    exportWidth: number;
    exportHeight: number;
    preset: string;
    intensity: number;
    colorShift: number;
    bloom: number;
    smoothing: number;
  };
}

export function buildExportProvenance({
  app,
  project,
  settings,
}: {
  app: ExportProvenance["app"];
  project: AudioProject;
  settings: VisualSettings;
}): ExportProvenance {
  return {
    schemaVersion: 1,
    app,
    source: {
      id: project.source.id,
      fileName: project.source.fileName,
      fingerprint: project.source.fingerprint,
      container: project.source.container,
      size: project.source.size,
    },
    analysis: {
      duration: round(project.analysis.duration),
      sampleRate: project.analysis.sampleRate,
      channelCount: project.analysis.channelCount,
      profile: project.insight.profile,
      confidence: round(project.insight.confidence),
      warningCodes: project.insight.warnings
        .map((warning) => warning.code)
        .sort(),
    },
    settings: {
      exportDuration: settings.exportDuration,
      exportFps: settings.exportFps,
      exportWidth: settings.exportWidth,
      exportHeight: settings.exportHeight,
      preset: settings.preset,
      intensity: settings.intensity,
      colorShift: settings.colorShift,
      bloom: settings.bloom,
      smoothing: settings.smoothing,
    },
  };
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
