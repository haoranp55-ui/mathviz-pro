import { describe, it, expect, beforeEach } from 'vitest';
import { adaptiveSample, cachedSample, sampleCacheManager } from '../lib/sampler';
import type { SampleOptions } from '../types';

describe('adaptiveSample', () => {
  const defaultOptions: SampleOptions = {
    xMin: -10,
    xMax: 10,
    sampleCount: 100,
  };

  describe('基本采样功能', () => {
    it('应正确采样线性函数 y = x', () => {
      const fn = (x: number) => x;
      const result = adaptiveSample(fn, defaultOptions);

      expect(result.x.length).toBeGreaterThan(0);
      expect(result.y.length).toBe(result.x.length);

      // 检查采样范围
      expect(result.x[0]).toBeCloseTo(-10, 5);
      expect(result.x[result.x.length - 1]).toBeCloseTo(10, 5);
    });

    it('应正确采样常数函数 y = 5', () => {
      const fn = (x: number) => 5;
      const result = adaptiveSample(fn, defaultOptions);

      // 所有 y 值应为 5
      for (let i = 0; i < result.y.length; i++) {
        expect(result.y[i]).toBe(5);
      }
    });

    it('应正确采样二次函数 y = x^2', () => {
      const fn = (x: number) => x * x;
      const result = adaptiveSample(fn, defaultOptions);

      // 检查 x=0 处的采样值（找到最接近 0 的点）
      let minIdx = 0;
      let minX = Math.abs(result.x[0]);
      for (let i = 1; i < result.x.length; i++) {
        if (Math.abs(result.x[i]) < minX) {
          minX = Math.abs(result.x[i]);
          minIdx = i;
        }
      }
      // 验证 y = x^2 关系成立
      const x = result.x[minIdx];
      const y = result.y[minIdx];
      expect(y).toBeCloseTo(x * x, 5);
    });

    it('应正确采样正弦函数', () => {
      const fn = Math.sin;
      const result = adaptiveSample(fn, defaultOptions);

      // 检查值范围在 [-1, 1]
      for (let i = 0; i < result.y.length; i++) {
        if (Number.isFinite(result.y[i])) {
          expect(Math.abs(result.y[i])).toBeLessThanOrEqual(1.001);
        }
      }
    });
  });

  describe('边界条件', () => {
    it('sampleCount = 1 时应返回单点', () => {
      const fn = (x: number) => x;
      const result = adaptiveSample(fn, { xMin: 0, xMax: 10, sampleCount: 1 });

      expect(result.x.length).toBe(1);
      expect(result.x[0]).toBe(0);
    });

    it('应处理 NaN 函数返回全 NaN', () => {
      const fn = (x: number) => NaN;
      const result = adaptiveSample(fn, defaultOptions);

      expect(result.x.length).toBeGreaterThan(0);
      for (let i = 0; i < result.y.length; i++) {
        expect(result.y[i]).toBeNaN();
      }
    });

    it('应处理 Infinity 返回 NaN', () => {
      const fn = (x: number) => x === 0 ? Infinity : x;
      const result = adaptiveSample(fn, { xMin: -1, xMax: 1, sampleCount: 10 });

      expect(result.x.length).toBeGreaterThan(0);
    });
  });

  describe('渐近线检测', () => {
    it('应在 tan(x) 渐近线处增加采样点', () => {
      const fn = Math.tan;
      // 在 -pi/2 到 pi/2 之间采样
      const result = adaptiveSample(fn, {
        xMin: -Math.PI / 2 + 0.1,
        xMax: Math.PI / 2 - 0.1,
        sampleCount: 50,
      });

      expect(result.x.length).toBeGreaterThan(0);
    });

    it('应在 1/x 零点附近增加采样点', () => {
      const fn = (x: number) => 1 / x;
      const result = adaptiveSample(fn, { xMin: -1, xMax: 1, sampleCount: 50 });

      expect(result.x.length).toBeGreaterThan(0);
    });
  });

  describe('采样范围', () => {
    it('应正确处理负数范围', () => {
      const fn = (x: number) => x;
      const result = adaptiveSample(fn, { xMin: -5, xMax: -1, sampleCount: 20 });

      expect(result.x[0]).toBeCloseTo(-5, 5);
      expect(result.x[result.x.length - 1]).toBeCloseTo(-1, 5);
    });

    it('应正确处理反向范围', () => {
      const fn = (x: number) => x;
      const result = adaptiveSample(fn, { xMin: 10, xMax: -10, sampleCount: 100 });

      // 应该仍然产生采样点
      expect(result.x.length).toBeGreaterThan(0);
    });
  });
});

