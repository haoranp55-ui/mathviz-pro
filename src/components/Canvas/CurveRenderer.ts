// src/components/Canvas/CurveRenderer.ts
import type { SampledPoints, ViewPort, CanvasSize, HoverPoint, AspectRatioMode } from '../../types';
import { createScales } from '../../lib/transformer';

const CURVE_LINE_WIDTH = 2;
const HOVER_RADIUS = 6;

// 斜率阈值：超过此值视为渐近线，直接画垂直线
const ASYMPTOTE_SLOPE_THRESHOLD = 50000;

export function drawCurve(
  ctx: CanvasRenderingContext2D,
  points: SampledPoints,
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);
  const { x, y } = points;
  const n = x.length;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = CURVE_LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  let isDrawing = false;
  let prevPx = 0;
  let prevPy = 0;
  let prevYMath = 0; // 前一个点的数学 y 值（用于异号跳变检测）

  ctx.beginPath();

  for (let i = 0; i < n; i++) {
    const yi = y[i];

    // 跳过无效值
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

    // 只检查 X 方向是否超出画布太多，Y 方向让 Canvas 自己裁剪
    // 这样可以正确处理函数值超出视口的情况
    if (px < -1000 || px > canvasSize.width + 1000) {
      if (isDrawing) {
        ctx.stroke();
        ctx.beginPath();
        isDrawing = false;
      }
      continue;
    }

    // 检测渐近线（两种机制，互补）
    if (isDrawing) {
      // 机制1：像素斜率过大（小视口/密采样时有效）
      const dx = px - prevPx;
      const dy = py - prevPy;
      let isAsymptote = false;

      if (Math.abs(dx) > 0.1) {
        const slope = Math.abs(dy / dx);
        if (slope > ASYMPTOTE_SLOPE_THRESHOLD) {
          isAsymptote = true;
        }
      }

      // 机制2：大值异号跳变（大视口/疏采样时有效，不依赖像素斜率）
      // tan(x)、1/x 等函数的渐近线两侧：+大值 → -大值
      // exp(x)、x^2 等同号函数不会被误判
      const prevSign = Math.sign(prevYMath);
      const currSign = Math.sign(yi);
      if (!isAsymptote && prevSign !== 0 && currSign !== 0 && prevSign !== currSign) {
        if (Math.abs(prevYMath) > 50 && Math.abs(yi) > 50) {
          isAsymptote = true;
        }
      }

      if (isAsymptote) {
        // 断开路径并跳过当前点（渐近线上的极大/极小值不能作为新路径起点）
        ctx.stroke();
        ctx.beginPath();
        isDrawing = false;
        continue;
      }
    }

    if (!isDrawing) {
      ctx.moveTo(px, py);
      isDrawing = true;
    } else {
      ctx.lineTo(px, py);
    }

    prevPx = px;
    prevPy = py;
    prevYMath = yi;
  }

  if (isDrawing) {
    ctx.stroke();
  }

  ctx.restore();
}

// 绘制导数曲线（虚线样式）
export function drawDerivativeCurve(
  ctx: CanvasRenderingContext2D,
  points: SampledPoints,
  color: string,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);
  const { x, y } = points;
  const n = x.length;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([6, 4]); // 虚线样式
  ctx.globalAlpha = 0.7; // 半透明

  let isDrawing = false;
  let prevPx = 0;
  let prevPy = 0;
  let prevYMath = 0;

  ctx.beginPath();

  for (let i = 0; i < n; i++) {
    const yi = y[i];

    if (!isFinite(yi)) {
      if (isDrawing) {
        ctx.stroke();
        ctx.beginPath();
        isDrawing = false;
      }
      continue;
    }

    const px = xScale(x[i]);
    const py = yScale(yi);

    // 只检查 X 方向，Y 方向让 Canvas 自己裁剪
    if (px < -1000 || px > canvasSize.width + 1000) {
      if (isDrawing) {
        ctx.stroke();
        ctx.beginPath();
        isDrawing = false;
      }
      continue;
    }

    // 检测渐近线（与 drawCurve 相同的双机制）
    if (isDrawing) {
      const dx = px - prevPx;
      const dy = py - prevPy;
      let isAsymptote = false;

      if (Math.abs(dx) > 0.1) {
        const slope = Math.abs(dy / dx);
        if (slope > ASYMPTOTE_SLOPE_THRESHOLD) {
          isAsymptote = true;
        }
      }

      // 数学坐标异号跳变检测
      const prevSign = Math.sign(prevYMath);
      const currSign = Math.sign(yi);
      if (!isAsymptote && prevSign !== 0 && currSign !== 0 && prevSign !== currSign) {
        if (Math.abs(prevYMath) > 50 && Math.abs(yi) > 50) {
          isAsymptote = true;
        }
      }

      if (isAsymptote) {
        ctx.stroke();
        ctx.beginPath();
        isDrawing = false;
        continue;
      }
    }

    if (!isDrawing) {
      ctx.moveTo(px, py);
      isDrawing = true;
    } else {
      ctx.lineTo(px, py);
    }

    prevPx = px;
    prevPy = py;
    prevYMath = yi;
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
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

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
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode = 'normal'
): void {
  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

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
