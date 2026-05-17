// src/store/storeTypes.ts
// 聚合所有 slice 类型为完整的 AppStore 类型
import type { ViewportSlice } from './slices/viewportSlice';
import type { FunctionSlice } from './slices/functionSlice';
import type { ImplicitSlice } from './slices/implicitSlice';
import type { ThreeDSlice } from './slices/threeDSlice';
import type { EquationSlice } from './slices/equationSlice';

export type AppStore = ViewportSlice & FunctionSlice & ImplicitSlice & ThreeDSlice & EquationSlice;
