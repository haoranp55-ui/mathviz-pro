// src/lib/sampler.ts
import type { SampleOptions, SampledPoints } from '../types';

// 采样缓存：按函数ID存储采样结果
interface SampleCache {
  xMin: number;
  xMax: number;
  sampleCount: number;
  params?: Record<string, number>;
  points: SampledPoints;
  timestamp: number;
}

// 全局缓存管理器
class SampleCacheManager {
  private cache = new Map<string, SampleCache>();
  private maxSize = 50;

  get(
    cacheId: string,
    xMin: number,
    xMax: number,
    sampleCount: number,
    params?: Record<string, number>
  ): SampledPoints | null {
    const cached = this.cache.get(cacheId);
    if (!cached) return null;

    if (cached.xMin === xMin && cached.xMax === xMax && cached.sampleCount === sampleCount) {
      if (!params || !cached.params || JSON.stringify(cached.params) === JSON.stringify(params)) {
        cached.timestamp = Date.now();
        return cached.points;
      }
    }

    return null;
  }

  set(
    cacheId: string,
    xMin: number,
    xMax: number,
    sampleCount: number,
    points: SampledPoints,
    params?: Record<string, number>
  ): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(cacheId, {
      xMin,
      xMax,
      sampleCount,
      params,
      points,
      timestamp: Date.now(),
    });
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, value] of this.cache) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(cacheId: string): void {
    this.cache.delete(cacheId);
  }

  clearAll(): void {
    this.cache.clear();
  }
}

export const sampleCacheManager = new SampleCacheManager();

/**
 * 自适应采样算法
 *
 * 核心思路：
 * 1. 初始均匀采样
 * 2. 检测斜率突变区域（渐近线、极值点等）
 * 3. 在突变区域递归加密采样
 * 4. 合并所有采样点并排序
 */
export function adaptiveSample(
  fn: (x: number) => number,
  options: SampleOptions,
  maxDepth: number = 4
): SampledPoints {
  const { xMin, xMax, sampleCount } = options;

  // 初始采样
  const initialPoints = uniformSample(fn, xMin, xMax, sampleCount);

  // 收集需要加密的区域
  const regionsToRefine: Array<{ start: number; end: number; depth: number }> = [];

  // 检测需要加密的区域
  detectProblemRegions(fn, initialPoints, regionsToRefine, 0, maxDepth);

  // 如果没有问题区域，直接返回
  if (regionsToRefine.length === 0) {
    return initialPoints;
  }

  // 对问题区域进行加密采样
  const refinedPoints: Array<{ x: number; y: number }> = [];

  for (const region of regionsToRefine) {
    const subPoints = refineRegion(fn, region.start, region.end, region.depth, maxDepth);
    refinedPoints.push(...subPoints);
  }

  // 合并并去重
  return mergePoints(initialPoints, refinedPoints);
}

/**
 * 均匀采样
 */
function uniformSample(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  count: number
): SampledPoints {
  const x = new Float64Array(count);
  const y = new Float64Array(count);
  const step = (xMax - xMin) / (count - 1);

  for (let i = 0; i < count; i++) {
    x[i] = xMin + i * step;
    y[i] = fn(x[i]);
  }

  return { x, y };
}

/**
 * 检测需要加密的区域
 *
 * 判断标准：
 * 1. 斜率突变（相邻两点斜率差异大）
 * 2. 函数值跳变（相邻两点函数值差异大）
 * 3. 存在 NaN/Infinity（渐近线）
 */
