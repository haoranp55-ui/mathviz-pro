// src/lib/webgl/implicitRendererManager.ts
/**
 * WebGL 隐函数渲染管理器
 */

import { create, all } from 'mathjs';
import type { ViewPort, ImplicitFunction } from '../../types';
import { ImplicitRendererWebGL, isWebGL2Available } from './implicitRendererWebGL';

const math = create(all);

/**
 * WebGL 隐函数渲染管理器
 */
export class ImplicitWebGLManager {
  private renderer: ImplicitRendererWebGL;
  private registeredFunctions: Set<string> = new Set();
  private cpuRequiredFunctions: Set<string> = new Set();  // 记录需要 CPU 渲染的函数

  constructor() {
    this.renderer = new ImplicitRendererWebGL();
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.getCanvas();
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  /**
   * 注册函数到 WebGL 渲染器
   * @returns { success: boolean, requiresCPU?: boolean } - requiresCPU 表示需要使用 CPU 渲染
   */
  registerFunction(fn: ImplicitFunction): { success: boolean; requiresCPU?: boolean } {
    if (this.registeredFunctions.has(fn.id)) return { success: true };
    if (this.cpuRequiredFunctions.has(fn.id)) return { success: false, requiresCPU: true };

    try {
      let cleaned = fn.expression.trim().replace(/\bln\b/g, 'log');
      const parts = cleaned.split('=');
      if (parts.length !== 2) return { success: false };

      const combinedExpr = `(${parts[0].trim()}) - (${parts[1].trim()})`;
      const node = math.parse(combinedExpr);

      const result = this.renderer.createShaderForFunction(fn.id, node, fn.color);
      if (!result.success) {
        // 如果需要 CPU 渲染，记录并返回 requiresCPU 标志
        if (result.requiresCPU) {
          this.cpuRequiredFunctions.add(fn.id);
          return { success: false, requiresCPU: true };
        }
        console.warn('Shader creation failed:', result.error);
        return { success: false };
      }

      this.registeredFunctions.add(fn.id);
      return { success: true };
    } catch (e) {
      console.error('Register function failed:', e);
      return { success: false };
    }
  }

  /**
   * 渲染所有隐函数到内部 canvas
   * 自动跳过需要 CPU 渲染的函数
   * @param renderRegion Canvas 2D 坐标系 (Y=0 在顶部)
   */
  renderToCanvas(
    functions: ImplicitFunction[],
    viewPort: ViewPort,
    renderRegion?: { offsetX: number; offsetY: number; actualWidth: number; actualHeight: number }
  ): HTMLCanvasElement | null {
    const visibleFunctions = functions.filter(fn => fn.visible && !fn.error && !fn.requiresCPU);
    if (visibleFunctions.length === 0) return null;

    for (const fn of visibleFunctions) {
      if (!this.registeredFunctions.has(fn.id)) {
        const result = this.registerFunction(fn);
        // 如果注册失败且需要 CPU，记录到内部集合（避免直接修改传入对象）
        if (result.requiresCPU) {
          this.cpuRequiredFunctions.add(fn.id);
        }
      }
    }

    // 过滤掉无法渲染的函数
    const renderableFunctions = visibleFunctions.filter(fn => this.registeredFunctions.has(fn.id));
    if (renderableFunctions.length === 0) return null;

    this.renderer.clear();

    for (const fn of renderableFunctions) {
      const params: Record<string, number> = {};
      for (const p of fn.parameters) {
        params[p.name] = p.currentValue;
      }

      this.renderer.renderFunction(fn.id, viewPort, fn.color, params, renderRegion);
    }

    return this.renderer.getCanvas();
  }

  unregisterFunction(id: string): void {
    this.registeredFunctions.delete(id);
    this.cpuRequiredFunctions.delete(id);
  }

  destroy(): void {
    this.renderer.destroy();
    this.registeredFunctions.clear();
    this.cpuRequiredFunctions.clear();
  }
}

let managerInstance: ImplicitWebGLManager | null = null;
let isAvailableChecked = false;

export function getWebGLManager(): ImplicitWebGLManager | null {
  // 先检查是否已经初始化过
  if (managerInstance) {
    return managerInstance;
  }

  // 检查 WebGL2 是否可用（只检查一次）
  if (!isAvailableChecked) {
    isAvailableChecked = true;
    if (!isWebGL2Available()) {
      return null;
    }
  } else if (!isWebGL2Available()) {
    return null;
  }

  try {
    managerInstance = new ImplicitWebGLManager();
  } catch (e) {
    console.error('WebGL manager init failed:', e);
    return null;
  }

  return managerInstance;
}

export function isWebGLAvailable(): boolean {
  return isWebGL2Available();
}

export function destroyWebGLManager(): void {
  if (managerInstance) {
    managerInstance.destroy();
    managerInstance = null;
  }
}
