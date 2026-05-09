import { analyzeSamples, mixToMono } from "./analyze";
import {
  audioInputError,
  cancelledAudioError,
  type UserFacingAudioIssue,
} from "./errors";
import type {
  AudioAnalysis,
  AudioContainer,
  AudioFact,
  AudioInsight,
  AudioProfile,
  AudioSource,
  AudioWarning,
  SuggestedExport,
} from "./types";

interface AnalyzeAudioFileOptions {
  signal?: AbortSignal;
  onProgress?: (progress: number, label: string) => void;
}

interface AnalyzeAudioFileResult {
  analysis: AudioAnalysis;
  source: AudioSource;
  insight: AudioInsight;
  fromCache: boolean;
}

interface AudioSniff {
  container: AudioContainer;
  confidence: number;
  reason: string;
  probablePartial: boolean;
  fatalIssue?: UserFacingAudioIssue;
}

interface CachedAnalysis {
  analysis: AudioAnalysis;
}

const analysisCache = new Map<string, CachedAnalysis>();

const audioExtensionPattern = /\.(aac|flac|m4a|mp3|oga|ogg|opus|wav)$/i;

export async function analyzeAudioFile(
  file: File,
  options: AnalyzeAudioFileOptions = {},
): Promise<AnalyzeAudioFileResult> {
  const progress = options.onProgress ?? (() => undefined);
  assertNotAborted(options.signal);

  progress(0.04, "Reading audio bytes");
  const arrayBuffer = await file.arrayBuffer();
  assertNotAborted(options.signal);

  const bytes = new Uint8Array(arrayBuffer);
  const sniff = sniffAudioBytes({
    bytes,
    fileName: file.name,
    mimeType: file.type,
  });

  if (sniff.fatalIssue) {
    throw audioInputError(sniff.fatalIssue);
  }

  progress(0.14, "Fingerprinting source");
  const fingerprint = await sha256Hex(bytes);
  const cached = analysisCache.get(fingerprint);
  const source = buildAudioSource({ file, fingerprint, sniff });

  if (cached) {
    progress(1, "Reused cached analysis");
    const insight = buildAudioInsight(source, cached.analysis);
    return {
      analysis: cached.analysis,
      source,
      insight,
      fromCache: true,
    };
  }

  progress(0.24, "Decoding audio stream");
  const context = new window.AudioContext();
  let decoded: AudioBuffer;

  try {
    decoded = await context.decodeAudioData(arrayBuffer.slice(0));
  } catch (error) {
    throw audioInputError({
      code: "decode_failed",
      message: "This file could not be decoded as audio.",
      why:
        error instanceof Error
          ? error.message
          : "The browser rejected the audio bytes.",
      nextStep:
        "Try re-exporting the source as MP3, WAV, M4A, or OGG, then load it again.",
      severity: "error",
      recoverable: true,
    });
  } finally {
    await context.close().catch(() => undefined);
  }

  assertNotAborted(options.signal);
  progress(0.5, "Measuring audio health");
  const samples = mixToMono(decoded);

  assertNotAborted(options.signal);
  progress(0.68, "Building FFT bands");
  const analysis = analyzeSamples(samples, decoded.sampleRate, {
    channelCount: decoded.numberOfChannels,
  });
  const insight = buildAudioInsight(source, analysis);

  analysisCache.set(fingerprint, {
    analysis,
  });

  progress(1, "Audio analysis ready");
  return {
    analysis,
    source,
    insight,
    fromCache: false,
  };
}

export function isLikelyAudioFile(file: File): boolean {
  return (
    file.type.startsWith("audio/") || audioExtensionPattern.test(file.name)
  );
}

