export interface AudioAnalysis {
  duration: number;
  sampleRate: number;
  channelCount: number;
  waveform: number[];
  spectrogram: number[][];
  bands: number[][];
  frameRate: number;
  bandLabels: string[];
}

export interface AudioProject {
  name: string;
  mimeType: string;
  size: number;
  url: string;
  file: File;
  analysis: AudioAnalysis;
}

export interface AnalyzeOptions {
  windowSize?: number;
  hopSize?: number;
  bandCount?: number;
  spectrogramBins?: number;
  maxFrames?: number;
  channelCount?: number;
}
