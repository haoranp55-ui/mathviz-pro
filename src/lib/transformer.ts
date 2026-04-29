// src/lib/transformer.ts
import { scaleLinear } from 'd3-scale';
import { ViewPort, CanvasSize } from '../types';

export interface Scales {
  xScale: ReturnType<typeof scaleLinear>;
  yScale: ReturnType<typeof scaleLinear>;
}

export function createScales(viewPort: ViewPort, canvasSize: CanvasSize): Scales {
  const xScale = scaleLinear()
    .domain([viewPort.xMin, viewPort.xMax])
    .range([0, canvasSize.width]);

  const yScale = scaleLinear()
    .domain([viewPort.yMin, viewPort.yMax])
    .range([canvasSize.height, 0]); // Y轴翻转

  return { xScale, yScale };
}

// 数学坐标 → Canvas 像素坐标
export function mathToCanvas(
  x: number,
  y: number,
  scales: Scales
): { px: number; py: number } {
  return {
    px: scales.xScale(x),
    py: scales.yScale(y),
  };
}

// Canvas 像素坐标 → 数学坐标
export function canvasToMath(
  px: number,
  py: number,
  scales: Scales
): { x: number; y: number } {
  return {
    x: scales.xScale.invert(px),
    y: scales.yScale.invert(py),
  };
}

// 计算合适的刻度间隔
export function calculateTickInterval(
  min: number,
  max: number,
  targetTickCount: number = 10
): number {
  const range = max - min;
  const roughInterval = range / targetTickCount;

  // 计算数量级
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));

  // 标准化到 1, 2, 5
  const normalized = roughInterval / magnitude;

  let interval: number;
  if (normalized < 1.5) {
    interval = magnitude;
  } else if (normalized < 3) {
    interval = 2 * magnitude;
  } else if (normalized < 7) {
    interval = 5 * magnitude;
  } else {
    interval = 10 * magnitude;
  }

  return interval;
}

// 生成刻度值
export function generateTicks(
  min: number,
  max: number,
  interval: number
): number[] {
  const ticks: number[] = [];
  const start = Math.ceil(min / interval) * interval;

  for (let t = start; t <= max; t += interval) {
    // 避免浮点误差
    ticks.push(Math.round(t / interval) * interval);
  }

  return ticks;
}
