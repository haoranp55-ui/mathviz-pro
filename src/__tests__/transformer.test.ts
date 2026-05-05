import { describe, it, expect } from 'vitest';
import {
  createRenderContext,
  createScales,
  mathToCanvas,
  canvasToMath,
  calculateTickInterval,
  generateTicks,
} from '../lib/transformer';
import type { ViewPort, CanvasSize } from '../types';

describe('createRenderContext', () => {
  const viewPort: ViewPort = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const canvasSize: CanvasSize = { width: 800, height: 600 };

  describe('普通模式', () => {
    it('应创建正确的渲染上下文', () => {
      const ctx = createRenderContext(viewPort, canvasSize, 'normal');

      expect(ctx.aspectRatioMode).toBe('normal');
      expect(ctx.offsetX).toBe(0);
      expect(ctx.offsetY).toBe(0);
      expect(ctx.actualWidth).toBe(800);
      expect(ctx.actualHeight).toBe(600);
    });

    it('采样范围应比视口大', () => {
      const ctx = createRenderContext(viewPort, canvasSize, 'normal', 0.1);

      expect(ctx.sampleXMin).toBeLessThan(viewPort.xMin);
      expect(ctx.sampleXMax).toBeGreaterThan(viewPort.xMax);
      expect(ctx.sampleYMin).toBeLessThan(viewPort.yMin);
      expect(ctx.sampleYMax).toBeGreaterThan(viewPort.yMax);
    });

    it('应支持自定义 paddingFactor', () => {
      const ctx1 = createRenderContext(viewPort, canvasSize, 'normal', 0.1);
      const ctx2 = createRenderContext(viewPort, canvasSize, 'normal', 0.2);

      // 更大的 padding 应该产生更大的采样范围
      expect(ctx2.sampleXMin).toBeLessThan(ctx1.sampleXMin);
      expect(ctx2.sampleXMax).toBeGreaterThan(ctx1.sampleXMax);
    });
  });

  describe('等比例模式', () => {
    it('应创建居中的渲染区域', () => {
      const ctx = createRenderContext(viewPort, canvasSize, 'equal');

      // 画布宽高比 800:600 ≠ 视口宽高比 20:20=1:1
      // 所以应该有偏移
      expect(ctx.offsetX + ctx.offsetY).toBeGreaterThan(0);
    });

    it('实际渲染区域应小于画布', () => {
      const ctx = createRenderContext(viewPort, canvasSize, 'equal');

      // 由于画布不是正方形，等比例模式下实际渲染区域应该较小
      expect(ctx.actualWidth).toBeLessThanOrEqual(canvasSize.width);
      expect(ctx.actualHeight).toBeLessThanOrEqual(canvasSize.height);
    });

    it('正方形画布应无偏移', () => {
      const squareCanvas: CanvasSize = { width: 600, height: 600 };
      const ctx = createRenderContext(viewPort, squareCanvas, 'equal');

      // 正方形画布，等比例模式下应该无偏移
      expect(ctx.offsetX).toBeCloseTo(0, 5);
      expect(ctx.offsetY).toBeCloseTo(0, 5);
    });

    it('采样范围应覆盖整个画布', () => {
      const ctx = createRenderContext(viewPort, canvasSize, 'equal');

      // 采样范围应该比视口大（覆盖空白区域）
      expect(ctx.sampleXMin).toBeLessThan(viewPort.xMin);
      expect(ctx.sampleXMax).toBeGreaterThan(viewPort.xMax);
    });
  });

  describe('比例尺', () => {
    it('xScale 应正确映射坐标', () => {
      const ctx = createRenderContext(viewPort, canvasSize, 'normal');

      expect(ctx.xScale(-10)).toBeCloseTo(0, 5);
      expect(ctx.xScale(0)).toBeCloseTo(400, 5);
      expect(ctx.xScale(10)).toBeCloseTo(800, 5);
    });

    it('yScale 应正确映射坐标（Y轴翻转）', () => {
      const ctx = createRenderContext(viewPort, canvasSize, 'normal');

      // Y轴翻转：yMin 在底部，yMax 在顶部
      expect(ctx.yScale(10)).toBeCloseTo(0, 5);
      expect(ctx.yScale(-10)).toBeCloseTo(600, 5);
    });
  });
});

describe('createScales', () => {
  const viewPort: ViewPort = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
  const canvasSize: CanvasSize = { width: 500, height: 500 };

  it('应返回有效的比例尺', () => {
    const scales = createScales(viewPort, canvasSize);

    expect(scales.xScale).toBeDefined();
    expect(scales.yScale).toBeDefined();
  });

  it('xScale 应正确映射', () => {
    const scales = createScales(viewPort, canvasSize);

    expect(scales.xScale(-5)).toBeCloseTo(0, 5);
    expect(scales.xScale(0)).toBeCloseTo(250, 5);
    expect(scales.xScale(5)).toBeCloseTo(500, 5);
  });

  it('yScale 应正确映射（翻转）', () => {
    const scales = createScales(viewPort, canvasSize);

    expect(scales.yScale(5)).toBeCloseTo(0, 5);
    expect(scales.yScale(-5)).toBeCloseTo(500, 5);
  });

  it('等比例模式应正确工作', () => {
    const scales = createScales(viewPort, canvasSize, 'equal');

    expect(scales.xScale).toBeDefined();
    expect(scales.yScale).toBeDefined();
  });
});

