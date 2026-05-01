// src/components/Controls/ParametricList.tsx
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ParameterSlider } from './ParameterSlider';

export const ParametricList: React.FC = () => {
  const parametricFunctions = useAppStore(state => state.parametricFunctions);
  const updateParameter = useAppStore(state => state.updateParameter);
  const updateParametricParameter = useAppStore(state => state.updateParametricParameter);
  const toggleParametricVisibility = useAppStore(state => state.toggleParametricVisibility);
  const toggleParametricDerivative = useAppStore(state => state.toggleParametricDerivative);
  const toggleParametricKeyPoints = useAppStore(state => state.toggleParametricKeyPoints);
  const removeParametricFunction = useAppStore(state => state.removeParametricFunction);
  const addMarkedPoint = useAppStore(state => state.addMarkedPoint);
  const removeMarkedPoint = useAppStore(state => state.removeMarkedPoint);
  const updateMarkedPoint = useAppStore(state => state.updateMarkedPoint);

  const [newPointX, setNewPointX] = useState<Record<string, string>>({});

  const handleAddPoint = (functionId: string) => {
    const xStr = newPointX[functionId] || '0';
    const x = parseFloat(xStr);
    if (!isNaN(x)) {
      addMarkedPoint(functionId, x, true);
      setNewPointX({ ...newPointX, [functionId]: '' });
    }
  };

  if (parametricFunctions.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        暂无参数化函数
        <br />
        <span className="text-xs">在上方输入表达式添加</span>
      </div>
    );
  }

  return (
    <div className="parametric-list flex-1 overflow-y-auto">
      {parametricFunctions.map((fn) => (
        <div
          key={fn.id}
          className="p-3 border-b border-gray-700/50 hover:bg-canvas-panelLight/30 transition-colors group"
        >
          {/* 函数头部 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: fn.color }}
              />
              <span className="text-sm font-mono text-white truncate max-w-[150px]">
                {fn.expression}
              </span>
            </div>

            {/* 操作按钮 - 统一样式 */}
            <div className="flex items-center gap-1">
              {/* 显示/隐藏按钮 */}
              <button
                onClick={() => toggleParametricVisibility(fn.id)}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  fn.visible
                    ? 'text-green-400 hover:text-green-300'
                    : 'text-gray-500 bg-gray-500/20 hover:bg-gray-500/30'
                } opacity-0 group-hover:opacity-100`}
                title={fn.visible ? '隐藏函数' : '显示函数'}
              >
                {fn.visible ? '◉' : '○'}
              </button>

              {/* 关键点按钮 */}
              {!fn.error && (
                <button
                  onClick={() => toggleParametricKeyPoints(fn.id)}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                    fn.showKeyPoints
                      ? 'text-blue-400 bg-blue-400/20 hover:bg-blue-400/30'
                      : 'text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 opacity-0 group-hover:opacity-100'
                  }`}
                  title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注（零点、极值点）'}
                >
                  ◆
                </button>
              )}

              {/* 导数按钮 */}
              {!fn.error && (
                <button
                  onClick={() => toggleParametricDerivative(fn.id)}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-all font-bold ${
                    fn.showDerivative
                      ? 'text-purple-400 bg-purple-400/20 hover:bg-purple-400/30'
                      : 'text-gray-500 hover:text-purple-400 hover:bg-purple-400/10 opacity-0 group-hover:opacity-100'
                  }`}
                  title={fn.showDerivative ? '隐藏导数曲线' : '显示导数曲线'}
                >
                  d
                </button>
              )}

              {/* 删除按钮 */}
              <button
                onClick={() => removeParametricFunction(fn.id)}
                className="text-gray-500 hover:text-red-400 hover:bg-red-400/20 w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                title="删除函数"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 错误提示 */}
          {fn.error && (
            <div className="text-xs text-red-400 mb-2 p-2 bg-red-900/20 rounded">
              {fn.error}
            </div>
          )}

          {/* 参数滑钮 */}
          {fn.parameters.length > 0 && !fn.error && (
            <div className="space-y-2 mt-2">
              {fn.parameters.map((param) => (
                <ParameterSlider
                  key={param.name}
                  parameter={param}
                  functionId={fn.id}
                  onChange={(value) => updateParameter(fn.id, param.name, value)}
                  onConfigChange={updateParametricParameter}
                />
              ))}
            </div>
          )}

          {/* 标记点列表 */}
          {fn.visible && !fn.error && (
            <div className="mt-3 p-2 bg-canvas-panelLight/30 rounded-lg">
              {/* 添加点输入 */}
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="x 值"
                  value={newPointX[fn.id] || ''}
                  onChange={(e) => setNewPointX({ ...newPointX, [fn.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPoint(fn.id)}
                  className="flex-1 px-2 py-1 bg-canvas-panel text-white text-xs rounded border border-gray-600 input-glow focus:outline-none"
                />
                <button
                  onClick={() => handleAddPoint(fn.id)}
                  className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-500"
                >
                  + 点
                </button>
              </div>

              {/* 已添加的点 */}
              {fn.markedPoints && fn.markedPoints.length > 0 && (
                <div className="space-y-1">
                  {fn.markedPoints.map((point) => (
                    <div key={point.id} className="flex items-center gap-2 text-xs p-1.5 bg-gray-800/50 rounded group">
                      <input
                        type="number"
                        value={point.x}
                        onChange={(e) => updateMarkedPoint(fn.id, point.id, parseFloat(e.target.value) || 0, true)}
                        className="w-14 px-1 py-0.5 bg-canvas-panel text-white rounded border border-gray-600 text-center"
                      />
                      <span className="text-gray-400">→</span>
                      <span className="text-white font-mono">
                        y={isNaN(point.y) ? '—' : point.y.toFixed(4)}
                      </span>
                      <span className="text-purple-400 font-mono text-[10px]">
                        f'={isNaN(point.derivative) ? '—' : point.derivative.toFixed(4)}
                      </span>
                      <button
                        onClick={() => removeMarkedPoint(fn.id, point.id, true)}
                        className="ml-auto text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
