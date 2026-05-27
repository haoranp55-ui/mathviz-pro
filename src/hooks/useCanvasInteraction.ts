// src/hooks/useCanvasInteraction.ts
import { useCallback, useEffect, useRef } from 'react';
import type { RefObject, MouseEvent as ReactMouseEvent } from 'react';
import { useAppStore } from '../store/useAppStore';
import { createScales } from '../lib/transformer';
import { findHoveredKeyPoint } from '../components/Canvas/KeyPointRenderer';
import type { ContourSegment, CanvasSize } from '../types';

// 动态导入 Three.js，避免在 2D 模式下加载
async function getThreeDRenderManager() {
  const { getThreeDRenderManager: fn } = await import('../lib/threeD/threeDRenderManager');
  return fn();
}

const CLICK_THRESHOLD = 5;
const ASYMPTOTE_SLOPE_THRESHOLD = 50000;

function pointToSegmentDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): { distance: number; nearestPx: number; nearestPy: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) {
    return { distance: Math.sqrt((px - x1) ** 2 + (py - y1) ** 2), nearestPx: x1, nearestPy: y1 };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const nearestPx = x1 + t * dx;
  const nearestPy = y1 + t * dy;
  const distance = Math.sqrt((px - nearestPx) ** 2 + (py - nearestPy) ** 2);
  return { distance, nearestPx, nearestPy };
}

export { pointToSegmentDistance };

interface UseCanvasInteractionProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  canvasSize: CanvasSize;
  request3DRender: () => void;
  functionPointsRef: RefObject<Map<string, { x: Float64Array; y: Float64Array }>>;
  derivedPointsRef: RefObject<Map<string, { x: Float64Array; y: Float64Array }>>;
  implicitSegmentsRef: RefObject<Map<string, ContourSegment[]>>;
}

