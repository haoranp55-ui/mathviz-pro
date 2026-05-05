// src/lib/implicit3DParser.ts
import { create, all } from 'mathjs';
import type { MathNode } from 'mathjs';

const math = create(all);

const ALLOWED_FUNCTIONS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'cot', 'sec', 'csc',
  'sinh', 'cosh', 'tanh',
  'coth', 'sech', 'csch',
  'exp', 'log', 'ln', 'log10', 'log2',
  'sqrt', 'cbrt', 'nthRoot',
  'pow', 'cube', 'square',
  'abs', 'floor', 'ceil', 'round', 'sign',
  'hypot',
];

const ALLOWED_CONSTANTS = [
  'pi', 'e', 'PI', 'E',
  'tau', 'phi',
];

export function parseImplicit3DExpression(raw: string):
  | { compiled: (x: number, y: number, z: number) => number }
  | Error
{
  try {
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/\bln\b/g, 'log');

    // 处理 "f(x,y,z) = 0" 形式 → 取左侧减右侧
    if (cleaned.includes('=')) {
      const parts = cleaned.split('=');
      if (parts.length === 2) {
        cleaned = `(${parts[0].trim()}) - (${parts[1].trim()})`;
      }
    }

    if (!cleaned) {
      return new Error('表达式不能为空');
    }

    let node: MathNode;
    try {
      node = math.parse(cleaned);
    } catch (e) {
      return new Error(`语法错误: ${(e as Error).message}`);
    }

    const usedFunctions = new Set<string>();
    const usedVariables = new Set<string>();

    node.traverse((n: MathNode) => {
      if (n.type === 'FunctionNode') {
        const fn = (n as any).fn;
        if (typeof fn === 'string') usedFunctions.add(fn);
        else if (fn?.name) usedFunctions.add(fn.name);
      }
      if (n.type === 'SymbolNode') {
        usedVariables.add((n as any).name);
      }
    });

    for (const fn of usedFunctions) {
      if (!ALLOWED_FUNCTIONS.includes(fn)) {
        return new Error(`不支持的函数: ${fn}`);
      }
    }

    for (const v of usedVariables) {
      if (v !== 'x' && v !== 'y' && v !== 'z' && !ALLOWED_CONSTANTS.includes(v) && !ALLOWED_FUNCTIONS.includes(v)) {
        return new Error(`未知变量: ${v}（3D隐函数只支持变量 x, y, z）`);
      }
    }

    const compiled = node.compile();

    const safeEval = (x: number, y: number, z: number): number => {
      try {
        const result = compiled.evaluate({ x, y, z });
        if (typeof result !== 'number' || !isFinite(result)) return NaN;
        return result;
      } catch {
        return NaN;
      }
    };

    try { safeEval(0, 0, 0); safeEval(1, 1, 1); } catch (e) {
      return new Error(`求值错误: ${(e as Error).message}`);
    }

    return { compiled: safeEval };
  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}
