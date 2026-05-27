// src/lib/parserUtils.ts
// 解析器共享工具函数和常量

import { create, all } from 'mathjs';
import type { MathNode, FunctionNode, SymbolNode, EvalFunction } from 'mathjs';

// 共享 mathjs 实例
export const math = create(all);

// 支持的函数列表（单一来源）
export const ALLOWED_FUNCTIONS: string[] = [
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

// 支持的常量列表（单一来源）
export const ALLOWED_CONSTANTS: string[] = [
  'pi', 'e', 'PI', 'E',
  'tau', 'phi', 'TAU', 'PHI',
  'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT2', 'SQRT1_2',
];

// AST 遍历收集结果
export interface CollectedSymbols {
  functions: Set<string>;
  variables: Set<string>;
}

/**
 * 遍历 AST 收集所有函数名和变量名
 */
export function collectSymbols(node: MathNode): CollectedSymbols {
  const functions = new Set<string>();
  const variables = new Set<string>();

  node.traverse((n: MathNode) => {
    if (n.type === 'FunctionNode') {
      const fn = (n as FunctionNode).fn;
      if (typeof fn === 'string') {
        functions.add(fn);
      } else if (fn?.name) {
        functions.add(fn.name);
      }
    }
    if (n.type === 'SymbolNode') {
      variables.add((n as SymbolNode).name);
    }
  });

  return { functions, variables };
}

/**
 * 验证所有函数是否在允许列表中
 * 返回 Error 如果发现不支持函数，null 表示全部合法
 */
export function validateFunctions(usedFunctions: Set<string>): Error | null {
  for (const fn of usedFunctions) {
    if (!ALLOWED_FUNCTIONS.includes(fn)) {
      return new Error(`不支持的函数: ${fn}`);
    }
  }
  return null;
}

/**
 * 常见预处理：trim + ln→log 转换
 */
export function preprocessExpression(expression: string): string {
  let cleaned = expression.trim();
  cleaned = cleaned.replace(/\bln\b/g, 'log');
  return cleaned;
}

/**
 * 分割等号表达式，返回 { left, right } 或 Error
 * 用于隐函数和3D隐函数解析器
 */
export function splitEquation(cleaned: string, requiredMessage: string = '隐函数必须包含等号，格式：F(x,y) = G(x,y)'): { left: string; right: string } | Error {
  if (!cleaned.includes('=')) {
    return new Error(requiredMessage);
  }
  const parts = cleaned.split('=');
  if (parts.length !== 2) {
    return new Error('表达式只能包含一个等号');
  }
  const left = parts[0].trim();
  const right = parts[1].trim();
  if (!left || !right) {
    return new Error('等号两侧不能为空');
  }
  return { left, right };
}

/**
 * 合并等号两边为 F - G = 0 形式
 */
export function combineEquationSides(left: string, right: string): string {
  return `(${left}) - (${right})`;
}

/**
 * 安全求值：返回 NaN 如果结果不是有限数或求值出错
 */
export function safeEvaluate(compiled: EvalFunction, scope: Record<string, number>): number {
  try {
    const result = compiled.evaluate(scope);
    if (typeof result !== 'number' || !isFinite(result)) {
      return NaN;
    }
    return result;
  } catch {
    return NaN;
  }
}

/**
 * 测试求值函数在指定测试点是否可用
 * 返回 Error 如果抛异常，null 表示成功
 */
export function testEvaluation(testFn: () => void): Error | null {
  try {
    testFn();
    return null;
  } catch (e) {
    return new Error(`求值错误: ${(e as Error).message}`);
  }
}