export function useCanvasInteraction({
  canvasRef,
  canvasSize,
  request3DRender,
  functionPointsRef,
  derivedPointsRef,
  implicitSegmentsRef,
}: UseCanvasInteractionProps) {
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseDownPixelRef = useRef<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback(async (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    mousePosRef.current = { x: px, y: py };

    const { systemType, viewPort, interaction, functions, parametricFunctions, implicitFunctions, polarFunctions, keyPoints, hoverKeyPoint, showKeyPoints, aspectRatioMode, setHoverPoint, setViewPort, setHoverKeyPoint } = useAppStore.getState();

    // 过滤出真正可见的关键点（函数本身开启了关键点显示）
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

    if (systemType === '3d') {
      if (lastMousePosRef.current) {
        const dx = px - lastMousePosRef.current.x;
        const dy = py - lastMousePosRef.current.y;
        const mgr = await getThreeDRenderManager();
        let moved = false;
        if (e.buttons === 1) {
          if (e.shiftKey) { mgr.handlePan(dx, dy); } else { mgr.handleMouseDrag(dx, dy); }
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
        xMin: viewPort.xMin - dx, xMax: viewPort.xMax - dx,
        yMin: viewPort.yMin - dy, yMax: viewPort.yMax - dy,
      });
      lastMousePosRef.current = { x: px, y: py };
      return;
    }

    if (showKeyPoints && visibleKeyPoints.length > 0) {
      const hoveredKP = findHoveredKeyPoint(px, py, visibleKeyPoints, viewPort, canvasSize, aspectRatioMode);
      if (hoveredKP) { setHoverKeyPoint(hoveredKP); setHoverPoint(null); return; }
    }
    if (hoverKeyPoint) setHoverKeyPoint(null);

    const scales = createScales(viewPort, canvasSize, aspectRatioMode);
    let closestPoint: { x: number; y: number; functionId: string; distance: number } | null = null;
    const threshold = 12;

    const findNearestOnPolyline = (
      points: { x: Float64Array; y: Float64Array } | undefined,
      fnId: string
    ) => {
      if (!points) return;
      const { x, y } = points;
      const n = x.length;
      let prevPx = 0, prevPy = 0, hasPrev = false;
      for (let i = 0; i < n; i++) {
        const yi = y[i];
        if (!isFinite(yi)) { hasPrev = false; continue; }
        const cpx = scales.xScale(x[i]);
        const cpy = scales.yScale(yi);
        if (cpx < -1000 || cpx > canvasSize.width + 1000) { hasPrev = false; continue; }
        if (hasPrev) {
          const ddx = cpx - prevPx;
          const ddy = cpy - prevPy;
          if (Math.abs(ddx) > 0.1 && Math.abs(ddy / ddx) > ASYMPTOTE_SLOPE_THRESHOLD) { hasPrev = false; continue; }
        }
        if (hasPrev) {
          const result = pointToSegmentDistance(px, py, prevPx, prevPy, cpx, cpy);
          if (result.distance < threshold && (!closestPoint || result.distance < closestPoint.distance)) {
            closestPoint = { x: scales.xScale.invert(result.nearestPx), y: scales.yScale.invert(result.nearestPy), functionId: fnId, distance: result.distance };
          }
        }
        prevPx = cpx; prevPy = cpy; hasPrev = true;
      }
    };

    for (const fn of functions) { if (!fn.visible || fn.error) continue; findNearestOnPolyline(functionPointsRef.current.get(fn.id), fn.id); }
    for (const fn of parametricFunctions) { if (!fn.visible || fn.error) continue; findNearestOnPolyline(functionPointsRef.current.get(fn.id), fn.id); }
    for (const fn of polarFunctions) { if (!fn.visible || fn.error) continue; findNearestOnPolyline(functionPointsRef.current.get(`polar-${fn.id}`), fn.id); }
    // 导数曲线和积分曲线悬停
    for (const fn of [...functions, ...parametricFunctions]) {
      if (!fn.visible || fn.error) continue;
      if (fn.showDerivative) findNearestOnPolyline(derivedPointsRef.current.get(`deriv-${fn.id}`), fn.id);
      if (fn.showIntegralCurve) findNearestOnPolyline(derivedPointsRef.current.get(`integral-${fn.id}`), fn.id);
    }
    for (const fn of implicitFunctions) {
      if (!fn.visible || fn.error) continue;
      const segments = implicitSegmentsRef.current.get(fn.id);
      if (!segments || segments.length === 0) continue;
      for (const seg of segments) {
        const px1 = scales.xScale(seg.x1), py1 = scales.yScale(seg.y1);
        const px2 = scales.xScale(seg.x2), py2 = scales.yScale(seg.y2);
        const result = pointToSegmentDistance(px, py, px1, py1, px2, py2);
        if (result.distance < threshold && (!closestPoint || result.distance < closestPoint.distance)) {
          closestPoint = { x: scales.xScale.invert(result.nearestPx), y: scales.yScale.invert(result.nearestPy), functionId: fn.id, distance: result.distance };
        }
      }
    }

    setHoverPoint(closestPoint ? { x: closestPoint.x, y: closestPoint.y, functionId: closestPoint.functionId } : null);
  }, [canvasRef, canvasSize, request3DRender, functionPointsRef, derivedPointsRef, implicitSegmentsRef]);

  const handleMouseDown = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    mouseDownPixelRef.current = { x: px, y: py };
    const { systemType, setDragging } = useAppStore.getState();
    if (systemType === '3d') return;
    if (e.button === 0) {
      lastMousePosRef.current = { x: px, y: py };
      setDragging(true, { x: px, y: py });
    }
  }, [canvasRef]);

  const handleMouseUp = useCallback((e: ReactMouseEvent<HTMLCanvasElement>) => {
    const downPos = mouseDownPixelRef.current;
    lastMousePosRef.current = null;
    const { setDragging, systemType, interaction, functions, parametricFunctions, addMarkedPoint, removeMarkedPoint, viewPort, aspectRatioMode } = useAppStore.getState();
    setDragging(false);
    if (!downPos || systemType === '3d') { mouseDownPixelRef.current = null; return; }
    const canvas = canvasRef.current;
    if (!canvas) { mouseDownPixelRef.current = null; return; }
    const rect = canvas.getBoundingClientRect();
    const upX = e.clientX - rect.left;
    const upY = e.clientY - rect.top;
    const dist = Math.sqrt((upX - downPos.x) ** 2 + (upY - downPos.y) ** 2);
    if (dist > CLICK_THRESHOLD) { mouseDownPixelRef.current = null; return; }

    if (e.button === 0) {
      const hoverPt = interaction.hoverPoint;
      if (hoverPt) {
        const isParametric = parametricFunctions.some(f => f.id === hoverPt.functionId);
        const isNormal = functions.some(f => f.id === hoverPt.functionId);
        if (isNormal || isParametric) addMarkedPoint(hoverPt.functionId, hoverPt.x, isParametric);
      }
    }
    if (e.button === 2) {
      const scales = createScales(viewPort, canvasSize, aspectRatioMode);
      const MARKED_POINT_HIT_RADIUS = 15;
      for (const fn of functions) {
        if (!fn.markedPoints) continue;
        for (const point of fn.markedPoints) {
          if (isNaN(point.y)) continue;
          const ppx = scales.xScale(point.x), ppy = scales.yScale(point.y);
          if (Math.sqrt((upX - ppx) ** 2 + (upY - ppy) ** 2) < MARKED_POINT_HIT_RADIUS) { removeMarkedPoint(fn.id, point.id, false); return; }
        }
      }
      for (const fn of parametricFunctions) {
        if (!fn.markedPoints) continue;
        for (const point of fn.markedPoints) {
          if (isNaN(point.y)) continue;
          const ppx = scales.xScale(point.x), ppy = scales.yScale(point.y);
          if (Math.sqrt((upX - ppx) ** 2 + (upY - ppy) ** 2) < MARKED_POINT_HIT_RADIUS) { removeMarkedPoint(fn.id, point.id, true); return; }
        }
      }
    }
    mouseDownPixelRef.current = null;
  }, [canvasRef, canvasSize]);

  const handleMouseLeave = useCallback(() => {
    const { setHoverPoint, setHoverKeyPoint, setDragging } = useAppStore.getState();
    setHoverPoint(null);
    setHoverKeyPoint(null);
    setDragging(false);
    lastMousePosRef.current = null;
    mousePosRef.current = null;
    mouseDownPixelRef.current = null;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = async (e: WheelEvent) => {
      e.preventDefault();
      const { systemType, viewPort, aspectRatioMode, setViewPort } = useAppStore.getState();
      if (systemType === '3d') {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const ndcX = (px / canvasSize.width) * 2 - 1;
        const ndcY = -(py / canvasSize.height) * 2 + 1;
        const mgr = await getThreeDRenderManager();
        mgr.handleZoom(e.deltaY, ndcX, ndcY);
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
  }, [canvasRef, canvasSize, request3DRender]);

  const handleDoubleClick = useCallback(() => {
    useAppStore.getState().resetView();
  }, []);

  return { handleMouseMove, handleMouseDown, handleMouseUp, handleMouseLeave, handleDoubleClick, mousePosRef };
}
