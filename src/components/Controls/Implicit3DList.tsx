// src/components/Controls/Implicit3DList.tsx
import type { FC } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { IMPLICIT3D_MC_PRESETS } from '../../types';
import { EmptyState } from '../UI/EmptyState';
import { ParameterSlider } from './ParameterSlider';
import { DomainInput } from './DomainInput';
import { useLinkedParameters } from '../../hooks/useLinkedParameters';
import { useInlineEdit } from '../../hooks/useInlineEdit';

export const Implicit3DList: FC = () => {
  const implicit3DFunctions = useAppStore(s => s.implicit3DFunctions);
  const removeImplicit3DFunction = useAppStore(s => s.removeImplicit3DFunction);
  const toggleImplicit3DVisibility = useAppStore(s => s.toggleImplicit3DVisibility);
  const toggleImplicit3DWireframe = useAppStore(s => s.toggleImplicit3DWireframe);
  const toggleImplicit3DGPUMode = useAppStore(s => s.toggleImplicit3DGPUMode);
  const updateImplicit3DResolution = useAppStore(s => s.updateImplicit3DResolution);
  const updateImplicit3DExpression = useAppStore(s => s.updateImplicit3DExpression);
  const updateImplicit3DDomain = useAppStore(s => s.updateImplicit3DDomain);
  const updateImplicit3DParameter = useAppStore(s => s.updateImplicit3DParameter);
  const updateImplicit3DParamConfig = useAppStore(s => s.updateImplicit3DParamConfig);

  const linkedParams = useLinkedParameters(implicit3DFunctions);
  const { editExpression, setEditExpression, inputRef, startEditing, saveEdit, isEditing } = useInlineEdit();

  if (implicit3DFunctions.length === 0) {
    return <EmptyState title="暂无隐函数" subtitle="输入 f(x,y,z)=0 表达式" />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="text-xs text-gray-500 px-2 mb-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400/70"></div>
        <span className="text-gray-400">隐函数列表</span>
        <span className="ml-auto text-gray-600">{implicit3DFunctions.length}/6</span>
      </div>

      <div className="space-y-2">
        {implicit3DFunctions.map(fn => (
          <div key={fn.id} className="glass rounded-xl p-3 border border-white/[0.06] hover:border-white/[0.1] transition-all">
            <div className="flex items-start gap-2.5">
              <button
                onClick={() => toggleImplicit3DVisibility(fn.id)}
                className="w-3 h-3 rounded-full mt-1 flex-shrink-0 transition-all hover:scale-110 border-2 border-white/15"
                style={{
                  backgroundColor: fn.visible ? fn.color : 'transparent',
                  boxShadow: fn.visible ? `0 0 8px ${fn.color}60` : 'none',
                }}
              />

              <div className="flex-1 min-w-0">
                {isEditing(fn.id) ? (
                  <input ref={inputRef} value={editExpression}
                    onChange={e => setEditExpression(e.target.value)}
                    onBlur={() => saveEdit(updateImplicit3DExpression)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(updateImplicit3DExpression); }}
                    className="w-full px-2 py-1 input-glass text-xs font-mono"
                  />
                ) : (
                  <button onClick={() => startEditing(fn)}
                    className="w-full text-left text-sm text-gray-200 font-mono truncate hover:text-white transition-colors"
                  >{fn.expression}</button>
                )}
              </div>

              <button onClick={() => removeImplicit3DFunction(fn.id)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 flex-shrink-0 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {fn.error && <div className="mt-1.5 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-md">{fn.error}</div>}

            <div className="mt-2.5 flex items-center gap-4 text-xs">
              <button onClick={() => toggleImplicit3DGPUMode(fn.id)}
                className={`flex items-center gap-1.5 transition-colors ${fn.useGPURayMarching ? 'text-emerald-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                GPU
              </button>

              <button onClick={() => toggleImplicit3DWireframe(fn.id)}
                className={`flex items-center gap-1.5 transition-colors ${fn.wireframe ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 21v-4m6 4v-4" />
                </svg>
                线框
              </button>

              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-gray-500">{fn.useGPURayMarching ? 'Ray' : 'MC'}</span>
                {!fn.useGPURayMarching && (
                  <input type="range" min={0} max={IMPLICIT3D_MC_PRESETS.length - 1}
                    value={IMPLICIT3D_MC_PRESETS.indexOf(fn.resolution as (typeof IMPLICIT3D_MC_PRESETS)[number])}
                    onChange={e => updateImplicit3DResolution(fn.id, IMPLICIT3D_MC_PRESETS[parseInt(e.target.value)])}
                    className="flex-1 h-1"
                  />
                )}
                <span className="text-gray-400 w-7 text-right">{fn.useGPURayMarching ? 'GPU' : fn.resolution}</span>
              </div>
            </div>

            {/* 定义域编辑 */}
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-gray-500 w-3 font-mono">X</span>
                <DomainInput
                  value={fn.xMin}
                  onChange={v => { if (v !== undefined) updateImplicit3DDomain(fn.id, 'xMin', v); }}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                />
                <span className="text-gray-600">—</span>
                <DomainInput
                  value={fn.xMax}
                  onChange={v => { if (v !== undefined) updateImplicit3DDomain(fn.id, 'xMax', v); }}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                />
                <span className="text-gray-500 w-3 font-mono ml-1">Y</span>
                <DomainInput
                  value={fn.yMin}
                  onChange={v => { if (v !== undefined) updateImplicit3DDomain(fn.id, 'yMin', v); }}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                />
                <span className="text-gray-600">—</span>
                <DomainInput
                  value={fn.yMax}
                  onChange={v => { if (v !== undefined) updateImplicit3DDomain(fn.id, 'yMax', v); }}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-gray-500 w-3 font-mono">Z</span>
                <DomainInput
                  value={fn.zMin}
                  onChange={v => { if (v !== undefined) updateImplicit3DDomain(fn.id, 'zMin', v); }}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                />
                <span className="text-gray-600">—</span>
                <DomainInput
                  value={fn.zMax}
                  onChange={v => { if (v !== undefined) updateImplicit3DDomain(fn.id, 'zMax', v); }}
                  className="w-12 px-1 py-0.5 input-glass text-[10px] text-center font-mono"
                />
              </div>
            </div>

            {/* 参数滑块 */}
            {fn.parameters.length > 0 && (
              <div className="mt-2 space-y-2">
                {fn.parameters.map((param) => (
                  <ParameterSlider
                    key={param.name}
                    parameter={param}
                    functionId={fn.id}
                    onChange={(value) => updateImplicit3DParameter(fn.id, param.name, value)}
                    onConfigChange={updateImplicit3DParamConfig}
                    linkedInfo={linkedParams.get(`${fn.id}:${param.name}`)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
