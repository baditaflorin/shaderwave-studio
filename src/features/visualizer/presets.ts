import type { ShaderPreset } from "../project/settings";

export const presetLabels: Record<ShaderPreset, string> = {
  prism: "Prism field",
  bars: "Spectral bars",
  tunnel: "Phase tunnel",
  kaleidoscope: "Kaleidoscope",
  starfield: "Starfield",
  lattice: "Lattice grid",
  aurora: "Aurora bands",
};

const presetOrder: ShaderPreset[] = [
  "prism",
  "bars",
  "tunnel",
  "kaleidoscope",
  "starfield",
  "lattice",
  "aurora",
];

export function presetIndex(preset: ShaderPreset): number {
  const index = presetOrder.indexOf(preset);
  return index === -1 ? 0 : index;
}

export function presetAt(index: number): ShaderPreset {
  return presetOrder[index] ?? presetOrder[0];
}

export const presetCount = presetOrder.length;
