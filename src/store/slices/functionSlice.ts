// src/store/slices/functionSlice.ts
import type { StateCreator } from 'zustand';
import type { AppStore } from '../storeTypes';
import type { ParsedFunction, ParametricFunction, MarkedPoint, IntegralConfig } from '../../types';
import { nextFunctionColor, INTEGRAL_FILL_COLORS } from '../../types';
import { parseExpression, parseParametricExpression } from '../../lib/parser';
import { updateParameterValue } from '../../lib/paramParser';
import { numericalDerivative } from '../../lib/derivative';
import { v4 as uuidv4 } from 'uuid';

export interface FunctionSlice {
  functions: ParsedFunction[];
  parametricFunctions: ParametricFunction[];
  integrals: IntegralConfig[];

  addFunction: (expression: string) => void;
  removeFunction: (id: string) => void;
  toggleFunctionVisibility: (id: string) => void;
  toggleFunctionDerivative: (id: string) => void;
  toggleFunctionKeyPoints: (id: string) => void;
  toggleFunctionIntegralCurve: (id: string) => void;
  updateFunctionCurveBasePoint: (id: string, basePoint: number) => void;
  updateFunctionExpression: (id: string, expression: string) => void;

  addParametricFunction: (expression: string) => void;
  removeParametricFunction: (id: string) => void;
  updateParameter: (functionId: string, paramName: string, value: number) => void;
  toggleParametricVisibility: (id: string) => void;
  toggleParametricDerivative: (id: string) => void;
  toggleParametricKeyPoints: (id: string) => void;
  toggleParametricIntegralCurve: (id: string) => void;
  updateParametricCurveBasePoint: (id: string, basePoint: number) => void;
  updateParametricParameter: (functionId: string, paramName: string, field: 'min' | 'max' | 'step' | 'defaultValue' | 'currentValue', value: number) => void;
  updateParametricExpression: (id: string, expression: string) => void;

  addMarkedPoint: (functionId: string, x: number, isParametric: boolean) => void;
  removeMarkedPoint: (functionId: string, pointId: string, isParametric: boolean) => void;
  updateMarkedPoint: (functionId: string, pointId: string, x: number, isParametric: boolean) => void;

  addIntegral: (functionId: string, functionType: 'normal' | 'parametric') => void;
  removeIntegral: (id: string) => void;
  updateIntegralBounds: (id: string, lowerBound: number, upperBound: number) => void;
  toggleIntegralAreaFill: (id: string) => void;
}

