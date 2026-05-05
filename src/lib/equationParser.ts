// src/lib/equationParser.ts
import { create, all } from 'mathjs';
import type { MathNode } from 'mathjs';
import type { Equation, EquationSystem, SearchRange, VariableName } from '../types';
import { VARIABLE_NAMES, DEFAULT_SEARCH_RANGE } from '../types';
import { v4 as uuidv4 } from 'uuid';

const math = create(all);

// 支持的函数列表
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

/**
 * 解析单个方程表达式
 * 支持格式: f(x,y) = 0 或 f(x,y) = g(x,y)
 */
export function parseEquation(
  expression: string,
  variables: string[]
): Equation | Error {
  try {
    // 预处理
    let cleaned = expression.trim();
    cleaned = cleaned.replace(/\bln\b/g, 'log');

    if (!cleaned) {
      return new Error('方程不能为空');
    }

    // 检查是否包含等号
    if (!cleaned.includes('=')) {
      return new Error('方程必须包含等号 "="');
    }

    // 分割等号左右
    const parts = cleaned.split('=');
    if (parts.length !== 2) {
      return new Error('方程格式错误：只能包含一个等号');
    }

    const leftExpr = parts[0].trim();
    const rightExpr = parts[1].trim();

    // 转换为 f(x,y,...) = 0 形式
    let combinedExpr: string;
    if (rightExpr === '0') {
      combinedExpr = leftExpr;
    } else {
      combinedExpr = `(${leftExpr}) - (${rightExpr})`;
    }

    // 解析表达式
    let node: MathNode;
    try {
      node = math.parse(combinedExpr);
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

    // 检查变量是否在允许列表中
    for (const v of usedVariables) {
      if (!variables.includes(v) && !ALLOWED_CONSTANTS.includes(v) && !ALLOWED_FUNCTIONS.includes(v)) {
        return new Error(`未知变量: ${v}（当前方程组变量: ${variables.join(', ')}）`);
      }
    }

    // 编译为可执行函数
    const compiled = node.compile();

    // 创建安全的求值函数
    const safeEval = (vars: Record<string, number>): number => {
      try {
        const result = compiled.evaluate(vars);
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
      const testVars: Record<string, number> = {};
      for (const v of variables) {
        testVars[v] = 1;
      }
      safeEval(testVars);
    } catch (e) {
      return new Error(`求值错误: ${(e as Error).message}`);
    }

    return {
      id: uuidv4(),
      expression: cleaned,
      compiled: safeEval,
    };

  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}

/**
 * 解析方程组
 * @param expressions 方程表达式数组
 * @param variableNames 变量名数组（1-5个）
 */
export function parseEquationSystem(
  expressions: string[],
  variableNames: VariableName[]
): EquationSystem | Error {
  // 验证变量数量
  if (variableNames.length < 1 || variableNames.length > 5) {
    return new Error('变量数量必须在 1-5 个之间');
  }

  // 验证方程数量
  if (expressions.length === 0) {
    return new Error('至少需要一个方程');
  }

  if (expressions.length !== variableNames.length) {
    return new Error(`方程数量 (${expressions.length}) 必须等于变量数量 (${variableNames.length})`);
  }

  // 解析每个方程
  const equations: Equation[] = [];
  for (let i = 0; i < expressions.length; i++) {
    const result = parseEquation(expressions[i], variableNames);
    if (result instanceof Error) {
      return new Error(`方程 ${i + 1} 错误: ${result.message}`);
    }
    equations.push(result);
  }

  // 创建默认搜索范围
  const searchRange: SearchRange[] = variableNames.map(() => ({ ...DEFAULT_SEARCH_RANGE }));

  // 创建默认初始猜测值
  const initialGuess = variableNames.map(() => 0);

  return {
    id: uuidv4(),
    equations,
    variables: variableNames,
    solutions: null,
    status: 'idle',
    initialGuess,
    searchRange,
  };
}

/**
 * 从表达式中提取变量
 */
export function detectVariables(expressions: string[]): VariableName[] {
  const allVariables = new Set<string>();

  for (const expr of expressions) {
    try {
      const node = math.parse(expr);
      node.traverse((n: MathNode) => {
        if (n.type === 'SymbolNode') {
          const name = (n as any).name;
          if (VARIABLE_NAMES.includes(name as VariableName)) {
            allVariables.add(name);
          }
        }
      });
    } catch {
      // 忽略解析错误
    }
  }

  // 按照标准顺序排序
  return VARIABLE_NAMES.filter(v => allVariables.has(v));
}
