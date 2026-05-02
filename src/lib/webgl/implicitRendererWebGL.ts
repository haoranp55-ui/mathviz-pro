// src/lib/webgl/implicitRendererWebGL.ts
/**
 * WebGL 隐函数渲染器
 */

import type { ViewPort } from '../../types';
import { compileExpressionOnly } from './glslCompiler';
import type { MathNode } from 'mathjs';

// 顶点着色器
const VERTEX_SHADER = `#version 300 es
precision highp float;

const vec2 positions[4] = vec2[](
  vec2(-1.0, -1.0),
  vec2( 1.0, -1.0),
  vec2(-1.0,  1.0),
  vec2( 1.0,  1.0)
);

void main() {
  gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}
`;

/**
 * 创建片段着色器
 * renderRegion: (offsetX, offsetY, actualWidth, actualHeight) - Canvas 2D 坐标系
 *
 * 关键改进：区分"真零点"和"奇点导致的符号变化"
 */
function createFragmentShader(expression: string, params: string[]): string {
  const uniformDecls = params.map(p => `uniform float u_${p};`).join('\n');

  return `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec4 u_viewPort;      // xMin, xMax, yMin, yMax
uniform vec4 u_renderRegion;  // offsetX, offsetY, actualWidth, actualHeight (Canvas 2D 坐标)
uniform vec3 u_color;
${uniformDecls}

out vec4 fragColor;

float F(float x, float y) {
  return ${expression};
}

void main() {
  // gl_FragCoord: WebGL 坐标系 (Y=0 在底部)
  // 需要转换为 Canvas 2D 坐标系 (Y=0 在顶部)
  float canvasY = u_resolution.y - gl_FragCoord.y;
  vec2 canvasCoord = vec2(gl_FragCoord.x, canvasY);

  // 转换为渲染区域内的局部坐标 (0-1)
  vec2 localCoord = (canvasCoord - u_renderRegion.xy) / u_renderRegion.zw;

  // 转换为数学坐标
  float x = u_viewPort.x + localCoord.x * (u_viewPort.y - u_viewPort.x);
  float y = u_viewPort.z + (1.0 - localCoord.y) * (u_viewPort.w - u_viewPort.z);

  // 计算函数值
  float value = F(x, y);

  // NaN 时直接返回透明
  if (isnan(value)) {
    fragColor = vec4(0.0);
    return;
  }

  // 无穷大时返回透明（奇点区域）
  if (isinf(value)) {
    fragColor = vec4(0.0);
    return;
  }

  // 奇点检测：如果函数值绝对值过大，可能是奇点附近的"假零点"
  // 这种情况下不渲染曲线
  const float SINGULARITY_THRESHOLD = 1e6;
  if (abs(value) > SINGULARITY_THRESHOLD) {
    fragColor = vec4(0.0);
    return;
  }

  // 标准等值线检测：值接近 0 的地方渲染曲线
  float aa = fwidth(value) * 2.0;
  float dist = abs(value);
  float alpha = 1.0 - smoothstep(0.0, max(aa, 0.001), dist);

  fragColor = vec4(u_color, alpha);
}`;
}

/**
 * 着色器程序
 */
interface ShaderProgram {
  program: WebGLProgram;
  uniforms: {
    resolution: WebGLUniformLocation;
    viewPort: WebGLUniformLocation;
    renderRegion: WebGLUniformLocation;
    color: WebGLUniformLocation;
    params: Map<string, WebGLUniformLocation>;
  };
}

/**
 * WebGL 隐函数渲染器
 */
export class ImplicitRendererWebGL {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private shaderCache: Map<string, ShaderProgram> = new Map();

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 600;

