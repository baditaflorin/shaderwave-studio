import { z } from "zod";

export const shaderPresetSchema = z.enum([
  "prism",
  "bars",
  "tunnel",
  "kaleidoscope",
  "starfield",
  "lattice",
  "aurora",
]);

export type ShaderPreset = z.infer<typeof shaderPresetSchema>;

export const visualSettingsSchema = z.object({
  preset: shaderPresetSchema,
  intensity: z.number().min(0.25).max(2.5),
  colorShift: z.number().min(0).max(1),
  bloom: z.number().min(0).max(1.5),
  smoothing: z.number().min(0).max(0.96),
  exportDuration: z.number().min(2).max(45),
  exportFps: z.number().int().min(12).max(30),
  exportWidth: z.number().int().min(480).max(1920),
  exportHeight: z.number().int().min(270).max(1080),
});

export type VisualSettings = z.infer<typeof visualSettingsSchema>;

export const defaultVisualSettings: VisualSettings = {
  preset: "prism",
  intensity: 1.1,
  colorShift: 0.42,
  bloom: 0.68,
  smoothing: 0.72,
  exportDuration: 8,
  exportFps: 18,
  exportWidth: 960,
  exportHeight: 540,
};

const storageKey = "shaderwave-studio:settings:v1";

export function loadVisualSettings(): VisualSettings {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaultVisualSettings;
    }

    return visualSettingsSchema.parse({
      ...defaultVisualSettings,
      ...JSON.parse(raw),
    });
  } catch {
    return defaultVisualSettings;
  }
}

export function saveVisualSettings(settings: VisualSettings) {
  window.localStorage.setItem(
    storageKey,
    JSON.stringify(visualSettingsSchema.parse(settings)),
  );
}
