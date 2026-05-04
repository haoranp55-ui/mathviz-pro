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
  PolarFunction,
  SidebarTab,
  ThreeDFunction,
  PlotSystemType,
} from '../types';
import {
  DEFAULT_VIEWPORT,
  FUNCTION_COLORS,
  THREE_D_MAX_FUNCTIONS,
  THREE_D_PRESET_RESOLUTION,
} from '../types';
import { parseExpression, parseParametricExpression } from '../lib/parser';
import { parseImplicitExpression } from '../lib/implicitParser';
import { parsePolarExpression } from '../lib/polarParser';
import { parseThreeDExpression } from '../lib/threeDParser';
import { updateParameterValue } from '../lib/paramParser';
import { numericalDerivative } from '../lib/derivative';

interface AppState {
  // 函数列表
  functions: ParsedFunction[];

  // 参数化函数列表（最多3个）
  parametricFunctions: ParametricFunction[];

  // 隐函数列表（最多3个）
  implicitFunctions: ImplicitFunction[];

  // 极坐标函数列表（最多3个）
  polarFunctions: PolarFunction[];

  // 系统类型: 2D 或 3D
  systemType: PlotSystemType;

  // 3D 函数列表（最多6个）
  threeDFunctions: ThreeDFunction[];

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
  updateParametricExpression: (id: string, expression: string) => void;

  // 隐函数 Actions
  addImplicitFunction: (expression: string) => void;
  removeImplicitFunction: (id: string) => void;
  toggleImplicitVisibility: (id: string) => void;
  toggleImplicitKeyPoints: (id: string) => void;
  toggleImplicitGPURendering: (id: string) => void;  // 函数级别 GPU 开关
  updateImplicitParameter: (functionId: string, paramName: string, value: number) => void;
  updateImplicitExpression: (id: string, expression: string) => void;

  // 极坐标函数 Actions
  addPolarFunction: (expression: string) => void;
  removePolarFunction: (id: string) => void;
  togglePolarVisibility: (id: string) => void;
  togglePolarKeyPoints: (id: string) => void;
  togglePolarGPURendering: (id: string) => void;  // 函数级别 GPU 开关
  updatePolarParameter: (functionId: string, paramName: string, value: number) => void;
  updatePolarThetaRange: (functionId: string, thetaMin: number, thetaMax: number) => void;
  updatePolarExpression: (id: string, expression: string) => void;

  // 滑钮状态（用于优化隐函数渲染性能）
  isSliderActive: boolean;
  setSliderActive: (active: boolean) => void;

  // 3D 渲染版本号（用于外部触发重渲染，如重置视图）
  threeDVersion: number;

  // 3D 函数 Actions
  setSystemType: (systemType: PlotSystemType) => void;
  addThreeDFunction: (expression: string) => void;
  removeThreeDFunction: (id: string) => void;
  toggleThreeDVisibility: (id: string) => void;
  toggleWireframe: (id: string) => void;
  updateThreeDResolution: (id: string, resolution: number) => void;
  updateThreeDExpression: (id: string, expression: string) => void;
  bumpThreeDVersion: () => void;

