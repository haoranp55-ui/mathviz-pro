// src/types/index.ts

// 采样精度挡位
export type SamplePreset = 'fast' | 'normal' | 'fine' | 'ultra';

// 纵横比模式
export type AspectRatioMode = 'normal' | 'equal';

// 普通函数采样预设
export const SAMPLE_PRESETS: Record<SamplePreset, { label: string; multiplier: number; maxCount: number }> = {
  fast: { label: '快速', multiplier: 1, maxCount: 10000 },
  normal: { label: '标准', multiplier: 2, maxCount: 30000 },
  fine: { label: '精细', multiplier: 3, maxCount: 60000 },
  ultra: { label: '极致', multiplier: 5, maxCount: 100000 },
};

// 隐函数采样预设
// maxDepth: 递归细分深度，越大越精细
// minPixelSize: 最小像素大小，越小越精细
// cellMultiplier: 初始单元格乘数，越大越粗略但更快
export const IMPLICIT_SAMPLE_PRESETS: Record<SamplePreset, { label: string; maxDepth: number; minPixelSize: number; cellMultiplier: number }> = {
  fast: { label: '快速', maxDepth: 3, minPixelSize: 4, cellMultiplier: 15 },
  normal: { label: '标准', maxDepth: 5, minPixelSize: 2, cellMultiplier: 10 },
  fine: { label: '精细', maxDepth: 6, minPixelSize: 1, cellMultiplier: 8 },
  ultra: { label: '极致', maxDepth: 7, minPixelSize: 1, cellMultiplier: 5 },
};

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
  showKeyPoints?: boolean;  // 是否显示关键点标注
  error?: string;
  markedPoints?: MarkedPoint[]; // 用户标记的点
}

// 参数定义
export interface Parameter {
  name: string;           // 参数名，如 'a', 'B'
  defaultValue: number;   // 默认值
  min: number;            // 下限
  max: number;            // 上限
  step: number;           // 步长
  currentValue: number;   // 当前值
}

// 参数化函数
export interface ParametricFunction {
  id: string;
  expression: string;
  compiled: (x: number, params: Record<string, number>) => number;
  color: string;
  visible: boolean;
  showDerivative?: boolean;
  showKeyPoints?: boolean;  // 是否显示关键点标注
  error?: string;

  // 参数化特有
  parameters: Parameter[];   // 参数列表（最多3个）
  xAxisVar: string;          // 横轴变量，默认 'x'
  yAxisVar: string;          // 竖轴变量，默认 'y'
  markedPoints?: MarkedPoint[]; // 用户标记的点
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

// 用户标记的点（用于函数上标注特定点及其导数）
export interface MarkedPoint {
  id: string;
  x: number;
  y: number;       // 计算得到的 y 值
  derivative: number; // 该点的导数值
}

// ============================================
// 隐函数支持 F(x,y) = 0
// ============================================

export interface ImplicitFunction {
  id: string;
  expression: string;           // 原始表达式 "x^2 + y^2 = 1"
  compiled: (x: number, y: number, params?: Record<string, number>) => number;  // 返回 F(x,y) 值
  color: string;
  visible: boolean;
  showKeyPoints?: boolean;      // 是否显示关键点标注
  error?: string;
  parameters: Parameter[];      // 支持参数，如 a, b
  transformedExpression?: string;  // 自动转换后的表达式（如 tan 转换）
}

// 等值线段（Marching Squares 输出）
export interface ContourSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ============================================
// 积分支持
// ============================================

export type IntegralType = 'definite' | 'indefinite';

export interface IntegralConfig {
  id: string;
  functionId: string;           // 关联的函数 ID
  functionType: 'normal' | 'parametric';  // 函数类型
  type: IntegralType;
  lowerBound: number;           // 定积分下限
  upperBound: number;           // 定积分上限
  showAreaFill: boolean;        // 显示填充区域
  showIntegralCurve: boolean;   // 显示积分曲线（不定积分）
  color: string;                // 填充颜色
}

export interface IntegralResult {
  configId: string;
  value: number;                // 定积分数值结果
  antiderivative?: (x: number) => number;  // 不定积分函数
}

// ============================================
// 微分方程系统
// ============================================

export type SystemType = 'function' | 'differential';

export interface DifferentialEquation {
  id: string;
  expression: string;           // "dy/dx = x^2 + y" 或 "y' = sin(x)*y"
  compiled: (x: number, y: number) => number;  // dy/dx = f(x, y)
  color: string;
  visible: boolean;
  error?: string;

  // 初始条件
  initialX: number;
  initialY: number;

  // 求解参数
  method: 'euler' | 'runge-kutta';
  stepSize: number;
  xMin: number;
  xMax: number;
}

export interface SolutionCurve {
  equationId: string;
  points: SampledPoints;        // 解曲线的采样点
}

// 侧边栏 Tab 类型（扩展）
export type SidebarTab = 'normal' | 'parametric' | 'implicit' | 'integral';
