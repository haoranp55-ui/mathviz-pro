// src/components/Canvas/renderStages/renderNormalFunctions.ts
import type { ViewPort, CanvasSize, AspectRatioMode, ParsedFunction, Integral } from '../../../types';
import type { RenderContext } from '../../../lib/transformer';
import { drawCurve, drawDerivativeCurve, drawIntegralArea } from '../CurveRenderer';
import { cachedSample } from '../../../lib/sampler';
import { createDerivativeFunction } from '../../../lib/derivative';
import { batchAntiderivative } from '../../../lib/integralSolver';

export interface NormalRenderResult {
  functionPoints: Map<string, { x: Float64Array; y: Float64Array }>;
  derivedPoints: Map<string, { x: Float64Array; y: Float64Array }>;
}

export function renderNormalFunctions(
  ctx: CanvasRenderingContext2D,
  functions: ParsedFunction[],
  integrals: Integral[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode,
  renderCtx: RenderContext,
  dynamicSampleCount: number,
): NormalRenderResult {
  const functionPoints = new Map<string, { x: Float64Array; y: Float64Array }>();
  const derivedPoints = new Map<string, { x: Float64Array; y: Float64Array }>();

  const { sampleXMin, sampleXMax } = renderCtx;

  for (const fn of functions) {
    if (!fn.visible || fn.error) continue;
    const points = cachedSample(fn.compiled, `normal-${fn.id}-${fn.expression}`, { xMin: sampleXMin, xMax: sampleXMax, sampleCount: dynamicSampleCount });
    functionPoints.set(fn.id, points);

    const fnIntegrals = integrals.filter(i => i.functionId === fn.id && i.functionType === 'normal');
    for (const integral of fnIntegrals) {
      drawIntegralArea(ctx, fn.compiled, integral, viewPort, canvasSize, aspectRatioMode);
    }

    drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);
    if (fn.showDerivative) {
      const derivPts = cachedSample(createDerivativeFunction(fn.compiled), `normal-${fn.id}-${fn.expression}-deriv`, { xMin: sampleXMin, xMax: sampleXMax, sampleCount: dynamicSampleCount });
      drawDerivativeCurve(ctx, derivPts, fn.color, viewPort, canvasSize, aspectRatioMode);
      derivedPoints.set(`deriv-${fn.id}`, derivPts);
    }
    if (fn.showIntegralCurve) {
      const basePoint = fn.curveBasePoint ?? 0;
      const yValues = batchAntiderivative(fn.compiled, points.x, basePoint);
      const integralPts = { x: points.x, y: yValues };
      drawDerivativeCurve(ctx, integralPts, '#34D399', viewPort, canvasSize, aspectRatioMode);
      derivedPoints.set(`integral-${fn.id}`, integralPts);
    }
  }

  return { functionPoints, derivedPoints };
}
