// src/types/index.ts

export interface ViewPort {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface ParsedFunction {
  id: string;
  expression: string;
  compiled: (x: number) => number;
  color: string;
  visible: boolean;
  showDerivative?: boolean; // 是否显示导数曲线
  error?: string;
}

export interface SampledPoints {
  x: Float64Array;
  y: Float64Array;
}

export interface SampleOptions {
  xMin: number;
  xMax: number;
  sampleCount: number;
}

export interface HoverPoint {
  x: number;
  y: number;
  functionId: string;
}

export interface InteractionState {
  hoverPoint: HoverPoint | null;
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export const DEFAULT_VIEWPORT: ViewPort = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

export const FUNCTION_COLORS = [
  '#60A5FA', '#34D399', '#F472B6', '#FBBF24',
  '#A78BFA', '#F87171', '#22D3EE', '#FB923C',
] as const;

export type FunctionColor = typeof FUNCTION_COLORS[number];

// 关键点类型
export type KeyPointType = 'zero' | 'maximum' | 'minimum' | 'inflection' | 'discontinuity';

export interface KeyPoint {
  type: KeyPointType;
  x: number;
  y: number;          // NaN 表示不连续点
  functionId: string;
}

export interface KeyPointStyle {
  color: string;
  marker: string;
  label: string;
}

export const KEY_POINT_STYLES: Record<KeyPointType, KeyPointStyle> = {
  zero:          { color: '#EF4444', marker: '●', label: '零点' },
  maximum:       { color: '#3B82F6', marker: '▲', label: '极大值' },
  minimum:       { color: '#10B981', marker: '▼', label: '极小值' },
  inflection:    { color: '#F59E0B', marker: '◆', label: '拐点' },
  discontinuity: { color: '#8B5CF6', marker: '║', label: '不连续点' },
};
