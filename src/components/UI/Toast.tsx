// src/components/UI/Toast.tsx
import { useEffect, type FC } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

export const Toast: FC<ToastProps> = ({ message, type = 'success', duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isSuccess = type === 'success';

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
        isSuccess
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          : 'bg-red-500/15 text-red-300 border border-red-500/30'
      }`}
      role="alert"
    >
      {isSuccess ? (
        <CheckCircle className="w-4 h-4 text-emerald-400" />
      ) : (
        <XCircle className="w-4 h-4 text-red-400" />
      )}
      <span>{message}</span>
    </div>
  );
};
