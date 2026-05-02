// src/hooks/useLinkedParameters.ts
import { useMemo } from 'react';
import type { ParametricFunction } from '../types';

export interface LinkedParameterInfo {
  isLinked: boolean;
  linkedWith: Array<{
    functionId: string;
    expression: string;
    color: string;
  }>;
}

export function useLinkedParameters(
  parametricFunctions: ParametricFunction[]
): Map<string, LinkedParameterInfo> {
  return useMemo(() => {
    const map = new Map<string, LinkedParameterInfo>();

    for (const fn of parametricFunctions) {
      for (const param of fn.parameters) {
        const key = `${fn.id}:${param.name}`;
        const linkedWith: LinkedParameterInfo['linkedWith'] = [];

        for (const other of parametricFunctions) {
          if (other.id === fn.id) continue;
          if (other.parameters.some(p => p.name === param.name)) {
            linkedWith.push({
              functionId: other.id,
              expression: other.expression,
              color: other.color,
            });
          }
        }

        map.set(key, {
          isLinked: linkedWith.length > 0,
          linkedWith,
        });
      }
    }

    return map;
  }, [parametricFunctions]);
}
