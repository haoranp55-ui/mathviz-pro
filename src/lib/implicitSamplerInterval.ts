// src/lib/implicitSamplerInterval.ts
/**
 * 高性能隐函数采样器
 *
 * 优化策略：
 * 1. 四角点采样替代 9 点采样（减少 55% 函数调用）
 * 2. 早期退出：同符号单元格直接跳过
 * 3. TypedArrays 存储中间结果
 * 4. 内联计算减少函数调用开销
 * 5. 网格值缓存：预计算网格值，分离函数计算和线段提取
 */

import Interval from 'interval-arithmetic';
import type { ViewPort, ContourSegment, SamplePreset } from '../types';
import { IMPLICIT_SAMPLE_PRESETS } from '../types';

// ============================================
// 网格值缓存系统（核心优化）
// ============================================

interface GridCache {
  values: Float32Array;
  gridSize: number;
  viewPort: ViewPort;
  params: Record<string, number>;
  lastAccess: number;
}

const gridCacheMap = new Map<string, GridCache>();

// 缓存过期时间（毫秒）
const CACHE_EXPIRE_TIME = 2000;

/**
 * 预计算网格值（可缓存）
 * 这是最耗时的部分，分离出来便于优化
 */
export function computeGridValues(
  fn: (x: number, y: number) => number,
  viewPort: ViewPort,
  gridSize: number = 128
): Float32Array {
  const values = new Float32Array(gridSize * gridSize);
  const { xMin, xMax, yMin, yMax } = viewPort;
  const dx = (xMax - xMin) / (gridSize - 1);
  const dy = (yMax - yMin) / (gridSize - 1);

  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const x = xMin + gx * dx;
      const y = yMin + gy * dy;
      values[gy * gridSize + gx] = fn(x, y);
    }
  }

  return values;
}

/**
 * 从预计算的网格值提取线段（极快）
 *
 * 关键改进：区分"真零点"和"奇点导致的符号变化"
 * - 真零点：函数值从有限值穿过零点 → 绘制曲线
 * - 奇点：函数值趋向无穷大 → 不绘制曲线
 */
export function extractSegmentsFromGrid(
  values: Float32Array,
  viewPort: ViewPort,
  gridSize: number
): ContourSegment[] {
  const segments: ContourSegment[] = [];
  const { xMin, xMax, yMin, yMax } = viewPort;
  const dx = (xMax - xMin) / (gridSize - 1);
  const dy = (yMax - yMin) / (gridSize - 1);

  // 阈值：用于检测奇点（当函数值绝对值超过此值时，认为是奇点附近）
  const SINGULARITY_THRESHOLD = 1e6;

  for (let gy = 0; gy < gridSize - 1; gy++) {
    for (let gx = 0; gx < gridSize - 1; gx++) {
      const idx = gy * gridSize + gx;
      const v0 = values[idx];
      const v1 = values[idx + 1];
      const v2 = values[idx + gridSize + 1];
      const v3 = values[idx + gridSize];

      // 跳过包含 NaN 的单元格
      if (isNaN(v0) || isNaN(v1) || isNaN(v2) || isNaN(v3)) continue;

      // 检查是否有无穷大值（奇点）
      const hasInfinity = !isFinite(v0) || !isFinite(v1) || !isFinite(v2) || !isFinite(v3);

      // 如果有无穷大值，跳过这个单元格（奇点区域）
      if (hasInfinity) continue;

      // 同符号跳过
      const sign0 = v0 >= 0;
      if (sign0 === (v1 >= 0) && sign0 === (v2 >= 0) && sign0 === (v3 >= 0)) continue;

      // 检查是否是"假零点"（奇点导致的符号变化）
      // 如果任意一个角的值绝对值过大，说明接近奇点，可能是假零点
      const maxAbs = Math.max(Math.abs(v0), Math.abs(v1), Math.abs(v2), Math.abs(v3));
      if (maxAbs > SINGULARITY_THRESHOLD) {
        // 检查是否是"穿过无穷大"的符号变化
        // 真零点：值从正到负（或负到正）穿过零点，值相对较小
        // 假零点：值从极大正数到极大负数（或反之），通过无穷大
        const minAbs = Math.min(Math.abs(v0), Math.abs(v1), Math.abs(v2), Math.abs(v3));
        // 如果最小绝对值也很大，说明整个单元格都在奇点附近，跳过
        if (minAbs > SINGULARITY_THRESHOLD / 10) {
          continue;
        }
      }

      const baseX = xMin + gx * dx;
      const baseY = yMin + gy * dy;

      const points: Array<{ x: number; y: number }> = [];

      // 底边
      if (v0 * v1 < 0) {
        const t = v0 / (v0 - v1);
        points.push({ x: baseX + t * dx, y: baseY });
      }
      // 右边
      if (v1 * v2 < 0) {
        const t = v1 / (v1 - v2);
        points.push({ x: baseX + dx, y: baseY + t * dy });
      }
      // 顶边
      if (v2 * v3 < 0) {
        const t = v2 / (v2 - v3);
        points.push({ x: baseX + (1 - t) * dx, y: baseY + dy });
      }
      // 左边
      if (v3 * v0 < 0) {
        const t = v3 / (v3 - v0);
        points.push({ x: baseX, y: baseY + (1 - t) * dy });
      }

      if (points.length >= 2) {
        segments.push({
          x1: points[0].x, y1: points[0].y,
          x2: points[1].x, y2: points[1].y,
        });
      }
      if (points.length === 4) {
        segments.push({
          x1: points[2].x, y1: points[2].y,
          x2: points[3].x, y2: points[3].y,
        });
      }
    }
  }

  return segments;
}

