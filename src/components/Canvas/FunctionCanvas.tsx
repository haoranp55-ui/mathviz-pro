// src/components/Canvas/FunctionCanvas.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvas } from '../../hooks/useCanvas';
import { use3DRenderer } from '../../hooks/use3DRenderer';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { drawGrid } from './GridRenderer';
import { drawCurve, drawHoverPoint, drawDerivativeCurve, drawIntegralArea } from './CurveRenderer';
import { drawImplicitCurve } from './ImplicitCurveRenderer';
import { drawMarkedPoints } from './CanvasMarkers';
import { cachedSample } from '../../lib/sampler';
import { fastRenderWithCache } from '../../lib/implicitSamplerInterval';
import { samplePolarFunctionFast } from '../../lib/polarParser';
import { getWebGLManager, isWebGLAvailable } from '../../lib/webgl/implicitRendererManager';
import { getPolarWebGLManager, isPolarWebGLAvailable } from '../../lib/webgl/polarRendererManager';
import { createScales, createRenderContext } from '../../lib/transformer';
import { detectKeyPoints } from '../../lib/keyPointDetector';
import { drawKeyPoints, drawKeyPointTooltip } from './KeyPointRenderer';
import { createDerivativeFunction } from '../../lib/derivative';
import { batchAntiderivative } from '../../lib/integralSolver';
import { SAMPLE_PRESETS, POLAR_SAMPLE_PRESETS } from '../../types';
import type { ContourSegment, KeyPoint } from '../../types';

