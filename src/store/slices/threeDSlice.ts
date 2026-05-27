// src/store/slices/threeDSlice.ts
import type { StateCreator } from 'zustand';
import type { AppStore } from '../storeTypes';
import type { ThreeDFunction, Implicit3DFunction } from '../../types';
import {
  nextFunctionColor,
  THREE_D_DEFAULT_DOMAIN,
  THREE_D_MAX_FUNCTIONS,
  THREE_D_PRESET_RESOLUTION,
  IMPLICIT3D_DEFAULT_DOMAIN,
  IMPLICIT3D_MAX_FUNCTIONS,
  IMPLICIT3D_PRESET_RESOLUTION,
} from '../../types';
import { parseThreeDExpression } from '../../lib/threeDParser';
import { parseImplicit3D } from '../../lib/implicit3DParser';
import { updateParameterValue } from '../../lib/paramParser';
import { compileExpressionOnly } from '../../lib/webgl/glslCompiler';
import { parse as mathParse } from 'mathjs';
import { v4 as uuidv4 } from 'uuid';

export interface ThreeDSlice {
  threeDFunctions: ThreeDFunction[];
  implicit3DFunctions: Implicit3DFunction[];

  addThreeDFunction: (expression: string) => void;
  removeThreeDFunction: (id: string) => void;
  toggleThreeDVisibility: (id: string) => void;
  toggleWireframe: (id: string) => void;
  updateThreeDResolution: (id: string, resolution: number) => void;
  updateThreeDExpression: (id: string, expression: string) => void;
  updateThreeDDomain: (id: string, domain: Partial<Pick<ThreeDFunction, 'xMin' | 'xMax' | 'yMin' | 'yMax'>>) => void;
  updateThreeDZRange: (id: string, zMin?: number, zMax?: number) => void;
  updateThreeDParameter: (functionId: string, paramName: string, value: number) => void;
  updateThreeDParamConfig: (functionId: string, paramName: string, field: 'min' | 'max' | 'step' | 'defaultValue', value: number) => void;

  addImplicit3DFunction: (expression: string) => void;
  removeImplicit3DFunction: (id: string) => void;
  toggleImplicit3DVisibility: (id: string) => void;
  toggleImplicit3DWireframe: (id: string) => void;
  toggleImplicit3DGPUMode: (id: string) => void;
  updateImplicit3DResolution: (id: string, resolution: number) => void;
  updateImplicit3DDomain: (id: string, field: string, value: number) => void;
  updateImplicit3DExpression: (id: string, expression: string) => void;
  updateImplicit3DParameter: (functionId: string, paramName: string, value: number) => void;
  updateImplicit3DParamConfig: (functionId: string, paramName: string, field: 'min' | 'max' | 'step' | 'defaultValue', value: number) => void;
}

