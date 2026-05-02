// src/lib/keyPointDetector.ts
import type { KeyPoint, SampledPoints } from '../types';

/** 导数/二阶导数过大说明数值不稳定（渐近线附近） */
const LARGE_DERIVATIVE_THRESHOLD = 1e5;
/** 相邻点斜率过大说明是渐近线区域 */
const ASYMPTOTE_SLOPE_THRESHOLD = 1e6;

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

  // 预标记：附近是否有不连续点（NaN/Infinity）
  const hasNaNNearby = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!isFinite(y[i])) {
      for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 3); j++) {
        hasNaNNearby[j] = 1;
      }
    }
  }

  // 预标记：数值不稳定区域（相邻点斜率过大 = 渐近线）
  const unstable = new Uint8Array(n);
  for (let i = 1; i < n; i++) {
    if (isFinite(y[i - 1]) && isFinite(y[i])) {
      const dx = x[i] - x[i - 1];
      if (dx > 0) {
        const slope = Math.abs(y[i] - y[i - 1]) / dx;
        if (slope > ASYMPTOTE_SLOPE_THRESHOLD) {
          for (let j = Math.max(0, i - 3); j <= Math.min(n - 1, i + 2); j++) {
            unstable[j] = 1;
          }
        }
      }
    }
  }

  // 计算导数（使用局部间距，兼容自适应采样的非均匀点）
  const dy = new Float64Array(n);   // 一阶导数
  const ddy = new Float64Array(n);  // 二阶导数

  for (let i = 1; i < n - 1; i++) {
    if (isFinite(y[i - 1]) && isFinite(y[i]) && isFinite(y[i + 1])) {
      const h = x[i + 1] - x[i - 1];
      dy[i] = (y[i + 1] - y[i - 1]) / h;

      // 非均匀网格的二阶导数（对线性函数精确为0）
      const h1 = x[i] - x[i - 1];
      const h2 = x[i + 1] - x[i];
      if (h1 > 0 && h2 > 0) {
        const s1 = (y[i] - y[i - 1]) / h1;
        const s2 = (y[i + 1] - y[i]) / h2;
        ddy[i] = 2 * (s2 - s1) / h;
      } else {
        ddy[i] = NaN;
      }
    } else {
      dy[i] = NaN;
      ddy[i] = NaN;
    }
  }

  // 检测零点
  for (let i = 1; i < n; i++) {
    if (!isFinite(y[i - 1]) || !isFinite(y[i])) continue;

    // 跳过渐近线区域
    if (unstable[i - 1] || unstable[i]) continue;

    if (y[i - 1] * y[i] < 0) {
      const zeroX = binarySearchZero(fn, x[i - 1], x[i]);
      const yZero = fn(zeroX);
      // 验证：真正的零点处函数值应接近0且在有限范围内
      if (isFinite(yZero) && Math.abs(yZero) < 10) {
        keyPoints.push({ type: 'zero', x: zeroX, y: 0, functionId });
      }
    }
  }

  // 检测极值点（附函数值验证，排除数值噪声）
  for (let i = 2; i < n - 2; i++) {
    if (!isFinite(y[i]) || !isFinite(dy[i - 1]) || !isFinite(dy[i + 1])) continue;

    // 跳过不连续点附近和数值不稳定区域
    if (hasNaNNearby[i] || unstable[i]) continue;

    // 导数过大：数值不稳定
    if (Math.abs(dy[i - 1]) > LARGE_DERIVATIVE_THRESHOLD || Math.abs(dy[i + 1]) > LARGE_DERIVATIVE_THRESHOLD) {
      continue;
    }

    // 极大值：导数从正变负，且函数值确实为局部最大
    if (dy[i - 1] > tolerance && dy[i + 1] < -tolerance) {
      if (isLocalMax(y, i)) {
        keyPoints.push({ type: 'maximum', x: x[i], y: y[i], functionId });
      }
    }
    // 极小值：导数从负变正，且函数值确实为局部最小
    if (dy[i - 1] < -tolerance && dy[i + 1] > tolerance) {
      if (isLocalMin(y, i)) {
        keyPoints.push({ type: 'minimum', x: x[i], y: y[i], functionId });
      }
    }
  }

  // 检测拐点
  for (let i = 2; i < n - 2; i++) {
    if (!isFinite(y[i]) || !isFinite(ddy[i - 1]) || !isFinite(ddy[i + 1])) continue;

    // 跳过不连续点附近和数值不稳定区域
    if (hasNaNNearby[i] || unstable[i]) continue;

    // 二阶导数过大：数值不稳定
    if (Math.abs(ddy[i - 1]) > LARGE_DERIVATIVE_THRESHOLD || Math.abs(ddy[i + 1]) > LARGE_DERIVATIVE_THRESHOLD) {
      continue;
    }

    if (ddy[i - 1] * ddy[i + 1] < 0) {
      keyPoints.push({ type: 'inflection', x: x[i], y: y[i], functionId });
    }
  }

  // 检测不连续点
  for (let i = 1; i < n; i++) {
    if (!isFinite(y[i]) && isFinite(y[i - 1])) {
      keyPoints.push({ type: 'discontinuity', x: x[i], y: NaN, functionId });
    }
  }

  return deduplicateKeyPoints(keyPoints);
}

/** 验证 y[i] 是否为局部最大值（附近 5 个点范围内最大） */
function isLocalMax(y: Float64Array, i: number, window: number = 3): boolean {
  for (let j = Math.max(0, i - window); j <= Math.min(y.length - 1, i + window); j++) {
    if (j !== i && y[j] > y[i]) return false;
  }
  return true;
}

/** 验证 y[i] 是否为局部最小值（附近 5 个点范围内最小） */
function isLocalMin(y: Float64Array, i: number, window: number = 3): boolean {
  for (let j = Math.max(0, i - window); j <= Math.min(y.length - 1, i + window); j++) {
    if (j !== i && y[j] < y[i]) return false;
  }
  return true;
}

// 二分法精确找零点
function binarySearchZero(
  fn: (x: number) => number,
  a: number,
  b: number,
  maxIter: number = 50
): number {
  // 验证两端点是否确实异号，防止采样噪声导致的假零点
  const yA = fn(a);
  const yB = fn(b);
  if (Math.sign(yA) === Math.sign(yB)) {
    // 同号：不是真正的零点穿越，回退到中点
    return (a + b) / 2;
  }

  let left = a;
  let right = b;

  for (let i = 0; i < maxIter; i++) {
    const mid = (left + right) / 2;
    const yMid = fn(mid);

    // 中点处函数值不有限或过大：接近渐近线，不应标记为零点
    if (!isFinite(yMid) || Math.abs(yMid) > 1e6) {
      return (left + right) / 2;
    }

    if (Math.abs(yMid) < 1e-10) return mid;

    const yLeft = fn(left);
    if (yMid * yLeft < 0) {
      right = mid;
    } else {
      left = mid;
    }
  }
  return (left + right) / 2;
}

// 去重：合并距离过近的关键点
function deduplicateKeyPoints(points: KeyPoint[], minDistance: number = 0.05): KeyPoint[] {
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
