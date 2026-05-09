import { toBlobURL } from "@ffmpeg/util";

import { sampleBandsAtTime } from "../audio/analyze";
import type { AudioAnalysis } from "../audio/types";
import type { VisualSettings } from "../project/settings";
import { drawShaderFrame2d } from "../visualizer/draw2d";
import type { ExportProvenance } from "./provenance";
import { stableStringify } from "./provenance";

interface ExportOptions {
  analysis: AudioAnalysis;
  audioFile: File;
  settings: VisualSettings;
  provenance: ExportProvenance;
  signal?: AbortSignal;
  onProgress: (progress: number, label: string) => void;
}

let ffmpegInstance: import("@ffmpeg/ffmpeg").FFmpeg | null = null;

export async function exportMp4({
  analysis,
  audioFile,
  provenance,
  signal,
  settings,
  onProgress,
}: ExportOptions): Promise<Blob> {
  assertNotAborted(signal);
  const duration = Math.min(settings.exportDuration, analysis.duration);
  const frameCount = Math.max(1, Math.floor(duration * settings.exportFps));
  const canvas = document.createElement("canvas");
  canvas.width = settings.exportWidth;
  canvas.height = settings.exportHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas export context could not be created.");
  }

  const ffmpeg = await loadFfmpeg(onProgress);
  assertNotAborted(signal);
  const frameDir = "frames";
  await safeDelete(ffmpeg, "shaderwave-export.mp4");
  await safeDelete(ffmpeg, "input-audio");
  await safeDeleteDir(ffmpeg, frameDir);
  await ffmpeg.createDir(frameDir);

  for (let frame = 0; frame < frameCount; frame += 1) {
    assertNotAborted(signal);
    const time = frame / settings.exportFps;
    const bands = sampleBandsAtTime(analysis, time);
    drawShaderFrame2d({
      context,
      width: canvas.width,
      height: canvas.height,
      bands,
      time,
      settings,
    });

    const png = await canvasToPng(canvas);
    await ffmpeg.writeFile(
      `${frameDir}/frame${String(frame + 1).padStart(5, "0")}.png`,
      png,
    );
    onProgress(
      ((frame + 1) / frameCount) * 0.7,
      `Rendering frame ${frame + 1}/${frameCount}`,
    );
  }

  const extension = audioExtension(audioFile);
  const audioName = `input-audio.${extension}`;
  assertNotAborted(signal);
  await ffmpeg.writeFile(
    audioName,
    new Uint8Array(await audioFile.arrayBuffer()),
  );

  const metadata = stableStringify(provenance);
  const args = [
    "-hide_banner",
    "-framerate",
    String(settings.exportFps),
    "-i",
    `${frameDir}/frame%05d.png`,
    "-i",
    audioName,
    "-t",
    duration.toFixed(3),
    "-shortest",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-metadata",
    `title=${provenance.source.fileName}`,
    "-metadata",
    `artist=${provenance.app.name}`,
    "-metadata",
    `comment=${metadata}`,
    "-metadata",
    "creation_time=1970-01-01T00:00:00.000000Z",
    "-movflags",
    "faststart",
    "shaderwave-export.mp4",
  ];

  onProgress(0.74, "Encoding MP4");
  let code = await ffmpeg.exec(args);
  assertNotAborted(signal);

  if (code !== 0) {
    onProgress(0.78, "Retrying encoder fallback");
    code = await ffmpeg.exec([
      "-framerate",
      String(settings.exportFps),
      "-i",
      `${frameDir}/frame%05d.png`,
      "-i",
      audioName,
      "-t",
      duration.toFixed(3),
      "-shortest",
      "-c:v",
      "mpeg4",
      "-q:v",
      "5",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-metadata",
      `comment=${metadata}`,
      "-metadata",
      "creation_time=1970-01-01T00:00:00.000000Z",
      "shaderwave-export.mp4",
    ]);
    assertNotAborted(signal);
  }

  if (code !== 0) {
    throw new Error("FFmpeg could not encode the MP4.");
  }

  const data = await ffmpeg.readFile("shaderwave-export.mp4");
  onProgress(1, "Export ready");

  if (typeof data === "string") {
    throw new Error("FFmpeg returned text instead of video bytes.");
  }

  const output = new ArrayBuffer(data.byteLength);
  new Uint8Array(output).set(data);

  return new Blob([output], { type: "video/mp4" });
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Export cancelled.", "AbortError");
  }
}

async function loadFfmpeg(onProgress: ExportOptions["onProgress"]) {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }

  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const ffmpeg = new FFmpeg();
  const corePath = `${import.meta.env.BASE_URL}ffmpeg-core`;

  ffmpeg.on("progress", ({ progress }) => {
    onProgress(0.78 + progress * 0.2, "Encoding MP4");
  });

  onProgress(0.02, "Loading FFmpeg-WASM");
  await ffmpeg.load({
    coreURL: await toBlobURL(`${corePath}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(
      `${corePath}/ffmpeg-core.wasm`,
      "application/wasm",
    ),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Could not render PNG frame."));
      }
    }, "image/png");
  });

  return new Uint8Array(await blob.arrayBuffer());
}

function audioExtension(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension;
  }

  if (file.type.includes("wav")) {
    return "wav";
  }

  if (file.type.includes("mpeg")) {
    return "mp3";
  }

  return "audio";
}

async function safeDelete(
  ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg,
  path: string,
) {
  try {
    await ffmpeg.deleteFile(path);
  } catch {
    return;
  }
}

async function safeDeleteDir(
  ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg,
  path: string,
) {
  try {
    const entries = await ffmpeg.listDir(path);
    for (const entry of entries) {
      if (!entry.isDir) {
        await ffmpeg.deleteFile(`${path}/${entry.name}`);
      }
    }
    await ffmpeg.deleteDir(path);
  } catch {
    return;
  }
}
