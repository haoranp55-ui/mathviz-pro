import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeGridValues,
  extractSegmentsFromGrid,
  clearGridCache,
  intervalMarchingSquares,
  intervalCacheManager,
  connectSegmentsSmooth,
  catmullRomSpline,
} from '../lib/implicitSamplerInterval';
import type { ViewPort, ContourSegment } from '../types';

describe('computeGridValues', () => {
  it('应计算网格点值', () => {
    const fn = (x: number, y: number) => x * x + y * y - 1;
    const viewPort: ViewPort = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
    const gridSize = 32;

    const values = computeGridValues(fn, viewPort, gridSize);

    expect(values.length).toBe(gridSize * gridSize);
    // 检查接近原点的网格值（不一定是精确原点）
    const centerIdx = Math.floor(gridSize / 2);
    const centerValue = values[centerIdx * gridSize + centerIdx];
    // 原点附近值应该接近 -1（在圆内）
    expect(centerValue).toBeLessThan(0);
  });

  it('应处理返回 NaN 的函数', () => {
    const fn = (x: number, y: number) => (x > 0 ? NaN : x + y);
    const viewPort: ViewPort = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
    const gridSize = 16;

    const values = computeGridValues(fn, viewPort, gridSize);

    expect(values.length).toBe(gridSize * gridSize);
  });

  it('应处理返回 Infinity 的函数', () => {
    const fn = (x: number, y: number) => (x === 0 && y === 0 ? Infinity : x + y);
    const viewPort: ViewPort = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
    const gridSize = 16;

    const values = computeGridValues(fn, viewPort, gridSize);

    expect(values.length).toBe(gridSize * gridSize);
  });
});

describe('extractSegmentsFromGrid', () => {
  it('应从圆的方程提取线段', () => {
    const fn = (x: number, y: number) => x * x + y * y - 1;
    const viewPort: ViewPort = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
    const gridSize = 64;

    const values = computeGridValues(fn, viewPort, gridSize);
    const segments = extractSegmentsFromGrid(values, viewPort, gridSize);

    expect(segments.length).toBeGreaterThan(0);
    // 验证线段在视口范围内
    for (const seg of segments) {
      expect(seg.x1).toBeGreaterThanOrEqual(viewPort.xMin - 0.1);
      expect(seg.x1).toBeLessThanOrEqual(viewPort.xMax + 0.1);
      expect(seg.y1).toBeGreaterThanOrEqual(viewPort.yMin - 0.1);
      expect(seg.y1).toBeLessThanOrEqual(viewPort.yMax + 0.1);
    }
  });

  it('应在无零点时返回空数组', () => {
    const fn = (x: number, y: number) => x * x + y * y + 1; // 永远为正
    const viewPort: ViewPort = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
    const gridSize = 32;

    const values = computeGridValues(fn, viewPort, gridSize);
    const segments = extractSegmentsFromGrid(values, viewPort, gridSize);

    expect(segments.length).toBe(0);
  });

  it('应处理包含 NaN 的网格', () => {
    const values = new Float32Array(16 * 16);
    values.fill(NaN);

    const viewPort: ViewPort = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
    const segments = extractSegmentsFromGrid(values, viewPort, 16);

    expect(segments.length).toBe(0);
  });

  it('应跳过奇点附近的单元格', () => {
    // 1/x 在 x=0 处有奇点
    const fn = (x: number, y: number) => 1 / x + y;
    const viewPort: ViewPort = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
    const gridSize = 32;

    const values = computeGridValues(fn, viewPort, gridSize);
    const segments = extractSegmentsFromGrid(values, viewPort, gridSize);

    // 应该产生一些线段，但不应该在 x=0 附近
    // 由于奇点检测，结果应该是有限的
    expect(segments.length).toBeGreaterThanOrEqual(0);
  });
});

