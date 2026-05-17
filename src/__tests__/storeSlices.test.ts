import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/useAppStore';

// 每次测试前重置 store 状态
beforeEach(() => {
  const store = useAppStore.getState();
  // 清空所有函数列表
  store.functions.forEach(f => useAppStore.getState().removeFunction(f.id));
  store.parametricFunctions.forEach(f => useAppStore.getState().removeParametricFunction(f.id));
  store.implicitFunctions.forEach(f => useAppStore.getState().removeImplicitFunction(f.id));
  store.polarFunctions.forEach(f => useAppStore.getState().removePolarFunction(f.id));
  store.clearAllEquationSystems();
  useAppStore.setState({
    keyPoints: [],
    hoverKeyPoint: null,
    selectedFunctionId: null,
  });
});

describe('FunctionSlice', () => {
  describe('addFunction', () => {
    it('应正确添加简单函数', () => {
      useAppStore.getState().addFunction('x^2');
      const fns = useAppStore.getState().functions;
      expect(fns.length).toBe(1);
      expect(fns[0].expression).toBe('x^2');
      expect(fns[0].visible).toBe(true);
      expect(fns[0].error).toBeUndefined();
      expect(fns[0].compiled(2)).toBe(4);
    });

    it('应为错误表达式创建带错误的函数', () => {
      useAppStore.getState().addFunction('invalid@@@');
      const fns = useAppStore.getState().functions;
      expect(fns.length).toBe(1);
      expect(fns[0].error).toBeTruthy();
    });

    it('应自动分配不同颜色', () => {
      useAppStore.getState().addFunction('x');
      useAppStore.getState().addFunction('x^2');
      const fns = useAppStore.getState().functions;
      expect(fns[0].color).not.toBe(fns[1].color);
    });

    it('应限制最多10个函数', () => {
      for (let i = 0; i < 12; i++) {
        useAppStore.getState().addFunction(`x+${i}`);
      }
      expect(useAppStore.getState().functions.length).toBe(10);
    });
  });

  describe('removeFunction', () => {
    it('应移除指定函数', () => {
      useAppStore.getState().addFunction('x');
      const id = useAppStore.getState().functions[0].id;
      useAppStore.getState().removeFunction(id);
      expect(useAppStore.getState().functions.length).toBe(0);
    });

    it('应同时清理该函数的关键点', () => {
      useAppStore.getState().addFunction('x^2');
      const id = useAppStore.getState().functions[0].id;
      useAppStore.getState().setKeyPoints(id, [{ type: 'zero' as const, x: 0, y: 0, functionId: id }]);
      expect(useAppStore.getState().keyPoints.length).toBe(1);
      useAppStore.getState().removeFunction(id);
      expect(useAppStore.getState().keyPoints.length).toBe(0);
    });

    it('应取消选中被删除的函数', () => {
      useAppStore.getState().addFunction('x');
      const id = useAppStore.getState().functions[0].id;
      useAppStore.getState().setSelectedFunction(id);
      useAppStore.getState().removeFunction(id);
      expect(useAppStore.getState().selectedFunctionId).toBeNull();
    });
  });

  describe('toggleFunctionVisibility', () => {
    it('应切换可见性', () => {
      useAppStore.getState().addFunction('x');
      const id = useAppStore.getState().functions[0].id;
      expect(useAppStore.getState().functions[0].visible).toBe(true);
      useAppStore.getState().toggleFunctionVisibility(id);
      expect(useAppStore.getState().functions[0].visible).toBe(false);
      useAppStore.getState().toggleFunctionVisibility(id);
      expect(useAppStore.getState().functions[0].visible).toBe(true);
    });
  });

  describe('updateFunctionExpression', () => {
    it('应更新为新的有效表达式', () => {
      useAppStore.getState().addFunction('x');
      const id = useAppStore.getState().functions[0].id;
      useAppStore.getState().updateFunctionExpression(id, 'x^2');
      const fn = useAppStore.getState().functions[0];
      expect(fn.expression).toBe('x^2');
      expect(fn.error).toBeUndefined();
      expect(fn.compiled(3)).toBe(9);
    });

    it('应更新为错误表达式并保留 ID', () => {
      useAppStore.getState().addFunction('x');
      const id = useAppStore.getState().functions[0].id;
      useAppStore.getState().updateFunctionExpression(id, 'bad@@@');
      const fn = useAppStore.getState().functions[0];
      expect(fn.id).toBe(id);
      expect(fn.error).toBeTruthy();
    });
  });
});

