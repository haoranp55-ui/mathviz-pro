// src/components/Canvas/KeyPointRenderer.ts
import type { KeyPoint, ViewPort, CanvasSize, KeyPointType, AspectRatioMode } from '../../types';
import { KEY_POINT_STYLES } from '../../types';
import { createScales } from '../../lib/transformer';

const MARKER_SIZE = 8;
const TOOLTIP_PADDING = 10;
const LINE_HEIGHT = 20;

// 根据类型绘制不同形状
function drawMarker(
  ctx: CanvasRenderingContext2D,
  type: KeyPointType,
  x: number,
  y: number,
  size: number,
  color: string
): void {
  ctx.save();

  // 发光效果
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  ctx.fillStyle = color;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;

  switch (type) {
    case 'zero':
      // 圆形
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;

    case 'maximum':
      // 向上三角形 ▲
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y + size * 0.7);
      ctx.lineTo(x - size, y + size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'minimum':
      // 向下三角形 ▼
      ctx.beginPath();
      ctx.moveTo(x, y + size);
      ctx.lineTo(x + size, y - size * 0.7);
      ctx.lineTo(x - size, y - size * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'inflection':
      // 菱形 ◆
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;

    case 'discontinuity':
      // 双竖线 ║
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 3, y - size);
      ctx.lineTo(x - 3, y + size);
      ctx.moveTo(x + 3, y - size);
      ctx.lineTo(x + 3, y + size);
      ctx.stroke();
      break;
  }

  ctx.restore();
}

export function drawKeyPoints(
  ctx: CanvasRenderingContext2D,
  keyPoints: KeyPoint[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  for (const kp of keyPoints) {
    const style = KEY_POINT_STYLES[kp.type];
    const px = xScale(kp.x);
    const py = isFinite(kp.y) ? yScale(kp.y) : yScale(0);

    // 检查是否在画布范围内
    if (px < -50 || px > canvasSize.width + 50) continue;
    if (py < -50 || py > canvasSize.height + 50) continue;

    drawMarker(ctx, kp.type, px, py, MARKER_SIZE, style.color);
  }
}

export function drawKeyPointTooltip(
  ctx: CanvasRenderingContext2D,
  keyPoint: KeyPoint,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);
  const style = KEY_POINT_STYLES[keyPoint.type];

  const px = xScale(keyPoint.x);
  const py = isFinite(keyPoint.y) ? yScale(keyPoint.y) : yScale(0);

  ctx.save();

  // 第一行：类型标签
  ctx.font = 'bold 11px sans-serif';
  const typeText = style.label;
  const typeWidth = ctx.measureText(typeText).width;

  // 第二行：坐标
  ctx.font = '12px monospace';
  const coordText = `(${keyPoint.x.toFixed(3)}, ${isFinite(keyPoint.y) ? keyPoint.y.toFixed(3) : '—'})`;
  const coordWidth = ctx.measureText(coordText).width;

  const padding = TOOLTIP_PADDING;
  const boxWidth = Math.max(typeWidth, coordWidth) + padding * 2;
  const boxHeight = LINE_HEIGHT * 2 + padding * 2;

  // 计算提示框位置
  let boxX = px + 18;
  let boxY = py - boxHeight / 2;

  if (boxX + boxWidth > canvasSize.width - 10) boxX = px - boxWidth - 18;
  if (boxY < 10) boxY = 10;
  if (boxY + boxHeight > canvasSize.height - 10) boxY = canvasSize.height - boxHeight - 10;

  // 发光边框
  ctx.shadowColor = style.color;
  ctx.shadowBlur = 12;

  // 绘制背景
  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6);
  ctx.fill();

  // 关闭发光绘制边框
  ctx.shadowBlur = 0;
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 绘制类型标签（左上角彩色小块）
  ctx.fillStyle = style.color;
  ctx.beginPath();
  ctx.roundRect(boxX + padding, boxY + padding, 4, LINE_HEIGHT - 4, 2);
  ctx.fill();

  // 绘制类型文字
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = style.color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(typeText, boxX + padding + 10, boxY + padding + LINE_HEIGHT / 2);

  // 绘制坐标
  ctx.font = '12px monospace';
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(coordText, boxX + padding, boxY + padding + LINE_HEIGHT * 1.5);

  ctx.restore();
}

// 检测鼠标是否悬停在关键点上
export function findHoveredKeyPoint(
  px: number,
  py: number,
  keyPoints: KeyPoint[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal',
  threshold: number = 12
): KeyPoint | null {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  for (const kp of keyPoints) {
    const kpx = xScale(kp.x);
    const kpy = isFinite(kp.y) ? yScale(kp.y) : yScale(0);

    const distance = Math.sqrt(Math.pow(px - kpx, 2) + Math.pow(py - kpy, 2));
    if (distance < threshold) {
      return kp;
    }
  }

  return null;
}