  // 标记点 Actions（普通函数和参数化函数共用）
  addMarkedPoint: (functionId: string, x: number, isParametric: boolean) => void;
  removeMarkedPoint: (functionId: string, pointId: string, isParametric: boolean) => void;
  updateMarkedPoint: (functionId: string, pointId: string, x: number, isParametric: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  functions: [],
  parametricFunctions: [],
  implicitFunctions: [],
  polarFunctions: [],
  systemType: '2d',
  threeDFunctions: [],
  threeDVersion: 0,
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

  addFunction: (expression: string) => {
    const { functions } = get();
    if (functions.length >= 10) return; // 限制最大数量
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
      // 保留原有颜色和 ID
      const { color, id: _, ...restResult } = result;
      set({
        functions: functions.map(f =>
          f.id === id ? { ...f, ...restResult, expression, error: undefined } : f
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
    const newRes = THREE_D_PRESET_RESOLUTION[preset];
    set({
      samplePreset: preset,
      // 同步 3D 函数分辨率
      threeDFunctions: get().threeDFunctions.map(f => ({ ...f, resolution: newRes })),
    });
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

    try {
      // 创建下载链接
      const dataUrl = canvasRef.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to export image:', e);
      alert('导出图片失败，请重试');
    }
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
    _functionId: string,
    paramName: string,
    field: 'min' | 'max' | 'step' | 'defaultValue',
    value: number
  ) => {
    // 参数关联：更新所有函数中同名参数的范围配置
    set({
      parametricFunctions: get().parametricFunctions.map(fn => {
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return {
          ...fn,
          parameters: fn.parameters.map(p => {
            if (p.name !== paramName) return p;
            const updated = { ...p, [field]: value };
            // 范围变更时夹紧 currentValue
            if (field === 'min' || field === 'max') {
              updated.currentValue = Math.max(updated.min, Math.min(updated.max, updated.currentValue));
            }
            return updated;
          }),
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

  updateParametricExpression: (id: string, expression: string) => {
    const { parametricFunctions } = get();
    const result = parseParametricExpression(expression);
    const fn = parametricFunctions.find(f => f.id === id);

    if (!fn) return;

    if (result instanceof Error) {
      set({
        parametricFunctions: parametricFunctions.map(f =>
          f.id === id ? { ...f, expression, error: result.message } : f
        ),
      });
    } else {
      // 保留原有颜色和 ID
      const { color, id: _, ...restResult } = result;
      set({
        parametricFunctions: parametricFunctions.map(f =>
          f.id === id ? { ...f, ...restResult, expression, error: undefined } : f
        ),
      });
    }
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
    const { implicitFunctions, keyPoints } = get();
    set({
      implicitFunctions: implicitFunctions.filter(f => f.id !== id),
      keyPoints: keyPoints.filter(kp => kp.functionId !== id),
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

  toggleImplicitGPURendering: (id: string) => {
    set({
      implicitFunctions: get().implicitFunctions.map(f =>
        f.id === id ? { ...f, useGPURendering: !f.useGPURendering } : f
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

  updateImplicitExpression: (id: string, expression: string) => {
    const { implicitFunctions } = get();
    const result = parseImplicitExpression(expression);
    const fn = implicitFunctions.find(f => f.id === id);

    if (!fn) return;

    if (result instanceof Error) {
      set({
        implicitFunctions: implicitFunctions.map(f =>
          f.id === id ? { ...f, expression, error: result.message } : f
        ),
      });
    } else {
      // 保留原有颜色和 ID
      const { color, id: _, ...restResult } = result;
      set({
        implicitFunctions: implicitFunctions.map(f =>
          f.id === id ? { ...f, ...restResult, expression, error: undefined } : f
        ),
      });
    }
  },

  // 极坐标函数 Actions
  addPolarFunction: (expression: string) => {
    const { polarFunctions } = get();

    // 检查数量限制
    if (polarFunctions.length >= 3) {
      return; // 最多3个
    }

    const colorIndex = polarFunctions.length % FUNCTION_COLORS.length;
    const color = FUNCTION_COLORS[colorIndex];

    const result = parsePolarExpression(expression);

    if (result instanceof Error) {
      const errorFn: PolarFunction = {
        id: uuidv4(),
        expression,
        compiled: () => NaN,
        color,
        visible: true,
        error: result.message,
        parameters: [],
        thetaMin: 0,
        thetaMax: 2 * Math.PI,
        thetaSteps: 360,
      };
      set({ polarFunctions: [...polarFunctions, errorFn] });
    } else {
      set({
        polarFunctions: [
          ...polarFunctions,
          { ...result, id: uuidv4(), color, visible: true },
        ],
      });
    }
  },

  removePolarFunction: (id: string) => {
    const { polarFunctions, keyPoints } = get();
    set({
      polarFunctions: polarFunctions.filter(f => f.id !== id),
      keyPoints: keyPoints.filter(kp => kp.functionId !== id),
    });
  },

  togglePolarVisibility: (id: string) => {
    set({
      polarFunctions: get().polarFunctions.map(f =>
        f.id === id ? { ...f, visible: !f.visible } : f
      ),
    });
  },

  togglePolarKeyPoints: (id: string) => {
    set({
      polarFunctions: get().polarFunctions.map(f =>
        f.id === id ? { ...f, showKeyPoints: !f.showKeyPoints } : f
      ),
    });
  },

  togglePolarGPURendering: (id: string) => {
    set({
      polarFunctions: get().polarFunctions.map(f =>
        f.id === id ? { ...f, useGPURendering: !f.useGPURendering } : f
      ),
    });
  },

  updatePolarParameter: (functionId: string, paramName: string, value: number) => {
    set({
      polarFunctions: get().polarFunctions.map(fn => {
        if (fn.id !== functionId) return fn;
        return {
          ...fn,
          parameters: updateParameterValue(fn.parameters, paramName, value),
        };
      }),
    });
  },

  updatePolarThetaRange: (functionId: string, thetaMin: number, thetaMax: number) => {
    set({
      polarFunctions: get().polarFunctions.map(fn => {
        if (fn.id !== functionId) return fn;
        return {
          ...fn,
          thetaMin,
          thetaMax,
        };
      }),
    });
  },

  updatePolarExpression: (id: string, expression: string) => {
    const { polarFunctions } = get();
    const result = parsePolarExpression(expression);
    const fn = polarFunctions.find(f => f.id === id);

    if (!fn) return;

    if (result instanceof Error) {
      set({
        polarFunctions: polarFunctions.map(f =>
          f.id === id ? { ...f, expression, error: result.message } : f
        ),
      });
    } else {
      // 保留原有颜色、ID 和 theta 范围
      const { color, id: _, thetaMin, thetaMax, ...restResult } = result;
      set({
        polarFunctions: polarFunctions.map(f =>
          f.id === id ? { ...f, ...restResult, expression, error: undefined } : f
        ),
      });
    }
  },

  bumpThreeDVersion: () => {
    set({ threeDVersion: get().threeDVersion + 1 });
  },

  setSliderActive: (active: boolean) => {
    set({ isSliderActive: active });
  },

  // 3D 函数 Actions
  setSystemType: (systemType: PlotSystemType) => {
    set({ systemType });
  },

  addThreeDFunction: (expression: string) => {
    const { threeDFunctions, samplePreset } = get();
    if (threeDFunctions.length >= THREE_D_MAX_FUNCTIONS) return;

    const colorIndex = threeDFunctions.length % FUNCTION_COLORS.length;
    const color = FUNCTION_COLORS[colorIndex];
    const defaultRes = THREE_D_PRESET_RESOLUTION[samplePreset];

    const result = parseThreeDExpression(expression);

    if (result instanceof Error) {
      const errorFn: ThreeDFunction = {
        id: uuidv4(),
        expression,
        compiled: () => NaN,
        color,
        visible: true,
        wireframe: false,
        resolution: defaultRes,
        error: result.message,
      };
      set({ threeDFunctions: [...threeDFunctions, errorFn] });
    } else {
      set({
        threeDFunctions: [
          ...threeDFunctions,
          {
            ...result,
            expression,
            id: uuidv4(),
            color,
            visible: true,
            wireframe: false,
            resolution: defaultRes,
          },
        ],
      });
    }
  },

  removeThreeDFunction: (id: string) => {
    set({
      threeDFunctions: get().threeDFunctions.filter(f => f.id !== id),
    });
  },

  toggleThreeDVisibility: (id: string) => {
    set({
      threeDFunctions: get().threeDFunctions.map(f =>
        f.id === id ? { ...f, visible: !f.visible } : f,
      ),
    });
  },

  toggleWireframe: (id: string) => {
    set({
      threeDFunctions: get().threeDFunctions.map(f =>
        f.id === id ? { ...f, wireframe: !f.wireframe } : f,
      ),
    });
  },

  updateThreeDResolution: (id: string, resolution: number) => {
    set({
      threeDFunctions: get().threeDFunctions.map(f =>
        f.id === id ? { ...f, resolution } : f,
      ),
    });
  },

  updateThreeDExpression: (id: string, expression: string) => {
    const { threeDFunctions } = get();
    const result = parseThreeDExpression(expression);
    const fn = threeDFunctions.find(f => f.id === id);

    if (!fn) return;

    if (result instanceof Error) {
      set({
        threeDFunctions: threeDFunctions.map(f =>
          f.id === id ? { ...f, expression, error: result.message } : f,
        ),
      });
    } else {
      const { compiled } = result;
      set({
        threeDFunctions: threeDFunctions.map(f =>
          f.id === id ? { ...f, compiled, expression, error: undefined } : f,
        ),
      });
    }
  },
}));
