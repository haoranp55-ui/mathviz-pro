// src/lib/implicitKeyPointDetector.ts
/**
 * 隐函数关键点检测器
 *
 * 隐函数 F(x,y) = 0 的关键点检测方法：
 * 1. 构建连续路径（保持点在曲线上的顺序）
 * 2. 检测 y 极值点（水平切线）
 * 3. 检测 x 极值点（垂直切线）
 * 4. 检测自交点
 */

import type { KeyPoint, ContourSegment } from '../types';

interface Point {
  x: number;
  y: number;
}

/**
 * 检测隐函数的关键点
 */
export function detectImplicitKeyPoints(
  segments: ContourSegment[],
  functionId: string,
  _viewPort: { xMin: number; xMax: number; yMin: number; yMax: number }
): KeyPoint[] {
  if (segments.length === 0) return [];

  const keyPoints: KeyPoint[] = [];

  // 构建连续路径（关键：保持点的顺序！）
  const paths = buildConnectedPaths(segments);

  for (const path of paths) {
    if (path.length < 5) continue;

    // 检测 y 极值点（水平切线，即最高/最低点）
    detectYExtrema(path, functionId, keyPoints);

    // 检测 x 极值点（垂直切线，即最左/最右点）
    detectXExtrema(path, functionId, keyPoints);
  }

  // 检测自交点
  detectSelfIntersections(segments, functionId, keyPoints);

  return deduplicateKeyPoints(keyPoints);
}

/**
 * 从线段构建连续路径
 * 关键：保持点在曲线上的顺序！
 */
function buildConnectedPaths(segments: ContourSegment[]): Point[][] {
  if (segments.length === 0) return [];

  // 使用邻接表构建点的关系
  const adjacency = new Map<string, Point[]>();
  const pointMap = new Map<string, Point>();

  for (const seg of segments) {
    const p1 = { x: seg.x1, y: seg.y1 };
    const p2 = { x: seg.x2, y: seg.y2 };
    const key1 = pointKey(p1);
    const key2 = pointKey(p2);

    pointMap.set(key1, p1);
    pointMap.set(key2, p2);

    if (!adjacency.has(key1)) adjacency.set(key1, []);
    if (!adjacency.has(key2)) adjacency.set(key2, []);

    adjacency.get(key1)!.push(p2);
    adjacency.get(key2)!.push(p1);
  }

  // 找到端点（度数为1的点）作为起点
  const visited = new Set<string>();
  const paths: Point[][] = [];

  // 优先从端点开始
  const endpoints: string[] = [];
  for (const [key, neighbors] of adjacency) {
    if (neighbors.length === 1) {
      endpoints.push(key);
    }
  }

  // 从端点构建路径
  for (const startKey of endpoints) {
    if (visited.has(startKey)) continue;
    const path = tracePath(startKey, adjacency, visited);
    if (path.length >= 3) paths.push(path);
  }

  // 处理闭合曲线（没有端点的情况）
  for (const [key] of adjacency) {
    if (visited.has(key)) continue;
    const path = tracePath(key, adjacency, visited);
    if (path.length >= 3) paths.push(path);
  }

  return paths;
}

/**
 * 生成点的唯一键
 */
function pointKey(p: Point, precision: number = 4): string {
  return `${p.x.toFixed(precision)},${p.y.toFixed(precision)}`;
}

/**
 * 从起点追踪路径
 */
function tracePath(
  startKey: string,
  adjacency: Map<string, Point[]>,
  visited: Set<string>
): Point[] {
  const path: Point[] = [];
  const stack: string[] = [startKey];

  while (stack.length > 0) {
    const key = stack.pop()!;
    if (visited.has(key)) continue;

    visited.add(key);
    const neighbors = adjacency.get(key) || [];

    // 找到对应的点坐标
    const [x, y] = key.split(',').map(Number);
    path.push({ x, y });

    // 添加未访问的邻居
    for (const neighbor of neighbors) {
      const neighborKey = pointKey(neighbor);
      if (!visited.has(neighborKey)) {
        stack.push(neighborKey);
      }
    }
  }

  return path;
}

/**
 * 检测 y 极值点（水平切线点）
 * 这些点是曲线上 y 值达到局部最大或最小的点
 */
