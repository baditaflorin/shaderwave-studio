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
  const hueBase = (212 + settings.colorShift * 130 + time * 7) % 360;
  const intensity = settings.intensity;

  context.clearRect(0, 0, width, height);

  drawBackdrop(context, width, height, hueBase, bass, mid, treble);

  if (settings.preset === "bars") {
    drawClubColumns(context, width, height, bands, hueBase, intensity, time);
  } else if (settings.preset === "tunnel") {
    drawPhaseTunnel(context, width, height, bands, hueBase, intensity, time);
  } else {
    drawPrismField(context, width, height, bands, hueBase, intensity, time);
  }

  drawWaveCrest(context, width, height, bands, hueBase, intensity, time);
  drawHighlightBloom(
    context,
    width,
    height,
    hueBase,
    bass,
    mid,
    treble,
    settings.bloom,
  );
  drawVignette(context, width, height, 0.42 + settings.bloom * 0.16);
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hueBase: number,
  bass: number,
  mid: number,
  treble: number,
) {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `hsl(${(hueBase + 18) % 360}, 46%, 8%)`);
  gradient.addColorStop(0.45, `hsl(${(hueBase + 72) % 360}, 36%, 12%)`);
  gradient.addColorStop(1, `hsl(${(hueBase + 140) % 360}, 38%, 7%)`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const halo = context.createRadialGradient(
    width * 0.5,
    height * 0.46,
    0,
    width * 0.5,
    height * 0.46,
    Math.max(width, height) * 0.78,
  );
  halo.addColorStop(
    0,
    `hsla(${(hueBase + 180) % 360}, 95%, 62%, ${0.08 + bass * 0.16})`,
  );
  halo.addColorStop(
    0.35,
    `hsla(${(hueBase + 70) % 360}, 88%, 54%, ${0.06 + mid * 0.12})`,
  );
  halo.addColorStop(
    0.75,
    `hsla(${(hueBase + 280) % 360}, 82%, 48%, ${0.03 + treble * 0.08})`,
  );
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = halo;
  context.fillRect(0, 0, width, height);
}

function drawClubColumns(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bands: number[],
  hueBase: number,
  intensity: number,
  time: number,
) {
  const centerY = height * 0.58;
  const gap = width * 0.008;
  const barWidth = (width - gap * (bands.length + 1)) / bands.length;
  const maxHeight = height * 0.34;

  saveContext(context);
  context.globalCompositeOperation = "lighter";

  bands.forEach((band, index) => {
    const normalized = Math.pow(Math.max(0.02, band), 0.82) * intensity;
    const x = gap + index * (barWidth + gap);
    const barHeight = Math.max(10, normalized * maxHeight);
    const hue = (hueBase + index * 11 + time * 18) % 360;
    const pulse = 0.92 + Math.sin(time * 3.2 + index * 0.55) * 0.08;

    const gradient = context.createLinearGradient(
      0,
      centerY - barHeight,
      0,
      centerY + barHeight,
    );
    gradient.addColorStop(0, `hsla(${(hue + 25) % 360}, 96%, 72%, 0.96)`);
    gradient.addColorStop(0.4, `hsla(${hue}, 95%, 58%, 0.88)`);
    gradient.addColorStop(1, `hsla(${(hue + 140) % 360}, 90%, 42%, 0.16)`);

    context.fillStyle = gradient;
    roundRectFill(
      context,
      x,
      centerY - barHeight * pulse,
      barWidth,
      barHeight * 2 * pulse,
      barWidth * 0.34,
    );

    context.fillStyle = `hsla(${(hue + 8) % 360}, 100%, 88%, ${0.2 + band * 0.22})`;
    roundRectFill(
      context,
      x + barWidth * 0.22,
      centerY - barHeight * 0.72,
      barWidth * 0.18,
      barHeight * 1.44,
      barWidth * 0.12,
    );
  });

  restoreContext(context);
  drawFloorReflection(context, width, height, hueBase, intensity);
}

