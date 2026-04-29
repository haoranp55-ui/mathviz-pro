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
