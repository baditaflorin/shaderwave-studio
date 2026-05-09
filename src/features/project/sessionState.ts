import { openDB } from "idb";
import { z } from "zod";

import type { AudioProject } from "../audio/types";
import type { ExportProvenance } from "../export/provenance";
import { stableStringify } from "../export/provenance";
import { visualSettingsSchema, type VisualSettings } from "./settings";

export interface SessionEvent {
  id: string;
  label: string;
  detail: string;
  at: string;
}

export interface SessionSnapshot {
  settings: VisualSettings;
  project: AudioProject | null;
  sessionLog: SessionEvent[];
  lastProvenance: ExportProvenance | null;
  playhead: number;
}

const sessionEventSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  at: z.string(),
});

const audioLoudnessSchema = z.object({
  rms: z.number(),
  peak: z.number(),
  clippedRatio: z.number(),
  quietRatio: z.number(),
});

const audioAnalysisSchema = z.object({
  duration: z.number().nonnegative(),
  sampleRate: z.number().positive(),
  channelCount: z.number().int().positive(),
  loudness: audioLoudnessSchema,
  waveform: z.array(z.number()),
  spectrogram: z.array(z.array(z.number())),
  bands: z.array(z.array(z.number())),
  frameRate: z.number().positive(),
  bandLabels: z.array(z.string()),
});

const audioSourceSchema = z.object({
  id: z.string(),
  fingerprint: z.string(),
  fileName: z.string(),
  safeBaseName: z.string(),
  mimeType: z.string(),
  size: z.number().nonnegative(),
  extension: z.string(),
  container: z.enum(["aac", "flac", "m4a", "mp3", "ogg", "unknown", "wav"]),
  containerConfidence: z.number(),
  sniffReason: z.string(),
  probablePartial: z.boolean(),
});

const audioWarningSchema = z.object({
  code: z.string(),
  title: z.string(),
  message: z.string(),
  why: z.string(),
  nextStep: z.string(),
  severity: z.enum(["error", "info", "warning"]),
  confidence: z.number(),
});

const audioFactSchema = z.object({
  label: z.string(),
  value: z.string(),
  confidence: z.number(),
  explanation: z.string(),
});

const suggestedExportSchema = z.object({
  seconds: z.number().int(),
  fps: z.number().int(),
  width: z.number().int(),
  height: z.number().int(),
  frameCount: z.number().int(),
  reason: z.string(),
});

const audioInsightSchema = z.object({
  profile: z.enum(["clip", "long_track", "partial", "silent", "song"]),
  profileLabel: z.string(),
  confidence: z.number(),
  summary: z.string(),
  facts: z.array(audioFactSchema),
  warnings: z.array(audioWarningSchema),
  suggestedExport: suggestedExportSchema,
});

const exportProvenanceSchema = z.object({
  schemaVersion: z.literal(1),
  app: z.object({
    name: z.string(),
    version: z.string(),
    commit: z.string(),
  }),
  source: z.object({
    id: z.string(),
    fileName: z.string(),
    fingerprint: z.string(),
    container: z.string(),
    size: z.number(),
  }),
  analysis: z.object({
    duration: z.number(),
    sampleRate: z.number(),
    channelCount: z.number(),
    profile: z.string(),
    confidence: z.number(),
    warningCodes: z.array(z.string()),
  }),
  settings: z.object({
    exportDuration: z.number(),
    exportFps: z.number(),
    exportWidth: z.number(),
    exportHeight: z.number(),
    preset: z.string(),
    intensity: z.number(),
    colorShift: z.number(),
    bloom: z.number(),
    smoothing: z.number(),
  }),
});

const persistedSessionSchema = z.object({
  schemaVersion: z.literal(1),
  savedAt: z.string(),
  settings: visualSettingsSchema,
  playhead: z.number().nonnegative(),
  sessionLog: z.array(sessionEventSchema).max(12),
  lastProvenance: exportProvenanceSchema.nullable(),
  project: z
    .object({
      id: z.string(),
      name: z.string(),
      mimeType: z.string(),
      size: z.number().nonnegative(),
      analysis: audioAnalysisSchema,
      source: audioSourceSchema,
      insight: audioInsightSchema,
      fromCache: z.boolean().optional(),
    })
    .nullable(),
});

const portableProjectSchema = persistedSessionSchema.shape.project
  .unwrap()
  .extend({
    file: z.object({
      name: z.string(),
      type: z.string(),
      lastModified: z.number().int(),
      dataBase64: z.string(),
    }),
  });

const portableSessionSchema = persistedSessionSchema.extend({
  appVersion: z.string(),
  project: portableProjectSchema.nullable(),
});

const persistedSessionWithFileSchema = persistedSessionSchema.extend({
  project: persistedSessionSchema.shape.project
    .unwrap()
    .extend({
      file: z.custom<File>((value) => value instanceof File).nullable(),
    })
    .nullable(),
});

type PersistedSession = z.infer<typeof persistedSessionSchema>;
type PortableSession = z.infer<typeof portableSessionSchema>;
type PersistedSessionWithFile = z.infer<typeof persistedSessionWithFileSchema>;

const dbName = "shaderwave-studio";
const storeName = "session";
const sessionKey = "current";
const portableStatePrefix = "shaderwave-state:";
const maxShareLength = 180_000;

export async function saveSessionSnapshot(
  snapshot: SessionSnapshot,
): Promise<void> {
  const db = await sessionDb();
  const value = buildPersistedSession(snapshot);
  await db.put(
    storeName,
    {
      ...value,
      project: value.project
        ? {
            ...value.project,
            file: snapshot.project?.file ?? null,
          }
        : null,
    },
    sessionKey,
  );
}