export function sniffAudioBytes({
  bytes,
  fileName,
  mimeType,
}: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}): AudioSniff {
  if (bytes.byteLength === 0) {
    return {
      container: "unknown",
      confidence: 1,
      reason: "The file has zero bytes.",
      probablePartial: false,
      fatalIssue: {
        code: "empty_file",
        message: "This audio file is empty.",
        why: "There are no bytes to decode, so there is no waveform or spectrum to analyze.",
        nextStep: "Choose the original exported audio file and load it again.",
        severity: "error",
        recoverable: true,
      },
    };
  }

  if (looksLikeText(bytes)) {
    return {
      container: "unknown",
      confidence: 0.98,
      reason: "The bytes look like text or HTML, not an audio stream.",
      probablePartial: false,
      fatalIssue: {
        code: "not_audio",
        message: "This file is not an audio stream.",
        why: "The extension or MIME type says audio, but the file content looks like text or HTML.",
        nextStep:
          "Export the actual audio file, not a web page or placeholder, then load it again.",
        severity: "error",
        recoverable: true,
      },
    };
  }

  if (hasAscii(bytes, 0, "RIFF") && hasAscii(bytes, 8, "WAVE")) {
    return {
      container: "wav",
      confidence: 0.99,
      reason: "RIFF/WAVE signature detected.",
      probablePartial: false,
    };
  }

  if (hasAscii(bytes, 0, "OggS")) {
    return {
      container: "ogg",
      confidence: 0.99,
      reason: "Ogg stream signature detected.",
      probablePartial: false,
    };
  }

  if (hasAscii(bytes, 0, "fLaC")) {
    return {
      container: "flac",
      confidence: 0.99,
      reason: "FLAC signature detected.",
      probablePartial: false,
    };
  }

  if (hasAscii(bytes, 4, "ftyp")) {
    return {
      container: "m4a",
      confidence: 0.94,
      reason: "ISO BMFF/MP4 audio container signature detected.",
      probablePartial: false,
    };
  }

  if (isAacAdts(bytes)) {
    return {
      container: "aac",
      confidence: 0.9,
      reason: "AAC ADTS frame sync detected.",
      probablePartial: false,
    };
  }

  if (hasAscii(bytes, 0, "ID3") || isMp3FrameSync(bytes, skipId3(bytes))) {
    const mp3 = inspectMp3Frames(bytes);
    return {
      container: "mp3",
      confidence: mp3.frames > 3 ? 0.95 : 0.72,
      reason:
        mp3.frames > 0
          ? `MP3 frame sync detected across ${mp3.frames} frames.`
          : "MP3 header detected.",
      probablePartial: mp3.partial,
    };
  }

  if (mimeType.startsWith("audio/") || audioExtensionPattern.test(fileName)) {
    return {
      container: "unknown",
      confidence: 0.35,
      reason:
        "The browser may support this audio file, but the container signature is not recognized.",
      probablePartial: false,
    };
  }

  return {
    container: "unknown",
    confidence: 0.98,
    reason:
      "No audio signature, audio MIME type, or known audio extension was found.",
    probablePartial: false,
    fatalIssue: {
      code: "not_audio",
      message: "Choose an audio file.",
      why: "The file does not look like MP3, WAV, M4A, OGG, AAC, or FLAC audio.",
      nextStep: "Load an exported audio file from your editor or DAW.",
      severity: "error",
      recoverable: true,
    },
  };
}

export function buildAudioInsight(
  source: AudioSource,
  analysis: AudioAnalysis,
): AudioInsight {
  const warnings: AudioWarning[] = [];
  const { duration, loudness } = analysis;
  let profile: AudioProfile = "song";
  let confidence = Math.min(0.96, Math.max(0.58, source.containerConfidence));

  if (source.container === "unknown") {
    warnings.push({
      code: "unknown_container",
      title: "Container is uncertain",
      message:
        "The browser decoded this audio, but the container could not be identified confidently.",
      why: source.sniffReason,
      nextStep:
        "Verify the preview before exporting, or re-export as MP3, WAV, M4A, or OGG.",
      severity: "warning",
      confidence: 0.65,
    });
    confidence = Math.min(confidence, 0.65);
  }

  if (source.probablePartial) {
    profile = "partial";
    warnings.push({
      code: "partial_stream",
      title: "This looks like a partial audio file",
      message: "The MP3 stream appears to end inside a frame.",
      why: "The analyzer found an incomplete final MP3 frame, which often means the transfer or export was cut short.",
      nextStep:
        "Reload the original full export before rendering a final video.",
      severity: "warning",
      confidence: 0.86,
    });
    confidence = Math.min(confidence, 0.58);
  }

  if (loudness.peak < 0.003 || loudness.rms < 0.0008) {
    profile = "silent";
    warnings.push({
      code: "low_energy",
      title: "This track is nearly silent",
      message: "There is not enough audio energy to drive reactive visuals.",
      why: `Peak amplitude is ${formatDecimal(loudness.peak)} and RMS is ${formatDecimal(loudness.rms)}.`,
      nextStep:
        "Choose a louder mix, or export intentionally knowing the shader will move very little.",
      severity: "warning",
      confidence: 0.98,
    });
    confidence = Math.min(confidence, 0.62);
  } else if (duration < 3) {
    profile = "clip";
    warnings.push({
      code: "short_clip",
      title: "Very short clip",
      message: "This clip is shorter than most music-video exports.",
      why: `Decoded duration is ${formatDuration(duration)}.`,
      nextStep:
        "Use the full track for final renders, or keep this as a quick visual test.",
      severity: "info",
      confidence: 0.92,
    });
  } else if (duration > 240 && profile === "song") {
    profile = "long_track";
    warnings.push({
      code: "long_track",
      title: "Long track",
      message:
        "Rendering the whole track at high resolution can take a while in the browser.",
      why: `Decoded duration is ${formatDuration(duration)}.`,
      nextStep:
        "Start with the suggested short render range, then raise seconds when the look is right.",
      severity: "info",
      confidence: 0.9,
    });
    confidence = Math.min(confidence, 0.82);
  }

  if (loudness.clippedRatio > 0.005) {
    warnings.push({
      code: "clipped_peaks",
      title: "Clipped peaks detected",
      message: "Some samples are pinned near full scale.",
      why: `${(loudness.clippedRatio * 100).toFixed(2)}% of samples are near clipping.`,
      nextStep: "Check the mix if the visualizer feels too slammed or flat.",
      severity: "warning",
      confidence: 0.88,
    });
    confidence = Math.min(confidence, 0.76);
  }

  if (analysis.channelCount > 2) {
    warnings.push({
      code: "downmixed_channels",
      title: "Multichannel audio was downmixed",
      message: "The analyzer mixed multiple channels into one reactive signal.",
      why: `${analysis.channelCount} channels were decoded.`,
      nextStep: "Use a stereo export if the multichannel balance matters.",
      severity: "info",
      confidence: 0.9,
    });
  }

  if (source.size > 100 * 1024 * 1024) {
    warnings.push({
      code: "large_source",
      title: "Large source file",
      message: "This file may need extra memory while decoding and exporting.",
      why: `Source size is ${formatSize(source.size)}.`,
      nextStep:
        "Close other heavy browser tabs or use a shorter test export first.",
      severity: "warning",
      confidence: 0.95,
    });
    confidence = Math.min(confidence, 0.7);
  }

  const suggestedExport = suggestExport(analysis, warnings);
  const facts = buildFacts(source, analysis);

  return {
    profile,
    profileLabel: profileLabels[profile],
    confidence: clamp(confidence, 0, 1),
    summary: summarizeInsight(profile, warnings),
    facts,
    warnings,
    suggestedExport,
  };
}