function drawPhaseTunnel(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bands: number[],
  hueBase: number,
  intensity: number,
  time: number,
) {
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const extent = Math.max(width, height);

  saveContext(context);
  context.globalCompositeOperation = "screen";

  for (let ring = 0; ring < 18; ring += 1) {
    const progress = ring / 18;
    const band = bands[ring % bands.length] ?? 0;
    const baseRadius = extent * (0.08 + progress * 0.38);
    const wobble =
      Math.sin(time * 1.9 + ring * 0.48) * band * extent * 0.018 * intensity;
    const twist = time * 0.15 + ring * 0.2;

    context.beginPath();
    for (let step = 0; step <= 80; step += 1) {
      const angle = (step / 80) * Math.PI * 2;
      const ripple =
        Math.sin(angle * 6 + time * 2.4 + ring) * band * extent * 0.006;
      const radius = baseRadius + wobble + ripple;
      const x = centerX + Math.cos(angle + twist) * radius;
      const y = centerY + Math.sin(angle - twist * 0.6) * radius * 0.7;
      if (step === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.strokeStyle = `hsla(${(hueBase + ring * 15) % 360}, 95%, ${62 - progress * 24}%, ${0.18 + band * 0.22})`;
    context.lineWidth = Math.max(1.2, width * (0.0048 - progress * 0.0024));
    strokePath(context);
  }

  restoreContext(context);
}

function drawPrismField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bands: number[],
  hueBase: number,
  intensity: number,
  time: number,
) {
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const minDimension = Math.min(width, height);
  const bass = average(bands, 0, 4);

  saveContext(context);
  context.globalCompositeOperation = "lighter";

  for (let layer = 0; layer < 5; layer += 1) {
    const points = 72 + layer * 12;
    const layerScale = 0.18 + layer * 0.085;

    context.beginPath();
    for (let index = 0; index <= points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const band = bands[(index + layer * 2) % bands.length] ?? 0;
      const petal =
        1 + Math.sin(angle * (3 + layer) + time * (1.6 + layer * 0.18)) * 0.11;
      const orbit = Math.sin(angle * 8 - time * 2.4 + layer) * 0.03;
      const radius =
        minDimension *
        (layerScale +
          petal * 0.03 +
          orbit +
          band * 0.12 * intensity +
          bass * 0.04);
      const x = centerX + Math.cos(angle + time * 0.12) * radius;
      const y =
        centerY +
        Math.sin(angle - time * 0.08) * radius * (0.82 + layer * 0.02);

      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();

    const hue = (hueBase + layer * 36) % 360;
    context.strokeStyle = `hsla(${hue}, 92%, ${72 - layer * 6}%, ${0.28 - layer * 0.035})`;
    context.lineWidth = Math.max(1.4, width * (0.006 - layer * 0.0008));
    strokePath(context);
  }

  restoreContext(context);
}

function drawWaveCrest(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bands: number[],
  hueBase: number,
  intensity: number,
  time: number,
) {
  const baseline = height * 0.79;
  const step = width / Math.max(1, bands.length - 1);

  saveContext(context);
  context.beginPath();
  context.moveTo(0, height);
  context.lineTo(0, baseline);

  bands.forEach((band, index) => {
    const x = index * step;
    const y =
      baseline -
      Math.pow(band, 0.72) * height * 0.16 * intensity -
      Math.sin(time * 1.8 + index * 0.55) * height * 0.012;
    context.lineTo(x, y);
  });

  context.lineTo(width, height);
  context.closePath();

  const fill = context.createLinearGradient(
    0,
    baseline - height * 0.18,
    0,
    height,
  );
  fill.addColorStop(0, `hsla(${(hueBase + 190) % 360}, 94%, 62%, 0.28)`);
  fill.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = fill;
  fillPath(context);

  context.beginPath();
  bands.forEach((band, index) => {
    const x = index * step;
    const y =
      baseline -
      Math.pow(band, 0.72) * height * 0.16 * intensity -
      Math.sin(time * 1.8 + index * 0.55) * height * 0.012;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.strokeStyle = `hsla(${(hueBase + 165) % 360}, 100%, 84%, 0.72)`;
  context.lineWidth = Math.max(1.2, width * 0.0036);
  strokePath(context);
  restoreContext(context);
}

function drawHighlightBloom(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hueBase: number,
  bass: number,
  mid: number,
  treble: number,
  bloom: number,
) {
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
    `hsla(${(hueBase + 35) % 360}, 96%, 72%, ${0.08 + bass * 0.18 + bloom * 0.08})`,
  );
  glow.addColorStop(
    0.28,
    `hsla(${(hueBase + 195) % 360}, 90%, 58%, ${0.05 + mid * 0.14 + bloom * 0.04})`,
  );
  glow.addColorStop(
    0.6,
    `hsla(${(hueBase + 300) % 360}, 88%, 56%, ${0.03 + treble * 0.1})`,
  );
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
}

function drawFloorReflection(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hueBase: number,
  intensity: number,
) {
  const reflection = context.createLinearGradient(0, height * 0.56, 0, height);
  reflection.addColorStop(
    0,
    `hsla(${(hueBase + 210) % 360}, 92%, 56%, ${0.06 + intensity * 0.05})`,
  );
  reflection.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = reflection;
  context.fillRect(0, height * 0.56, width, height * 0.44);
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
    Math.min(width, height) * 0.22,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.82,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, `rgba(2, 5, 12, ${amount})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function roundRectFill(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  const maybeContext = context as CanvasRenderingContext2D & {
    roundRect?: (
      x: number,
      y: number,
      width: number,
      height: number,
      radii?: number | DOMPointInit | Iterable<number | DOMPointInit>,
    ) => void;
    rect?: (x: number, y: number, width: number, height: number) => void;
  };
  if (typeof maybeContext.roundRect === "function") {
    maybeContext.roundRect(x, y, width, height, radius);
  } else {
    maybeContext.rect?.(x, y, width, height);
  }
  fillPath(context);
}

function saveContext(context: CanvasRenderingContext2D) {
  if ("save" in context) {
    context.save();
  }
}

function restoreContext(context: CanvasRenderingContext2D) {
  if ("restore" in context) {
    context.restore();
  }
}

function fillPath(context: CanvasRenderingContext2D) {
  if ("fill" in context) {
    context.fill();
  }
}

function strokePath(context: CanvasRenderingContext2D) {
  if ("stroke" in context) {
    context.stroke();
  }
}

function average(values: number[], start: number, end: number): number {
  const slice = values.slice(start, end);
  if (slice.length === 0) {
    return 0;
  }

  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}
