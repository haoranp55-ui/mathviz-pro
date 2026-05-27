import { useState, useRef, useEffect, useCallback } from 'react';
import type { KeyboardEvent } from 'react';

export function useInlineEdit() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editExpression, setEditExpression] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEditing = useCallback((fn: { id: string; expression: string }) => {
    setEditingId(fn.id);
    setEditExpression(fn.expression);
  }, []);

  const saveEdit = useCallback((onSave: (id: string, expression: string) => void) => {
    if (editingId && editExpression.trim()) {
      onSave(editingId, editExpression.trim());
    }
    setEditingId(null);
    setEditExpression('');
  }, [editingId, editExpression]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditExpression('');
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent, onSave: (id: string, expression: string) => void) => {
    if (e.key === 'Enter') saveEdit(onSave);
    else if (e.key === 'Escape') cancelEdit();
  }, [saveEdit, cancelEdit]);

  return {
    editingId,
    editExpression,
    setEditExpression,
    inputRef,
    startEditing,
    saveEdit,
    cancelEdit,
    handleKeyDown,
    isEditing: (id: string) => editingId === id,
  };
}