export function buildAudioSource({
  file,
  fingerprint,
  sniff,
}: {
  file: File;
  fingerprint: string;
  sniff: AudioSniff;
}): AudioSource {
  const extension = extensionOf(file.name);

  return {
    id: `aud-${fingerprint.slice(0, 12)}`,
    fingerprint,
    fileName: file.name,
    safeBaseName: safeBaseName(file.name),
    mimeType: file.type || "audio/unknown",
    size: file.size,
    extension,
    container: sniff.container,
    containerConfidence: sniff.confidence,
    sniffReason: sniff.reason,
    probablePartial: sniff.probablePartial,
  };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const copy = new Uint8Array(bytes);
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      copy.buffer as ArrayBuffer,
    );
    return Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, "0"),
    ).join("");
  }

  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash.toString(16).padStart(8, "0").repeat(8);
}

export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw cancelledAudioError();
  }
}

function buildFacts(source: AudioSource, analysis: AudioAnalysis): AudioFact[] {
  return [
    {
      label: "Container",
      value: source.container.toUpperCase(),
      confidence: source.containerConfidence,
      explanation: source.sniffReason,
    },
    {
      label: "Duration",
      value: formatDuration(analysis.duration),
      confidence: 0.99,
      explanation: "Decoded by the browser Web Audio pipeline.",
    },
    {
      label: "Channels",
      value: String(analysis.channelCount),
      confidence: 0.99,
      explanation: "Decoded channel count before mono analysis.",
    },
    {
      label: "Peak",
      value: formatDecimal(analysis.loudness.peak),
      confidence: 0.94,
      explanation: "Highest absolute sample after downmix.",
    },
    {
      label: "RMS",
      value: formatDecimal(analysis.loudness.rms),
      confidence: 0.94,
      explanation: "Average audio energy used for silence detection.",
    },
    {
      label: "Fingerprint",
      value: source.fingerprint.slice(0, 12),
      confidence: 1,
      explanation: "Stable source hash used for project IDs and cache keys.",
    },
  ];
}

function suggestExport(
  analysis: AudioAnalysis,
  warnings: AudioWarning[],
): SuggestedExport {
  const hasLongWarning = warnings.some(
    (warning) => warning.code === "long_track",
  );
  const seconds = clamp(
    Math.round(Math.min(analysis.duration, hasLongWarning ? 12 : 8)),
    2,
    45,
  );
  const fps = hasLongWarning ? 18 : 24;
  const width = 960;
  const height = 540;

  return {
    seconds,
    fps,
    width,
    height,
    frameCount: seconds * fps,
    reason: hasLongWarning
      ? "Short render range keeps long-track iteration fast."
      : "Preview-sized render keeps browser export responsive.",
  };
}

