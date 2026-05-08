import { useEffect, useRef, useState } from "react";

import type { VisualSettings } from "../project/settings";
import { drawShaderFrame2d } from "./draw2d";
import { WebGpuVisualizerRenderer } from "./webgpuRenderer";

interface VisualizerCanvasProps {
  bands: number[];
  time: number;
  settings: VisualSettings;
}

export function VisualizerCanvas({
  bands,
  time,
  settings,
}: VisualizerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<WebGpuVisualizerRenderer | null>(null);
  const latestRef = useRef({ bands, time, settings });
  const [mode, setMode] = useState("Canvas 2D");

  useEffect(() => {
    latestRef.current = { bands, time, settings };
  }, [bands, time, settings]);

  useEffect(() => {
    let active = true;
    let frameId = 0;

    async function init() {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      try {
        rendererRef.current = await WebGpuVisualizerRenderer.create(canvas);
        if (active) {
          setMode("WebGPU");
        }
      } catch {
        rendererRef.current = null;
        if (active) {
          setMode("Canvas 2D");
        }
      }

      const render = () => {
        const nextCanvas = canvasRef.current;
        if (!nextCanvas) {
          return;
        }

        const rect = nextCanvas.getBoundingClientRect();
        const width = Math.max(320, rect.width);
        const height = Math.max(180, rect.height);
        const latest = latestRef.current;

        if (rendererRef.current) {
          rendererRef.current.render({
            width,
            height,
            bands: latest.bands,
            time: latest.time,
            settings: latest.settings,
          });
        } else {
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          nextCanvas.width = Math.floor(width * pixelRatio);
          nextCanvas.height = Math.floor(height * pixelRatio);
          const context = nextCanvas.getContext("2d");
          if (context) {
            drawShaderFrame2d({
              context,
              width: nextCanvas.width,
              height: nextCanvas.height,
              bands: latest.bands,
              time: latest.time,
              settings: latest.settings,
            });
          }
        }

        frameId = window.requestAnimationFrame(render);
      };

      render();
    }

    void init();

    return () => {
      active = false;
      window.cancelAnimationFrame(frameId);
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-sm">
      <canvas
        ref={canvasRef}
        className="h-full min-h-[280px] w-full"
        data-testid="visualizer-canvas"
        aria-label="Audio reactive shader preview"
      />
      <div className="absolute left-3 top-3 rounded-md border border-white/15 bg-slate-950/70 px-2 py-1 text-xs font-medium text-cyan-100 backdrop-blur">
        {mode}
      </div>
    </div>
  );
}
