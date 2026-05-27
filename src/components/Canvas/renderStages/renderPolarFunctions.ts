// src/components/Canvas/renderStages/renderPolarFunctions.ts
import type { ViewPort, CanvasSize, AspectRatioMode, PolarFunction, SamplePreset } from '../../../types';
import type { RenderContext } from '../../../lib/transformer';
import { drawCurve } from '../CurveRenderer';
import { samplePolarFunctionFast } from '../../../lib/polarParser';
import { getPolarWebGLManager, isPolarWebGLAvailable } from '../../../lib/webgl/polarRendererManager';
import { POLAR_SAMPLE_PRESETS } from '../../../types';

export interface PolarRenderResult {
  functionPoints: Map<string, { x: Float64Array; y: Float64Array }>;
}

export function renderPolarFunctions(
  ctx: CanvasRenderingContext2D,
  polarFunctions: PolarFunction[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode,
  renderCtx: RenderContext,
  samplePreset: SamplePreset,
  isSliderActive: boolean,
): PolarRenderResult {
  const functionPoints = new Map<string, { x: Float64Array; y: Float64Array }>();

  const dpr = window.devicePixelRatio || 1;

  // GPU 路径
  const gpuPolarFunctions = polarFunctions.filter(fn => fn.visible && !fn.error && fn.useGPURendering);
  const polarWebGLManager = gpuPolarFunctions.length > 0 ? getPolarWebGLManager() : null;
  if (polarWebGLManager && isPolarWebGLAvailable()) {
    // WebGL canvas 必须使用物理像素分辨率，使 gl_FragCoord 与 u_resolution 一致
    polarWebGLManager.resize(Math.round(canvasSize.width * dpr), Math.round(canvasSize.height * dpr));
    for (const fn of gpuPolarFunctions) polarWebGLManager.registerFunction(fn);
    const glCanvas = polarWebGLManager.renderToCanvas(gpuPolarFunctions, viewPort, samplePreset, {
      offsetX: renderCtx.offsetX * dpr,
      offsetY: renderCtx.offsetY * dpr,
      actualWidth: renderCtx.actualWidth * dpr,
      actualHeight: renderCtx.actualHeight * dpr,
    });
    if (glCanvas) ctx.drawImage(glCanvas, 0, 0, canvasSize.width, canvasSize.height);
    for (const fn of gpuPolarFunctions) {
      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
      const polarPoints = samplePolarFunctionFast(fn.compiled, currentParams, fn.thetaMin, fn.thetaMax, 60);
      const xArray = new Float64Array(polarPoints.length);
      const yArray = new Float64Array(polarPoints.length);
      for (let i = 0; i < polarPoints.length; i++) { xArray[i] = polarPoints[i].x; yArray[i] = polarPoints[i].y; }
      functionPoints.set(`polar-${fn.id}`, { x: xArray, y: yArray });
    }
  }

  // CPU 路径
  for (const fn of polarFunctions) {
    if (!fn.visible || fn.error || fn.useGPURendering) continue;
    const currentParams: Record<string, number> = {};
    for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
    const presetStepsPerRadian = POLAR_SAMPLE_PRESETS[samplePreset].stepsPerRadian;
    const stepsPerRadian = fn.stepsPerRadian ?? presetStepsPerRadian;
    const steps = isSliderActive ? Math.max(60, Math.ceil((fn.thetaMax - fn.thetaMin) * 16)) : Math.max(60, Math.min(2000, Math.ceil((fn.thetaMax - fn.thetaMin) * stepsPerRadian)));
    const polarPoints = samplePolarFunctionFast(fn.compiled, currentParams, fn.thetaMin, fn.thetaMax, steps);
    const xArray = new Float64Array(polarPoints.length);
    const yArray = new Float64Array(polarPoints.length);
    for (let i = 0; i < polarPoints.length; i++) { xArray[i] = polarPoints[i].x; yArray[i] = polarPoints[i].y; }
    const points = { x: xArray, y: yArray };
    drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);
    functionPoints.set(`polar-${fn.id}`, points);
  }

  return { functionPoints };
}
