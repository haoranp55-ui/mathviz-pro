// src/components/Controls/FunctionList.tsx
import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { EmptyState } from '../UI/EmptyState';

export const FunctionList: React.FC = () => {
  const {
    functions,
    removeFunction,
    toggleFunctionVisibility,
    toggleFunctionDerivative,
    toggleFunctionKeyPoints,
    addMarkedPoint,
    removeMarkedPoint,
    updateMarkedPoint,
  } = useAppStore();

  const [newPointX, setNewPointX] = useState<Record<string, string>>({});

  if (functions.length === 0) {
    return (
      <EmptyState
        title="暂无函数"
        subtitle="输入表达式开始绘图"
      />
    );
  }

  const handleAddPoint = (functionId: string) => {
    const xStr = newPointX[functionId] || '0';
    const x = parseFloat(xStr);
    if (!isNaN(x)) {
      addMarkedPoint(functionId, x, false);
      setNewPointX({ ...newPointX, [functionId]: '' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs text-gray-500 px-2 mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 shadow-lg shadow-blue-500/30"></div>
        <span className="text-gray-400">函数列表</span>
        <span className="text-blue-400 font-serif text-sm">y = ƒ(x)</span>
        <span className="ml-auto bg-blue-500/20 px-2 py-0.5 rounded text-xs text-blue-300">
          {functions.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {functions.map((fn) => (
          <li key={fn.id}>
            <div className="function-item flex items-center gap-2 px-3 py-2.5 rounded-lg list-item group cursor-pointer relative">
              {/* 颜色指示条 */}
              <div
                className="w-1 h-6 rounded-full flex-shrink-0 cursor-pointer shadow-lg"
                style={{ backgroundColor: fn.color, boxShadow: `0 0 8px ${fn.color}50` }}
                onClick={() => toggleFunctionVisibility(fn.id)}
              />

              {/* 函数表达式 */}
              <button
                className={`text-sm flex-1 text-left font-mono truncate ${
                  fn.visible ? 'text-white' : 'text-gray-500 line-through'
                }`}
              >
                <span className="text-cyan-400">y = </span>
                {fn.expression}
              </button>

              {/* 操作按钮组 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* 错误提示 */}
                {fn.error && (
                  <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded border border-red-500/30" title={fn.error}>
                    错误
                  </span>
                )}

                {/* 显示/隐藏按钮 */}
                <button
                  onClick={() => toggleFunctionVisibility(fn.id)}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                    fn.visible
                      ? 'text-green-400 hover:text-green-300'
                      : 'text-gray-500 bg-gray-500/20 hover:bg-gray-500/30'
                  } opacity-0 group-hover:opacity-100`}
                  title={fn.visible ? '隐藏函数' : '显示函数'}
                  aria-label={fn.visible ? '隐藏函数' : '显示函数'}
                >
                  {fn.visible ? '◉' : '○'}
                </button>

                {/* 关键点按钮 */}
                {!fn.error && (
                  <button
                    onClick={() => toggleFunctionKeyPoints(fn.id)}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                      fn.showKeyPoints
                        ? 'text-blue-400 bg-blue-400/20 hover:bg-blue-400/30'
                        : 'text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注（零点、极值点）'}
                    aria-label={fn.showKeyPoints ? '隐藏关键点标注' : '显示关键点标注'}
                  >
                    ◆
                  </button>
                )}

                {/* 导数按钮 */}
                {!fn.error && (
                  <button
                    onClick={() => toggleFunctionDerivative(fn.id)}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-all font-bold ${
                      fn.showDerivative
                        ? 'text-purple-400 bg-purple-400/20 hover:bg-purple-400/30'
                        : 'text-gray-500 hover:text-purple-400 hover:bg-purple-400/10 opacity-0 group-hover:opacity-100'
                    }`}
                    title={fn.showDerivative ? '隐藏导数曲线' : '显示导数曲线'}
                    aria-label={fn.showDerivative ? '隐藏导数曲线' : '显示导数曲线'}
                  >
                    d
                  </button>
                )}

                {/* 删除按钮 */}
                <button
                  onClick={() => removeFunction(fn.id)}
                  className="text-gray-500 hover:text-red-400 hover:bg-red-400/20 w-7 h-7 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  title="删除函数"
                  aria-label="删除函数"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 标记点列表 */}
            {fn.visible && !fn.error && (
              <div className="mt-1 mx-3 p-2 bg-gradient-to-r from-blue-900/10 to-cyan-900/10 rounded-lg border border-blue-500/10">
                {/* 添加点输入 */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs text-blue-400 font-mono mr-1">x =</div>
                  <input
                    type="text"
                    placeholder="值"
                    value={newPointX[fn.id] || ''}
                    onChange={(e) => setNewPointX({ ...newPointX, [fn.id]: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPoint(fn.id)}
                    className="flex-1 px-2 py-1 bg-canvas-panel text-white text-xs rounded border border-gray-600 focus:border-blue-500/50 focus:outline-none transition-all"
                  />
                  <button
                    onClick={() => handleAddPoint(fn.id)}
                    className="px-2 py-1 text-xs bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded hover:from-blue-500 hover:to-cyan-500 transition-all"
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
                          onChange={(e) => updateMarkedPoint(fn.id, point.id, parseFloat(e.target.value) || 0, false)}
                          className="w-14 px-1 py-0.5 bg-canvas-panel text-white rounded border border-gray-600 text-center"
                        />
                        <span className="text-cyan-400">→</span>
                        <span className="text-white font-mono">
                          y={isNaN(point.y) ? '—' : point.y.toFixed(4)}
                        </span>
                        <span className="text-purple-400 font-mono text-[10px]">
                          f'={isNaN(point.derivative) ? '—' : point.derivative.toFixed(4)}
                        </span>
                        <button
                          onClick={() => removeMarkedPoint(fn.id, point.id, false)}
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
          </li>
        ))}
      </ul>
    </div>
  );
};
