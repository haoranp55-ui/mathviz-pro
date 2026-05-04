// src/lib/webgl/webglUtils.ts
/**
 * WebGL 工具函数
 */

/**
 * 解析十六进制颜色为 RGB 值
 * @param hex 十六进制颜色字符串（如 #ff0000 或 #f00）
 * @param fallback 解析失败时的默认颜色（默认为白色）
 * @returns RGB 元组，值范围 0-1
 */
export function hexToRGB(
  hex: string,
  fallback: [number, number, number] = [1, 1, 1]
): [number, number, number] {
  try {
    // 移除 # 前缀
    let h = hex.replace('#', '').trim();

    // 验证格式
    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h)) {
      console.warn(`Invalid hex color format: ${hex}, using fallback`);
      return fallback;
    }

    // 扩展 3 位颜色为 6 位
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }

    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;

    // 验证解析结果
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      console.warn(`Failed to parse hex color: ${hex}, using fallback`);
      return fallback;
    }

    return [r, g, b];
  } catch (e) {
    console.warn(`Error parsing color ${hex}:`, e);
    return fallback;
  }
}

/**
 * 安全获取 WebGL 上下文
 * @param canvas Canvas 元素
 * @returns WebGL2RenderingContext 或 null
 */
export function getWebGL2Context(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  try {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    return gl;
  } catch (e) {
    console.error('Failed to get WebGL2 context:', e);
    return null;
  }
}

/**
 * 检查 WebGL 是否可用
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
 * 安全创建着色器
 * @param gl WebGL 上下文
 * @param type 着色器类型
 * @param source 着色器源码
 * @returns WebGLShader 或 null
 */
export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('Failed to create shader');
    return null;
  }

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
 * 安全创建程序
 * @param gl WebGL 上下文
 * @param vertexShader 顶点着色器
 * @param fragmentShader 片段着色器
 * @returns WebGLProgram 或 null
 */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) {
    console.error('Failed to create program');
    return null;
  }

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
 * 安全获取 uniform 位置
 * @param gl WebGL 上下文
 * @param program WebGL 程序
 * @param name uniform 名称
 * @returns WebGLUniformLocation 或 null
 */
export function getUniformLocation(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string
): WebGLUniformLocation | null {
  const location = gl.getUniformLocation(program, name);
  if (!location) {
    console.warn(`Uniform "${name}" not found in program`);
  }
  return location;
}

/**
 * 安全获取 attribute 位置
 * @param gl WebGL 上下文
 * @param program WebGL 程序
 * @param name attribute 名称
 * @returns attribute 索引或 -1
 */
export function getAttribLocation(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string
): number {
  const location = gl.getAttribLocation(program, name);
  if (location === -1) {
    console.warn(`Attribute "${name}" not found in program`);
  }
  return location;
}
