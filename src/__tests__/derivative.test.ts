import { describe, it, expect } from 'vitest';
import {
  numericalDerivative,
  createDerivativeFunction,
  createSecondDerivativeFunction,
} from '../lib/derivative';

describe('numericalDerivative', () => {
  describe('基本导数计算', () => {
    it('应正确计算 x^2 在 x=2 处的导数（应为 4）', () => {
      const fn = (x: number) => x * x;
      const derivative = numericalDerivative(fn, 2);
      expect(derivative).toBeCloseTo(4, 4);
    });

    it('应正确计算 x^3 在 x=2 处的导数（应为 12）', () => {
      const fn = (x: number) => x * x * x;
      const derivative = numericalDerivative(fn, 2);
      expect(derivative).toBeCloseTo(12, 3);
    });

    it('应正确计算 sin(x) 在 x=0 处的导数（应为 1）', () => {
      const fn = Math.sin;
      const derivative = numericalDerivative(fn, 0);
      expect(derivative).toBeCloseTo(1, 4);
    });

    it('应正确计算 cos(x) 在 x=0 处的导数（应为 0）', () => {
      const fn = Math.cos;
      const derivative = numericalDerivative(fn, 0);
      expect(derivative).toBeCloseTo(0, 4);
    });

    it('应正确计算 exp(x) 在 x=0 处的导数（应为 1）', () => {
      const fn = Math.exp;
      const derivative = numericalDerivative(fn, 0);
      expect(derivative).toBeCloseTo(1, 4);
    });

    it('应正确计算 exp(x) 在 x=1 处的导数（应为 e）', () => {
      const fn = Math.exp;
      const derivative = numericalDerivative(fn, 1);
      expect(derivative).toBeCloseTo(Math.E, 3);
    });

    it('应正确计算常数函数的导数（应为 0）', () => {
      const fn = (x: number) => 5;
      const derivative = numericalDerivative(fn, 0);
      expect(derivative).toBeCloseTo(0, 4);
    });

    it('应正确计算线性函数的导数', () => {
      const fn = (x: number) => 3 * x + 2;
      const derivative = numericalDerivative(fn, 5);
      expect(derivative).toBeCloseTo(3, 4);
    });
  });

  describe('边界条件', () => {
    it('应处理函数返回 NaN 的情况', () => {
      // 函数在 x=0 附近返回 NaN
      const fn = (x: number) => {
        if (Math.abs(x) < 0.01) return NaN;
        return x;
      };
      const derivative = numericalDerivative(fn, 0);
      expect(derivative).toBeNaN();
    });

    it('应处理函数返回 Infinity 的情况', () => {
      const fn = (x: number) => (x >= 0 ? Infinity : -Infinity);
      const derivative = numericalDerivative(fn, 0);
      expect(derivative).toBeNaN();
    });

    it('应正确处理大数值输入', () => {
      const fn = (x: number) => x * x;
      const derivative = numericalDerivative(fn, 1000);
      expect(derivative).toBeCloseTo(2000, 2);
    });

    it('应正确处理负数值输入', () => {
      const fn = (x: number) => x * x;
      const derivative = numericalDerivative(fn, -3);
      expect(derivative).toBeCloseTo(-6, 3);
    });
  });

  describe('自定义步长', () => {
    it('应支持自定义步长', () => {
      const fn = (x: number) => x * x;
      const derivative = numericalDerivative(fn, 2, 1e-3);
      expect(derivative).toBeCloseTo(4, 3);
    });

    it('较小步长应提高精度', () => {
      const fn = Math.sin;
      const derivative1 = numericalDerivative(fn, 0, 1e-3);
      const derivative2 = numericalDerivative(fn, 0, 1e-7);
      // 两者都应该接近 1
      expect(derivative1).toBeCloseTo(1, 3);
      expect(derivative2).toBeCloseTo(1, 4);
    });
  });
});

describe('createDerivativeFunction', () => {
  it('应返回一个函数', () => {
    const fn = (x: number) => x * x;
    const derivativeFn = createDerivativeFunction(fn);
    expect(typeof derivativeFn).toBe('function');
  });

  it('返回的函数应正确计算导数', () => {
    const fn = (x: number) => x * x;
    const derivativeFn = createDerivativeFunction(fn);

    expect(derivativeFn(0)).toBeCloseTo(0, 4);
    expect(derivativeFn(1)).toBeCloseTo(2, 4);
    expect(derivativeFn(2)).toBeCloseTo(4, 4);
    expect(derivativeFn(-1)).toBeCloseTo(-2, 4);
  });

  it('应支持自定义步长', () => {
    const fn = Math.sin;
    const derivativeFn = createDerivativeFunction(fn, 1e-6);

    expect(derivativeFn(0)).toBeCloseTo(1, 4);
    expect(derivativeFn(Math.PI / 2)).toBeCloseTo(0, 3);
  });

  it('应对三角函数正确工作', () => {
    const fn = Math.sin;
    const derivativeFn = createDerivativeFunction(fn);

    // d/dx sin(x) = cos(x)
    expect(derivativeFn(0)).toBeCloseTo(Math.cos(0), 4);
    expect(derivativeFn(Math.PI / 4)).toBeCloseTo(Math.cos(Math.PI / 4), 3);
  });
});

describe('createSecondDerivativeFunction', () => {
  it('应返回一个函数', () => {
    const fn = (x: number) => x * x;
    const secondDerivativeFn = createSecondDerivativeFunction(fn);
    expect(typeof secondDerivativeFn).toBe('function');
  });

  it('应正确计算 x^2 的二阶导数（应为 2）', () => {
    const fn = (x: number) => x * x;
    const secondDerivativeFn = createSecondDerivativeFunction(fn);

    expect(secondDerivativeFn(0)).toBeCloseTo(2, 3);
    expect(secondDerivativeFn(1)).toBeCloseTo(2, 3);
    expect(secondDerivativeFn(-1)).toBeCloseTo(2, 3);
  });

  it('应正确计算 x^3 的二阶导数（应为 6x）', () => {
    const fn = (x: number) => x * x * x;
    const secondDerivativeFn = createSecondDerivativeFunction(fn);

    expect(secondDerivativeFn(0)).toBeCloseTo(0, 2);
    expect(secondDerivativeFn(1)).toBeCloseTo(6, 2);
    expect(secondDerivativeFn(2)).toBeCloseTo(12, 1);
  });

  it('应正确计算 sin(x) 的二阶导数（应为 -sin(x)）', () => {
    const fn = Math.sin;
    const secondDerivativeFn = createSecondDerivativeFunction(fn);

    expect(secondDerivativeFn(0)).toBeCloseTo(0, 2);
    expect(secondDerivativeFn(Math.PI / 2)).toBeCloseTo(-1, 2);
  });

  it('应处理常数函数（二阶导数为 0）', () => {
    const fn = (x: number) => 5;
    const secondDerivativeFn = createSecondDerivativeFunction(fn);

    expect(secondDerivativeFn(0)).toBeCloseTo(0, 3);
  });

  it('应处理返回 NaN 的函数', () => {
    const fn = (x: number) => (x === 0 ? NaN : x);
    const secondDerivativeFn = createSecondDerivativeFunction(fn);

    expect(secondDerivativeFn(0)).toBeNaN();
  });
});
