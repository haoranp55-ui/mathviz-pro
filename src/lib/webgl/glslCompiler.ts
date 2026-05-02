// src/lib/webgl/glslCompiler.ts
/**
 * 数学表达式到 GLSL 着色器编译器
 *
 * 将 mathjs 解析的表达式树转换为 GLSL 片段着色器代码
 */

import { create, all } from 'mathjs';
import type { MathNode } from 'mathjs';

const math = create(all);

// mathjs 函数名到 GLSL 函数名的映射
const FUNCTION_MAP: Record<string, string> = {
  // 三角函数
  'sin': 'sin',
  'cos': 'cos',
  'tan': 'tan',
  'asin': 'asin',
  'acos': 'acos',
  'atan': 'atan',
  'sinh': 'sinh',
  'cosh': 'cosh',
  'tanh': 'tanh',

  // 指数对数
  'exp': 'exp',
  'log': 'log',
  'ln': 'log',
  'log10': 'log10',
  'log2': 'log2',
  'sqrt': 'sqrt',
  'pow': 'pow',

  // 取整/符号
  'abs': 'abs',
  'floor': 'floor',
  'ceil': 'ceil',
  'round': 'round',
  'sign': 'sign',

  // 其他
  'min': 'min',
  'max': 'max',

  // 需要特殊处理的函数（标记为空字符串）
  'sec': '',
  'csc': '',
  'cot': '',
  'factorial': '',
  'gamma': '',
  'erf': '',
};

// GLSL 常量
const CONSTANT_MAP: Record<string, string> = {
  'pi': '3.14159265358979323846',
  'e': '2.71828182845904523536',
  'PI': '3.14159265358979323846',
  'E': '2.71828182845904523536',
};

/**
 * 编译结果
 */
export interface GLSLCompileResult {
  success: boolean;
  glslCode?: string;
  expression?: string;  // 仅表达式部分
  uniforms?: string[];
  error?: string;
  requiresCPU?: boolean;  // 标记是否需要 CPU 渲染
}

/**
 * 表达式编译结果
 */
export interface ExpressionCompileResult {
  expression: string;
  params: string[];
  requiresCPU: boolean;  // 是否包含 GLSL 不支持的函数
  unsupportedFunctions?: string[];  // 不支持的函数列表
}

/**
 * 将 mathjs AST 转换为 GLSL 表达式
 */
export function mathNodeToGLSL(node: MathNode, params: Set<string> = new Set()): string {
  switch (node.type) {
    case 'ConstantNode': {
      const n = node as any;
      return formatNumber(n.value);
    }

    case 'SymbolNode': {
      const n = node as any;
      const name = n.name;

      if (CONSTANT_MAP[name]) {
        return CONSTANT_MAP[name];
      }

      if (name === 'x' || name === 'y') {
        return name;
      }

      params.add(name);
      return `u_${name}`;
    }

    case 'ParenthesisNode': {
      const n = node as any;
      return `(${mathNodeToGLSL(n.content, params)})`;
    }

    case 'OperatorNode': {
      const n = node as any;
      const op = n.op;
      const args = n.args as MathNode[];

      if (args.length === 1) {
        const arg = mathNodeToGLSL(args[0], params);
        if (op === '-') return `(-${arg})`;
        if (op === '+') return arg;
      } else if (args.length === 2) {
        const left = mathNodeToGLSL(args[0], params);
        const right = mathNodeToGLSL(args[1], params);

        switch (op) {
          case '+': return `(${left} + ${right})`;
          case '-': return `(${left} - ${right})`;
          case '*': return `(${left} * ${right})`;
          case '/': return `(${left} / ${right})`;
          case '^': return `pow(${left}, ${right})`;
          case '%': return `mod(${left}, ${right})`;
        }
      }

      throw new Error(`不支持的运算符: ${op}`);
    }

    case 'FunctionNode': {
      const n = node as any;
      const fnName = typeof n.fn === 'string' ? n.fn : n.fn?.name;
      const args = n.args as MathNode[];

      switch (fnName) {
        case 'sec': {
          const arg = mathNodeToGLSL(args[0], params);
          return `(1.0 / cos(${arg}))`;
        }
        case 'csc': {
          const arg = mathNodeToGLSL(args[0], params);
          return `(1.0 / sin(${arg}))`;
        }
        case 'cot': {
          const arg = mathNodeToGLSL(args[0], params);
          return `(1.0 / tan(${arg}))`;
        }
        case 'nthRoot': {
          const base = mathNodeToGLSL(args[0], params);
          const nVal = args[1] ? mathNodeToGLSL(args[1], params) : '2.0';
          return `pow(${base}, 1.0 / ${nVal})`;
        }
        case 'cbrt': {
          const arg = mathNodeToGLSL(args[0], params);
          return `pow(${arg}, 1.0 / 3.0)`;
        }
        case 'square': {
          const arg = mathNodeToGLSL(args[0], params);
          return `(${arg} * ${arg})`;
        }
        case 'cube': {
          const arg = mathNodeToGLSL(args[0], params);
          return `(${arg} * ${arg} * ${arg})`;
        }
        case 'log1p': {
          const arg = mathNodeToGLSL(args[0], params);
          return `log(1.0 + ${arg})`;
        }
        case 'expm1': {
          const arg = mathNodeToGLSL(args[0], params);
          return `(exp(${arg}) - 1.0)`;
        }
        case 'hypot': {
          const argsGLSL = args.map(a => mathNodeToGLSL(a, params));
          if (argsGLSL.length === 2) {
            return `length(vec2(${argsGLSL[0]}, ${argsGLSL[1]}))`;
          }
          const squares = argsGLSL.map(a => `(${a} * ${a})`).join(' + ');
          return `sqrt(${squares})`;
        }
        case 'atan2': {
          const y = mathNodeToGLSL(args[0], params);
          const x = mathNodeToGLSL(args[1], params);
          return `atan(${y}, ${x})`;
        }
        case 'factorial':
        case 'gamma':
        case 'erf':
          throw new Error(`函数 ${fnName} 在 WebGL 着色器中不支持`);
      }

      const glslFn = FUNCTION_MAP[fnName];
      if (glslFn === '') {
        throw new Error(`函数 ${fnName} 在 WebGL 着色器中不支持`);
      }
      if (glslFn) {
        const argsGLSL = args.map(a => mathNodeToGLSL(a, params)).join(', ');
        return `${glslFn}(${argsGLSL})`;
      }

      throw new Error(`不支持的函数: ${fnName}`);
    }

    case 'ConditionalNode': {
      const n = node as any;
      const cond = mathNodeToGLSL(n.condition, params);
      const trueExpr = mathNodeToGLSL(n.trueExpr, params);
      const falseExpr = mathNodeToGLSL(n.falseExpr, params);
      return `(${cond} ? ${trueExpr} : ${falseExpr})`;
    }

    default:
      throw new Error(`不支持的节点类型: ${node.type}`);
  }
}