function detectYExtrema(
  path: Point[],
  functionId: string,
  keyPoints: KeyPoint[]
): void {
  if (path.length < 5) return;

  // 使用较大的容差，避免噪声
  const tolerance = 0.05;
  const range = getPathRange(path);
  const yThreshold = (range.yMax - range.yMin) * 0.1;

  for (let i = 2; i < path.length - 2; i++) {
    const prev2 = path[i - 2];
    const prev1 = path[i - 1];
    const curr = path[i];
    const next1 = path[i + 1];
    const next2 = path[i + 2];

    // 使用多点验证，确保是真正的极值点
    const isYMax =
      curr.y > prev1.y + tolerance &&
      curr.y > prev2.y + tolerance &&
      curr.y > next1.y + tolerance &&
      curr.y > next2.y + tolerance &&
      curr.y > range.yMin + yThreshold; // 确保是显著极值

    const isYMin =
      curr.y < prev1.y - tolerance &&
      curr.y < prev2.y - tolerance &&
      curr.y < next1.y - tolerance &&
      curr.y < next2.y - tolerance &&
      curr.y < range.yMax - yThreshold;

    if (isYMax) {
      keyPoints.push({
        type: 'maximum',
        x: curr.x,
        y: curr.y,
        functionId,
      });
    } else if (isYMin) {
      keyPoints.push({
        type: 'minimum',
        x: curr.x,
        y: curr.y,
        functionId,
      });
    }
  }
}

/**
 * 检测 x 极值点（垂直切线点）
 * 这些点是曲线上 x 值达到局部最大或最小的点
 */
function detectXExtrema(
  path: Point[],
  functionId: string,
  keyPoints: KeyPoint[]
): void {
  if (path.length < 5) return;

  const tolerance = 0.05;
  const range = getPathRange(path);
  const xThreshold = (range.xMax - range.xMin) * 0.1;

  for (let i = 2; i < path.length - 2; i++) {
    const prev2 = path[i - 2];
    const prev1 = path[i - 1];
    const curr = path[i];
    const next1 = path[i + 1];
    const next2 = path[i + 2];

    // 检查是否为 x 极值点
    const isXMax =
      curr.x > prev1.x + tolerance &&
      curr.x > prev2.x + tolerance &&
      curr.x > next1.x + tolerance &&
      curr.x > next2.x + tolerance &&
      curr.x > range.xMin + xThreshold;

    const isXMin =
      curr.x < prev1.x - tolerance &&
      curr.x < prev2.x - tolerance &&
      curr.x < next1.x - tolerance &&
      curr.x < next2.x - tolerance &&
      curr.x < range.xMax - xThreshold;

    // 避免重复添加
    const alreadyExists = keyPoints.some(
      kp => Math.sqrt((kp.x - curr.x) ** 2 + (kp.y - curr.y) ** 2) < 0.1
    );

    if (!alreadyExists) {
      if (isXMax) {
        keyPoints.push({
          type: 'maximum',
          x: curr.x,
          y: curr.y,
          functionId,
        });
      } else if (isXMin) {
        keyPoints.push({
          type: 'minimum',
          x: curr.x,
          y: curr.y,
          functionId,
        });
      }
    }
  }
}

/**
 * 获取路径的范围
 */
function getPathRange(path: Point[]): { xMin: number; xMax: number; yMin: number; yMax: number } {
  let xMin = Infinity, xMax = -Infinity;
  let yMin = Infinity, yMax = -Infinity;

  for (const p of path) {
    xMin = Math.min(xMin, p.x);
    xMax = Math.max(xMax, p.x);
    yMin = Math.min(yMin, p.y);
    yMax = Math.max(yMax, p.y);
  }

  return { xMin, xMax, yMin, yMax };
}

/**
 * 检测自交点（曲线与自身相交）
 */
function detectSelfIntersections(
  segments: ContourSegment[],
  functionId: string,
  keyPoints: KeyPoint[]
): void {
  const tolerance = 0.1;

  // 只检查非相邻线段的相交
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 3; j < segments.length; j++) { // 跳过相邻线段
      const seg1 = segments[i];
      const seg2 = segments[j];

      const intersection = lineSegmentIntersection(
        seg1.x1, seg1.y1, seg1.x2, seg1.y2,
        seg2.x1, seg2.y1, seg2.x2, seg2.y2
      );

      if (intersection) {
        const exists = keyPoints.some(
          kp => Math.sqrt((kp.x - intersection.x) ** 2 + (kp.y - intersection.y) ** 2) < tolerance
        );

        if (!exists) {
          keyPoints.push({
            type: 'zero',
            x: intersection.x,
            y: intersection.y,
            functionId,
          });
        }
      }
    }
  }
}

/**
 * 计算两条线段的交点
 */
function lineSegmentIntersection(
  x1: number, y1: number, x2: number, y2: number,
  x3: number, y3: number, x4: number, y4: number
): Point | null {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 1e-10) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

/**
 * 去重：合并距离过近的关键点
 */
function deduplicateKeyPoints(points: KeyPoint[], minDistance: number = 0.2): KeyPoint[] {
  if (points.length === 0) return points;

  const result: KeyPoint[] = [];

  for (const p of points) {
    const isDuplicate = result.some(
      existing =>
        Math.sqrt((existing.x - p.x) ** 2 + (existing.y - p.y) ** 2) < minDistance
    );

    if (!isDuplicate) {
      result.push(p);
    }
  }

  return result;
}
