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

  constructor() {
    this.renderer = new ImplicitRendererWebGL();
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.getCanvas();
  }

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  registerFunction(fn: ImplicitFunction): boolean {
    if (this.registeredFunctions.has(fn.id)) return true;

    try {
      let cleaned = fn.expression.trim().replace(/\bln\b/g, 'log');
      const parts = cleaned.split('=');
      if (parts.length !== 2) return false;

      const combinedExpr = `(${parts[0].trim()}) - (${parts[1].trim()})`;
      const node = math.parse(combinedExpr);

      const result = this.renderer.createShaderForFunction(fn.id, node, fn.color);
      if (!result.success) {
        console.warn('Shader creation failed:', result.error);
        return false;
      }

      this.registeredFunctions.add(fn.id);
      return true;
    } catch (e) {
      console.error('Register function failed:', e);
      return false;
    }
  }

  /**
   * 渲染所有隐函数到内部 canvas
   * @param renderRegion Canvas 2D 坐标系 (Y=0 在顶部)
   */
  renderToCanvas(
    functions: ImplicitFunction[],
    viewPort: ViewPort,
    renderRegion?: { offsetX: number; offsetY: number; actualWidth: number; actualHeight: number }
  ): HTMLCanvasElement | null {
    const visibleFunctions = functions.filter(fn => fn.visible && !fn.error);
    if (visibleFunctions.length === 0) return null;

    for (const fn of visibleFunctions) {
      if (!this.registeredFunctions.has(fn.id)) {
        this.registerFunction(fn);
      }
    }

    this.renderer.clear();

    for (const fn of visibleFunctions) {
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
  }

  destroy(): void {
    this.renderer.destroy();
    this.registeredFunctions.clear();
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
