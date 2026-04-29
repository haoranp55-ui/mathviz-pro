// src/components/Canvas/FunctionCanvas.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCanvas } from '../../hooks/useCanvas';
import { drawGrid } from './GridRenderer';
import { drawCurve, drawHoverPoint, drawCoordinateTooltip } from './CurveRenderer';
import { adaptiveSample } from '../../lib/sampler';
import { canvasToMath, createScales } from '../../lib/transformer';
import { detectKeyPoints } from '../../lib/keyPointDetector';
import { drawKeyPoints, drawKeyPointTooltip, findHoveredKeyPoint } from './KeyPointRenderer';

export const FunctionCanvas: React.FC = () => {
  const {
    functions,
    viewPort,
    interaction,
    showGrid,
    sampleCount,
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
  } = useAppStore();

  const { canvasRef, containerRef, canvasSize, getContext, clearCanvas } = useCanvas();
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);

  // 渲染函数
  const render = useCallback(() => {
    const ctx = getContext();
    if (!ctx || canvasSize.width === 0 || canvasSize.height === 0) return;

    // 清空画布
    clearCanvas();

    // 填充背景
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // 绘制网格
    if (showGrid) {
      drawGrid(ctx, viewPort, canvasSize);
    }

    // 绘制函数曲线并检测关键点
    // 动态计算采样点密度
    const xRange = viewPort.xMax - viewPort.xMin;
    const dynamicSampleCount = Math.max(sampleCount, Math.floor(xRange * 50));

    for (const fn of functions) {
      if (!fn.visible || fn.error) continue;

      const points = adaptiveSample(fn.compiled, {
        xMin: viewPort.xMin,
        xMax: viewPort.xMax,
        sampleCount: dynamicSampleCount,
      });

      drawCurve(ctx, points, fn.color, viewPort, canvasSize);

      // 检测关键点
      const kps = detectKeyPoints(fn.compiled, points, fn.id);
      setKeyPoints(fn.id, kps);
    }

    // 绘制关键点
    if (showKeyPoints) {
      const visibleKeyPoints = keyPoints.filter(kp => {
        const fn = functions.find(f => f.id === kp.functionId);
        return fn?.visible;
      });
      drawKeyPoints(ctx, visibleKeyPoints, viewPort, canvasSize);
    }

    // 绘制悬停的关键点提示框
    if (hoverKeyPoint) {
      drawKeyPointTooltip(ctx, hoverKeyPoint, viewPort, canvasSize);
    }

    // 绘制悬停点
    if (interaction.hoverPoint) {
      const fn = functions.find(f => f.id === interaction.hoverPoint?.functionId);
      if (fn) {
        drawHoverPoint(ctx, interaction.hoverPoint, fn.color, viewPort, canvasSize);
        drawCoordinateTooltip(ctx, interaction.hoverPoint, viewPort, canvasSize);
      }
    }

    // 绘制选中函数的计算点
    if (selectedFunctionId) {
      const selectedFn = functions.find(f => f.id === selectedFunctionId);
      if (selectedFn && selectedFn.visible && !selectedFn.error) {
        const yValue = selectedFn.compiled(evaluateX);
        if (isFinite(yValue)) {
          const { xScale, yScale } = createScales(viewPort, canvasSize);
          const px = xScale(evaluateX);
          const py = yScale(yValue);

          // 绘制十字准线
          ctx.save();
          ctx.strokeStyle = selectedFn.color;
          ctx.lineWidth = 1;
          ctx.setLineDash([6, 4]);
          ctx.globalAlpha = 0.6;

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
          ctx.globalAlpha = 1;

          // 绘制点
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
  }, [getContext, clearCanvas, canvasSize, viewPort, functions, showGrid, sampleCount, interaction.hoverPoint, keyPoints, hoverKeyPoint, showKeyPoints, selectedFunctionId, evaluateX, setKeyPoints]);

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

    // 拖拽处理
    if (interaction.isDragging && lastMousePosRef.current) {
      const scales = createScales(viewPort, canvasSize);
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

    // 悬停检测
    // 检测关键点悬停（优先于曲线悬停）
    if (showKeyPoints) {
      const hoveredKP = findHoveredKeyPoint(px, py, keyPoints, viewPort, canvasSize);
      if (hoveredKP) {
        setHoverKeyPoint(hoveredKP);
        setHoverPoint(null);
        return;
      }
    }

    // 如果之前悬停在关键点上，现在移开了
    if (hoverKeyPoint) {
      setHoverKeyPoint(null);
    }

    // 曲线悬停检测
    const mathCoord = canvasToMath(px, py, createScales(viewPort, canvasSize));

    // 查找最近的函数点
    let closestPoint: { x: number; y: number; functionId: string; distance: number } | null = null;
    const threshold = 10; // 像素阈值

    for (const fn of functions) {
      if (!fn.visible || fn.error) continue;

      try {
        const y = fn.compiled(mathCoord.x);
        if (!isFinite(y)) continue;

        const pointPx = createScales(viewPort, canvasSize).xScale(mathCoord.x);
        const pointPy = createScales(viewPort, canvasSize).yScale(y);

        const distance = Math.sqrt(
          Math.pow(px - pointPx, 2) + Math.pow(py - pointPy, 2)
        );

        if (distance < threshold && (!closestPoint || distance < closestPoint.distance)) {
          closestPoint = {
            x: mathCoord.x,
            y,
            functionId: fn.id,
            distance,
          };
        }
      } catch {
        continue;
      }
    }

    setHoverPoint(closestPoint ? { x: closestPoint.x, y: closestPoint.y, functionId: closestPoint.functionId } : null);
  }, [canvasRef, canvasSize, viewPort, functions, interaction.isDragging, setHoverPoint, setViewPort, keyPoints, hoverKeyPoint, showKeyPoints, setHoverKeyPoint]);

  // 鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    lastMousePosRef.current = { x: px, y: py };
    setDragging(true, { x: px, y: py });
  }, [canvasRef, setDragging]);

  // 鼠标释放
  const handleMouseUp = useCallback(() => {
    lastMousePosRef.current = null;
    setDragging(false);
  }, [setDragging]);

  // 鼠标离开
  const handleMouseLeave = useCallback(() => {
    setHoverPoint(null);
    setHoverKeyPoint(null);
    setDragging(false);
    lastMousePosRef.current = null;
  }, [setHoverPoint, setHoverKeyPoint, setDragging]);

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    // 注意：不使用 e.preventDefault() 因为 wheel 事件是 passive

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // 计算缩放中心点
    const scales = createScales(viewPort, canvasSize);
    const centerX = scales.xScale.invert(px);
    const centerY = scales.yScale.invert(py);

    // 缩放因子
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;

    // 计算新视口
    setViewPort({
      xMin: centerX - (centerX - viewPort.xMin) * zoomFactor,
      xMax: centerX + (viewPort.xMax - centerX) * zoomFactor,
      yMin: centerY - (centerY - viewPort.yMin) * zoomFactor,
      yMax: centerY + (viewPort.yMax - centerY) * zoomFactor,
    });
  }, [canvasRef, canvasSize, viewPort, setViewPort]);

  // 双击重置
  const handleDoubleClick = useCallback(() => {
    useAppStore.getState().resetView();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-canvas-bg"
    >
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