/**
 * 格式化数字为 GLSL 格式
 */
function formatNumber(value: number): string {
  if (!isFinite(value)) {
    return value > 0 ? '1e38' : '-1e38';
  }
  const str = value.toString();
  if (/^-?\d+$/.test(str)) {
    return str + '.0';
  }
  return str;
}

/**
 * 十六进制颜色转 RGB（0-1 范围）
 */
function hexToRGB(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

/**
 * 检测表达式中是否有 GLSL 不支持的函数
 */
function detectUnsupportedFunctions(node: MathNode): string[] {
  const unsupported: string[] = [];

  node.traverse((n: MathNode) => {
    if (n.type === 'FunctionNode') {
      const fnNode = n as any;
      const fnName = typeof fnNode.fn === 'string' ? fnNode.fn : fnNode.fn?.name;

      // 这些函数在 GLSL 中无法实现或实现成本过高
      const UNSUPPORTED_IN_GLSL = [
        'factorial', 'gamma', 'erf',
        'combinations', 'permutations',
        'acosh', 'asinh', 'atanh',  // GLSL ES 3.0 不支持
        'acot', 'acoth', 'asec', 'asech', 'acsc', 'acsch',  // 反三角扩展
      ];

      if (UNSUPPORTED_IN_GLSL.includes(fnName)) {
        unsupported.push(fnName);
      }
    }
  });

  return unsupported;
}

/**
 * 只编译表达式为 GLSL 字符串（用于自定义着色器）
 * 返回 requiresCPU 标志，指示是否需要使用 CPU 渲染
 */
export function compileExpressionOnly(node: MathNode): ExpressionCompileResult {
  const params = new Set<string>();

  // 先检测是否有不支持的函数
  const unsupportedFunctions = detectUnsupportedFunctions(node);

  if (unsupportedFunctions.length > 0) {
    // 有不支持的函数，返回 requiresCPU: true
    return {
      expression: '',
      params: [],
      requiresCPU: true,
      unsupportedFunctions,
    };
  }

  try {
    const expression = mathNodeToGLSL(node, params);
    return {
      expression,
      params: Array.from(params),
      requiresCPU: false,
    };
  } catch (e) {
    // 编译失败，标记为需要 CPU
    return {
      expression: '',
      params: [],
      requiresCPU: true,
      unsupportedFunctions: [(e as Error).message],
    };
  }
}

/**
 * 编译隐函数表达式为完整的 GLSL 片段着色器
 */
export function compileImplicitToGLSL(
  node: MathNode,
  color: string = '#00ffff'
): GLSLCompileResult {
  try {
    const params = new Set<string>();
    const expression = mathNodeToGLSL(node, params);
    const uniformsArray = Array.from(params);
    const rgb = hexToRGB(color);
    const uniformDeclarations = uniformsArray.map(p => `uniform float u_${p};`).join('\n  ');

    const glslCode = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec4 u_viewPort;
${uniformDeclarations || '// 无参数'}

out vec4 fragColor;

float F(float x, float y) {
  return ${expression};
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float x = u_viewPort.x + uv.x * (u_viewPort.y - u_viewPort.x);
  float y = u_viewPort.z + uv.y * (u_viewPort.w - u_viewPort.z);
  float value = F(x, y);
  float aa = fwidth(value) * 2.0;
  float dist = abs(value);
  float alpha = 1.0 - smoothstep(0.0, aa, dist);
  vec3 curveColor = vec3(${rgb.r}, ${rgb.g}, ${rgb.b});
  fragColor = vec4(curveColor, alpha);
}`;

    return {
      success: true,
      glslCode,
      expression,
      uniforms: uniformsArray,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
    };
  }
}

/**
 * 从表达式字符串直接编译
 */
export function compileExpressionToGLSL(
  expression: string,
  color: string = '#00ffff'
): GLSLCompileResult {
  try {
    let cleaned = expression.trim().replace(/\bln\b/g, 'log');

    if (!cleaned.includes('=')) {
      return { success: false, error: '隐函数必须包含等号' };
    }

    const parts = cleaned.split('=');
    if (parts.length !== 2) {
      return { success: false, error: '表达式只能包含一个等号' };
    }

    const combinedExpr = `(${parts[0].trim()}) - (${parts[1].trim()})`;
    const node = math.parse(combinedExpr);

    return compileImplicitToGLSL(node, color);
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
