// src/store/useAppStore.ts
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  ViewPort,
  ParsedFunction,
  HoverPoint,
  InteractionState,
  KeyPoint,
  ParametricFunction,
  MarkedPoint,
  SamplePreset,
  AspectRatioMode,
  ImplicitFunction,
  SidebarTab,
} from '../types';
import {
  DEFAULT_VIEWPORT,
  FUNCTION_COLORS,
} from '../types';
import { parseExpression, parseParametricExpression } from '../lib/parser';
import { parseImplicitExpression } from '../lib/implicitParser';
import { updateParameterValue } from '../lib/paramParser';
import { numericalDerivative } from '../lib/derivative';

interface AppState {
  // 函数列表
  functions: ParsedFunction[];

  // 参数化函数列表（最多3个）
  parametricFunctions: ParametricFunction[];

  // 隐函数列表（最多3个）
  implicitFunctions: ImplicitFunction[];

  // 当前侧边栏 Tab
  sidebarTab: SidebarTab;

  // 视口状态
  viewPort: ViewPort;

  // 交互状态
  interaction: InteractionState;

  // 显示设置
  showGrid: boolean;
  samplePreset: SamplePreset;
  aspectRatioMode: AspectRatioMode;

  // 渲染模式
  useGPURendering: boolean;

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

  // Canvas 引用（用于导出）
  canvasRef: HTMLCanvasElement | null;

  // Actions
  addFunction: (expression: string) => void;
  removeFunction: (id: string) => void;
  toggleFunctionVisibility: (id: string) => void;
  toggleFunctionDerivative: (id: string) => void;
  toggleFunctionKeyPoints: (id: string) => void;
  updateFunctionExpression: (id: string, expression: string) => void;
  setViewPort: (vp: Partial<ViewPort>) => void;
  setHoverPoint: (point: HoverPoint | null) => void;
  setDragging: (isDragging: boolean, dragStart?: { x: number; y: number }) => void;
  resetView: () => void;
  toggleGrid: () => void;
  setSamplePreset: (preset: SamplePreset) => void;
  setAspectRatioMode: (mode: AspectRatioMode) => void;
  setKeyPoints: (functionId: string, points: KeyPoint[]) => void;
  clearKeyPoints: (functionId: string) => void;
  setHoverKeyPoint: (kp: KeyPoint | null) => void;
  toggleKeyPoints: () => void;
  setSelectedFunction: (id: string | null) => void;
  setEvaluateX: (x: number) => void;
  setCanvasRef: (canvas: HTMLCanvasElement | null) => void;
  exportImage: (filename?: string) => void;

  // 参数化函数 Actions
  setSidebarTab: (tab: SidebarTab) => void;
  addParametricFunction: (expression: string) => void;
  removeParametricFunction: (id: string) => void;
  updateParameter: (functionId: string, paramName: string, value: number) => void;
  toggleParametricVisibility: (id: string) => void;
  toggleParametricDerivative: (id: string) => void;
  toggleParametricKeyPoints: (id: string) => void;
  updateParametricParameter: (functionId: string, paramName: string, field: 'min' | 'max' | 'step' | 'defaultValue', value: number) => void;

  // 隐函数 Actions
  addImplicitFunction: (expression: string) => void;
  removeImplicitFunction: (id: string) => void;
  toggleImplicitVisibility: (id: string) => void;
  toggleImplicitKeyPoints: (id: string) => void;
  updateImplicitParameter: (functionId: string, paramName: string, value: number) => void;

  // GPU 渲染
  toggleGPURendering: () => void;

  // 滑钮状态（用于优化隐函数渲染性能）
  isSliderActive: boolean;
  setSliderActive: (active: boolean) => void;

