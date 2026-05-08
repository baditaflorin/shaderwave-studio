import { describe, expect, it } from "vitest";

import { FFT_BAND_COUNT, SPECTROGRAM_BINS } from "../../config/app";
import { analyzeSamples, sampleBandsAtTime, smoothBands } from "./analyze";

describe("audio analysis", () => {
  it("extracts spectrogram bins and normalized FFT bands", () => {
    const sampleRate = 8_192;
    const duration = 1;
    const samples = new Float32Array(sampleRate * duration);

    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.sin((2 * Math.PI * 220 * index) / sampleRate) * 0.8;
    }

    const analysis = analyzeSamples(samples, sampleRate, {
      windowSize: 512,
      hopSize: 128,
      maxFrames: 128,
    });

    expect(analysis.duration).toBe(1);
    expect(analysis.bands.length).toBeGreaterThan(0);
    expect(analysis.bands[0]).toHaveLength(FFT_BAND_COUNT);
    expect(analysis.spectrogram[0]).toHaveLength(SPECTROGRAM_BINS);
    expect(Math.max(...sampleBandsAtTime(analysis, 0.4))).toBeGreaterThan(0.5);
  });

  it("smooths band frames without changing their shape", () => {
    const smoothed = smoothBands([0, 0.5, 1], [1, 0.5, 0], 0.5);

    expect(smoothed).toEqual([0.5, 0.5, 0.5]);
  });
});