/**
 * 检查参数是否在容差范围内相同
 */
function paramsApproxEqual(
  p1: Record<string, number>,
  p2: Record<string, number>,
  tolerance: number = 0.01
): boolean {
  const keys1 = Object.keys(p1);
  const keys2 = Object.keys(p2);

  if (keys1.length !== keys2.length) return false;
  if (keys1.length === 0) return true;

  for (const key of keys1) {
    if (!(key in p2)) return false;
    if (Math.abs(p1[key] - p2[key]) > tolerance) return false;
  }

  return true;
}

/**
 * 带网格缓存的快速渲染（滑钮滑动专用）
 */
export function fastRenderWithCache(
  fn: (x: number, y: number) => number,
  viewPort: ViewPort,
  gridSize: number,
  cacheId: string,
  params: Record<string, number> = {}
): ContourSegment[] {
  const cached = gridCacheMap.get(cacheId);
  const now = Date.now();

  // 清理过期缓存
  if (cached && now - cached.lastAccess > CACHE_EXPIRE_TIME) {
    gridCacheMap.delete(cacheId);
  }

  // 检查缓存是否有效（参数容差匹配）
  let values: Float32Array;
  if (cached &&
      cached.gridSize === gridSize &&
      paramsApproxEqual(cached.params, params, 0.005) &&
      Math.abs(cached.viewPort.xMin - viewPort.xMin) < 0.01 &&
      Math.abs(cached.viewPort.xMax - viewPort.xMax) < 0.01 &&
      Math.abs(cached.viewPort.yMin - viewPort.yMin) < 0.01 &&
      Math.abs(cached.viewPort.yMax - viewPort.yMax) < 0.01) {
    // 缓存命中，直接使用
    values = cached.values;
    cached.lastAccess = now;
  } else {
    // 缓存未命中，重新计算
    values = computeGridValues(fn, viewPort, gridSize);
    gridCacheMap.set(cacheId, {
      values,
      gridSize,
      viewPort: { ...viewPort },
      params: { ...params },
      lastAccess: now,
    });
  }

  return extractSegmentsFromGrid(values, viewPort, gridSize);
}

// ============================================
// 高性能区间采样核心算法
// ============================================

/**
 * 基于区间算术的自适应采样（优化版）
 */
