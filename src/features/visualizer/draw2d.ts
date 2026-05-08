import type { VisualSettings } from "../project/settings";

export interface DrawFrameOptions {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
  bands: number[];
  time: number;
  settings: VisualSettings;
}

export function drawShaderFrame2d({
  context,
  width,
  height,
  bands,
  time,
  settings,
}: DrawFrameOptions) {
  const bass = average(bands, 0, 4);
  const mid = average(bands, 4, 11);
  const treble = average(bands, 11, bands.length);
  const intensity = settings.intensity;
  const hueBase = (190 + settings.colorShift * 170 + time * 12) % 360;

  context.clearRect(0, 0, width, height);

  const bg = context.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#07111f");
  bg.addColorStop(0.45, "#101827");
  bg.addColorStop(1, "#172033");
  context.fillStyle = bg;
  context.fillRect(0, 0, width, height);

  if (settings.preset === "bars") {
    drawBars(context, width, height, bands, hueBase, intensity);
  } else if (settings.preset === "tunnel") {
    drawTunnel(context, width, height, bands, time, hueBase, intensity);
  } else {
    drawPrism(context, width, height, bands, time, hueBase, intensity);
  }

  context.globalCompositeOperation = "screen";
  const glow = context.createRadialGradient(
    width * 0.5,
    height * 0.52,
    0,
    width * 0.5,
    height * 0.52,
    Math.max(width, height) * 0.72,
  );
  glow.addColorStop(
    0,
    `hsla(${(hueBase + 80) % 360}, 94%, 62%, ${0.13 + bass * 0.25})`,
  );
  glow.addColorStop(
    0.45,
    `hsla(${(hueBase + 190) % 360}, 88%, 55%, ${0.06 + mid * 0.16})`,
  );
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";

  drawVignette(context, width, height, settings.bloom + treble * 0.35);
}

function drawBars(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bands: number[],
  hueBase: number,
  intensity: number,
) {
  const gap = width * 0.006;
  const barWidth = (width - gap * (bands.length + 1)) / bands.length;

  bands.forEach((band, index) => {
    const x = gap + index * (barWidth + gap);
    const barHeight = Math.max(
      6,
      Math.pow(band, 0.74) * height * 0.86 * intensity,
    );
    const y = height - barHeight;
    const hue = (hueBase + index * 18) % 360;
    const gradient = context.createLinearGradient(0, y, 0, height);

    gradient.addColorStop(0, `hsl(${hue}, 96%, 68%)`);
    gradient.addColorStop(0.55, `hsl(${(hue + 60) % 360}, 92%, 55%)`);
    gradient.addColorStop(1, `hsl(${(hue + 170) % 360}, 90%, 45%)`);
    context.fillStyle = gradient;
    context.fillRect(x, y, barWidth, barHeight);
  });
}

function drawTunnel(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bands: number[],
  time: number,
  hueBase: number,
  intensity: number,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const bass = average(bands, 0, 4);

  context.lineWidth = Math.max(1, width * 0.004);

  for (let ring = 0; ring < 34; ring += 1) {
    const band = bands[ring % bands.length];
    const radius =
      ((ring + 1) / 34) * Math.max(width, height) * (0.62 + bass * 0.22);
    const wobble = Math.sin(time * 1.7 + ring * 0.5) * band * 18 * intensity;

    context.beginPath();
    context.ellipse(
      centerX,
      centerY,
      radius + wobble,
      radius * 0.58 - wobble,
      time * 0.12,
      0,
      Math.PI * 2,
    );
    context.strokeStyle = `hsla(${(hueBase + ring * 10) % 360}, 94%, ${
      58 + band * 22
    }%, ${0.05 + band * 0.32})`;
    context.stroke();
  }
}

function drawPrism(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bands: number[],
  time: number,
  hueBase: number,
  intensity: number,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const points = 96;
  const bass = average(bands, 0, 4);

  for (let layer = 0; layer < 5; layer += 1) {
    context.beginPath();
    for (let index = 0; index <= points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const band = bands[(index + layer * 3) % bands.length];
      const radius =
        Math.min(width, height) *
        (0.16 +
          layer * 0.065 +
          bass * 0.08 +
          Math.sin(angle * 5 + time * 1.8) * 0.02);
      const reactive =
        radius + band * Math.min(width, height) * 0.24 * intensity;
      const x = centerX + Math.cos(angle) * reactive;
      const y = centerY + Math.sin(angle) * reactive;

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }

    context.closePath();
    context.strokeStyle = `hsla(${(hueBase + layer * 44) % 360}, 95%, ${
      62 - layer * 4
    }%, ${0.24 - layer * 0.025})`;
    context.lineWidth = Math.max(1, width * (0.006 - layer * 0.0007));
    context.stroke();
  }
}

function drawVignette(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
) {
  const gradient = context.createRadialGradient(
    width * 0.5,
    height * 0.5,
    Math.min(width, height) * 0.2,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.75,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(0, 0, 0, ${0.42 + amount * 0.2})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function average(values: number[], start: number, end: number): number {
  const slice = values.slice(start, end);
  if (slice.length === 0) {
    return 0;
  }

  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}
