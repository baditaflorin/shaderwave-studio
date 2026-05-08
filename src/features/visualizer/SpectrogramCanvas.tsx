import { useEffect, useRef } from "react";

import type { AudioAnalysis } from "../audio/types";

interface SpectrogramCanvasProps {
  analysis: AudioAnalysis | null;
  playhead: number;
}

export function SpectrogramCanvas({
  analysis,
  playhead,
}: SpectrogramCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(640, Math.floor(rect.width * pixelRatio));
    canvas.height = Math.max(180, Math.floor(rect.height * pixelRatio));

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    drawSpectrogram(context, canvas.width, canvas.height, analysis, playhead);
  }, [analysis, playhead]);

  return (
    <canvas
      ref={canvasRef}
      className="h-44 w-full rounded-lg border border-slate-200 bg-slate-950"
      data-testid="spectrogram"
      aria-label="Spectrogram"
    />
  );
}

function drawSpectrogram(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  analysis: AudioAnalysis | null,
  playhead: number,
) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#07111f";
  context.fillRect(0, 0, width, height);

  if (!analysis) {
    context.fillStyle = "#334155";
    context.fillRect(0, height - 2, width, 2);
    return;
  }

  const frameWidth = width / analysis.spectrogram.length;
  const binHeight = height / analysis.spectrogram[0].length;

  analysis.spectrogram.forEach((frame, frameIndex) => {
    frame.forEach((value, binIndex) => {
      const hue = 185 + value * 170;
      const lightness = 12 + value * 58;
      context.fillStyle = `hsl(${hue}, ${70 + value * 25}%, ${lightness}%)`;
      context.fillRect(
        frameIndex * frameWidth,
        height - (binIndex + 1) * binHeight,
        Math.ceil(frameWidth) + 1,
        Math.ceil(binHeight) + 1,
      );
    });
  });

  const playheadX = (playhead / Math.max(0.001, analysis.duration)) * width;
  context.fillStyle = "rgba(248, 250, 252, 0.94)";
  context.fillRect(playheadX, 0, 2, height);
}