  // 标记点 Actions（普通函数和参数化函数共用）
  addMarkedPoint: (functionId: string, x: number, isParametric: boolean) => void;
  removeMarkedPoint: (functionId: string, pointId: string, isParametric: boolean) => void;
  updateMarkedPoint: (functionId: string, pointId: string, x: number, isParametric: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  functions: [],
  parametricFunctions: [],
  implicitFunctions: [],
  sidebarTab: 'normal',
  viewPort: { ...DEFAULT_VIEWPORT },
  interaction: {
    hoverPoint: null,
    isDragging: false,
    dragStart: null,
  },
  showGrid: true,
  samplePreset: 'normal',
  aspectRatioMode: 'equal',  // 默认等比例，圆显示为正圆
  keyPoints: [],
  hoverKeyPoint: null,
  showKeyPoints: true,
  selectedFunctionId: null,
  evaluateX: 1,
  canvasRef: null,
  isSliderActive: false,
  useGPURendering: false,  // 默认关闭，需要用户手动开启

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

  toggleFunctionDerivative: (id: string) => {
    set({
      functions: get().functions.map(f =>
        f.id === id ? { ...f, showDerivative: !f.showDerivative } : f
      ),
    });
  },

  toggleFunctionKeyPoints: (id: string) => {
    set({
      functions: get().functions.map(f =>
        f.id === id ? { ...f, showKeyPoints: !f.showKeyPoints } : f
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

  setSamplePreset: (preset: SamplePreset) => {
    set({ samplePreset: preset });
  },

  setAspectRatioMode: (mode: AspectRatioMode) => {
    set({ aspectRatioMode: mode });
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

  setCanvasRef: (canvas: HTMLCanvasElement | null) => {
    set({ canvasRef: canvas });
  },

  exportImage: (filename: string = 'mathviz-export.png') => {
    const { canvasRef } = get();
    if (!canvasRef) {
      console.error('Canvas ref not set');
      return;
    }

    // 创建下载链接
    const dataUrl = canvasRef.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  },

  // 参数化函数 Actions
  setSidebarTab: (tab: SidebarTab) => {
    set({ sidebarTab: tab });
  },

  addParametricFunction: (expression: string) => {
    const { parametricFunctions } = get();

    // 检查数量限制
    if (parametricFunctions.length >= 3) {
      return; // 最多3个
    }

    const colorIndex = parametricFunctions.length % FUNCTION_COLORS.length;
    const color = FUNCTION_COLORS[colorIndex];

    const result = parseParametricExpression(expression);

    if (result instanceof Error) {
      const errorFn: ParametricFunction = {
        id: uuidv4(),
        expression,
        compiled: () => NaN,
        color,
        visible: true,
        error: result.message,
        parameters: [],
        xAxisVar: 'x',
        yAxisVar: 'y',
      };
      set({ parametricFunctions: [...parametricFunctions, errorFn] });
    } else {
      set({
        parametricFunctions: [
          ...parametricFunctions,
          { ...result, id: uuidv4(), color, visible: true },
        ],
      });
    }
  },

  removeParametricFunction: (id: string) => {
    const { parametricFunctions, keyPoints } = get();
    set({
      parametricFunctions: parametricFunctions.filter(f => f.id !== id),
      keyPoints: keyPoints.filter(kp => kp.functionId !== id),
    });
  },

  updateParameter: (_functionId: string, paramName: string, value: number) => {
    // 参数关联：更新所有函数中同名的参数
    set({
      parametricFunctions: get().parametricFunctions.map(fn => {
        // 检查这个函数是否有同名参数
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return {
          ...fn,
          parameters: updateParameterValue(fn.parameters, paramName, value),
        };
      }),
    });
  },

  toggleParametricVisibility: (id: string) => {
    set({
      parametricFunctions: get().parametricFunctions.map(f =>
        f.id === id ? { ...f, visible: !f.visible } : f
      ),
    });
  },

  toggleParametricDerivative: (id: string) => {
    set({
      parametricFunctions: get().parametricFunctions.map(f =>
        f.id === id ? { ...f, showDerivative: !f.showDerivative } : f
      ),
    });
  },

  updateParametricParameter: (
    functionId: string,
    paramName: string,
    field: 'min' | 'max' | 'step' | 'defaultValue',
    value: number
  ) => {
    set({
      parametricFunctions: get().parametricFunctions.map(fn => {
        if (fn.id !== functionId) return fn;
        return {
          ...fn,
          parameters: fn.parameters.map(p =>
            p.name === paramName ? { ...p, [field]: value } : p
          ),
        };
      }),
    });
  },

  toggleParametricKeyPoints: (id: string) => {
    set({
      parametricFunctions: get().parametricFunctions.map(f =>
        f.id === id ? { ...f, showKeyPoints: !f.showKeyPoints } : f
      ),
    });
  },

  // 标记点 Actions
  addMarkedPoint: (functionId: string, x: number, isParametric: boolean) => {
    const { functions, parametricFunctions } = get();

    if (isParametric) {
      const fn = parametricFunctions.find(f => f.id === functionId);
      if (!fn || fn.error) return;

      // 绑定当前参数值
      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) {
        currentParams[p.name] = p.currentValue;
      }
      const boundFn = (xVal: number) => fn.compiled(xVal, currentParams);
      const y = boundFn(x);
      const derivative = numericalDerivative(boundFn, x);

      const newPoint: MarkedPoint = {
        id: uuidv4(),
        x,
        y: isFinite(y) ? y : NaN,
        derivative: isFinite(derivative) ? derivative : NaN,
      };

      set({
        parametricFunctions: parametricFunctions.map(f =>
          f.id === functionId
            ? { ...f, markedPoints: [...(f.markedPoints || []), newPoint] }
            : f
        ),
      });
    } else {
      const fn = functions.find(f => f.id === functionId);
      if (!fn || fn.error) return;

      const y = fn.compiled(x);
      const derivative = numericalDerivative(fn.compiled, x);

      const newPoint: MarkedPoint = {
        id: uuidv4(),
        x,
        y: isFinite(y) ? y : NaN,
        derivative: isFinite(derivative) ? derivative : NaN,
      };

      set({
        functions: functions.map(f =>
          f.id === functionId
            ? { ...f, markedPoints: [...(f.markedPoints || []), newPoint] }
            : f
        ),
      });
    }
  },

  removeMarkedPoint: (functionId: string, pointId: string, isParametric: boolean) => {
    if (isParametric) {
      set({
        parametricFunctions: get().parametricFunctions.map(f =>
          f.id === functionId
            ? { ...f, markedPoints: (f.markedPoints || []).filter(p => p.id !== pointId) }
            : f
        ),
      });
    } else {
      set({
        functions: get().functions.map(f =>
          f.id === functionId
            ? { ...f, markedPoints: (f.markedPoints || []).filter(p => p.id !== pointId) }
            : f
        ),
      });
    }
  },

  updateMarkedPoint: (functionId: string, pointId: string, x: number, isParametric: boolean) => {
    const { functions, parametricFunctions } = get();

    if (isParametric) {
      const fn = parametricFunctions.find(f => f.id === functionId);
      if (!fn || fn.error) return;

      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) {
        currentParams[p.name] = p.currentValue;
      }
      const boundFn = (xVal: number) => fn.compiled(xVal, currentParams);
      const y = boundFn(x);
      const derivative = numericalDerivative(boundFn, x);

      set({
        parametricFunctions: parametricFunctions.map(f =>
          f.id === functionId
            ? {
                ...f,
                markedPoints: (f.markedPoints || []).map(p =>
                  p.id === pointId
                    ? { ...p, x, y: isFinite(y) ? y : NaN, derivative: isFinite(derivative) ? derivative : NaN }
                    : p
                ),
              }
            : f
        ),
      });
    } else {
      const fn = functions.find(f => f.id === functionId);
      if (!fn || fn.error) return;

      const y = fn.compiled(x);
      const derivative = numericalDerivative(fn.compiled, x);

      set({
        functions: functions.map(f =>
          f.id === functionId
            ? {
                ...f,
                markedPoints: (f.markedPoints || []).map(p =>
                  p.id === pointId
                    ? { ...p, x, y: isFinite(y) ? y : NaN, derivative: isFinite(derivative) ? derivative : NaN }
                    : p
                ),
              }
            : f
        ),
      });
    }
  },

  // 隐函数 Actions
  addImplicitFunction: (expression: string) => {
    const { implicitFunctions } = get();

    // 检查数量限制
    if (implicitFunctions.length >= 3) {
      return; // 最多3个
    }

    const colorIndex = implicitFunctions.length % FUNCTION_COLORS.length;
    const color = FUNCTION_COLORS[colorIndex];

    const result = parseImplicitExpression(expression);

    if (result instanceof Error) {
      const errorFn: ImplicitFunction = {
        id: uuidv4(),
        expression,
        compiled: () => NaN,
        color,
        visible: true,
        error: result.message,
        parameters: [],
      };
      set({ implicitFunctions: [...implicitFunctions, errorFn] });
    } else {
      set({
        implicitFunctions: [
          ...implicitFunctions,
          { ...result, id: uuidv4(), color, visible: true },
        ],
      });
    }
  },

  removeImplicitFunction: (id: string) => {
    set({
      implicitFunctions: get().implicitFunctions.filter(f => f.id !== id),
    });
  },

  toggleImplicitVisibility: (id: string) => {
    set({
      implicitFunctions: get().implicitFunctions.map(f =>
        f.id === id ? { ...f, visible: !f.visible } : f
      ),
    });
  },

  toggleImplicitKeyPoints: (id: string) => {
    set({
      implicitFunctions: get().implicitFunctions.map(f =>
        f.id === id ? { ...f, showKeyPoints: !f.showKeyPoints } : f
      ),
    });
  },

  updateImplicitParameter: (functionId: string, paramName: string, value: number) => {
    set({
      implicitFunctions: get().implicitFunctions.map(fn => {
        if (fn.id !== functionId) return fn;
        return {
          ...fn,
          parameters: updateParameterValue(fn.parameters, paramName, value),
        };
      }),
    });
  },

  toggleGPURendering: () => {
    set({ useGPURendering: !get().useGPURendering });
  },

  setSliderActive: (active: boolean) => {
    set({ isSliderActive: active });
  },
}));
