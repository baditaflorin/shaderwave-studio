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

fn palette(t: f32) -> vec3f {
  let a = vec3f(0.45, 0.50, 0.56);
  let b = vec3f(0.47, 0.34, 0.30);
  let c = vec3f(1.0, 1.0, 1.0);
  let d = vec3f(0.0 + u.colorShift, 0.28 + u.colorShift * 0.4, 0.58 + u.colorShift * 0.3);
  return a + b * cos(6.28318 * (c * t + d));
}

fn bandAverage(start: i32, end: i32) -> f32 {
  var sum = 0.0;
  for (var i = start; i < end; i = i + 1) {
    sum = sum + u.bands[i];
  }
  return sum / f32(end - start);
}

@fragment
fn fragmentMain(@builtin(position) frag: vec4f) -> @location(0) vec4f {
  var uv = (frag.xy / u.resolution) * 2.0 - vec2f(1.0, 1.0);
  uv.x = uv.x * (u.resolution.x / u.resolution.y);

  let bass = bandAverage(0, 4);
  let mid = bandAverage(4, 11);
  let treble = bandAverage(11, 16);
  let distance = length(uv);
  let angle = atan2(uv.y, uv.x);
  let pulse = sin(distance * 18.0 - u.time * (2.0 + bass * 4.0)) * 0.5 + 0.5;
  let spokes = sin(angle * (5.0 + treble * 12.0) + u.time * (0.9 + mid * 3.0)) * 0.5 + 0.5;
  let bars = pow(abs(sin((uv.x + 1.4) * 12.0 + u.time * 1.2)), 12.0) * (0.2 + mid);
  let tunnel = pow(1.0 - smoothstep(0.05, 1.35, distance), 1.8) + pulse * spokes * (0.2 + bass);
  let prism = smoothstep(0.52 + bass * 0.18, 0.06, abs(distance - (0.34 + pulse * 0.18))) + spokes * treble;

  var energy = prism;
  if (u.preset > 0.5 && u.preset < 1.5) {
    energy = bars + pow(1.0 - abs(uv.y), 4.0) * bass;
  }
  if (u.preset >= 1.5) {
    energy = tunnel;
  }

  let color = palette(energy + angle * 0.08 + u.time * 0.035) * (0.16 + energy * u.intensity * 1.65);
  let glow = vec3f(0.08, 0.20, 0.32) * (u.bloom + bass * 1.2);
  let vignette = smoothstep(1.55, 0.25, distance);
  return vec4f(pow((color + glow) * vignette, vec3f(0.82)), 1.0);
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
          clearValue: { r: 0.02, g: 0.04, b: 0.07, a: 1 },
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
