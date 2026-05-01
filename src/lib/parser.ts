// src/lib/parser.ts
import { create, all } from 'mathjs';
import type { MathNode } from 'mathjs';
import type { ParsedFunction, ParametricFunction } from '../types';
import { extractParameters, createDefaultParams, validateParamCount } from './paramParser';

const math = create(all);

// 配置 mathjs 支持的函数和常量
const ALLOWED_FUNCTIONS = [
  // 三角函数
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'cot', 'sec', 'csc',
  'sinh', 'cosh', 'tanh',
  'coth', 'sech', 'csch',
  'asinh', 'acosh', 'atanh',
  'acot', 'acoth', 'asec', 'asech', 'acsc', 'acsch',
  'atan2',

  // 指数对数
  'exp', 'log', 'ln', 'log10', 'log2',
  'expm1', 'log1p',
  'sqrt', 'cbrt', 'nthRoot',
  'pow', 'cube', 'square',

  // 取整/符号
  'abs', 'floor', 'ceil', 'round', 'sign', 'fix',

  // 组合/排列/阶乘
  'factorial', 'combinations', 'permutations',

  // 特殊函数
  'gamma', 'erf',

  // 其他
  'hypot', 'gcd', 'lcm', 'mod',
];

const ALLOWED_CONSTANTS = [
  'pi', 'e', 'PI', 'E',
  'tau', 'phi',
  'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT2', 'SQRT1_2',
];

export function parseExpression(expression: string): ParsedFunction | Error {
  try {
    // 预处理：清理输入并转换别名
    let cleaned = expression.trim();

    // 将 ln 替换为 log（mathjs 用 log 表示自然对数）
    cleaned = cleaned.replace(/\bln\b/g, 'log');

    if (!cleaned) {
      return new Error('表达式不能为空');
    }

    // 解析表达式
    let node: MathNode;
    try {
      node = math.parse(cleaned);
    } catch (e) {
      return new Error(`语法错误: ${(e as Error).message}`);
    }

    // 检查是否包含不允许的函数
    const usedFunctions = new Set<string>();
    const usedVariables = new Set<string>();

    node.traverse((n: MathNode) => {
      if (n.type === 'FunctionNode') {
        const fn = (n as any).fn;
        if (typeof fn === 'string') {
          usedFunctions.add(fn);
        } else if (fn?.name) {
          usedFunctions.add(fn.name);
        }
      }
      if (n.type === 'SymbolNode') {
        usedVariables.add((n as any).name);
      }
    });

    // 检查函数是否允许
    for (const fn of usedFunctions) {
      if (!ALLOWED_FUNCTIONS.includes(fn)) {
        return new Error(`不支持的函数: ${fn}`);
      }
    }

    // 检查变量：只允许 x 和常量
    for (const v of usedVariables) {
      if (v !== 'x' && !ALLOWED_CONSTANTS.includes(v) && !ALLOWED_FUNCTIONS.includes(v)) {
        return new Error(`未知变量: ${v}（只支持变量 x）`);
      }
    }

    // 编译为可执行函数
    const compiled = node.compile();

    // 创建安全的求值函数
    const safeEval = (x: number): number => {
      try {
        const result = compiled.evaluate({ x });
        if (typeof result !== 'number' || !isFinite(result)) {
          return NaN;
        }
        return result;
      } catch {
        return NaN;
      }
    };

    // 测试求值
    try {
      safeEval(0);
      safeEval(1);
      safeEval(-1);
    } catch (e) {
      return new Error(`求值错误: ${(e as Error).message}`);
    }

    return {
      id: '', // 由 store 填充
      expression: cleaned,
      compiled: safeEval,
      color: '', // 由 store 填充
      visible: true,
    };

  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}

// 获取函数的建议范围（用于自动调整视口）
export function suggestRange(fn: (x: number) => number): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const testPoints = [-10, -5, -2, -1, 0, 1, 2, 5, 10];
  const yValues = testPoints.map(fn).filter(y => isFinite(y));

  if (yValues.length === 0) {
    return { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  }

  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const padding = (yMax - yMin) * 0.1 || 1;

  return {
    xMin: -10,
    xMax: 10,
    yMin: yMin - padding,
    yMax: yMax + padding,
  };
}

/**
 * 解析参数化函数表达式
 * 支持带参数的表达式，如 y = ax + b
 */
export function parseParametricExpression(
  expression: string,
  maxParams: number = 3
): ParametricFunction | Error {
  try {
    // 预处理
    let cleaned = expression.trim();
    cleaned = cleaned.replace(/\bln\b/g, 'log');

    if (!cleaned) {
      return new Error('表达式不能为空');
    }

    // 解析表达式
    let node: MathNode;
    try {
      node = math.parse(cleaned);
    } catch (e) {
      return new Error(`语法错误: ${(e as Error).message}`);
    }

    // 收集使用的函数和变量
    const usedFunctions = new Set<string>();
    const usedVariables = new Set<string>();

    node.traverse((n: MathNode) => {
      if (n.type === 'FunctionNode') {
        const fn = (n as any).fn;
        if (typeof fn === 'string') {
          usedFunctions.add(fn);
        } else if (fn?.name) {
          usedFunctions.add(fn.name);
        }
      }
      if (n.type === 'SymbolNode') {
        usedVariables.add((n as any).name);
      }
    });

    // 检查函数是否允许
    for (const fn of usedFunctions) {
      if (!ALLOWED_FUNCTIONS.includes(fn)) {
        return new Error(`不支持的函数: ${fn}`);
      }
    }

    // 提取参数
    const variablesArray = Array.from(usedVariables);
    const validation = validateParamCount(variablesArray, maxParams);

    if (!validation.valid) {
      return new Error(
        `参数过多: 最多支持 ${maxParams} 个参数，当前检测到 ${validation.paramCount} 个（${validation.excessParams.join(', ')}）`
      );
    }

    const parameters = extractParameters(variablesArray, maxParams);

    // 检查是否有 x 变量
    const hasX = usedVariables.has('x');
    if (!hasX) {
      return new Error('表达式必须包含变量 x');
    }

    // 编译为可执行函数
    const compiled = node.compile();

    // 创建带参数的求值函数
    const safeEval = (x: number, params: Record<string, number> = {}): number => {
      try {
        const result = compiled.evaluate({ x, ...params });
        if (typeof result !== 'number' || !isFinite(result)) {
          return NaN;
        }
        return result;
      } catch {
        return NaN;
      }
    };

    // 测试求值
    const defaultParams = createDefaultParams(parameters);
    try {
      safeEval(0, defaultParams);
      safeEval(1, defaultParams);
      safeEval(-1, defaultParams);
    } catch (e) {
      return new Error(`求值错误: ${(e as Error).message}`);
    }

    return {
      id: '',
      expression: cleaned,
      compiled: safeEval,
      color: '',
      visible: true,
      parameters,
      xAxisVar: 'x',
      yAxisVar: 'y',
    };

  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}
