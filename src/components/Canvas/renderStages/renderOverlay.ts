// src/components/Canvas/renderStages/renderOverlay.ts
import type { ViewPort, CanvasSize, AspectRatioMode, Interaction, ParsedFunction, ParametricFunction, ImplicitFunction, PolarFunction, KeyPoint as KP } from '../../../types';
import { createScales } from '../../../lib/transformer';
import { drawKeyPoints, drawKeyPointTooltip } from '../../Canvas/KeyPointRenderer';
import { drawMarkedPoints } from '../../Canvas/CanvasMarkers';
import { drawHoverPoint } from '../../Canvas/CurveRenderer';

export function renderKeyPoints(
  ctx: CanvasRenderingContext2D,
  keyPoints: KP[],
  hoverKeyPoint: KP | null,
  functions: ParsedFunction[],
  parametricFunctions: ParametricFunction[],
  implicitFunctions: ImplicitFunction[],
  polarFunctions: PolarFunction[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode,
): void {
  const visibleKeyPoints = keyPoints.filter(kp => {
    const normalFn = functions.find(f => f.id === kp.functionId);
    if (normalFn && normalFn.visible && normalFn.showKeyPoints) return true;
    const paramFn = parametricFunctions.find(f => f.id === kp.functionId);
    if (paramFn && paramFn.visible && paramFn.showKeyPoints) return true;
    const implicitFn = implicitFunctions.find(f => f.id === kp.functionId);
    if (implicitFn && implicitFn.visible && implicitFn.showKeyPoints) return true;
    const polarFn = polarFunctions.find(f => f.id === kp.functionId);
    if (polarFn && polarFn.visible && polarFn.showKeyPoints) return true;
    return false;
  });
  if (visibleKeyPoints.length > 0) drawKeyPoints(ctx, visibleKeyPoints, viewPort, canvasSize, aspectRatioMode);
  if (hoverKeyPoint) drawKeyPointTooltip(ctx, hoverKeyPoint, viewPort, canvasSize, aspectRatioMode);
}

export function renderHoverInfo(
  ctx: CanvasRenderingContext2D,
  interaction: Interaction,
  functions: ParsedFunction[],
  parametricFunctions: ParametricFunction[],
  implicitFunctions: ImplicitFunction[],
  polarFunctions: PolarFunction[],
  mousePos: { x: number; y: number } | null,
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode,
): void {
  if (!interaction.hoverPoint) return;

  const fn = functions.find(f => f.id === interaction.hoverPoint?.functionId) ||
             parametricFunctions.find(f => f.id === interaction.hoverPoint?.functionId);
  const implicitFn = implicitFunctions.find(f => f.id === interaction.hoverPoint?.functionId);
  const polarFn = polarFunctions.find(f => f.id === interaction.hoverPoint?.functionId);
  const color = fn?.color || implicitFn?.color || polarFn?.color || '#FFFFFF';

  if (fn || implicitFn || polarFn) {
    drawHoverPoint(ctx, interaction.hoverPoint, color, viewPort, canvasSize, aspectRatioMode);
    if (mousePos) {
      const text = `(${interaction.hoverPoint.x.toFixed(3)}, ${interaction.hoverPoint.y.toFixed(3)})`;
      ctx.save();
      ctx.font = '12px monospace';
      const textWidth = ctx.measureText(text).width;
      const padding = 8;
      const boxWidth = textWidth + padding * 2;
      const boxHeight = 24;
      let boxX = mousePos.x + 15;
      let boxY = mousePos.y - boxHeight / 2;
      if (boxX + boxWidth > canvasSize.width - 10) boxX = mousePos.x - boxWidth - 15;
      if (boxY < 10) boxY = 10;
      if (boxY + boxHeight > canvasSize.height - 10) boxY = canvasSize.height - boxHeight - 10;
      ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#F1F5F9';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(text, boxX + padding, boxY + boxHeight / 2);
      ctx.restore();
    }
  }
}

export function renderSelectedFunction(
  ctx: CanvasRenderingContext2D,
  selectedFunctionId: string | null,
  evaluateX: number,
  functions: ParsedFunction[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode,
): void {
  if (!selectedFunctionId) return;
  const selectedFn = functions.find(f => f.id === selectedFunctionId);
  if (!selectedFn || !selectedFn.visible || selectedFn.error) return;

  const yValue = selectedFn.compiled(evaluateX);
  if (!isFinite(yValue)) return;

  const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);
  const px = xScale(evaluateX);
  const py = yScale(yValue);

  ctx.save();
  ctx.strokeStyle = selectedFn.color;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(canvasSize.width, py); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, canvasSize.height); ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.fillStyle = selectedFn.color;
  ctx.shadowColor = selectedFn.color;
  ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function renderMarkedPointsOverlay(
  ctx: CanvasRenderingContext2D,
  functions: ParsedFunction[],
  parametricFunctions: ParametricFunction[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode,
): void {
  drawMarkedPoints(ctx, [...functions, ...parametricFunctions], viewPort, canvasSize, aspectRatioMode);
}
