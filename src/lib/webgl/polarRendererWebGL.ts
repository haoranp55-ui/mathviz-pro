// src/lib/webgl/polarRendererWebGL.ts
/**
 * WebGL 极坐标曲线渲染器
 * 使用 GPU 加速采样计算和曲线绘制
 */

import { create, all } from 'mathjs';
import type { MathNode } from 'mathjs';
import type { ViewPort } from '../../types';
import { mathNodeToGLSL } from './glslCompiler';

const math = create(all);

// 片段着色器：简单的颜色输出
const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform vec3 u_color;
uniform float u_alpha;

in float v_valid;

out vec4 fragColor;

void main() {
  if (v_valid < 0.5) {
    discard;
  }
  fragColor = vec4(u_color, u_alpha);
}
`;

/**
 * 创建极坐标顶点着色器
 * 注意：expression 中使用 'x' 作为 theta 变量
 */
function createPolarVertexShader(expression: string, params: string[]): string {
  const paramDecls = params.map(p => `uniform float u_${p};`).join('\n');

  return `#version 300 es
precision highp float;

in float a_theta;

uniform float u_thetaMin;
uniform float u_thetaRange;
uniform vec4 u_viewPort;
${paramDecls}

out float v_valid;

float polarFn(float theta) {
  return ${expression};
}

