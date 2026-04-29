// src/lib/sampler.ts
import { SampleOptions, SampledPoints } from '../types';

export function sampleFunction(
  fn: (x: number) => number,
  options: SampleOptions
): SampledPoints {
  const { xMin, xMax, sampleCount } = options;

  const x = new Float64Array(sampleCount);
  const y = new Float64Array(sampleCount);

  const step = (xMax - xMin) / (sampleCount - 1);

  for (let i = 0; i < sampleCount; i++) {
    x[i] = xMin + i * step;
    y[i] = fn(x[i]);
  }

  return { x, y };
}

// 自适应采样：在不连续点附近加密
export function adaptiveSample(
  fn: (x: number) => number,
  options: SampleOptions,
  threshold: number = 100
): SampledPoints {
  const { xMin, xMax, sampleCount } = options;

  // 先进行基础采样
  const baseResult = sampleFunction(fn, options);

  // 检测不连续点
  const discontinuities: number[] = [];
  for (let i = 1; i < sampleCount - 1; i++) {
    const prev = baseResult.y[i - 1];
    const curr = baseResult.y[i];
    const next = baseResult.y[i + 1];

    // 如果相邻点差距过大，认为是不连续点
    if (
      isFinite(prev) && isFinite(curr) && isFinite(next) &&
      (Math.abs(curr - prev) > threshold || Math.abs(next - curr) > threshold)
    ) {
      discontinuities.push(i);
    }
  }

  // 如果没有不连续点，直接返回
  if (discontinuities.length === 0) {
    return baseResult;
  }

  // 在不连续点附近加密采样
  const extraPoints: { x: number; y: number }[] = [];
  const extraCount = 10; // 每个不连续点附近额外采样点数

  for (const idx of discontinuities) {
    const xLeft = baseResult.x[Math.max(0, idx - 1)];
    const xRight = baseResult.x[Math.min(sampleCount - 1, idx + 1)];
    const subStep = (xRight - xLeft) / (extraCount + 1);

    for (let j = 1; j <= extraCount; j++) {
      const xExtra = xLeft + j * subStep;
      extraPoints.push({ x: xExtra, y: fn(xExtra) });
    }
  }

  // 合并结果
  const totalCount = sampleCount + extraPoints.length;
  const x = new Float64Array(totalCount);
  const y = new Float64Array(totalCount);

  // 复制原始数据
  x.set(baseResult.x);
  y.set(baseResult.y);

  // 添加额外点
  for (let i = 0; i < extraPoints.length; i++) {
    x[sampleCount + i] = extraPoints[i].x;
    y[sampleCount + i] = extraPoints[i].y;
  }

  // 按 x 排序
  const indices = Array.from({ length: totalCount }, (_, i) => i);
  indices.sort((a, b) => x[a] - x[b]);

  const sortedX = new Float64Array(totalCount);
  const sortedY = new Float64Array(totalCount);

  for (let i = 0; i < totalCount; i++) {
    sortedX[i] = x[indices[i]];
    sortedY[i] = y[indices[i]];
  }

  return { x: sortedX, y: sortedY };
}