export function intervalMarchingSquares(
  fn: (x: number, y: number) => number,
  viewPort: ViewPort,
  pixelWidth: number,
  pixelHeight: number,
  preset: SamplePreset = 'normal'
): ContourSegment[] {
  const segments: ContourSegment[] = [];

  // 获取精度预设
  const { maxDepth, minPixelSize, cellMultiplier } = IMPLICIT_SAMPLE_PRESETS[preset];

  // 计算单元格大小
  const cellWidth = (viewPort.xMax - viewPort.xMin) / pixelWidth;
  const cellHeight = (viewPort.yMax - viewPort.yMin) / pixelHeight;
  const initialCellSize = Math.max(cellWidth, cellHeight) * cellMultiplier;
  const minCellSize = minPixelSize / pixelWidth * (viewPort.xMax - viewPort.xMin);

  // 使用栈代替递归，避免调用栈溢出和函数调用开销
  const cellStack: Array<{ x: number; y: number; w: number; h: number; d: number }> = [];

  // 初始网格
  for (let x = viewPort.xMin; x < viewPort.xMax; x += initialCellSize) {
    for (let y = viewPort.yMin; y < viewPort.yMax; y += initialCellSize) {
      const w = Math.min(initialCellSize, viewPort.xMax - x);
      const h = Math.min(initialCellSize, viewPort.yMax - y);
      cellStack.push({ x, y, w, h, d: 0 });
    }
  }

  // 处理每个单元格
  while (cellStack.length > 0) {
    const cell = cellStack.pop()!;
    const { x, y, w, h, d } = cell;

    // 采样四个角点
    const v0 = fn(x, y);
    const v1 = fn(x + w, y);
    const v2 = fn(x + w, y + h);
    const v3 = fn(x, y + h);

    // 早期退出：检查是否有无效值
    if (!isFinite(v0) || !isFinite(v1) || !isFinite(v2) || !isFinite(v3)) {
      if (d < maxDepth && w > minCellSize) {
        // 细分
        const hw = w / 2, hh = h / 2;
        cellStack.push({ x, y, w: hw, h: hh, d: d + 1 });
        cellStack.push({ x: x + hw, y, w: hw, h: hh, d: d + 1 });
        cellStack.push({ x, y: y + hh, w: hw, h: hh, d: d + 1 });
        cellStack.push({ x: x + hw, y: y + hh, w: hw, h: hh, d: d + 1 });
      }
      continue;
    }

    // 早期退出：四个角点同符号，曲线不穿过
    const sign0 = v0 >= 0;
    if (sign0 === (v1 >= 0) && sign0 === (v2 >= 0) && sign0 === (v3 >= 0)) {
      continue;
    }

    // 检查是否需要细分
    const range = Math.max(v0, v1, v2, v3) - Math.min(v0, v1, v2, v3);
    if (d < maxDepth && w > minCellSize && range > 0.1) {
      // 细分
      const hw = w / 2, hh = h / 2;
      cellStack.push({ x, y, w: hw, h: hh, d: d + 1 });
      cellStack.push({ x: x + hw, y, w: hw, h: hh, d: d + 1 });
      cellStack.push({ x, y: y + hh, w: hw, h: hh, d: d + 1 });
      cellStack.push({ x: x + hw, y: y + hh, w: hw, h: hh, d: d + 1 });
      continue;
    }

    // Marching Squares 提取线段
    extractSegment(fn, cell, segments);
  }

  return segments;
}

/**
 * Marching Squares 线段提取（内联优化）
 */
function extractSegment(
  fn: (x: number, y: number) => number,
  cell: { x: number; y: number; w: number; h: number },
  segments: ContourSegment[]
): void {
  const { x, y, w, h } = cell;

  // 重新计算角点值
  const v0 = fn(x, y);
  const v1 = fn(x + w, y);
  const v2 = fn(x + w, y + h);
  const v3 = fn(x, y + h);

  // 跳过无效值
  if (!isFinite(v0) || !isFinite(v1) || !isFinite(v2) || !isFinite(v3)) return;

  // 计算情况索引
  const caseIndex = (v0 >= 0 ? 8 : 0) | (v1 >= 0 ? 4 : 0) | (v2 >= 0 ? 2 : 0) | (v3 >= 0 ? 1 : 0);

  // 情况表：边的配对
  const CASE_TABLE: Array<Array<[number, number]> | null> = [
    null, [[2, 3]], [[1, 2]], [[1, 3]],
    [[0, 1]], [[0, 1], [2, 3]], [[0, 2]], [[0, 3]],
    [[0, 3]], [[0, 2]], [[0, 1], [2, 3]], [[0, 1]],
    [[1, 3]], [[1, 2]], [[2, 3]], null,
  ];

  const edges = CASE_TABLE[caseIndex];
  if (!edges) return;

  for (const [e1, e2] of edges) {
    const p1 = getEdgePoint(fn, e1, x, y, w, h, v0, v1, v2, v3);
    const p2 = getEdgePoint(fn, e2, x, y, w, h, v0, v1, v2, v3);
    if (p1 && p2) {
      segments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    }
  }
}

