import { describe, it, expect, beforeEach } from 'vitest';
import {
  parsePolarExpression,
  polarToCartesian,
  samplePolarFunction,
  samplePolarFunctionFast,
  cachedSamplePolar,
  clearPolarCache,
} from '../lib/polarParser';

describe('parsePolarExpression', () => {
  describe('正常表达式解析', () => {
    it('应正确解析简单极坐标函数 sin(x)', () => {
      const result = parsePolarExpression('sin(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(0, {})).toBeCloseTo(0, 10);
      expect(fn.compiled(Math.PI / 2, {})).toBeCloseTo(1, 10);
    });

    it('应正确解析 r = sin(3x) 形式', () => {
      const result = parsePolarExpression('r = sin(3*x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(0, {})).toBeCloseTo(0, 10);
    });

    it('应支持 theta 变量替换', () => {
      const result = parsePolarExpression('sin(theta)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(Math.PI / 2, {})).toBeCloseTo(1, 10);
    });

    it('应支持 t 变量替换', () => {
      const result = parsePolarExpression('sin(t)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(Math.PI / 2, {})).toBeCloseTo(1, 10);
    });

    it('应支持 θ 符号', () => {
      const result = parsePolarExpression('sin(θ)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(Math.PI / 2, {})).toBeCloseTo(1, 10);
    });

    it('应正确解析玫瑰曲线 sin(5*x)', () => {
      const result = parsePolarExpression('sin(5*x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      // 5 叶玫瑰曲线
      expect(fn.compiled(0, {})).toBeCloseTo(0, 10);
      // sin(5 * PI/10) = sin(PI/2) = 1
      expect(fn.compiled(Math.PI / 10, {})).toBeCloseTo(1, 5);
    });

    it('应正确解析阿基米德螺线 x/2', () => {
      const result = parsePolarExpression('x/2');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(0, {})).toBeCloseTo(0, 10);
      expect(fn.compiled(Math.PI, {})).toBeCloseTo(Math.PI / 2, 10);
    });

    it('应正确解析心形曲线 1 + cos(x)', () => {
      const result = parsePolarExpression('1 + cos(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(0, {})).toBeCloseTo(2, 10);
      expect(fn.compiled(Math.PI, {})).toBeCloseTo(0, 10);
    });
  });

  describe('带参数的表达式', () => {
    it('应正确解析带参数的表达式 a*sin(x)', () => {
      const result = parsePolarExpression('a*sin(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.parameters.length).toBe(1);
      expect(fn.parameters[0].name).toBe('a');
    });

    it('应正确计算带参数的表达式', () => {
      const result = parsePolarExpression('a*sin(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.compiled(Math.PI / 2, { a: 2 })).toBeCloseTo(2, 10);
      expect(fn.compiled(Math.PI / 2, { a: 3 })).toBeCloseTo(3, 10);
    });
  });

  describe('边界条件', () => {
    it('空表达式应返回错误', () => {
      const result = parsePolarExpression('');
      expect(result).toBeInstanceOf(Error);
    });

    it('仅空格的表达式应返回错误', () => {
      const result = parsePolarExpression('   ');
      expect(result).toBeInstanceOf(Error);
    });

    it('语法错误应返回错误', () => {
      const result = parsePolarExpression('++');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('语法');
    });

    it('不支持的函数应返回错误', () => {
      const result = parsePolarExpression('unknownFunc(x)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toContain('不支持的函数');
    });
  });

  describe('默认设置', () => {
    it('应设置正确的默认 theta 范围', () => {
      const result = parsePolarExpression('sin(x)');
      expect(result).not.toBeInstanceOf(Error);
      const fn = result as any;
      expect(fn.thetaMin).toBe(0);
      expect(fn.thetaMax).toBeCloseTo(2 * Math.PI, 10);
    });
  });
});

describe('polarToCartesian', () => {
  it('应正确转换原点', () => {
    const result = polarToCartesian(0, 0);
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(0, 10);
  });

  it('应正确转换单位圆上的点', () => {
    const result = polarToCartesian(1, 0);
    expect(result.x).toBeCloseTo(1, 10);
    expect(result.y).toBeCloseTo(0, 10);
  });

  it('应正确转换 45 度点', () => {
    const result = polarToCartesian(1, Math.PI / 4);
    expect(result.x).toBeCloseTo(Math.SQRT2 / 2, 10);
    expect(result.y).toBeCloseTo(Math.SQRT2 / 2, 10);
  });

  it('应正确转换 90 度点', () => {
    const result = polarToCartesian(1, Math.PI / 2);
    expect(result.x).toBeCloseTo(0, 10);
    expect(result.y).toBeCloseTo(1, 10);
  });

  it('应正确处理负半径', () => {
    const result = polarToCartesian(-1, 0);
    expect(result.x).toBeCloseTo(-1, 10);
    expect(result.y).toBeCloseTo(0, 10);
  });
});

describe('samplePolarFunction', () => {
  it('应采样圆 r = 1', () => {
    const fn = (theta: number) => 1;
    const points = samplePolarFunction(fn, {}, 0, 2 * Math.PI, 100);

    expect(points.length).toBeGreaterThan(0);
    // 所有点应该近似在单位圆上
    for (const p of points) {
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
        const dist = Math.sqrt(p.x * p.x + p.y * p.y);
        expect(dist).toBeCloseTo(1, 1);
      }
    }
  });

  it('应处理返回 NaN 的函数', () => {
    const fn = (theta: number) => (theta > Math.PI ? NaN : 1);
    const points = samplePolarFunction(fn, {}, 0, 2 * Math.PI, 50);

    // 应该有有效点（第一半）和可能 NaN 断点
    expect(points.length).toBeGreaterThan(0);
    // 验证前半部分是有效点
    const validPoints = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    expect(validPoints.length).toBeGreaterThan(0);
  });

  it('应支持自定义角度范围', () => {
    const fn = (theta: number) => theta;
    const points = samplePolarFunction(fn, {}, 0, Math.PI, 50);

    expect(points.length).toBeGreaterThan(0);
    // 验证范围
    const thetas = points.filter(p => Number.isFinite(p.theta)).map(p => p.theta);
    const minTheta = Math.min(...thetas);
    const maxTheta = Math.max(...thetas);
    expect(minTheta).toBeCloseTo(0, 1);
    expect(maxTheta).toBeCloseTo(Math.PI, 1);
  });
});

describe('samplePolarFunctionFast', () => {
  it('应快速采样圆 r = 1', () => {
    const fn = (theta: number) => 1;
    const points = samplePolarFunctionFast(fn, {}, 0, 2 * Math.PI, 60);

    expect(points.length).toBe(61); // steps + 1
  });

  it('应处理简单螺旋线', () => {
    const fn = (theta: number) => theta / (2 * Math.PI);
    const points = samplePolarFunctionFast(fn, {}, 0, 2 * Math.PI, 60);

    expect(points.length).toBe(61);
    // 第一个点应该在原点
    expect(points[0].x).toBeCloseTo(0, 10);
    expect(points[0].y).toBeCloseTo(0, 10);
  });
});

describe('cachedSamplePolar', () => {
  beforeEach(() => {
    clearPolarCache('test');
  });

  it('应缓存采样结果', () => {
    const fn = (theta: number) => Math.sin(theta);
    const params = {};

    const points1 = cachedSamplePolar(fn, 'test', params, 0, 2 * Math.PI, 100);
    const points2 = cachedSamplePolar(fn, 'test', params, 0, 2 * Math.PI, 100);

    // 相同参数应返回相同引用（缓存命中）
    expect(points2).toBe(points1);
  });

  it('不同参数应返回不同结果', () => {
    let callCount = 0;
    const fn = (theta: number) => {
      callCount++;
      return Math.sin(theta);
    };

    cachedSamplePolar(fn, 'test', { a: 1 }, 0, 2 * Math.PI, 100);
    const count1 = callCount;

    cachedSamplePolar(fn, 'test', { a: 2 }, 0, 2 * Math.PI, 100);
    const count2 = callCount;

    // 不同参数应重新采样
    expect(count2).toBeGreaterThan(count1);
  });

  it('清除缓存后应重新采样', () => {
    const fn = (theta: number) => Math.sin(theta);

    cachedSamplePolar(fn, 'test', {}, 0, 2 * Math.PI, 100);
    clearPolarCache('test');
    const points = cachedSamplePolar(fn, 'test', {}, 0, 2 * Math.PI, 100);

    expect(points.length).toBeGreaterThan(0);
  });
});
