import type { VisualSettings } from "../project/settings";
import { presetIndex } from "./presets";

const shaderCode = `
struct Uniforms {
  resolution: vec2f,
  time: f32,
  intensity: f32,
  bands: array<f32, 16>,
  colorShift: f32,
  bloom: f32,
  preset: f32,
  pad: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  var positions = array<vec2f, 3>(
    vec2f(-1.0, -3.0),
    vec2f(3.0, 1.0),
    vec2f(-1.0, 1.0)
  );
  return vec4f(positions[index], 0.0, 1.0);
}

fn saturate(value: f32) -> f32 {
  return clamp(value, 0.0, 1.0);
}

fn rotate(v: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(v.x * c - v.y * s, v.x * s + v.y * c);
}

fn palette(t: f32) -> vec3f {
  let a = vec3f(0.14, 0.18, 0.24);
  let b = vec3f(0.56, 0.42, 0.38);
  let c = vec3f(1.0, 1.0, 1.0);
  let d = vec3f(0.02 + u.colorShift * 0.25, 0.18 + u.colorShift * 0.32, 0.57 + u.colorShift * 0.18);
  return a + b * cos(6.28318 * (c * t + d));
}

fn bandAverage(start: i32, end: i32) -> f32 {
  var sum = 0.0;
  for (var i = start; i < end; i = i + 1) {
    sum = sum + u.bands[i];
  }
  return sum / f32(end - start);
}

fn barsField(uv: vec2f, bass: f32, mid: f32, treble: f32) -> f32 {
  let x = uv.x * 0.5 + 0.5;
  let mirroredY = 1.0 - abs(uv.y);
  let stripes = floor(x * 16.0);
  let bandIndex = clamp(i32(stripes), 0, 15);
  let band = u.bands[bandIndex];
  let laneX = fract(x * 16.0) - 0.5;
  let barWidth = 0.22 + band * 0.1;
  let bar = smoothstep(barWidth, 0.02, abs(laneX));
  let envelope = smoothstep(0.0, 0.18 + band * 0.78 * u.intensity, mirroredY);
  let flare = exp(-22.0 * abs(mirroredY - (0.2 + band * 0.45))) * (0.4 + treble * 0.8);
  let floorGlow = smoothstep(0.65, -0.2, uv.y) * (0.08 + bass * 0.24);
  return bar * envelope + flare + floorGlow;
}

fn tunnelField(uv: vec2f, bass: f32, mid: f32, treble: f32) -> f32 {
  let rotated = rotate(uv, u.time * 0.09 + mid * 0.2);
  let angle = atan2(rotated.y, rotated.x);
  let dist = length(rotated);
  let radial = sin(dist * (28.0 - bass * 8.0) - u.time * (2.8 + bass * 4.4));
  let spokes = sin(angle * (9.0 + treble * 14.0) + u.time * (1.4 + mid * 2.4));
  let shell = pow(1.0 - smoothstep(0.08, 1.28, dist), 1.85);
  let ring = smoothstep(0.16 + bass * 0.12, 0.01, abs(dist - (0.34 + radial * 0.04)));
  return shell * (0.42 + radial * 0.24 + spokes * 0.16) + ring * (0.6 + treble);
}

fn prismField(uv: vec2f, bass: f32, mid: f32, treble: f32) -> f32 {
  let rotated = rotate(uv, u.time * 0.06);
  let angle = atan2(rotated.y, rotated.x);
  let dist = length(rotated);
  let petals = sin(angle * 6.0 + u.time * (1.0 + mid * 1.8));
  let orbit = cos(angle * 3.0 - u.time * (0.8 + bass * 1.2));
  let lattice = sin((rotated.x + rotated.y) * 14.0 + u.time * 1.6);
  let shell = smoothstep(0.78 + bass * 0.12, 0.04, abs(dist - (0.26 + petals * 0.12 + orbit * 0.05)));
  let core = pow(1.0 - smoothstep(0.02, 0.58, dist), 2.8);
  return shell * (0.7 + treble * 0.7) + core * (0.42 + lattice * 0.2);
}

@fragment
fn fragmentMain(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  var uv = (frag.xy / u.resolution) * 2.0 - vec2f(1.0, 1.0);
  uv.x = uv.x * (u.resolution.x / u.resolution.y);

  let bass = bandAverage(0, 4);
  let mid = bandAverage(4, 11);
  let treble = bandAverage(11, 16);
  let dist = length(uv);
  let angle = atan2(uv.y, uv.x);

  var energy = prismField(uv, bass, mid, treble);
  if (u.preset > 0.5 && u.preset < 1.5) {
    energy = barsField(uv, bass, mid, treble);
  }
  if (u.preset >= 1.5) {
    energy = tunnelField(uv, bass, mid, treble);
  }

  let backdrop = vec3f(0.01, 0.02, 0.04)
    + palette(0.08 + uv.y * 0.06 + u.time * 0.02) * 0.14
    + palette(0.34 - uv.x * 0.04 - u.time * 0.015) * 0.08;

  let accent = palette(energy * 0.24 + angle * 0.04 + u.time * 0.028);
  let streaks = palette(angle * 0.07 - dist * 0.08 + u.time * 0.014) * (0.08 + treble * 0.12);
  let glow = vec3f(0.12, 0.18, 0.26) * (u.bloom * 0.58 + bass * 0.42)
    + accent * energy * (0.62 + u.intensity * 0.88)
    + streaks;
  let vignette = smoothstep(1.65, 0.18, dist);
  let grain = fract(sin(dot(frag.xy, vec2f(12.9898, 78.233))) * 43758.5453);
  let grainMix = (grain - 0.5) * 0.028;
  let color = backdrop + glow;
  color = mix(color, accent, saturate(energy * 0.34));
  color = color * vignette + grainMix;
  color = pow(max(color, vec3f(0.0)), vec3f(0.84));
  return vec4f(color, 1.0);
}
`;