void main() {
  float theta = u_thetaMin + a_theta * u_thetaRange;
  float r = polarFn(theta);

  if (isnan(r) || isinf(r)) {
    v_valid = 0.0;
    gl_Position = vec4(-2.0, -2.0, 0.0, 1.0);
    return;
  }

  v_valid = 1.0;

  float x = r * cos(theta);
  float y = r * sin(theta);

  float nx = (x - u_viewPort.x) / (u_viewPort.y - u_viewPort.x);
  float ny = (y - u_viewPort.z) / (u_viewPort.w - u_viewPort.z);

  vec2 ndc = vec2(nx * 2.0 - 1.0, ny * 2.0 - 1.0);
  gl_Position = vec4(ndc, 0.0, 1.0);
}
`;
}

/**
 * 编译着色器
 */
function compileShader(gl: WebGL2RenderingContext, source: string, type: number): WebGLShader | null {
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

/**
 * 创建着色器程序
 */
function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram | null {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

/**
 * 编译结果
 */
export interface PolarGLSLResult {
  glsl: string;
  params: string[];
  requiresCPU: boolean;
  unsupportedFunctions?: string[];
}

/**
 * 检测表达式中不支持的函数
 */
function detectUnsupportedFunctions(node: MathNode): string[] {
  const UNSUPPORTED = [
    'factorial', 'gamma', 'erf',
    'combinations', 'permutations',
    'acosh', 'asinh', 'atanh',
    'acot', 'acoth', 'asec', 'asech', 'acsc', 'acsch',
  ];
  const found: string[] = [];

  node.traverse((n: MathNode) => {
    if (n.type === 'FunctionNode') {
      const fnNode = n as any;
      const fnName = typeof fnNode.fn === 'string' ? fnNode.fn : fnNode.fn?.name;
      if (UNSUPPORTED.includes(fnName)) {
        found.push(fnName);
      }
    }
  });

  return found;
}

/**
 * 将极坐标表达式编译为 GLSL
 * 表达式中的 'x' 会被当作 theta 变量
 */
export function compilePolarToGLSL(expression: string): PolarGLSLResult {
  try {
    // 预处理
    let cleaned = expression.trim().replace(/\bln\b/g, 'log');

    // 解析为 AST
    const node = math.parse(cleaned);

    // 检测不支持的函数
    const unsupportedFunctions = detectUnsupportedFunctions(node);

    if (unsupportedFunctions.length > 0) {
      return {
        glsl: '',
        params: [],
        requiresCPU: true,
        unsupportedFunctions,
      };
    }

    // 编译为 GLSL（x 变量会被当作 theta）
    const params = new Set<string>();
    const glsl = mathNodeToGLSL(node, params);

    // 过滤掉 'x'，因为它是 theta 变量
    const paramsArray = Array.from(params).filter(p => p !== 'x');

    return {
      glsl,
      params: paramsArray,
      requiresCPU: false,
    };
  } catch (e) {
    return {
      glsl: '',
      params: [],
      requiresCPU: true,
      unsupportedFunctions: [(e as Error).message],
    };
  }
}

/**
 * 极坐标 WebGL 渲染器
 */
export class PolarRendererWebGL {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private thetaBuffer: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private uniformLocations: Map<string, WebGLUniformLocation> = new Map();

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * 初始化渲染器
   */
  init(glslExpression: string, params: string[]): boolean {
    const gl = this.gl;

    const vertexSource = createPolarVertexShader(glslExpression, params);
    const program = createProgram(gl, vertexSource, FRAGMENT_SHADER);

    if (!program) return false;

    this.program = program;

    // 获取 uniform 位置
    const thetaMinLoc = gl.getUniformLocation(program, 'u_thetaMin');
    const thetaRangeLoc = gl.getUniformLocation(program, 'u_thetaRange');
    const viewPortLoc = gl.getUniformLocation(program, 'u_viewPort');
    const colorLoc = gl.getUniformLocation(program, 'u_color');
    const alphaLoc = gl.getUniformLocation(program, 'u_alpha');

    if (thetaMinLoc) this.uniformLocations.set('u_thetaMin', thetaMinLoc);
    if (thetaRangeLoc) this.uniformLocations.set('u_thetaRange', thetaRangeLoc);
    if (viewPortLoc) this.uniformLocations.set('u_viewPort', viewPortLoc);
    if (colorLoc) this.uniformLocations.set('u_color', colorLoc);
    if (alphaLoc) this.uniformLocations.set('u_alpha', alphaLoc);

    for (const p of params) {
      const loc = gl.getUniformLocation(program, `u_${p}`);
      if (loc) this.uniformLocations.set(`u_${p}`, loc);
    }

    // 创建 VAO
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // 创建 theta 缓冲区
    this.thetaBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.thetaBuffer);

    const thetaLoc = gl.getAttribLocation(program, 'a_theta');
    gl.enableVertexAttribArray(thetaLoc);
    gl.vertexAttribPointer(thetaLoc, 1, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    return true;
  }

  /**
   * 渲染极坐标曲线
   */
  render(
    viewPort: ViewPort,
    thetaMin: number,
    thetaMax: number,
    steps: number,
    color: [number, number, number],
    params: Record<string, number>
  ): void {
    const gl = this.gl;

    if (!this.program || !this.vao || !this.thetaBuffer) return;

    // 生成 theta 值（0-1 归一化）
    const thetaValues = new Float32Array(steps + 1);
    for (let i = 0; i <= steps; i++) {
      thetaValues[i] = i / steps;
    }

    // 上传 theta 数据
    gl.bindBuffer(gl.ARRAY_BUFFER, this.thetaBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, thetaValues, gl.DYNAMIC_DRAW);

    // 使用程序
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // 设置 uniforms
    const thetaMinLoc = this.uniformLocations.get('u_thetaMin');
    const thetaRangeLoc = this.uniformLocations.get('u_thetaRange');
    const viewPortLoc = this.uniformLocations.get('u_viewPort');
    const colorLoc = this.uniformLocations.get('u_color');
    const alphaLoc = this.uniformLocations.get('u_alpha');

    if (thetaMinLoc) gl.uniform1f(thetaMinLoc, thetaMin);
    if (thetaRangeLoc) gl.uniform1f(thetaRangeLoc, thetaMax - thetaMin);
    if (viewPortLoc) gl.uniform4f(viewPortLoc, viewPort.xMin, viewPort.xMax, viewPort.yMin, viewPort.yMax);
    if (colorLoc) gl.uniform3f(colorLoc, color[0], color[1], color[2]);
    if (alphaLoc) gl.uniform1f(alphaLoc, 1.0);

    // 设置参数
    for (const [name, value] of Object.entries(params)) {
      const loc = this.uniformLocations.get(`u_${name}`);
      if (loc) gl.uniform1f(loc, value);
    }

    // 启用混合
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 绘制线段
    gl.drawArrays(gl.LINE_STRIP, 0, steps + 1);

    gl.bindVertexArray(null);
  }

  /**
   * 销毁资源
   */
  destroy(): void {
    const gl = this.gl;

    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }

    if (this.thetaBuffer) {
      gl.deleteBuffer(this.thetaBuffer);
      this.thetaBuffer = null;
    }

    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
  }
}

/**
 * 十六进制颜色转 RGB（0-1 范围）
 */
export function hexToRGB(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}
