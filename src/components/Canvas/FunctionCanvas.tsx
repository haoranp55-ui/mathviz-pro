// src/components/Canvas/FunctionCanvas.tsx
import { useEffect, useCallback, useRef, type FC } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvas } from '../../hooks/useCanvas';
import { use3DRenderer } from '../../hooks/use3DRenderer';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { drawGrid } from './GridRenderer';
import { SAMPLE_PRESETS } from '../../types';
import { createRenderContext } from '../../lib/transformer';
import { cachedSample } from '../../lib/sampler';
import { detectKeyPoints } from '../../lib/keyPointDetector';
import type { KeyPoint, ContourSegment } from '../../types';
import { renderNormalFunctions } from './renderStages/renderNormalFunctions';
import { renderParametricFunctions } from './renderStages/renderParametricFunctions';
import { renderImplicitFunctions } from './renderStages/renderImplicitFunctions';
import { renderPolarFunctions } from './renderStages/renderPolarFunctions';
import { renderKeyPoints, renderHoverInfo, renderSelectedFunction, renderMarkedPointsOverlay } from './renderStages/renderOverlay';

export const FunctionCanvas: FC = () => {
  const functions = useAppStore(s => s.functions);
  const parametricFunctions = useAppStore(s => s.parametricFunctions);
  const implicitFunctions = useAppStore(s => s.implicitFunctions);
  const polarFunctions = useAppStore(s => s.polarFunctions);
  const integrals = useAppStore(s => s.integrals);
  const viewPort = useAppStore(s => s.viewPort);
  const interaction = useAppStore(s => s.interaction);
  const showGrid = useAppStore(s => s.showGrid);
  const samplePreset = useAppStore(s => s.samplePreset);
  const aspectRatioMode = useAppStore(s => s.aspectRatioMode);
  const isSliderActive = useAppStore(s => s.isSliderActive);
  const keyPoints = useAppStore(s => s.keyPoints);
  const hoverKeyPoint = useAppStore(s => s.hoverKeyPoint);
  const selectedFunctionId = useAppStore(s => s.selectedFunctionId);
  const evaluateX = useAppStore(s => s.evaluateX);
  const systemType = useAppStore(s => s.systemType);
  const setKeyPoints = useAppStore(s => s.setKeyPoints);
  const setCanvasRef = useAppStore(s => s.setCanvasRef);

  const canvasHook = useCanvas();
  const { canvasRef, containerRef, canvasSize, getContext, clearCanvas } = canvasHook;
  const animationFrameRef = useRef<number | undefined>(undefined);

  const { threeDCacheRef, request3DRender } = use3DRenderer({
    canvas: canvasHook,
    systemType,
  });

  const functionPointsRef = useRef<Map<string, { x: Float64Array; y: Float64Array }>>(new Map());
  const derivedPointsRef = useRef<Map<string, { x: Float64Array; y: Float64Array }>>(new Map());
  const implicitSegmentsRef = useRef<Map<string, ContourSegment[]>>(new Map());
  const lastKeyPointsHashRef = useRef<Map<string, string>>(new Map());
  const renderRef = useRef<() => void>(() => {});

  const { handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, handleDoubleClick, mousePosRef } = useCanvasInteraction({
    canvasRef, canvasSize, request3DRender, functionPointsRef, derivedPointsRef, implicitSegmentsRef,
  });

  function keyPointsChanged(functionId: string, kps: KeyPoint[]): boolean {
    const hash = kps.length === 0 ? 'empty' : JSON.stringify(kps.map(kp => `${kp.type}:${kp.x.toFixed(6)}:${(kp.y ?? 'nan').toString()}`));
    const last = lastKeyPointsHashRef.current.get(functionId);
    if (last === hash) return false;
    lastKeyPointsHashRef.current.set(functionId, hash);
    return true;
  }

  useEffect(() => {
    if (canvasRef.current) setCanvasRef(canvasRef.current);
    return () => setCanvasRef(null);
  }, [canvasRef, setCanvasRef]);

  // 关键点检测：从渲染循环移到独立 useEffect + debounce
  const kpTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (systemType === '3d') return;
    if (kpTimerRef.current) clearTimeout(kpTimerRef.current);
    kpTimerRef.current = window.setTimeout(() => {
      const preset = SAMPLE_PRESETS[samplePreset];
      const dynamicSampleCount = Math.max(500, Math.min(canvasSize.width * preset.multiplier, preset.maxCount));
      const renderCtx = createRenderContext(viewPort, canvasSize, aspectRatioMode);

      // 普通函数关键点
      for (const fn of functions) {
        if (!fn.visible || fn.error) continue;
        const points = cachedSample(fn.compiled, `normal-${fn.id}-${fn.expression}`, { xMin: renderCtx.sampleXMin, xMax: renderCtx.sampleXMax, sampleCount: dynamicSampleCount });
        const kps = detectKeyPoints(fn.compiled, points, fn.id);
        if (keyPointsChanged(fn.id, kps)) setKeyPoints(fn.id, kps);
      }

      // 参数化函数关键点
      for (const fn of parametricFunctions) {
        if (!fn.visible || fn.error) continue;
        const currentParams: Record<string, number> = {};
        for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
        const boundFn = (x: number) => fn.compiled(x, currentParams);
        const points = cachedSample(boundFn, `parametric-${fn.id}-${fn.expression}`, { xMin: renderCtx.sampleXMin, xMax: renderCtx.sampleXMax, sampleCount: dynamicSampleCount }, currentParams);
        const kps = detectKeyPoints(boundFn, points, fn.id);
        if (keyPointsChanged(fn.id, kps)) setKeyPoints(fn.id, kps);
      }
    }, 100);
    return () => { if (kpTimerRef.current) clearTimeout(kpTimerRef.current); };
  }, [functions, parametricFunctions, viewPort, canvasSize, samplePreset, aspectRatioMode, systemType, setKeyPoints]);

  const render = useCallback(() => {
    const ctx = getContext();
    if (!ctx || canvasSize.width === 0 || canvasSize.height === 0) return;

    clearCanvas();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (systemType === '3d') {
      if (threeDCacheRef.current) ctx.drawImage(threeDCacheRef.current, 0, 0, canvasSize.width, canvasSize.height);
      animationFrameRef.current = requestAnimationFrame(renderRef.current);
      return;
    }

    const renderCtx = createRenderContext(viewPort, canvasSize, aspectRatioMode);
    if (showGrid) drawGrid(ctx, viewPort, canvasSize, aspectRatioMode);

    const preset = SAMPLE_PRESETS[samplePreset];
    const dynamicSampleCount = Math.max(500, Math.min(canvasSize.width * preset.multiplier, preset.maxCount));

    functionPointsRef.current.clear();
    derivedPointsRef.current.clear();
    implicitSegmentsRef.current.clear();

    // 普通函数
    const normalResult = renderNormalFunctions(ctx, functions, integrals, viewPort, canvasSize, aspectRatioMode, renderCtx, dynamicSampleCount);
    for (const [k, v] of normalResult.functionPoints) functionPointsRef.current.set(k, v);
    for (const [k, v] of normalResult.derivedPoints) derivedPointsRef.current.set(k, v);

    // 参数化函数
    const paramResult = renderParametricFunctions(ctx, parametricFunctions, integrals, viewPort, canvasSize, aspectRatioMode, renderCtx, dynamicSampleCount);
    for (const [k, v] of paramResult.functionPoints) functionPointsRef.current.set(k, v);
    for (const [k, v] of paramResult.derivedPoints) derivedPointsRef.current.set(k, v);

    // 隐函数
    const implicitResult = renderImplicitFunctions(ctx, implicitFunctions, viewPort, canvasSize, aspectRatioMode, renderCtx, samplePreset, isSliderActive);
    for (const [k, v] of implicitResult.implicitSegments) implicitSegmentsRef.current.set(k, v);

    // 极坐标
    const polarResult = renderPolarFunctions(ctx, polarFunctions, viewPort, canvasSize, aspectRatioMode, renderCtx, samplePreset, isSliderActive);
    for (const [k, v] of polarResult.functionPoints) functionPointsRef.current.set(k, v);

    // 关键点（只绘制，检测在独立 useEffect 中完成）
    renderKeyPoints(ctx, keyPoints, hoverKeyPoint, functions, parametricFunctions, implicitFunctions, polarFunctions, viewPort, canvasSize, aspectRatioMode);

    // 悬停信息
    renderHoverInfo(ctx, interaction, functions, parametricFunctions, implicitFunctions, polarFunctions, mousePosRef.current, viewPort, canvasSize, aspectRatioMode);

    // 选中函数计算点
    renderSelectedFunction(ctx, selectedFunctionId, evaluateX, functions, viewPort, canvasSize, aspectRatioMode);

    // 标记点
    renderMarkedPointsOverlay(ctx, functions, parametricFunctions, viewPort, canvasSize, aspectRatioMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- interaction.hoverPoint is the only field used; spreading full interaction object would cause unnecessary re-renders
  }, [getContext, clearCanvas, canvasSize, viewPort, functions, parametricFunctions, integrals, implicitFunctions, polarFunctions, showGrid, samplePreset, aspectRatioMode, interaction.hoverPoint, keyPoints, hoverKeyPoint, selectedFunctionId, evaluateX, systemType, setKeyPoints, isSliderActive, threeDCacheRef, mousePosRef]);

  useEffect(() => { renderRef.current = render; }, [render]);

  useEffect(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(render);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [render]);

  useEffect(() => {
    if (!isSliderActive) return;
    let rafId: number;
    const loop = () => { renderRef.current(); rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isSliderActive]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0f172a]">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(e) => { e.preventDefault(); }}
      />
    </div>
  );
};