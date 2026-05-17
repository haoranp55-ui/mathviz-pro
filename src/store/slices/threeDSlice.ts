// src/store/slices/threeDSlice.ts
import type { StateCreator } from 'zustand';
import type { AppStore } from '../storeTypes';
import type { ThreeDFunction, Implicit3DFunction } from '../../types';
import {
  FUNCTION_COLORS,
  THREE_D_DEFAULT_DOMAIN,
  THREE_D_MAX_FUNCTIONS,
  THREE_D_PRESET_RESOLUTION,
  IMPLICIT3D_DEFAULT_DOMAIN,
  IMPLICIT3D_MAX_FUNCTIONS,
  IMPLICIT3D_PRESET_RESOLUTION,
} from '../../types';
import { parseThreeDExpression } from '../../lib/threeDParser';
import { parseImplicit3DExpression } from '../../lib/implicit3DParser';
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

  addImplicit3DFunction: (expression: string) => void;
  removeImplicit3DFunction: (id: string) => void;
  toggleImplicit3DVisibility: (id: string) => void;
  toggleImplicit3DWireframe: (id: string) => void;
  updateImplicit3DResolution: (id: string, resolution: number) => void;
  updateImplicit3DDomain: (id: string, field: string, value: number) => void;
  updateImplicit3DExpression: (id: string, expression: string) => void;
}

export const createThreeDSlice: StateCreator<AppStore, [], [], ThreeDSlice> = (set, get) => ({
  threeDFunctions: [],
  implicit3DFunctions: [],

  addThreeDFunction: (expression) => {
    const { threeDFunctions, samplePreset } = get();
    if (threeDFunctions.length >= THREE_D_MAX_FUNCTIONS) return;
    const colorIndex = threeDFunctions.length % FUNCTION_COLORS.length;
    const color = FUNCTION_COLORS[colorIndex];
    const defaultRes = THREE_D_PRESET_RESOLUTION[samplePreset];
    const result = parseThreeDExpression(expression);
    if (result instanceof Error) {
      const errorFn: ThreeDFunction = {
        id: uuidv4(), expression, compiled: () => NaN, color, visible: true, wireframe: false, resolution: defaultRes, ...THREE_D_DEFAULT_DOMAIN, error: result.message,
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
      const { compiled } = result;
      set({ threeDFunctions: threeDFunctions.map(f => f.id === id ? { ...f, compiled, expression, error: undefined } : f) });
    }
  },

  updateThreeDDomain: (id, domain) => set({
    threeDFunctions: get().threeDFunctions.map(f => f.id === id ? { ...f, ...domain } : f),
  }),

  updateThreeDZRange: (id, zMin, zMax) => set({
    threeDFunctions: get().threeDFunctions.map(f => f.id === id ? { ...f, zMin, zMax } : f),
  }),

  addImplicit3DFunction: (expression) => {
    const { implicit3DFunctions, samplePreset } = get();
    if (implicit3DFunctions.length >= IMPLICIT3D_MAX_FUNCTIONS) return;
    const colorIndex = implicit3DFunctions.length % FUNCTION_COLORS.length;
    const color = FUNCTION_COLORS[colorIndex];
    const defaultRes = IMPLICIT3D_PRESET_RESOLUTION[samplePreset];
    const result = parseImplicit3DExpression(expression);
    if (result instanceof Error) {
      const errorFn: Implicit3DFunction = {
        id: uuidv4(), expression, compiled: () => NaN, color, visible: true, wireframe: false, resolution: defaultRes, ...IMPLICIT3D_DEFAULT_DOMAIN, error: result.message,
      };
      set({ implicit3DFunctions: [...implicit3DFunctions, errorFn] });
    } else {
      set({ implicit3DFunctions: [...implicit3DFunctions, { ...result, expression, id: uuidv4(), color, visible: true, wireframe: false, resolution: defaultRes, ...IMPLICIT3D_DEFAULT_DOMAIN }] });
    }
  },

  removeImplicit3DFunction: (id) => set({ implicit3DFunctions: get().implicit3DFunctions.filter(f => f.id !== id) }),

  toggleImplicit3DVisibility: (id) => set({
    implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, visible: !f.visible } : f),
  }),

  toggleImplicit3DWireframe: (id) => set({
    implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, wireframe: !f.wireframe } : f),
  }),

  updateImplicit3DResolution: (id, resolution) => set({
    implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, resolution } : f),
  }),

  updateImplicit3DDomain: (id, field, value) => set({
    implicit3DFunctions: get().implicit3DFunctions.map(f => f.id === id ? { ...f, [field]: value } : f),
  }),

  updateImplicit3DExpression: (id, expression) => {
    const { implicit3DFunctions } = get();
    const result = parseImplicit3DExpression(expression);
    const fn = implicit3DFunctions.find(f => f.id === id);
    if (!fn) return;
    if (result instanceof Error) {
      set({ implicit3DFunctions: implicit3DFunctions.map(f => f.id === id ? { ...f, expression, error: result.message } : f) });
    } else {
      const { compiled } = result;
      set({ implicit3DFunctions: implicit3DFunctions.map(f => f.id === id ? { ...f, compiled, expression, error: undefined } : f) });
    }
  },
});
