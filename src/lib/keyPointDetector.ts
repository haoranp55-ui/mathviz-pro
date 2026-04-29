// src/lib/keyPointDetector.ts
import type { KeyPoint, SampledPoints } from '../types';

export function detectKeyPoints(
  fn: (x: number) => number,
  points: SampledPoints,
  functionId: string,
  options?: { tolerance?: number }
): KeyPoint[] {
  const { x, y } = points;
  const n = x.length;
  const keyPoints: KeyPoint[] = [];
  const tolerance = options?.tolerance ?? 1e-6;

  // 计算导数
  const dx = x[1] - x[0];
  const dy = new Float64Array(n);   // 一阶导数
  const ddy = new Float64Array(n);  // 二阶导数

  for (let i = 1; i < n - 1; i++) {
    if (isFinite(y[i-1]) && isFinite(y[i]) && isFinite(y[i+1])) {
      dy[i] = (y[i+1] - y[i-1]) / (2 * dx);
      ddy[i] = (y[i+1] - 2*y[i] + y[i-1]) / (dx * dx);
    } else {
      dy[i] = NaN;
      ddy[i] = NaN;
    }
  }

  // 检测零点
  for (let i = 1; i < n; i++) {
    if (isFinite(y[i-1]) && isFinite(y[i]) && y[i-1] * y[i] < 0) {
      const zeroX = binarySearchZero(fn, x[i-1], x[i]);
      keyPoints.push({ type: 'zero', x: zeroX, y: 0, functionId });
    }
  }

  // 检测极值点
  for (let i = 2; i < n - 2; i++) {
    if (!isFinite(y[i]) || !isFinite(dy[i-1]) || !isFinite(dy[i+1])) continue;

    // 极大值：导数从正变负
    if (dy[i-1] > tolerance && dy[i+1] < -tolerance) {
      keyPoints.push({ type: 'maximum', x: x[i], y: y[i], functionId });
    }
    // 极小值：导数从负变正
    if (dy[i-1] < -tolerance && dy[i+1] > tolerance) {
      keyPoints.push({ type: 'minimum', x: x[i], y: y[i], functionId });
    }
  }

  // 检测拐点
  for (let i = 2; i < n - 2; i++) {
    if (!isFinite(y[i]) || !isFinite(ddy[i-1]) || !isFinite(ddy[i+1])) continue;
    if (ddy[i-1] * ddy[i+1] < 0) {
      keyPoints.push({ type: 'inflection', x: x[i], y: y[i], functionId });
    }
  }

  // 检测不连续点
  for (let i = 1; i < n; i++) {
    if (!isFinite(y[i]) && isFinite(y[i-1])) {
      keyPoints.push({ type: 'discontinuity', x: x[i], y: NaN, functionId });
    }
  }

  return deduplicateKeyPoints(keyPoints);
}

// 二分法精确找零点
function binarySearchZero(
  fn: (x: number) => number,
  a: number,
  b: number,
  maxIter: number = 50
): number {
  let left = a;
  let right = b;

  for (let i = 0; i < maxIter; i++) {
    const mid = (left + right) / 2;
    const yMid = fn(mid);
    const yLeft = fn(left);

    if (Math.abs(yMid) < 1e-10) return mid;
    if (yMid * yLeft < 0) {
      right = mid;
    } else {
      left = mid;
    }
  }
  return (left + right) / 2;
}

// 去重：合并距离过近的关键点
function deduplicateKeyPoints(points: KeyPoint[], minDistance: number = 0.1): KeyPoint[] {
  if (points.length === 0) return points;

  // 按 x 排序
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const result: KeyPoint[] = [];

  for (const p of sorted) {
    const last = result[result.length - 1];
    if (!last || Math.abs(p.x - last.x) > minDistance || p.type !== last.type) {
      result.push(p);
    }
  }

  return result;
}
