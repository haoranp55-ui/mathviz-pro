// src/hooks/use3DRenderer.ts
import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { CanvasHookResult } from './useCanvas';

interface Use3DRendererProps {
  canvas: CanvasHookResult;
  systemType: string;
}

// 动态导入 Three.js，避免在 2D 模式下加载 ~600KB
async function getThreeDRenderManager() {
  const { getThreeDRenderManager: fn } = await import('../lib/threeD/threeDRenderManager');
  return fn();
}

export function use3DRenderer({ canvas, systemType }: Use3DRendererProps) {
  const { canvasSize, getContext, clearCanvas } = canvas;
  const threeDFunctions = useAppStore(state => state.threeDFunctions);
  const implicit3DFunctions = useAppStore(state => state.implicit3DFunctions);
  const threeDVersion = useAppStore(state => state.threeDVersion);

  const threeDCacheRef = useRef<HTMLCanvasElement | null>(null);
  const threeDRenderRequested = useRef(false);
  const request3DRenderRef = useRef<() => void>(() => {});

  const wasdRef = useRef({ w: false, a: false, s: false, d: false, x: false, space: false });
  const wasdLoopRef = useRef<number | undefined>(undefined);

  const request3DRender = useCallback(() => {
    if (threeDRenderRequested.current) return;
    threeDRenderRequested.current = true;
    requestAnimationFrame(async () => {
      threeDRenderRequested.current = false;
      const ctx = getContext();
      if (!ctx || canvasSize.width === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const threeDManager = await getThreeDRenderManager();
      const visible3D = threeDFunctions.filter(f => f.visible && !f.error);
      const glCanvas = threeDManager.renderToCanvas(visible3D, implicit3DFunctions, {
        width: Math.round(canvasSize.width * dpr),
        height: Math.round(canvasSize.height * dpr),
      });
      threeDCacheRef.current = glCanvas;

      clearCanvas();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      if (glCanvas) ctx.drawImage(glCanvas, 0, 0);
    });
  }, [canvasSize, threeDFunctions, implicit3DFunctions, getContext, clearCanvas]);

  useEffect(() => {
    request3DRenderRef.current = request3DRender;
  }, [request3DRender]);

  useEffect(() => {
    (async () => {
      const mgr = await getThreeDRenderManager();
      mgr.onNeedsRender = () => request3DRenderRef.current();
    })();
    return () => {
      getThreeDRenderManager().then(mgr => { mgr.onNeedsRender = null; });
    };
  }, []);

  useEffect(() => {
    if (systemType === '3d') request3DRender();
  }, [threeDFunctions, implicit3DFunctions, canvasSize.width, canvasSize.height, systemType, threeDVersion, request3DRender]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'x'].includes(key)) {
        e.preventDefault();
        wasdRef.current[key as keyof typeof wasdRef.current] = true;
      }
      if (e.key === ' ') {
        e.preventDefault();
        wasdRef.current.space = true;
      }
      if (key === 'f') {
        e.preventDefault();
        const store = useAppStore.getState();
        if (store.systemType === '3d') {
          const mgr = await getThreeDRenderManager();
          mgr.resetCamera();
          store.bumpThreeDVersion();
        } else {
          store.resetView();
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'x'].includes(key)) {
        wasdRef.current[key as keyof typeof wasdRef.current] = false;
      }
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

  useEffect(() => {
    if (systemType !== '3d') {
      wasdRef.current = { w: false, a: false, s: false, d: false, x: false, space: false };
      return;
    }
    const loop = async () => {
      const keys = wasdRef.current;
      const forward = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
      const right = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      const vertical = (keys.space ? 1 : 0) - (keys.x ? 1 : 0);
      const mgr = await getThreeDRenderManager();
      if (forward !== 0 || right !== 0) mgr.handleWASDMovement(forward, right);
      if (vertical !== 0) mgr.handleVerticalMovement(vertical);
      if (forward !== 0 || right !== 0 || vertical !== 0) request3DRender();
      wasdLoopRef.current = requestAnimationFrame(loop);
    };
    wasdLoopRef.current = requestAnimationFrame(loop);
    return () => { if (wasdLoopRef.current) cancelAnimationFrame(wasdLoopRef.current); };
  }, [systemType, request3DRender]);

  return { threeDCacheRef, request3DRender, wasdRef };
}