/**
 * 边上插值点计算
 */
function getEdgePoint(
  _fn: (x: number, y: number) => number,
  edge: number,
  x: number,
  y: number,
  w: number,
  h: number,
  v0: number,
  v1: number,
  v2: number,
  v3: number
): { x: number; y: number } | null {
  // 边定义：0-底边, 1-右边, 2-顶边, 3-左边
  switch (edge) {
    case 0: { // 底边 v0→v1
      if (v0 * v1 >= 0) return null;
      const t = v0 / (v0 - v1);
      return { x: x + t * w, y };
    }
    case 1: { // 右边 v1→v2
      if (v1 * v2 >= 0) return null;
      const t = v1 / (v1 - v2);
      return { x: x + w, y: y + t * h };
    }
    case 2: { // 顶边 v2→v3
      if (v2 * v3 >= 0) return null;
      const t = v2 / (v2 - v3);
      return { x: x + (1 - t) * w, y: y + h };
    }
    case 3: { // 左边 v3→v0
      if (v3 * v0 >= 0) return null;
      const t = v3 / (v3 - v0);
      return { x, y: y + (1 - t) * h };
    }
    default:
      return null;
  }
}

// ============================================
// 缓存系统
// ============================================

interface IntervalCache {
  viewPort: ViewPort;
  pixelWidth: number;
  pixelHeight: number;
  segments: ContourSegment[];
  timestamp: number;
}

class IntervalCacheManager {
  private cache = new Map<string, IntervalCache>();
  private maxSize = 30;

  get(
    cacheId: string,
    viewPort: ViewPort,
    pixelWidth: number,
    pixelHeight: number
  ): ContourSegment[] | null {
    const cached = this.cache.get(cacheId);
    if (!cached) return null;

    // 检查视口是否匹配
    const tolerance = 0.1;
    const vpMatch =
      Math.abs(cached.viewPort.xMin - viewPort.xMin) < tolerance &&
      Math.abs(cached.viewPort.xMax - viewPort.xMax) < tolerance &&
      Math.abs(cached.viewPort.yMin - viewPort.yMin) < tolerance &&
      Math.abs(cached.viewPort.yMax - viewPort.yMax) < tolerance;

    if (!vpMatch) return null;
    if (cached.pixelWidth !== pixelWidth || cached.pixelHeight !== pixelHeight) return null;

    cached.timestamp = Date.now();
    return cached.segments;
  }

