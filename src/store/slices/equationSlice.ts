// src/store/slices/equationSlice.ts
import type { StateCreator } from 'zustand';
import type { AppStore } from '../storeTypes';
import type { EquationSystem, SolverConfig, VariableName } from '../../types';
import { DEFAULT_SOLVER_CONFIG, DEFAULT_SEARCH_RANGE } from '../../types';
import { parseEquation, parseEquationSystem } from '../../lib/equationParser';
import { solveEquationAsync } from '../../workers/workerManager';
import { v4 as uuidv4 } from 'uuid';

export interface EquationSlice {
  equationSystems: EquationSystem[];
  solverConfig: SolverConfig;

  addEquationSystem: (expressions: string[], variables: VariableName[]) => void;
  removeEquationSystem: (id: string) => void;
  solveEquationSystem: (id: string) => void;
  updateEquationSystemSearchRange: (id: string, variableIndex: number, min: number, max: number) => void;
  updateEquationExpression: (systemId: string, equationId: string, expression: string) => void;
  updateSolverConfig: (config: Partial<SolverConfig>) => void;
  clearEquationSystemSolutions: (id: string) => void;
  clearAllEquationSystems: () => void;
}

export const createEquationSlice: StateCreator<AppStore, [], [], EquationSlice> = (set, get) => ({
  equationSystems: [],
  solverConfig: DEFAULT_SOLVER_CONFIG,

  addEquationSystem: (expressions, variables) => {
    const { equationSystems } = get();
    const result = parseEquationSystem(expressions, variables);
    if (result instanceof Error) {
      const errorSystem: EquationSystem = {
        id: uuidv4(),
        equations: expressions.map(expr => ({
          id: uuidv4(), expression: expr, compiled: () => NaN, error: result.message,
        })),
        variables,
        solutions: null,
        status: 'error',
        error: result.message,
        initialGuess: variables.map(() => 0),
        searchRange: variables.map(() => ({ ...DEFAULT_SEARCH_RANGE })),
      };
      set({ equationSystems: [...equationSystems, errorSystem] });
    } else {
      set({ equationSystems: [...equationSystems, result] });
    }
  },

  removeEquationSystem: (id) => set({ equationSystems: get().equationSystems.filter(sys => sys.id !== id) }),

  solveEquationSystem: (id) => {
    const { equationSystems, solverConfig } = get();
    const system = equationSystems.find(sys => sys.id === id);
    if (!system || system.equations.some(eq => eq.error)) return;

    // 标记为求解中
    set({ equationSystems: equationSystems.map(sys => sys.id === id ? { ...sys, status: 'solving', error: undefined } : sys) });

    // 异步求解（Worker 线程）
    const expressions = system.equations.map(eq => eq.expression);
    const variables = system.variables as VariableName[];
    solveEquationAsync(id, expressions, variables, system.searchRange, solverConfig)
      .then((solutions) => {
        set({
          equationSystems: get().equationSystems.map(sys =>
            sys.id === id ? { ...sys, solutions, status: solutions.length > 0 ? 'solved' : 'error', error: solutions.length === 0 ? '未找到解' : undefined } : sys
          ),
        });
      })
      .catch((message: string) => {
        set({
          equationSystems: get().equationSystems.map(sys =>
            sys.id === id ? { ...sys, status: 'error', error: message } : sys
          ),
        });
      });
  },

  updateEquationSystemSearchRange: (id, variableIndex, min, max) => {
    set({
      equationSystems: get().equationSystems.map(sys => {
        if (sys.id !== id) return sys;
        const newRange = [...sys.searchRange];
        newRange[variableIndex] = { min, max };
        return { ...sys, searchRange: newRange };
      }),
    });
  },

  updateEquationExpression: (systemId, equationId, expression) => {
    set({
      equationSystems: get().equationSystems.map(sys => {
        if (sys.id !== systemId) return sys;
        const result = parseEquation(expression, sys.variables);
        const newEquations = sys.equations.map(eq => {
          if (eq.id !== equationId) return eq;
          if (result instanceof Error) return { ...eq, expression, error: result.message };
          return { ...eq, expression: result.expression, compiled: result.compiled, error: undefined };
        });
        return { ...sys, equations: newEquations, solutions: null, status: 'idle' as const, error: undefined };
      }),
    });
  },

  updateSolverConfig: (config) => set({ solverConfig: { ...get().solverConfig, ...config } }),

  clearEquationSystemSolutions: (id) => set({
    equationSystems: get().equationSystems.map(sys => sys.id === id ? { ...sys, solutions: null, status: 'idle', error: undefined } : sys),
  }),

  clearAllEquationSystems: () => set({ equationSystems: [] }),
});
