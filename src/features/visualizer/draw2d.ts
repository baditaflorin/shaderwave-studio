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

  switch (settings.preset) {
    case "bars":
      drawClubColumns(context, width, height, bands, hueBase, intensity, time);
      break;
    case "tunnel":
      drawPhaseTunnel(context, width, height, bands, hueBase, intensity, time);
      break;
    case "kaleidoscope":
      drawKaleidoscope(context, width, height, bands, hueBase, intensity, time);
      break;
    case "starfield":
      drawStarfield(context, width, height, bands, hueBase, intensity, time);
      break;
    case "lattice":
      drawLatticeGrid(context, width, height, bands, hueBase, intensity, time);
      break;
    case "aurora":
      drawAuroraBands(context, width, height, bands, hueBase, intensity, time);
      break;
    case "prism":
    default:
      drawPrismField(context, width, height, bands, hueBase, intensity, time);
      break;
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

function drawKaleidoscope(
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
  const extent = Math.min(width, height) * 0.46;
  const slices = 8;
  const bass = average(bands, 0, 4);
  const mid = average(bands, 4, 11);
  const treble = average(bands, 11, bands.length);
  const wedge = (Math.PI * 2) / slices;

  saveContext(context);
  context.globalCompositeOperation = "lighter";

  for (let slice = 0; slice < slices; slice += 1) {
    saveContext(context);
    context.translate(centerX, centerY);
    context.rotate(slice * wedge + time * 0.18);
    if (slice % 2 === 1) {
      context.scale(1, -1);
    }
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, extent, 0, wedge);
    context.closePath();
    context.clip();

    for (let layer = 0; layer < bands.length; layer += 1) {
      const band = bands[layer] ?? 0;
      const layerRadius =
        extent *
        (0.12 + (layer / bands.length) * 0.78 + band * 0.08 * intensity);
      const petals = 3 + (layer % 5);
      context.beginPath();
      for (let step = 0; step <= 48; step += 1) {
        const angle = (step / 48) * wedge;
        const wobble =
          Math.sin(angle * petals + time * 1.8 + layer) * 6 * (1 + bass);
        const radius = layerRadius + wobble;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (step === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      const hue = (hueBase + layer * 13 + slice * 7 + time * 24) % 360;
      const lightness = 50 + treble * 24 - layer * 1.8;
      const alpha = 0.16 + band * 0.5 * intensity + mid * 0.08;
      context.strokeStyle = `hsla(${hue}, 96%, ${Math.max(28, Math.min(80, lightness))}%, ${Math.min(0.9, alpha)})`;
      context.lineWidth = Math.max(1, width * 0.0028 + band * width * 0.0024);
      strokePath(context);
    }
    restoreContext(context);
  }

  restoreContext(context);
}

function drawStarfield(
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
  const bass = average(bands, 0, 4);
  const mid = average(bands, 4, 11);
  const treble = average(bands, 11, bands.length);
  const starCount = 220;
  const warpSpeed = 0.16 + bass * 0.42 * intensity;

  saveContext(context);
  context.globalCompositeOperation = "lighter";

  for (let index = 0; index < starCount; index += 1) {
    const seedAngle = (index * 2.3998) % (Math.PI * 2);
    const seedRadius = (index / starCount) * 0.5 + 0.04;
    const cycle = (seedRadius + time * warpSpeed) % 1;
    const eased = Math.pow(cycle, 0.55);
    const radius = eased * extent * 0.78;
    const angle = seedAngle + cycle * (0.18 + mid * 0.42);

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius * 0.92;
    const bandIndex = index % bands.length;
    const band = bands[bandIndex] ?? 0;
    const size =
      Math.max(0.6, width * 0.0014) +
      band * width * 0.005 +
      eased * width * 0.003;
    const hue = (hueBase + index * 3 + cycle * 220) % 360;
    const alpha = 0.18 + (1 - cycle) * 0.62 + band * 0.3;

    context.fillStyle = `hsla(${hue}, 96%, ${72 - cycle * 28}%, ${Math.min(0.95, alpha)})`;
    context.beginPath();
    arcPath(context, x, y, size);
    fillPath(context);

    if (cycle > 0.3) {
      const trailX = centerX + Math.cos(angle) * radius * 0.86;
      const trailY = centerY + Math.sin(angle) * radius * 0.86 * 0.92;
      context.strokeStyle = `hsla(${(hue + 180) % 360}, 96%, ${68 - cycle * 24}%, ${Math.min(0.5, alpha * 0.6)})`;
      context.lineWidth = Math.max(0.6, size * 0.8);
      context.beginPath();
      context.moveTo(trailX, trailY);
      context.lineTo(x, y);
      strokePath(context);
    }
  }

  const flare = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    extent * 0.35,
  );
  flare.addColorStop(0, `hsla(${hueBase}, 95%, 80%, ${0.12 + treble * 0.18})`);
  flare.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = flare;
  context.fillRect(0, 0, width, height);

  restoreContext(context);
}

function drawLatticeGrid(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bands: number[],
  hueBase: number,
  intensity: number,
  time: number,
) {
  const bass = average(bands, 0, 4);
  const mid = average(bands, 4, 11);
  const treble = average(bands, 11, bands.length);
  const cols = 16;
  const rows = 10;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  saveContext(context);
  context.globalCompositeOperation = "lighter";

  const points: { x: number; y: number; band: number }[][] = [];
  for (let row = 0; row <= rows; row += 1) {
    const line: { x: number; y: number; band: number }[] = [];
    for (let col = 0; col <= cols; col += 1) {
      const bandIndex = (col + row) % bands.length;
      const band = bands[bandIndex] ?? 0;
      const baseX = col * cellWidth;
      const baseY = row * cellHeight;
      const waveX =
        Math.sin(row * 0.6 + time * 1.4 + col * 0.18) *
        cellWidth *
        0.4 *
        (0.3 + band * intensity);
      const waveY =
        Math.cos(col * 0.55 + time * 1.6 + row * 0.22) *
        cellHeight *
        0.45 *
        (0.3 + band * intensity);
      line.push({ x: baseX + waveX, y: baseY + waveY, band });
    }
    points.push(line);
  }

  for (let row = 0; row <= rows; row += 1) {
    context.beginPath();
    for (let col = 0; col <= cols; col += 1) {
      const point = points[row][col];
      if (col === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    }
    const hue = (hueBase + row * 16 + time * 18) % 360;
    context.strokeStyle = `hsla(${hue}, 92%, ${58 + bass * 12}%, ${0.2 + mid * 0.3})`;
    context.lineWidth = Math.max(1, width * 0.0018);
    strokePath(context);
  }

  for (let col = 0; col <= cols; col += 1) {
    context.beginPath();
    for (let row = 0; row <= rows; row += 1) {
      const point = points[row][col];
      if (row === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    }
    const hue = (hueBase + 90 + col * 11 - time * 16) % 360;
    context.strokeStyle = `hsla(${hue}, 92%, ${62 + treble * 12}%, ${0.18 + mid * 0.28})`;
    context.lineWidth = Math.max(1, width * 0.0018);
    strokePath(context);
  }

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      const point = points[row][col];
      const energy = point.band;
      if (energy < 0.18) {
        continue;
      }
      const hue = (hueBase + (col + row) * 14 + time * 30) % 360;
      context.fillStyle = `hsla(${hue}, 100%, 82%, ${Math.min(0.9, 0.2 + energy * 0.7)})`;
      context.beginPath();
      arcPath(
        context,
        point.x,
        point.y,
        Math.max(1.4, width * 0.003 + energy * width * 0.004),
      );
      fillPath(context);
    }
  }

  restoreContext(context);
}

function drawAuroraBands(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bands: number[],
  hueBase: number,
  intensity: number,
  time: number,
) {
  const bass = average(bands, 0, 4);
  const mid = average(bands, 4, 11);
  const treble = average(bands, 11, bands.length);
  const ribbons = 6;

  saveContext(context);
  context.globalCompositeOperation = "lighter";

  for (let ribbon = 0; ribbon < ribbons; ribbon += 1) {
    const ribbonT = ribbon / (ribbons - 1);
    const baselineY = height * (0.32 + ribbonT * 0.42);
    const amplitude =
      height * (0.06 + bass * 0.12 * intensity + ribbonT * 0.03);
    const segments = 64;

    context.beginPath();
    for (let segment = 0; segment <= segments; segment += 1) {
      const x = (segment / segments) * width;
      const phase = segment / segments;
      const bandIndex = Math.floor(phase * bands.length);
      const band = bands[bandIndex] ?? 0;
      const wave =
        Math.sin(phase * 6.28 + time * (0.5 + ribbonT * 0.6) + ribbon * 0.7) *
          amplitude +
        Math.sin(phase * 18.84 - time * 1.3 + ribbon) *
          amplitude *
          0.25 *
          (0.5 + band);
      const y = baselineY + wave - band * height * 0.04 * intensity;
      if (segment === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();

    const hue = (hueBase + ribbon * 28 + time * 20) % 360;
    const gradient = context.createLinearGradient(
      0,
      baselineY - amplitude,
      0,
      height,
    );
    gradient.addColorStop(
      0,
      `hsla(${hue}, 96%, ${68 - ribbon * 4}%, ${0.32 + treble * 0.26 - ribbon * 0.04})`,
    );
    gradient.addColorStop(
      0.5,
      `hsla(${(hue + 40) % 360}, 92%, ${52 + mid * 12}%, ${0.18 + bass * 0.18})`,
    );
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    fillPath(context);

    context.beginPath();
    for (let segment = 0; segment <= segments; segment += 1) {
      const x = (segment / segments) * width;
      const phase = segment / segments;
      const bandIndex = Math.floor(phase * bands.length);
      const band = bands[bandIndex] ?? 0;
      const wave =
        Math.sin(phase * 6.28 + time * (0.5 + ribbonT * 0.6) + ribbon * 0.7) *
          amplitude +
        Math.sin(phase * 18.84 - time * 1.3 + ribbon) *
          amplitude *
          0.25 *
          (0.5 + band);
      const y = baselineY + wave - band * height * 0.04 * intensity;
      if (segment === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.strokeStyle = `hsla(${(hue + 20) % 360}, 100%, ${82 - ribbon * 4}%, ${0.5 + treble * 0.3})`;
    context.lineWidth = Math.max(1.2, width * 0.0024);
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

function arcPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  if ("arc" in context && typeof context.arc === "function") {
    context.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
  }
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