describe('ParametricFunctionSlice', () => {
  describe('addParametricFunction', () => {
    it('应正确添加参数化函数', () => {
      useAppStore.getState().addParametricFunction('a*sin(x)');
      const fns = useAppStore.getState().parametricFunctions;
      expect(fns.length).toBe(1);
      expect(fns[0].parameters.length).toBe(1);
      expect(fns[0].parameters[0].name).toBe('a');
    });

    it('应限制最多3个参数化函数', () => {
      for (let i = 0; i < 5; i++) {
        useAppStore.getState().addParametricFunction(`a*sin(x)+${i}`);
      }
      expect(useAppStore.getState().parametricFunctions.length).toBe(3);
    });
  });

  describe('updateParameter (参数联动)', () => {
    it('应更新所有函数中同名参数的值', () => {
      useAppStore.getState().addParametricFunction('a*sin(x)');
      useAppStore.getState().addParametricFunction('a*cos(x)');
      const fns = useAppStore.getState().parametricFunctions;

      // 更新参数 a 的值
      useAppStore.getState().updateParameter(fns[0].id, 'a', 2.5);

      const updated = useAppStore.getState().parametricFunctions;
      // 两个函数的 a 参数都应该被更新
      const a1 = updated[0].parameters.find(p => p.name === 'a');
      const a2 = updated[1].parameters.find(p => p.name === 'a');
      expect(a1?.currentValue).toBe(2.5);
      expect(a2?.currentValue).toBe(2.5);
    });
  });
});

describe('ImplicitSlice', () => {
  describe('addImplicitFunction', () => {
    it('应正确添加隐函数', () => {
      useAppStore.getState().addImplicitFunction('x^2 + y^2 = 1');
      const fns = useAppStore.getState().implicitFunctions;
      expect(fns.length).toBe(1);
      expect(fns[0].error).toBeUndefined();
    });

    it('应限制最多3个隐函数', () => {
      for (let i = 0; i < 5; i++) {
        useAppStore.getState().addImplicitFunction(`x^2 + y^2 = ${i + 1}`);
      }
      expect(useAppStore.getState().implicitFunctions.length).toBe(3);
    });
  });

  describe('toggleImplicitGPURendering', () => {
    it('应切换 GPU 渲染开关', () => {
      useAppStore.getState().addImplicitFunction('x^2 + y^2 = 1');
      const id = useAppStore.getState().implicitFunctions[0].id;
      const before = useAppStore.getState().implicitFunctions[0].useGPURendering;
      useAppStore.getState().toggleImplicitGPURendering(id);
      const after = useAppStore.getState().implicitFunctions[0].useGPURendering;
      expect(after).toBe(!before);
    });
  });
});

describe('PolarSlice', () => {
  describe('addPolarFunction', () => {
    it('应正确添加极坐标函数', () => {
      useAppStore.getState().addPolarFunction('1 + cos(x)');
      const fns = useAppStore.getState().polarFunctions;
      expect(fns.length).toBe(1);
      expect(fns[0].thetaMin).toBe(0);
      expect(fns[0].thetaMax).toBeCloseTo(2 * Math.PI);
    });
  });

  describe('updatePolarThetaRange', () => {
    it('应更新 theta 范围', () => {
      useAppStore.getState().addPolarFunction('1 + cos(x)');
      const id = useAppStore.getState().polarFunctions[0].id;
      useAppStore.getState().updatePolarThetaRange(id, 0, Math.PI);
      const fn = useAppStore.getState().polarFunctions[0];
      expect(fn.thetaMax).toBeCloseTo(Math.PI);
    });
  });
});

