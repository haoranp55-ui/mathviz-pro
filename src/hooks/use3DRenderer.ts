// src/hooks/use3DRenderer.ts
import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { CanvasHookResult } from './useCanvas';
import type { ThreeDRenderManager } from '../lib/threeD/threeDRenderManager';

interface Use3DRendererProps {
  canvas: CanvasHookResult;
  systemType: string;
}

// 动态导入 Three.js，避免在 2D 模式下加载 ~600KB
let cachedManager: Promise<ThreeDRenderManager> | null = null;
async function getThreeDRenderManager() {
  if (!cachedManager) {
    cachedManager = import('../lib/threeD/threeDRenderManager').then(m => m.getThreeDRenderManager());
  }
  return cachedManager;
}

export function use3DRenderer({ canvas, systemType }: Use3DRendererProps) {
  const { canvasSize } = canvas;
  const threeDFunctions = useAppStore(state => state.threeDFunctions);
  const implicit3DFunctions = useAppStore(state => state.implicit3DFunctions);
  const threeDVersion = useAppStore(state => state.threeDVersion);
  const isSliderActive = useAppStore(state => state.isSliderActive);

  const threeDCacheRef = useRef<HTMLCanvasElement | null>(null);
  const threeDRenderRequested = useRef(false);
  const threeDRenderNeeded = useRef(false);
  const request3DRenderRef = useRef<() => void>(() => {});

  // 用 ref 存最新数据，避免 rAF 闭包捕获旧值
  const latestDataRef = useRef({ threeDFunctions, implicit3DFunctions, canvasSize, isSliderActive });

  useEffect(() => {
    latestDataRef.current = { threeDFunctions, implicit3DFunctions, canvasSize, isSliderActive };
  });

  const wasdRef = useRef({ w: false, a: false, s: false, d: false, x: false, space: false });
  const wasdLoopRef = useRef<number | undefined>(undefined);
  const wasdActiveRef = useRef(false);

  function hasActiveKeys(): boolean {
    const k = wasdRef.current;
    return k.w || k.a || k.s || k.d || k.x || k.space;
  }

  const request3DRender = useCallback(() => {
    if (threeDRenderRequested.current) {
      // 有渲染正在排队，标记需要补发
      threeDRenderNeeded.current = true;
      return;
    }
    threeDRenderRequested.current = true;
    requestAnimationFrame(async () => {
      threeDRenderRequested.current = false;

      const { threeDFunctions: fns, implicit3DFunctions: implFns, canvasSize: size, isSliderActive: sliderActive } = latestDataRef.current;
      if (size.width === 0) return;

      const dpr = window.devicePixelRatio || 1;
      const threeDManager = await getThreeDRenderManager();
      const glCanvas = threeDManager.renderToCanvas(fns, implFns, {
        width: Math.round(size.width * dpr),
        height: Math.round(size.height * dpr),
      }, sliderActive);
      threeDCacheRef.current = glCanvas;

      // 如果在渲染期间有被跳过的请求，补发
      if (threeDRenderNeeded.current) {
        threeDRenderNeeded.current = false;
        request3DRenderRef.current();
      }
    });
  }, []); // 无依赖，通过 ref 读取最新数据

  useEffect(() => {
    request3DRenderRef.current = request3DRender;
  }, [request3DRender]);

  const startWasdLoop = useCallback(() => {
    if (wasdActiveRef.current) return;
    wasdActiveRef.current = true;
    const loop = async () => {
      const keys = wasdRef.current;
      const forward = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
      const right = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      const vertical = (keys.space ? 1 : 0) - (keys.x ? 1 : 0);
      const mgr = await getThreeDRenderManager();
      if (forward !== 0 || right !== 0) mgr.handleWASDMovement(forward, right);
      if (vertical !== 0) mgr.handleVerticalMovement(vertical);
      if (forward !== 0 || right !== 0 || vertical !== 0) request3DRender();
      if (hasActiveKeys()) {
        wasdLoopRef.current = requestAnimationFrame(loop);
      } else {
        wasdActiveRef.current = false;
      }
    };
    wasdLoopRef.current = requestAnimationFrame(loop);
  }, [request3DRender]);

  const stopWasdLoop = useCallback(() => {
    if (wasdLoopRef.current) {
      cancelAnimationFrame(wasdLoopRef.current);
      wasdLoopRef.current = undefined;
    }
    wasdActiveRef.current = false;
  }, []);

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
  }, [threeDFunctions, implicit3DFunctions, canvasSize.width, canvasSize.height, systemType, threeDVersion, isSliderActive, request3DRender]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'x'].includes(key)) {
        e.preventDefault();
        wasdRef.current[key as keyof typeof wasdRef.current] = true;
        const { systemType: currentSystemType } = useAppStore.getState();
        if (currentSystemType === '3d') startWasdLoop();
      }
      if (e.key === ' ') {
        e.preventDefault();
        wasdRef.current.space = true;
        const { systemType: currentSystemType } = useAppStore.getState();
        if (currentSystemType === '3d') startWasdLoop();
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
  }, [startWasdLoop]);

  useEffect(() => {
    if (systemType !== '3d') {
      wasdRef.current = { w: false, a: false, s: false, d: false, x: false, space: false };
      stopWasdLoop();
    }
  }, [systemType, stopWasdLoop]);

  return { threeDCacheRef, request3DRender, wasdRef };
}