    const gl = this.canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });

    if (!gl) throw new Error('WebGL2 不可用');
    this.gl = gl;
    gl.viewport(0, 0, 800, 600);
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

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  private createProgram(fragmentSource: string, params: string[]): ShaderProgram | null {
    const gl = this.gl;

    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    if (!vs || !fs) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return null;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return null;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    gl.deleteShader(vs);
    gl.deleteShader(fs);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'u_resolution')!,
      viewPort: gl.getUniformLocation(program, 'u_viewPort')!,
      renderRegion: gl.getUniformLocation(program, 'u_renderRegion')!,
      color: gl.getUniformLocation(program, 'u_color')!,
      params: new Map<string, WebGLUniformLocation>(),
    };

    for (const p of params) {
      const loc = gl.getUniformLocation(program, `u_${p}`);
      if (loc) uniforms.params.set(p, loc);
    }

    return { program, uniforms };
  }

  createShaderForFunction(id: string, node: MathNode, _color: string): { success: boolean; error?: string; requiresCPU?: boolean } {
    if (this.shaderCache.has(id)) return { success: true };

    try {
      const result = compileExpressionOnly(node);

      // 如果需要 CPU 渲染，返回 requiresCPU 标志
      if (result.requiresCPU) {
        return {
          success: false,
          requiresCPU: true,
          error: result.unsupportedFunctions
            ? `GLSL 不支持: ${result.unsupportedFunctions.join(', ')}，已自动切换到 CPU 渲染`
            : 'GLSL 编译失败，已自动切换到 CPU 渲染',
        };
      }

      const fragmentSource = createFragmentShader(result.expression, result.params);
      const program = this.createProgram(fragmentSource, result.params);

      if (!program) return { success: false, error: 'Program creation failed' };

      this.shaderCache.set(id, program);
      return { success: true };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  /**
   * 渲染函数
   * @param renderRegion Canvas 2D 坐标系 (Y=0 在顶部)
   */
  renderFunction(
    id: string,
    viewPort: ViewPort,
    color: string,
    params: Record<string, number> = {},
    renderRegion?: { offsetX: number; offsetY: number; actualWidth: number; actualHeight: number }
  ): boolean {
    const programInfo = this.shaderCache.get(id);
    if (!programInfo) return false;

    const gl = this.gl;
    const { program, uniforms } = programInfo;

    gl.useProgram(program);
    gl.uniform2f(uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform4f(uniforms.viewPort, viewPort.xMin, viewPort.xMax, viewPort.yMin, viewPort.yMax);

    // 渲染区域 (Canvas 2D 坐标系)
    if (renderRegion) {
      gl.uniform4f(uniforms.renderRegion,
        renderRegion.offsetX,
        renderRegion.offsetY,
        renderRegion.actualWidth,
        renderRegion.actualHeight
      );
    } else {
      gl.uniform4f(uniforms.renderRegion, 0, 0, this.canvas.width, this.canvas.height);
    }

    // 解析颜色（支持 #RRGGBB 和 #RGB）
    let r = 1, g = 1, b = 1;
    const hex = color.replace('#', '');
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16) / 255;
      g = parseInt(hex[1] + hex[1], 16) / 255;
      b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length >= 6) {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
    }
    gl.uniform3f(uniforms.color, r, g, b);

    for (const [name, loc] of uniforms.params) {
      if (params[name] !== undefined) {
        gl.uniform1f(loc, params[name]);
      }
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    return true;
  }

  clear(): void {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  destroy(): void {
    for (const [, info] of this.shaderCache) {
      this.gl.deleteProgram(info.program);
    }
    this.shaderCache.clear();
    this.canvas.remove();
  }
}

let renderer: ImplicitRendererWebGL | null = null;
let isAvailableCache: boolean | null = null;

export function getWebGLRenderer(): ImplicitRendererWebGL | null {
  if (!isAvailableCache && renderer === null) {
    isAvailableCache = checkWebGL2Available();
  }

  if (!isAvailableCache) return null;

  if (!renderer) {
    try {
      renderer = new ImplicitRendererWebGL();
    } catch (e) {
      console.error('WebGL renderer init failed:', e);
    }
  }
  return renderer;
}

function checkWebGL2Available(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (gl) {
      // 正确清理上下文
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    }
    canvas.remove();
    return gl !== null;
  } catch {
    return false;
  }
}

export function isWebGL2Available(): boolean {
  if (isAvailableCache === null) {
    isAvailableCache = checkWebGL2Available();
  }
  return isAvailableCache;
}
