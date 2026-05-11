import { describe, expect, it } from "vitest";

import { shaderPresetSchema, type ShaderPreset } from "../project/settings";
import { drawShaderFrame2d } from "./draw2d";
import { presetAt, presetCount, presetIndex, presetLabels } from "./presets";

const allPresets = shaderPresetSchema.options;

describe("visualizer presets", () => {
  it("ships at least seven distinct presets", () => {
    expect(allPresets.length).toBeGreaterThanOrEqual(7);
    expect(new Set(allPresets).size).toBe(allPresets.length);
  });

  it("labels every preset", () => {
    for (const preset of allPresets) {
      expect(presetLabels[preset]).toBeTruthy();
    }
  });

  it("indexes round-trip for each preset", () => {
    for (const preset of allPresets) {
      const index = presetIndex(preset);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(presetCount);
      expect(presetAt(index)).toBe(preset);
    }
  });

  it("each preset draws on a fake 2D context without throwing", () => {
    const calls: string[] = [];
    const fakeContext = createFake2dContext(calls);
    const bands = Array.from({ length: 16 }, (_, index) =>
      Math.abs(Math.sin(index * 0.42)),
    );

    for (const preset of allPresets) {
      calls.length = 0;
      drawShaderFrame2d({
        context: fakeContext as unknown as CanvasRenderingContext2D,
        width: 640,
        height: 360,
        bands,
        time: 1.2,
        settings: {
          preset,
          intensity: 1.2,
          colorShift: 0.4,
          bloom: 0.6,
          smoothing: 0.5,
          exportDuration: 6,
          exportFps: 24,
          exportWidth: 640,
          exportHeight: 360,
        },
      });

      expect(calls).toContain("clearRect");
      expect(calls.some((call) => call === "fill" || call === "stroke")).toBe(
        true,
      );
    }
  });

  it("draws different paths for visually distinct presets", () => {
    const aCalls = recordDrawCalls("prism");
    const bCalls = recordDrawCalls("kaleidoscope");
    const cCalls = recordDrawCalls("starfield");

    expect(aCalls.join("|")).not.toEqual(bCalls.join("|"));
    expect(bCalls.join("|")).not.toEqual(cCalls.join("|"));
  });
});

function recordDrawCalls(preset: ShaderPreset): string[] {
  const calls: string[] = [];
  const fakeContext = createFake2dContext(calls);
  const bands = Array.from({ length: 16 }, (_, index) =>
    Math.abs(Math.cos(index * 0.3)),
  );
  drawShaderFrame2d({
    context: fakeContext as unknown as CanvasRenderingContext2D,
    width: 320,
    height: 180,
    bands,
    time: 2.4,
    settings: {
      preset,
      intensity: 1.0,
      colorShift: 0.5,
      bloom: 0.5,
      smoothing: 0.5,
      exportDuration: 6,
      exportFps: 24,
      exportWidth: 320,
      exportHeight: 180,
    },
  });
  return calls;
}

function createFake2dContext(calls: string[]): Record<string, unknown> {
  let fillStyle: string | CanvasGradient = "#000";
  let strokeStyle: string | CanvasGradient = "#000";
  let lineWidth = 1;
  let globalCompositeOperation = "source-over";

  const record = (label: string) => () => {
    calls.push(label);
  };

  const recordGradient = (label: string) => () => {
    calls.push(label);
    return {
      addColorStop: () => {
        calls.push(`${label}.addColorStop`);
      },
    };
  };

  return {
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(value: string | CanvasGradient) {
      fillStyle = value;
    },
    get strokeStyle() {
      return strokeStyle;
    },
    set strokeStyle(value: string | CanvasGradient) {
      strokeStyle = value;
    },
    get lineWidth() {
      return lineWidth;
    },
    set lineWidth(value: number) {
      lineWidth = value;
    },
    get globalCompositeOperation() {
      return globalCompositeOperation;
    },
    set globalCompositeOperation(value: string) {
      globalCompositeOperation = value;
    },
    save: record("save"),
    restore: record("restore"),
    translate: record("translate"),
    rotate: record("rotate"),
    scale: record("scale"),
    clip: record("clip"),
    beginPath: record("beginPath"),
    closePath: record("closePath"),
    moveTo: record("moveTo"),
    lineTo: record("lineTo"),
    arc: record("arc"),
    rect: record("rect"),
    roundRect: record("roundRect"),
    fill: record("fill"),
    stroke: record("stroke"),
    clearRect: record("clearRect"),
    fillRect: record("fillRect"),
    createLinearGradient: recordGradient("createLinearGradient"),
    createRadialGradient: recordGradient("createRadialGradient"),
  };
}