export interface RenderFrame {
  width: number;
  height: number;
  time: number;
  bands: number[];
  settings: VisualSettings;
}

export class WebGpuVisualizerRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly device: GPUDevice;
  private readonly context: GPUCanvasContext;
  private readonly format: GPUTextureFormat;
  private readonly pipeline: GPURenderPipeline;
  private readonly bindGroup: GPUBindGroup;
  private readonly uniformBuffer: GPUBuffer;

  private constructor(
    canvas: HTMLCanvasElement,
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat,
    pipeline: GPURenderPipeline,
    bindGroup: GPUBindGroup,
    uniformBuffer: GPUBuffer,
  ) {
    this.canvas = canvas;
    this.device = device;
    this.context = context;
    this.format = format;
    this.pipeline = pipeline;
    this.bindGroup = bindGroup;
    this.uniformBuffer = uniformBuffer;
  }

  static async create(
    canvas: HTMLCanvasElement,
  ): Promise<WebGpuVisualizerRenderer> {
    if (!navigator.gpu) {
      throw new Error("WebGPU is not available in this browser.");
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("No WebGPU adapter was found.");
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("WebGPU canvas context could not be created.");
    }

    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: "opaque",
    });

    const module = device.createShaderModule({ code: shaderCode });
    const uniformBuffer = device.createBuffer({
      size: 24 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
      ],
    });
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      vertex: {
        module,
        entryPoint: "vertexMain",
      },
      fragment: {
        module,
        entryPoint: "fragmentMain",
        targets: [{ format }],
      },
      primitive: {
        topology: "triangle-list",
      },
    });
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
      ],
    });

    return new WebGpuVisualizerRenderer(
      canvas,
      device,
      context,
      format,
      pipeline,
      bindGroup,
      uniformBuffer,
    );
  }

  render(frame: RenderFrame) {
    this.resize(frame.width, frame.height);

    const uniform = new Float32Array(24);
    uniform[0] = this.canvas.width;
    uniform[1] = this.canvas.height;
    uniform[2] = frame.time;
    uniform[3] = frame.settings.intensity;

    for (let index = 0; index < 16; index += 1) {
      uniform[4 + index] = frame.bands[index] ?? 0;
    }

    uniform[20] = frame.settings.colorShift;
    uniform[21] = frame.settings.bloom;
    uniform[22] = presetIndex(frame.settings.preset);
    uniform[23] = 0;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniform);

    const encoder = this.device.createCommandEncoder();
    const view = this.context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          clearValue: { r: 0.01, g: 0.015, b: 0.03, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(3);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  dispose() {
    this.uniformBuffer.destroy();
  }

  private resize(width: number, height: number) {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const nextWidth = Math.max(2, Math.floor(width * pixelRatio));
    const nextHeight = Math.max(2, Math.floor(height * pixelRatio));

    if (this.canvas.width !== nextWidth || this.canvas.height !== nextHeight) {
      this.canvas.width = nextWidth;
      this.canvas.height = nextHeight;
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: "opaque",
      });
    }
  }
}
