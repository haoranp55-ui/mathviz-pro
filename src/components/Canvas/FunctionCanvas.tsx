// src/components/Canvas/FunctionCanvas.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvas } from '../../hooks/useCanvas';
import { drawGrid } from './GridRenderer';
import { drawCurve, drawHoverPoint, drawDerivativeCurve } from './CurveRenderer';
import { drawImplicitCurve } from './ImplicitCurveRenderer';
import { cachedSample } from '../../lib/sampler';
import { fastRenderWithCache } from '../../lib/implicitSamplerInterval';
import { samplePolarFunctionFast } from '../../lib/polarParser';
import { getWebGLManager, isWebGLAvailable } from '../../lib/webgl/implicitRendererManager';
import { getPolarWebGLManager, isPolarWebGLAvailable } from '../../lib/webgl/polarRendererManager';
import { createScales, createRenderContext } from '../../lib/transformer';
import { detectKeyPoints } from '../../lib/keyPointDetector';
// deleted import '../../lib/implicitKeyPointDetector';
import { drawKeyPoints, drawKeyPointTooltip, findHoveredKeyPoint } from './KeyPointRenderer';
import { createDerivativeFunction } from '../../lib/derivative';
import { SAMPLE_PRESETS, POLAR_SAMPLE_PRESETS } from '../../types';
import { getThreeDRenderManager } from '../../lib/threeD/threeDRenderManager';
import type { ContourSegment, KeyPoint } from '../../types';

/**
 * 计算点到线段的最短距离和最近点
 */
function pointToSegmentDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): { distance: number; nearestPx: number; nearestPy: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // 线段退化为点
    return {
      distance: Math.sqrt((px - x1) ** 2 + (py - y1) ** 2),
      nearestPx: x1,
      nearestPy: y1,
    };
  }

  // 计算投影参数 t
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t)); // 限制在线段范围内

  // 计算线段上最近的点
  const nearestPx = x1 + t * dx;
  const nearestPy = y1 + t * dy;

  // 计算距离
  const distance = Math.sqrt((px - nearestPx) ** 2 + (py - nearestPy) ** 2);

  return { distance, nearestPx, nearestPy };
}

