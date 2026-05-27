// src/store/slices/viewportSlice.ts
import type { StateCreator } from 'zustand';
import type { AppStore } from '../storeTypes';
import type {
  ViewPort,
  HoverPoint,
  InteractionState,
  KeyPoint,
  SamplePreset,
  AspectRatioMode,
  SidebarTab,
  PlotSystemType,
  ThreeDTab,
} from '../../types';
import {
  DEFAULT_VIEWPORT,
  THREE_D_PRESET_RESOLUTION,
  IMPLICIT3D_PRESET_RESOLUTION,
} from '../../types';

export interface ToastState {
  message: string;
  type: 'success' | 'error';
  visible: boolean;
}

export interface ViewportSlice {
  systemType: PlotSystemType;
  sidebarTab: SidebarTab;
  threeDTab: ThreeDTab;
  threeDVersion: number;
  viewPort: ViewPort;
  interaction: InteractionState;
  showGrid: boolean;
  samplePreset: SamplePreset;
  aspectRatioMode: AspectRatioMode;
  keyPoints: KeyPoint[];
  hoverKeyPoint: KeyPoint | null;
  showKeyPoints: boolean;
  selectedFunctionId: string | null;
  evaluateX: number;
  canvasRef: HTMLCanvasElement | null;
  isSliderActive: boolean;
  toast: ToastState | null;

  setSystemType: (systemType: PlotSystemType) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setThreeDTab: (tab: ThreeDTab) => void;
  bumpThreeDVersion: () => void;
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
  setSliderActive: (active: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
  hideToast: () => void;
}

export const createViewportSlice: StateCreator<AppStore, [], [], ViewportSlice> = (set, get) => ({
  systemType: '2d',
  sidebarTab: 'normal',
  threeDTab: 'explicit' as ThreeDTab,
  threeDVersion: 0,
  viewPort: { ...DEFAULT_VIEWPORT },
  interaction: {
    hoverPoint: null,
    isDragging: false,
    dragStart: null,
  },
  showGrid: true,
  samplePreset: 'normal',
  aspectRatioMode: 'equal',
  keyPoints: [],
  hoverKeyPoint: null,
  showKeyPoints: true,
  selectedFunctionId: null,
  evaluateX: 1,
  canvasRef: null,
  isSliderActive: false,
  toast: null,

  setSystemType: (systemType) => set({ systemType }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setThreeDTab: (tab) => set({ threeDTab: tab }),
  bumpThreeDVersion: () => set({ threeDVersion: get().threeDVersion + 1 }),

  setViewPort: (vp) => set({ viewPort: { ...get().viewPort, ...vp } }),
  setHoverPoint: (point) => set({ interaction: { ...get().interaction, hoverPoint: point } }),
  setDragging: (isDragging, dragStart) => set({
    interaction: { ...get().interaction, isDragging, dragStart: dragStart || null },
  }),
  resetView: () => set({ viewPort: { ...DEFAULT_VIEWPORT } }),
  toggleGrid: () => set({ showGrid: !get().showGrid }),

  setSamplePreset: (preset) => {
    const newRes = THREE_D_PRESET_RESOLUTION[preset];
    const newMCRes = IMPLICIT3D_PRESET_RESOLUTION[preset];
    set({
      samplePreset: preset,
      threeDFunctions: get().threeDFunctions.map(f => ({ ...f, resolution: newRes })),
      implicit3DFunctions: get().implicit3DFunctions.map(f => ({ ...f, resolution: newMCRes })),
    });
  },

  setAspectRatioMode: (mode) => set({ aspectRatioMode: mode }),
  setKeyPoints: (functionId, points) => {
    const filtered = get().keyPoints.filter(kp => kp.functionId !== functionId);
    set({ keyPoints: [...filtered, ...points] });
  },
  clearKeyPoints: (functionId) => set({ keyPoints: get().keyPoints.filter(kp => kp.functionId !== functionId) }),
  setHoverKeyPoint: (kp) => set({ hoverKeyPoint: kp }),
  toggleKeyPoints: () => set({ showKeyPoints: !get().showKeyPoints }),
  setSelectedFunction: (id) => set({ selectedFunctionId: id }),
  setEvaluateX: (x) => set({ evaluateX: x }),
  setCanvasRef: (canvas) => set({ canvasRef: canvas }),
  setSliderActive: (active) => set({ isSliderActive: active }),

  exportImage: (filename = 'mathviz-export.png') => {
    const { canvasRef } = get();
    if (!canvasRef) {
      console.error('Canvas ref not set');
      get().showToast('画布未准备好，请重试', 'error');
      return;
    }
    try {
      const dataUrl = canvasRef.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      get().showToast('图片已导出', 'success');
    } catch (e) {
      console.error('Failed to export image:', e);
      get().showToast('导出图片失败，请重试', 'error');
    }
  },

  showToast: (message, type = 'success') => {
    set({ toast: { message, type, visible: true } });
    setTimeout(() => {
      set({ toast: null });
    }, 3000);
  },

  hideToast: () => set({ toast: null }),
});
