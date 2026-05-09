import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeSamples } from "./analyze";
import {
  buildAudioInsight,
  buildAudioSource,
  sniffAudioBytes,
} from "./intelligence";

const fixtureDir = resolve("test/fixtures/realdata");

describe("audio input intelligence", () => {
  it.each([
    ["clean-long-mp3.mp3", "mp3", undefined],
    ["uncompressed-wav.wav", "wav", undefined],
    ["ogg-music.ogg", "ogg", undefined],
    ["m4a-short.m4a", "m4a", undefined],
    ["track-001.ogg", "ogg", undefined],
    ["empty.mp3", "unknown", "empty_file"],
    ["spoofed-html.mp3", "unknown", "not_audio"],
  ])("sniffs %s", (fileName, container, errorCode) => {
    const bytes = new Uint8Array(readFileSync(resolve(fixtureDir, fileName)));
    const sniff = sniffAudioBytes({
      bytes,
      fileName,
      mimeType: "",
    });

    expect(sniff.container).toBe(container);
    expect(sniff.fatalIssue?.code).toBe(errorCode);
  });

  it("flags the truncated MP3 fixture as partial", () => {
    const fileName = "truncated-mp3.mp3";
    const bytes = new Uint8Array(readFileSync(resolve(fixtureDir, fileName)));
    const sniff = sniffAudioBytes({
      bytes,
      fileName,
      mimeType: "",
    });

    expect(sniff.container).toBe("mp3");
    expect(sniff.probablePartial).toBe(true);
  });

  it("classifies silence and partial streams with confidence warnings", () => {
    const sampleRate = 44_100;
    const silence = analyzeSamples(
      new Float32Array(sampleRate * 5),
      sampleRate,
    );
    const silentSource = sourceFor("track-001.ogg", "ogg", false);
    const silentInsight = buildAudioInsight(silentSource, silence);

    expect(silentInsight.profile).toBe("silent");
    expect(silentInsight.warnings.map((warning) => warning.code)).toContain(
      "low_energy",
    );

    const samples = new Float32Array(sampleRate * 5);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = Math.sin((2 * Math.PI * 180 * index) / sampleRate) * 0.4;
    }
    const partialInsight = buildAudioInsight(
      sourceFor("truncated-mp3.mp3", "mp3", true),
      analyzeSamples(samples, sampleRate),
    );

    expect(partialInsight.profile).toBe("partial");
    expect(partialInsight.warnings.map((warning) => warning.code)).toContain(
      "partial_stream",
    );
  });
});

function sourceFor(
  fileName: string,
  container: "mp3" | "ogg",
  partial: boolean,
) {
  const file = new File([new Uint8Array([1, 2, 3])], fileName, {
    type: `audio/${container}`,
  });

  return buildAudioSource({
    file,
    fingerprint: `fixture-${basename(fileName)}`,
    sniff: {
      container,
      confidence: 0.95,
      fatalIssue: undefined,
      probablePartial: partial,
      reason: "Fixture source.",
    },
  });
}
