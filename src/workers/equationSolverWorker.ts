// src/workers/equationSolverWorker.ts
// Web Worker: 在后台线程中执行方程求解，避免阻塞主线程 UI
import { parseEquation } from '../lib/equationParser';
import { solveEquationSystem } from '../lib/equationSolver';
import type { SolverConfig, SearchRange, Solution, VariableName } from '../types';

interface SolveRequest {
  type: 'solve';
  id: string;
  expressions: string[];
  variables: VariableName[];
  searchRange: SearchRange[];
  solverConfig: SolverConfig;
}

interface SolveResponse {
  type: 'result';
  id: string;
  solutions: Solution[];
}

interface SolveError {
  type: 'error';
  id: string;
  message: string;
}

self.onmessage = (e: MessageEvent<SolveRequest>) => {
  const { type, id, expressions, variables, searchRange, solverConfig } = e.data;

  if (type !== 'solve') return;

  try {
    // 在 Worker 内部解析和编译方程
    const fns: ((vars: number[]) => number)[] = [];
    for (let i = 0; i < expressions.length; i++) {
      const result = parseEquation(expressions[i], variables);
      if (result instanceof Error) {
        const resp: SolveError = { type: 'error', id, message: result.message };
        self.postMessage(resp);
        return;
      }
      fns.push((vars: number[]) => {
        const varsMap: Record<string, number> = {};
        variables.forEach((v, idx) => { varsMap[v] = vars[idx]; });
        return result.compiled(varsMap);
      });
    }

    // 执行求解（可能在多起点网格搜索上耗时较长）
    const solutions = solveEquationSystem(fns, searchRange, solverConfig);
    const resp: SolveResponse = { type: 'result', id, solutions };
    self.postMessage(resp);
  } catch (err) {
    const resp: SolveError = { type: 'error', id, message: `求解错误: ${(err as Error).message}` };
    self.postMessage(resp);
  }
};
