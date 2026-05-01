// src/components/Canvas/ImplicitCurveRenderer.ts
import type { ContourSegment, ViewPort, CanvasSize, AspectRatioMode } from '../../types';
import { createScales } from '../../lib/transformer';
import {
  connectSegmentsSmooth,
  catmullRomSpline
} from '../../lib/implicitSamplerInterval';

const CURVE_LINE_WIDTH = 2.5;

/**
 * 绘制隐函数曲线（平滑版本）
 *
 * 使用 Catmull-Rom 样条插值生成平滑曲线
 */
export function drawImplicitCurve(
  ctx: CanvasRenderingContext2D,
  segments: ContourSegment[],
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'equal'
): void {
  if (segments.length === 0) return;

  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = CURVE_LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 发光效果
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;

  // 将线段连接成连续路径
  const paths = connectSegmentsSmooth(segments);

  for (const pathPoints of paths) {
    if (pathPoints.length < 2) continue;

    // 使用 Catmull-Rom 样条平滑
    const smoothPoints = catmullRomSpline(pathPoints, 8);

    ctx.beginPath();

    let started = false;
    for (const point of smoothPoints) {
      const px = xScale(point.x);
      const py = yScale(point.y);

      // 跳过超出画布太多的点（只检查 X 方向）
      if (px < -1000 || px > canvasSize.width + 1000) {
        continue;
      }

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  }

  // 清除阴影再画一遍增强
  ctx.shadowBlur = 0;

  for (const pathPoints of paths) {
    if (pathPoints.length < 2) continue;

    const smoothPoints = catmullRomSpline(pathPoints, 8);

    ctx.beginPath();

    let started = false;
    for (const point of smoothPoints) {
      const px = xScale(point.x);
      const py = yScale(point.y);

      if (px < -1000 || px > canvasSize.width + 1000) {
        continue;
      }

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 绘制隐函数曲线（简单版本，直接绘制线段）
 */
export function drawImplicitCurveSimple(
  ctx: CanvasRenderingContext2D,
  segments: ContourSegment[],
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'equal'
): void {
  if (segments.length === 0) return;

  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = CURVE_LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();

  for (const seg of segments) {
    const px1 = xScale(seg.x1);
    const py1 = yScale(seg.y1);
    const px2 = xScale(seg.x2);
    const py2 = yScale(seg.y2);

    // 只检查 X 方向
    if (
      (px1 < -100 || px1 > canvasSize.width + 100) &&
      (px2 < -100 || px2 > canvasSize.width + 100)
    ) {
      continue;
    }

    ctx.moveTo(px1, py1);
    ctx.lineTo(px2, py2);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * 绘制连接成路径的隐函数曲线
 */
export function drawImplicitCurvePaths(
  ctx: CanvasRenderingContext2D,
  paths: ContourSegment[][],
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'equal'
): void {
  if (paths.length === 0) return;

  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = CURVE_LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const path of paths) {
    if (path.length === 0) continue;

    ctx.beginPath();

    let started = false;
    for (const seg of path) {
      const px1 = xScale(seg.x1);
      const py1 = yScale(seg.y1);
      const px2 = xScale(seg.x2);
      const py2 = yScale(seg.y2);

      if (!started) {
        ctx.moveTo(px1, py1);
        started = true;
      }
      ctx.lineTo(px2, py2);
    }

    ctx.stroke();
  }

  ctx.restore();
}

/**
 * 绘制隐函数曲线（带发光效果）
 */
export function drawImplicitCurveWithGlow(
  ctx: CanvasRenderingContext2D,
  segments: ContourSegment[],
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'equal'
): void {
  if (segments.length === 0) return;

  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  ctx.save();

  // 发光效果
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = CURVE_LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 使用平滑路径
  const paths = connectSegmentsSmooth(segments);

  for (const pathPoints of paths) {
    if (pathPoints.length < 2) continue;

    const smoothPoints = catmullRomSpline(pathPoints, 8);

    ctx.beginPath();

    let started = false;
    for (const point of smoothPoints) {
      const px = xScale(point.x);
      const py = yScale(point.y);

      // 只检查 X 方向
      if (px < -1000 || px > canvasSize.width + 1000) {
        continue;
      }

      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }

    ctx.stroke();
  }

  ctx.restore();
}
