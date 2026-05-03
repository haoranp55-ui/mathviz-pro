// src/lib/webgl/polarRendererManager.ts
/**
 * WebGL 极坐标渲染管理器
 * 管理多个极坐标曲线的 GPU 渲染
 */

import type { ViewPort, PolarFunction } from '../../types';
import {
  PolarRendererWebGL,
  compilePolarToGLSL,
  hexToRGB,
} from './polarRendererWebGL';

/**
 * 检查 WebGL2 是否可用
 */
export function isWebGL2Available(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * 极坐标 WebGL 渲染管理器
 */
export class PolarWebGLManager {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private renderers: Map<string, PolarRendererWebGL> = new Map();
  private cpuRequiredFunctions: Set<string> = new Set();

  constructor() {
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true,
    });

    if (!gl) {
      throw new Error('WebGL2 not available');
    }

    this.gl = gl;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }

  /**
   * 注册极坐标函数
   * @returns { success: boolean, requiresCPU?: boolean }
   */
  registerFunction(fn: PolarFunction): { success: boolean; requiresCPU?: boolean } {
    // 已经注册过
    if (this.renderers.has(fn.id)) return { success: true };
    // 标记为需要 CPU
    if (this.cpuRequiredFunctions.has(fn.id)) return { success: false, requiresCPU: true };

    // 编译为 GLSL
    const compileResult = compilePolarToGLSL(fn.expression);

    if (compileResult.requiresCPU) {
      this.cpuRequiredFunctions.add(fn.id);
      return { success: false, requiresCPU: true };
    }

    // 创建渲染器
    const renderer = new PolarRendererWebGL(this.gl);
    const success = renderer.init(compileResult.glsl, compileResult.params);

    if (!success) {
      this.cpuRequiredFunctions.add(fn.id);
      return { success: false, requiresCPU: true };
    }

    this.renderers.set(fn.id, renderer);
    return { success: true };
  }

  /**
   * 渲染所有极坐标函数到内部 canvas
   */
  renderToCanvas(
    functions: PolarFunction[],
    viewPort: ViewPort
  ): HTMLCanvasElement | null {
    const visibleFunctions = functions.filter(fn => fn.visible && !fn.error);
    if (visibleFunctions.length === 0) return null;

    // 注册未注册的函数
    for (const fn of visibleFunctions) {
      if (!this.renderers.has(fn.id) && !this.cpuRequiredFunctions.has(fn.id)) {
        this.registerFunction(fn);
      }
    }

    // 过滤可渲染的函数
    const renderableFunctions = visibleFunctions.filter(fn => this.renderers.has(fn.id));
    if (renderableFunctions.length === 0) return null;

    // 清空画布
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // 渲染每个函数
    for (const fn of renderableFunctions) {
      const renderer = this.renderers.get(fn.id);
      if (!renderer) continue;

      const params: Record<string, number> = {};
      for (const p of fn.parameters) {
        params[p.name] = p.currentValue;
      }

      const color = hexToRGB(fn.color);

      renderer.render(
        viewPort,
        fn.thetaMin,
        fn.thetaMax,
        fn.thetaSteps,
        color,
        params
      );
    }

    return this.canvas;
  }

  unregisterFunction(id: string): void {
    const renderer = this.renderers.get(id);
    if (renderer) {
      renderer.destroy();
      this.renderers.delete(id);
    }
    this.cpuRequiredFunctions.delete(id);
  }

  destroy(): void {
    for (const renderer of this.renderers.values()) {
      renderer.destroy();
    }
    this.renderers.clear();
    this.cpuRequiredFunctions.clear();
  }
}

// 单例实例
let managerInstance: PolarWebGLManager | null = null;
let isAvailableChecked = false;

/**
 * 获取极坐标 WebGL 管理器单例
 */
export function getPolarWebGLManager(): PolarWebGLManager | null {
  if (managerInstance) {
    return managerInstance;
  }

  if (!isAvailableChecked) {
    isAvailableChecked = true;
    if (!isWebGL2Available()) {
      return null;
    }
  } else if (!isWebGL2Available()) {
    return null;
  }

  try {
    managerInstance = new PolarWebGLManager();
  } catch (e) {
    console.error('Polar WebGL manager init failed:', e);
    return null;
  }

  return managerInstance;
}

/**
 * 检查极坐标 WebGL 是否可用
 */
export function isPolarWebGLAvailable(): boolean {
  return isWebGL2Available();
}

/**
 * 销毁极坐标 WebGL 管理器
 */
export function destroyPolarWebGLManager(): void {
  if (managerInstance) {
    managerInstance.destroy();
    managerInstance = null;
  }
}
