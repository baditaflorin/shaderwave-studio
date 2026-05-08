import FFT from "fft.js";

import {
  FFT_BAND_COUNT,
  MAX_ANALYSIS_FRAMES,
  SPECTROGRAM_BINS,
} from "../../config/app";
import type { AnalyzeOptions, AudioAnalysis } from "./types";

const minHz = 35;
const minDb = -82;
const maxDb = -8;

export async function decodeAudioFile(file: File): Promise<AudioAnalysis> {
  const context = new window.AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const decoded = await context.decodeAudioData(arrayBuffer.slice(0));
  const samples = mixToMono(decoded);

  await context.close();

  return analyzeSamples(samples, decoded.sampleRate, {
    channelCount: decoded.numberOfChannels,
  });
}

export function mixToMono(buffer: AudioBuffer): Float32Array {
  const output = new Float32Array(buffer.length);

  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) {
      output[index] += data[index] / buffer.numberOfChannels;
    }
  }

  return output;
}

export function analyzeSamples(
  samples: Float32Array,
  sampleRate: number,
  options: AnalyzeOptions = {},
): AudioAnalysis {
  const windowSize = options.windowSize ?? 1024;
  const hopSize = options.hopSize ?? 512;
  const bandCount = options.bandCount ?? FFT_BAND_COUNT;
  const spectrogramBins = options.spectrogramBins ?? SPECTROGRAM_BINS;
  const maxFrames = options.maxFrames ?? MAX_ANALYSIS_FRAMES;

  const duration = samples.length / sampleRate;
  const fft = new FFT(windowSize);
  const spectrum = fft.createComplexArray();
  const frameInput = new Array<number>(windowSize).fill(0);
  const window = hannWindow(windowSize);
  const availableFrames = Math.max(
    1,
    Math.floor((samples.length - windowSize) / hopSize) + 1,
  );
  const frameStride = Math.max(1, Math.ceil(availableFrames / maxFrames));
  const frequencyResolution = sampleRate / windowSize;
  const bandEdges = frequencyEdges(bandCount, sampleRate / 2);
  const spectrogramEdges = frequencyEdges(spectrogramBins, sampleRate / 2);
  const rawBands: number[][] = [];
  const spectrogram: number[][] = [];

  for (let frame = 0; frame < availableFrames; frame += frameStride) {
    const offset = frame * hopSize;

    for (let index = 0; index < windowSize; index += 1) {
      frameInput[index] = (samples[offset + index] ?? 0) * window[index];
    }

    fft.realTransform(spectrum, frameInput);
    fft.completeSpectrum(spectrum);

    rawBands.push(edgesToMagnitudes(spectrum, bandEdges, frequencyResolution));
    spectrogram.push(
      edgesToMagnitudes(spectrum, spectrogramEdges, frequencyResolution),
    );
  }

  const bands = normalizeColumns(rawBands);

  return {
    duration,
    sampleRate,
    channelCount: options.channelCount ?? 1,
    waveform: buildWaveform(samples, 256),
    spectrogram,
    bands,
    frameRate: sampleRate / hopSize / frameStride,
    bandLabels: bandEdges
      .slice(0, -1)
      .map((start, index) => formatBandLabel(start, bandEdges[index + 1])),
  };
}

export function sampleBandsAtTime(
  analysis: AudioAnalysis,
  time: number,
): number[] {
  if (analysis.bands.length === 0) {
    return new Array(FFT_BAND_COUNT).fill(0);
  }

  const framePosition = clamp(
    time * analysis.frameRate,
    0,
    analysis.bands.length - 1,
  );
  const lowIndex = Math.floor(framePosition);
  const highIndex = Math.min(analysis.bands.length - 1, lowIndex + 1);
  const mix = framePosition - lowIndex;
  const low = analysis.bands[lowIndex];
  const high = analysis.bands[highIndex];

  return low.map((value, index) => value + (high[index] - value) * mix);
}

export function smoothBands(
  previous: number[],
  next: number[],
  smoothing: number,
): number[] {
  if (previous.length !== next.length) {
    return next;
  }

  return next.map(
    (value, index) => previous[index] * smoothing + value * (1 - smoothing),
  );
}

function edgesToMagnitudes(
  spectrum: number[],
  edges: number[],
  frequencyResolution: number,
): number[] {
  const values: number[] = [];

  for (let index = 0; index < edges.length - 1; index += 1) {
    const startBin = Math.max(
      1,
      Math.floor(edges[index] / frequencyResolution),
    );
    const endBin = Math.max(
      startBin + 1,
      Math.ceil(edges[index + 1] / frequencyResolution),
    );
    let sum = 0;
    let count = 0;

    for (let bin = startBin; bin < endBin; bin += 1) {
      const real = spectrum[bin * 2] ?? 0;
      const imaginary = spectrum[bin * 2 + 1] ?? 0;
      const magnitude = Math.sqrt(real * real + imaginary * imaginary);
      sum += dbToUnit(20 * Math.log10(magnitude + 1e-8));
      count += 1;
    }

    values.push(count === 0 ? 0 : sum / count);
  }

  return values;
}

function normalizeColumns(frames: number[][]): number[][] {
  if (frames.length === 0) {
    return frames;
  }

  const bandCount = frames[0].length;
  const peaks = new Array<number>(bandCount).fill(0.001);

  for (const frame of frames) {
    for (let band = 0; band < bandCount; band += 1) {
      peaks[band] = Math.max(peaks[band], frame[band]);
    }
  }

  return frames.map((frame) =>
    frame.map((value, band) =>
      clamp(Math.pow(value / peaks[band], 0.82), 0, 1),
    ),
  );
}

function buildWaveform(samples: Float32Array, points: number): number[] {
  const values: number[] = [];
  const stride = Math.max(1, Math.floor(samples.length / points));

  for (let point = 0; point < points; point += 1) {
    const start = point * stride;
    const end = Math.min(samples.length, start + stride);
    let peak = 0;

    for (let index = start; index < end; index += 1) {
      peak = Math.max(peak, Math.abs(samples[index]));
    }

    values.push(clamp(peak, 0, 1));
  }

  return values;
}

function hannWindow(size: number): number[] {
  return Array.from(
    { length: size },
    (_, index) => 0.5 * (1 - Math.cos((2 * Math.PI * index) / (size - 1))),
  );
}

function frequencyEdges(count: number, nyquist: number): number[] {
  return Array.from({ length: count + 1 }, (_, index) => {
    const mix = index / count;
    return minHz * Math.pow(nyquist / minHz, mix);
  });
}

function dbToUnit(db: number): number {
  return clamp((db - minDb) / (maxDb - minDb), 0, 1);
}

function formatBandLabel(start: number, end: number): string {
  const center = Math.sqrt(start * end);
  if (center >= 1000) {
    return `${(center / 1000).toFixed(1)}k`;
  }

  return `${Math.round(center)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
