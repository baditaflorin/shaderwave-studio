import { describe, expect, it } from "vitest";

import { analyzeSamples } from "../audio/analyze";
import { buildAudioInsight } from "../audio/intelligence";
import type { AudioProject, AudioSource } from "../audio/types";
import { defaultVisualSettings } from "../project/settings";
import { buildExportProvenance, stableStringify } from "./provenance";

describe("export provenance", () => {
  it("serializes deterministically", () => {
    const source: AudioSource = {
      id: "aud-test",
      fingerprint: "abc123",
      fileName: "song.mp3",
      safeBaseName: "song",
      mimeType: "audio/mpeg",
      size: 1234,
      extension: "mp3",
      container: "mp3",
      containerConfidence: 0.95,
      sniffReason: "MP3 frame sync detected.",
      probablePartial: false,
    };
    const samples = new Float32Array(44_100);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.sin((2 * Math.PI * 220 * index) / 44_100) * 0.5;
    }
    const analysis = analyzeSamples(samples, 44_100);
    const project: AudioProject = {
      id: source.id,
      name: source.fileName,
      mimeType: source.mimeType,
      size: source.size,
      url: "blob:test",
      file: new File([new Uint8Array([1])], source.fileName, {
        type: source.mimeType,
      }),
      analysis,
      source,
      insight: buildAudioInsight(source, analysis),
    };

    const provenance = buildExportProvenance({
      app: { name: "Shaderwave Studio", version: "0.2.0", commit: "test" },
      project,
      settings: defaultVisualSettings,
    });

    expect(stableStringify(provenance)).toBe(stableStringify(provenance));
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});
