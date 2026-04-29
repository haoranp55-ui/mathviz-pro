// src/lib/parser.ts
import { create, all, MathNode } from 'mathjs';
import { ParsedFunction } from '../types';

const math = create(all);

// 配置 mathjs 支持的函数和常量
const ALLOWED_FUNCTIONS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh',
  'exp', 'log', 'log10', 'log2', 'sqrt', 'cbrt',
  'abs', 'floor', 'ceil', 'round', 'sign',
  'pow', 'mod',
];

const ALLOWED_CONSTANTS = ['pi', 'e', 'PI', 'E'];

export function parseExpression(expression: string): ParsedFunction | Error {
  try {
    // 预处理：清理输入
    const cleaned = expression.trim();

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
