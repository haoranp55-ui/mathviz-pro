// src/components/Canvas/CurveRenderer.ts
import type { SampledPoints, ViewPort, CanvasSize, HoverPoint } from '../../types';
import { createScales } from '../../lib/transformer';

const CURVE_LINE_WIDTH = 2;
const HOVER_RADIUS = 6;

export function drawCurve(
  ctx: CanvasRenderingContext2D,
  points: SampledPoints,
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize);
  const { x, y } = points;
  const n = x.length;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = CURVE_LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let isDrawing = false;

  ctx.beginPath();

  for (let i = 0; i < n; i++) {
    const yi = y[i];

    // 只检查无效值，不再限制 Y 范围（让 Canvas 自己裁剪）
    if (!isFinite(yi)) {
      // 不连续点：结束当前路径
      if (isDrawing) {
        ctx.stroke();
        ctx.beginPath();
        isDrawing = false;
      }
      continue;
    }

    const px = xScale(x[i]);
    const py = yScale(yi);

    // 检查是否在画布范围内
    if (px < -100 || px > canvasSize.width + 100) {
      if (isDrawing) {
        ctx.stroke();
        ctx.beginPath();
        isDrawing = false;
      }
      continue;
    }

    if (!isDrawing) {
      ctx.moveTo(px, py);
      isDrawing = true;
    } else {
      ctx.lineTo(px, py);
    }
  }

  if (isDrawing) {
    ctx.stroke();
  }

  ctx.restore();
}

export function drawHoverPoint(
  ctx: CanvasRenderingContext2D,
  hoverPoint: HoverPoint,
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize);

  const px = xScale(hoverPoint.x);
  const py = yScale(hoverPoint.y);

  // 检查是否在画布范围内
  if (px < 0 || px > canvasSize.width || py < 0 || py > canvasSize.height) {
    return;
  }

  ctx.save();

  // 绘制十字准线
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // 水平线
  ctx.beginPath();
  ctx.moveTo(0, py);
  ctx.lineTo(canvasSize.width, py);
  ctx.stroke();

  // 垂直线
  ctx.beginPath();
  ctx.moveTo(px, 0);
  ctx.lineTo(px, canvasSize.height);
  ctx.stroke();

  ctx.setLineDash([]);

  // 绘制圆点
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, HOVER_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // 绘制白色内圈
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(px, py, HOVER_RADIUS - 2, 0, Math.PI * 2);
  ctx.fill();

  // 绘制中心点
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 绘制坐标提示框
export function drawCoordinateTooltip(
  ctx: CanvasRenderingContext2D,
  hoverPoint: HoverPoint,
  viewPort: ViewPort,
  canvasSize: CanvasSize
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize);

  const px = xScale(hoverPoint.x);
  const py = yScale(hoverPoint.y);

  const text = `(${hoverPoint.x.toFixed(3)}, ${hoverPoint.y.toFixed(3)})`;

  ctx.save();
  ctx.font = '12px monospace';

  const textWidth = ctx.measureText(text).width;
  const padding = 8;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = 24;

  // 计算提示框位置（避免超出画布）
  let boxX = px + 15;
  let boxY = py - boxHeight / 2;

  if (boxX + boxWidth > canvasSize.width - 10) {
    boxX = px - boxWidth - 15;
  }
  if (boxY < 10) {
    boxY = 10;
  }
  if (boxY + boxHeight > canvasSize.height - 10) {
    boxY = canvasSize.height - boxHeight - 10;
  }

  // 绘制背景
  ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  ctx.fill();

  // 绘制边框
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 绘制文字
  ctx.fillStyle = '#F1F5F9';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, boxX + padding, boxY + boxHeight / 2);

  ctx.restore();
}
