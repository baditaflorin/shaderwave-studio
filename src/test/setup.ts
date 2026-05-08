import "@testing-library/jest-dom/vitest";

const gradient = {
  addColorStop: () => undefined,
};

const context = {
  beginPath: () => undefined,
  clearRect: () => undefined,
  closePath: () => undefined,
  createLinearGradient: () => gradient,
  createRadialGradient: () => gradient,
  ellipse: () => undefined,
  fillRect: () => undefined,
  lineTo: () => undefined,
  moveTo: () => undefined,
  stroke: () => undefined,
  fillStyle: "",
  globalCompositeOperation: "source-over",
  lineWidth: 1,
  strokeStyle: "",
};

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => context,
});