export const createFunctionSlice: StateCreator<AppStore, [], [], FunctionSlice> = (set, get) => ({
  functions: [],
  parametricFunctions: [],
  integrals: [],

  addFunction: (expression) => {
    const { functions } = get();
    if (functions.length >= 10) return;
    const color = nextFunctionColor();
    const result = parseExpression(expression);
    if (result instanceof Error) {
      const errorFn: ParsedFunction = {
        id: uuidv4(), expression, compiled: () => NaN, color, visible: true, error: result.message,
      };
      set({ functions: [...functions, errorFn] });
    } else {
      set({ functions: [...functions, { ...result, id: uuidv4(), color, visible: true }] });
    }
  },

  removeFunction: (id) => {
    const { functions, keyPoints, selectedFunctionId, integrals } = get();
    set({
      functions: functions.filter(f => f.id !== id),
      keyPoints: keyPoints.filter(kp => kp.functionId !== id),
      selectedFunctionId: selectedFunctionId === id ? null : selectedFunctionId,
      integrals: integrals.filter(i => i.functionId !== id),
    });
  },

  toggleFunctionVisibility: (id) => set({
    functions: get().functions.map(f => f.id === id ? { ...f, visible: !f.visible } : f),
  }),

  toggleFunctionDerivative: (id) => set({
    functions: get().functions.map(f => f.id === id ? { ...f, showDerivative: !f.showDerivative } : f),
  }),

  toggleFunctionKeyPoints: (id) => set({
    functions: get().functions.map(f => f.id === id ? { ...f, showKeyPoints: !f.showKeyPoints } : f),
  }),

  toggleFunctionIntegralCurve: (id) => set({
    functions: get().functions.map(f => f.id === id ? { ...f, showIntegralCurve: !f.showIntegralCurve } : f),
  }),

  updateFunctionCurveBasePoint: (id, basePoint) => set({
    functions: get().functions.map(f => f.id === id ? { ...f, curveBasePoint: basePoint } : f),
  }),

  updateFunctionExpression: (id, expression) => {
    const { functions } = get();
    const result = parseExpression(expression);
    const fn = functions.find(f => f.id === id);
    if (!fn) return;
    if (result instanceof Error) {
      set({ functions: functions.map(f => f.id === id ? { ...f, expression, error: result.message } : f) });
    } else {
      const { color: _color, id: _, ...restResult } = result;
      set({ functions: functions.map(f => f.id === id ? { ...f, ...restResult, expression, error: undefined } : f) });
    }
  },

  addParametricFunction: (expression) => {
    const { parametricFunctions } = get();
    if (parametricFunctions.length >= 3) return;
    const color = nextFunctionColor();
    const result = parseParametricExpression(expression);
    if (result instanceof Error) {
      const errorFn: ParametricFunction = {
        id: uuidv4(), expression, compiled: () => NaN, color, visible: true, error: result.message, parameters: [], xAxisVar: 'x', yAxisVar: 'y',
      };
      set({ parametricFunctions: [...parametricFunctions, errorFn] });
    } else {
      set({ parametricFunctions: [...parametricFunctions, { ...result, id: uuidv4(), color, visible: true }] });
    }
  },

  removeParametricFunction: (id) => {
    const { parametricFunctions, keyPoints } = get();
    set({
      parametricFunctions: parametricFunctions.filter(f => f.id !== id),
      keyPoints: keyPoints.filter(kp => kp.functionId !== id),
    });
  },

  updateParameter: (_functionId, paramName, value) => {
    set({
      parametricFunctions: get().parametricFunctions.map(fn => {
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return { ...fn, parameters: updateParameterValue(fn.parameters, paramName, value) };
      }),
    });
  },

  toggleParametricVisibility: (id) => set({
    parametricFunctions: get().parametricFunctions.map(f => f.id === id ? { ...f, visible: !f.visible } : f),
  }),

  toggleParametricDerivative: (id) => set({
    parametricFunctions: get().parametricFunctions.map(f => f.id === id ? { ...f, showDerivative: !f.showDerivative } : f),
  }),

  toggleParametricKeyPoints: (id) => set({
    parametricFunctions: get().parametricFunctions.map(f => f.id === id ? { ...f, showKeyPoints: !f.showKeyPoints } : f),
  }),

  toggleParametricIntegralCurve: (id) => set({
    parametricFunctions: get().parametricFunctions.map(f => f.id === id ? { ...f, showIntegralCurve: !f.showIntegralCurve } : f),
  }),

  updateParametricCurveBasePoint: (id, basePoint) => set({
    parametricFunctions: get().parametricFunctions.map(f => f.id === id ? { ...f, curveBasePoint: basePoint } : f),
  }),

  updateParametricParameter: (_functionId, paramName, field, value) => {
    set({
      parametricFunctions: get().parametricFunctions.map(fn => {
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return {
          ...fn,
          parameters: fn.parameters.map(p => {
            if (p.name !== paramName) return p;
            const updated = { ...p, [field]: value };
            if (field === 'currentValue') {
              updated.currentValue = Math.max(p.min, Math.min(p.max, value));
            } else if (field === 'min' || field === 'max') {
              updated.currentValue = Math.max(updated.min, Math.min(updated.max, updated.currentValue));
            }
            return updated;
          }),
        };
      }),
    });
  },

  updateParametricExpression: (id, expression) => {
    const { parametricFunctions } = get();
    const result = parseParametricExpression(expression);
    const fn = parametricFunctions.find(f => f.id === id);
    if (!fn) return;
    if (result instanceof Error) {
      set({ parametricFunctions: parametricFunctions.map(f => f.id === id ? { ...f, expression, error: result.message } : f) });
    } else {
      const { color: _color, id: _, ...restResult } = result;
      set({ parametricFunctions: parametricFunctions.map(f => f.id === id ? { ...f, ...restResult, expression, error: undefined } : f) });
    }
  },

  addMarkedPoint: (functionId, x, isParametric) => {
    const { functions, parametricFunctions } = get();
    if (isParametric) {
      const fn = parametricFunctions.find(f => f.id === functionId);
      if (!fn || fn.error) return;
      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
      const boundFn = (xVal: number) => fn.compiled(xVal, currentParams);
      const y = boundFn(x);
      const derivative = numericalDerivative(boundFn, x);
      const newPoint: MarkedPoint = { id: uuidv4(), x, y: isFinite(y) ? y : NaN, derivative: isFinite(derivative) ? derivative : NaN };
      set({ parametricFunctions: parametricFunctions.map(f => f.id === functionId ? { ...f, markedPoints: [...(f.markedPoints || []), newPoint] } : f) });
    } else {
      const fn = functions.find(f => f.id === functionId);
      if (!fn || fn.error) return;
      const y = fn.compiled(x);
      const derivative = numericalDerivative(fn.compiled, x);
      const newPoint: MarkedPoint = { id: uuidv4(), x, y: isFinite(y) ? y : NaN, derivative: isFinite(derivative) ? derivative : NaN };
      set({ functions: functions.map(f => f.id === functionId ? { ...f, markedPoints: [...(f.markedPoints || []), newPoint] } : f) });
    }
  },

  removeMarkedPoint: (functionId, pointId, isParametric) => {
    if (isParametric) {
      set({ parametricFunctions: get().parametricFunctions.map(f => f.id === functionId ? { ...f, markedPoints: (f.markedPoints || []).filter(p => p.id !== pointId) } : f) });
    } else {
      set({ functions: get().functions.map(f => f.id === functionId ? { ...f, markedPoints: (f.markedPoints || []).filter(p => p.id !== pointId) } : f) });
    }
  },

  updateMarkedPoint: (functionId, pointId, x, isParametric) => {
    const { functions, parametricFunctions } = get();
    if (isParametric) {
      const fn = parametricFunctions.find(f => f.id === functionId);
      if (!fn || fn.error) return;
      const currentParams: Record<string, number> = {};
      for (const p of fn.parameters) currentParams[p.name] = p.currentValue;
      const boundFn = (xVal: number) => fn.compiled(xVal, currentParams);
      const y = boundFn(x);
      const derivative = numericalDerivative(boundFn, x);
      set({
        parametricFunctions: parametricFunctions.map(f =>
          f.id === functionId ? { ...f, markedPoints: (f.markedPoints || []).map(p => p.id === pointId ? { ...p, x, y: isFinite(y) ? y : NaN, derivative: isFinite(derivative) ? derivative : NaN } : p) } : f
        ),
      });
    } else {
      const fn = functions.find(f => f.id === functionId);
      if (!fn || fn.error) return;
      const y = fn.compiled(x);
      const derivative = numericalDerivative(fn.compiled, x);
      set({
        functions: functions.map(f =>
          f.id === functionId ? { ...f, markedPoints: (f.markedPoints || []).map(p => p.id === pointId ? { ...p, x, y: isFinite(y) ? y : NaN, derivative: isFinite(derivative) ? derivative : NaN } : p) } : f
        ),
      });
    }
  },

  addIntegral: (functionId, functionType) => {
    const { integrals } = get();
    const colorIndex = integrals.length % INTEGRAL_FILL_COLORS.length;
    const newIntegral: IntegralConfig = {
      id: uuidv4(),
      functionId,
      functionType,
      type: 'definite',
      lowerBound: 0,
      upperBound: 1,
      showAreaFill: true,
      color: INTEGRAL_FILL_COLORS[colorIndex],
    };
    set({ integrals: [...integrals, newIntegral] });
  },

  removeIntegral: (id) => {
    set({ integrals: get().integrals.filter(i => i.id !== id) });
  },

  updateIntegralBounds: (id, lowerBound, upperBound) => {
    set({ integrals: get().integrals.map(i => i.id === id ? { ...i, lowerBound, upperBound } : i) });
  },

  toggleIntegralAreaFill: (id) => {
    set({ integrals: get().integrals.map(i => i.id === id ? { ...i, showAreaFill: !i.showAreaFill } : i) });
  },
});
