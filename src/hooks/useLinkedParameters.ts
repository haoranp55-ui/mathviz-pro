// src/hooks/useLinkedParameters.ts
import { useMemo } from 'react';
import type { ParametricFunction, ThreeDFunction, Implicit3DFunction } from '../types';

type ParameterizedFunction = ParametricFunction | ThreeDFunction | Implicit3DFunction;

export interface LinkedParameterInfo {
  isLinked: boolean;
  linkedWith: Array<{
    functionId: string;
    expression: string;
    color: string;
  }>;
}

export function useLinkedParameters(
  functions: ParameterizedFunction[]
): Map<string, LinkedParameterInfo> {
  return useMemo(() => {
    const map = new Map<string, LinkedParameterInfo>();

    for (const fn of functions) {
      for (const param of fn.parameters) {
        const key = `${fn.id}:${param.name}`;
        const linkedWith: LinkedParameterInfo['linkedWith'] = [];

        for (const other of functions) {
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
  }, [functions]);
}