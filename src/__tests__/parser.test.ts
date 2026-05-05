import { describe, it, expect } from 'vitest';
import { parseExpression, parseParametricExpression, suggestRange } from '../lib/parser';

describe('parseExpression', () => {
  describe('正常表达式解析', () => {
    it('应正确解析简单多项式 x^2', () => {
      const result = parseExpression('x^2');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.expression).toBe('x^2');
      expect(fn.compiled(0)).toBe(0);
      expect(fn.compiled(2)).toBe(4);
      expect(fn.compiled(-3)).toBe(9);
    });

    it('应正确解析三角函数 sin(x)', () => {
      const result = parseExpression('sin(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(0)).toBeCloseTo(0, 10);
      expect(fn.compiled(Math.PI / 2)).toBeCloseTo(1, 10);
    });

    it('应正确解析指数函数 exp(x)', () => {
      const result = parseExpression('exp(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(0)).toBe(1);
      expect(fn.compiled(1)).toBeCloseTo(Math.E, 10);
    });

    it('应正确解析对数函数 log(x) 和 ln(x)', () => {
      const logResult = parseExpression('log(x)');
      expect(logResult).not.toBeInstanceOf(Error);
      const logFn = logResult as any;
      expect(logFn.compiled(1)).toBe(0);
      expect(logFn.compiled(Math.E)).toBeCloseTo(1, 10);

      const lnResult = parseExpression('ln(x)');
      expect(lnResult).not.toBeInstanceOf(Error);
      const lnFn = lnResult as any;
      expect(lnFn.compiled(Math.E)).toBeCloseTo(1, 10);
    });

    it('应正确解析常量 pi 和 e', () => {
      const piResult = parseExpression('sin(pi)');
      expect(piResult).not.toBeInstanceOf(Error);
      const piFn = piResult as any;
      expect(piFn.compiled(0)).toBeCloseTo(0, 10);

      const eResult = parseExpression('e^x');
      expect(eResult).not.toBeInstanceOf(Error);
      const eFn = eResult as any;
      expect(eFn.compiled(1)).toBeCloseTo(Math.E, 10);
    });

    it('应正确解析复合函数 sin(x)^2 + cos(x)^2', () => {
      const result = parseExpression('sin(x)^2 + cos(x)^2');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(0)).toBeCloseTo(1, 10);
      expect(fn.compiled(1)).toBeCloseTo(1, 10);
    });

    it('应正确解析平方根 sqrt(x)', () => {
      const result = parseExpression('sqrt(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(4)).toBe(2);
      expect(fn.compiled(9)).toBe(3);
    });

    it('应正确解析绝对值 abs(x)', () => {
      const result = parseExpression('abs(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(-5)).toBe(5);
      expect(fn.compiled(3)).toBe(3);
    });
  });

  describe('边界条件处理', () => {
    it('空表达式应返回错误', () => {
      const result = parseExpression('');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('空');
    });

    it('仅空格的表达式应返回错误', () => {
      const result = parseExpression('   ');
      expect(result).toBeInstanceOf(Error);
    });

    it('应处理超出定义域的值返回 NaN', () => {
      const result = parseExpression('sqrt(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(-1)).toBeNaN();
    });

    it('应处理 log(0) 返回 NaN', () => {
      const result = parseExpression('log(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(0)).toBeNaN();
    });

    it('应处理 tan(pi/2) 返回极大值或 NaN', () => {
      const result = parseExpression('tan(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      // 注意：由于浮点精度，tan(pi/2) 可能返回极大值而非 NaN
      const val = fn.compiled(Math.PI / 2);
      expect(Math.abs(val) > 1e10 || Number.isNaN(val)).toBe(true);
    });
  });

  describe('错误表达式处理', () => {
    it('语法错误应返回错误信息', () => {
      const result = parseExpression('x++');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('语法');
    });

    it('未知变量应返回错误', () => {
      const result = parseExpression('x + y');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('未知变量');
    });

    it('不支持的函数应返回错误', () => {
      const result = parseExpression('unknownFunc(x)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('不支持的函数');
    });
  });

  describe('特殊函数', () => {
    it('应支持阶乘函数 factorial(x)', () => {
      const result = parseExpression('factorial(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(5)).toBe(120);
      expect(fn.compiled(0)).toBe(1);
    });

    it('应支持 gamma 函数', () => {
      const result = parseExpression('gamma(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(1)).toBeCloseTo(1, 5);
    });
  });
});

describe('parseParametricExpression', () => {
  describe('带参数的表达式', () => {
    it('应正确解析 y = ax + b 形式', () => {
      const result = parseParametricExpression('a*x + b');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      const paramNames = fn.parameters.map((p: any) => p.name);
      expect(paramNames).toContain('a');
      expect(paramNames).toContain('b');
      expect(fn.compiled(1, { a: 2, b: 3 })).toBe(5);
    });

    it('应正确解析 y = ax^2 + bx + c 形式', () => {
      const result = parseParametricExpression('a*x^2 + b*x + c');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.parameters.length).toBe(3);
      expect(fn.compiled(2, { a: 1, b: 0, c: 0 })).toBe(4);
    });

    it('无参数表达式应正常工作', () => {
      const result = parseParametricExpression('x^2');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.parameters.length).toBe(0);
    });
  });

  describe('参数数量限制', () => {
    it('超过最大参数数应返回错误', () => {
      const result = parseParametricExpression('a*x + b + c + d', 3);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('参数过多');
    });

    it('默认最多支持 3 个参数', () => {
      const result = parseParametricExpression('a*x + b + c');
      expect(result).not.toBeInstanceOf(Error);
    });
  });

  describe('错误处理', () => {
    it('缺少变量 x 应返回错误', () => {
      const result = parseParametricExpression('a + b');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('必须包含变量 x');
    });

    it('空表达式应返回错误', () => {
      const result = parseParametricExpression('');
      expect(result).toBeInstanceOf(Error);
    });
  });
});

describe('suggestRange', () => {
  it('应为线性函数返回合理范围', () => {
    const fn = (x: number) => x;
    const range = suggestRange(fn);
    expect(range.xMin).toBe(-10);
    expect(range.xMax).toBe(10);
    expect(range.yMin).toBeLessThan(range.yMax);
  });

  it('应为常数函数返回带填充的范围', () => {
    const fn = (x: number) => 5;
    const range = suggestRange(fn);
    expect(range.yMin).toBeLessThan(5);
    expect(range.yMax).toBeGreaterThan(5);
  });

  it('应为全 NaN 函数返回默认范围', () => {
    const fn = (x: number) => NaN;
    const range = suggestRange(fn);
    expect(range.xMin).toBe(-10);
    expect(range.xMax).toBe(10);
    expect(range.yMin).toBe(-10);
    expect(range.yMax).toBe(10);
  });
});
