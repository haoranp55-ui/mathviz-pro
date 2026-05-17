// src/components/Canvas/CanvasMarkers.ts
import type { MarkedPoint, ViewPort, CanvasSize, AspectRatioMode } from '../../types';
import { createScales } from '../../lib/transformer';

interface FunctionWithMarkers {
  id: string;
  color: string;
  markedPoints?: MarkedPoint[];
}

/**
 * 绘制标记点（普通函数和参数化函数共用）
 */
export function drawMarkedPoints(
  ctx: CanvasRenderingContext2D,
  fns: FunctionWithMarkers[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

  for (const fn of fns) {
    if (!fn.markedPoints) continue;
    for (const point of fn.markedPoints) {
      if (isNaN(point.y)) continue;
      const px = xScale(point.x);
      const py = yScale(point.y);

      ctx.save();
      ctx.strokeStyle = fn.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.5;

      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvasSize.width, py);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvasSize.height);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      ctx.fillStyle = fn.color;
      ctx.shadowColor = fn.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();

      if (!isNaN(point.derivative)) {
        ctx.font = '10px monospace';
        ctx.fillStyle = '#A78BFA';
        ctx.textAlign = 'left';
        ctx.fillText(`f'=${point.derivative.toFixed(2)}`, px + 10, py - 10);
      }

      ctx.font = '10px monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'left';
      ctx.fillText(`(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`, px + 10, py + 12);

      ctx.restore();
    }
  }
}
