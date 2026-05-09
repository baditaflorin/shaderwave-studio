import { analyzeSamples } from "./analyze";
import { buildAudioInsight } from "./intelligence";
import type { AudioProject } from "./types";

export function createDemoProject(): AudioProject {
  const sampleRate = 44_100;
  const duration = 18;
  const samples = createDemoSamples(sampleRate, duration);
  const wav = encodeWav(samples, sampleRate);
  const file = new File([wav], "shaderwave-demo.wav", { type: "audio/wav" });
  const analysis = analyzeSamples(samples, sampleRate, {
    channelCount: 1,
  });
  const source = {
    id: "aud-demo-shaderwave",
    fingerprint: "demo-shaderwave-studio",
    fileName: file.name,
    safeBaseName: "shaderwave-demo",
    mimeType: file.type,
    size: file.size,
    extension: "wav",
    container: "wav" as const,
    containerConfidence: 1,
    sniffReason: "Generated demo WAV in the browser.",
    probablePartial: false,
  };

  return {
    id: source.id,
    name: file.name,
    mimeType: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
    file,
    analysis,
    source,
    insight: buildAudioInsight(source, analysis),
  };
}

export function createDemoSamples(
  sampleRate: number,
  duration: number,
): Float32Array {
  const length = Math.floor(sampleRate * duration);
  const samples = new Float32Array(length);

  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const beat = Math.pow(Math.max(0, Math.sin(time * Math.PI * 2 * 1.35)), 14);
    const snare = Math.pow(
      Math.max(0, Math.sin((time + 0.18) * Math.PI * 2 * 2.7)),
      22,
    );
    const bass =
      Math.sin(Math.PI * 2 * (52 + beat * 24) * time) * (0.26 + beat * 0.42);
    const lead =
      Math.sin(Math.PI * 2 * (220 + Math.sin(time * 0.7) * 48) * time) * 0.16;
    const shimmer =
      Math.sin(Math.PI * 2 * 880 * time + Math.sin(time * 4.4) * 2) *
      (0.04 + snare * 0.16);
    const sweep = Math.sin(Math.PI * 2 * (120 + time * 18) * time) * 0.08;

    samples[index] = softClip(bass + lead + shimmer + sweep + beat * 0.18);
  }

  return samples;
}

export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (const sample of samples) {
    view.setInt16(
      offset,
      Math.round(Math.max(-1, Math.min(1, sample)) * 0x7fff),
      true,
    );
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function softClip(value: number): number {
  return Math.tanh(value * 1.25);
}
