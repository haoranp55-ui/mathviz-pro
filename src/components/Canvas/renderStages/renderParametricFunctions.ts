// src/components/Canvas/renderStages/renderParametricFunctions.ts
import type { ViewPort, CanvasSize, AspectRatioMode, ParametricFunction, Integral } from '../../../types';
import type { RenderContext } from '../../../lib/transformer';
import { drawCurve, drawDerivativeCurve, drawIntegralArea } from '../CurveRenderer';
import { cachedSample } from '../../../lib/sampler';
import { createDerivativeFunction } from '../../../lib/derivative';
import { batchAntiderivative } from '../../../lib/integralSolver';

export interface ParametricRenderResult {
  functionPoints: Map<string, { x: Float64Array; y: Float64Array }>;
  derivedPoints: Map<string, { x: Float64Array; y: Float64Array }>;
}

export function renderParametricFunctions(
  ctx: CanvasRenderingContext2D,
  functions: ParametricFunction[],
  integrals: Integral[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode,
  renderCtx: RenderContext,
  dynamicSampleCount: number,
): ParametricRenderResult {
  const functionPoints = new Map<string, { x: Float64Array; y: Float64Array }>();
  const derivedPoints = new Map<string, { x: Float64Array; y: Float64Array }>();

  const { sampleXMin, sampleXMax } = renderCtx;

  for (const fn of functions) {
    if (!fn.visible || fn.error) continue;
    const currentParams: Record<string, number> = {};
    for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
    const boundFn = (x: number) => fn.compiled(x, currentParams);
    const points = cachedSample(boundFn, `parametric-${fn.id}-${fn.expression}`, { xMin: sampleXMin, xMax: sampleXMax, sampleCount: dynamicSampleCount }, currentParams);
    functionPoints.set(fn.id, points);

    const fnIntegrals = integrals.filter(i => i.functionId === fn.id && i.functionType === 'parametric');
    for (const integral of fnIntegrals) {
      drawIntegralArea(ctx, boundFn, integral, viewPort, canvasSize, aspectRatioMode);
    }

    drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);
    if (fn.showDerivative) {
      const derivPts = cachedSample(createDerivativeFunction(boundFn), `parametric-${fn.id}-${fn.expression}-deriv`, { xMin: sampleXMin, xMax: sampleXMax, sampleCount: dynamicSampleCount }, currentParams);
      drawDerivativeCurve(ctx, derivPts, fn.color, viewPort, canvasSize, aspectRatioMode);
      derivedPoints.set(`deriv-${fn.id}`, derivPts);
    }
    if (fn.showIntegralCurve) {
      const basePoint = fn.curveBasePoint ?? 0;
      const yValues = batchAntiderivative(boundFn, points.x, basePoint);
      const integralPts = { x: points.x, y: yValues };
      drawDerivativeCurve(ctx, integralPts, '#34D399', viewPort, canvasSize, aspectRatioMode);
      derivedPoints.set(`integral-${fn.id}`, integralPts);
    }
  }

  return { functionPoints, derivedPoints };
}
