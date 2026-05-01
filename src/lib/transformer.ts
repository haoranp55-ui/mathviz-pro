// src/lib/transformer.ts
import { scaleLinear, type ScaleLinear } from 'd3-scale';
import type { ViewPort, CanvasSize, AspectRatioMode } from '../types';

export interface Scales {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;
}

/**
 * 统一的渲染上下文
 *
 * 解决采样范围和渲染范围不同步的问题
 * 在 equal 模式下，确保采样范围覆盖整个画布宽度
 */
export interface RenderContext {
  xScale: ScaleLinear<number, number>;
  yScale: ScaleLinear<number, number>;

  // 采样范围（数学坐标）
  sampleXMin: number;
  sampleXMax: number;
  sampleYMin: number;
  sampleYMax: number;

  // 偏移量（像素）- equal 模式下内容居中
  offsetX: number;
  offsetY: number;

  // 实际渲染区域（像素）
  actualWidth: number;
  actualHeight: number;

  // 模式标识
  aspectRatioMode: AspectRatioMode;
}

/**
 * 创建统一的渲染上下文
 *
 * 关键：采样范围 = 视口范围 + 空白区域对应的数学范围 + 缓冲
 */
export function createRenderContext(
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal',
  paddingFactor: number = 0.1
): RenderContext {
  const xRange = viewPort.xMax - viewPort.xMin;
  const yRange = viewPort.yMax - viewPort.yMin;

  let offsetX = 0;
  let offsetY = 0;
  let actualWidth = canvasSize.width;
  let actualHeight = canvasSize.height;
  let sampleXMin: number, sampleXMax: number;
  let sampleYMin: number, sampleYMax: number;

  if (aspectRatioMode === 'equal') {
    // 等比例模式：确保 x 和 y 的单位长度在像素上相等
    const pixelRatioX = canvasSize.width / xRange;
    const pixelRatioY = canvasSize.height / yRange;
    const baseRatio = Math.min(pixelRatioX, pixelRatioY);

    // 实际渲染的像素宽度和高度
    actualWidth = xRange * baseRatio;
    actualHeight = yRange * baseRatio;

    // 偏移量，使内容居中
    offsetX = (canvasSize.width - actualWidth) / 2;
    offsetY = (canvasSize.height - actualHeight) / 2;

    // 计算采样范围：需要覆盖整个画布宽度对应的数学范围
    const unitsPerPixel = xRange / actualWidth;

    // 左右空白区域对应的数学范围
    const extraLeft = offsetX * unitsPerPixel;
    const extraRight = (canvasSize.width - offsetX - actualWidth) * unitsPerPixel;

    // 上下空白区域对应的数学范围
    const extraTop = offsetY * unitsPerPixel;
    const extraBottom = (canvasSize.height - offsetY - actualHeight) * unitsPerPixel;

    // 采样范围 = 视口范围 + 空白区域 + 缓冲
    const paddingX = xRange * paddingFactor;
    const paddingY = yRange * paddingFactor;

    sampleXMin = viewPort.xMin - extraLeft - paddingX;
    sampleXMax = viewPort.xMax + extraRight + paddingX;
    sampleYMin = viewPort.yMin - extraTop - paddingY;
    sampleYMax = viewPort.yMax + extraBottom + paddingY;
  } else {
    // 普通模式：采样范围比视口大 paddingFactor
    const paddingX = xRange * paddingFactor;
    const paddingY = yRange * paddingFactor;

    sampleXMin = viewPort.xMin - paddingX;
    sampleXMax = viewPort.xMax + paddingX;
    sampleYMin = viewPort.yMin - paddingY;
    sampleYMax = viewPort.yMax + paddingY;
  }

  // 创建比例尺
  const xScale = scaleLinear()
    .domain([viewPort.xMin, viewPort.xMax])
    .range([offsetX, offsetX + actualWidth]);

  const yScale = scaleLinear()
    .domain([viewPort.yMin, viewPort.yMax])
    .range([offsetY + actualHeight, offsetY]); // Y轴翻转

  return {
    xScale,
    yScale,
    sampleXMin,
    sampleXMax,
    sampleYMin,
    sampleYMax,
    offsetX,
    offsetY,
    actualWidth,
    actualHeight,
    aspectRatioMode,
  };
}

/**
 * 创建坐标变换比例尺
 *
 * 支持两种模式：
 * - normal: 独立比例，x 和 y 轴各自映射（可能导致圆变形）
 * - equal: 等比例，保持 1:1 纵横比（圆显示为正圆）
 */
export function createScales(
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  mode: 'normal' | 'equal' = 'normal'
): Scales {
  if (mode === 'equal') {
    // 等比例模式：确保 x 和 y 的单位长度在像素上相等
    const xRange = viewPort.xMax - viewPort.xMin;
    const yRange = viewPort.yMax - viewPort.yMin;

    // 计算像素比例
    const pixelRatioX = canvasSize.width / xRange;
    const pixelRatioY = canvasSize.height / yRange;

    // 使用较小的比例作为基准，确保两个轴都能完整显示
    const baseRatio = Math.min(pixelRatioX, pixelRatioY);

    // 计算实际使用的像素范围
    const actualWidth = xRange * baseRatio;
    const actualHeight = yRange * baseRatio;

    // 计算偏移量，使内容居中
    const offsetX = (canvasSize.width - actualWidth) / 2;
    const offsetY = (canvasSize.height - actualHeight) / 2;

    const xScale = scaleLinear()
      .domain([viewPort.xMin, viewPort.xMax])
      .range([offsetX, offsetX + actualWidth]);

    const yScale = scaleLinear()
      .domain([viewPort.yMin, viewPort.yMax])
      .range([offsetY + actualHeight, offsetY]); // Y轴翻转

    return { xScale, yScale };
  }

  // 普通模式：独立比例
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
    px: scales.xScale(x) as number,
    py: scales.yScale(y) as number,
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
