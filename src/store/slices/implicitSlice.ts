// src/store/slices/implicitSlice.ts
import type { StateCreator } from 'zustand';
import type { AppStore } from '../storeTypes';
import type { ImplicitFunction, PolarFunction } from '../../types';
import { nextFunctionColor } from '../../types';
import { parseImplicitExpression } from '../../lib/implicitParser';
import { parsePolarExpression } from '../../lib/polarParser';
import { updateParameterValue } from '../../lib/paramParser';
import { v4 as uuidv4 } from 'uuid';

export interface ImplicitSlice {
  implicitFunctions: ImplicitFunction[];
  polarFunctions: PolarFunction[];

  addImplicitFunction: (expression: string) => void;
  removeImplicitFunction: (id: string) => void;
  toggleImplicitVisibility: (id: string) => void;
  toggleImplicitKeyPoints: (id: string) => void;
  toggleImplicitGPURendering: (id: string) => void;
  updateImplicitParameter: (functionId: string, paramName: string, value: number) => void;
  updateImplicitParamConfig: (functionId: string, paramName: string, field: 'min' | 'max' | 'step' | 'defaultValue', value: number) => void;
  updateImplicitExpression: (id: string, expression: string) => void;

  addPolarFunction: (expression: string) => void;
  removePolarFunction: (id: string) => void;
  togglePolarVisibility: (id: string) => void;
  togglePolarKeyPoints: (id: string) => void;
  togglePolarGPURendering: (id: string) => void;
  updatePolarParameter: (functionId: string, paramName: string, value: number) => void;
  updatePolarParamConfig: (functionId: string, paramName: string, field: 'min' | 'max' | 'step' | 'defaultValue', value: number) => void;
  updatePolarThetaRange: (functionId: string, thetaMin: number, thetaMax: number) => void;
  updatePolarExpression: (id: string, expression: string) => void;
}