export const FunctionCanvas: React.FC = () => {
  const {
    functions,
    parametricFunctions,
    implicitFunctions,
    polarFunctions,
    viewPort,
    interaction,
    showGrid,
    samplePreset,
    aspectRatioMode,
    isSliderActive,
    keyPoints,
    hoverKeyPoint,
    showKeyPoints,
    selectedFunctionId,
    evaluateX,
    systemType,
    threeDFunctions,
    implicit3DFunctions,
    threeDVersion,
    setHoverPoint,
    setDragging,
    setViewPort,
    setKeyPoints,
    setHoverKeyPoint,
    setCanvasRef,
  } = useAppStore();

  const { canvasRef, containerRef, canvasSize, getContext, clearCanvas } = useCanvas();
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  // 3D 渲染回调引用（给 manager 异步 MC 完成时使用）
  const request3DRenderRef = useRef<() => void>(() => {});
  useEffect(() => {
    getThreeDRenderManager().onNeedsRender = () => request3DRenderRef.current();
    return () => { getThreeDRenderManager().onNeedsRender = null; };
  }, []);

  // WASD + 垂直移动 键盘状态
  const wasdRef = useRef({ w: false, a: false, s: false, d: false, x: false, space: false });
  const wasdLoopRef = useRef<number | undefined>(undefined);

  // 3D 渲染缓存：采用 Three.js 官方 "Rendering on Demand" 模式
  const threeDCacheRef = useRef<HTMLCanvasElement | null>(null);
  const threeDRenderRequested = useRef(false);

  // 请求 3D 重渲染（渲染完直接画到主 canvas，不依赖 React 重渲染）
  const request3DRender = useCallback(() => {
    if (threeDRenderRequested.current) return;
    threeDRenderRequested.current = true;
    requestAnimationFrame(() => {
      threeDRenderRequested.current = false;
      const ctx = getContext();
      if (!ctx || canvasSize.width === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const threeDManager = getThreeDRenderManager();
      const visible3D = threeDFunctions.filter(f => f.visible && !f.error);
      const glCanvas = threeDManager.renderToCanvas(visible3D, implicit3DFunctions, {
        width: Math.round(canvasSize.width * dpr),
        height: Math.round(canvasSize.height * dpr),
      });
      threeDCacheRef.current = glCanvas;

      // 直接画到主 canvas，确保即时刷新
      clearCanvas();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      if (glCanvas) {
        ctx.drawImage(glCanvas, 0, 0);
      }
    });
  }, [canvasSize, threeDFunctions, implicit3DFunctions, getContext, clearCanvas]);
  request3DRenderRef.current = request3DRender;

  // 3D 函数/画布/系统切换时触发重渲染
  useEffect(() => {
    if (systemType === '3d') request3DRender();
  }, [threeDFunctions, implicit3DFunctions, canvasSize.width, canvasSize.height, systemType, threeDVersion, request3DRender]);

  // WASD 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'a' || key === 's' || key === 'd' || key === 'x') {
        e.preventDefault();
        if (key === 'w') wasdRef.current.w = true;
        else if (key === 'a') wasdRef.current.a = true;
        else if (key === 's') wasdRef.current.s = true;
        else if (key === 'd') wasdRef.current.d = true;
        else if (key === 'x') wasdRef.current.x = true;
      }
      if (e.key === ' ') {
        e.preventDefault();
        wasdRef.current.space = true;
      }
      if (key === 'f') {
        e.preventDefault();
        if (useAppStore.getState().systemType === '3d') {
          getThreeDRenderManager().resetCamera();
          useAppStore.getState().bumpThreeDVersion();
        } else {
          useAppStore.getState().resetView();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w') wasdRef.current.w = false;
      else if (key === 'a') wasdRef.current.a = false;
      else if (key === 's') wasdRef.current.s = false;
      else if (key === 'd') wasdRef.current.d = false;
      else if (key === 'x') wasdRef.current.x = false;
      if (e.key === ' ') wasdRef.current.space = false;
    };

    const handleBlur = () => {
      wasdRef.current = { w: false, a: false, s: false, d: false, x: false, space: false };
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // WASD 移动循环（仅在 3D 模式）
  useEffect(() => {
    if (systemType !== '3d') {
      wasdRef.current = { w: false, a: false, s: false, d: false, x: false, space: false };
      return;
    }

    const loop = () => {
      const keys = wasdRef.current;
      const forward = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
      const right = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      const vertical = (keys.space ? 1 : 0) - (keys.x ? 1 : 0);

      if (forward !== 0 || right !== 0) {
        getThreeDRenderManager().handleWASDMovement(forward, right);
      }
      if (vertical !== 0) {
        getThreeDRenderManager().handleVerticalMovement(vertical);
      }
      if (forward !== 0 || right !== 0 || vertical !== 0) {
        request3DRender();
      }

      wasdLoopRef.current = requestAnimationFrame(loop);
    };

    wasdLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (wasdLoopRef.current) {
        cancelAnimationFrame(wasdLoopRef.current);
      }
    };
  }, [systemType, request3DRender]);
  // 缓存关键点哈希，避免 RAF 内频繁 setKeyPoints 触发不必要的重渲染
  const lastKeyPointsHashRef = useRef<Map<string, string>>(new Map());

  function keyPointsChanged(functionId: string, kps: KeyPoint[]): boolean {
    const hash = kps.length === 0 ? 'empty' : JSON.stringify(kps.map(kp => `${kp.type}:${kp.x.toFixed(6)}:${(kp.y ?? 'nan').toString()}`));
    const last = lastKeyPointsHashRef.current.get(functionId);
    if (last === hash) return false;
    lastKeyPointsHashRef.current.set(functionId, hash);
    return true;
  }

  // 缓存隐函数线段数据，用于悬停检测
  const implicitSegmentsRef = useRef<Map<string, ContourSegment[]>>(new Map());

  // 缓存普通/参数化函数采样点，用于悬停检测（避免陡峭函数"相同x坐标"检测失效）
  const functionPointsRef = useRef<Map<string, { x: Float64Array; y: Float64Array }>>(new Map());

  // 注册 canvas 引用到 store（用于导出）
  useEffect(() => {
    if (canvasRef.current) {
      setCanvasRef(canvasRef.current);
    }
    return () => setCanvasRef(null);
  }, [canvasRef, setCanvasRef]);

  // 渲染函数
  const render = useCallback(() => {
    const ctx = getContext();
    if (!ctx || canvasSize.width === 0 || canvasSize.height === 0) return;

    // 清空画布
    clearCanvas();

    // 填充背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // 3D 系统渲染路径（持续循环但只做 drawImage，开销极低）
    if (systemType === '3d') {
      if (threeDCacheRef.current) {
        ctx.drawImage(threeDCacheRef.current, 0, 0);
      }
      // 3D 模式需要持续自循环以保证即时响应（request3DRender 负责实际 Three.js 渲染）
      animationFrameRef.current = requestAnimationFrame(render);
      return; // 跳过所有 2D 渲染
    }

    // 创建统一的渲染上下文（解决采样范围和渲染范围不同步的问题）
    const renderCtx = createRenderContext(viewPort, canvasSize, aspectRatioMode);

    // 绘制网格
    if (showGrid) {
      drawGrid(ctx, viewPort, canvasSize, aspectRatioMode);
    }

    // 计算采样点数：基于画布像素和精度挡位动态调整
    const preset = SAMPLE_PRESETS[samplePreset];
    const pixelBasedCount = canvasSize.width * preset.multiplier;
    const dynamicSampleCount = Math.max(500, Math.min(pixelBasedCount, preset.maxCount));

    // 使用统一的采样范围
    const { sampleXMin, sampleXMax } = renderCtx;

    // 渲染普通函数曲线
    functionPointsRef.current.clear();

    for (const fn of functions) {
      if (!fn.visible || fn.error) continue;

      const points = cachedSample(fn.compiled, `normal-${fn.id}-${fn.expression}`, {
        xMin: sampleXMin,
        xMax: sampleXMax,
        sampleCount: dynamicSampleCount,
      });

      // 缓存采样点用于悬停检测
      functionPointsRef.current.set(fn.id, points);

      drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);

      // 绘制导数曲线
      if (fn.showDerivative) {
        const derivativeFn = createDerivativeFunction(fn.compiled);
        const derivativePoints = cachedSample(derivativeFn, `normal-${fn.id}-${fn.expression}-deriv`, {
          xMin: sampleXMin,
          xMax: sampleXMax,
          sampleCount: dynamicSampleCount,
        });
        drawDerivativeCurve(ctx, derivativePoints, fn.color, viewPort, canvasSize, aspectRatioMode);
      }

      // 检测关键点（防抖提交，避免 RAF 内频繁触发 store 更新）
      const kps = detectKeyPoints(fn.compiled, points, fn.id);
      if (keyPointsChanged(fn.id, kps)) {
        setKeyPoints(fn.id, kps);
      }
    }

    // 渲染参数化函数曲线
    for (const fn of parametricFunctions) {
      if (!fn.visible || fn.error) continue;

      // 绑定当前参数值
      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) {
        currentParams[p.name] = p.currentValue;
      }

      const boundFn = (x: number) => fn.compiled(x, currentParams);

      const points = cachedSample(boundFn, `parametric-${fn.id}-${fn.expression}`, {
        xMin: sampleXMin,
        xMax: sampleXMax,
        sampleCount: dynamicSampleCount,
      }, currentParams);

      // 缓存采样点用于悬停检测
      functionPointsRef.current.set(fn.id, points);

      drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);

      // 绘制导数曲线
      if (fn.showDerivative) {
        const derivativeFn = createDerivativeFunction(boundFn);
        const derivativePoints = cachedSample(derivativeFn, `parametric-${fn.id}-${fn.expression}-deriv`, {
          xMin: sampleXMin,
          xMax: sampleXMax,
          sampleCount: dynamicSampleCount,
        }, currentParams);
        drawDerivativeCurve(ctx, derivativePoints, fn.color, viewPort, canvasSize, aspectRatioMode);
      }

      // 检测关键点（防抖提交）
      const kps = detectKeyPoints(boundFn, points, fn.id);
      if (keyPointsChanged(fn.id, kps)) {
        setKeyPoints(fn.id, kps);
      }
    }

    // 渲染隐函数曲线
    // 清空隐函数线段缓存（每次渲染时重新填充）
    implicitSegmentsRef.current.clear();

    // 获取 WebGL 管理器（如果至少有一个函数启用了 GPU 渲染）
    const hasGPUImplicit = implicitFunctions.some(fn => fn.visible && !fn.error && fn.useGPURendering && !fn.requiresCPU);
    const webglManager = hasGPUImplicit ? getWebGLManager() : null;

    if (webglManager && isWebGLAvailable()) {
      webglManager.resize(canvasSize.width, canvasSize.height);

      // 注册需要 GPU 渲染的函数
      for (const fn of implicitFunctions) {
        if (fn.visible && !fn.error && fn.useGPURendering && !fn.requiresCPU) {
          webglManager.registerFunction(fn);
        }
      }

      // 渲染 GPU 函数到 WebGL canvas
      const gpuFunctions = implicitFunctions.filter(fn => fn.visible && !fn.error && fn.useGPURendering && !fn.requiresCPU);
      if (gpuFunctions.length > 0) {
        const glCanvas = webglManager.renderToCanvas(
          gpuFunctions,
          viewPort,
          {
            offsetX: renderCtx.offsetX,
            offsetY: renderCtx.offsetY,
            actualWidth: renderCtx.actualWidth,
            actualHeight: renderCtx.actualHeight,
          }
        );

        if (glCanvas) {
          ctx.drawImage(glCanvas, 0, 0);
        }
      }
    }

    // 渲染 CPU 函数（未启用 GPU 或 requiresCPU）
    for (const fn of implicitFunctions) {
      if (!fn.visible || fn.error) continue;
      if (fn.useGPURendering && !fn.requiresCPU) continue;  // 已由 GPU 渲染

      // 绑定当前参数值
      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) {
        currentParams[p.name] = p.currentValue;
      }

      const boundFn = (x: number, y: number) => fn.compiled(x, y, currentParams);

      // 使用统一的渲染上下文计算采样范围
      const sampleViewPort = {
        xMin: renderCtx.sampleXMin,
        xMax: renderCtx.sampleXMax,
        yMin: renderCtx.sampleYMin,
        yMax: renderCtx.sampleYMax,
      };

      // 根据精度预设确定网格大小
      const gridSizes: Record<string, { slider: number; normal: number }> = {
        'fast': { slider: 32, normal: 64 },
        'normal': { slider: 48, normal: 96 },
        'fine': { slider: 64, normal: 128 },
        'ultra': { slider: 80, normal: 160 },
      };

      const sizes = gridSizes[samplePreset] || gridSizes['normal'];
      const gridSize = isSliderActive ? sizes.slider : sizes.normal;

      const segments = fastRenderWithCache(
        boundFn,
        sampleViewPort,
        gridSize,
        `implicit-cpu-${fn.id}-${fn.expression}`,
        currentParams
      );

      // 缓存线段数据用于悬停检测
      implicitSegmentsRef.current.set(fn.id, segments);

      // 绘制隐函数曲线
      drawImplicitCurve(ctx, segments, fn.color, viewPort, canvasSize, aspectRatioMode);
    }

    // GPU 渲染的函数也需要低分辨率采样用于悬停检测
    for (const fn of implicitFunctions) {
      if (!fn.visible || fn.error) continue;
      if (!fn.useGPURendering || fn.requiresCPU) continue;  // 已由 CPU 渲染

      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) {
        currentParams[p.name] = p.currentValue;
      }

      const boundFn = (x: number, y: number) => fn.compiled(x, y, currentParams);
      const sampleViewPort = {
        xMin: renderCtx.sampleXMin,
        xMax: renderCtx.sampleXMax,
        yMin: renderCtx.sampleYMin,
        yMax: renderCtx.sampleYMax,
      };

      // 使用中等分辨率网格用于悬停检测（与 GPU 渲染匹配）
      const hoverGridSize = Math.min(128, Math.max(64, Math.floor(canvasSize.width / 8)));
      const segments = fastRenderWithCache(
        boundFn,
        sampleViewPort,
        hoverGridSize,
        `implicit-hover-${fn.id}-${fn.expression}`,
        currentParams
      );

      implicitSegmentsRef.current.set(fn.id, segments);
    }

    // 渲染极坐标函数曲线
    // 获取需要 GPU 渲染的极坐标函数
    const gpuPolarFunctions = polarFunctions.filter(fn => fn.visible && !fn.error && fn.useGPURendering);
    const hasGPUPolar = gpuPolarFunctions.length > 0;
    const polarWebGLManager = hasGPUPolar ? getPolarWebGLManager() : null;

    if (polarWebGLManager && isPolarWebGLAvailable()) {
      polarWebGLManager.resize(canvasSize.width, canvasSize.height);

      // 注册 GPU 函数
      for (const fn of gpuPolarFunctions) {
        polarWebGLManager.registerFunction(fn);
      }

      // 渲染 GPU 函数
      const glCanvas = polarWebGLManager.renderToCanvas(
        gpuPolarFunctions,
        viewPort,
        samplePreset,
        {
          offsetX: renderCtx.offsetX,
          offsetY: renderCtx.offsetY,
          actualWidth: renderCtx.actualWidth,
          actualHeight: renderCtx.actualHeight,
        }
      );

      if (glCanvas) {
        ctx.drawImage(glCanvas, 0, 0);
      }

      // GPU 函数的悬停检测采样
      for (const fn of gpuPolarFunctions) {
        const currentParams: Record<string, number> = {};
        for (const p of fn.parameters) {
          currentParams[p.name] = p.currentValue;
        }

        const polarPoints = samplePolarFunctionFast(fn.compiled, currentParams, fn.thetaMin, fn.thetaMax, 60);
        const xArray = new Float64Array(polarPoints.length);
        const yArray = new Float64Array(polarPoints.length);

        for (let i = 0; i < polarPoints.length; i++) {
          xArray[i] = polarPoints[i].x;
          yArray[i] = polarPoints[i].y;
        }

        functionPointsRef.current.set(`polar-${fn.id}`, { x: xArray, y: yArray });
      }
    }

    // CPU 渲染未启用 GPU 的极坐标函数
    for (const fn of polarFunctions) {
      if (!fn.visible || fn.error) continue;
      if (fn.useGPURendering) continue;  // 已由 GPU 渲染

      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) {
        currentParams[p.name] = p.currentValue;
      }

      // 动态计算采样点数
      const presetStepsPerRadian = POLAR_SAMPLE_PRESETS[samplePreset].stepsPerRadian;
      const stepsPerRadian = fn.stepsPerRadian ?? presetStepsPerRadian;
      const steps = isSliderActive
        ? Math.max(60, Math.ceil((fn.thetaMax - fn.thetaMin) * 16))  // 滑动时降低精度
        : Math.max(60, Math.min(2000, Math.ceil((fn.thetaMax - fn.thetaMin) * stepsPerRadian)));
      const polarPoints = samplePolarFunctionFast(fn.compiled, currentParams, fn.thetaMin, fn.thetaMax, steps);

      const xArray = new Float64Array(polarPoints.length);
      const yArray = new Float64Array(polarPoints.length);

      for (let i = 0; i < polarPoints.length; i++) {
        xArray[i] = polarPoints[i].x;
        yArray[i] = polarPoints[i].y;
      }

      const points = { x: xArray, y: yArray };
      drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);
      functionPointsRef.current.set(`polar-${fn.id}`, points);


    }

    // 绘制关键点（按函数单独控制）
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

    if (visibleKeyPoints.length > 0) {
      drawKeyPoints(ctx, visibleKeyPoints, viewPort, canvasSize, aspectRatioMode);
    }

    // 绘制悬停的关键点提示框
    if (hoverKeyPoint) {
      drawKeyPointTooltip(ctx, hoverKeyPoint, viewPort, canvasSize, aspectRatioMode);
    }

    // 绘制悬停点
    if (interaction.hoverPoint) {
      const fn = functions.find(f => f.id === interaction.hoverPoint?.functionId) ||
                 parametricFunctions.find(f => f.id === interaction.hoverPoint?.functionId);
      const implicitFn = implicitFunctions.find(f => f.id === interaction.hoverPoint?.functionId);
      const polarFn = polarFunctions.find(f => f.id === interaction.hoverPoint?.functionId);
      const color = fn?.color || implicitFn?.color || polarFn?.color || '#FFFFFF';

      if (fn || implicitFn || polarFn) {
        drawHoverPoint(ctx, interaction.hoverPoint, color, viewPort, canvasSize, aspectRatioMode);

        // 在鼠标位置旁边显示坐标
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

          if (boxX + boxWidth > canvasSize.width - 10) {
            boxX = mousePosRef.current.x - boxWidth - 15;
          }
          if (boxY < 10) boxY = 10;
          if (boxY + boxHeight > canvasSize.height - 10) {
            boxY = canvasSize.height - boxHeight - 10;
          }

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

    // 绘制选中函数的计算点
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

          ctx.fillStyle = selectedFn.color;
          ctx.shadowColor = selectedFn.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }
    }

    // 绘制标记点
    const { xScale, yScale } = createScales(viewPort, canvasSize, aspectRatioMode);

    for (const fn of functions) {
      if (!fn.visible || fn.error || !fn.markedPoints) continue;
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

        ctx.restore();
      }
    }

    for (const fn of parametricFunctions) {
      if (!fn.visible || fn.error || !fn.markedPoints) continue;
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

        ctx.restore();
      }
    }

  }, [getContext, clearCanvas, canvasSize, viewPort, functions, parametricFunctions, implicitFunctions, polarFunctions, showGrid, samplePreset, aspectRatioMode, interaction.hoverPoint, keyPoints, hoverKeyPoint, showKeyPoints, selectedFunctionId, evaluateX, isSliderActive, systemType, threeDFunctions, setKeyPoints]);

  // 使用 requestAnimationFrame 渲染
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  // 鼠标移动处理
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    mousePosRef.current = { x: px, y: py };

    // 3D 模式：轨道旋转 / 平移
    if (systemType === '3d') {
      if (lastMousePosRef.current) {
        const dx = px - lastMousePosRef.current.x;
        const dy = py - lastMousePosRef.current.y;
        const mgr = getThreeDRenderManager();
        let moved = false;
        if (e.buttons === 1) {
          if (e.shiftKey) {
            mgr.handlePan(dx, dy);
          } else {
            mgr.handleMouseDrag(dx, dy);
          }
          moved = true;
        } else if (e.buttons === 2) {
          mgr.handlePan(dx, dy);
          moved = true;
        }
        if (moved) request3DRender();
      }
      lastMousePosRef.current = { x: px, y: py };
      return;
    }

    if (interaction.isDragging && lastMousePosRef.current) {
      const scales = createScales(viewPort, canvasSize, aspectRatioMode);
      const dx = scales.xScale.invert(px) - scales.xScale.invert(lastMousePosRef.current.x);
      const dy = scales.yScale.invert(py) - scales.yScale.invert(lastMousePosRef.current.y);

      setViewPort({
        xMin: viewPort.xMin - dx,
        xMax: viewPort.xMax - dx,
        yMin: viewPort.yMin - dy,
        yMax: viewPort.yMax - dy,
      });

      lastMousePosRef.current = { x: px, y: py };
      return;
    }

    // 关键点悬停检测
    if (showKeyPoints) {
      const hoveredKP = findHoveredKeyPoint(px, py, keyPoints, viewPort, canvasSize, aspectRatioMode);
      if (hoveredKP) {
        setHoverKeyPoint(hoveredKP);
        setHoverPoint(null);
        return;
      }
    }

    if (hoverKeyPoint) {
      setHoverKeyPoint(null);
    }

    // 曲线悬停检测：使用"点到折线距离"替代"相同x坐标的垂直距离"
    // 解决陡峭函数（tan(x)靠近π/2、ln(x)靠近0）悬停断断续续的问题
    const scales = createScales(viewPort, canvasSize, aspectRatioMode);

    let closestPoint: { x: number; y: number; functionId: string; distance: number } | null = null;
    const threshold = 12;
    // 与 CurveRenderer 一致的渐近线斜率阈值（像素单位）
    const ASYMPTOTE_SLOPE_THRESHOLD = 50000;

    // 辅助函数：检测采样点折线中的最近线段
    const findNearestOnPolyline = (
      points: { x: Float64Array; y: Float64Array } | undefined,
      fnId: string
    ) => {
      if (!points) return;
      const { x, y } = points;
      const n = x.length;
      let prevPx = 0;
      let prevPy = 0;
      let hasPrev = false;

      for (let i = 0; i < n; i++) {
        const yi = y[i];
        if (!isFinite(yi)) {
          hasPrev = false;
          continue;
        }

        const cpx = scales.xScale(x[i]);
        const cpy = scales.yScale(yi);

        // 跳过画布外很远的点（与 CurveRenderer 一致）
        if (cpx < -1000 || cpx > canvasSize.width + 1000) {
          hasPrev = false;
          continue;
        }

        // 检测渐近线：斜率过大时断开路径
        if (hasPrev) {
          const dx = cpx - prevPx;
          const dy = cpy - prevPy;
          if (Math.abs(dx) > 0.1) {
            const slope = Math.abs(dy / dx);
            if (slope > ASYMPTOTE_SLOPE_THRESHOLD) {
              hasPrev = false; // 断开，不连接这段
              continue;
            }
          }
        }

        if (hasPrev) {
          const result = pointToSegmentDistance(px, py, prevPx, prevPy, cpx, cpy);
          if (result.distance < threshold && (!closestPoint || result.distance < closestPoint.distance)) {
            const nearestMathX = scales.xScale.invert(result.nearestPx);
            const nearestMathY = scales.yScale.invert(result.nearestPy);
            closestPoint = { x: nearestMathX, y: nearestMathY, functionId: fnId, distance: result.distance };
          }
        }

        prevPx = cpx;
        prevPy = cpy;
        hasPrev = true;
      }
    };

    // 普通函数悬停检测
    for (const fn of functions) {
      if (!fn.visible || fn.error) continue;
      const points = functionPointsRef.current.get(fn.id);
      findNearestOnPolyline(points, fn.id);
    }

    // 参数化函数悬停检测
    for (const fn of parametricFunctions) {
      if (!fn.visible || fn.error) continue;
      const points = functionPointsRef.current.get(fn.id);
      findNearestOnPolyline(points, fn.id);
    }

    // 极坐标函数悬停检测
    for (const fn of polarFunctions) {
      if (!fn.visible || fn.error) continue;
      const points = functionPointsRef.current.get(`polar-${fn.id}`);
      findNearestOnPolyline(points, fn.id);
    }

    // 隐函数悬停检测
    for (const fn of implicitFunctions) {
      if (!fn.visible || fn.error) continue;

      const segments = implicitSegmentsRef.current.get(fn.id);
      if (!segments || segments.length === 0) continue;

      const scales = createScales(viewPort, canvasSize, aspectRatioMode);

      // 遍历所有线段，找最近的点
      for (const seg of segments) {
        // 将线段端点转换为画布坐标
        const px1 = scales.xScale(seg.x1);
        const py1 = scales.yScale(seg.y1);
        const px2 = scales.xScale(seg.x2);
        const py2 = scales.yScale(seg.y2);

        // 计算鼠标到线段的最短距离
        const result = pointToSegmentDistance(px, py, px1, py1, px2, py2);

        if (result.distance < threshold && (!closestPoint || result.distance < closestPoint.distance)) {
          // 将最近点转换回数学坐标
          const nearestMathX = scales.xScale.invert(result.nearestPx);
          const nearestMathY = scales.yScale.invert(result.nearestPy);
          closestPoint = { x: nearestMathX, y: nearestMathY, functionId: fn.id, distance: result.distance };
        }
      }
    }

    setHoverPoint(closestPoint ? { x: closestPoint.x, y: closestPoint.y, functionId: closestPoint.functionId } : null);
  }, [canvasRef, canvasSize, viewPort, functions, parametricFunctions, implicitFunctions, polarFunctions, interaction.isDragging, setHoverPoint, setViewPort, keyPoints, hoverKeyPoint, showKeyPoints, setHoverKeyPoint, systemType, request3DRender]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    lastMousePosRef.current = { x: px, y: py };

    if (systemType === '3d') return; // 3D 模式不触发 2D drag

    setDragging(true, { x: px, y: py });
  }, [canvasRef, setDragging, systemType]);

  const handleMouseUp = useCallback(() => {
    lastMousePosRef.current = null;
    setDragging(false);
  }, [setDragging]);

  const handleMouseLeave = useCallback(() => {
    setHoverPoint(null);
    setHoverKeyPoint(null);
    setDragging(false);
    lastMousePosRef.current = null;
    mousePosRef.current = null;
  }, [setHoverPoint, setHoverKeyPoint, setDragging]);

  // 原生 wheel 事件（使用 { passive: false } 以支持 preventDefault）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // 3D 模式：光标中心缩放
      if (systemType === '3d') {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const ndcX = (px / canvasSize.width) * 2 - 1;
        const ndcY = -(py / canvasSize.height) * 2 + 1;
        getThreeDRenderManager().handleZoom(e.deltaY, ndcX, ndcY);
        request3DRender();
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      const scales = createScales(viewPort, canvasSize, aspectRatioMode);
      const centerX = scales.xScale.invert(px);
      const centerY = scales.yScale.invert(py);

      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

      setViewPort({
        xMin: centerX - (centerX - viewPort.xMin) * zoomFactor,
        xMax: centerX + (viewPort.xMax - centerX) * zoomFactor,
        yMin: centerY - (centerY - viewPort.yMin) * zoomFactor,
        yMax: centerY + (viewPort.yMax - centerY) * zoomFactor,
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [canvasRef, canvasSize, viewPort, aspectRatioMode, setViewPort, systemType, request3DRender]);

  const handleDoubleClick = useCallback(() => {
    useAppStore.getState().resetView();
  }, []);

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
        onContextMenu={(e) => { if (systemType === '3d') e.preventDefault(); }}
      />
    </div>
  );
};