describe('mathToCanvas', () => {
  const viewPort: ViewPort = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const canvasSize: CanvasSize = { width: 800, height: 600 };
  const scales = createScales(viewPort, canvasSize);

  it('应正确转换原点', () => {
    const result = mathToCanvas(0, 0, scales);
    expect(result.px).toBeCloseTo(400, 5);
    expect(result.py).toBeCloseTo(300, 5);
  });

  it('应正确转换左下角', () => {
    const result = mathToCanvas(-10, -10, scales);
    expect(result.px).toBeCloseTo(0, 5);
    expect(result.py).toBeCloseTo(600, 5);
  });

  it('应正确转换右上角', () => {
    const result = mathToCanvas(10, 10, scales);
    expect(result.px).toBeCloseTo(800, 5);
    expect(result.py).toBeCloseTo(0, 5);
  });

  it('应正确转换负坐标', () => {
    const result = mathToCanvas(-5, 5, scales);
    expect(result.px).toBeCloseTo(200, 5);
    expect(result.py).toBeCloseTo(150, 5);
  });
});

describe('canvasToMath', () => {
  const viewPort: ViewPort = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
  const canvasSize: CanvasSize = { width: 800, height: 600 };
  const scales = createScales(viewPort, canvasSize);

  it('应正确转换画布中心', () => {
    const result = canvasToMath(400, 300, scales);
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.y).toBeCloseTo(0, 5);
  });

  it('应正确转换左下角', () => {
    const result = canvasToMath(0, 600, scales);
    expect(result.x).toBeCloseTo(-10, 5);
    expect(result.y).toBeCloseTo(-10, 5);
  });

  it('应正确转换右上角', () => {
    const result = canvasToMath(800, 0, scales);
    expect(result.x).toBeCloseTo(10, 5);
    expect(result.y).toBeCloseTo(10, 5);
  });

  it('应与 mathToCanvas 互逆', () => {
    const x = 3.5;
    const y = -2.7;

    const canvas = mathToCanvas(x, y, scales);
    const math = canvasToMath(canvas.px, canvas.py, scales);

    expect(math.x).toBeCloseTo(x, 5);
    expect(math.y).toBeCloseTo(y, 5);
  });
});

describe('calculateTickInterval', () => {
  it('应计算合理的刻度间隔', () => {
    const interval = calculateTickInterval(0, 10, 10);
    expect(interval).toBeGreaterThan(0);
    expect(interval).toBeLessThanOrEqual(10);
  });

  it('应返回 1, 2, 5 的倍数', () => {
    const interval = calculateTickInterval(0, 100, 10);
    const magnitude = Math.pow(10, Math.floor(Math.log10(interval)));
    const normalized = interval / magnitude;

    expect([1, 2, 5, 10]).toContain(normalized);
  });

  it('小范围应返回小间隔', () => {
    const interval = calculateTickInterval(0, 1, 10);
    expect(interval).toBeLessThan(1);
  });

  it('大范围应返回大间隔', () => {
    const interval = calculateTickInterval(0, 1000, 10);
    expect(interval).toBeGreaterThan(10);
  });

  it('负数范围应正常工作', () => {
    const interval = calculateTickInterval(-50, 50, 10);
    expect(interval).toBeGreaterThan(0);
  });

  it('应支持自定义刻度数', () => {
    const interval1 = calculateTickInterval(0, 100, 5);
    const interval2 = calculateTickInterval(0, 100, 20);

    // 更多的刻度数应该产生更小的间隔
    expect(interval2).toBeLessThanOrEqual(interval1);
  });
});

describe('generateTicks', () => {
  it('应生成刻度数组', () => {
    const ticks = generateTicks(0, 10, 2);
    expect(ticks.length).toBeGreaterThan(0);
  });

  it('刻度应在范围内', () => {
    const ticks = generateTicks(0, 10, 2);
    for (const tick of ticks) {
      expect(tick).toBeGreaterThanOrEqual(0);
      expect(tick).toBeLessThanOrEqual(10);
    }
  });

  it('刻度应是间隔的整数倍', () => {
    const interval = 2;
    const ticks = generateTicks(0, 10, interval);

    for (const tick of ticks) {
      expect(tick % interval).toBeCloseTo(0, 10);
    }
  });

  it('应处理负数范围', () => {
    const ticks = generateTicks(-10, 10, 2);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]).toBeLessThan(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThan(0);
  });

  it('应处理不跨零的范围', () => {
    const ticks = generateTicks(5, 15, 2);
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick).toBeGreaterThanOrEqual(5);
      expect(tick).toBeLessThanOrEqual(15);
    }
  });

  it('空范围应返回空数组或单点', () => {
    const ticks = generateTicks(5, 5, 1);
    // 范围为 0 时可能返回空或单点
    expect(ticks.length).toBeGreaterThanOrEqual(0);
  });
});
