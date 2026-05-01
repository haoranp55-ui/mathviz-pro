// src/components/Canvas/FunctionCanvas.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvas } from '../../hooks/useCanvas';
import { drawGrid } from './GridRenderer';
import { drawCurve, drawHoverPoint, drawDerivativeCurve } from './CurveRenderer';
import { drawImplicitCurve } from './ImplicitCurveRenderer';
import { cachedSample } from '../../lib/sampler';
import { cachedIntervalMarchingSquares } from '../../lib/implicitSamplerInterval';
import { canvasToMath, createScales, createRenderContext } from '../../lib/transformer';
import { detectKeyPoints } from '../../lib/keyPointDetector';
import { detectImplicitKeyPoints } from '../../lib/implicitKeyPointDetector';
import { drawKeyPoints, drawKeyPointTooltip, findHoveredKeyPoint } from './KeyPointRenderer';
import { createDerivativeFunction } from '../../lib/derivative';
import { SAMPLE_PRESETS } from '../../types';
import type { ContourSegment } from '../../types';

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

  // 上一次渲染的视口范围，用于判断是否需要重新采样
  const lastViewPortRef = useRef<{ xMin: number; xMax: number } | null>(null);

  // 缓存隐函数线段数据，用于悬停检测
  const implicitSegmentsRef = useRef<Map<string, ContourSegment[]>>(new Map());

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
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

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
    for (const fn of functions) {
      if (!fn.visible || fn.error) continue;

      const points = cachedSample(fn.compiled, `normal-${fn.id}`, {
        xMin: sampleXMin,
        xMax: sampleXMax,
        sampleCount: dynamicSampleCount,
      });

      drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);

      // 绘制导数曲线
      if (fn.showDerivative) {
        const derivativeFn = createDerivativeFunction(fn.compiled);
        const derivativePoints = cachedSample(derivativeFn, `normal-${fn.id}-deriv`, {
          xMin: sampleXMin,
          xMax: sampleXMax,
          sampleCount: dynamicSampleCount,
        });
        drawDerivativeCurve(ctx, derivativePoints, fn.color, viewPort, canvasSize, aspectRatioMode);
      }

      // 检测关键点
      const kps = detectKeyPoints(fn.compiled, points, fn.id);
      setKeyPoints(fn.id, kps);
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

      const points = cachedSample(boundFn, `parametric-${fn.id}`, {
        xMin: sampleXMin,
        xMax: sampleXMax,
        sampleCount: dynamicSampleCount,
      }, currentParams);

      drawCurve(ctx, points, fn.color, viewPort, canvasSize, aspectRatioMode);

      // 绘制导数曲线
      if (fn.showDerivative) {
        const derivativeFn = createDerivativeFunction(boundFn);
        const derivativePoints = cachedSample(derivativeFn, `parametric-${fn.id}-deriv`, {
          xMin: sampleXMin,
          xMax: sampleXMax,
          sampleCount: dynamicSampleCount,
        }, currentParams);
        drawDerivativeCurve(ctx, derivativePoints, fn.color, viewPort, canvasSize, aspectRatioMode);
      }

      // 检测关键点
      const kps = detectKeyPoints(boundFn, points, fn.id);
      setKeyPoints(fn.id, kps);
    }

    // 渲染隐函数曲线
    // 清空隐函数线段缓存（每次渲染时重新填充）
    implicitSegmentsRef.current.clear();

    for (const fn of implicitFunctions) {
      if (!fn.visible || fn.error) continue;

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

      // 计算实际渲染区域的像素数（考虑 equal 模式的偏移）
      const actualPixelWidth = renderCtx.actualWidth;
      const actualPixelHeight = renderCtx.actualHeight;

      // 使用基于区间算术的 Marching Squares 算法采样隐函数（带缓存）
      // 这种方法可以正确处理渐近线，避免产生"杂线"
      // 滑钮滑动时使用 fast 挡位以提升性能
      const effectivePreset = isSliderActive ? 'fast' : samplePreset;
      const segments = cachedIntervalMarchingSquares(
        boundFn,
        sampleViewPort,
        actualPixelWidth,
        actualPixelHeight,
        `implicit-interval-${fn.id}`,
        effectivePreset
      );

      // 缓存线段数据用于悬停检测
      implicitSegmentsRef.current.set(fn.id, segments);

      // 绘制隐函数曲线
      drawImplicitCurve(ctx, segments, fn.color, viewPort, canvasSize, aspectRatioMode);

      // 检测隐函数关键点
      if (fn.showKeyPoints) {
        const implicitKps = detectImplicitKeyPoints(segments, fn.id, sampleViewPort);
        setKeyPoints(fn.id, implicitKps);
      } else {
        setKeyPoints(fn.id, []);
      }
    }

    // 绘制关键点（按函数单独控制）
    const visibleKeyPoints = keyPoints.filter(kp => {
      const normalFn = functions.find(f => f.id === kp.functionId);
      if (normalFn && normalFn.visible && normalFn.showKeyPoints) return true;

      const paramFn = parametricFunctions.find(f => f.id === kp.functionId);
      if (paramFn && paramFn.visible && paramFn.showKeyPoints) return true;

      const implicitFn = implicitFunctions.find(f => f.id === kp.functionId);
      if (implicitFn && implicitFn.visible && implicitFn.showKeyPoints) return true;

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
      const color = fn?.color || implicitFn?.color || '#FFFFFF';

      if (fn || implicitFn) {
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

    // 记录当前视口范围
    lastViewPortRef.current = { xMin: viewPort.xMin, xMax: viewPort.xMax };
  }, [getContext, clearCanvas, canvasSize, viewPort, functions, parametricFunctions, implicitFunctions, showGrid, samplePreset, aspectRatioMode, interaction.hoverPoint, keyPoints, hoverKeyPoint, showKeyPoints, selectedFunctionId, evaluateX, isSliderActive, setKeyPoints]);

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

    // 曲线悬停检测
    const mathCoord = canvasToMath(px, py, createScales(viewPort, canvasSize, aspectRatioMode));

    let closestPoint: { x: number; y: number; functionId: string; distance: number } | null = null;
    const threshold = 12;

    for (const fn of functions) {
      if (!fn.visible || fn.error) continue;

      try {
        const y = fn.compiled(mathCoord.x);
        if (!isFinite(y)) continue;

        const pointPx = createScales(viewPort, canvasSize, aspectRatioMode).xScale(mathCoord.x);
        const pointPy = createScales(viewPort, canvasSize, aspectRatioMode).yScale(y);

        const distance = Math.sqrt(Math.pow(px - pointPx, 2) + Math.pow(py - pointPy, 2));

        if (distance < threshold && (!closestPoint || distance < closestPoint.distance)) {
          closestPoint = { x: mathCoord.x, y, functionId: fn.id, distance };
        }
      } catch {
        continue;
      }
    }

    for (const fn of parametricFunctions) {
      if (!fn.visible || fn.error) continue;

      try {
        const currentParams: Record<string, number> = {};
        for (const p of fn.parameters) {
          currentParams[p.name] = p.currentValue;
        }

        const y = fn.compiled(mathCoord.x, currentParams);
        if (!isFinite(y)) continue;

        const pointPx = createScales(viewPort, canvasSize, aspectRatioMode).xScale(mathCoord.x);
        const pointPy = createScales(viewPort, canvasSize, aspectRatioMode).yScale(y);

        const distance = Math.sqrt(Math.pow(px - pointPx, 2) + Math.pow(py - pointPy, 2));

        if (distance < threshold && (!closestPoint || distance < closestPoint.distance)) {
          closestPoint = { x: mathCoord.x, y, functionId: fn.id, distance };
        }
      } catch {
        continue;
      }
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
  }, [canvasRef, canvasSize, viewPort, functions, parametricFunctions, implicitFunctions, interaction.isDragging, setHoverPoint, setViewPort, keyPoints, hoverKeyPoint, showKeyPoints, setHoverKeyPoint]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    lastMousePosRef.current = { x: px, y: py };
    setDragging(true, { x: px, y: py });
  }, [canvasRef, setDragging]);

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

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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
  }, [canvasRef, canvasSize, viewPort, setViewPort]);

  const handleDoubleClick = useCallback(() => {
    useAppStore.getState().resetView();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-canvas-bg">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
};