export const createThreeDSlice: StateCreator<AppStore, [], [], ThreeDSlice> = (set, get) => ({
  threeDFunctions: [],
  implicit3DFunctions: [],

  addThreeDFunction: (expression) => {
    const { threeDFunctions, samplePreset } = get();
    if (threeDFunctions.length >= THREE_D_MAX_FUNCTIONS) return;
    const color = nextFunctionColor();
    const defaultRes = THREE_D_PRESET_RESOLUTION[samplePreset];
    const result = parseThreeDExpression(expression);
    if (result instanceof Error) {
      const errorFn: ThreeDFunction = {
        id: uuidv4(), expression, compiled: (() => NaN) as ThreeDFunction['compiled'], color, visible: true, parameters: [], wireframe: false, resolution: defaultRes, ...THREE_D_DEFAULT_DOMAIN, error: result.message,
      };
      set({ threeDFunctions: [...threeDFunctions, errorFn] });
    } else {
      set({ threeDFunctions: [...threeDFunctions, { ...result, expression, id: uuidv4(), color, visible: true, wireframe: false, resolution: defaultRes, ...THREE_D_DEFAULT_DOMAIN }] });
    }
  },

  removeThreeDFunction: (id) => set({ threeDFunctions: get().threeDFunctions.filter(f => f.id !== id) }),

  toggleThreeDVisibility: (id) => set({
    threeDFunctions: get().threeDFunctions.map(f => f.id === id ? { ...f, visible: !f.visible } : f),
  }),

  toggleWireframe: (id) => set({
    threeDFunctions: get().threeDFunctions.map(f => f.id === id ? { ...f, wireframe: !f.wireframe } : f),
  }),

  updateThreeDResolution: (id, resolution) => set({
    threeDFunctions: get().threeDFunctions.map(f => f.id === id ? { ...f, resolution } : f),
  }),

  updateThreeDExpression: (id, expression) => {
    const { threeDFunctions } = get();
    const result = parseThreeDExpression(expression);
    const fn = threeDFunctions.find(f => f.id === id);
    if (!fn) return;
    if (result instanceof Error) {
      set({ threeDFunctions: threeDFunctions.map(f => f.id === id ? { ...f, expression, error: result.message } : f) });
    } else {
      const { compiled, parameters } = result;
      set({ threeDFunctions: threeDFunctions.map(f => f.id === id ? { ...f, compiled, parameters, expression, error: undefined } : f) });
    }
  },

  updateThreeDDomain: (id, domain) => {
    const filtered = Object.fromEntries(
      Object.entries(domain).filter(([, v]) => Number.isFinite(v as number))
    );
    if (Object.keys(filtered).length === 0) return;
    set({
      threeDFunctions: get().threeDFunctions.map(f => f.id === id ? { ...f, ...filtered } : f),
    });
  },

  updateThreeDZRange: (id, zMin, zMax) => set({
    threeDFunctions: get().threeDFunctions.map(f => f.id === id ? { ...f, zMin, zMax } : f),
  }),

  updateThreeDParameter: (_functionId, paramName, value) => {
    set({
      threeDFunctions: get().threeDFunctions.map(fn => {
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return { ...fn, parameters: updateParameterValue(fn.parameters, paramName, value) };
      }),
      // 跨类型同步：explicit ↔ implicit
      implicit3DFunctions: get().implicit3DFunctions.map(fn => {
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return { ...fn, parameters: updateParameterValue(fn.parameters, paramName, value) };
      }),
    });
  },

  updateThreeDParamConfig: (_functionId, paramName, field, value) => {
    set({
      threeDFunctions: get().threeDFunctions.map(fn => {
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
      // 跨类型同步
      implicit3DFunctions: get().implicit3DFunctions.map(fn => {
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

  addImplicit3DFunction: (expression) => {
    const { implicit3DFunctions, samplePreset } = get();
    if (implicit3DFunctions.length >= IMPLICIT3D_MAX_FUNCTIONS) return;
    const color = nextFunctionColor();
    const defaultRes = IMPLICIT3D_PRESET_RESOLUTION[samplePreset];
    const result = parseImplicit3D(expression);
    if (result instanceof Error) {
      const errorFn: Implicit3DFunction = {
        id: uuidv4(), expression, compiled: (() => NaN) as Implicit3DFunction['compiled'], color, visible: true, wireframe: false, resolution: defaultRes, useGPURayMarching: false, ...IMPLICIT3D_DEFAULT_DOMAIN, parameters: [], error: result.message,
      };
      set({ implicit3DFunctions: [...implicit3DFunctions, errorFn] });
    } else {
      // 自动检测是否可以走 GPU Ray Marching
      let useGPURayMarching = false;
      try {
        const cleaned = expression.trim().replace(/\bln\b/g, 'log');
        const parts = cleaned.split('=');
        if (parts.length === 2) {
          const combinedExpr = `(${parts[0].trim()}) - (${parts[1].trim()})`;
          const node = mathParse(combinedExpr);
          const compileResult = compileExpressionOnly(node);
          useGPURayMarching = !compileResult.requiresCPU;
        }
      } catch { /* GLSL 检测失败，走 CPU */ }

      set({ implicit3DFunctions: [...implicit3DFunctions, { ...result, expression, id: uuidv4(), color, visible: true, wireframe: false, resolution: defaultRes, useGPURayMarching, ...IMPLICIT3D_DEFAULT_DOMAIN }] });
    }
  },

  removeImplicit3DFunction: (id) => set({ implicit3DFunctions: get().implicit3DFunctions.filter(f => f.id !== id) }),

  toggleImplicit3DVisibility: (id) => set({
    implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, visible: !f.visible } : f),
  }),

  toggleImplicit3DWireframe: (id) => set({
    implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, wireframe: !f.wireframe } : f),
  }),

  toggleImplicit3DGPUMode: (id) => set({
    implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, useGPURayMarching: !f.useGPURayMarching } : f),
  }),

  updateImplicit3DResolution: (id, resolution) => set({
    implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, resolution } : f),
  }),

  updateImplicit3DDomain: (id, field, value) => {
    if (!Number.isFinite(value)) return;
    set({
      implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, [field]: value } : f),
    });
  },

  updateImplicit3DExpression: (id, expression) => {
    const result = parseImplicit3D(expression);
    if (result instanceof Error) {
      set({ implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, expression, compiled: ((() => NaN) as Implicit3DFunction['compiled']), parameters: [], error: result.message } : f) });
    } else {
      const { compiled, parameters } = result;
      set({ implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, compiled, parameters, expression, error: undefined } : f) });
    }
  },

  updateImplicit3DParameter: (_functionId, paramName, value) => {
    set({
      implicit3DFunctions: get().implicit3DFunctions.map(fn => {
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return { ...fn, parameters: updateParameterValue(fn.parameters, paramName, value) };
      }),
      // 跨类型同步：implicit ↔ explicit
      threeDFunctions: get().threeDFunctions.map(fn => {
        const hasParam = fn.parameters.some(p => p.name === paramName);
        if (!hasParam) return fn;
        return { ...fn, parameters: updateParameterValue(fn.parameters, paramName, value) };
      }),
    });
  },

  updateImplicit3DParamConfig: (_functionId, paramName, field, value) => {
    set({
      implicit3DFunctions: get().implicit3DFunctions.map(fn => {
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
      // 跨类型同步
      threeDFunctions: get().threeDFunctions.map(fn => {
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
});
