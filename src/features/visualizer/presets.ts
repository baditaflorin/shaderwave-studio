import type { ShaderPreset } from "../project/settings";

export const presetLabels: Record<ShaderPreset, string> = {
  prism: "Prism field",
  bars: "Spectral bars",
  tunnel: "Phase tunnel",
};

export function presetIndex(preset: ShaderPreset): number {
  return preset === "prism" ? 0 : preset === "bars" ? 1 : 2;
}
