// src/store/useAppStore.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  ViewPort,
  ParsedFunction,
  HoverPoint,
  InteractionState,
  KeyPoint,
} from '../types';
import {
  DEFAULT_VIEWPORT,
  FUNCTION_COLORS,
} from '../types';
import { parseExpression } from '../lib/parser';

interface AppState {
  // 函数列表
  functions: ParsedFunction[];

  // 视口状态
  viewPort: ViewPort;

  // 交互状态
  interaction: InteractionState;

  // 显示设置
  showGrid: boolean;
  sampleCount: number;

  // 关键点列表
  keyPoints: KeyPoint[];

  // 悬停的关键点
  hoverKeyPoint: KeyPoint | null;

  // 显示关键点开关
  showKeyPoints: boolean;

  // 选中计算的函数 ID
  selectedFunctionId: string | null;

  // 输入的 x 值
  evaluateX: number;

  // Actions
  addFunction: (expression: string) => void;
  removeFunction: (id: string) => void;
  toggleFunctionVisibility: (id: string) => void;
  updateFunctionExpression: (id: string, expression: string) => void;
  setViewPort: (vp: Partial<ViewPort>) => void;
  setHoverPoint: (point: HoverPoint | null) => void;
  setDragging: (isDragging: boolean, dragStart?: { x: number; y: number }) => void;
  resetView: () => void;
  toggleGrid: () => void;
  setSampleCount: (count: number) => void;
  setKeyPoints: (functionId: string, points: KeyPoint[]) => void;
  clearKeyPoints: (functionId: string) => void;
  setHoverKeyPoint: (kp: KeyPoint | null) => void;
  toggleKeyPoints: () => void;
  setSelectedFunction: (id: string | null) => void;
  setEvaluateX: (x: number) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  functions: [],
  viewPort: { ...DEFAULT_VIEWPORT },
  interaction: {
    hoverPoint: null,
    isDragging: false,
    dragStart: null,
  },
  showGrid: true,
  sampleCount: 1000,
  keyPoints: [],
  hoverKeyPoint: null,
  showKeyPoints: true,
  selectedFunctionId: null,
  evaluateX: 0,

  addFunction: (expression: string) => {
    const { functions } = get();
    const colorIndex = functions.length % FUNCTION_COLORS.length;
    const color = FUNCTION_COLORS[colorIndex];

    const result = parseExpression(expression);

    if (result instanceof Error) {
      // 如果解析失败，添加带错误的函数
      const errorFn: ParsedFunction = {
        id: uuidv4(),
        expression,
        compiled: () => NaN,
        color,
        visible: true,
        error: result.message,
      };
      set({ functions: [...functions, errorFn] });
    } else {
      set({ functions: [...functions, { ...result, id: uuidv4(), color, visible: true }] });
    }
  },

  removeFunction: (id: string) => {
    const { functions, keyPoints, selectedFunctionId } = get();
    set({
      functions: functions.filter(f => f.id !== id),
      keyPoints: keyPoints.filter(kp => kp.functionId !== id),
      selectedFunctionId: selectedFunctionId === id ? null : selectedFunctionId,
    });
  },

  toggleFunctionVisibility: (id: string) => {
    set({
      functions: get().functions.map(f =>
        f.id === id ? { ...f, visible: !f.visible } : f
      ),
    });
  },

  updateFunctionExpression: (id: string, expression: string) => {
    const { functions } = get();
    const result = parseExpression(expression);
    const fn = functions.find(f => f.id === id);

    if (!fn) return;

    if (result instanceof Error) {
      set({
        functions: functions.map(f =>
          f.id === id ? { ...f, expression, error: result.message } : f
        ),
      });
    } else {
      set({
        functions: functions.map(f =>
          f.id === id ? { ...f, ...result, expression, error: undefined } : f
        ),
      });
    }
  },

  setViewPort: (vp: Partial<ViewPort>) => {
    set({ viewPort: { ...get().viewPort, ...vp } });
  },

  setHoverPoint: (point: HoverPoint | null) => {
    set({ interaction: { ...get().interaction, hoverPoint: point } });
  },

  setDragging: (isDragging: boolean, dragStart?: { x: number; y: number }) => {
    set({
      interaction: {
        ...get().interaction,
        isDragging,
        dragStart: dragStart || null,
      },
    });
  },

  resetView: () => {
    set({ viewPort: { ...DEFAULT_VIEWPORT } });
  },

  toggleGrid: () => {
    set({ showGrid: !get().showGrid });
  },

  setSampleCount: (count: number) => {
    set({ sampleCount: count });
  },

  setKeyPoints: (functionId: string, points: KeyPoint[]) => {
    const { keyPoints } = get();
    const filtered = keyPoints.filter(kp => kp.functionId !== functionId);
    set({ keyPoints: [...filtered, ...points] });
  },

  clearKeyPoints: (functionId: string) => {
    set({ keyPoints: get().keyPoints.filter(kp => kp.functionId !== functionId) });
  },

  setHoverKeyPoint: (kp: KeyPoint | null) => {
    set({ hoverKeyPoint: kp });
  },

  toggleKeyPoints: () => {
    set({ showKeyPoints: !get().showKeyPoints });
  },

  setSelectedFunction: (id: string | null) => {
    set({ selectedFunctionId: id });
  },

  setEvaluateX: (x: number) => {
    set({ evaluateX: x });
  },
}));