function summarizeInsight(profile: AudioProfile, warnings: AudioWarning[]) {
  if (warnings.some((warning) => warning.code === "low_energy")) {
    return "Loaded, but the audio is nearly silent.";
  }
  if (warnings.some((warning) => warning.code === "partial_stream")) {
    return "Loaded with a partial-stream warning.";
  }
  if (warnings.length > 0) {
    return `${profileLabels[profile]} loaded with ${warnings.length} note${warnings.length === 1 ? "" : "s"}.`;
  }
  return `${profileLabels[profile]} ready for export.`;
}

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = ascii(
    bytes.slice(0, Math.min(96, bytes.byteLength)),
  ).trimStart();
  if (/^(<!doctype|<html|<head|<body|<script|<meta|<\?xml)/i.test(sample)) {
    return true;
  }

  if (!audioExtensionPattern.test(sample)) {
    const printable = bytes
      .slice(0, Math.min(64, bytes.byteLength))
      .filter(
        (byte) =>
          byte === 9 ||
          byte === 10 ||
          byte === 13 ||
          (byte >= 32 && byte <= 126),
      );
    return (
      bytes.byteLength > 16 &&
      printable.length / Math.min(64, bytes.byteLength) > 0.95
    );
  }

  return false;
}

function inspectMp3Frames(bytes: Uint8Array): {
  frames: number;
  partial: boolean;
} {
  let offset = skipId3(bytes);
  let frames = 0;

  while (offset + 4 <= bytes.byteLength) {
    if (!isMp3FrameSync(bytes, offset)) {
      offset += 1;
      continue;
    }

    const length = mp3FrameLength(bytes, offset);
    if (!length) {
      offset += 1;
      continue;
    }

    frames += 1;
    if (offset + length > bytes.byteLength) {
      return { frames, partial: true };
    }
    offset += length;
  }

  return { frames, partial: frames > 0 && bytes.byteLength - offset > 0 };
}

function mp3FrameLength(bytes: Uint8Array, offset: number): number | null {
  const byte1 = bytes[offset + 1];
  const byte2 = bytes[offset + 2];
  const byte3 = bytes[offset + 3];
  const versionBits = (byte1 >> 3) & 0x03;
  const layerBits = (byte1 >> 1) & 0x03;
  const bitrateIndex = (byte2 >> 4) & 0x0f;
  const sampleRateIndex = (byte2 >> 2) & 0x03;
  const padding = (byte2 >> 1) & 0x01;

  if (
    versionBits === 1 ||
    layerBits !== 1 ||
    bitrateIndex === 0 ||
    bitrateIndex === 15 ||
    sampleRateIndex === 3
  ) {
    return null;
  }

  const bitrates =
    versionBits === 3 ? mpeg1Layer3Bitrates : mpeg2Layer3Bitrates;
  const sampleRates = sampleRateTable[versionBits];
  const bitrate = bitrates[bitrateIndex] * 1000;
  const sampleRate = sampleRates[sampleRateIndex];

  if (!bitrate || !sampleRate || byte3 === undefined) {
    return null;
  }

  const coefficient = versionBits === 3 ? 144 : 72;
  return Math.floor((coefficient * bitrate) / sampleRate + padding);
}

function skipId3(bytes: Uint8Array): number {
  if (!hasAscii(bytes, 0, "ID3") || bytes.byteLength < 10) {
    return 0;
  }

  const size =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);
  return Math.min(bytes.byteLength, 10 + size);
}

function isMp3FrameSync(bytes: Uint8Array, offset: number): boolean {
  return bytes[offset] === 0xff && (bytes[offset + 1] & 0xe0) === 0xe0;
}

function isAacAdts(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
}

function hasAscii(bytes: Uint8Array, offset: number, value: string): boolean {
  if (offset + value.length > bytes.byteLength) {
    return false;
  }

  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) {
      return false;
    }
  }

  return true;
}

function ascii(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}

function extensionOf(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function safeBaseName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const normalized = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || "shaderwave";
}

function formatDuration(value: number): string {
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

function formatDecimal(value: number): string {
  return value.toFixed(value < 0.01 ? 4 : 3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const profileLabels: Record<AudioProfile, string> = {
  clip: "Short clip",
  long_track: "Long track",
  partial: "Partial track",
  silent: "Silent track",
  song: "Song",
};

const mpeg1Layer3Bitrates = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const mpeg2Layer3Bitrates = [
  0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160,
];
const sampleRateTable: Record<number, number[]> = {
  0: [11025, 12000, 8000],
  2: [22050, 24000, 16000],
  3: [44100, 48000, 32000],
};
