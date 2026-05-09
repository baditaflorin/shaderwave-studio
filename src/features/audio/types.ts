export interface AudioAnalysis {
  duration: number;
  sampleRate: number;
  channelCount: number;
  loudness: AudioLoudness;
  waveform: number[];
  spectrogram: number[][];
  bands: number[][];
  frameRate: number;
  bandLabels: string[];
}

export interface AudioLoudness {
  rms: number;
  peak: number;
  clippedRatio: number;
  quietRatio: number;
}

export type AudioContainer =
  | "aac"
  | "flac"
  | "m4a"
  | "mp3"
  | "ogg"
  | "unknown"
  | "wav";

export type AudioProfile =
  | "clip"
  | "long_track"
  | "partial"
  | "silent"
  | "song";

export type AudioIssueSeverity = "error" | "info" | "warning";

export interface AudioWarning {
  code: string;
  title: string;
  message: string;
  why: string;
  nextStep: string;
  severity: AudioIssueSeverity;
  confidence: number;
}

export interface AudioFact {
  label: string;
  value: string;
  confidence: number;
  explanation: string;
}

export interface SuggestedExport {
  seconds: number;
  fps: number;
  width: number;
  height: number;
  frameCount: number;
  reason: string;
}

export interface AudioSource {
  id: string;
  fingerprint: string;
  fileName: string;
  safeBaseName: string;
  mimeType: string;
  size: number;
  extension: string;
  container: AudioContainer;
  containerConfidence: number;
  sniffReason: string;
  probablePartial: boolean;
}

export interface AudioInsight {
  profile: AudioProfile;
  profileLabel: string;
  confidence: number;
  summary: string;
  facts: AudioFact[];
  warnings: AudioWarning[];
  suggestedExport: SuggestedExport;
}

export interface AudioProject {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  file: File;
  analysis: AudioAnalysis;
  source: AudioSource;
  insight: AudioInsight;
  fromCache?: boolean;
}

export interface AnalyzeOptions {
  windowSize?: number;
  hopSize?: number;
  bandCount?: number;
  spectrogramBins?: number;
  maxFrames?: number;
  channelCount?: number;
}