function detectProblemRegions(
  _fn: (x: number) => number,
  points: SampledPoints,
  regions: Array<{ start: number; end: number; depth: number }>,
  currentDepth: number,
  maxDepth: number
): void {
  const { x, y } = points;
  const n = x.length;

  // 斜率阈值：当相邻斜率差异超过此值时，认为需要加密
  const SLOPE_RATIO_THRESHOLD = 3.0;
  // 函数值跳变阈值
  const VALUE_JUMP_THRESHOLD = 100;

  for (let i = 1; i < n - 1; i++) {
    const prevY = y[i - 1];
    const currY = y[i];
    const nextY = y[i + 1];

    const prevX = x[i - 1];
    const currX = x[i];
    const nextX = x[i + 1];

    // 跳过无效点
    if (!isFinite(prevY) || !isFinite(currY) || !isFinite(nextY)) {
      // 在无效点附近标记需要加密
      if (currentDepth < maxDepth) {
        regions.push({
          start: prevX,
          end: nextX,
          depth: currentDepth + 1,
        });
      }
      continue;
    }

    // 计算斜率
    const slope1 = (currY - prevY) / (currX - prevX);
    const slope2 = (nextY - currY) / (nextX - currX);

    // 检测斜率突变
    if (isFinite(slope1) && isFinite(slope2) && slope1 !== 0 && slope2 !== 0) {
      const ratio = Math.abs(slope2 / slope1);
      const inverseRatio = Math.abs(slope1 / slope2);

      if (ratio > SLOPE_RATIO_THRESHOLD || inverseRatio > SLOPE_RATIO_THRESHOLD) {
        if (currentDepth < maxDepth) {
          regions.push({
            start: prevX,
            end: nextX,
            depth: currentDepth + 1,
          });
        }
        continue;
      }
    }

    // 检测函数值跳变
    const jump1 = Math.abs(currY - prevY);
    const jump2 = Math.abs(nextY - currY);

    if (jump1 > VALUE_JUMP_THRESHOLD || jump2 > VALUE_JUMP_THRESHOLD) {
      if (currentDepth < maxDepth) {
        regions.push({
          start: prevX,
          end: nextX,
          depth: currentDepth + 1,
        });
      }
    }
  }
}

/**
 * 对指定区域进行加密采样（递归）
 */
function refineRegion(
  fn: (x: number) => number,
  xStart: number,
  xEnd: number,
  depth: number,
  maxDepth: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  // 加密采样点数
  const refineCount = 10;
  const step = (xEnd - xStart) / (refineCount - 1);

  for (let i = 0; i < refineCount; i++) {
    const x = xStart + i * step;
    const y = fn(x);
    points.push({ x, y });
  }

  // 如果还没达到最大深度，继续检测是否需要进一步加密
  if (depth < maxDepth) {
    const subRegions: Array<{ start: number; end: number; depth: number }> = [];

    // 创建临时 SampledPoints 用于检测
    const tempPoints: SampledPoints = {
      x: new Float64Array(points.map(p => p.x)),
      y: new Float64Array(points.map(p => p.y)),
    };

    detectProblemRegions(fn, tempPoints, subRegions, depth, maxDepth);

    // 对检测到的子区域继续加密
    for (const sub of subRegions) {
      const subPoints = refineRegion(fn, sub.start, sub.end, sub.depth, maxDepth);
      points.push(...subPoints);
    }
  }

  return points;
}

/**
 * 合并初始采样点和加密采样点
 */
function mergePoints(
  initial: SampledPoints,
  refined: Array<{ x: number; y: number }>
): SampledPoints {
  // 使用 Map 去重（按 x 值）
  const pointMap = new Map<number, number>();

  // 添加初始点
  for (let i = 0; i < initial.x.length; i++) {
    const x = initial.x[i];
    if (isFinite(x) && isFinite(initial.y[i])) {
      pointMap.set(x, initial.y[i]);
    }
  }

  // 添加加密点
  for (const p of refined) {
    if (isFinite(p.x) && isFinite(p.y)) {
      pointMap.set(p.x, p.y);
    }
  }

  // 排序并创建结果数组
  const sortedX = Array.from(pointMap.keys()).sort((a, b) => a - b);
  const resultX = new Float64Array(sortedX.length);
  const resultY = new Float64Array(sortedX.length);

  for (let i = 0; i < sortedX.length; i++) {
    resultX[i] = sortedX[i];
    resultY[i] = pointMap.get(sortedX[i])!;
  }

  return { x: resultX, y: resultY };
}

/**
 * 带缓存的采样
 */
export function cachedSample(
  fn: (x: number) => number,
  cacheId: string,
  options: SampleOptions,
  params?: Record<string, number>
): SampledPoints {
  const { xMin, xMax, sampleCount } = options;

  const cached = sampleCacheManager.get(cacheId, xMin, xMax, sampleCount, params);
  if (cached) {
    return cached;
  }

  const points = adaptiveSample(fn, options);
  sampleCacheManager.set(cacheId, xMin, xMax, sampleCount, points, params);

  return points;
}