export const FunctionCanvas: React.FC = () => {
  const {
    functions, parametricFunctions, implicitFunctions, polarFunctions, integrals,
    viewPort, interaction, showGrid, samplePreset, aspectRatioMode, isSliderActive,
    keyPoints, hoverKeyPoint, selectedFunctionId, evaluateX,
    systemType, setKeyPoints, setCanvasRef,
  } = useAppStore();

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

  const render = useCallback(() => {
    const ctx = getContext();
    if (!ctx || canvasSize.width === 0 || canvasSize.height === 0) return;

    clearCanvas();
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    if (systemType === '3d') {
      if (threeDCacheRef.current) ctx.drawImage(threeDCacheRef.current, 0, 0);
      animationFrameRef.current = requestAnimationFrame(renderRef.current);
      return;
    }

    const renderCtx = createRenderContext(viewPort, canvasSize, aspectRatioMode);
    if (showGrid) drawGrid(ctx, viewPort, canvasSize, aspectRatioMode);

    const preset = SAMPLE_PRESETS[samplePreset];
    const dynamicSampleCount = Math.max(500, Math.min(canvasSize.width * preset.multiplier, preset.maxCount));
    const { sampleXMin, sampleXMax } = renderCtx;

    functionPointsRef.current.clear();
    derivedPointsRef.current.clear();
    implicitSegmentsRef.current.clear();

    // 普通函数
    for (const fn of functions) {
      if (!fn.visible || fn.error) continue;
      const points = cachedSample(fn.compiled, `normal-${fn.id}-${fn.expression}`, { xMin: sampleXMin, xMax: sampleXMax, sampleCount: dynamicSampleCount });
      functionPointsRef.current.set(fn.id, points);

      // 绘制积分区域（在曲线下方）
      const fnIntegrals = integrals.filter(i => i.functionId === fn.id && i.functionType === 'normal');
      for (const integral of fnIntegrals) {
        drawIntegralArea(ctx, fn.compiled, integral, viewPort, canvasSize, aspectRatioMode);
      }

      drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);
      if (fn.showDerivative) {
        const derivPts = cachedSample(createDerivativeFunction(fn.compiled), `normal-${fn.id}-${fn.expression}-deriv`, { xMin: sampleXMin, xMax: sampleXMax, sampleCount: dynamicSampleCount });
        drawDerivativeCurve(ctx, derivPts, fn.color, viewPort, canvasSize, aspectRatioMode);
        derivedPointsRef.current.set(`deriv-${fn.id}`, derivPts);
      }
      // 积分曲线 F(x)
      if (fn.showIntegralCurve) {
        const basePoint = fn.curveBasePoint ?? 0;
        const yValues = batchAntiderivative(fn.compiled, points.x, basePoint);
        const integralPts = { x: points.x, y: yValues };
        drawDerivativeCurve(ctx, integralPts, '#34D399', viewPort, canvasSize, aspectRatioMode);
        derivedPointsRef.current.set(`integral-${fn.id}`, integralPts);
      }
      const kps = detectKeyPoints(fn.compiled, points, fn.id);
      if (keyPointsChanged(fn.id, kps)) setKeyPoints(fn.id, kps);
    }

    // 参数化函数
    for (const fn of parametricFunctions) {
      if (!fn.visible || fn.error) continue;
      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
      const boundFn = (x: number) => fn.compiled(x, currentParams);
      const points = cachedSample(boundFn, `parametric-${fn.id}-${fn.expression}`, { xMin: sampleXMin, xMax: sampleXMax, sampleCount: dynamicSampleCount }, currentParams);
      functionPointsRef.current.set(fn.id, points);

      // 绘制积分区域
      const fnIntegrals = integrals.filter(i => i.functionId === fn.id && i.functionType === 'parametric');
      for (const integral of fnIntegrals) {
        drawIntegralArea(ctx, boundFn, integral, viewPort, canvasSize, aspectRatioMode);
      }

      drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);
      if (fn.showDerivative) {
        const derivPts = cachedSample(createDerivativeFunction(boundFn), `parametric-${fn.id}-${fn.expression}-deriv`, { xMin: sampleXMin, xMax: sampleXMax, sampleCount: dynamicSampleCount }, currentParams);
        drawDerivativeCurve(ctx, derivPts, fn.color, viewPort, canvasSize, aspectRatioMode);
        derivedPointsRef.current.set(`deriv-${fn.id}`, derivPts);
      }
      // 积分曲线 F(x)
      if (fn.showIntegralCurve) {
        const basePoint = fn.curveBasePoint ?? 0;
        const yValues = batchAntiderivative(boundFn, points.x, basePoint);
        const integralPts = { x: points.x, y: yValues };
        drawDerivativeCurve(ctx, integralPts, '#34D399', viewPort, canvasSize, aspectRatioMode);
        derivedPointsRef.current.set(`integral-${fn.id}`, integralPts);
      }
      const kps = detectKeyPoints(boundFn, points, fn.id);
      if (keyPointsChanged(fn.id, kps)) setKeyPoints(fn.id, kps);
    }

    // 隐函数 - GPU 路径
    const hasGPUImplicit = implicitFunctions.some(fn => fn.visible && !fn.error && fn.useGPURendering && !fn.requiresCPU);
    const webglManager = hasGPUImplicit ? getWebGLManager() : null;
    if (webglManager && isWebGLAvailable()) {
      webglManager.resize(canvasSize.width, canvasSize.height);
      for (const fn of implicitFunctions) { if (fn.visible && !fn.error && fn.useGPURendering && !fn.requiresCPU) webglManager.registerFunction(fn); }
      const gpuFunctions = implicitFunctions.filter(fn => fn.visible && !fn.error && fn.useGPURendering && !fn.requiresCPU);
      if (gpuFunctions.length > 0) {
        const glCanvas = webglManager.renderToCanvas(gpuFunctions, viewPort, { offsetX: renderCtx.offsetX, offsetY: renderCtx.offsetY, actualWidth: renderCtx.actualWidth, actualHeight: renderCtx.actualHeight });
        if (glCanvas) ctx.drawImage(glCanvas, 0, 0);
      }
    }

    // 隐函数 - CPU 路径
    const gridSizes: Record<string, { slider: number; normal: number }> = { 'fast': { slider: 32, normal: 64 }, 'normal': { slider: 48, normal: 96 }, 'fine': { slider: 64, normal: 128 }, 'ultra': { slider: 80, normal: 160 } };
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
      implicitSegmentsRef.current.set(fn.id, segments);
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
      implicitSegmentsRef.current.set(fn.id, segments);
    }

    // 极坐标 - GPU 路径
    const gpuPolarFunctions = polarFunctions.filter(fn => fn.visible && !fn.error && fn.useGPURendering);
    const polarWebGLManager = gpuPolarFunctions.length > 0 ? getPolarWebGLManager() : null;
    if (polarWebGLManager && isPolarWebGLAvailable()) {
      polarWebGLManager.resize(canvasSize.width, canvasSize.height);
      for (const fn of gpuPolarFunctions) polarWebGLManager.registerFunction(fn);
      const glCanvas = polarWebGLManager.renderToCanvas(gpuPolarFunctions, viewPort, samplePreset, { offsetX: renderCtx.offsetX, offsetY: renderCtx.offsetY, actualWidth: renderCtx.actualWidth, actualHeight: renderCtx.actualHeight });
      if (glCanvas) ctx.drawImage(glCanvas, 0, 0);
      for (const fn of gpuPolarFunctions) {
        const currentParams: Record<string, number> = {};
        for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
        const polarPoints = samplePolarFunctionFast(fn.compiled, currentParams, fn.thetaMin, fn.thetaMax, 60);
        const xArray = new Float64Array(polarPoints.length);
        const yArray = new Float64Array(polarPoints.length);
        for (let i = 0; i < polarPoints.length; i++) { xArray[i] = polarPoints[i].x; yArray[i] = polarPoints[i].y; }
        functionPointsRef.current.set(`polar-${fn.id}`, { x: xArray, y: yArray });
      }
    }

    // 极坐标 - CPU 路径
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
      functionPointsRef.current.set(`polar-${fn.id}`, points);
    }

    // 关键点
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

    // 悬停点 + 坐标提示
    if (interaction.hoverPoint) {
      const fn = functions.find(f => f.id === interaction.hoverPoint?.functionId) || parametricFunctions.find(f => f.id === interaction.hoverPoint?.functionId);
      const implicitFn = implicitFunctions.find(f => f.id === interaction.hoverPoint?.functionId);
      const polarFn = polarFunctions.find(f => f.id === interaction.hoverPoint?.functionId);
      const color = fn?.color || implicitFn?.color || polarFn?.color || '#FFFFFF';
      if (fn || implicitFn || polarFn) {
        drawHoverPoint(ctx, interaction.hoverPoint, color, viewPort, canvasSize, aspectRatioMode);
        if (mousePosRef.current) {
          const text = `(${interaction.hoverPoint.x.toFixed(3)}, ${interaction.hoverPoint.y.toFixed(3)})`;
          ctx.save();
          ctx.font = '12px monospace';
          const textWidth = ctx.measureText(text).width;
          const padding = 8;
          const boxWidth = textWidth + padding * 2;
          const boxHeight = 24;
          let boxX = mousePosRef.current.x + 15;
          let boxY = mousePosRef.current.y - boxHeight / 2;
          if (boxX + boxWidth > canvasSize.width - 10) boxX = mousePosRef.current.x - boxWidth - 15;
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

    // 选中函数计算点
    if (selectedFunctionId) {
      const selectedFn = functions.find(f => f.id === selectedFunctionId);
      if (selectedFn && selectedFn.visible && !selectedFn.error) {
        const yValue = selectedFn.compiled(evaluateX);
        if (isFinite(yValue)) {
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
      }
    }

    // 标记点（统一渲染，消除 normal/parametric 重复代码）
    drawMarkedPoints(ctx, [...functions, ...parametricFunctions], viewPort, canvasSize, aspectRatioMode);
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
