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

// 浮点容差比较（用于视口坐标缓存匹配）
function floatMatch(a: number, b: number, tolerance: number = 1e-9): boolean {
  return Math.abs(a - b) < tolerance;
}

// 参数比较（键顺序无关，带数值容差）
function paramsMatch(a?: Record<string, number>, b?: Record<string, number>, tolerance: number = 1e-9): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!(key in b)) return false;
    if (!floatMatch(a[key], b[key], tolerance)) return false;
  }
  return true;
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

    if (floatMatch(cached.xMin, xMin) && floatMatch(cached.xMax, xMax) && cached.sampleCount === sampleCount) {
      if (paramsMatch(cached.params, params)) {
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
  detectProblemRegions(initialPoints, regionsToRefine, 0, maxDepth);

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
  if (count <= 1) {
    const y = fn(xMin);
    return {
      x: new Float64Array([xMin]),
      y: new Float64Array([isFinite(y) ? y : NaN]),
    };
  }

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
 * 核心原则：只检测"加密能改善可视化质量"的区域。
 *
 * 两种真正需要加密的场景：
 * 1. 定义域边界/渐近线（NaN/Infinity 混合区域）
 * 2. 大值异号跳变（tan(x)、1/x 等函数的极点两侧）
 *
 * 被移除的过度检测：
 * - 斜率比突变：容易误判 exp(x) 等平滑曲线
 * - 绝对/相对值跳变：同上，且与指数增长混淆
 */
function detectProblemRegions(
  points: SampledPoints,
  regions: Array<{ start: number; end: number; depth: number }>,
  currentDepth: number,
  maxDepth: number
): void {
  const { x, y } = points;
  const n = x.length;

  // 异号跳变阈值：两侧绝对值都超过此值才认为是渐近线
  // sin(x) 零点的 ~0.00x → ~-0.00x 不会触发（绝对值太小）
  // tan(x) 的 +92 → -108 会触发（异号且绝对值大）
  const SIGN_CHANGE_THRESHOLD = 50;

  for (let i = 1; i < n - 1; i++) {
    const prevY = y[i - 1];
    const nextY = y[i + 1];
    const prevX = x[i - 1];
    const nextX = x[i + 1];

    // 处理无效点
    const prevValid = isFinite(prevY);
    const currValid = isFinite(y[i]);
    const nextValid = isFinite(nextY);

    // 全无效：整个区域在定义域外（如 ln(x) 的 x<0），加密毫无意义
    if (!prevValid && !currValid && !nextValid) {
      continue;
    }

    // 混合有效/无效：定义域边界或渐近线，加密以精确定位边界
    if (!prevValid || !currValid || !nextValid) {
      if (currentDepth < maxDepth) {
        regions.push({
          start: prevX,
          end: nextX,
          depth: currentDepth + 1,
        });
      }
      continue;
    }

    // 检测"大值异号跳变"——渐近线的唯一可靠特征
    // 原理：渐近线两侧，函数值从很大的正数跳变到很大的负数（或反之）
    // exp(x)、x^2、sin(x) 等不会触发（同号或绝对值小）
    const prevSign = Math.sign(prevY);
    const nextSign = Math.sign(nextY);

    if (prevSign !== 0 && nextSign !== 0 && prevSign !== nextSign) {
      if (Math.abs(prevY) > SIGN_CHANGE_THRESHOLD && Math.abs(nextY) > SIGN_CHANGE_THRESHOLD) {
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

    detectProblemRegions(tempPoints, subRegions, depth, maxDepth);

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
    const y = pointMap.get(sortedX[i]);
    resultY[i] = y !== undefined ? y : NaN;
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
