// src/components/Canvas/CurveRenderer.ts
import type { ViewPort, CanvasSize, AspectRatioMode, SampledPoints, HoverPoint, Integral } from '../../types';

// 渐近线斜率阈值
const ASYMPTOTE_SLOPE_THRESHOLD = 50000;

interface RenderScale {
  xScale: (x: number) => number;
  yScale: (y: number) => number;
}

function createScales(
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): RenderScale {
  const { xMin, xMax, yMin, yMax } = viewPort;
  const { width, height } = canvasSize;

  if (aspectRatioMode === 'equal') {
    const dataAspect = (xMax - xMin) / (yMax - yMin);
    const canvasAspect = width / height;

    if (dataAspect > canvasAspect) {
      const padding = (height - width / dataAspect) / 2;
      return {
        xScale: (x: number) => ((x - xMin) / (xMax - xMin)) * width,
        yScale: (y: number) => padding + ((yMax - y) / (yMax - yMin)) * (height - 2 * padding),
      };
    } else {
      const padding = (width - height * dataAspect) / 2;
      return {
        xScale: (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding),
        yScale: (y: number) => ((yMax - y) / (yMax - yMin)) * height,
      };
    }
  }

  return {
    xScale: (x: number) => ((x - xMin) / (xMax - xMin)) * width,
    yScale: (y: number) => ((yMax - y) / (yMax - yMin)) * height,
  };
}

interface CurveStyle {
  color: string;
  lineWidth: number;
  dashPattern?: number[];
  alpha?: number;
}

/**
 * 共享的曲线绘制核心：处理渐近线检测和路径断开
 */
function drawCurvePath(
  ctx: CanvasRenderingContext2D,
  points: SampledPoints,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  style: CurveStyle,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  if (points.x.length < 2) return;

  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  ctx.save();
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.lineWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = style.alpha ?? 1;
  if (style.dashPattern) {
    ctx.setLineDash(style.dashPattern);
  }

  const totalPoints = points.x.length;
  let isDrawing = false;

  ctx.beginPath();

  for (let i = 0; i < totalPoints; i++) {
    const x = points.x[i];
    const y = points.y[i];

    // 跳过 NaN/Infinity
    if (!isFinite(x) || !isFinite(y)) {
      isDrawing = false;
      continue;
    }

    const px = xScale(x);
    const py = yScale(y);

    if (!isDrawing) {
      ctx.moveTo(px, py);
      isDrawing = true;
      continue;
    }

    // 渐近线检测：斜率超过阈值则断开路径
    if (i > 0) {
      const prevY = points.y[i - 1];
      const prevX = points.x[i - 1];
      if (isFinite(prevX) && isFinite(prevY)) {
        const dy = Math.abs(y - prevY);
        const dx = Math.abs(x - prevX);
        if (dx > 0 && dy / dx > ASYMPTOTE_SLOPE_THRESHOLD) {
          ctx.moveTo(px, py);
          continue;
        }
        // 函数值跳变检测
        if (dy > 100 && dy / Math.max(Math.abs(y), Math.abs(prevY), 1) > 10) {
          ctx.moveTo(px, py);
          continue;
        }
      }
    }

    ctx.lineTo(px, py);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * 绘制函数曲线
 */
export function drawCurve(
  ctx: CanvasRenderingContext2D,
  points: SampledPoints,
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal',
  lineWidth: number = 2
): void {
  drawCurvePath(ctx, points, viewPort, canvasSize, { color, lineWidth }, aspectRatioMode);
}

/**
 * 绘制导数曲线
 */
export function drawDerivativeCurve(
  ctx: CanvasRenderingContext2D,
  points: SampledPoints,
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal',
  lineWidth: number = 1.5
): void {
  drawCurvePath(ctx, points, viewPort, canvasSize, {
    color,
    lineWidth,
    dashPattern: [6, 3],
    alpha: 0.7,
  }, aspectRatioMode);
}

/**
 * 绘制关键点标记
 */
export function drawKeyPoints(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number; type: string }>,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  const typeConfig: Record<string, { color: string; label: string }> = {
    zero: { color: '#10b981', label: '0' },
    maximum: { color: '#ef4444', label: 'M' },
    minimum: { color: '#3b82f6', label: 'm' },
    inflection: { color: '#f59e0b', label: 'I' },
    discontinuity: { color: '#8b5cf6', label: 'D' },
  };

  ctx.save();

  for (const point of points) {
    const config = typeConfig[point.type] || typeConfig.zero;
    const px = xScale(point.x);
    const py = yScale(point.y);

    if (px < -20 || px > canvasSize.width + 20 || py < -20 || py > canvasSize.height + 20) {
      continue;
    }

    // 外圈
    ctx.fillStyle = config.color;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fill();

    // 内圈
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    // 标签
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = config.color;
    ctx.fillText(config.label, px, py - 10);
  }

  ctx.restore();
}

/**
 * 绘制悬停点
 */
export function drawHoverPoint(
  ctx: CanvasRenderingContext2D,
  hoverPoint: HoverPoint | null,
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  if (!hoverPoint) return;

  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);
  const px = xScale(hoverPoint.x);
  const py = yScale(hoverPoint.y);

  ctx.save();

  // 十字线
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(px, 0);
  ctx.lineTo(px, canvasSize.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, py);
  ctx.lineTo(canvasSize.width, py);
  ctx.stroke();

  ctx.setLineDash([]);

  // 点
  ctx.fillStyle = color || '#3b82f6';
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();

  // 白色内圈
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, 2, 0, Math.PI * 2);
  ctx.fill();

  // 坐标文本
  const text = `(${hoverPoint.x.toFixed(3)}, ${hoverPoint.y.toFixed(3)})`;
  ctx.font = '11px monospace';
  const textWidth = ctx.measureText(text).width;
  const padding = 6;

  let textX = px + 12;
  let textY = py - 12;
  if (textX + textWidth + padding * 2 > canvasSize.width) textX = px - textWidth - padding * 2 - 12;
  if (textY < 20) textY = py + 20;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.beginPath();
  ctx.roundRect(textX - padding, textY - 14, textWidth + padding * 2, 22, 4);
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, textX, textY - 3);

  ctx.restore();
}

/**
 * 绘制积分面积
 */
export function drawIntegralArea(
  ctx: CanvasRenderingContext2D,
  fn: (x: number) => number,
  integral: Integral,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  const { lowerBound: x1, upperBound: x2, color } = integral;
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);
  const zeroY = yScale(0);

  // 采样积分区域内的函数值
  const steps = 200;
  const dx = (x2 - x1) / steps;

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.moveTo(xScale(x1), zeroY);

  for (let i = 0; i <= steps; i++) {
    const x = x1 + i * dx;
    const y = fn(x);
    if (!isFinite(x) || !isFinite(y)) continue;
    ctx.lineTo(xScale(x), yScale(y));
  }

  ctx.lineTo(xScale(x2), zeroY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}