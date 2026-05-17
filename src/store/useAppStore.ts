// src/store/useAppStore.ts
import { create } from 'zustand';
import type { AppStore } from './storeTypes';
import { createViewportSlice } from './slices/viewportSlice';
import { createFunctionSlice } from './slices/functionSlice';
import { createImplicitSlice } from './slices/implicitSlice';
import { createThreeDSlice } from './slices/threeDSlice';
import { createEquationSlice } from './slices/equationSlice';

export const useAppStore = create<AppStore>()((...a) => ({
  ...createViewportSlice(...a),
  ...createFunctionSlice(...a),
  ...createImplicitSlice(...a),
  ...createThreeDSlice(...a),
  ...createEquationSlice(...a),
}));

export type { AppStore } from './storeTypes';
