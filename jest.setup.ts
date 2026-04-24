import "@testing-library/jest-dom";

// Mock requestAnimationFrame for components using animation loops
global.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(cb, 16) as unknown as number;
global.cancelAnimationFrame = (id: number) => clearTimeout(id);

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 30 })),
  roundRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  set fillStyle(_: unknown) {},
  set strokeStyle(_: unknown) {},
  set lineWidth(_: unknown) {},
  set lineCap(_: unknown) {},
  set font(_: unknown) {},
  set textAlign(_: unknown) {},
})) as jest.Mock;

// Mock HTMLVideoElement play/pause (not implemented in jsdom)
Object.defineProperty(HTMLVideoElement.prototype, "play", {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined),
});
Object.defineProperty(HTMLVideoElement.prototype, "pause", {
  writable: true,
  value: jest.fn(),
});