export const createImplicitSlice: StateCreator<AppStore, [], [], ImplicitSlice> = (set, get) => ({
  implicitFunctions: [],
  polarFunctions: [],

  addImplicitFunction: (expression) => {
    const { implicitFunctions } = get();
    if (implicitFunctions.length >= 3) return;
    const color = nextFunctionColor();
    const result = parseImplicitExpression(expression);
    if (result instanceof Error) {
      const errorFn: ImplicitFunction = {
        id: uuidv4(), expression, compiled: () => NaN, color, visible: true, error: result.message, parameters: [],
      };
      set({ implicitFunctions: [...implicitFunctions, errorFn] });
    } else {
      set({ implicitFunctions: [...implicitFunctions, { ...result, id: uuidv4(), color, visible: true }] });
    }
  },

  removeImplicitFunction: (id) => {
    const { implicitFunctions, keyPoints } = get();
    set({
      implicitFunctions: implicitFunctions.filter(f => f.id !== id),
      keyPoints: keyPoints.filter(kp => kp.functionId !== id),
    });
  },

  toggleImplicitVisibility: (id) => set({
    implicitFunctions: get().implicitFunctions.map(f => f.id === id ? { ...f, visible: !f.visible } : f),
  }),

  toggleImplicitKeyPoints: (id) => set({
    implicitFunctions: get().implicitFunctions.map(f => f.id === id ? { ...f, showKeyPoints: !f.showKeyPoints } : f),
  }),

  toggleImplicitGPURendering: (id) => set({
    implicitFunctions: get().implicitFunctions.map(f => f.id === id ? { ...f, useGPURendering: !f.useGPURendering } : f),
  }),

  updateImplicitParameter: (functionId, paramName, value) => {
    set({
      implicitFunctions: get().implicitFunctions.map(fn => {
        if (fn.id !== functionId) return fn;
        return { ...fn, parameters: updateParameterValue(fn.parameters, paramName, value) };
      }),
    });
  },

  updateImplicitParamConfig: (_functionId, paramName, field, value) => {
    set({
      implicitFunctions: get().implicitFunctions.map(fn => {
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return {
          ...fn,
          parameters: fn.parameters.map(p => {
            if (p.name !== paramName) return p;
            const updated = { ...p, [field]: value };
            if (field === 'min' || field === 'max') {
              updated.currentValue = Math.max(updated.min, Math.min(updated.max, updated.currentValue));
            }
            return updated;
          }),
        };
      }),
    });
  },

  updateImplicitExpression: (id, expression) => {
    const { implicitFunctions } = get();
    const result = parseImplicitExpression(expression);
    const fn = implicitFunctions.find(f => f.id === id);
    if (!fn) return;
    if (result instanceof Error) {
      set({ implicitFunctions: implicitFunctions.map(f => f.id === id ? { ...f, expression, error: result.message } : f) });
    } else {
      const { color: _color, id: _, ...restResult } = result;
      set({ implicitFunctions: implicitFunctions.map(f => f.id === id ? { ...f, ...restResult, expression, error: undefined } : f) });
    }
  },

  addPolarFunction: (expression) => {
    const { polarFunctions } = get();
    if (polarFunctions.length >= 3) return;
    const color = nextFunctionColor();
    const result = parsePolarExpression(expression);
    if (result instanceof Error) {
      const errorFn: PolarFunction = {
        id: uuidv4(), expression, compiled: () => NaN, color, visible: true, error: result.message, parameters: [], thetaMin: 0, thetaMax: 2 * Math.PI, thetaSteps: 360,
      };
      set({ polarFunctions: [...polarFunctions, errorFn] });
    } else {
      set({ polarFunctions: [...polarFunctions, { ...result, id: uuidv4(), color, visible: true }] });
    }
  },

  removePolarFunction: (id) => {
    const { polarFunctions, keyPoints } = get();
    set({
      polarFunctions: polarFunctions.filter(f => f.id !== id),
      keyPoints: keyPoints.filter(kp => kp.functionId !== id),
    });
  },

  togglePolarVisibility: (id) => set({
    polarFunctions: get().polarFunctions.map(f => f.id === id ? { ...f, visible: !f.visible } : f),
  }),

  togglePolarKeyPoints: (id) => set({
    polarFunctions: get().polarFunctions.map(f => f.id === id ? { ...f, showKeyPoints: !f.showKeyPoints } : f),
  }),

  togglePolarGPURendering: (id) => set({
    polarFunctions: get().polarFunctions.map(f => f.id === id ? { ...f, useGPURendering: !f.useGPURendering } : f),
  }),

  updatePolarParameter: (functionId, paramName, value) => {
    set({
      polarFunctions: get().polarFunctions.map(fn => {
        if (fn.id !== functionId) return fn;
        return { ...fn, parameters: updateParameterValue(fn.parameters, paramName, value) };
      }),
    });
  },

  updatePolarParamConfig: (_functionId, paramName, field, value) => {
    set({
      polarFunctions: get().polarFunctions.map(fn => {
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return {
          ...fn,
          parameters: fn.parameters.map(p => {
            if (p.name !== paramName) return p;
            const updated = { ...p, [field]: value };
            if (field === 'min' || field === 'max') {
              updated.currentValue = Math.max(updated.min, Math.min(updated.max, updated.currentValue));
            }
            return updated;
          }),
        };
      }),
    });
  },

  updatePolarThetaRange: (functionId, thetaMin, thetaMax) => {
    set({
      polarFunctions: get().polarFunctions.map(fn => {
        if (fn.id !== functionId) return fn;
        return { ...fn, thetaMin, thetaMax };
      }),
    });
  },

  updatePolarExpression: (id, expression) => {
    const { polarFunctions } = get();
    const result = parsePolarExpression(expression);
    const fn = polarFunctions.find(f => f.id === id);
    if (!fn) return;
    if (result instanceof Error) {
      set({ polarFunctions: polarFunctions.map(f => f.id === id ? { ...f, expression, error: result.message } : f) });
    } else {
      const { color: _color, id: _, thetaMin: _tMin, thetaMax: _tMax, ...restResult } = result;
      set({ polarFunctions: polarFunctions.map(f => f.id === id ? { ...f, ...restResult, expression, error: undefined } : f) });
    }
  },
});
