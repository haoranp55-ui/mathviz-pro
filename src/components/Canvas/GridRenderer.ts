// src/components/Canvas/GridRenderer.ts
import type { ViewPort, CanvasSize, AspectRatioMode } from '../../types';
import { createScales, calculateTickInterval, generateTicks } from '../../lib/transformer';

const GRID_COLOR = '#475569';
const AXIS_COLOR = '#94A3B8';
const TICK_LABEL_COLOR = '#CBD5E1';
const TICK_LABEL_FONT = '11px JetBrains Mono, monospace';

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  // 在 equal 模式下，需要扩展刻度范围以覆盖整个画布
  let extendedXMin = viewPort.xMin;
  let extendedXMax = viewPort.xMax;
  let extendedYMin = viewPort.yMin;
  let extendedYMax = viewPort.yMax;

  if (aspectRatioMode === 'equal') {
    // 计算画布边缘对应的数学坐标
    const xMinPixel = 0;
    const xMaxPixel = canvasSize.width;
    const yMinPixel = canvasSize.height;
    const yMaxPixel = 0;

    extendedXMin = Math.min(extendedXMin, xScale.invert(xMinPixel));
    extendedXMax = Math.max(extendedXMax, xScale.invert(xMaxPixel));
    extendedYMin = Math.min(extendedYMin, yScale.invert(yMinPixel));
    extendedYMax = Math.max(extendedYMax, yScale.invert(yMaxPixel));
  }

  // 计算刻度间隔
  const xInterval = calculateTickInterval(extendedXMin, extendedXMax);
  const yInterval = calculateTickInterval(extendedYMin, extendedYMax);

  // 生成扩展范围的刻度值
  const xTicks = generateTicks(extendedXMin, extendedXMax, xInterval);
  const yTicks = generateTicks(extendedYMin, extendedYMax, yInterval);

  ctx.save();

  // 绘制网格线
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([]);

  // 垂直网格线
  for (const x of xTicks) {
    const px = xScale(x);
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, canvasSize.height);
    ctx.stroke();
  }

  // 水平网格线
  for (const y of yTicks) {
    const py = yScale(y);
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(canvasSize.width, py);
    ctx.stroke();
  }

  // 绘制坐标轴
  ctx.strokeStyle = AXIS_COLOR;
  ctx.lineWidth = 1.5;

  // X轴
  const xAxisY = yScale(0);
  if (xAxisY >= 0 && xAxisY <= canvasSize.height) {
    ctx.beginPath();
    ctx.moveTo(0, xAxisY);
    ctx.lineTo(canvasSize.width, xAxisY);
    ctx.stroke();
  }

  // Y轴
  const yAxisX = xScale(0);
  if (yAxisX >= 0 && yAxisX <= canvasSize.width) {
    ctx.beginPath();
    ctx.moveTo(yAxisX, 0);
    ctx.lineTo(yAxisX, canvasSize.height);
    ctx.stroke();
  }

  // 绘制刻度标签
  ctx.fillStyle = TICK_LABEL_COLOR;
  ctx.font = TICK_LABEL_FONT;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';

  // X轴刻度标签（只在视口范围内显示）
  const labelY = Math.min(Math.max(xAxisY + 5, 5), canvasSize.height - 15);
  for (const x of xTicks) {
    if (Math.abs(x) < 1e-10) continue; // 跳过原点
    // 只显示视口范围内的刻度标签
    if (x < viewPort.xMin || x > viewPort.xMax) continue;
    const px = xScale(x);
    if (px >= 20 && px <= canvasSize.width - 20) {
      ctx.fillText(formatNumber(x), px, labelY);
    }
  }

  // Y轴刻度标签（只在视口范围内显示）
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const labelX = Math.min(Math.max(yAxisX - 5, 30), canvasSize.width - 5);
  for (const y of yTicks) {
    if (Math.abs(y) < 1e-10) continue; // 跳过原点
    // 只显示视口范围内的刻度标签
    if (y < viewPort.yMin || y > viewPort.yMax) continue;
    const py = yScale(y);
    if (py >= 15 && py <= canvasSize.height - 15) {
      ctx.fillText(formatNumber(y), labelX, py);
    }
  }

  ctx.restore();
}

// 格式化数字显示
function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000 || (Math.abs(n) < 0.01 && n !== 0)) {
    return n.toExponential(1);
  }
  // 避免浮点误差
  return parseFloat(n.toPrecision(10)).toString();
}