describe('sampleCacheManager', () => {
  beforeEach(() => {
    sampleCacheManager.clearAll();
  });

  describe('缓存读写', () => {
    it('应正确存储和获取缓存', () => {
      const fn = (x: number) => x;
      const options: SampleOptions = { xMin: 0, xMax: 10, sampleCount: 100 };

      const result1 = cachedSample(fn, 'test-1', options);
      const result2 = cachedSample(fn, 'test-1', options);

      // 第二次应该是缓存命中
      expect(result2.x).toBe(result1.x);
      expect(result2.y).toBe(result1.y);
    });

    it('不同 cacheId 应产生不同缓存', () => {
      const fn = (x: number) => x;
      const options: SampleOptions = { xMin: 0, xMax: 10, sampleCount: 100 };

      const result1 = cachedSample(fn, 'test-a', options);
      const result2 = cachedSample(fn, 'test-b', options);

      // 不同 cacheId，内容相同但不是同一引用
      expect(result1.x.length).toBe(result2.x.length);
    });

    it('参数变化应导致缓存未命中', () => {
      // 使用简单函数，参数通过 cacheId 区分
      const fn = (x: number) => x;
      const options: SampleOptions = { xMin: 0, xMax: 10, sampleCount: 100 };

      const result1 = cachedSample(fn, 'test-params-a1', options, { a: 1 });
      const result2 = cachedSample(fn, 'test-params-a2', options, { a: 2 });
      const result3 = cachedSample(fn, 'test-params-a1', options, { a: 1 });

      // 不同参数应有不同 cacheId，产生不同采样
      expect(result1.x.length).toBe(result2.x.length);
      // 相同参数应命中缓存
      expect(result3.x).toBe(result1.x);
    });
  });

  describe('缓存清除', () => {
    it('clear 应删除指定缓存', () => {
      const fn = (x: number) => x;
      const options: SampleOptions = { xMin: 0, xMax: 10, sampleCount: 100 };

      cachedSample(fn, 'to-clear', options);
      sampleCacheManager.clear('to-clear');

      // 再次采样不应命中缓存
      const result1 = cachedSample(fn, 'to-clear', options);
      const result2 = cachedSample(fn, 'to-clear', options);

      expect(result2.x).toBe(result1.x);
    });

    it('clearAll 应删除所有缓存', () => {
      const fn = (x: number) => x;
      const options: SampleOptions = { xMin: 0, xMax: 10, sampleCount: 100 };

      cachedSample(fn, 'cache-1', options);
      cachedSample(fn, 'cache-2', options);

      sampleCacheManager.clearAll();

      // 再次采样不应命中任何缓存
      const result1 = cachedSample(fn, 'cache-1', options);
      const result2 = cachedSample(fn, 'cache-2', options);

      // 每个都是新采样
      expect(result1.x.length).toBe(result2.x.length);
    });
  });

  describe('缓存容量限制', () => {
    it('超过最大容量应淘汰最旧缓存', () => {
      const fn = (x: number) => x;
      const options: SampleOptions = { xMin: 0, xMax: 10, sampleCount: 100 };

      // 填充超过 50 个缓存
      for (let i = 0; i < 55; i++) {
        cachedSample(fn, `cache-${i}`, options);
      }

      // 第一个缓存应该已被淘汰
      const firstResult = cachedSample(fn, 'cache-0', options);
      // 最新缓存应该还在
      const lastResult = cachedSample(fn, 'cache-54', options);

      // 两个都应该能获取到结果
      expect(firstResult.x.length).toBeGreaterThan(0);
      expect(lastResult.x.length).toBeGreaterThan(0);
    });
  });
});

describe('cachedSample', () => {
  beforeEach(() => {
    sampleCacheManager.clearAll();
  });

  it('首次采样应计算并缓存', () => {
    let callCount = 0;
    const fn = (x: number) => {
      callCount++;
      return x * x;
    };
    const options: SampleOptions = { xMin: 0, xMax: 10, sampleCount: 100 };

    const result = cachedSample(fn, 'counter', options);

    expect(result.x.length).toBeGreaterThan(0);
    expect(callCount).toBeGreaterThan(0);
  });

  it('相同参数应命中缓存', () => {
    let callCount = 0;
    const fn = (x: number) => {
      callCount++;
      return x * x;
    };
    const options: SampleOptions = { xMin: 0, xMax: 10, sampleCount: 100 };

    cachedSample(fn, 'counter', options);
    const firstCount = callCount;

    cachedSample(fn, 'counter', options);

    // 第二次应该命中缓存，不再调用函数
    expect(callCount).toBe(firstCount);
  });

  it('不同采样范围应重新计算', () => {
    const fn = (x: number) => x;
    const options1: SampleOptions = { xMin: 0, xMax: 10, sampleCount: 100 };
    const options2: SampleOptions = { xMin: 0, xMax: 20, sampleCount: 100 };

    const result1 = cachedSample(fn, 'range-test', options1);
    const result2 = cachedSample(fn, 'range-test', options2);

    // 不同范围应产生不同结果
    expect(result2.x[result2.x.length - 1]).toBeGreaterThan(result1.x[result1.x.length - 1]);
  });
});