  set(
    cacheId: string,
    viewPort: ViewPort,
    pixelWidth: number,
    pixelHeight: number,
    segments: ContourSegment[]
  ): void {
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(cacheId, {
      viewPort: { ...viewPort },
      pixelWidth,
      pixelHeight,
      segments,
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

export const intervalCacheManager = new IntervalCacheManager();

/**
 * 带缓存的区间采样
 */
export function cachedIntervalMarchingSquares(
  fn: (x: number, y: number) => number,
  viewPort: ViewPort,
  pixelWidth: number,
  pixelHeight: number,
  cacheId?: string,
  preset: SamplePreset = 'normal'
): ContourSegment[] {
  const fullCacheId = cacheId ? `${cacheId}-${preset}` : undefined;

  if (fullCacheId) {
    const cached = intervalCacheManager.get(fullCacheId, viewPort, pixelWidth, pixelHeight);
    if (cached) return cached;
  }

  const segments = intervalMarchingSquares(fn, viewPort, pixelWidth, pixelHeight, preset);

  if (fullCacheId) {
    intervalCacheManager.set(fullCacheId, viewPort, pixelWidth, pixelHeight, segments);
  }

  return segments;
}

// ============================================
// 路径连接（用于平滑渲染）
// ============================================

/**
 * 连接线段成连续路径
 */
export function connectSegmentsSmooth(
  segments: ContourSegment[],
  _smoothThreshold: number = 0.05
): Array<Array<{ x: number; y: number }>> {
  if (segments.length === 0) return [];

  const adjacency = new Map<string, Array<{ x: number; y: number }>>();

  for (const seg of segments) {
    const p1 = { x: seg.x1, y: seg.y1 };
    const p2 = { x: seg.x2, y: seg.y2 };
    const key1 = `${p1.x.toFixed(6)},${p1.y.toFixed(6)}`;
    const key2 = `${p2.x.toFixed(6)},${p2.y.toFixed(6)}`;

    if (!adjacency.has(key1)) adjacency.set(key1, []);
    if (!adjacency.has(key2)) adjacency.set(key2, []);

    adjacency.get(key1)!.push(p2);
    adjacency.get(key2)!.push(p1);
  }

  const visited = new Set<string>();
  const paths: Array<Array<{ x: number; y: number }>> = [];

  for (const [key, neighbors] of adjacency) {
    if (neighbors.length === 1 && !visited.has(key)) {
      const path = buildPath(key, adjacency, visited);
      if (path.length >= 2) paths.push(path);
    }
  }

  for (const [key, neighbors] of adjacency) {
    if (!visited.has(key) && neighbors.length >= 2) {
      const path = buildPath(key, adjacency, visited);
      if (path.length >= 2) paths.push(path);
    }
  }

  return paths;
}

function buildPath(
  startKey: string,
  adjacency: Map<string, Array<{ x: number; y: number }>>,
  visited: Set<string>
): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  let currentKey = startKey;

  while (currentKey && !visited.has(currentKey)) {
    visited.add(currentKey);
    const [x, y] = currentKey.split(',').map(Number);
    path.push({ x, y });

    const neighbors = adjacency.get(currentKey) || [];
    let foundNext = false;

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x.toFixed(6)},${neighbor.y.toFixed(6)}`;
      if (!visited.has(neighborKey)) {
        currentKey = neighborKey;
        foundNext = true;
        break;
      }
    }

    if (!foundNext) break;
  }

  return path;
}

/**
 * Catmull-Rom 样条插值
 */
export function catmullRomSpline(
  points: Array<{ x: number; y: number }>,
  segments: number = 8
): Array<{ x: number; y: number }> {
  if (points.length < 2) return points;
  if (points.length === 2) return points;

  const result: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let t = 0; t < segments; t++) {
      const s = t / segments;
      const s2 = s * s;
      const s3 = s2 * s;

      const x = 0.5 * (2 * p1.x + (-p0.x + p2.x) * s +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3);

      const y = 0.5 * (2 * p1.y + (-p0.y + p2.y) * s +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3);

      result.push({ x, y });
    }
  }

  result.push(points[points.length - 1]);
  return result;
}

// ============================================
// 兼容性导出（区间函数创建，保留但不使用）
// ============================================

export function createIntervalFunction(
  fn: (x: number, y: number) => number
): (x: { lo: number; hi: number }, y: { lo: number; hi: number }) => { lo: number; hi: number } {
  return (xInterval, yInterval) => {
    // 简化为四角点采样
    const v00 = fn(xInterval.lo, yInterval.lo);
    const v10 = fn(xInterval.hi, yInterval.lo);
    const v11 = fn(xInterval.hi, yInterval.hi);
    const v01 = fn(xInterval.lo, yInterval.hi);

    const values = [v00, v10, v11, v01].filter(isFinite);
    if (values.length === 0) {
      return new Interval(-1e10, 1e10);
    }

    return new Interval(Math.min(...values), Math.max(...values));
  };
}
