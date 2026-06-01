import { useState, memo, useCallback } from 'react';

interface DomainInputProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  className?: string;
  step?: number;
}

/** 定义域数字输入：focus 时用局部状态，blur 时提交，NaN 永远不进 store */
export const DomainInput = memo(function DomainInput({ value, onChange, placeholder, className, step = 0.1 }: DomainInputProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState('');

  const commit = useCallback(() => {
    setEditing(false);
    if (local.trim() === '') {
      if (value !== undefined) onChange(undefined);
    } else {
      const v = parseFloat(local);
      if (Number.isFinite(v) && v !== value) onChange(v);
    }
  }, [local, value, onChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // 允许输入负号、小数点等中间状态
    if (newValue === '' || newValue === '-' || newValue === '.' || newValue === '-.' || /^-?\d*\.?\d*$/.test(newValue)) {
      setLocal(newValue);
    }
  }, []);

  const handleStep = useCallback((direction: 'up' | 'down') => {
    const currentValue = value ?? 0;
    const newValue = direction === 'up' ? currentValue + step : currentValue - step;
    // 四舍五入到合理的精度
    const rounded = Math.round(newValue * 1000000) / 1000000;
    onChange(rounded);
    if (editing) {
      setLocal(String(rounded));
    }
  }, [value, step, onChange, editing]);

  const displayValue = value !== undefined ? String(value) : '';
  return (
    <div className="relative inline-flex items-center">
      <input
        type="text"
        inputMode="decimal"
        value={editing ? local : displayValue}
        placeholder={placeholder}
        onFocus={() => { setEditing(true); setLocal(displayValue); }}
        onChange={handleChange}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); }}
        className={`${className} pr-4`}
      />
      <div className="absolute right-0 top-0 bottom-0 flex flex-col">
        <button
          type="button"
          onClick={() => handleStep('up')}
          className="flex-1 w-3 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-tr transition-colors"
          tabIndex={-1}
        >
          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => handleStep('down')}
          className="flex-1 w-3 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/10 rounded-br transition-colors"
          tabIndex={-1}
        >
          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </div>
  );
});
