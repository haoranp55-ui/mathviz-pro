import { useAppStore } from '../../store/useAppStore';

export function UndoRedoControls() {
  const temporalStore = (useAppStore as unknown as { temporal: { getState: () => { undo: () => void; redo: () => void; pastStates: unknown[]; futureStates: unknown[] } } }).temporal;
  if (!temporalStore) return null;

  const { undo, redo, pastStates, futureStates } = temporalStore.getState();
  const canUndo = pastStates?.length > 0;
  const canRedo = futureStates?.length > 0;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={undo}
        disabled={!canUndo}
        className="px-2 py-1 text-xs rounded bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="撤销 (Ctrl+Z)"
      >
        ↩
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="px-2 py-1 text-xs rounded bg-white/5 text-gray-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="重做 (Ctrl+Shift+Z)"
      >
        ↪
      </button>
    </div>
  );
}
