// src/lib/implicitParser.ts
import { create, all } from 'mathjs';
import type { MathNode } from 'mathjs';
import type { ImplicitFunction } from '../types';
import { v4 as uuidv4 } from 'uuid';
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

/**
 * 解析隐函数表达式
 * 支持格式：F(x,y) = G(x,y) 或 F(x,y,a,b) = G(x,y,a,b)
 *
 * 示例：
 * - "x^2 + y^2 = 1" → 圆
 * - "x^2/a^2 + y^2/b^2 = 1" → 椭圆（带参数）
 * - "y^2 = x^3 - x" → 多分支曲线
 */
export function parseImplicitExpression(
  expression: string,
  maxParams: number = 3
): ImplicitFunction | Error {
  try {
    // 预处理：清理输入
    let cleaned = expression.trim();
    cleaned = cleaned.replace(/\bln\b/g, 'log');

    if (!cleaned) {
      return new Error('表达式不能为空');
    }

    // 检查是否包含等号
    if (!cleaned.includes('=')) {
      return new Error('隐函数必须包含等号，格式：F(x,y) = G(x,y)');
    }

    // 分割等号左右两边
    const parts = cleaned.split('=');
    if (parts.length !== 2) {
      return new Error('表达式只能包含一个等号');
    }

    const leftExpr = parts[0].trim();
    const rightExpr = parts[1].trim();

    if (!leftExpr || !rightExpr) {
      return new Error('等号两边都必须有表达式');
    }

    // 转换为 F(x,y) - G(x,y) = 0 形式
    const combinedExpr = `(${leftExpr}) - (${rightExpr})`;

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

    // 检查变量：必须包含 x 和 y
    if (!usedVariables.has('x')) {
      return new Error('隐函数必须包含变量 x');
    }
    if (!usedVariables.has('y')) {
      return new Error('隐函数必须包含变量 y');
    }

    // 提取参数（排除 x, y 和常量）
    const variablesArray = Array.from(usedVariables);
    const validation = validateParamCount(variablesArray, maxParams);

    if (!validation.valid) {
      return new Error(
        `参数过多: 最多支持 ${maxParams} 个参数，当前检测到 ${validation.paramCount} 个（${validation.excessParams.join(', ')}）`
      );
    }

    const parameters = extractParameters(variablesArray, maxParams);

    // 编译为可执行函数
    const compiled = node.compile();

    // 创建安全的求值函数
    const safeEval = (x: number, y: number, params: Record<string, number> = {}): number => {
      try {
        const result = compiled.evaluate({ x, y, ...params });
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
      safeEval(0, 0, defaultParams);
      safeEval(1, 1, defaultParams);
      safeEval(-1, -1, defaultParams);
    } catch (e) {
      return new Error(`求值错误: ${(e as Error).message}`);
    }

    return {
      id: uuidv4(),
      expression: cleaned,
      compiled: safeEval,
      color: '',  // 由 store 填充
      visible: true,
      parameters,
    };

  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}