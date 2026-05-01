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
 * 将奇点函数转换为无奇点形式
 * tan(arg) → sin(arg)/cos(arg)
 * cot(arg) → cos(arg)/sin(arg)
 * sec(arg) → 1/cos(arg)
 * csc(arg) → 1/sin(arg)
 */
function convertSingularityFunctions(node: MathNode): MathNode {
  return node.transform((n: MathNode) => {
    if (n.type === 'FunctionNode') {
      const fnNode = n as any;
      const fnName = typeof fnNode.fn === 'string' ? fnNode.fn : fnNode.fn?.name;
      const args = fnNode.args as MathNode[];

      switch (fnName) {
        case 'tan':
          // tan(arg) → sin(arg) / cos(arg)
          return new math.FunctionNode('divide', [
            new math.FunctionNode('sin', args.slice()),
            new math.FunctionNode('cos', args.slice()),
          ]) as MathNode;
        case 'cot':
          // cot(arg) → cos(arg) / sin(arg)
          return new math.FunctionNode('divide', [
            new math.FunctionNode('cos', args.slice()),
            new math.FunctionNode('sin', args.slice()),
          ]) as MathNode;
        case 'sec':
          // sec(arg) → 1 / cos(arg)
          return new math.FunctionNode('divide', [
            new math.ConstantNode(1),
            new math.FunctionNode('cos', args.slice()),
          ]) as MathNode;
        case 'csc':
          // csc(arg) → 1 / sin(arg)
          return new math.FunctionNode('divide', [
            new math.ConstantNode(1),
            new math.FunctionNode('sin', args.slice()),
          ]) as MathNode;
      }
    }
    return n;
  });
}

/**
 * 收集表达式中的所有分母
 */
function collectDenominators(node: MathNode): MathNode[] {
  const denominators: MathNode[] = [];

  node.traverse((n: MathNode) => {
    if (n.type === 'OperatorNode') {
      const opNode = n as any;
      if (opNode.op === '/' || opNode.fn === 'divide') {
        const args = opNode.args as MathNode[];
        denominators.push(args[1]); // 分母
      }
    }
    if (n.type === 'FunctionNode') {
      const fnNode = n as any;
      const fnName = typeof fnNode.fn === 'string' ? fnNode.fn : fnNode.fn?.name;
      if (fnName === 'divide') {
        const args = fnNode.args as MathNode[];
        denominators.push(args[1]);
      }
    }
  });

  return denominators;
}

/**
 * 解析隐函数表达式
 * 支持格式：F(x,y) = G(x,y) 或 F(x,y,a,b) = G(x,y,a,b)
 *
 * 示例：
 * - "x^2 + y^2 = 1" → 圆
 * - "x^2/a^2 + y^2/b^2 = 1" → 椭圆（带参数）
 * - "y^2 = x^3 - x" → 多分支曲线
 * - "y = tan(x)" → 自动转换为稳定的无奇点形式
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

    // 收集原始使用的函数
    const originalFunctions = new Set<string>();
    node.traverse((n: MathNode) => {
      if (n.type === 'FunctionNode') {
        const fn = (n as any).fn;
        const fnName = typeof fn === 'string' ? fn : fn?.name;
        if (fnName) originalFunctions.add(fnName);
      }
    });

    // 检查是否包含可能导致奇点的函数
    const hasSingularityFn = ['tan', 'cot', 'sec', 'csc'].some(fn => originalFunctions.has(fn));

    // 存储转换后的表达式（用于UI提示）
    let transformedExpression: string | undefined;

    // 如果包含奇点函数，转换并乘分母
    if (hasSingularityFn) {
      // 转换奇点函数为除法形式
      const convertedNode = convertSingularityFunctions(node);

      // 收集所有分母
      const denominators = collectDenominators(convertedNode);

      if (denominators.length > 0) {
        // 将所有分母乘到整个表达式上，消除除法
        let finalNode = convertedNode;
        for (const denom of denominators) {
          finalNode = new math.OperatorNode('*', 'multiply', [finalNode, denom]) as MathNode;
        }

        // 简化表达式
        try {
          node = math.simplify(finalNode);
        } catch {
          node = finalNode;
        }

        // 存储转换后的表达式
        transformedExpression = node.toString();
      } else {
        node = convertedNode;
      }
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
        if (typeof result !== 'number') {
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
      transformedExpression,
    };

  } catch (e) {
    return new Error(`解析错误: ${(e as Error).message}`);
  }
}