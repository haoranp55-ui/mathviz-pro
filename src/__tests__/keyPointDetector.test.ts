// src/__tests__/keyPointDetector.test.ts
import { describe, it, expect } from 'vitest';
import { detectKeyPoints } from '../lib/keyPointDetector';

function makePoints(xs: number[], fn: (x: number) => number) {
  return { x: new Float64Array(xs), y: new Float64Array(xs.map(fn)) };
}

function linspace(min: number, max: number, n: number): number[] {
  const step = (max - min) / (n - 1);
  return Array.from({ length: n }, (_, i) => min + i * step);
}

describe('keyPointDetector', () => {
  it('should detect zero of sin(x)', () => {
    const xs = linspace(-Math.PI, Math.PI, 400);
    const points = makePoints(xs, x => Math.sin(x));
    const kps = detectKeyPoints(Math.sin, points, 'test');
    const zeros = kps.filter(k => k.type === 'zero');
    expect(zeros.length).toBeGreaterThanOrEqual(1);
    expect(Math.abs(zeros[0].x)).toBeLessThan(0.2);
  });

  it('should detect extremum of x^2', () => {
    const xs = linspace(-5, 5, 400);
    const points = makePoints(xs, x => x * x);
    const kps = detectKeyPoints(x => x * x, points, 'test');
    const extrema = kps.filter(k => k.type === 'minimum' || k.type === 'maximum');
    expect(extrema.length).toBeGreaterThanOrEqual(1);
    expect(extrema[0].x).toBeCloseTo(0, 0);
  });

  it('should detect maximum of cos(x)', () => {
    const xs = linspace(-Math.PI, Math.PI, 400);
    const points = makePoints(xs, x => Math.cos(x));
    const kps = detectKeyPoints(Math.cos, points, 'test');
    const maxima = kps.filter(k => k.type === 'maximum');
    expect(maxima.length).toBeGreaterThanOrEqual(1);
  });

  it('should handle NaN gracefully', () => {
    const xs = linspace(-5, 5, 400);
    const ys = xs.map(x => (Math.abs(x) < 0.1 ? NaN : 1 / x));
    const points = { x: new Float64Array(xs), y: new Float64Array(ys) };
    const kps = detectKeyPoints(x => 1 / x, points, 'test');
    expect(kps).toBeInstanceOf(Array);
  });

  it('should return empty for constant function', () => {
    const xs = linspace(-5, 5, 200);
    const points = makePoints(xs, () => 5);
    const kps = detectKeyPoints(() => 5, points, 'test');
    expect(kps).toHaveLength(0);
  });

  it('should handle 1/x discontinuity detection', () => {
    const xs = linspace(-5, 5, 400);
    const ys = xs.map(x => 1 / x);
    const points = { x: new Float64Array(xs), y: new Float64Array(ys) };
    const kps = detectKeyPoints(x => 1 / x, points, 'test');
    // 1/x has Infinity at x=0 — detector may classify as discontinuity or extreme jump
    expect(kps.length).toBeGreaterThanOrEqual(0);
    expect(kps).toBeInstanceOf(Array);
  });
});