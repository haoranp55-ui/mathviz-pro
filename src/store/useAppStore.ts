// src/store/useAppStore.ts
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { AppStore } from './storeTypes';
import { createViewportSlice } from './slices/viewportSlice';
import { createFunctionSlice } from './slices/functionSlice';
import { createImplicitSlice } from './slices/implicitSlice';
import { createThreeDSlice } from './slices/threeDSlice';
import { createEquationSlice } from './slices/equationSlice';

// 不纳入 undo/redo 的状态字段（高频变化或 UI 临时状态）
const UNDO_EXCLUDED_KEYS = new Set([
  'interaction',
  'hoverKeyPoint',
  'keyPoints',
  'canvasRef',
  'isSliderActive',
  'threeDVersion',
  'equationStatus',
]);

export const useAppStore = create<AppStore>()(
  temporal(
    (...a) => ({
      ...createViewportSlice(...a),
      ...createFunctionSlice(...a),
      ...createImplicitSlice(...a),
      ...createThreeDSlice(...a),
      ...createEquationSlice(...a),
    }),
    {
      limit: 50,
      partialize: (state) => {
        const partial: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(state)) {
          if (!UNDO_EXCLUDED_KEYS.has(key)) {
            partial[key] = value;
          }
        }
        return partial as Partial<AppStore>;
      },
    },
  ),
);

export type { AppStore } from './storeTypes';
