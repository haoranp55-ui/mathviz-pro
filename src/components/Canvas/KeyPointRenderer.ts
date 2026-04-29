// src/components/Canvas/KeyPointRenderer.ts
import type { KeyPoint, ViewPort, CanvasSize } from '../../types';
import { KEY_POINT_STYLES } from '../../types';
import { createScales } from '../../lib/transformer';

const MARKER_RADIUS = 6;
const TOOLTIP_PADDING = 8;
const LINE_HEIGHT = 18;

export function drawKeyPoints(
  ctx: CanvasRenderingContext2D,
  keyPoints: KeyPoint[],
  viewPort: ViewPort,
  canvasSize: CanvasSize
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize);

  for (const kp of keyPoints) {
    const style = KEY_POINT_STYLES[kp.type];
    const px = xScale(kp.x);
    const py = isFinite(kp.y) ? yScale(kp.y) : yScale(0);

    // 检查是否在画布范围内
    if (px < -50 || px > canvasSize.width + 50) continue;
    if (py < -50 || py > canvasSize.height + 50) continue;

    ctx.save();

    // 绘制外圈
    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.arc(px, py, MARKER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // 绘制白色内圈
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(px, py, MARKER_RADIUS - 2, 0, Math.PI * 2);
    ctx.fill();

    // 绘制中心点
    ctx.fillStyle = style.color;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

export function drawKeyPointTooltip(
  ctx: CanvasRenderingContext2D,
  keyPoint: KeyPoint,
  viewPort: ViewPort,
  canvasSize: CanvasSize
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize);
  const style = KEY_POINT_STYLES[keyPoint.type];

  const px = xScale(keyPoint.x);
  const py = isFinite(keyPoint.y) ? yScale(keyPoint.y) : yScale(0);

  // 构建文字
  const lines = [
    `类型: ${style.label}`,
    `坐标: (${keyPoint.x.toFixed(3)}, ${isFinite(keyPoint.y) ? keyPoint.y.toFixed(3) : '未定义'})`,
  ];

  ctx.save();
  ctx.font = '12px sans-serif';

  const padding = TOOLTIP_PADDING;
  const maxWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
  const boxWidth = maxWidth + padding * 2;
  const boxHeight = lines.length * LINE_HEIGHT + padding * 2;

  // 计算提示框位置
  let boxX = px + 15;
  let boxY = py - boxHeight / 2;

  if (boxX + boxWidth > canvasSize.width - 10) boxX = px - boxWidth - 15;
  if (boxY < 10) boxY = 10;
  if (boxY + boxHeight > canvasSize.height - 10) boxY = canvasSize.height - boxHeight - 10;

  // 绘制背景
  ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
  ctx.fill();

  // 绘制边框
  ctx.strokeStyle = style.color;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 绘制文字
  ctx.fillStyle = '#F1F5F9';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    ctx.fillText(line, boxX + padding, boxY + padding + i * LINE_HEIGHT);
  });

  ctx.restore();
}

// 检测鼠标是否悬停在关键点上
export function findHoveredKeyPoint(
  px: number,
  py: number,
  keyPoints: KeyPoint[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  threshold: number = 12
): KeyPoint | null {
  const { xScale, yScale } = createScales(viewPort, canvasSize);

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