export async function loadSessionSnapshot(): Promise<SessionSnapshot | null> {
  const db = await sessionDb();
  const raw = await db.get(storeName, sessionKey);
  if (!raw) {
    return null;
  }

  const parsed = persistedSessionWithFileSchema.parse(raw);

  return restorePersistedSession(parsed);
}

export async function clearSessionSnapshot(): Promise<void> {
  const db = await sessionDb();
  await db.delete(storeName, sessionKey);
}

export async function serializePortableSession(
  snapshot: SessionSnapshot,
  appVersion: string,
): Promise<string> {
  const value = buildPersistedSession(snapshot);

  const portable: PortableSession = {
    ...value,
    appVersion,
    project: snapshot.project
      ? {
          ...value.project!,
          file: {
            name: snapshot.project.file.name,
            type: snapshot.project.file.type,
            lastModified: snapshot.project.file.lastModified,
            dataBase64: bytesToBase64(
              new Uint8Array(await snapshot.project.file.arrayBuffer()),
            ),
          },
        }
      : null,
  };

  return `${stableStringify(portable)}\n`;
}

export async function deserializePortableSession(
  text: string,
): Promise<SessionSnapshot> {
  const payload = extractPortablePayload(text);
  const raw = payload.startsWith("{")
    ? payload
    : await decodeCompressedPortableState(payload);
  const parsed = portableSessionSchema.parse(JSON.parse(raw));

  return restorePortableSession(parsed);
}

export async function createPortableStateUrl(
  snapshot: SessionSnapshot,
  appVersion: string,
): Promise<string | null> {
  const json = await serializePortableSession(snapshot, appVersion);
  const compressed = await encodeCompressedPortableState(json);
  if (compressed.length > maxShareLength) {
    return null;
  }

  const url = new URL(window.location.href);
  url.hash = `state=${compressed}`;
  return url.toString();
}

export async function sessionSnapshotFromHash(): Promise<SessionSnapshot | null> {
  const hash = new URL(window.location.href).hash;
  if (!hash.startsWith("#state=")) {
    return null;
  }

  const payload = hash.slice("#state=".length);
  return deserializePortableSession(payload);
}

export function extractPortablePayload(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  if (trimmed.startsWith(portableStatePrefix)) {
    return trimmed.slice(portableStatePrefix.length);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    if (url.hash.startsWith("#state=")) {
      return url.hash.slice("#state=".length);
    }
  }

  return trimmed;
}

export function createDownloadBlob(text: string): Blob {
  return new Blob([text], { type: "application/json" });
}

function buildPersistedSession(snapshot: SessionSnapshot): PersistedSession {
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    settings: visualSettingsSchema.parse(snapshot.settings),
    playhead: snapshot.playhead,
    sessionLog: snapshot.sessionLog.slice(0, 12),
    lastProvenance: snapshot.lastProvenance,
    project: snapshot.project
      ? {
          id: snapshot.project.id,
          name: snapshot.project.name,
          mimeType: snapshot.project.mimeType,
          size: snapshot.project.size,
          analysis: snapshot.project.analysis,
          source: snapshot.project.source,
          insight: snapshot.project.insight,
          fromCache: snapshot.project.fromCache ?? false,
        }
      : null,
  };
}

function restorePersistedSession(
  session: PersistedSessionWithFile,
): SessionSnapshot {
  const project =
    session.project && session.project.file
      ? restoreProject({
          ...session.project,
          file: session.project.file,
        })
      : null;

  return {
    settings: session.settings,
    project,
    sessionLog: session.sessionLog,
    lastProvenance: session.lastProvenance,
    playhead: session.playhead,
  };
}

async function restorePortableSession(
  session: PortableSession,
): Promise<SessionSnapshot> {
  return {
    settings: session.settings,
    project: session.project
      ? restoreProject({
          ...session.project,
          file: new File(
            [toArrayBuffer(base64ToBytes(session.project.file.dataBase64))],
            session.project.file.name,
            {
              type: session.project.file.type,
              lastModified: session.project.file.lastModified,
            },
          ),
        })
      : null,
    sessionLog: session.sessionLog,
    lastProvenance: session.lastProvenance,
    playhead: session.playhead,
  };
}

function restoreProject(
  project: NonNullable<PersistedSession["project"]> & { file: File },
): AudioProject {
  return {
    id: project.id,
    name: project.name,
    mimeType: project.mimeType,
    size: project.size,
    url: URL.createObjectURL(project.file),
    file: project.file,
    analysis: project.analysis,
    source: project.source,
    insight: project.insight,
    fromCache: project.fromCache,
  };
}

async function sessionDb() {
  return openDB(dbName, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    },
  });
}

async function encodeCompressedPortableState(text: string): Promise<string> {
  if (typeof CompressionStream === "undefined") {
    return bytesToBase64Url(new TextEncoder().encode(text));
  }

  const stream = new CompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(new TextEncoder().encode(text));
  await writer.close();

  const buffer = await new Response(stream.readable).arrayBuffer();
  return bytesToBase64Url(new Uint8Array(buffer));
}

async function decodeCompressedPortableState(payload: string): Promise<string> {
  const bytes = base64UrlToBytes(payload);
  if (typeof DecompressionStream === "undefined") {
    return new TextDecoder().decode(bytes);
  }

  const stream = new DecompressionStream("gzip");
  const writer = stream.writable.getWriter();
  await writer.write(toArrayBuffer(bytes));
  await writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new TextDecoder().decode(buffer);
}

function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.slice(index, index + chunkSize);
    result += String.fromCharCode(...chunk);
  }
  return btoa(result);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  return base64ToBytes(normalized);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}