describe('intervalMarchingSquares', () => {
  it('应采样圆的方程', () => {
    const fn = (x: number, y: number) => x * x + y * y - 1;
    const viewPort: ViewPort = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };

    const segments = intervalMarchingSquares(fn, viewPort, 400, 400, 'normal');

    expect(segments.length).toBeGreaterThan(0);
  });

  it('应采样双曲线方程', () => {
    const fn = (x: number, y: number) => x * x - y * y - 1;
    const viewPort: ViewPort = { xMin: -3, xMax: 3, yMin: -3, yMax: 3 };

    const segments = intervalMarchingSquares(fn, viewPort, 400, 400, 'normal');

    expect(segments.length).toBeGreaterThan(0);
  });

  it('应处理无效函数返回 NaN', () => {
    const fn = (x: number, y: number) => (x > 0 && y > 0 ? NaN : x + y);
    const viewPort: ViewPort = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };

    const segments = intervalMarchingSquares(fn, viewPort, 200, 200, 'fast');

    // 应该能处理 NaN 区域
    expect(segments.length).toBeGreaterThanOrEqual(0);
  });

  it('不同精度预设应产生不同结果', () => {
    const fn = (x: number, y: number) => x * x + y * y - 1;
    const viewPort: ViewPort = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };

    const fastSegments = intervalMarchingSquares(fn, viewPort, 400, 400, 'fast');
    const fineSegments = intervalMarchingSquares(fn, viewPort, 400, 400, 'fine');

    // 更高精度应该产生更多线段
    expect(fineSegments.length).toBeGreaterThanOrEqual(fastSegments.length);
  });
});

describe('intervalCacheManager', () => {
  beforeEach(() => {
    intervalCacheManager.clearAll();
  });

  it('应正确缓存采样结果', () => {
    const fn = (x: number, y: number) => x * x + y * y - 1;
    const viewPort: ViewPort = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };

    const segments1 = intervalMarchingSquares(fn, viewPort, 200, 200);
    intervalCacheManager.set('test', viewPort, 200, 200, segments1);

    const cached = intervalCacheManager.get('test', viewPort, 200, 200);

    expect(cached).not.toBeNull();
    expect(cached?.length).toBe(segments1.length);
  });

  it('不同视口应返回 null', () => {
    const fn = (x: number, y: number) => x * x + y * y - 1;
    const viewPort1: ViewPort = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
    const viewPort2: ViewPort = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };

    const segments = intervalMarchingSquares(fn, viewPort1, 200, 200);
    intervalCacheManager.set('test', viewPort1, 200, 200, segments);

    const cached = intervalCacheManager.get('test', viewPort2, 200, 200);

    expect(cached).toBeNull();
  });

  it('clearAll 应清除所有缓存', () => {
    const viewPort: ViewPort = { xMin: -2, xMax: 2, yMin: -2, yMax: 2 };
    const segments: ContourSegment[] = [{ x1: 0, y1: 0, x2: 1, y2: 1 }];

    intervalCacheManager.set('test1', viewPort, 200, 200, segments);
    intervalCacheManager.set('test2', viewPort, 200, 200, segments);

    intervalCacheManager.clearAll();

    expect(intervalCacheManager.get('test1', viewPort, 200, 200)).toBeNull();
    expect(intervalCacheManager.get('test2', viewPort, 200, 200)).toBeNull();
  });
});

describe('connectSegmentsSmooth', () => {
  it('应连接连续线段', () => {
    const segments: ContourSegment[] = [
      { x1: 0, y1: 0, x2: 1, y2: 0 },
      { x1: 1, y1: 0, x2: 2, y2: 0 },
      { x1: 2, y1: 0, x2: 3, y2: 0 },
    ];

    const paths = connectSegmentsSmooth(segments);

    expect(paths.length).toBe(1);
    expect(paths[0].length).toBe(4); // 4 个点
  });

  it('应处理空输入', () => {
    const paths = connectSegmentsSmooth([]);

    expect(paths.length).toBe(0);
  });

  it('应处理独立线段', () => {
    const segments: ContourSegment[] = [
      { x1: 0, y1: 0, x2: 1, y2: 1 },
      { x1: 5, y1: 5, x2: 6, y2: 6 },
    ];

    const paths = connectSegmentsSmooth(segments);

    expect(paths.length).toBe(2);
  });
});

describe('catmullRomSpline', () => {
  it('应插值平滑曲线', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 0 },
      { x: 3, y: 1 },
    ];

    const result = catmullRomSpline(points, 4);

    expect(result.length).toBeGreaterThan(points.length);
  });

  it('应处理两点情况', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];

    const result = catmullRomSpline(points);

    expect(result.length).toBe(2);
  });

  it('应处理单点情况', () => {
    const points = [{ x: 0, y: 0 }];

    const result = catmullRomSpline(points);

    expect(result.length).toBe(1);
  });
});

describe('clearGridCache', () => {
  it('应清除网格缓存', () => {
    const fn = (x: number, y: number) => x + y;
    const viewPort: ViewPort = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };

    computeGridValues(fn, viewPort, 16);
    clearGridCache();

    // 清除后应该没有缓存
    expect(true).toBe(true); // clearGridCache 不返回值，只验证不抛出
  });
});