describe('ViewportSlice', () => {
  describe('setViewPort', () => {
    it('应部分更新视口', () => {
      const original = useAppStore.getState().viewPort;
      useAppStore.getState().setViewPort({ xMin: -5 });
      const updated = useAppStore.getState().viewPort;
      expect(updated.xMin).toBe(-5);
      expect(updated.xMax).toBe(original.xMax);
    });
  });

  describe('resetView', () => {
    it('应重置视口为默认值', () => {
      useAppStore.getState().setViewPort({ xMin: -100, xMax: 100 });
      useAppStore.getState().resetView();
      const vp = useAppStore.getState().viewPort;
      expect(vp.xMin).not.toBe(-100);
    });
  });

  describe('toggleGrid', () => {
    it('应切换网格显示', () => {
      const before = useAppStore.getState().showGrid;
      useAppStore.getState().toggleGrid();
      expect(useAppStore.getState().showGrid).toBe(!before);
    });
  });
});

describe('EquationSlice', () => {
  describe('addEquationSystem', () => {
    it('应正确添加方程系统', () => {
      useAppStore.getState().addEquationSystem(['x + y = 3', 'x - y = 1'], ['x', 'y']);
      const systems = useAppStore.getState().equationSystems;
      expect(systems.length).toBe(1);
      expect(systems[0].status).toBe('idle');
      expect(systems[0].variables).toEqual(['x', 'y']);
    });

    it('应为错误方程创建错误状态', () => {
      useAppStore.getState().addEquationSystem(['invalid@@@ = 0'], ['x']);
      const systems = useAppStore.getState().equationSystems;
      expect(systems.length).toBe(1);
      expect(systems[0].status).toBe('error');
    });
  });

  describe('removeEquationSystem', () => {
    it('应移除指定方程系统', () => {
      useAppStore.getState().addEquationSystem(['x = 1'], ['x']);
      const id = useAppStore.getState().equationSystems[0].id;
      useAppStore.getState().removeEquationSystem(id);
      expect(useAppStore.getState().equationSystems.length).toBe(0);
    });
  });

  describe('updateEquationExpression', () => {
    it('应更新方程表达式并重置解', () => {
      useAppStore.getState().addEquationSystem(['x = 1'], ['x']);
      const systemId = useAppStore.getState().equationSystems[0].id;
      const equationId = useAppStore.getState().equationSystems[0].equations[0].id;
      useAppStore.getState().updateEquationExpression(systemId, equationId, 'x = 2');
      const sys = useAppStore.getState().equationSystems[0];
      expect(sys.equations[0].expression).toContain('x = 2');
      expect(sys.solutions).toBeNull();
      expect(sys.status).toBe('idle');
    });
  });

  describe('clearAllEquationSystems', () => {
    it('应清空所有方程系统', () => {
      useAppStore.getState().addEquationSystem(['x = 1'], ['x']);
      useAppStore.getState().addEquationSystem(['y = 2'], ['y']);
      useAppStore.getState().clearAllEquationSystems();
      expect(useAppStore.getState().equationSystems.length).toBe(0);
    });
  });
});

describe('MarkedPointSlice', () => {
  describe('addMarkedPoint', () => {
    it('应在普通函数上添加标记点', () => {
      useAppStore.getState().addFunction('x^2');
      const id = useAppStore.getState().functions[0].id;
      useAppStore.getState().addMarkedPoint(id, 3, false);
      const fn = useAppStore.getState().functions[0];
      expect(fn.markedPoints?.length).toBe(1);
      expect(fn.markedPoints?.[0].x).toBe(3);
      expect(fn.markedPoints?.[0].y).toBe(9);
    });

    it('应在参数化函数上添加标记点', () => {
      useAppStore.getState().addParametricFunction('a*x');
      const id = useAppStore.getState().parametricFunctions[0].id;
      useAppStore.getState().addMarkedPoint(id, 2, true);
      const fn = useAppStore.getState().parametricFunctions[0];
      expect(fn.markedPoints?.length).toBe(1);
      expect(fn.markedPoints?.[0].x).toBe(2);
    });
  });

  describe('removeMarkedPoint', () => {
    it('应删除指定标记点', () => {
      useAppStore.getState().addFunction('x^2');
      const fnId = useAppStore.getState().functions[0].id;
      useAppStore.getState().addMarkedPoint(fnId, 2, false);
      const pointId = useAppStore.getState().functions[0].markedPoints![0].id;
      useAppStore.getState().removeMarkedPoint(fnId, pointId, false);
      expect(useAppStore.getState().functions[0].markedPoints?.length).toBe(0);
    });
  });
});
