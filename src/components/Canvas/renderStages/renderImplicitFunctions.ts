// src/components/Canvas/renderStages/renderImplicitFunctions.ts
import type { ViewPort, CanvasSize, AspectRatioMode, ImplicitFunction, SamplePreset } from '../../../types';
import type { RenderContext } from '../../../lib/transformer';
import { drawImplicitCurve } from '../ImplicitCurveRenderer';
import { fastRenderWithCache } from '../../../lib/implicitSamplerInterval';
import { getWebGLManager, isWebGLAvailable } from '../../../lib/webgl/implicitRendererManager';
import type { ContourSegment } from '../../../types';

export interface ImplicitRenderResult {
  implicitSegments: Map<string, ContourSegment[]>;
}

export function renderImplicitFunctions(
  ctx: CanvasRenderingContext2D,
  implicitFunctions: ImplicitFunction[],
  viewPort: ViewPort,
  canvasSize: CanvasSize,
  aspectRatioMode: AspectRatioMode,
  renderCtx: RenderContext,
  samplePreset: SamplePreset,
  isSliderActive: boolean,
): ImplicitRenderResult {
  const implicitSegments = new Map<string, ContourSegment[]>();

  const dpr = window.devicePixelRatio || 1;

  // GPU 路径
  const hasGPUImplicit = implicitFunctions.some(fn => fn.visible && !fn.error && fn.useGPURendering && !fn.requiresCPU);
  const webglManager = hasGPUImplicit ? getWebGLManager() : null;
  if (webglManager && isWebGLAvailable()) {
    // WebGL canvas 必须使用物理像素分辨率，使 gl_FragCoord 与 u_resolution 一致
    webglManager.resize(Math.round(canvasSize.width * dpr), Math.round(canvasSize.height * dpr));
    for (const fn of implicitFunctions) {
      if (fn.visible && !fn.error && fn.useGPURendering && !fn.requiresCPU) webglManager.registerFunction(fn);
    }
    const gpuFunctions = implicitFunctions.filter(fn => fn.visible && !fn.error && fn.useGPURendering && !fn.requiresCPU);
    if (gpuFunctions.length > 0) {
      // renderRegion 也需要缩放到物理像素
      const glCanvas = webglManager.renderToCanvas(gpuFunctions, viewPort, {
        offsetX: renderCtx.offsetX * dpr,
        offsetY: renderCtx.offsetY * dpr,
        actualWidth: renderCtx.actualWidth * dpr,
        actualHeight: renderCtx.actualHeight * dpr,
      });
      // drawImage 指定 CSS 像素目标尺寸，配合 ctx.scale(dpr,dpr) 正确映射
      if (glCanvas) ctx.drawImage(glCanvas, 0, 0, canvasSize.width, canvasSize.height);
    }
  }

  // CPU 路径
  const gridSizes: Record<string, { slider: number; normal: number }> = {
    'fast': { slider: 32, normal: 64 },
    'normal': { slider: 48, normal: 96 },
    'fine': { slider: 64, normal: 128 },
    'ultra': { slider: 80, normal: 160 },
  };

  for (const fn of implicitFunctions) {
    if (!fn.visible || fn.error) continue;
    if (fn.useGPURendering && !fn.requiresCPU) continue;
    const currentParams: Record<string, number> = {};
    for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
    const boundFn = (x: number, y: number) => fn.compiled(x, y, currentParams);
    const sampleViewPort = { xMin: renderCtx.sampleXMin, xMax: renderCtx.sampleXMax, yMin: renderCtx.sampleYMin, yMax: renderCtx.sampleYMax };
    const sizes = gridSizes[samplePreset] || gridSizes['normal'];
    const gridSize = isSliderActive ? sizes.slider : sizes.normal;
    const segments = fastRenderWithCache(boundFn, sampleViewPort, gridSize, `implicit-cpu-${fn.id}-${fn.expression}`, currentParams);
    implicitSegments.set(fn.id, segments);
    drawImplicitCurve(ctx, segments, fn.color, viewPort, canvasSize, aspectRatioMode);
  }

  // GPU 隐函数悬停检测采样
  for (const fn of implicitFunctions) {
    if (!fn.visible || fn.error || !fn.useGPURendering || fn.requiresCPU) continue;
    const currentParams: Record<string, number> = {};
    for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
    const boundFn = (x: number, y: number) => fn.compiled(x, y, currentParams);
    const sampleViewPort = { xMin: renderCtx.sampleXMin, xMax: renderCtx.sampleXMax, yMin: renderCtx.sampleYMin, yMax: renderCtx.sampleYMax };
    const hoverGridSize = Math.min(128, Math.max(64, Math.floor(canvasSize.width / 8)));
    const segments = fastRenderWithCache(boundFn, sampleViewPort, hoverGridSize, `implicit-hover-${fn.id}-${fn.expression}`, currentParams);
    implicitSegments.set(fn.id, segments);
  }

  return { implicitSegments };
}
