// src/lib/implicitKeyPointDetector.ts
/**
 * 隐函数关键点检测器
 *
 * 隐函数 F(x,y) = 0 的关键点检测方法：
 * 1. 从采样的线段中提取所有点
 * 2. 检测 y 极值点（垂直切线）
 * 3. 检测 x 极值点（水平切线）
 * 4. 检测自交点
 * 5. 检测边界点
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
  viewPort: { xMin: number; xMax: number; yMin: number; yMax: number }
): KeyPoint[] {
  if (segments.length === 0) return [];

  const keyPoints: KeyPoint[] = [];

  // 从线段提取所有点
  const points = extractPointsFromSegments(segments);

  if (points.length < 3) return [];

  // 检测 y 极值点（局部最大/最小 y 值）
  detectYExtrema(points, functionId, keyPoints);

  // 检测 x 极值点（局部最大/最小 x 值）
  detectXExtrema(points, functionId, keyPoints);

  // 检测边界点（曲线与视口边界的交点）
  detectBoundaryPoints(points, functionId, viewPort, keyPoints);

  // 检测自交点
  detectSelfIntersections(segments, functionId, keyPoints);

  return deduplicateKeyPoints(keyPoints);
}

/**
 * 从线段提取所有点
 */
function extractPointsFromSegments(segments: ContourSegment[]): Point[] {
  const points: Point[] = [];
  const seen = new Set<string>();

  for (const seg of segments) {
    const key1 = `${seg.x1.toFixed(6)},${seg.y1.toFixed(6)}`;
    const key2 = `${seg.x2.toFixed(6)},${seg.y2.toFixed(6)}`;

    if (!seen.has(key1)) {
      points.push({ x: seg.x1, y: seg.y1 });
      seen.add(key1);
    }
    if (!seen.has(key2)) {
      points.push({ x: seg.x2, y: seg.y2 });
      seen.add(key2);
    }
  }

  // 按 x 排序（用于后续分析）
  points.sort((a, b) => a.x - b.x);

  return points;
}

/**
 * 检测 y 极值点（垂直切线点）
 * 这些点在曲线上 y 值达到局部最大或最小
 */
function detectYExtrema(
  points: Point[],
  functionId: string,
  keyPoints: KeyPoint[]
): void {
  const tolerance = 0.01;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // 检查是否为局部 y 极值
    const isYMax = curr.y > prev.y + tolerance && curr.y > next.y + tolerance;
    const isYMin = curr.y < prev.y - tolerance && curr.y < next.y - tolerance;

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
 * 检测 x 极值点（水平切线点）
 * 这些点在曲线上 x 值达到局部最大或最小
 */
function detectXExtrema(
  points: Point[],
  functionId: string,
  keyPoints: KeyPoint[]
): void {
  const tolerance = 0.01;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    // 检查是否为局部 x 极值（水平切线点）
    const isXMax = curr.x > prev.x + tolerance && curr.x > next.x + tolerance;
    const isXMin = curr.x < prev.x - tolerance && curr.x < next.x - tolerance;

    // x 极值点对应 y 的极大值或极小值
    if (isXMax || isXMin) {
      // 这些点也是特殊的，可以用拐点标记
      // 但为了避免重复，只在不是 y 极值时添加
      const isYExtreme = keyPoints.some(
        kp => kp.type === 'maximum' || kp.type === 'minimum'
      ) && (Math.abs(curr.y - prev.y) < tolerance || Math.abs(curr.y - next.y) < tolerance);

      if (!isYExtreme && (isXMax || isXMin)) {
        // 标记为拐点（表示方向改变）
        keyPoints.push({
          type: 'inflection',
          x: curr.x,
          y: curr.y,
          functionId,
        });
      }
    }
  }
}

/**
 * 检测边界点（曲线与视口边界的交点）
 */
function detectBoundaryPoints(
  points: Point[],
  functionId: string,
  viewPort: { xMin: number; xMax: number; yMin: number; yMax: number },
  keyPoints: KeyPoint[]
): void {
  const boundaryTolerance = (viewPort.xMax - viewPort.xMin) * 0.02;

  for (const p of points) {
    const isOnBoundary =
      Math.abs(p.x - viewPort.xMin) < boundaryTolerance ||
      Math.abs(p.x - viewPort.xMax) < boundaryTolerance ||
      Math.abs(p.y - viewPort.yMin) < boundaryTolerance ||
      Math.abs(p.y - viewPort.yMax) < boundaryTolerance;

    if (isOnBoundary) {
      // 检查是否已经存在关键点
      const exists = keyPoints.some(
        kp => Math.abs(kp.x - p.x) < 0.1 && Math.abs(kp.y - p.y) < 0.1
      );

      if (!exists) {
        // 边界点用不连续点类型表示（因为它可能不在视口内完整显示）
        keyPoints.push({
          type: 'discontinuity',
          x: p.x,
          y: p.y,
          functionId,
        });
      }
    }
  }
}

/**
 * 检测自交点（曲线与自身相交）
 */
function detectSelfIntersections(
  segments: ContourSegment[],
  functionId: string,
  keyPoints: KeyPoint[]
): void {
  const tolerance = 0.05;

  // 简单检测：检查非相邻线段是否相交
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 2; j < segments.length; j++) {
      const seg1 = segments[i];
      const seg2 = segments[j];

      const intersection = lineSegmentIntersection(
        seg1.x1, seg1.y1, seg1.x2, seg1.y2,
        seg2.x1, seg2.y1, seg2.x2, seg2.y2
      );

      if (intersection) {
        // 检查是否已经存在附近的关键点
        const exists = keyPoints.some(
          kp => Math.abs(kp.x - intersection.x) < tolerance && Math.abs(kp.y - intersection.y) < tolerance
        );

        if (!exists) {
          keyPoints.push({
            type: 'zero', // 自交点用零点类型表示
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

  if (Math.abs(denom) < 1e-10) return null; // 平行或重合

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
function deduplicateKeyPoints(points: KeyPoint[], minDistance: number = 0.15): KeyPoint[] {
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
