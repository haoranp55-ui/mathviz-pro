import { useState, memo } from 'react';

interface DomainInputProps {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  className?: string;
}

/** 定义域数字输入：focus 时用局部状态，blur 时提交，NaN 永远不进 store */
export const DomainInput = memo(function DomainInput({ value, onChange, placeholder, className }: DomainInputProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState('');

  const commit = () => {
    setEditing(false);
    if (local.trim() === '') {
      if (value !== undefined) onChange(undefined);
    } else {
      const v = parseFloat(local);
      if (Number.isFinite(v) && v !== value) onChange(v);
    }
  };

  const displayValue = value !== undefined ? value : '';
  return (
    <input
      type="number"
      value={editing ? local : displayValue}
      placeholder={placeholder}
      onFocus={() => { setEditing(true); setLocal(displayValue === '' ? '' : String(displayValue)); }}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); }}
      className={className}
      step="any"
    />
  );
});
